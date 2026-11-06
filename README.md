# CalcTutor

A local, self-paced Calculus 3 cockpit for Stewart 9e, chapters 12–16. No cloud, no schedule, no locks.

- 36 sections and ~1,850 exercises cropped from your own PDF.
- Each topic starts with a short primer: idea, worked example, and a baby-problem ladder before the book exercises.
- Type a final answer; mathjs checks it against the book answer, with the local vision model confirming unusual forms.
- Miss one and the coach gets the problem, your answer, and the answer key, then asks where the reasoning broke instead of handing over the solution.
- Chapter overviews, editable course setup, grade weights, exam blueprints, glossary, and scratch calculator.

## Run

```sh
npm install
npm run dev
```

The coach needs Ollama and a vision model: `ollama pull gemma4:e4b`.

Book import:

```sh
.venv/bin/python tools/book_import/import_book.py --pdf "<path>" --all
```

`npm run tauri build` produces the Mac app.
