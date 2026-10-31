# Book importer

Crops exercises and answer-key entries out of a calculus PDF into images.

## Why images

The text layer of most math PDFs is unusable: `∂` becomes `−`, parentheses become `s` and `d`, fractions collapse. Cropping the printed page keeps every symbol exact.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r tools/book_import/requirements.txt
```

## Run

```bash
# every section in chapters 12–17
.venv/bin/python tools/book_import/import_book.py \
  --pdf "/path/to/Calculus 9th Ed.pdf" --all

# one section
.venv/bin/python tools/book_import/import_book.py \
  --pdf "/path/to/Calculus 9th Ed.pdf" --sections 14.3
```

Sections come from the PDF's own table of contents, so section ids must match the TOC (`14.3`, not `Section 14.3`).

## Output

```
public/book/index.json
public/book/14.3/page-1004.png   full page, for shared instruction blocks
public/book/14.3/ex-09.png       one exercise band
public/book/14.3/ans-09.png      answer-key band (odd numbers)
```

`index.json` is keyed by section. Each exercise records its number, crop, page, and optional answer crop.

## How the crops are found

- Exercise numbers are reliable words even when the math is garbage, so anchors are words like `9.` at the start of a line.
- Columns are found from the page-wide vertical whitespace gutter (falling back to anchor clustering on pages with a full-width figure).
- Each exercise gets the band down to the next anchor in its column. Two-up short exercises share a band.
- Range headers (`9–36 Find ...`) stay attached to the items below them.
- Answers: the section's answer header is located in the appendix; entries are banded the same way, and a section whose answers start at the bottom of a page continues onto the next page up to that page's next section header.

## Limitations

- Even-numbered exercises that sit mid-line are not separate anchors; the odd ones (what homework assigns) are.
- A crop can include the neighbouring item when two answers share a line.
- Re-running replaces the section's files.
