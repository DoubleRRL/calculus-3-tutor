"""
app.py — CalcTutor: Offline Personal Calculus Tutor
Apple × Wolfram Alpha UI · qwen2.5 via Ollama MLX · Fully offline

Two modes:
  Solve Mode   — enter/upload any problem, get full parallel solution
  Practice Mode — bento grid topic picker → model generates + solves a problem

Run: python app.py
"""

import sys
import os
import json
import html
import uuid
import time
import webbrowser
import httpx
from urllib.parse import urlparse
from typing import Optional

import gradio as gr

sys.path.insert(0, os.path.dirname(__file__))

from core import memory, ollama_client
from core.prompts import build_system_prompt, build_why_prompt, build_image_prompt, build_chat_prompt
from core.calc3_topics import DOMAINS, DIFFICULTY_LABELS, build_problem_gen_prompt


def _gradio_major() -> int:
    return int(gr.__version__.split(".", 1)[0])


def _app_theme():
    return gr.themes.Soft(
        primary_hue="blue",
        neutral_hue="slate",
        font=gr.themes.GoogleFont("DM Sans"),
    )


# ── Load CSS ─────────────────────────────────────────────
CSS_PATH = os.path.join(os.path.dirname(__file__), "assets", "custom.css")
with open(CSS_PATH, "r") as f:
    CUSTOM_CSS = f.read()

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")


def _read_asset_text(relative_path: str) -> str:
    try:
        with open(os.path.join(ASSETS_DIR, relative_path), "r", encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


KATEX_CSS = _read_asset_text("katex.min.css")
KATEX_JS = _read_asset_text("katex.min.js")
KATEX_RENDER_JS = _read_asset_text(os.path.join("contrib", "auto-render.min.js"))
APP_BRIDGE_SOURCE = _read_asset_text("app_bridge.js")
DEFAULT_SOLVE_PROFILE = "baby_chad"

# ── KaTeX + interaction scripts injected into page head (no /file= route needed) ─
KATEX_HEAD = (
    "<style id=\"ct-katex-css\">\n"
    f"{KATEX_CSS}\n"
    "</style>\n"
    "<script id=\"ct-katex-lib\">\n"
    f"{KATEX_JS}\n"
    "</script>\n"
    "<script id=\"ct-katex-autorender\">\n"
    f"{KATEX_RENDER_JS}\n"
    "(function(){\n"
    "  function __ctAutoRender() {\n"
    "    if (typeof renderMathInElement !== 'function') {\n"
    "      return;\n"
    "    }\n"
    "    try {\n"
    "      renderMathInElement(document.body, {delimiters:[\n"
    "        {left:'$$',right:'$$',display:true},\n"
    "        {left:'$',right:'$',display:false},\n"
    "        {left:'\\\\(',right:'\\\\)',display:false},\n"
    "        {left:'\\\\[',right:'\\\\]',display:true}\n"
    "      ],\n"
    "      throwOnError:false,\n"
    "      strict:false\n"
    "      });\n"
    "    } catch (err) {\n"
    "      if (typeof console !== 'undefined' && console && console.warn) {\n"
    "        console.warn('[calc-tutor] KaTeX auto-render init error', err);\n"
    "      }\n"
    "    }\n"
    "  }\n"
    "  if (document.readyState === 'loading') {\n"
    "    document.addEventListener('DOMContentLoaded', __ctAutoRender, {once: true});\n"
    "  } else {\n"
    "    __ctAutoRender();\n"
    "  }\n"
    "})();\n"
    "</script>\n"
    '<link rel=\"stylesheet\" '
    'href=\"https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@300;400;500&family=Playfair+Display:ital,wght@1,400;1,500&display=swap">\n'
)

APP_BRIDGE_SCRIPT = f'<script id="ct-app-bridge">{APP_BRIDGE_SOURCE}</script>'


def _escape_attr(value) -> str:
    """Escape text before placing it into HTML attributes."""
    return html.escape("" if value is None else str(value), quote=True)

# =============================================================
# HTML BUILDERS — shared
# =============================================================

def build_header_html() -> str:
    kb      = memory.load()
    summary = memory.get_summary_for_ui(kb)
    p       = summary["problems_solved"]
    m       = len(summary["mastered"])
    w       = len(summary["weak"])
    dot     = "done" if p > 0 else ""
    return f"""
<div class="ct-header">
  <div class="ct-wordmark">
    <span class="ct-wordmark-primary">Calc</span>
    <span class="ct-wordmark-accent">Tutor</span>
  </div>
  <div class="ct-header-right">
    <button type="button"
            class="ct-memory-pill"
            data-action="scroll-memory">
      <span class="ct-memory-dot {dot}"></span>
      {p} solved · {m} mastered · {w} to revisit
    </button>
  </div>
</div>"""


def build_memory_sidebar_html() -> str:
    kb      = memory.load()
    summary = memory.get_summary_for_ui(kb)

    mc = "".join(
        f'<span class="ct-memory-chip mastered">✓ {c}</span>'
        for c in summary["mastered"]
    ) or '<span class="ct-memory-empty ct-memory-empty--mastered">None yet</span>'

    wc = "".join(
        f'<span class="ct-memory-chip weak">⚡ {c}</span>'
        for c in summary["weak"]
    ) or '<span class="ct-memory-empty ct-memory-empty--weak">None flagged</span>'

    return f"""
<div class="ct-memory-panel" id="ct-memory-panel">
  <div class="ct-memory-panel-title">Your Knowledge Profile</div>
  <div class="ct-memory-section">
    <div class="ct-memory-section-label">Mastered</div>
    <div>{mc}</div>
  </div>
  <div class="ct-memory-section">
    <div class="ct-memory-section-label">Revisit</div>
    <div>{wc}</div>
  </div>
  <div class="ct-memory-summary-footnote">
    <div class="ct-memory-summary-line">
      {summary['problems_solved']} problems · {summary['steps_mastered']} steps mastered
    </div>
  </div>
</div>"""


def build_baby_card_html(baby_version: str, baby_label: str) -> str:
    return f"""
<div class="ct-baby-card">
  <div class="ct-baby-card-header">
    <span class="ct-baby-icon">🍪</span>
    <span class="ct-baby-card-title">Baby Version · {baby_label}</span>
  </div>
  <div class="ct-baby-content">{baby_version}</div>
</div>"""


def build_col_headers_html(profile: str = "full") -> str:
    profile = (profile or "full").strip().lower()
    if profile == "baby_chad":
        return """
<div class="ct-col-headers ct-col-headers--baby_chad">
  <div class="ct-col-header-cell"></div>
  <div class="ct-col-header-cell"><span class="ct-section-tag baby">🍪 Baby</span></div>
  <div class="ct-col-header-cell"><span class="ct-section-tag chad">⚡ Chad Mode</span></div>
</div>"""
    if profile == "real_chad":
        return """
<div class="ct-col-headers ct-col-headers--real_chad">
  <div class="ct-col-header-cell"></div>
  <div class="ct-col-header-cell"><span class="ct-section-tag real">∫ Real Math</span></div>
  <div class="ct-col-header-cell"><span class="ct-section-tag chad">⚡ Chad Mode</span></div>
</div>"""
    return """
<div class="ct-col-headers">
  <div class="ct-col-header-cell"></div>
  <div class="ct-col-header-cell"><span class="ct-section-tag baby">🍪 Baby</span></div>
  <div class="ct-col-header-cell"><span class="ct-section-tag real">∫ Real Math</span></div>
  <div class="ct-col-header-cell"><span class="ct-section-tag chad">⚡ Chad Mode</span></div>
</div>"""


def _needs_expansion_step(text: str, chad_label: str = "") -> bool:
    text = (text or "").strip().lower()
    if not text:
        return False
    if len(text) <= 60:
        return True
    if chad_label:
        lowered_label = chad_label.strip().lower()
        if lowered_label:
            return True
    if any(hint in text for hint in ("chain rule", "product rule", "integral by parts", "substitution", "fundamental theorem", "partial fraction", "implicit differentiation")):
        return True
    if any(tok in text for tok in ("\\frac", "\\partial", "\\int", "\\cdot", "\\nabla", "\\sum", "∂", "∇", "dx", "dy", "dz")):
        return True
    if "=" in text and any(char.isdigit() for char in text):
        return True
    return any(hint in text for hint in (
        "use chain rule",
        "chain rule",
        "product rule",
        "integration by parts",
        "substitution",
        "partial fraction",
        "u = ",
        "let u"
    ))


def build_step_row_html(step: dict, step_idx: int, session_id: str, profile: str = "full") -> str:
    n         = step.get("step_num", step_idx + 1)
    baby      = step.get("baby_step", "")
    real      = step.get("real_step", "")
    chad      = step.get("chad_insight", "")
    chad_lbl  = step.get("chad_label", "")
    concept   = step.get("concept", f"step_{n}")
    step_id   = f"{session_id}_s{n}"
    profile   = (profile or "full").strip().lower()

    why_baby_id   = f"why_baby_{step_id}"
    why_real_id   = f"why_real_{step_id}"
    panel_baby_id = f"panel_baby_{step_id}"
    panel_real_id = f"panel_real_{step_id}"
    panel_baby_work_id = f"work_baby_{step_id}"
    panel_real_work_id = f"work_real_{step_id}"
    panel_chad_work_id = f"work_chad_{step_id}"

    chad_badge = (
        f'<span class="ct-chad-theorem">◆ {chad_lbl}</span><br>'
        if chad_lbl else ""
    )
    step_json = _escape_attr(json.dumps(step))

    row_class = "ct-step-row"
    if profile == "baby_chad":
        row_class = "ct-step-row ct-step-row--baby-chad"
    elif profile == "real_chad":
        row_class = "ct-step-row ct-step-row--real-chad"

    def _work_btn(mode: str, panel_id: str, label: str, text: str, *, chad_label: str = "") -> str:
        if not _needs_expansion_step(text, chad_label=chad_label):
            return ""
        return (
            f'<button class="ct-work-btn" data-action="expand-step-work" '
            f'data-mode="{mode}" data-panel-id="{panel_id}" data-row-id="{step_id}" type="button">'
            f'{label}</button>'
        )

    chad_button = _work_btn("chad", panel_chad_work_id, "Show me the work", chad, chad_label=chad_lbl)

    parts = [f"""
<div class="{row_class}" id="row_{step_id}"
     data-step='{step_json}' data-concept="{_escape_attr(concept)}">

  <div class="ct-step-num">
    <div class="ct-step-num-inner" id="num_{step_id}">{n}</div>
  </div>
"""]

    if profile in {"full", "baby_chad"}:
        parts.append(f"""
  <div class="ct-step-col">
    <div class="ct-col-header">
      <span class="ct-col-label baby">🍪 Baby</span>
      <button
        class="ct-why-btn baby-why"
        data-action="toggle-why"
        data-mode="baby"
        data-panel-id="{panel_baby_id}"
        data-btn-id="{why_baby_id}"
        id="{why_baby_id}">why?</button>
    </div>
    <div class="ct-col-content">{baby}</div>
    {_work_btn("baby", panel_baby_work_id, "Show me the work", baby)}
    <div class="ct-why-panel baby-panel" id="{panel_baby_id}"></div>
    <div class="ct-why-panel ct-step-work-panel" id="{panel_baby_work_id}"></div>
  </div>
""")

    if profile == "full":
        parts.append(f"""
  <div class="ct-step-col">
    <div class="ct-col-header">
      <span class="ct-col-label real">∫ Math</span>
      <button
        class="ct-why-btn real-why"
        data-action="toggle-why"
        data-mode="real"
        data-panel-id="{panel_real_id}"
        data-btn-id="{why_real_id}"
        id="{why_real_id}">why?</button>
    </div>
    <div class="ct-col-content">{real}</div>
    {_work_btn("real", panel_real_work_id, "Show me the work", real)}
    <div class="ct-why-panel real-panel" id="{panel_real_id}"></div>
    <div class="ct-why-panel ct-step-work-panel" id="{panel_real_work_id}"></div>
  </div>
""")
    elif profile == "real_chad":
        parts.append(f"""
  <div class="ct-step-col">
    <div class="ct-col-header">
      <span class="ct-col-label real">∫ Real</span>
      <button
        class="ct-why-btn real-why"
        data-action="toggle-why"
        data-mode="real"
        data-panel-id="{panel_real_id}"
        data-btn-id="{why_real_id}"
        id="{why_real_id}">why?</button>
    </div>
    <div class="ct-col-content">{real}</div>
    {_work_btn("real", panel_real_work_id, "Show me the work", real)}
    <div class="ct-why-panel real-panel" id="{panel_real_id}"></div>
    <div class="ct-why-panel ct-step-work-panel" id="{panel_real_work_id}"></div>
  </div>
""")

    parts.append(f"""
  <div class="ct-step-col">
    <div class="ct-col-header">
      <span class="ct-col-label chad">⚡ Chad</span>
      {chad_button}
    </div>
    <div class="ct-col-content">{chad_badge}{chad}</div>
    <div class="ct-why-panel ct-step-work-panel" id="{panel_chad_work_id}"></div>
  </div>

  <div class="ct-got-it-row">
    <label class="ct-got-it-label" data-action="toggle-got-it" data-step-id="{step_id}">
      <div class="ct-got-it-check" id="check_{step_id}"></div>
      I got this
    </label>
    <input class="ct-note-input" id="note_{step_id}"
      data-action="save-note"
      data-step-id="{step_id}"
      placeholder="Add a note for yourself…"
      />
  </div>
</div>""")

    return "".join(parts)


def build_final_answer_html(final_answer: str, tldr: str) -> str:
    return f"""
<div class="ct-final-answer">
  <div class="ct-final-answer-header">
    <span class="ct-section-tag chad">✓ Answer</span>
    <span class="ct-final-answer-meta">{tldr}</span>
  </div>
  <div class="ct-final-answer-copy">
    {final_answer}
  </div>
</div>"""


def build_chat_zone_html(history: list[dict]) -> str:
    """
    Render the full chat zone: header + message thread + input row.
    history: [{"role": "user"|"tutor", "content": str,
               "concept": str, "msg_id": str, "gotit": bool}, ...]
    """
    if not history:
        thread_inner = '<div class="ct-chat-empty">Ask anything about this problem…</div>'
    else:
        msgs = []
        for turn in history:
            role    = turn["role"]
            content = turn["content"]
            msg_id  = turn.get("msg_id", "")
            gotit   = turn.get("gotit", False)
            concept = turn.get("concept", "")
            suggests = turn.get("suggests_gotit", False)

            avatar = "you" if role == "user" else "∫"

            if role == "user":
                msgs.append(f"""
<div class="ct-msg user">
  <div class="ct-msg-avatar">{avatar}</div>
  <div class="ct-msg-bubble">{content}</div>
</div>""")
            else:
                # Build got-it footer
                if gotit:
                    gotit_footer = f"""
<div class="ct-chat-gotit-row">
  <span class="ct-chat-gotit-btn confirmed">{concept or 'got it'}</span>
</div>"""
                else:
                    nudge = '<span class="ct-chat-gotit-nudge">Tutor thinks you got this ↑</span>' if suggests else ""
                    gotit_footer = f"""
<div class="ct-chat-gotit-row">
  {nudge}
  <button class="ct-chat-gotit-btn"
          id="gotit_{msg_id}"
          data-action="chat-gotit"
          data-msg-id="{msg_id}"
          data-concept="{_escape_attr(concept)}"
          type="button">
    Got it
  </button>
</div>"""

                msgs.append(f"""
<div class="ct-msg tutor">
  <div class="ct-msg-avatar">{avatar}</div>
  <div class="ct-msg-bubble">
    <div>{content}</div>
    {gotit_footer}
  </div>
</div>""")

        thread_inner = "\n".join(msgs)

    return f"""
<div class="ct-chat-zone" id="ct-chat-zone">
  <div class="ct-chat-zone-header">
    <span class="ct-chat-zone-title">Follow-up</span>
    <span class="ct-chat-zone-hint">Ask anything about this problem</span>
  </div>
  <div class="ct-chat-thread" id="ct-chat-thread">
    {thread_inner}
  </div>
  <div class="ct-chat-input-row">
    <div class="ct-chat-input-wrap">
      <textarea
        class="ct-chat-input"
        id="ct-chat-input"
        data-action="chat-input"
        autocomplete="off"
        placeholder="e.g. where does ds come from? why do we switch to polar here?"
        rows="1"></textarea>
    </div>
    <button class="ct-chat-send-btn" id="ct-chat-send" data-action="chat-send" type="button">↑</button>
  </div>
</div>"""



def build_full_solution_html(solution: dict, session_id: str, profile: str = "full") -> str:
    if not solution or not solution.get("steps"):
        err = solution.get("baby_version", "Something went wrong. Try again.")
        return f'<div class="ct-solution-error">{err}</div>'
    profile = (profile or "full").strip().lower()

    parts = [
        build_baby_card_html(
            solution.get("baby_version", ""),
            solution.get("baby_analogy_label", "Analogy")
        ),
        build_col_headers_html(profile),
        '<div class="ct-step-grid" id="ct-step-grid">',
    ]
    for i, step in enumerate(solution.get("steps", [])):
        parts.append(build_step_row_html(step, i, session_id, profile))
    parts.append('</div>')
    parts.append(build_final_answer_html(
        solution.get("final_answer", ""),
        solution.get("tldr", "")
    ))
    # Chat zone — resets with each new problem
    parts.append(build_chat_zone_html([]))
    return "\n".join(parts)


# =============================================================
# PRACTICE MODE HTML BUILDERS
# =============================================================

def build_bento_grid_html() -> str:
    """
    Full bento grid of Stewart-style Calc 3 topics, organized by domain.
    Tiles show mastery/weak badges from user KB.
    Domains are collapsible.
    """
    kb       = memory.load()
    mastered = set(kb.get("mastered_concepts", []))
    weak     = set(kb.get("weak_areas", []))

    parts = ['<div class="ct-practice-panel">']

    for domain in DOMAINS:
        did   = domain["id"]

        parts.append(f"""
<div class="ct-bento-section {domain['color_class']}" id="section_{did}">
  <div class="ct-domain-toggle" data-action="toggle-section" data-domain="{did}">
    <div class="ct-domain-label">
      <span class="ct-domain-emoji">{domain['emoji']}</span>
      <span class="ct-domain-name">{domain['label']}</span>
      <span class="ct-domain-desc">— {domain['description']}</span>
    </div>
    <span class="ct-domain-toggle-arrow" id="arrow_{did}">▾</span>
  </div>
        <div class="ct-bento-grid" id="grid_{did}">""")

        for topic in domain["topics"]:
            tid   = topic["id"]
            label = topic["label"]
            emoji = topic["emoji"]

            badge = ""
            if tid in mastered or label.lower() in mastered:
                badge = '<span class="ct-tile-badge mastered">✓</span>'
            elif tid in weak or label.lower() in weak:
                badge = '<span class="ct-tile-badge weak">⚡</span>'

            parts.append(f"""
    <div class="ct-topic-tile"
         id="tile_{tid}"
         data-topic="{tid}"
         data-domain="{did}"
         data-action="select-topic"
         data-label="{_escape_attr(label)}">
      <span class="ct-tile-emoji">{emoji}</span>
      <span class="ct-tile-label">{label}</span>
      {badge}
    </div>""")

        parts.append("  </div>\n</div>")

    parts.append("</div>")
    return "\n".join(parts)


def build_topics_nav_html() -> str:
    """
    Left-side topics navigator built from DOMAINS.
    Keeps navigation predictable for desktop and acts as a compact topic menu on mobile.
    """
    kb = memory.load()
    mastered = set(kb.get("mastered_concepts", []))
    weak = set(kb.get("weak_areas", []))

    items = []
    for index, domain in enumerate(DOMAINS, start=1):
        did = domain["id"]
        label = domain["label"]
        topics = domain.get("topics", [])
        topic_count = len(topics)
        solved_count = 0
        weak_count = 0
        for topic in topics:
            tid = topic["id"]
            tlabel = topic["label"].lower()
            if tid in mastered or tlabel in mastered:
                solved_count += 1
            if tid in weak or tlabel in weak:
                weak_count += 1
        badge = f"{solved_count}/{topic_count} mastered"
        if weak_count:
            badge += f" · {weak_count} weak"
        aria = _escape_attr(f"Go to {label}. {badge}")
        label_text = html.escape(label, quote=False)
        items.append(f"""
          <button class="ct-topic-nav-item" type="button"
                  data-action="go-to-topic-domain" data-domain="{did}" aria-label="{aria}">
            <span class="ct-topic-nav-index">#{index}</span>
            <span class="ct-topic-nav-name">{label_text}</span>
            <span class="ct-topic-nav-meta">{badge}</span>
          </button>""")

    return """
<div class="ct-topics-layout">
  <aside class="ct-topics-sidebar" aria-label="Topics">
    <div class="ct-topics-sidebar-head">
      <div>
        <span class="ct-topics-sidebar-title">Topics</span>
        <span class="ct-topics-sidebar-subtitle">Tap a section to jump</span>
      </div>
      <button class="ct-topic-nav-toggle" type="button"
              data-action="toggle-topic-nav"
              data-target="ct-topic-nav-list"
              aria-expanded="true"
              aria-controls="ct-topic-nav-list">
        <span>Sections</span>
        <span class="ct-topic-nav-toggle-icon">▾</span>
      </button>
    </div>
    <div class="ct-topic-nav-list" id="ct-topic-nav-list">
      {items}
    </div>
  </aside>
  <div class="ct-practice-difficulty-wrap">
    {difficulty}
  </div>
  <section class="ct-practice-content">
""".format(items="\n".join(items), difficulty=build_difficulty_selector_html())


def build_difficulty_selector_html() -> str:
    """Difficulty selector for practice mode."""
    options = []
    for diff_key in ["warmup", "standard", "hard", "evil"]:
        config = DIFFICULTY_LABELS.get(diff_key, {})
        label = html.escape(config.get("label", diff_key.title()), quote=False)
        options.append(f'<option value="{diff_key}">{label}</option>')

    return """
<div class="ct-difficulty-row">
  <span class="ct-difficulty-label">Difficulty</span>
  <select class="ct-difficulty-select" id="ct-difficulty-select" data-action="difficulty-select">
    {options}
  </select>
</div>""".format(options="\n".join(options))


def build_generated_problem_card_html(problem: dict, topic_label: str) -> str:
    """Returns just the problem content — buttons are injected by the JS modal footer."""
    diff  = problem.get("difficulty", "standard")
    ptype = problem.get("problem_type", topic_label)
    stmt  = problem.get("problem_statement", "")
    hint  = problem.get("hint", "")

    hint_html = ""
    if hint:
        hint_html = f"""
<div class="ct-problem-hint ct-hint-hidden" data-action="toggle-hint">
  <span class="ct-problem-hint-icon">💡</span>
  <span>Hint: <span class="ct-hint-text">{hint}</span>
  <span class="ct-problem-hint-toggle">(tap to reveal)</span></span>
</div>"""

    return f"""
<div class="ct-generated-problem-card">
  <div class="ct-generated-problem-card-head">
    <span class="ct-problem-diff-badge {diff}">{diff}</span>
    <span class="ct-problem-type-label">{ptype}</span>
  </div>
  <div class="ct-problem-statement" id="ct-problem-stmt">{stmt}</div>
  {hint_html}
</div>"""


# =============================================================
# JAVASCRIPT
# =============================================================

JS_BLOCK = APP_BRIDGE_SCRIPT + """
<script>
// ── Mode switching ────────────────────────────────────────
function switchMode(mode) {
  const solveEl    = document.getElementById('ct-solve-panel');
  const practiceEl = document.getElementById('ct-practice-outer');
  const sBtn       = document.getElementById('mode-btn-solve');
  const pBtn       = document.getElementById('mode-btn-practice');
  if (mode === 'solve') {
    if (solveEl)    solveEl.style.display    = '';
    if (practiceEl) practiceEl.style.display = 'none';
    sBtn?.classList.add('active');
    pBtn?.classList.remove('active');
  } else {
    if (solveEl)    solveEl.style.display    = 'none';
    if (practiceEl) practiceEl.style.display = '';
    sBtn?.classList.remove('active');
    pBtn?.classList.add('active');
  }
}

// ── Practice queue + tray + modal ────────────────────────
let _topicQueue  = [];   // [{id, label, domainId}, ...]
let _queueIdx    = 0;
let _selectedDiff = 'standard';
const _MAX_PRACTICE_QUEUE_SIZE = 2;
const _GEN_TIMEOUT_MAP_MS = { warmup: 22000, standard: 30000, hard: 48000, evil: 180000 };
const _GEN_TIMEOUT_MS_PER_EXTRA_QUEUED_TOPIC = 8000;
const _GEN_TIMEOUT_MS_MAX = 240000;
let _generateTimeoutTimer = null;
let _generationSession = null;
let _generationHeartbeatTimer = null;
let _generationSessionSeq = 0;
let _generationProgressTimer = null;

function _generationNowMs() {
  return Date.now();
}

function _generationSessionId() {
  _generationSessionSeq += 1;
  return `gen_${_generationSessionSeq}_${_generationNowMs()}`;
}

function _setPracticeGenerationNotice(message, kind = 'info') {
  const messageText = String(message || '').trim();
  const dotState = kind === 'error' ? 'error' : kind === 'success' ? 'done' : 'thinking';
  const notice = document.getElementById('ct-tray-generation-status');
  const statusNode = document.getElementById('ct-practice-status');
  if (notice) {
    notice.textContent = messageText;
    if (!messageText) {
      notice.setAttribute('aria-hidden', 'true');
    } else {
      notice.removeAttribute('aria-hidden');
    }
  }
  if (statusNode) {
    statusNode.className = 'ct-practice-status';
    if (!messageText) {
      statusNode.innerHTML = '';
      return;
    }
    statusNode.innerHTML = `<div class="ct-status"><span class="ct-status-dot ${dotState}"></span><span>${messageText}</span></div>`;
  }
}

function getGenerationTimeoutMs() {
  const base = _GEN_TIMEOUT_MAP_MS[_selectedDiff] || _GEN_TIMEOUT_MAP_MS.standard;
  const queueDepth = Math.max(1, Number(_topicQueue.length) || 1);
  const bonus = Math.max(0, queueDepth - 1) * _GEN_TIMEOUT_MS_PER_EXTRA_QUEUED_TOPIC;
  const budget = base + bonus;
  return Math.min(_GEN_TIMEOUT_MS_MAX, budget);
}

function clearGenerateTimeout() {
  if (_generateTimeoutTimer) {
    clearTimeout(_generateTimeoutTimer);
    _generateTimeoutTimer = null;
  }
}

function armGenerateTimeout(timeoutMs) {
  clearGenerateTimeout();
  const btn = document.getElementById('ct-tray-gen-btn');
  if (!btn) return;
  const effectiveTimeout = Number(timeoutMs) > 0 ? Number(timeoutMs) : getGenerationTimeoutMs();
  _generateTimeoutTimer = setTimeout(() => {
    if (btn.dataset.ctGenerateState !== 'generating') return;
    _endGenerationSession(false, `Practice generation did not return in time (lasted ${Math.round(effectiveTimeout / 1000)}s).`);
    showGenerateFailureBanner(
      `Practice generation did not return in time (lasted ${Math.round(effectiveTimeout / 1000)}s). Please retry.`
    );
    setGenerateButtonState({disabled: false, label: '↻ Retry'});
  }, effectiveTimeout);
}

function _clearGenerationSessionHeartbeat() {
  if (_generationHeartbeatTimer) {
    clearInterval(_generationHeartbeatTimer);
    _generationHeartbeatTimer = null;
  }
  if (_generationProgressTimer) {
    clearTimeout(_generationProgressTimer);
    _generationProgressTimer = null;
  }
}

function _buildQueueProgressHtml() {
  if (!_generationSession) return '';
  return _topicQueue
    .map((item, index) => {
      let state = 'pending';
      if (index < _generationSession.queueIdx) state = 'done';
      if (index === _generationSession.queueIdx) state = 'running';
      return `<div class="ct-generation-item ct-generation-item--${state}">${index + 1}. ${item.label}</div>`;
    })
    .join('');
}

function _refreshQueueProgressUI() {
  const queueNode = document.getElementById('ct-generation-queue-progress');
  if (queueNode) {
    queueNode.innerHTML = _buildQueueProgressHtml();
  }
}

function _startGenerationSession(topicLabel, topicIdx, queueLen, timeoutMs, topicId, sessionId) {
  clearGenerateTimeout();
  _clearGenerationSessionHeartbeat();
  _generationSession = {
    id: String(sessionId || _generationSessionId()),
    topicLabel: topicLabel || '',
    topicId: topicId || '',
    queueIdx: Math.max(0, Number(topicIdx) || 0),
    queueLen: Math.max(1, Number(queueLen) || _topicQueue.length || 1),
    startedAtMs: _generationNowMs(),
    timeoutMs: Number(timeoutMs) > 0 ? Number(timeoutMs) : getGenerationTimeoutMs(),
    state: 'running',
  };
  _showGenerationLoading(topicLabel, topicIdx);
  _setPracticeGenerationNotice(`Generating ${topicIdx + 1} of ${queueLen}: ${topicLabel}`, 'info');
  _refreshQueueProgressUI();

  const progressNode = document.getElementById('ct-gen-progress-text');
  const session = _generationSession;
  _generationHeartbeatTimer = setInterval(() => {
    if (!_generationSession || _generationSession.state !== 'running') return;
    const elapsedMs = _generationNowMs() - session.startedAtMs;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const remainingSec = Math.floor(Math.max(0, session.timeoutMs - elapsedMs) / 1000);
    const progress = `⏱ ${elapsedSec}s elapsed` + (remainingSec > 0 ? ` · ${remainingSec}s remaining` : ' · still running in background');
    if (progressNode) {
      progressNode.textContent = progress;
    }
    if (remainingSec <= 0 && _generationSession.state === 'running') {
      _setPracticeGenerationNotice('Still working in background…', 'error');
    }
    _refreshQueueProgressUI();
  }, 1000);

  _generationProgressTimer = setTimeout(() => {
    if (!_generationSession || _generationSession.state !== 'running') return;
    _setPracticeGenerationNotice('Still generating… you can continue with app while it finishes.', 'info');
  }, 5000);
}

function _endGenerationSession(success, finalMessage) {
  if (!_generationSession) return;
  if (success === true) {
    _generationSession.state = 'done';
  } else if (success === false) {
    _generationSession.state = 'failed';
  } else {
    _generationSession.state = 'aborted';
  }
  _clearGenerationSessionHeartbeat();
  if (finalMessage) {
    const statusKind = success === true ? 'success' : (success === false ? 'error' : 'info');
    _setPracticeGenerationNotice(finalMessage, statusKind);
  }
}

function renderGenerationProgress(payload) {
  if (!_generationSession) return;
  if (!payload || typeof payload !== 'object') return;
  const incomingId = payload.generationSessionId;
  if (incomingId && _generationSession && incomingId !== _generationSession.id) return;
  const message = String(payload.message || '');
  const kind = payload.kind || 'info';
  const topicIdx = Number(payload.queueIdx);
  if (Number.isFinite(topicIdx)) {
    _generationSession.queueIdx = Math.max(0, Math.min(topicIdx, _topicQueue.length - 1));
  }
  _setPracticeGenerationNotice(message, kind);
  if (message) {
    const progressNode = document.getElementById('ct-gen-progress-text');
    if (progressNode) progressNode.textContent = message;
  }
  const queueNode = document.getElementById('ct-generation-queue-progress');
  if (payload.queueProgressHtml && queueNode) {
    queueNode.innerHTML = String(payload.queueProgressHtml);
  } else {
    _refreshQueueProgressUI();
  }
}

function clearGenerationProgress() {
  _setPracticeGenerationNotice('', 'info');
  const queueNode = document.getElementById('ct-generation-queue-progress');
  if (queueNode) queueNode.innerHTML = '';
  const progressNode = document.getElementById('ct-gen-progress-text');
  if (progressNode) progressNode.textContent = '';
}

function setGenerateButtonState(state) {
  const btn = document.getElementById('ct-tray-gen-btn');
  if (!btn) return;
  const normalized = state || {};
  const generating = Boolean(normalized.generating);
  const disabled = normalized.disabled === undefined ? generating : Boolean(normalized.disabled);
  btn.disabled = Boolean(disabled);
  btn.textContent = normalized.label
    ? String(normalized.label)
    : (generating ? '⏳ Generating…' : '✦ Generate');
  btn.dataset.ctGenerateState = generating ? 'generating' : (btn.disabled ? 'disabled' : 'ready');
  btn.setAttribute('aria-busy', generating ? 'true' : 'false');
  if (!generating) {
    clearGenerateTimeout();
  }
}

// Inject fixed tray + modal overlay into <body> once
function injectPracticeTray() {
  if (document.getElementById('ct-practice-tray')) return;

  // Styling for tray/modal now comes from assets/custom.css.

  // Tray
  const tray = document.createElement('div');
  tray.id = 'ct-practice-tray';
  tray.className = 'ct-practice-tray';
  tray.style.display = 'none';
  tray.innerHTML = `
    <div class="ct-tray-inner">
      <span class="ct-tray-label" id="ct-tray-label">Queue (0/2)</span>
      <div class="ct-tray-chips" id="ct-tray-chips">
        <span class="ct-tray-empty">Pick topics below</span>
      </div>
      <span class="ct-tray-warning" id="ct-tray-warning" aria-live="polite"></span>
      <span class="ct-tray-generation-status" id="ct-tray-generation-status" aria-live="polite"></span>
      <div class="ct-tray-sep"></div>
      <span class="ct-tray-diff" id="ct-tray-diff">🔵 Standard</span>
      <div class="ct-tray-sep"></div>
      <button class="ct-tray-gen-btn" id="ct-tray-gen-btn"
              data-action="generate-problem" disabled>✦ Generate</button>
    </div>`;
  document.body.appendChild(tray);

  // Modal
  const modal = document.createElement('div');
  modal.id = 'ct-problem-modal';
  modal.className = 'ct-problem-modal';
  modal.innerHTML = `
    <div class="ct-modal-backdrop" data-action="close-problem-modal"></div>
    <div class="ct-modal-panel">
      <div class="ct-modal-handle"></div>
      <div class="ct-modal-header" id="ct-modal-header"></div>
      <div class="ct-modal-body" id="ct-modal-body"></div>
      <div class="ct-modal-footer" id="ct-modal-footer"></div>
    </div>`;
  document.body.appendChild(modal);
}

// ── Topic selection (multi-select queue) ──────────────────
function selectTopic(topicId, label, domainId, tileEl) {
  const existingIdx = _topicQueue.findIndex(t => t.id === topicId);
  if (existingIdx !== -1) {
    _topicQueue.splice(existingIdx, 1);
    tileEl.classList.remove('selected');
    _setActiveDomainNav(domainId);
  } else {
    if (_topicQueue.length >= _MAX_PRACTICE_QUEUE_SIZE) {
      const warning = document.getElementById('ct-tray-warning');
      if (warning) warning.textContent = '⚠️ Max 2 topics at once for stable generation. Remove one to add another.';
      return;
    }
    _topicQueue.push({ id: topicId, label, domainId });
    tileEl.classList.add('selected');
    _setActiveDomainNav(domainId);
  }
  _syncQueueVisuals();
  _updateTray();
}

function _setActiveDomainNav(domainId) {
  const requested = document.querySelector(`.ct-topic-nav-item[data-domain="${domainId}"]`);
  const active = document.querySelector('.ct-topic-nav-item.ct-topic-nav-active');
  if (active) active.classList.remove('ct-topic-nav-active');
  if (requested) requested.classList.add('ct-topic-nav-active');
}

function _syncTileQueueState() {
  document.querySelectorAll('.ct-topic-tile.ct-topic-queued, .ct-topic-tile[data-queue-index]').forEach((tile) => {
    tile.classList.remove('selected', 'ct-topic-queued');
    tile.dataset.ctQueueIndex = '';
    const existing = tile.querySelector('.ct-queue-badge');
    if (existing) existing.remove();
  });

  _topicQueue.forEach((t, i) => {
    const tile = document.querySelector(`[data-topic="${t.id}"]`);
    if (!tile) return;
    tile.classList.add('selected', 'ct-topic-queued');
    tile.dataset.ctQueueIndex = String(i + 1);
    const badge = document.createElement('span');
    badge.className = 'ct-queue-badge';
    badge.textContent = String(i + 1);
    tile.appendChild(badge);
  });
}

function _renderQueueChips() {
  const chips = document.getElementById('ct-tray-chips');
  const trayLabel = document.getElementById('ct-tray-label');
  if (chips) {
    if (_topicQueue.length === 0) {
      chips.innerHTML = '<span class="ct-tray-empty">Pick topics below</span>';
    } else {
      chips.innerHTML = _topicQueue
        .map((t, i) => `
          <span class="ct-tray-chip" data-action="remove-tray-topic" data-index="${i}">
            <span class="ct-tray-chip-num">${i + 1}</span>
            ${t.label}
            <span class="ct-tray-chip-x">×</span>
          </span>`).join('');
    }
  }
  if (trayLabel) trayLabel.textContent = `Queue (${_topicQueue.length}/${_MAX_PRACTICE_QUEUE_SIZE})`;
}

function _syncQueueVisuals() {
  _syncTileQueueState();
  _renderQueueChips();
}

function _updateTray() {
  const tray   = document.getElementById('ct-practice-tray');
  const genBtn = document.getElementById('ct-tray-gen-btn');
  if (!tray) return;
  _syncQueueVisuals();

  if (_topicQueue.length === 0) {
    tray.style.display = 'none';
    setGenerateButtonState({disabled: true});
    const warning = document.getElementById('ct-tray-warning');
    if (warning) warning.textContent = '';
    return;
  }
  tray.style.display = '';

  const warning = document.getElementById('ct-tray-warning');
  if (warning) {
    if (_topicQueue.length >= _MAX_PRACTICE_QUEUE_SIZE) {
      warning.textContent = '⚠️ Max 2 topics at once for stable generation.';
      tray.classList.add('ct-practice-tray--maxed');
    } else {
      warning.textContent = '';
      tray.classList.remove('ct-practice-tray--maxed');
    }
  }
  if (genBtn) setGenerateButtonState({disabled: false});
}

function _removeTrayTopic(idx) {
  if (!Number.isFinite(idx) || idx < 0) return;
  const removed = _topicQueue[idx];
  if (!removed) return;
  _topicQueue.splice(idx, 1);
  const tile = document.querySelector(`[data-topic="${removed.id}"]`);
  if (tile) tile.classList.remove('selected');
  if (removed.domainId) _setActiveDomainNav(removed.domainId);
  _updateTray();
}

// ── Difficulty selection ──────────────────────────────────
const _diffLabels = {warmup:'🟢 Warm-up',standard:'🔵 Standard',hard:'🟠 Hard',evil:'🔴 Evil'};
function selectDiff(diff, chipEl) {
  document.querySelectorAll('.ct-diff-chip').forEach(c => c.classList.remove('selected'));
  if (chipEl) chipEl.classList.add('selected');
  _selectedDiff = diff;
  const el = document.getElementById('ct-tray-diff');
  const select = document.getElementById('ct-difficulty-select');
  if (select && select.value !== diff) {
    select.value = diff;
  }
  if (el) el.textContent = _diffLabels[diff] || diff;
}

function setComponentPayload(inputId, value) {
  const wrapper = document.getElementById(inputId);
  if (!wrapper) return false;
  const field = wrapper.querySelector('input, textarea');
  const target = field || wrapper;
  const text = value === undefined ? '' : String(value);
  const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value');
  if (setter && typeof setter.set === 'function') {
    setter.set.call(target, text);
  } else {
    target.value = text;
  }
  target.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

// ── Generate ──────────────────────────────────────────────
function triggerGenerate() {
  if (_topicQueue.length === 0) return;
  _queueIdx = 0;
  _generateForIndex(0);
}

function _generateForIndex(idx) {
  const topic = _topicQueue[idx];
  if (!topic) return;
  const timeoutMs = getGenerationTimeoutMs();
  const generationSessionId = _generationSessionId();
  _startGenerationSession(topic.label, idx, _topicQueue.length, timeoutMs, topic.id, generationSessionId);
  armGenerateTimeout(timeoutMs);
  const payload = JSON.stringify({
    topicId:    topic.id,
    topicLabel: topic.label,
    difficulty: _selectedDiff,
    queueIdx:   idx,
    queueLen:   _topicQueue.length,
    generationTimeoutMs: timeoutMs,
    generationSessionId,
  });
  setComponentPayload('ct-gen-payload', payload);
  setGenerateButtonState({generating: true});
}

function showGenerateFailureBanner(message) {
  _endGenerationSession(false, message);
  const modal = document.getElementById('ct-problem-modal');
  if (!modal || !modal.classList.contains('open')) return;
  const body = document.getElementById('ct-modal-body');
  const footer = document.getElementById('ct-modal-footer');
  if (body) {
    body.innerHTML = `<div class="ct-why-error">Generation failed: ${message || 'Please retry.'}</div>`;
  }
  if (footer) {
    footer.innerHTML = `
      <button class="ct-modal-btn" data-action="regenerate-problem" type="button">↻ Try again</button>`;
  }
}

function _showGenerationLoading(topicLabel, idx) {
  const msg = `Generating ${idx + 1} of ${_topicQueue.length}: ${topicLabel}`;
  const trayLabel = document.getElementById('ct-tray-label');
  if (trayLabel) trayLabel.textContent = msg;
  const progressNode = document.getElementById('ct-gen-progress-text');
  if (progressNode) progressNode.textContent = 'Queued…';
  _setPracticeGenerationNotice(msg, 'info');
}

function closeProblemModal() {
  if (_generationSession && _generationSession.state === 'running') {
    _endGenerationSession(null, '');
  }
  const modal = document.getElementById('ct-problem-modal');
  if (modal) modal.classList.remove('open');
  document.body?.classList?.remove('ct-modal-open');
  const tray = document.getElementById('ct-practice-tray');
  if (tray) tray.classList.remove('ct-practice-tray--modal-open');
  clearGenerationProgress();
}

function regenerateProblem() { _generateForIndex(_queueIdx); }

function nextTopicInQueue() {
  _queueIdx++;
  if (_queueIdx < _topicQueue.length) {
    _generateForIndex(_queueIdx);
  } else {
    closeProblemModal();
    _topicQueue = []; _queueIdx = 0;
    document.querySelectorAll('.ct-topic-tile.selected').forEach(t => t.classList.remove('selected'));
    document.querySelectorAll('.ct-queue-badge').forEach(b => b.remove());
    _updateTray();
  }
}

function resetGenBtn() {
  setGenerateButtonState({disabled: (_topicQueue.length === 0)});
}

// ── Solve generated problem ───────────────────────────────
function solveGeneratedProblem(problemText) {
  const stmtEl = document.getElementById('ct-problem-stmt');
  const fallbackProblem = stmtEl ? (stmtEl.textContent || stmtEl.innerText) : '';
  const finalProblemText = String(problemText || '').trim() || String(fallbackProblem || '').trim();
  if (!finalProblemText) return;
  switchMode('solve');
  const submitSolveFromPanel = () => {
    const textarea = document.querySelector('#ct-solve-panel textarea');
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      ).set;
      setter.call(textarea, finalProblemText);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof setComponentPayload === 'function') {
        setComponentPayload('ct-problem-input', finalProblemText);
      }
    }
    const btn = document.querySelector('.ct-solve-btn');
    if (btn) btn.click();
  };
  requestAnimationFrame(submitSolveFromPanel);
}

function startPracticeSolve(problemText, queueIdx, queueLen, generationSessionId) {
  const incomingSession = generationSessionId ? String(generationSessionId) : '';
  if (incomingSession && _generationSession && _generationSession.id && incomingSession !== _generationSession.id) return;
  if (_generationSession) _endGenerationSession(true, 'Problem generated');
  if (typeof closeProblemModal === 'function') {
    closeProblemModal();
  }
  _setPracticeGenerationNotice('Problem solved view loading…', 'info');
  if (typeof queueIdx === 'number' && Number.isFinite(queueIdx)) {
    _queueIdx = Math.max(0, queueIdx);
  }
  if (typeof queueLen === 'number' && Number.isFinite(queueLen)) {
    _topicQueue = _topicQueue.slice(0, Math.max(1, queueLen));
  }
  setGenerateButtonState({generating: false, disabled: (_topicQueue.length === 0)});
  solveGeneratedProblem(problemText);
}

// ── Domain collapse ───────────────────────────────────────
function toggleSection(domainId) {
  const s = document.getElementById('section_' + domainId);
  if (s) s.classList.toggle('collapsed');
}

function goToTopicDomain(domainId) {
  if (!domainId) return;
  const target = document.getElementById(`section_${domainId}`);
  if (!target) return;
  if (target.classList.contains('collapsed')) {
    toggleSection(domainId);
  }
  _setActiveDomainNav(domainId);
  if (typeof collapseMobileTopicsNav === 'function' && window.matchMedia && window.matchMedia('(max-width: 700px)').matches) {
    collapseMobileTopicsNav(true);
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function collapseMobileTopicsNav(forceCollapsed = false) {
  const navList = document.getElementById('ct-topic-nav-list');
  const navToggle = document.querySelector('[data-action="toggle-topic-nav"]');
  if (!navList || !navToggle) return;
  const isCollapsed = navList.classList.contains('ct-topic-nav-list--collapsed');
  if (forceCollapsed) {
    if (!isCollapsed) {
      navList.classList.add('ct-topic-nav-list--collapsed');
      navToggle.setAttribute('aria-expanded', 'false');
      const icon = navToggle.querySelector('.ct-topic-nav-toggle-icon');
      if (icon) icon.textContent = '▸';
    }
    return;
  }
  const nowCollapsed = navList.classList.toggle('ct-topic-nav-list--collapsed');
  navToggle.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
  const icon = navToggle.querySelector('.ct-topic-nav-toggle-icon');
  if (icon) icon.textContent = nowCollapsed ? '▸' : '▾';
}

function toggleTopicsNav() {
  collapseMobileTopicsNav();
}

// ── Got-it ────────────────────────────────────────────────
function toggleGotIt(stepId, labelEl) {
  const checkEl  = document.getElementById('check_' + stepId);
  const rowEl    = document.getElementById('row_' + stepId);
  const numEl    = document.getElementById('num_' + stepId);
  const noteEl   = document.getElementById('note_' + stepId);
  const note     = noteEl ? noteEl.value : '';
  const concept  = rowEl ? rowEl.dataset.concept : stepId;
  const isChecked = !checkEl.classList.contains('checked');
  checkEl.classList.toggle('checked', isChecked);
  rowEl.classList.toggle('mastered', isChecked);
  numEl.style.background = isChecked ? 'var(--success)' : '';
  const payload = JSON.stringify({ stepId, concept, note, checked: isChecked });
  setComponentPayload('ct-gotit-payload', payload);
}

// ── Notes ─────────────────────────────────────────────────
function saveNote(stepId, value) {
  if (!value.trim()) return;
  const payload = JSON.stringify({ stepId, note: value, action: 'note' });
  setComponentPayload('ct-note-payload', payload);
}

// ── Why ───────────────────────────────────────────────────
function toggleWhy(btnId, panelId, mode, btn) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  if (panel.classList.contains('open')) {
    panel.classList.remove('open'); btn.textContent = 'why?'; return;
  }
  if (panel.dataset.loaded === '1') {
    panel.classList.add('open'); btn.textContent = 'close'; return;
  }
  panel.innerHTML = '<div class="ct-why-loading"><div class="ct-spinner"></div> Thinking…</div>';
  panel.classList.add('open');
  btn.textContent = 'close';
  const row      = panel.closest('.ct-step-row');
  const stepData = row ? row.dataset.step : '{}';
  const babyVer  = document.querySelector('.ct-baby-content')?.textContent || '';
  const payload  = JSON.stringify({
    panelId, mode,
    stepData: JSON.parse(stepData || '{}'),
    babyVersion: babyVer
  });
  setComponentPayload('ct-why-payload', payload);
}

// ── Symbol toolbar — insert LaTeX at cursor ───────────────
function insertSymbol(btn) {
  // Read raw latex from data attribute (browser un-escapes HTML entities)
  const latex = btn.dataset.latex;

  // Find the active Gradio textarea in the solve panel
  const panel    = document.getElementById('ct-solve-panel');
  const textarea = panel ? panel.querySelector('textarea') : null;
  if (!textarea) return;

  textarea.focus();

  // Insert at cursor using execCommand for undo support (with fallback)
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  const val   = textarea.value;

  // If latex contains {}, place cursor inside first {}
  const cursorOffset = latex.indexOf('{}') !== -1
    ? latex.indexOf('{}') + 1   // inside the first brace pair
    : latex.length;

  const newVal = val.slice(0, start) + latex + val.slice(end);

  // Use native input setter to trigger Gradio's React binding
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  ).set;
  nativeSetter.call(textarea, newVal);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));

  // Restore cursor position inside the first {} if present
  const newCursor = start + cursorOffset;
  textarea.setSelectionRange(newCursor, newCursor);

  // Flash the button
  btn.classList.add('inserted');
  setTimeout(() => btn.classList.remove('inserted'), 350);
}


function dispatchFrontendAction(payloadJson) {
  if (window.CalcTutorBridge && typeof window.CalcTutorBridge.dispatchFrontendAction === "function") {
    return window.CalcTutorBridge.dispatchFrontendAction(payloadJson);
  }

  if (!payloadJson) return;
  let payload = payloadJson;
  if (typeof payloadJson === "string") {
    if (!payloadJson.trim()) return;
    try {
      payload = JSON.parse(payloadJson);
    } catch (err) {
      console.error("Invalid frontend payload:", err);
      return;
    }
  }
  if (!payload || typeof payload !== "object") return;

  const action = payload.action || "";
  const p = payload.payload || payload;
  if (!action) return;

  switch (action) {
    case "injectWhyResponse":
      injectWhyResponse(p.panelId, p.html || "", p.mode);
      break;
    case "injectChatResponse":
      injectChatResponse(p.html || "");
      break;
    case "generationNotice":
      if (typeof _setPracticeGenerationNotice === "function") {
        _setPracticeGenerationNotice(p.message || "", p.kind || "info");
        if (p.kind === "error" && (p.code || p.message)) {
          if (typeof _endGenerationSession === "function") {
            _endGenerationSession(false, p.message || "Generation failed");
          }
          setGenerateButtonState({disabled: false, generating: false});
        }
      }
      break;
    case "generationProgress":
      if (typeof renderGenerationProgress === "function") {
        renderGenerationProgress(p);
      }
      break;
    case "clearGenerationProgress":
      clearGenerationProgress();
      break;
    case "showMathPreviewError": {
      setGenerateButtonState({disabled: (_topicQueue.length === 0)});
      const preview = document.getElementById('ct-math-preview-pane');
      if (preview) {
        preview.textContent = `Math preview error${p && p.message ? ': ' + p.message : ''}`;
      }
      break;
    }
    case "startPracticeSolve":
      if (typeof startPracticeSolve === "function") {
        startPracticeSolve(
          p.problemText || p.problem_statement || p.problemHtml || "",
          Number(p.queueIdx || 0),
          Number(p.queueLen || 1),
          p.generationSessionId
        );
      } else {
        solveGeneratedProblem(p.problemText || p.problem_statement || p.problemHtml || "");
        if (typeof _endGenerationSession === "function") {
          _endGenerationSession(true, "Problem generated");
        }
        setGenerateButtonState({generating: false});
      }
      break;
    case "toggle-topic-nav":
      if (typeof toggleTopicsNav === "function") {
        toggleTopicsNav();
      }
      break;
    default:
      console.warn("Unknown frontend action:", action);
  }
}

function injectWhyResponse(panelId, html, mode) {
  if (window.CalcTutorBridge && typeof window.CalcTutorBridge.injectWhyResponse === "function") {
    return window.CalcTutorBridge.injectWhyResponse(panelId, html, mode);
  }
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.innerHTML = html || "";
  panel.classList.add("open");
  panel.dataset.loaded = '1';
  if (mode) panel.dataset.mode = mode;
  if (typeof window.scheduleLatexRender === "function") {
    window.scheduleLatexRender();
  } else if (typeof window.renderLatex === "function") {
    window.renderLatex();
  }
}

function injectChatResponse(html) {
  if (window.CalcTutorBridge && typeof window.CalcTutorBridge.injectChatResponse === "function") {
    return window.CalcTutorBridge.injectChatResponse(html);
  }
  const thread  = document.getElementById('ct-chat-thread');
  const thinking = document.getElementById('ct-thinking');
  const sendBtn  = document.getElementById('ct-chat-send');

  if (thinking) thinking.remove();
  if (thread && html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    thread.appendChild(div.firstElementChild || div);
    thread.scrollTop = thread.scrollHeight;
  }
  if (sendBtn) sendBtn.disabled = false;
}

function showProblemModal(html, queueIdx, queueLen, generationSessionId) {
  if (window.CalcTutorBridge && typeof window.CalcTutorBridge.showProblemModal === "function") {
    return window.CalcTutorBridge.showProblemModal(html, queueIdx, queueLen, generationSessionId);
  }
  if (_generationSession && generationSessionId && _generationSession.id && generationSessionId !== _generationSession.id) return;
  const body   = document.getElementById('ct-modal-body');
  const footer = document.getElementById('ct-modal-footer');
  const header = document.getElementById('ct-modal-header');
  if (body) body.innerHTML = html;
  const hasNext = queueIdx < queueLen - 1;
  if (footer) {
    footer.innerHTML = `
      <button class="ct-modal-btn" data-action="regenerate-problem" type="button">↻ Another</button>
      <button class="ct-modal-btn ct-modal-solve" data-action="solve-from-modal" type="button">Solve it →</button>
      ${hasNext ? '<button class="ct-modal-btn primary" data-action="next-topic" type="button">Next topic →</button>' : ''}`;
  }
  if (header) {
    const diff = document.getElementById('ct-tray-diff');
    const diffText = diff ? diff.textContent : '';
    header.innerHTML = `<span class="ct-modal-topic">Practice Problem</span>
      <span class="ct-modal-meta">${diffText}</span>
      <button class="ct-modal-close" data-action="close-problem-modal" type="button">✕</button>`;
  }
  const modal = document.getElementById('ct-problem-modal');
  if (modal) modal.classList.add('open');
  document.body?.classList?.add('ct-modal-open');
  const tray = document.getElementById('ct-practice-tray');
  if (tray) tray.classList.add('ct-practice-tray--modal-open');
  const stmt = document.getElementById('ct-problem-stmt');
  if (stmt) {
    const txt = stmt.textContent || '';
    stmt.textContent = txt;
    if (typeof renderMathInElement === 'function' && window.KATEX_DELIMITERS) {
      renderMathInElement(stmt, {
        delimiters: KATEX_DELIMITERS,
        strict: false,
        throwOnError: false,
      });
    }
  }
  setGenerateButtonState({disabled: false});
  if (typeof _endGenerationSession === 'function') {
    _endGenerationSession(true, 'Problem generated');
  }
  renderLatex();
}

if (!(window.CalcTutorBridge && typeof window.CalcTutorBridge.updateMathPreviewFromValue === "function")) {
  window.updateMathPreviewFromValue = function(val) {
    const preview = document.getElementById('ct-math-preview-pane');
    if (!preview) return;
    const trimmed = (val || '').trim();
    if (!trimmed) {
      preview.textContent = '';
      return;
    }
    preview.textContent = trimmed;
  };
}

if (!(window.CalcTutorBridge && typeof window.CalcTutorBridge.updateMathPreview === "function")) {
  window.updateMathPreview = function(textarea) {
    window.updateMathPreviewFromValue(textarea ? textarea.value : '');
  };
}

if (!(window.CalcTutorBridge && typeof window.CalcTutorBridge.renderLatex === "function")) {
  window.renderLatex = function() {
    if (window.renderMathInElement) {
      const targets = [
        document.body,
        document.getElementById('ct-step-grid'),
        document.getElementById('ct-chat-thread'),
        document.getElementById('ct-problem-modal')
      ];
      for (const target of targets) {
        if (!target) continue;
        try {
          renderMathInElement(target, {delimiters:[
            {left:'$$',right:'$$',display:true},
            {left:'$',right:'$',display:false},
            {left:'\\\\(',right:'\\\\)',display:false},
            {left:'\\\\[',right:'\\\\]',display:true}
          ]});
        } catch (err) {}
      }
    }
  };
}

window.scheduleLatexRender = function() {
  if (window.CalcTutorBridge && typeof window.CalcTutorBridge.scheduleLatexRender === "function") {
    return window.CalcTutorBridge.scheduleLatexRender();
  }
  if (window.renderMathInElement) {
    const targets = ['ct-step-grid', 'ct-chat-thread', 'ct-problem-modal'];
    for (const id of targets) {
      const node = document.getElementById(id);
      if (node && node.nodeType === 1) {
        try { renderMathInElement(node, {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\\\(',right:'\\\\)',display:false},{left:'\\\\[',right:'\\\\]',display:true}]}); } catch (err) {}
      }
    }
  }
}

// If bridge assets loaded later, re-bind safely.
function ensureMathPreviewBridge() {
  if (window.CalcTutorBridge && typeof window.CalcTutorBridge.installLivePreview === "function") {
    const state = window.getMathPreviewDebugState ? window.getMathPreviewDebugState() : null;
    if (!state || !state.watchersInstalled) {
      window.CalcTutorBridge.installLivePreview();
    }
  }
}
document.addEventListener('DOMContentLoaded', () => {
  ensureMathPreviewBridge();
  setTimeout(ensureMathPreviewBridge, 120);
  setTimeout(ensureMathPreviewBridge, 350);
});

// ── Init ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const defaultChip = document.querySelector('.ct-diff-chip[data-diff="standard"]');
  if (defaultChip) defaultChip.classList.add('selected');
  if (typeof window.updateMathPreviewFromValue === 'function') window.updateMathPreviewFromValue('');
  if (window.CalcTutorBridge && typeof window.CalcTutorBridge.installLivePreview === "function") {
    window.CalcTutorBridge.installLivePreview();
  }
  scheduleLatexRender();
});
</script>
"""


# =============================================================
# HANDLERS
# =============================================================

SESSION_STATE_DEFAULTS = {
    "session_id": "",
    "solution": {},
    "problem_text": "",
    "chat_history": [],
    "generated_problem": {},
    "generated_topic": "",
    "solve_profile": DEFAULT_SOLVE_PROFILE,
    "generation_session": {
        "id": "",
        "topic_id": "",
        "topic_label": "",
        "difficulty": "",
        "queue_idx": 0,
        "queue_len": 1,
        "state": "idle",
        "started_at_ms": 0,
        "last_heartbeat_ms": 0,
        "timeout_ms": 0,
        "error_code": "",
        "error_message": "",
    },
}


def _coerce_state(state: dict) -> dict:
    if not isinstance(state, dict):
        state = {}
    merged = {**SESSION_STATE_DEFAULTS, **state}
    if not isinstance(merged.get("chat_history"), list):
        merged["chat_history"] = []
    if not isinstance(merged.get("generated_problem"), dict):
        merged["generated_problem"] = {}
    if merged.get("solution") is None:
        merged["solution"] = {}
    generation_session = merged.get("generation_session")
    if not isinstance(generation_session, dict):
        generation_session = {}
    merged["generation_session"] = {**SESSION_STATE_DEFAULTS["generation_session"], **generation_session}
    return merged


def _create_generation_session(
    topic_id: str,
    topic_label: str,
    difficulty: str,
    queue_idx: int,
    queue_len: int,
    timeout_seconds: float,
    session_id: Optional[str] = None,
) -> dict:
    now_ms = int(time.time() * 1000)
    return {
        "id": session_id or uuid.uuid4().hex[:10],
        "topic_id": topic_id,
        "topic_label": topic_label,
        "difficulty": difficulty,
        "queue_idx": queue_idx,
        "queue_len": max(1, queue_len),
        "state": "running",
        "started_at_ms": now_ms,
        "last_heartbeat_ms": now_ms,
        "timeout_ms": int(timeout_seconds * 1000),
        "error_code": "",
        "error_message": "",
    }


def emit_frontend_action(
    action: str,
    payload: Optional[dict] = None,
    *,
    ok: bool = True,
    error: Optional[str] = None,
    trace_id: Optional[str] = None,
) -> str:
    payload_obj = {
        "version": 1,
        "action": action,
        "payload": payload or {},
        "ok": bool(ok),
    }
    if trace_id:
        payload_obj["trace_id"] = trace_id
    if error:
        payload_obj["error"] = error
    return json.dumps(payload_obj)


def _parse_payload_json(payload_json: Optional[str]) -> Optional[dict]:
    if not payload_json:
        return None
    if isinstance(payload_json, dict):
        return payload_json
    try:
        parsed = json.loads(payload_json)
    except (TypeError, json.JSONDecodeError):
        return None
    if isinstance(parsed, dict):
        return parsed
    return None


_GEN_TIMEOUT_MAP_MS = {
    "warmup": 22000.0,
    "standard": 30000.0,
    "hard": 48000.0,
    "evil": 180000.0,
}
_GEN_TIMEOUT_MS_PER_EXTRA = 8000.0
_GEN_TIMEOUT_MS_MAX = 240000.0


def _normalize_generation_values(payload: dict, *, default_session_id: str = "") -> dict:
    """Normalize and clamp all generation payload fields without raising."""
    topic_id = str(payload.get("topicId", payload.get("topic_id", ""))).strip()
    topic_label = str(payload.get("topicLabel", payload.get("topic_label", topic_id or ""))).strip()
    difficulty = str(payload.get("difficulty", payload.get("difficulty_level", "standard"))).strip().lower()
    if difficulty not in _GEN_TIMEOUT_MAP_MS:
        difficulty = "standard"

    queue_idx = payload.get("queueIdx", payload.get("queue_idx", 0))
    queue_len = payload.get("queueLen", payload.get("queue_len", 1))
    try:
        queue_idx = int(queue_idx)
    except (TypeError, ValueError):
        queue_idx = 0
    try:
        queue_len = int(queue_len)
    except (TypeError, ValueError):
        queue_len = 1
    queue_len = max(1, min(queue_len, 2))
    queue_idx = max(0, min(queue_idx, queue_len - 1))

    timeout_ms = payload.get("generationTimeoutMs", payload.get("generation_timeout_ms", None))
    try:
        timeout_ms = float(timeout_ms)
        if timeout_ms <= 0:
            timeout_ms = None
    except (TypeError, ValueError):
        timeout_ms = None
    if timeout_ms is None:
        timeout_ms = min(
            _GEN_TIMEOUT_MS_MAX,
            _GEN_TIMEOUT_MAP_MS[difficulty] + max(0, queue_len - 1) * _GEN_TIMEOUT_MS_PER_EXTRA
        )

    timeout_seconds = max(8.0, timeout_ms / 1000.0)
    generation_session_id = str(
        payload.get("generationSessionId")
        or payload.get("generation_session_id")
        or default_session_id
        or uuid.uuid4().hex[:10]
    )

    return {
        "topic_id": topic_id,
        "topic_label": topic_label,
        "difficulty": difficulty,
        "queue_idx": queue_idx,
        "queue_len": queue_len,
        "timeout_ms": timeout_ms,
        "timeout_seconds": timeout_seconds,
        "generation_session_id": generation_session_id,
    }


def _build_generation_error_action(
    code: str,
    message: str,
    generation_session_id: str,
    *,
    status: str,
    state: Optional[dict] = None,
) -> tuple[str, str, dict]:
    generation_session = _create_generation_session(
        topic_id="",
        topic_label="",
        difficulty="standard",
        queue_idx=0,
        queue_len=1,
        timeout_seconds=8.0,
        session_id=session_id,
    )
    generation_session["state"] = "failed"
    generation_session["error_code"] = code
    generation_session["error_message"] = message
    base_state = state or {}
    base_state = _coerce_state(base_state)
    new_state = {**base_state, "generation_session": generation_session}
    payload = {
        "kind": "error",
        "code": code,
        "message": message,
        "generationSessionId": generation_session_id,
    }
    return (
        emit_frontend_action(
            "generationNotice",
            payload,
            ok=False,
            error=code,
            trace_id=generation_session_id,
        ),
        _status_html("error", status),
        new_state,
    )



def handle_solve(problem_text: str, image_upload, solve_profile: str, state: dict) -> tuple:
    state = _coerce_state(state)
    problem_text = (problem_text or "").strip()
    solve_profile = (solve_profile or DEFAULT_SOLVE_PROFILE).strip().lower()
    if solve_profile not in {"full", "baby_chad", "real_chad"}:
        solve_profile = DEFAULT_SOLVE_PROFILE

    if not problem_text and image_upload is None:
        return ("", _status_html("error", "Enter a problem or upload an image."),
                build_header_html(), build_memory_sidebar_html(), state)

    if not ollama_client.is_ollama_running():
        return ("", _status_html("error", "Ollama not running → ollama serve"),
                build_header_html(), build_memory_sidebar_html(), state)

    kb         = memory.load()
    session_id = uuid.uuid4().hex[:8]
    sys_prompt = build_image_prompt(kb, column_mode=solve_profile) if image_upload else build_system_prompt(kb, column_mode=solve_profile)

    try:
        solution = ollama_client.solve(
            system_prompt=sys_prompt,
            problem=problem_text,
            image_path=image_upload,
        )
        solution = ollama_client.normalize_solution_payload(solution)
    except Exception as e:
        return ("", _status_html("error", f"Model error: {str(e)[:120]}"),
                build_header_html(), build_memory_sidebar_html(), state)

    concepts  = solution.get("concepts_covered", [])
    summary   = problem_text[:120] if problem_text else "Image problem"
    memory.record_problem(summary, concepts)

    sol_html  = build_full_solution_html(solution, session_id, profile=solve_profile)
    status    = _status_html("done",
        f"Solved · {len(solution.get('steps',[]))} steps · {', '.join(concepts[:3])}")
    # Reset chat history on each new solve
    new_state = {
        **state,
        "session_id":   session_id,
        "solution":     solution,
        "solve_profile": solve_profile,
        "problem_text": problem_text or "Image problem",
        "chat_history": [],
    }

    return (sol_html, status, build_header_html(), build_memory_sidebar_html(), new_state)


def handle_generate_problem(payload_json: str, state: dict) -> tuple:
    """Generate a problem for selected topic + difficulty. Returns a frontend action envelope."""
    state = _coerce_state(state)
    payload = _parse_payload_json(payload_json)
    fallback_session_id = uuid.uuid4().hex[:10]
    if payload is None:
        return _build_generation_error_action(
            "invalid_payload",
            "Missing or invalid practice payload.",
            fallback_session_id,
            status="Missing practice payload.",
            state=state,
        )

    if not ollama_client.is_ollama_running():
        return _build_generation_error_action(
            "ollama_not_running",
            "Ollama is not running. Start it with `ollama serve`.",
            fallback_session_id,
            status="Ollama not running → ollama serve",
            state=state,
        )

    normalized = _normalize_generation_values(payload, default_session_id=fallback_session_id)
    topic_id = normalized["topic_id"]
    topic_lbl = normalized["topic_label"]
    if not topic_id:
        return _build_generation_error_action(
            "missing_topic",
            "Missing topic selection.",
            normalized["generation_session_id"],
            status="Missing topic selection.",
            state=state,
        )

    generation_session = _create_generation_session(
        topic_id=topic_id,
        topic_label=topic_lbl,
        difficulty=normalized["difficulty"],
        queue_idx=normalized["queue_idx"],
        queue_len=normalized["queue_len"],
        timeout_seconds=normalized["timeout_seconds"],
        session_id=normalized["generation_session_id"],
    )
    generation_session_id = generation_session["id"]
    state = {**state, "generation_session": generation_session}

    generation_timeout_seconds = normalized["timeout_seconds"]
    difficulty = normalized["difficulty"]
    queue_idx = normalized["queue_idx"]
    queue_len = normalized["queue_len"]

    kb = memory.load()
    sys_prompt, user_msg = build_problem_gen_prompt(topic_id, difficulty, kb)

    try:
        raw_problem = ollama_client.generate_text(
            system_prompt=sys_prompt,
            user_message=user_msg,
            num_ctx=1536,
            num_predict=220,
            timeout_seconds=generation_timeout_seconds,
        )
        # Mock the result dictionary since we removed the JSON constraints
        result = {
            "problem_statement": raw_problem,
            "problem_type": topic_lbl,
            "hint": "",
            "difficulty": difficulty
        }
    except httpx.TimeoutException:
        generation_session = dict(state.get("generation_session", {}))
        generation_session["state"] = "failed"
        generation_session["error_code"] = "generation_timeout"
        generation_session["error_message"] = f"Generation timed out after {int(generation_timeout_seconds)}s."
        generation_session["ended_at_ms"] = int(time.time() * 1000)
        generation_session["last_error_ms"] = generation_session["ended_at_ms"]
        state = {**state, "generation_session": generation_session}
        return (
            emit_frontend_action(
                "generationNotice",
                {
                    "kind": "error",
                    "code": "generation_timeout",
                    "message": f"Generation timed out after {int(generation_timeout_seconds)}s. Try again.",
                    "generationSessionId": generation_session_id,
                    "queueIdx": queue_idx,
                    "queueLen": queue_len,
                    "timeoutSeconds": int(generation_timeout_seconds),
                },
                ok=False,
                error="generation_timeout",
                trace_id=generation_session_id,
            ),
            _status_html("error", f"Generation timed out after {int(generation_timeout_seconds)}s."),
            state,
        )
    except Exception as e:
        generation_session = dict(state.get("generation_session", {}))
        generation_session["state"] = "failed"
        generation_session["error_code"] = "generation_error"
        generation_session["error_message"] = str(e)[:160]
        generation_session["ended_at_ms"] = int(time.time() * 1000)
        generation_session["last_error_ms"] = generation_session["ended_at_ms"]
        state = {**state, "generation_session": generation_session}
        return (
            emit_frontend_action(
                "generationNotice",
                {
                    "kind": "error",
                    "code": "generation_error",
                    "message": f"Generation error: {str(e)[:80]}",
                    "generationSessionId": generation_session_id,
                    "queueIdx": queue_idx,
                    "queueLen": queue_len,
                },
                ok=False,
                error=str(e)[:120],
                trace_id=generation_session_id,
            ),
            _status_html("error", f"Model error: {str(e)[:120]}"),
            state,
        )

    card_html  = build_generated_problem_card_html(result, topic_lbl)
    status     = _status_html("done", f"Problem built · {difficulty} · {topic_lbl}")
    new_state  = {
        **state,
        "generated_problem": result,
        "generated_topic": topic_lbl,
        "generation_session": {
            **state.get("generation_session", {}),
            "state": "done",
            "error_code": "",
            "error_message": "",
            "ended_at_ms": int(time.time() * 1000),
        },
    }

    payload_data = {
        "html": card_html,
        "problemText": result.get("problem_statement", ""),
        "queueIdx": queue_idx,
        "queueLen": queue_len,
        "generationSessionId": generation_session_id,
    }
    return (
        emit_frontend_action("startPracticeSolve", payload_data, trace_id=generation_session_id),
        status,
        new_state,
    )


def handle_got_it(payload_json: str, state: dict) -> tuple:
    state = _coerce_state(state)
    payload = _parse_payload_json(payload_json)
    if not payload:
        return build_header_html(), build_memory_sidebar_html(), state
    if payload.get("checked"):
        memory.record_got_it(
            step_id=payload.get("stepId", ""),
            concept=payload.get("concept", ""),
            note=payload.get("note", ""),
        )
    return build_header_html(), build_memory_sidebar_html(), _coerce_state(state)


def handle_note(payload_json: str, state: dict) -> tuple:
    state = _coerce_state(state)
    payload = _parse_payload_json(payload_json)
    if not payload:
        return _coerce_state(state)
    note = payload.get("note")
    step_id = payload.get("stepId", "")
    if note:
        kb = memory.load()
        kb["step_notes"][step_id] = note
        memory.save(kb)
    return _coerce_state(state)


def handle_why(payload_json: str, state: dict) -> tuple:
    payload = _parse_payload_json(payload_json)
    if not payload:
        return emit_frontend_action(
            "injectWhyResponse",
            {"panelId": "", "html": "", "mode": "both"},
            ok=False,
            error="missing_or_invalid_payload" if not payload_json else "invalid_payload",
        ), _coerce_state(state)

    panel_id     = payload.get("panelId", "")
    mode         = str(payload.get("mode", "both")).strip().lower()
    step_data    = payload.get("stepData", {})
    baby_version = payload.get("babyVersion", "")
    target_column = payload.get("targetColumn", "")
    if mode not in {"baby", "real", "both"}:
        if mode == "work":
            mode = "work"
        else:
            mode = "both"

    try:
        kb         = memory.load()
        sys_prompt = build_system_prompt(kb)
        why_prompt = build_why_prompt(
            step_data,
            baby_version,
            mode=mode,
            target_column=target_column,
        )
        result     = ollama_client.why_this_works(sys_prompt, why_prompt)
        result     = ollama_client.normalize_why_payload(result)
    except Exception as e:
        return (
            emit_frontend_action(
                "injectWhyResponse",
                {"panelId": panel_id or "_", "mode": "error", "html": f"<span>Error: {str(e)[:60]}</span>"},
                ok=False,
                error=str(e)[:120],
            ),
            _coerce_state(state),
        )

    if mode == "baby":
        content = _why_panel_html(result.get("baby_why", ""), True)
    elif mode == "real":
        content = _why_panel_html(result.get("real_why", ""), False)
    elif mode == "work":
        content = _step_work_panel_html(result.get("step_work", ""), target_column)
    else:
        content = (
            _why_panel_html(result.get("baby_why", ""), True) +
            _why_panel_html(result.get("real_why", ""), False)
        )

    return (
        emit_frontend_action(
            "injectWhyResponse",
            {"panelId": panel_id, "mode": mode, "html": content},
            trace_id=panel_id,
        ),
        _coerce_state(state),
    )


def handle_chat(payload_json: str, state: dict) -> tuple:
    """
    Handle a follow-up chat question.
    Requires an active solution in state.
    Returns (inject_js, new_state)
    """
    state = _coerce_state(state)
    payload = _parse_payload_json(payload_json)
    if not payload:
        return (
            emit_frontend_action(
                "injectChatResponse",
                {"html": ""},
                ok=False,
                error="missing_payload",
            ),
            state,
        )

    if not ollama_client.is_ollama_running():
        err_html = '<div class="ct-msg tutor"><div class="ct-msg-avatar">∫</div><div class="ct-msg-bubble">Ollama not running.</div></div>'
        return (
            emit_frontend_action(
                "injectChatResponse",
                {"html": err_html},
                ok=False,
                error="ollama_not_running",
            ),
            state,
        )

    question = (payload.get("question") or "").strip()
    if not question:
        return (
            emit_frontend_action(
                "injectChatResponse",
                {"html": ""},
                ok=False,
                error="empty_question",
            ),
            state,
        )

    solution  = state.get("solution", {})
    problem   = state.get("problem_text", "")
    history   = state.get("chat_history", [])

    if not solution:
        msg = "Solve a problem first, then ask follow-up questions here."
        bubble = f'<div class="ct-msg tutor"><div class="ct-msg-avatar">∫</div><div class="ct-msg-bubble">{msg}</div></div>'
        return (
            emit_frontend_action(
                "injectChatResponse",
                {"html": bubble},
                ok=False,
                error="missing_solution",
            ),
            state,
        )

    kb = memory.load()

    # Build Ollama-ready history (role must be "user" or "assistant")
    ollama_history = []
    for turn in history:
        role = "assistant" if turn["role"] == "tutor" else "user"
        ollama_history.append({"role": role, "content": turn["content"]})

    sys_prompt, messages = build_chat_prompt(
        kb=kb,
        problem_statement=problem,
        solution=solution,
        history=ollama_history,
        user_question=question,
    )

    try:
        result = ollama_client.chat_followup(
            system_prompt=sys_prompt,
            messages=messages,
        )
        result = ollama_client.normalize_chat_payload(result)
    except Exception as e:
        err = f'<div class="ct-msg tutor"><div class="ct-msg-avatar">∫</div><div class="ct-msg-bubble">Error: {str(e)[:80]}</div></div>'
        return (
            emit_frontend_action(
                "injectChatResponse",
                {"html": err},
                ok=False,
                error=str(e)[:120],
            ),
            state,
        )

    answer        = result.get("answer", "")
    concept       = result.get("concept_clarified", "")
    suggests_gotit = result.get("suggests_gotit", False)
    msg_id        = uuid.uuid4().hex[:8]

    # Update history in state
    new_history = history + [
        {"role": "user",  "content": question,  "msg_id": ""},
        {"role": "tutor", "content": answer, "msg_id": msg_id,
         "concept": concept, "suggests_gotit": suggests_gotit, "gotit": False},
    ]

    # Build the single tutor bubble HTML to inject
    nudge = '<span class="ct-chat-gotit-nudge">Tutor thinks you got this ↑</span>' if suggests_gotit else ""
    bubble_html = f"""
<div class="ct-msg tutor">
  <div class="ct-msg-avatar">∫</div>
  <div class="ct-msg-bubble">
    <div>{answer}</div>
    <div class="ct-chat-gotit-row">
      {nudge}
      <button class="ct-chat-gotit-btn"
              id="gotit_{msg_id}"
              data-action="chat-gotit"
              data-msg-id="{msg_id}"
              data-concept="{_escape_attr(concept)}"
              type="button">Got it</button>
    </div>
  </div>
</div>"""

    inject_js = emit_frontend_action(
        "injectChatResponse",
        {"html": bubble_html},
        trace_id=msg_id,
    )

    new_state = {**state, "chat_history": new_history}
    return inject_js, new_state


def handle_chat_gotit(payload_json: str, state: dict) -> tuple:
    """Record a chat 'Got it' to the knowledge base."""
    state = _coerce_state(state)
    payload = _parse_payload_json(payload_json)
    if not payload:
        return build_header_html(), build_memory_sidebar_html(), state
    concept = (payload.get("concept") or "").strip()
    msg_id  = payload.get("msgId", "")
    if concept:
        memory.record_got_it(step_id=f"chat_{msg_id}", concept=concept)
    # Mark gotit in chat history
    history = state.get("chat_history", [])
    for turn in history:
        if turn.get("msg_id") == msg_id:
            turn["gotit"] = True
    state = {**state, "chat_history": history}
    return build_header_html(), build_memory_sidebar_html(), _coerce_state(state)



def _why_panel_html(text: str, is_baby: bool) -> str:
    icon  = "🍪" if is_baby else "∫"
    label = "Baby Why" if is_baby else "Mathematical Justification"
    return f"""
<div class="ct-why-block">
  <strong class="ct-why-title">{icon} {label}</strong>
  <div class="ct-why-content">{text}</div>
</div>"""


def _step_work_panel_html(text: str, target: str) -> str:
    target_label = {
        "baby": "Baby Expansion",
        "real": "Real Expansion",
        "chad": "Chad Expansion",
        "work": "Step Expansion",
    }.get((target or "work").strip().lower(), "Step Expansion")
    body = str(text or "").replace("\n", "<br>")
    return f"""
<div class="ct-why-block ct-step-work-block">
  <strong class="ct-why-title">⚡ {target_label}</strong>
  <div class="ct-why-content">{body}</div>
</div>"""


def _status_html(kind: str, message: str) -> str:
    message = (message or "").strip()
    if not message:
        return ""
    return f"""
<div class="ct-status">
  <span class="ct-status-dot {kind}"></span>
  <span>{message}</span>
</div>"""



# =============================================================
# SYMBOL TOOLBAR
# =============================================================

# (display_glyph, latex_to_insert, tooltip_override_or_None)
SYMBOL_GROUPS = [
    ("Integrals & Derivatives", [
        ("∫",  r"\int",            None),
        ("∬",  r"\iint",           None),
        ("∭",  r"\iiint",          None),
        ("∮",  r"\oint",           None),
        ("∂",  r"\partial",        None),
        ("∇",  r"\nabla",          None),
        ("d",   "d",               "d (differential)"),
        ("Δ",  r"\Delta",          None),
        ("∞",  r"\infty",          None),
        ("lim", r"\lim_{x \to }",  "limit"),
        ("→",  r"\to",             None),
        ("±",  r"\pm",             None),
    ]),
    ("Fractions & Powers", [
        ("a/b",  r"\frac{}{}",      "fraction"),
        ("xⁿ",  r"^{}",            "superscript"),
        ("xₙ",  r"_{} ",           "subscript"),
        ("√",   r"\sqrt{}",        None),
        ("ⁿ√",  r"\sqrt[n]{}",     "nth root"),
        ("·",   r"\cdot",          "dot product"),
        ("×",   r"\times",         "cross product"),
    ]),
    ("Bounds & Notation", [
        ("∑",   r"\sum_{i=}^{}",   "sum"),
        ("∏",   r"\prod_{i=}^{}",  "product"),
        ("∈",   r"\in",            None),
        ("⊂",   r"\subset",        None),
        ("∪",   r"\cup",           None),
        ("∩",   r"\cap",           None),
        ("≤",   r"\leq",           None),
        ("≥",   r"\geq",           None),
        ("≠",   r"\neq",           None),
        ("≈",   r"\approx",        None),
    ]),
    ("Greek", [
        ("α",  r"\alpha",   None),
        ("β",  r"\beta",    None),
        ("γ",  r"\gamma",   None),
        ("λ",  r"\lambda",  None),
        ("μ",  r"\mu",      None),
        ("π",  r"\pi",      None),
        ("σ",  r"\sigma",   None),
        ("θ",  r"\theta",   None),
        ("φ",  r"\phi",     None),
        ("ω",  r"\omega",   None),
        ("ε",  r"\epsilon", None),
        ("ρ",  r"\rho",     None),
    ]),
    ("Vectors & Sets", [
        ("â",   r"\hat{}",        "unit vector"),
        ("ā",   r"\bar{}",        "bar"),
        ("→",   r"\vec{}",        "vector"),
        ("‖·‖", r"\|\|",          "norm"),
        ("⟨,⟩", r"\langle , \rangle", "angle brackets"),
        ("ℝ",   r"\mathbb{R}",    None),
        ("ℝ²",  r"\mathbb{R}^2",  None),
        ("ℝ³",  r"\mathbb{R}^3",  None),
        ("∅",   r"\emptyset",     None),
    ]),
]


def build_symbol_toolbar_html() -> str:
    """Compact always-visible symbol grid that inserts LaTeX at cursor."""
    parts = ['<div class="ct-symbol-toolbar"><div class="ct-symbol-grid">']

    for group_name, symbols in SYMBOL_GROUPS:
        parts.append(f'<div class="ct-sym-cat">{group_name}</div>')
        for glyph, latex, tip in symbols:
            # Escape for HTML attribute — double backslashes, escape quotes
            latex_attr  = latex.replace("\\", "\\\\").replace('"', "&quot;")
            tooltip     = tip or latex
            # Keep display glyph safe
            safe_glyph  = glyph.replace("<", "&lt;").replace(">", "&gt;")
            parts.append(
                f'<button class="ct-sym-btn" '
                f'data-latex="{latex_attr}" '
                f'title="{tooltip}" '
                f'data-action="insert-symbol" '
                f'type="button">'
                f'{safe_glyph}</button>'
            )

    parts.append('</div></div>')
    return "\n".join(parts)


# =============================================================
# GRADIO UI
# =============================================================

def build_app() -> gr.Blocks:
    # Gradio 5: theme/css/head belong on Blocks. Gradio 6: pass them to launch() only.
    blocks_kw = {}
    if _gradio_major() < 6:
        blocks_kw = {
            "theme": _app_theme(),
            "css": CUSTOM_CSS,
            "head": KATEX_HEAD + JS_BLOCK,
        }
    with gr.Blocks(title="CalcTutor", **blocks_kw) as app:

        state = gr.State(_coerce_state({}))

        # Header
        header_html = gr.HTML(build_header_html())

        # Mode switcher
        gr.HTML("""
<div class="ct-mode-bar">
  <button class="ct-mode-btn active" id="mode-btn-solve"
          data-action="switch-mode"
          data-mode="solve">
    <span class="ct-mode-icon">✦</span> Solve a Problem
  </button>
  <button class="ct-mode-btn" id="mode-btn-practice"
          data-action="switch-mode"
          data-mode="practice">
    <span class="ct-mode-icon">⬡</span> Practice Mode
  </button>
</div>""")

        with gr.Row():
            # Left column
            with gr.Column(scale=3):

                # ── SOLVE PANEL ───────────────────────────
                with gr.Group(elem_id="ct-solve-panel"):
                    with gr.Group(elem_classes=["ct-input-zone"]):
                        gr.HTML(f"""
<div class="ct-solve-profile-row">
  <span class="ct-solve-profile-label">Solve columns:</span>
  <button class="ct-solve-profile-btn ct-solve-profile-active" data-action="set-solve-profile"
          data-profile="baby_chad" type="button">Baby + Chad</button>
  <button class="ct-solve-profile-btn" data-action="set-solve-profile"
          data-profile="real_chad" type="button">Real + Chad</button>
</div>""")
                        gr.HTML('<div class="ct-input-label">Problem</div>')
                        problem_input = gr.Textbox(
                            placeholder=r"e.g. \oint_C (x+2y)dx + x^2 dy  where C goes (0,0)→(2,1)→(3,0)",
                            lines=3, max_lines=8,
                            show_label=False, container=False,
                            elem_id="ct-problem-input"
                        )
                        
                        gr.HTML(
                            '<div id="ct-math-preview-pane" class="ct-math-preview">'
                            '<span class="ct-math-preview-empty">Live Math Preview...</span></div>'
                        )

                        with gr.Accordion("🧮 Math Symbols", open=False):
                            gr.HTML(build_symbol_toolbar_html())
                        with gr.Accordion("📷 Upload image instead", open=False):
                            image_input = gr.Image(
                                type="filepath",
                                label="Photo or screenshot of problem",
                                elem_classes=["ct-upload-zone"],
                                height=160,
                            )
                        solve_btn = gr.Button(
                            "✦  Solve",
                            variant="primary",
                            elem_id="ct-solve-button",
                            elem_classes=["ct-solve-btn"],
                        )

                    status_html   = gr.HTML(_status_html("", ""))
                    solution_html = gr.HTML("")

                # ── PRACTICE PANEL ────────────────────────
                with gr.Group(elem_id="ct-practice-outer"):
                    # Topics side-nav + topic sections
                    gr.HTML(build_topics_nav_html())

                    # Bento grid
                    gr.HTML(build_bento_grid_html())

                    practice_status_html = gr.HTML('<div id="ct-practice-status" class="ct-practice-status"></div>')

                    gr.HTML("</section>")

                # Hidden bridges (hidden via CSS so JS bridge IDs are always present in DOM)
                gotit_payload     = gr.Textbox(
                    value="",
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"],
                    elem_id="ct-gotit-payload"
                )
                note_payload      = gr.Textbox(
                    value="",
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"],
                    elem_id="ct-note-payload"
                )
                solve_profile     = gr.Textbox(
                    value=DEFAULT_SOLVE_PROFILE,
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"],
                    elem_id="ct-solve-profile"
                )
                why_payload       = gr.Textbox(
                    value="",
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"],
                    elem_id="ct-why-payload"
                )
                why_response      = gr.Textbox(
                    value="",
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"]
                )
                gen_payload       = gr.Textbox(
                    value="",
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"],
                    elem_id="ct-gen-payload"
                )
                gen_response      = gr.Textbox(
                    value="",
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"]
                )  # JS inject bridge for modal
                chat_payload      = gr.Textbox(
                    value="",
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"],
                    elem_id="ct-chat-payload"
                )
                chat_response     = gr.Textbox(
                    value="",
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"]
                )
                chatgotit_payload = gr.Textbox(
                    value="",
                    lines=1,
                    max_lines=1,
                    show_label=False,
                    container=False,
                    visible=True,
                    elem_classes=["ct-hidden-payload"],
                    elem_id="ct-chatgotit-payload"
                )

            # Right column — memory sidebar
            with gr.Column(scale=1, min_width=220):
                memory_html = gr.HTML(build_memory_sidebar_html())

        # Init — hide practice panel, inject fixed tray + modal
        app.load(
            fn=None,
            js="""() => {
              const el = document.getElementById('ct-practice-outer');
              if (el) el.style.display = 'none';
              injectPracticeTray();
            }"""
        )

        # ── Events ────────────────────────────────────────

        solve_btn.click(
            fn=handle_solve,
            inputs=[problem_input, image_input, solve_profile, state],
            outputs=[solution_html, status_html, header_html, memory_html, state],
        )
        problem_input.submit(
            fn=handle_solve,
            inputs=[problem_input, image_input, solve_profile, state],
            outputs=[solution_html, status_html, header_html, memory_html, state],
        )
        # (Live preview is handled via global delegated 'input' event in JS_BLOCK)
        # Re-render KaTeX after solution HTML lands in the DOM
        solution_html.change(
            fn=None,
            inputs=[solution_html],
            js="(html) => { if (!html) return; setTimeout(function(){ if (typeof renderLatex === 'function') renderLatex(); }, 120); }",
        )

        gen_payload.change(
            fn=handle_generate_problem,
            inputs=[gen_payload, state],
            outputs=[gen_response, practice_status_html, state],
        )
        gen_response.change(
            fn=None,
            inputs=[gen_response],
            js="(payload) => dispatchFrontendAction(payload)",
        )

        gotit_payload.change(
            fn=handle_got_it,
            inputs=[gotit_payload, state],
            outputs=[header_html, memory_html, state],
        )
        note_payload.change(
            fn=handle_note,
            inputs=[note_payload, state],
            outputs=[state],
        )
        why_payload.change(
            fn=handle_why,
            inputs=[why_payload, state],
            outputs=[why_response, state],
        )
        why_response.change(
            fn=None,
            inputs=[why_response],
            js="(payload) => dispatchFrontendAction(payload)",
        )

        # Chat follow-up
        chat_payload.change(
            fn=handle_chat,
            inputs=[chat_payload, state],
            outputs=[chat_response, state],
        )
        chat_response.change(
            fn=None,
            inputs=[chat_response],
            js="(payload) => dispatchFrontendAction(payload)",
        )

        # Chat got-it
        chatgotit_payload.change(
            fn=handle_chat_gotit,
            inputs=[chatgotit_payload, state],
            outputs=[header_html, memory_html, state],
        )

    return app


# =============================================================
# STARTUP
# =============================================================

def check_environment():
    print("\n" + "="*52)
    print("  CalcTutor — Offline Calculus Tutor")
    print("="*52)
    if not ollama_client.is_ollama_running():
        print("⚠  Ollama not running → ollama serve")
    else:
        print("✓  Ollama running")
        models = ollama_client.list_models()
        if any("qwen2.5:latest" in m for m in models):
            print("✓  qwen2.5:latest ready")
        else:
            print(f"⚠  qwen2.5:latest not found. Available: {models}")
            print("   Pull it: ollama pull qwen2.5")
    kb = memory.load()
    print(f"✓  KB: {memory.KB_PATH} ({kb['stats']['problems_solved']} solved)")
    print("="*52 + "\n")


check_environment()
app = build_app()

if __name__ == "__main__":
    # Gradio binds IPv4 (127.0.0.1). Safari often resolves "localhost" to IPv6 (::1),
    # so http://localhost:7860/ fails with "can't connect" while 127.0.0.1 works.
    launch_kw = dict(
        server_name="127.0.0.1",
        server_port=7860,
        share=False,
        inbrowser=False,
        quiet=False,
    )
    if _gradio_major() >= 6:
        launch_kw["ssr_mode"] = False
        launch_kw.update(
            css=CUSTOM_CSS,
            head=KATEX_HEAD + JS_BLOCK,
            theme=_app_theme(),
        )
    _, local_url, _ = app.launch(**launch_kw)
    p = urlparse(local_url)
    ipv4_url = f"{p.scheme}://127.0.0.1:{p.port}/"
    webbrowser.open(ipv4_url)
    print(f"\n  Listening at: {ipv4_url}")
    if sys.platform == "darwin":
        print(
            "  (Safari: use the link above — not http://localhost — if the page won't load.)\n"
        )
