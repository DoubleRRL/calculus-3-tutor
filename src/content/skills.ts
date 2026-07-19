import type { Skill, Unit } from "@/types/content";

export const UNITS: Unit[] = [
  {
    id: "diagnostic",
    title: "Calc 1–2 Diagnostic",
    blurb: "Gate the foundations that Calc 3 quietly depends on.",
    order: 0,
  },
  {
    id: "unit1",
    title: "Vectors & 3-Space",
    blurb: "Geometry, dot/cross, lines, planes, coordinates.",
    order: 1,
  },
  {
    id: "unit2",
    title: "Vector Functions",
    blurb: "Space curves, arc length, motion in space.",
    order: 2,
  },
  {
    id: "unit3",
    title: "Partial Derivatives",
    blurb: "Limits, partials, gradient, extrema, Lagrange.",
    order: 3,
  },
  {
    id: "unit4",
    title: "Multiple Integrals",
    blurb: "Bounds, polar/cylindrical/spherical, Jacobian.",
    order: 4,
  },
  {
    id: "unit5",
    title: "Vector Calculus",
    blurb: "Line/surface integrals, Green, Stokes, Divergence.",
    order: 5,
  },
];

export const SKILLS: Skill[] = [
  // Diagnostic
  {
    id: "diag_derivatives",
    unitId: "diagnostic",
    title: "Single-variable derivatives",
    objective: "Differentiate polynomials, products, chain rule.",
    prerequisites: [],
    order: 1,
  },
  {
    id: "diag_integrals",
    unitId: "diagnostic",
    title: "Single-variable integrals",
    objective: "u-sub and basic definite integrals.",
    prerequisites: [],
    order: 2,
  },
  {
    id: "diag_vectors2d",
    unitId: "diagnostic",
    title: "2D vectors & polar",
    objective: "Dot product in 2D; convert polar ↔ rectangular.",
    prerequisites: [],
    order: 3,
  },

  // Unit 1
  {
    id: "u1_coords3d",
    unitId: "unit1",
    title: "3D coordinates & distance",
    objective: "Distance formula and sphere equations in ℝ³.",
    prerequisites: ["diag_vectors2d"],
    order: 10,
  },
  {
    id: "u1_vectors",
    unitId: "unit1",
    title: "Vectors in ℝ³",
    objective: "Magnitude, unit vectors, component arithmetic.",
    prerequisites: ["u1_coords3d"],
    order: 11,
  },
  {
    id: "u1_dot",
    unitId: "unit1",
    title: "Dot product",
    objective: "Angles, projections, orthogonality.",
    prerequisites: ["u1_vectors"],
    order: 12,
  },
  {
    id: "u1_cross",
    unitId: "unit1",
    title: "Cross product",
    objective: "Compute cross products; area of parallelogram.",
    prerequisites: ["u1_vectors", "u1_dot"],
    order: 13,
  },
  {
    id: "u1_lines_planes",
    unitId: "unit1",
    title: "Lines & planes",
    objective: "Parametric lines; plane from point + normal.",
    prerequisites: ["u1_dot", "u1_cross"],
    order: 14,
  },
  {
    id: "u1_quadrics",
    unitId: "unit1",
    title: "Quadric surfaces",
    objective: "Identify quadrics from traces/equations.",
    prerequisites: ["u1_coords3d"],
    order: 15,
  },
  {
    id: "u1_cyl_sph",
    unitId: "unit1",
    title: "Cylindrical & spherical",
    objective: "Convert among rectangular, cylindrical, spherical.",
    prerequisites: ["u1_coords3d", "diag_vectors2d"],
    order: 16,
  },

  // Unit 2
  {
    id: "u2_vector_fn",
    unitId: "unit2",
    title: "Vector-valued functions",
    objective: "Differentiate and integrate component-wise.",
    prerequisites: ["u1_vectors", "diag_derivatives"],
    order: 20,
  },
  {
    id: "u2_arc_length",
    unitId: "unit2",
    title: "Arc length",
    objective: "Compute arc length of space curves.",
    prerequisites: ["u2_vector_fn", "diag_integrals"],
    order: 21,
  },
  {
    id: "u2_motion",
    unitId: "unit2",
    title: "Motion in space",
    objective: "Velocity, acceleration, unit tangent.",
    prerequisites: ["u2_vector_fn"],
    order: 22,
  },

  // Unit 3
  {
    id: "u3_functions",
    unitId: "unit3",
    title: "Functions of several variables",
    objective: "Domains and level curves.",
    prerequisites: ["u1_coords3d"],
    order: 30,
  },
  {
    id: "u3_limits",
    unitId: "unit3",
    title: "Multivariable limits",
    objective: "Path tests; know paths don't prove existence.",
    prerequisites: ["u3_functions"],
    order: 31,
  },
  {
    id: "u3_partials",
    unitId: "unit3",
    title: "Partial derivatives",
    objective: "Compute first and second partials.",
    prerequisites: ["u3_functions", "diag_derivatives"],
    order: 32,
  },
  {
    id: "u3_chain",
    unitId: "unit3",
    title: "Multivariable chain rule",
    objective: "Apply chain rule with tree diagrams.",
    prerequisites: ["u3_partials"],
    order: 33,
  },
  {
    id: "u3_gradient",
    unitId: "unit3",
    title: "Gradient & directional derivatives",
    objective: "∇f, steepest ascent, D_u f.",
    prerequisites: ["u3_partials", "u1_dot"],
    order: 34,
  },
  {
    id: "u3_extrema",
    unitId: "unit3",
    title: "Local extrema",
    objective: "Critical points and second-derivative test.",
    prerequisites: ["u3_partials", "u3_gradient"],
    order: 35,
  },
  {
    id: "u3_lagrange",
    unitId: "unit3",
    title: "Lagrange multipliers",
    objective: "Constrained optimization with one constraint.",
    prerequisites: ["u3_gradient", "u3_extrema"],
    order: 36,
  },

  // Unit 4
  {
    id: "u4_double_rect",
    unitId: "unit4",
    title: "Double integrals (rectangles)",
    objective: "Fubini on rectangles.",
    prerequisites: ["u3_partials", "diag_integrals"],
    order: 40,
  },
  {
    id: "u4_bounds",
    unitId: "unit4",
    title: "Bounds setup Type I/II",
    objective: "Set correct limits for general regions.",
    prerequisites: ["u4_double_rect"],
    order: 41,
  },
  {
    id: "u4_polar",
    unitId: "unit4",
    title: "Polar double integrals",
    objective: "Switch to polar when symmetry demands it.",
    prerequisites: ["u4_bounds", "u1_cyl_sph"],
    order: 42,
  },
  {
    id: "u4_triple",
    unitId: "unit4",
    title: "Triple integrals",
    objective: "Set up and evaluate triple integrals.",
    prerequisites: ["u4_bounds"],
    order: 43,
  },
  {
    id: "u4_cyl_sph_int",
    unitId: "unit4",
    title: "Cylindrical & spherical integrals",
    objective: "Choose coordinates; include Jacobian factors.",
    prerequisites: ["u4_triple", "u1_cyl_sph"],
    order: 44,
  },
  {
    id: "u4_jacobian",
    unitId: "unit4",
    title: "Change of variables",
    objective: "Compute Jacobian and transform integrals.",
    prerequisites: ["u4_triple", "u3_partials"],
    order: 45,
  },

  // Unit 5
  {
    id: "u5_fields",
    unitId: "unit5",
    title: "Vector fields",
    objective: "Read and sketch basic vector fields.",
    prerequisites: ["u1_vectors", "u2_vector_fn"],
    order: 50,
  },
  {
    id: "u5_line",
    unitId: "unit5",
    title: "Line integrals",
    objective: "Compute ∫ F·dr and scalar line integrals.",
    prerequisites: ["u5_fields", "u2_vector_fn", "diag_integrals"],
    order: 51,
  },
  {
    id: "u5_conservative",
    unitId: "unit5",
    title: "Conservative fields",
    objective: "Test conservativity; find potentials.",
    prerequisites: ["u5_line", "u3_gradient"],
    order: 52,
  },
  {
    id: "u5_green",
    unitId: "unit5",
    title: "Green's theorem",
    objective: "Convert planar line ↔ double integrals.",
    prerequisites: ["u5_line", "u4_bounds"],
    order: 53,
  },
  {
    id: "u5_curl_div",
    unitId: "unit5",
    title: "Curl & divergence",
    objective: "Compute curl F and div F.",
    prerequisites: ["u3_partials", "u5_fields"],
    order: 54,
  },
  {
    id: "u5_surface",
    unitId: "unit5",
    title: "Surface integrals & flux",
    objective: "Parametrize surfaces; compute flux.",
    prerequisites: ["u5_line", "u4_triple"],
    order: 55,
  },
  {
    id: "u5_stokes",
    unitId: "unit5",
    title: "Stokes' theorem",
    objective: "Convert circulation ↔ surface curl flux.",
    prerequisites: ["u5_green", "u5_curl_div", "u5_surface"],
    order: 56,
  },
  {
    id: "u5_divergence",
    unitId: "unit5",
    title: "Divergence theorem",
    objective: "Convert flux ↔ triple divergence integral.",
    prerequisites: ["u5_curl_div", "u5_surface", "u4_triple"],
    order: 57,
  },
  {
    id: "u5_theorem_pick",
    unitId: "unit5",
    title: "Theorem selection",
    objective: "Choose Green / Stokes / Divergence under time pressure.",
    prerequisites: ["u5_green", "u5_stokes", "u5_divergence"],
    order: 58,
  },
];

export function skillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function skillsForUnit(unitId: string): Skill[] {
  return SKILLS.filter((s) => s.unitId === unitId).sort(
    (a, b) => a.order - b.order,
  );
}
