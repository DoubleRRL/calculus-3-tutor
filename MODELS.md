# Ollama models (M2 Air 16GB)

| Role | Model | Notes |
|------|--------|-------|
| Vision coach and answer checks | `gemma4:e4b` | Reads exercise crops and answer-key crops. ~10 GB. |
| Fallback text model | `qwen3:8b` | Only used when no vision model is set. |

```sh
ollama pull gemma4:e4b
ollama serve
```

The model is chosen in Settings, not passed on the command line.
