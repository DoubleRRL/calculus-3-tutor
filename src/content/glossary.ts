export type GlossaryEntry = {
  id: string;
  term: string;
  short: string;
  formula?: string;
  skillIds?: string[];
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "gradient",
    term: "Gradient",
    short: "Vector of first partials; points steepest ascent; ⊥ to level curves.",
    formula: "$\\nabla f = \\langle f_x, f_y \\rangle$",
    skillIds: ["u3_gradient", "u3_extrema", "u3_lagrange"],
  },
  {
    id: "level-curve",
    term: "Level curve",
    short: "Set of $(x,y)$ where $f(x,y)=c$ — a contour of constant height.",
    formula: "$f(x,y)=c$",
    skillIds: ["u3_functions", "u3_gradient"],
  },
  {
    id: "partial",
    term: "Partial derivative",
    short: "Differentiate in one variable while holding the others fixed.",
    formula: "$f_x = \\partial f/\\partial x$",
    skillIds: ["u3_partials", "u3_chain"],
  },
  {
    id: "chain-mv",
    term: "Multivariable chain rule",
    short: "Total rate = sum of (partial × how that input changes).",
    formula: "$\\dfrac{dz}{dt}=f_x x'+f_y y'$",
    skillIds: ["u3_chain"],
  },
  {
    id: "jacobian",
    term: "Jacobian",
    short: "Determinant of the derivative matrix — area/volume stretch under a change of variables.",
    formula: "$|J|=\\left|\\dfrac{\\partial(x,y)}{\\partial(u,v)}\\right|$",
    skillIds: ["u4_jacobian", "u4_polar"],
  },
  {
    id: "fubini",
    term: "Fubini's theorem",
    short: "On a rectangle (nice conditions), order of integration can be swapped.",
    formula: "$\\iint_R f = \\int_a^b\\int_c^d f\\,dy\\,dx$",
    skillIds: ["u4_double_rect"],
  },
  {
    id: "type-i",
    term: "Type I region",
    short: "$x$ between constants; for each $x$, $y$ between curves.",
    formula: "$a\\le x\\le b,\\; g(x)\\le y\\le h(x)$",
    skillIds: ["u4_bounds"],
  },
  {
    id: "type-ii",
    term: "Type II region",
    short: "$y$ between constants; for each $y$, $x$ between curves.",
    formula: "$c\\le y\\le d,\\; p(y)\\le x\\le q(y)$",
    skillIds: ["u4_bounds"],
  },
  {
    id: "conservative",
    term: "Conservative field",
    short: "$\\mathbf{F}=\\nabla f$ for some potential; path integrals depend only on endpoints.",
    formula: "$P_y=Q_x$ (2D test)",
    skillIds: ["u5_conservative", "u5_line"],
  },
  {
    id: "curl",
    term: "Curl",
    short: "Measures local rotation of a vector field.",
    formula: "$\\nabla\\times\\mathbf{F}$",
    skillIds: ["u5_curl_div", "u5_stokes"],
  },
  {
    id: "div",
    term: "Divergence",
    short: "Measures local source/sink strength of a vector field.",
    formula: "$\\nabla\\cdot\\mathbf{F}$",
    skillIds: ["u5_curl_div", "u5_divergence"],
  },
  {
    id: "green",
    term: "Green's theorem",
    short: "Planar circulation around a closed curve = double integral of curl$_z$ over the interior.",
    formula: "$\\oint_C P\\,dx+Q\\,dy=\\iint_D(Q_x-P_y)\\,dA$",
    skillIds: ["u5_green", "u5_theorem_pick"],
  },
  {
    id: "stokes",
    term: "Stokes' theorem",
    short: "Circulation around a surface boundary = flux of curl through the surface.",
    formula: "$\\oint_{\\partial S}\\mathbf{F}\\cdot d\\mathbf{r}=\\iint_S(\\nabla\\times\\mathbf{F})\\cdot d\\mathbf{S}$",
    skillIds: ["u5_stokes", "u5_theorem_pick"],
  },
  {
    id: "divergence-thm",
    term: "Divergence theorem",
    short: "Flux out of a closed surface = triple integral of divergence inside.",
    formula: "$\\iint_{\\partial V}\\mathbf{F}\\cdot d\\mathbf{S}=\\iiint_V(\\nabla\\cdot\\mathbf{F})\\,dV$",
    skillIds: ["u5_divergence", "u5_theorem_pick"],
  },
  {
    id: "dot",
    term: "Dot product",
    short: "Measures alignment; zero iff orthogonal (nonzero vectors).",
    formula: "$\\mathbf{u}\\cdot\\mathbf{v}=\\|u\\|\\|v\\|\\cos\\theta$",
    skillIds: ["u1_dot", "diag_vectors2d"],
  },
  {
    id: "cross",
    term: "Cross product",
    short: "Vector ⊥ to both; length = parallelogram area.",
    formula: "$\\|\\mathbf{u}\\times\\mathbf{v}\\|=\\|u\\|\\|v\\|\\sin\\theta$",
    skillIds: ["u1_cross"],
  },
  {
    id: "arc-length",
    term: "Arc length",
    short: "Integral of speed along a parametric curve.",
    formula: "$L=\\int_a^b \\|\\mathbf{r}'(t)\\|\\,dt$",
    skillIds: ["u2_arc_length", "u2_motion"],
  },
  {
    id: "lagrange",
    term: "Lagrange multipliers",
    short: "Optimize $f$ on $g=c$ by aligning gradients: $\\nabla f=\\lambda\\nabla g$.",
    formula: "$\\nabla f=\\lambda\\nabla g,\\; g=c$",
    skillIds: ["u3_lagrange"],
  },
];

export function glossaryForSkill(skillId: string | undefined): GlossaryEntry[] {
  if (!skillId) return GLOSSARY;
  const related = GLOSSARY.filter((e) => e.skillIds?.includes(skillId));
  const rest = GLOSSARY.filter((e) => !e.skillIds?.includes(skillId));
  return [...related, ...rest];
}
