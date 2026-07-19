# Ollama models (M2 Air 16GB)

| Role | Model | Notes |
|------|--------|------|
| Default coach | `qwen3:8b` | Thinking mode; comfortable RAM headroom |
| Quality mode | `phi4` | Best local math; ~9GB — close other apps |
| Flash | `qwen3:4b` | Micro-tasks / fast classify |

```bash
ollama pull phi4
ollama serve
```

In Settings: toggle **Quality mode** to use phi4 for Ask coach.
