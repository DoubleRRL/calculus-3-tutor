# CalcTutor

Simple, local app for Calc 3:
- Solve mode: paste a problem and get step-by-step help.
- Practice mode: pick a topic and generate problems.

## super simple start (recommended)

From this folder, run:

```bash
./scripts/run.sh
```

If you get a permission error:

```bash
chmod +x scripts/run.sh
./scripts/run.sh
```

The script handles all of this for you:
- makes a `.venv` if needed
- installs python deps
- checks Ollama
- starts the app

Then open:

```
http://127.0.0.1:7860
```

## if something breaks

- First run can be slow while the model downloads/loading takes time.
- If generation hangs, close/open the tab and retry.
- Make sure Ollama is running (`ollama serve`).
