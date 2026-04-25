"""
core/ollama_client.py — Ollama API wrapper.
Handles text + vision requests and JSON extraction.
Targets qwen2.5 via Ollama (MLX on Apple Silicon).
"""

import json
import base64
import re
import httpx
from pathlib import Path
from typing import Optional
import time

OLLAMA_BASE    = "http://localhost:11434"
DEFAULT_MODEL  = "qwen2.5:latest"
TIMEOUT        = 120.0   # seconds — 12b can be slow on first token
GENERATE_TEXT_TIMEOUT_SECONDS = 240.0
_OLLAMA_HEALTH_TTL_SECONDS = 2.5
_ollama_health_cache: tuple[bool, float] = (False, 0.0)


# ── Health check ─────────────────────────────────────────
def is_ollama_running() -> bool:
    global _ollama_health_cache
    now = time.monotonic()
    cached_running, checked_at = _ollama_health_cache
    if now - checked_at <= _OLLAMA_HEALTH_TTL_SECONDS:
        return cached_running

    try:
        r = httpx.get(f"{OLLAMA_BASE}/api/tags", timeout=3.0)
        running = r.status_code == 200
        _ollama_health_cache = (running, now)
        return running
    except Exception:
        _ollama_health_cache = (False, now)
        return False


def list_models() -> list[str]:
    try:
        r = httpx.get(f"{OLLAMA_BASE}/api/tags", timeout=5.0)
        data = r.json()
        return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


# ── Core request ─────────────────────────────────────────
def _build_payload(
    system_prompt: str,
    user_message: str,
    image_b64: Optional[str] = None,
    model: str = DEFAULT_MODEL,
    stream: bool = False,
    num_ctx: int = 4096,
    num_predict: Optional[int] = None,
) -> dict:
    messages = [{"role": "system", "content": system_prompt}]

    if image_b64:
        messages.append({
            "role": "user",
            "content": user_message,
            "images": [image_b64]
        })
    else:
        messages.append({"role": "user", "content": user_message})

    return {
        "model": model,
        "messages": messages,
        "stream": stream,
        "options": {
            "temperature": 0.3,    # low — we want precise math
            "top_p": 0.9,
            "num_ctx": num_ctx,
            **({"num_predict": num_predict} if num_predict is not None else {}),
        }
    }



def solve(
    system_prompt: str,
    problem: str,
    image_path: Optional[str] = None,
    model: str = DEFAULT_MODEL,
) -> dict:
    """
    Blocking solve. Returns parsed JSON dict from model.
    Raises on Ollama error or JSON parse failure.
    """
    image_b64 = _load_image_b64(image_path) if image_path else None

    payload = _build_payload(
        system_prompt=system_prompt,
        user_message=problem or "Solve the problem in the image.",
        image_b64=image_b64,
        model=model,
        stream=False,
    )

    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        resp.raise_for_status()
        raw = resp.json()

    content = raw["message"]["content"]
    return extract_json(content)

def generate_text(
    system_prompt: str,
    user_message: str,
    model: str = DEFAULT_MODEL,
    num_ctx: int = 1536,
    num_predict: int = 220,
    timeout_seconds: float = GENERATE_TEXT_TIMEOUT_SECONDS,
) -> str:
    """
    Blocking solve. Returns raw text.
    """
    payload = _build_payload(
        system_prompt=system_prompt,
        user_message=user_message,
        model=model,
        stream=False,
        num_ctx=num_ctx,
        num_predict=num_predict,
    )

    with httpx.Client(timeout=timeout_seconds) as client:
        resp = client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        resp.raise_for_status()
        raw = resp.json()

    return raw["message"]["content"]


def chat_followup(
    system_prompt: str,
    messages: list[dict],
    model: str = DEFAULT_MODEL,
) -> dict:
    """
    Multi-turn follow-up chat. messages is the full history including
    the new user turn. Returns parsed JSON dict with answer + metadata.
    """
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "stream": False,
        "options": {
            "temperature": 0.4,
            "top_p": 0.9,
            "num_ctx": 4096,
        }
    }

    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        resp.raise_for_status()
        raw = resp.json()

    content = raw["message"]["content"]
    return extract_json(content)


def why_this_works(
    system_prompt: str,
    why_prompt: str,
    model: str = DEFAULT_MODEL,
) -> dict:
    """
    Drill-down: explain why a step works.
    Returns {"baby_why": str, "real_why": str}
    """
    payload = _build_payload(
        system_prompt=system_prompt,
        user_message=why_prompt,
        model=model,
        stream=False,
    )

    with httpx.Client(timeout=60.0) as client:
        resp = client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        resp.raise_for_status()
        raw = resp.json()

    content = raw["message"]["content"]
    return extract_json(content)


# ── Helpers ──────────────────────────────────────────────
def _clean_wrapped_json(text: str) -> str:
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    return text.replace("```", "").strip()


def _repair_json_escapes(text: str) -> str:
    # Escape backslashes that are likely meant as literal math/backslash text, while
    # preserving valid JSON escapes.
    fixed = []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch != "\\" or (i > 0 and text[i - 1] == "\\"):
            fixed.append(ch)
            i += 1
            continue

        nxt = text[i + 1] if i + 1 < len(text) else ""
        if not nxt:
            fixed.append("\\\\")
            break

        if nxt in ['"', "/", "\\"]:
            fixed.extend(["\\", nxt])
            i += 2
            continue

        if nxt in "bfnrt":
            follow = text[i + 2] if i + 2 < len(text) else ""
            if not follow.isalpha():
                fixed.extend(["\\", nxt])
                i += 2
                continue

        if nxt == "u" and re.match(r"[0-9A-Fa-f]{4}", text[i + 2 : i + 6] or ""):
            fixed.extend(["\\", "u"])
            i += 2
            continue

        fixed.extend(["\\", "\\", nxt])
        i += 2

    # Remove trailing commas in objects/arrays (a common model slip).
    return re.sub(r',\s*([}\]])', r'\1', "".join(fixed))


def _parse_json_with_repair(text: str) -> Optional[dict]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        repaired = _repair_json_escapes(text)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            return None


def extract_json(text: str) -> dict:
    """
    Extract a JSON object from model output.
    Handles code fences, leading/trailing text, and common escaping issues.
    """
    text = _clean_wrapped_json(text)

    parsed = _parse_json_with_repair(text)
    if parsed is not None:
        return parsed

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        parsed = _parse_json_with_repair(match.group(0))
        if parsed is not None:
            return parsed

        # Last resort: return error structure with the full raw trace
        return {
            "baby_version": "The model returned something unexpected. Try rephrasing.",
            "steps": [],
            "final_answer": "",
            "tldr": "Parse error",
            "concepts_covered": [],
            "_raw": text[:4000],
            "_error": "Unable to extract valid JSON from model output.",
        }

    return {
        "baby_version": text[:500],
        "steps": [],
        "final_answer": "",
        "tldr": "",
        "concepts_covered": [],
        "_raw": text[:4000]
    }


def normalize_solution_payload(raw: dict) -> dict:
    """
    Coerce a model response into a stable schema for the frontend.
    """

    def _as_str(value, fallback: str = "") -> str:
        if value is None:
            return fallback
        if isinstance(value, str):
            return value
        return str(value)

    def _promote_inline_latex(value: str) -> str:
        """
        If a model answer has inline LaTeX commands without delimiters,
        wrap the trailing math-like fragment in `$...$` so KaTeX can render it.
        """
        if not isinstance(value, str):
            return value
        if not value:
            return value
        if "$" in value or "\\(" in value or "\\[" in value:
            return value
        if not re.search(r"\\[A-Za-z]", value):
            return value

        cmd_idx = re.search(r"\\[A-Za-z]", value)
        if not cmd_idx:
            return value
        start = cmd_idx.start()
        prefix = value[:start].rstrip()
        core = value[start:].strip()
        if not core:
            return value
        if prefix:
            return f"{prefix} ${core}$"
        return f"${core}$"

    def _coerce_int(value, fallback: int) -> int:
        try:
            parsed = int(value)
            return parsed if parsed > 0 else fallback
        except (TypeError, ValueError):
            return fallback

    def _coerce_step_list(value) -> list[dict]:
        if not isinstance(value, list):
            return []

        out = []
        for idx, item in enumerate(value):
            if not isinstance(item, dict):
                out.append({
                    "step_num": idx + 1,
                    "concept": f"step_{idx + 1}",
                    "baby_step": _as_str(item),
                    "real_step": "",
                    "chad_insight": "",
                    "chad_label": "",
                })
                continue

            step = {
                "step_num": _coerce_int(item.get("step_num"), idx + 1),
                "concept": _as_str(item.get("concept"), f"step_{idx + 1}"),
                "baby_step": _as_str(
                    item.get("baby_step", item.get("baby", item.get("explanation", ""))),
                    "No baby-level explanation yet."
                ),
                "real_step": _as_str(
                    item.get("real_step", item.get("real", item.get("math", ""))),
                    ""
                ),
                "chad_insight": _as_str(
                    item.get("chad_insight", item.get("chad", item.get("insight", ""))),
                    ""
                ),
                "chad_label": _as_str(item.get("chad_label", item.get("label", "")), ""),
            }
            step["real_step"] = _promote_inline_latex(step["real_step"])
            step["chad_insight"] = _promote_inline_latex(step["chad_insight"])
            out.append(step)

        return out

    steps = _coerce_step_list(raw.get("steps") if isinstance(raw, dict) else None)

    final_answer = _as_str(raw.get("final_answer"), "") if isinstance(raw, dict) else ""
    final_answer = _promote_inline_latex(final_answer)
    if not steps and final_answer:
        steps = [{
            "step_num": 1,
            "concept": "solution",
            "baby_step": "The model response did not include discrete steps, so we used the final answer directly.",
            "real_step": final_answer,
            "chad_insight": "",
            "chad_label": "",
        }]

    raw_concepts = []
    if isinstance(raw, dict):
        raw_concepts = raw.get("concepts_covered", raw.get("concepts", []))
    if isinstance(raw_concepts, str):
        concepts = [c.strip() for c in raw_concepts.split(",") if c.strip()]
    elif isinstance(raw_concepts, list):
        concepts = [_as_str(c).strip() for c in raw_concepts if _as_str(c, "").strip()]
    else:
        concepts = []

    normalized = {
        "baby_version": _as_str(raw.get("baby_version", ""), "Model did not include a baby-version summary.") if isinstance(raw, dict) else "Model did not include a valid solution payload.",
        "baby_analogy_label": _as_str(raw.get("baby_analogy_label", ""), "Analogy") if isinstance(raw, dict) else "Analogy",
        "steps": steps,
        "final_answer": final_answer,
        "tldr": _as_str(raw.get("tldr"), "") if isinstance(raw, dict) else "",
        "concepts_covered": concepts,
    }
    if isinstance(raw, dict):
        for key in ("_raw", "_error"):
            if key in raw:
                normalized[key] = raw[key]
    return normalized


def normalize_why_payload(raw: dict) -> dict:
    """
    Coerce a why-step explanation payload into stable keys used by the UI.
    """
    if not isinstance(raw, dict):
        return {
            "baby_why": "The model returned an invalid why payload.",
            "real_why": "Please try asking 'why' again.",
        }

    return {
        "baby_why": str(raw.get("baby_why", raw.get("baby", "")) or ""),
        "real_why": str(raw.get("real_why", raw.get("real", "")) or ""),
        "step_work": str(raw.get("step_work", raw.get("work", "")) or ""),
    }


def normalize_chat_payload(raw: dict) -> dict:
    """
    Coerce a chat follow-up payload into stable UI keys.
    """
    if not isinstance(raw, dict):
        return {
            "answer": "The model returned an invalid follow-up payload.",
            "concept_clarified": "",
            "suggests_gotit": False,
        }

    suggests = raw.get("suggests_gotit", raw.get("suggest_got_it", raw.get("gotit", False)))
    if isinstance(suggests, str):
        suggests_gotit = suggests.strip().lower() in {"true", "1", "yes", "y"}
    else:
        suggests_gotit = bool(suggests)

    return {
        "answer": str(raw.get("answer", raw.get("response", "")) or ""),
        "concept_clarified": str(raw.get("concept_clarified", raw.get("concept", "")) or ""),
        "suggests_gotit": suggests_gotit,
    }


def _load_image_b64(image_path: str) -> Optional[str]:
    """Read image file and return base64-encoded string."""
    try:
        path = Path(image_path)
        if not path.exists():
            return None
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        return None
