"""
core/memory.py — User Knowledge Base
Loads, updates, and injects user profile into system prompts.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

KB_PATH = Path(__file__).parent.parent / "data" / "user_kb.json"

# ── Default schema ───────────────────────────────────────
DEFAULT_KB = {
    "schema_version": 1,
    "created_at": "",
    "last_updated": "",
    "mastered_concepts": [],        # e.g. ["chain rule", "u-substitution"]
    "weak_areas": [],               # e.g. ["integration by parts", "series convergence"]
    "preferred_analogies": [],      # e.g. ["cookies", "cars", "money"]
    "session_history": [],          # last N problem summaries
    "step_notes": {},               # step_id -> user comment
    "got_it_log": [],               # [{concept, step_id, timestamp}]
    "stats": {
        "problems_solved": 0,
        "steps_mastered": 0,
        "sessions": 0,
    }
}

MAX_HISTORY = 12   # keep last N session summaries in context


def load() -> dict:
    """Load KB from disk, creating it if missing."""
    KB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not KB_PATH.exists():
        kb = DEFAULT_KB.copy()
        kb["created_at"] = _now()
        kb["last_updated"] = _now()
        save(kb)
        return kb
    with open(KB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save(kb: dict) -> None:
    """Persist KB to disk."""
    kb["last_updated"] = _now()
    KB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(KB_PATH, "w", encoding="utf-8") as f:
        json.dump(kb, f, indent=2, ensure_ascii=False)


def record_got_it(step_id: str, concept: str, note: Optional[str] = None) -> dict:
    """Mark a step as mastered. Optionally save a note."""
    kb = load()
    entry = {
        "step_id": step_id,
        "concept": concept,
        "note": note or "",
        "timestamp": _now()
    }
    kb["got_it_log"].append(entry)

    # Promote concept to mastered if seen ≥2 times
    concept_hits = sum(1 for e in kb["got_it_log"] if e["concept"] == concept)
    if concept_hits >= 2 and concept not in kb["mastered_concepts"]:
        kb["mastered_concepts"].append(concept)
        if concept in kb["weak_areas"]:
            kb["weak_areas"].remove(concept)

    if note:
        kb["step_notes"][step_id] = note

    kb["stats"]["steps_mastered"] += 1
    save(kb)
    return kb


def record_problem(problem_summary: str, concepts: list[str]) -> dict:
    """Log a solved problem to session history."""
    kb = load()
    kb["session_history"].append({
        "summary": problem_summary[:180],
        "concepts": concepts,
        "timestamp": _now()
    })
    # Trim to last N
    if len(kb["session_history"]) > MAX_HISTORY:
        kb["session_history"] = kb["session_history"][-MAX_HISTORY:]

    kb["stats"]["problems_solved"] += 1
    save(kb)
    return kb


def flag_weak(concept: str) -> dict:
    """Explicitly flag a concept as a weak area."""
    kb = load()
    if concept not in kb["weak_areas"] and concept not in kb["mastered_concepts"]:
        kb["weak_areas"].append(concept)
    save(kb)
    return kb


def build_context_snippet(kb: dict) -> str:
    """
    Build a concise memory block to inject into the system prompt.
    Keeps it tight — model doesn't need the full JSON.
    """
    lines = ["[USER KNOWLEDGE PROFILE]"]

    if kb["mastered_concepts"]:
        top = kb["mastered_concepts"][-8:]  # most recent 8
        lines.append(f"Mastered (skip basics): {', '.join(top)}")

    if kb["weak_areas"]:
        lines.append(f"Weak areas (emphasize, go slow): {', '.join(kb['weak_areas'][-6:])}")

    if kb["preferred_analogies"]:
        lines.append(f"Preferred analogies: {', '.join(kb['preferred_analogies'])}")

    recent = kb["session_history"][-4:]
    if recent:
        summaries = [f"• {s['summary']}" for s in recent]
        lines.append("Recent problems:\n" + "\n".join(summaries))

    if kb["step_notes"]:
        # Pull last 3 notes the user wrote
        recent_notes = list(kb["step_notes"].items())[-3:]
        note_lines = [f"• {nid}: \"{txt}\"" for nid, txt in recent_notes]
        lines.append("User's own notes:\n" + "\n".join(note_lines))

    stats = kb["stats"]
    lines.append(
        f"Stats: {stats['problems_solved']} problems solved, "
        f"{stats['steps_mastered']} steps mastered."
    )

    return "\n".join(lines)


def get_summary_for_ui(kb: dict) -> dict:
    """Return a clean dict for displaying in the memory sidebar."""
    return {
        "mastered": kb["mastered_concepts"][-10:],
        "weak": kb["weak_areas"][-6:],
        "problems_solved": kb["stats"]["problems_solved"],
        "steps_mastered": kb["stats"]["steps_mastered"],
    }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
