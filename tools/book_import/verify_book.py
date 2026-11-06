#!/usr/bin/env python3
"""Verify imported book sections against the committed manifest.

This is intentionally a hard check: a section is only released when its
exercise range, answer coverage, and instruction composites are complete.
Run: npm run book:verify
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX_PATH = ROOT / "public" / "book" / "index.json"
MANIFEST_PATH = Path(__file__).with_name("manifest.json")


def main() -> int:
    if not INDEX_PATH.exists():
        print(f"Missing {INDEX_PATH}. Run the importer first.", file=sys.stderr)
        return 1
    if not MANIFEST_PATH.exists():
        print(f"Missing {MANIFEST_PATH}.", file=sys.stderr)
        return 1

    index = json.loads(INDEX_PATH.read_text())
    manifest = json.loads(MANIFEST_PATH.read_text())
    sections = index.get("sections", {})
    failures: list[str] = []
    released = 0

    for section_id, expected in sorted(manifest.get("sections", {}).items()):
        released += 1
        section = sections.get(section_id)
        if section is None:
            failures.append(f"{section_id}: missing from index")
            continue

        exercises = section.get("exercises", [])
        numbers = [entry.get("number") for entry in exercises]
        first = int(expected["first"])
        last = int(expected["last"])
        wanted = list(range(first, last + 1))

        if sorted(numbers) != wanted:
            missing = sorted(set(wanted) - set(numbers))
            extra = sorted(set(numbers) - set(wanted))
            if missing:
                failures.append(f"{section_id}: missing exercises {missing}")
            if extra:
                failures.append(f"{section_id}: unexpected exercises {extra}")
            if len(numbers) != len(set(numbers)):
                failures.append(f"{section_id}: duplicate exercise numbers")

        answer_count = 0
        instruction_count = 0
        seen_images: set[str] = set()
        for entry in exercises:
            number = entry["number"]
            image = entry.get("image")
            if not image:
                failures.append(f"{section_id}#{number}: missing image path")
            elif image in seen_images:
                failures.append(f"{section_id}#{number}: duplicate image {image}")
            else:
                seen_images.add(image)

            for key in ("image", "thumbImage", "answerImage", "pageImage"):
                rel = entry.get(key)
                if not rel:
                    continue
                path = ROOT / "public" / "book" / rel
                if not path.exists():
                    failures.append(f"{section_id}#{number}: missing file {rel}")
                elif path.stat().st_size < 500:
                    failures.append(f"{section_id}#{number}: tiny file {rel}")

            width = int(entry.get("width") or 0)
            height = int(entry.get("height") or 0)
            if width < 40 or height < 40:
                failures.append(
                    f"{section_id}#{number}: bad image size {width}x{height}"
                )

            if entry.get("answerImage"):
                answer_count += 1
            if entry.get("thumbImage"):
                instruction_count += 1

        expected_answers = int(expected["answers"])
        if answer_count != expected_answers:
            failures.append(
                f"{section_id}: {answer_count} answers, expected {expected_answers}"
            )
        for number in range(first, last + 1):
            if number % 2 == 1:
                entry = next((e for e in exercises if e["number"] == number), None)
                if entry is None or not entry.get("answerImage"):
                    failures.append(f"{section_id}#{number}: missing odd answer")

        expected_instructions = int(expected.get("instructionExercises", 0))
        if instruction_count != expected_instructions:
            failures.append(
                f"{section_id}: {instruction_count} instruction composites, "
                f"expected {expected_instructions}"
            )

    if failures:
        print(f"FAIL {len(failures)} checks", file=sys.stderr)
        for failure in failures:
            print(f"  {failure}", file=sys.stderr)
        return 1

    print(f"OK {released} section(s) verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
