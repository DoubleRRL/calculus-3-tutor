"""
core/calc3_topics.py — Calc 3 topic taxonomy + problem generation prompts.

Topics are intentionally aligned to Stewart-style Calc 3 chapter themes and are
structured as a study-first topic picker for practice mode.
"""

# ── Calc 3 Topic Taxonomy (Stewart-oriented) ─────────────────────────

DOMAINS = [
    {
        "id": "vectors",
        "label": "Vectors & Space",
        "emoji": "→",
        "color_class": "domain-vectors",
        "description": "Stewart: geometry of 3D vectors",
        "topics": [
            {"id": "three_d_coordinates", "label": "3D Coordinate Systems", "emoji": "xyz"},
            {"id": "position_vector",     "label": "Position Vector",       "emoji": "→"},
            {"id": "dot_product",         "label": "Dot Product",           "emoji": "·"},
            {"id": "cross_product",       "label": "Cross Product",          "emoji": "×"},
            {"id": "vector_projection",   "label": "Vector Projection",      "emoji": "↗"},
            {"id": "lines_planes",        "label": "Lines & Planes in 3D",  "emoji": "⊞"},
            {"id": "vector_equations",    "label": "Vector Equations",       "emoji": "~"},
            {"id": "distance_angle",      "label": "Distance and Angles",    "emoji": "∠"},
        ]
    },
    {
        "id": "vector_functions",
        "label": "Vector Functions",
        "emoji": "⌒",
        "color_class": "domain-vfunc",
        "description": "Stewart: vector-valued functions and motion",
        "topics": [
            {"id": "vector_valued_fn",     "label": "Vector-Valued Functions", "emoji": "r(t)"},
            {"id": "parametric_curves",     "label": "Parametric Curves",       "emoji": "𝒄"},
            {"id": "motion_space",         "label": "Motion in Space",         "emoji": "⚡"},
            {"id": "arc_length",           "label": "Arc Length",              "emoji": "∫"},
            {"id": "curvature",            "label": "Curvature & TNB Frame",   "emoji": "κ"},
            {"id": "reparameterization",    "label": "Curve Reparameterization", "emoji": "t"},
        ]
    },
    {
        "id": "partial_diff",
        "label": "Partial Derivatives",
        "emoji": "∂",
        "color_class": "domain-partial",
        "description": "Stewart: multivariable differential calculus",
        "topics": [
            {"id": "limits_continuity",   "label": "Limits & Continuity",      "emoji": "lim"},
            {"id": "partial_deriv",       "label": "Partial Derivatives",      "emoji": "∂"},
            {"id": "chain_rule_multi",    "label": "Multivariable Chain Rule",  "emoji": "⛓"},
            {"id": "directional_deriv",   "label": "Directional Derivatives",   "emoji": "↗"},
            {"id": "gradient",            "label": "Gradient",                 "emoji": "∇"},
            {"id": "implicit_multivar",    "label": "Implicit Differentiation",  "emoji": "≟"},
            {"id": "differentials",       "label": "Total Differentials",       "emoji": "d"},
            {"id": "tangent_planes",      "label": "Tangent Planes",           "emoji": "⊡"},
            {"id": "optimization",        "label": "Unconstrained Optimization", "emoji": "⊕"},
            {"id": "second_derivative_test","label":"Second-Derivative Test",    "emoji": "⇌"},
            {"id": "lagrange",            "label": "Lagrange Multipliers",     "emoji": "λ"},
        ]
    },
    {
        "id": "multiple_integrals",
        "label": "Multiple Integrals",
        "emoji": "∬",
        "color_class": "domain-integrals",
        "description": "Stewart: multiple integration and change variables",
        "topics": [
            {"id": "double_integrals",    "label": "Double Integrals",           "emoji": "∬"},
            {"id": "iterated_integrals",  "label": "Iterated Integrals",         "emoji": "∫∫"},
            {"id": "polar_integrals",     "label": "Polar Coordinates",          "emoji": "○"},
            {"id": "triple_integrals",    "label": "Triple Integrals",           "emoji": "∰"},
            {"id": "cylindrical",         "label": "Cylindrical Coordinates",    "emoji": "⌀"},
            {"id": "spherical",           "label": "Spherical Coordinates",      "emoji": "●"},
            {"id": "volume_density",      "label": "Mass Density & Volume",      "emoji": "ρ"},
            {"id": "centers_moments",     "label": "Centers of Mass",            "emoji": "⚖"},
            {"id": "change_of_vars",      "label": "Change of Variables / Jacobian","emoji": "J"},
            {"id": "average_value",       "label": "Average Value",             "emoji": "⌀"},
        ]
    },
    {
        "id": "vector_calculus",
        "label": "Vector Calculus",
        "emoji": "∮",
        "color_class": "domain-vcalc",
        "description": "Stewart: fields, circulation, and flux",
        "topics": [
            {"id": "vector_fields",        "label": "Vector Fields",             "emoji": "⇝"},
            {"id": "conservative_fields",  "label": "Conservative Fields",        "emoji": "▽"},
            {"id": "potential_function",   "label": "Potential Functions",        "emoji": "φ"},
            {"id": "line_integrals",       "label": "Line Integrals",            "emoji": "∫"},
            {"id": "fundamental_thm",      "label": "FTC for Line Integrals",    "emoji": "→"},
            {"id": "greens_theorem",       "label": "Green's Theorem",           "emoji": "⊙"},
            {"id": "curl_divergence",      "label": "Curl & Divergence",         "emoji": "∇×"},
            {"id": "surface_integrals",    "label": "Surface Integrals",         "emoji": "∯"},
            {"id": "stokes_theorem",       "label": "Stokes' Theorem",           "emoji": "∮"},
            {"id": "divergence_thm",       "label": "Divergence Theorem",        "emoji": "∰"},
            {"id": "flux_integrals",       "label": "Flux Integrals",            "emoji": "Φ"},
        ]
    },
    {
        "id": "surfaces",
        "label": "Surfaces & Geometry",
        "emoji": "⬡",
        "color_class": "domain-surfaces",
        "description": "Stewart: parametric/surface geometry",
        "topics": [
            {"id": "parametric_surfaces", "label": "Parametric Surfaces",         "emoji": "⧫"},
            {"id": "quadric_surfaces",    "label": "Quadric Surfaces",            "emoji": "⬡"},
            {"id": "surface_area",        "label": "Surface Area",                "emoji": "⌂"},
            {"id": "level_curves",        "label": "Level Curves & Surfaces",     "emoji": "≋"},
            {"id": "surface_normals",     "label": "Normals & Tangent Planes",    "emoji": "⊡"},
        ]
    },
]

# Flat lookup dict: topic_id → {label, domain_id, domain_label, ...}
TOPIC_LOOKUP: dict = {}
for domain in DOMAINS:
    for topic in domain["topics"]:
        TOPIC_LOOKUP[topic["id"]] = {
            **topic,
            "domain_id":    domain["id"],
            "domain_label": domain["label"],
            "domain_emoji": domain["emoji"],
        }

DIFFICULTY_LABELS = {
    "warmup":   {"label": "Warm-up",   "desc": "Direct application, one technique"},
    "standard": {"label": "Standard",  "desc": "Typical exam problem"},
    "hard":     {"label": "Hard",      "desc": "Multi-step, requires combining ideas"},
    "evil":     {"label": "Evil",      "desc": "Conceptual trap or unusual twist"},
}


# ── Problem Generation Prompt ────────────────────────────

PROBLEM_GEN_FORMAT = """
Respond with ONLY the mathematical problem statement. No pleasantries, no markdown blocks, no 'Here is your problem:'. Just the pure problem text and LaTeX math.

Rules:
- Problem must be completely self-contained (no references to figures).
- Use specific numbers, not vague parameters.
- Use $...$ for inline math and $$...$$ for display math.
"""


def build_problem_gen_prompt(
    topic_id: str,
    difficulty: str,
    kb: dict,
) -> tuple[str, str]:
    """
    Returns (system_prompt, user_message) for problem generation.
    """
    from core.memory import build_context_snippet

    topic    = TOPIC_LOOKUP.get(topic_id, {"label": topic_id, "domain_label": "Calculus 3"})
    mem_ctx  = build_context_snippet(kb)
    diff_cfg = DIFFICULTY_LABELS.get(difficulty, DIFFICULTY_LABELS["standard"])

    system = f"""You are CalcTutor — a world-class calculus problem writer for Calc 3 students.
Use Stewart's Calculus naming and conventions when phrasing topic-appropriate problems,
and keep notation/style consistent with a university-level Calc 3 syllabus.

Your job: generate ONE original, specific, solvable calculus problem.

{mem_ctx}

Consider the user's weak areas when choosing problem specifics — target those gaps.
Do NOT generate problems on concepts already marked as mastered (they're bored of those).

{PROBLEM_GEN_FORMAT}"""

    user = f"""Generate a {diff_cfg['label']} difficulty Calc 3 problem on the topic: {topic['label']} ({topic['domain_label']}).

Difficulty definition: {diff_cfg['desc']}

Make the numbers clean but not trivial. Problem should be solvable in under 15 minutes."""

    return system, user
