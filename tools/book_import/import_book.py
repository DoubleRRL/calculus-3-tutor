#!/usr/bin/env python3
"""Crop book exercises (and their answer-key entries) into images.

The text layer of most calculus PDFs mangles math (∂ becomes −, parens become
s/d). Cropping the printed page keeps every symbol exact.

Exercise numbers are reliable words even when the math text is garbage, so we
anchor on them: each exercise gets the horizontal band between its number and
the next number in the same column. Short exercises that sit two-up share a
band, which reads correctly.

Usage:
    python tools/book_import/import_book.py --pdf "/path/to/book.pdf" --all
    python tools/book_import/import_book.py --pdf "..." --sections 14.3 15.2

Output (gitignored):
    public/book/index.json
    public/book/<section>/page-<n>.png
    public/book/<section>/ex-<n>.png
    public/book/<section>/ans-<n>.png
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import pymupdf

SECTION_RE = re.compile(r"^(\d{1,2})\.(\d{1,2})\s+\S")
NUMBER_WORD = re.compile(r"^(\d{1,3})\.$")
RANGE_WORD = re.compile(r"^\d{1,3}[–-]\d{1,3}$")
ANS_HEADER_RE = re.compile(r"Exercises\s+(\d{1,2}\.\d{1,2})\b")


@dataclass
class Anchor:
    number: int
    x0: float
    y0: float
    x1: float
    y1: float


def exercise_anchors(page: pymupdf.Page) -> list[Anchor]:
    """Numbers that start a line, e.g. '1.' at the left edge of an item."""
    out: list[Anchor] = []
    seen: set[int] = set()
    for x0, y0, x1, y1, word, _b, _l, wno in page.get_text("words"):
        if wno != 0:
            continue
        m = NUMBER_WORD.match(word.strip())
        if not m:
            continue
        number = int(m.group(1))
        if number in seen:
            continue
        seen.add(number)
        out.append(Anchor(number, x0, y0, x1, y1))
    return out


def range_headers(page: pymupdf.Page) -> list[float]:
    ys = []
    for x0, y0, _x1, _y1, word, _b, _l, wno in page.get_text("words"):
        if wno == 0 and RANGE_WORD.match(word.strip()):
            ys.append(y0)
    return ys


def page_gutter(page: pymupdf.Page) -> float | None:
    """Centre of the widest vertical whitespace band across the whole page.

    Intra-line gaps get filled by text on other lines; a real column gutter is
    empty for the full height, so this is much more reliable than clustering
    anchor x-positions.
    """
    width = page.rect.width
    bin_w = 2.0
    bins = [False] * (int(width / bin_w) + 2)
    height = page.rect.height
    for x0, y0, x1, y1, _w, _b, _l, _n in page.get_text("words"):
        # running headers and footers span both columns; ignore them
        if y1 < 50 or y0 > height - 30:
            continue
        start = max(0, int(x0 / bin_w))
        end = min(len(bins) - 1, int(x1 / bin_w))
        for i in range(start, end + 1):
            bins[i] = True
    lo = int(width * 0.22 / bin_w)
    hi = int(width * 0.78 / bin_w)
    best_len = 0
    best_start = 0
    run_start = lo
    run = 0
    for i in range(lo, hi):
        if not bins[i]:
            if run == 0:
                run_start = i
            run += 1
            if run > best_len:
                best_len = run
                best_start = run_start
        else:
            run = 0
    if best_len * bin_w < 10:
        return None
    return (best_start + best_len / 2) * bin_w


def bands_for_column(
    page: pymupdf.Page,
    anchors: list[Anchor],
    headers: list[float],
    x0: float,
    x1: float,
    top: float,
) -> list[tuple[Anchor, pymupdf.Rect]]:
    """Split one column into bands, one per anchor row."""
    if not anchors:
        return []
    blocks = [
        pymupdf.Rect(b["bbox"])
        for b in page.get_text("dict")["blocks"]
        if b.get("type") == 0
    ]
    ys = sorted({round(a.y0, 1) for a in anchors})
    out: list[tuple[Anchor, pymupdf.Rect]] = []
    for i, y in enumerate(ys):
        row = [a for a in anchors if round(a.y0, 1) == y]
        start = y
        # a "4–5 Determine ..." header belongs to the items below it
        for hy in headers:
            if hy < y - 2 and hy >= start - 60:
                prev = [yy for yy in ys if hy - 2 < yy <= y]
                if not prev:
                    start = hy
                    break
        end = ys[i + 1] - 5 if i + 1 < len(ys) else None
        if end is None:
            below = [b.y1 for b in blocks if b.x0 >= x0 - 4 and b.y0 >= y - 4]
            end = (max(below) if below else row[0].y1) + 4
        rect = pymupdf.Rect(
            max(0, x0),
            max(top, start - 4),
            min(page.rect.width, x1),
            min(page.rect.height - 16, end),
        )
        if rect.height < 8 or rect.width < 20:
            continue
        for a in row:
            out.append((a, rect))
    return out


def page_split(page: pymupdf.Page, anchors: list[Anchor]) -> float | None:
    """Real gutter when there is one, else the widest gap between anchor edges."""
    gutter = page_gutter(page)
    if gutter is not None:
        return gutter
    xs = sorted({round(a.x0) for a in anchors})
    best = 0
    split = None
    for left, right in zip(xs, xs[1:]):
        gap = right - left
        if gap > best:
            best = gap
            split = right - 8
    if best < 60 or split is None:
        return None
    return split


def page_bands(
    page: pymupdf.Page, top: float
) -> list[tuple[Anchor, pymupdf.Rect]]:
    anchors = exercise_anchors(page)
    if not anchors:
        return []
    headers = range_headers(page)
    split = page_split(page, anchors)
    if split is None:
        left_edge = min(a.x0 for a in anchors) - 6
        return bands_for_column(
            page, anchors, headers, left_edge, page.rect.width - 30, top
        )
    left = [a for a in anchors if a.x0 < split]
    right = [a for a in anchors if a.x0 >= split]
    left_edge = min((a.x0 for a in left), default=split - 200) - 6
    out = bands_for_column(page, left, headers, left_edge, split - 8, top)
    out += bands_for_column(page, right, headers, split - 8, page.rect.width - 30, top)
    return out


def render(page: pymupdf.Page, rect: pymupdf.Rect, path: Path, zoom: float) -> tuple[int, int]:
    path.parent.mkdir(parents=True, exist_ok=True)
    pix = page.get_pixmap(
        clip=rect,
        matrix=pymupdf.Matrix(zoom, zoom),
        colorspace=pymupdf.csGRAY,
        alpha=False,
    )
    pix.save(path, jpg_quality=88)
    return pix.width, pix.height


def toc_sections(doc: pymupdf.Document) -> dict[str, tuple[int, int]]:
    """section id -> (first page, next section's first page), 1-based."""
    entries: list[tuple[str, int]] = []
    for _level, title, page in doc.get_toc():
        m = SECTION_RE.match(title.strip())
        if m:
            entries.append((f"{m.group(1)}.{m.group(2)}", page))
    entries.sort(key=lambda e: e[1])
    out: dict[str, tuple[int, int]] = {}
    for i, (sid, page) in enumerate(entries):
        nxt = entries[i + 1][1] if i + 1 < len(entries) else page + 3
        out[sid] = (page, max(page + 1, nxt))
    return out


def heading_page(doc: pymupdf.Document, start: int, end: int) -> int | None:
    """First page of the section's exercise set (has the 'Exercises' heading)."""
    for pno in range(start - 1, min(end - 1, doc.page_count)):
        text = doc[pno].get_text("text")
        if "Exercises" in text and exercise_anchors(doc[pno]):
            return pno + 1
    return None


@dataclass
class AnswerItem:
    kind: str  # "anchor" | "header"
    section: str
    number: int
    page: int
    column: int
    x0: float
    y0: float
    x1: float
    y1: float


def any_anchors(page: pymupdf.Page) -> list[Anchor]:
    """Numbered entries anywhere on the line — the answer key has several per line.

    No dedupe by number: two different sections can both answer questions 1, 3,
    5 on the same page, and dropping the repeats loses one section entirely.
    """
    out: list[Anchor] = []
    for x0, y0, x1, y1, word, _b, _l, _wno in page.get_text("words"):
        m = NUMBER_WORD.match(word.strip())
        if not m:
            continue
        out.append(Anchor(int(m.group(1)), x0, y0, x1, y1))
    return out


_ANSWER_PAGE_CACHE: dict[int, list["AnswerItem"]] = {}


def page_answer_items(page: pymupdf.Page) -> list[AnswerItem]:
    """Answer-key entries and section headers in reading order (column, then y)."""
    cached = _ANSWER_PAGE_CACHE.get(page.number)
    if cached is not None:
        return cached
    gutter = page_gutter(page)
    items: list[AnswerItem] = []

    def column_of(x: float) -> int:
        return 0 if gutter is None or x < gutter else 1

    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            text = " ".join(s.get("text", "") for s in line.get("spans", []))
            m = ANS_HEADER_RE.search(text)
            if m:
                x0, y0, x1, y1 = line["bbox"]
                items.append(
                    AnswerItem(
                        "header", m.group(1), 0, page.number + 1,
                        column_of(x0), x0, y0, x1, y1,
                    )
                )

    for a in any_anchors(page):
        items.append(
            AnswerItem(
                "anchor", "", a.number, page.number + 1,
                column_of(a.x0), a.x0, a.y0, a.x1, a.y1,
            )
        )

    items.sort(key=lambda i: (i.column, i.y0))
    _ANSWER_PAGE_CACHE[page.number] = items
    return items


def answer_items(doc: pymupdf.Document, section: str) -> list[AnswerItem]:
    """Everything from a section's answer header up to the next section's.

    Headers also appear in the chapter body ("Exercises 13.3" in a review
    list), so the search starts at the answer appendix.
    """
    start_page: int | None = None
    search_from = 0
    for _level, title, page in doc.get_toc():
        if "answers to odd-numbered" in title.lower():
            search_from = max(0, page - 1)
            break

    for pno in range(search_from, doc.page_count):
        if any(
            i.kind == "header" and i.section == section
            for i in page_answer_items(doc[pno])
        ):
            start_page = pno
            break
    if start_page is None:
        return []

    items: list[AnswerItem] = []
    for pno in range(start_page, min(start_page + 4, doc.page_count)):
        page_items = page_answer_items(doc[pno])
        items.extend(page_items)
        if pno > start_page and any(
            i.kind == "header" and i.section != section for i in page_items
        ):
            break

    start = next(
        k
        for k, i in enumerate(items)
        if i.kind == "header" and i.section == section
    )
    end = next(
        (
            k
            for k in range(start + 1, len(items))
            if items[k].kind == "header" and items[k].section != section
        ),
        len(items),
    )
    return items[start:end]


def crop_answers(
    doc: pymupdf.Document, section: str, out_dir: Path, zoom: float
) -> dict[str, str]:
    items = answer_items(doc, section)
    if not items:
        return {}
    start = items[0]
    anchors = [i for i in items if i.kind == "anchor"]
    if not anchors:
        return {}

    groups: dict[tuple[int, int], list[AnswerItem]] = {}
    for a in anchors:
        groups.setdefault((a.page, a.column), []).append(a)

    saved: dict[str, str] = {}
    for (page_no, column), group in sorted(groups.items()):
        page = doc[page_no - 1]
        gutter = page_gutter(page)
        if gutter is None:
            x0 = min(a.x0 for a in group) - 6
            x1 = page.rect.width - 30
        elif column == 0:
            x0 = min(a.x0 for a in group) - 6
            x1 = gutter - 8
        else:
            x0 = gutter - 8
            x1 = page.rect.width - 30

        top = 48.0
        if start.page == page_no and start.column == column:
            top = start.y0 - 2

        last_y = max(a.y0 for a in group)
        stops = [
            i.y0 - 2
            for i in items
            if i.kind == "header"
            and i.page == page_no
            and i.column == column
            and i.y0 > last_y
        ]
        bottom = min(stops) if stops else page.rect.height - 20

        band_anchors = [Anchor(a.number, a.x0, a.y0, a.x1, a.y1) for a in group]
        bands = bands_for_column(page, band_anchors, [], x0, x1, top)
        for anchor, rect in bands:
            name = f"ans-{anchor.number:02d}.png"
            if name in saved:
                continue
            clipped = pymupdf.Rect(
                rect.x0, max(rect.y0, top), rect.x1, min(rect.y1, bottom)
            )
            if clipped.height < 6:
                continue
            render(page, clipped, out_dir / name, zoom)
            saved[str(anchor.number)] = f"{section}/{name}"
    return saved


def process_section(
    doc: pymupdf.Document,
    section: str,
    bounds: tuple[int, int],
    out_root: Path,
    zoom: float,
    want_answers: bool,
) -> dict:
    start, end = bounds
    first = heading_page(doc, start, end)
    out_dir = out_root / section
    out_dir.mkdir(parents=True, exist_ok=True)

    exercises: dict[int, dict] = {}
    pages: list[int] = []
    if first is not None:
        for pno in range(first, end):
            page = doc[pno - 1]
            bands = page_bands(page, top=48 if pno != first else 150)
            if not bands:
                continue
            pages.append(pno)
            page_name = f"page-{pno}.png"
            if not (out_dir / page_name).exists():
                render(page, page.rect, out_dir / page_name, zoom)
            by_rect: dict[tuple[int, int, int, int], str] = {}
            for anchor, rect in bands:
                if anchor.number in exercises:
                    continue
                key = tuple(round(v) for v in rect)
                name = by_rect.get(key)
                if name is None:
                    name = f"ex-{anchor.number:02d}.png"
                    w, h = render(page, rect, out_dir / name, zoom)
                    by_rect[key] = name
                    exercises[anchor.number] = {
                        "number": anchor.number,
                        "image": f"{section}/{name}",
                        "width": w,
                        "height": h,
                        "page": pno,
                        "pageImage": f"{section}/{page_name}",
                        "answerImage": None,
                    }

    if want_answers and exercises:
        answers = crop_answers(doc, section, out_dir, zoom)
        for number, path in answers.items():
            entry = exercises.get(int(number))
            if entry:
                entry["answerImage"] = path

    return {
        "bookStartPage": start,
        "bookEndPage": end,
        "exercisePages": pages,
        "exercises": [exercises[n] for n in sorted(exercises)],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pdf", required=True, type=Path)
    ap.add_argument("--out", default=Path("public/book"), type=Path)
    ap.add_argument("--sections", nargs="*", default=[])
    ap.add_argument("--all", action="store_true", help="every section 12–17 in the TOC")
    ap.add_argument("--no-answers", action="store_true")
    ap.add_argument("--zoom", type=float, default=2.0, help="2.0 ≈ 144 dpi")
    args = ap.parse_args()

    if not args.pdf.exists():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        return 1

    doc = pymupdf.open(args.pdf)
    sections = toc_sections(doc)
    if args.all:
        wanted = [s for s in sections if 12 <= int(s.split(".")[0]) <= 17]
    else:
        wanted = args.sections
    if not wanted:
        print("Nothing selected. Use --all or --sections 14.3 14.4", file=sys.stderr)
        return 2

    unknown = [s for s in wanted if s not in sections]
    if unknown:
        print(f"Not in the TOC: {', '.join(unknown)}", file=sys.stderr)
        return 2

    args.out.mkdir(parents=True, exist_ok=True)
    index_path = args.out / "index.json"
    index: dict = {"sections": {}}
    if index_path.exists():
        try:
            index = json.loads(index_path.read_text())
            index.setdefault("sections", {})
        except json.JSONDecodeError:
            pass
    index["source"] = args.pdf.name
    index["generatedAt"] = datetime.now(timezone.utc).isoformat()

    for section in sorted(wanted, key=lambda s: tuple(int(x) for x in s.split("."))):
        data = process_section(
            doc,
            section,
            sections[section],
            args.out,
            args.zoom,
            not args.no_answers,
        )
        index["sections"][section] = data
        n = len(data["exercises"])
        got_ans = sum(1 for e in data["exercises"] if e["answerImage"])
        print(f"{section}: {n} exercises, {got_ans} with answer crops", file=sys.stderr)

    index_path.write_text(json.dumps(index, indent=2))
    print(f"wrote {index_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
