# CalcTutor

Local Calculus 3 cockpit. Topics are Stewart sections; problems are cropped from your own PDF and tracked per exercise. Optional Ollama coach.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Import the book

The importer crops each exercise and its answer-key entry as images. This keeps the math exact — the PDF text layer mangles symbols.

```bash
python3 -m venv .venv
.venv/bin/pip install -r tools/book_import/requirements.txt
.venv/bin/python tools/book_import/import_book.py \
  --pdf "/path/to/Calculus 9th Ed.pdf" --all
```

Sections are read from the PDF's table of contents. Write one section instead:

```bash
.venv/bin/python tools/book_import/import_book.py \
  --pdf "/path/to/Calculus 9th Ed.pdf" --sections 14.3 14.4
```

Output goes to `public/book/` (gitignored). The app reads `public/book/index.json` at load. Re-run before `npm run tauri build` if you want the book inside the bundle.

## Structure

- `src/pages/Cockpit.tsx` — chapter/section grid with per-topic status.
- `src/pages/TopicSheet.tsx` — status, notes, exercises for one section.
- `src/pages/Exercise.tsx` — one cropped problem, answer reveal, got-it/missed logging.
- `src/pages/CourseSetup.tsx` — sections, grade weights, exam blueprints. All editable.
- `src/lib/courseStore.ts` — course config, topic and exercise progress, readiness.
- `src/content/stewart.ts` — Stewart 12–17 section map.

The old skill-path app is still reachable at `#/legacy`.

## Desktop (Tauri)

```bash
npm run tauri build
npm run tauri dev
```

Bundle: `src-tauri/target/release/bundle/macos/CalcTutor.app`

## Local model

`ollama serve`, then a 7–8B model at Q4 (e.g. `qwen3:8b`) fits a 16GB M2 Air.
