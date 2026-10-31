# CalcTutor

Local Calc 3 mastery system. Curated skills + verified problems; Ollama as a per-problem Socratic coach. Progress measured by mastery, retention, and exam readiness.

## Run (web)

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Requires [Ollama](https://ollama.com) for Ask coach:

```bash
ollama serve
# recommended
ollama pull phi4   # quality mode (~9GB) — M2 Air 16GB OK if other apps closed
# you likely already have:
# qwen3:8b  (default coach)
# qwen3:4b  (flash)
```

## Desktop app (Tauri)

```bash
npm run tauri build
```

App bundle:

`src-tauri/target/release/bundle/macos/CalcTutor.app`

DMG:

`src-tauri/target/release/bundle/dmg/CalcTutor_0.1.0_aarch64.dmg`

Dev desktop shell:

```bash
npm run tauri dev
```

Ollama must be running separately for Ask coach.

## Pedagogy

1. Diagnostic (Calc 1–2) → Units 1–5 (Stewart-aligned) → exam simulator  
2. Per skill: learn → guided → drill → mix → mastery gate → FSRS reviews  
3. Stuck? curated hint ladder first; Ask coach second (scoped context, anti-spoiler)  
4. Checkpoints: 10-item cumulative recall checks over seen topics only — nudged when reviews pile up or a couple of sessions pass; coach off  
5. Exam mode: full-course sim, coach off  

No cloud. No LLM-generated primary problem bank.
