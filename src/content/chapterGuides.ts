export interface ChapterGuide {
  number: number;
  /** What the chapter is actually doing. */
  summary: string;
  /** Where it shows up, in math and outside it. */
  applications: string;
  /** The mistakes that actually cost points. */
  pitfalls: string[];
  /** How to work through it without wasting a week. */
  approach: string;
}

export const CHAPTER_GUIDES: Record<number, ChapterGuide> = {
  12: {
    number: 12,
    summary:
      "The language the rest of the course is written in: points, vectors, dot and cross products, then lines, planes, cylinders and quadric surfaces. Nothing here is hard calculus — it is bookkeeping in three dimensions, and every later chapter assumes you can do it without thinking.",
    applications:
      "Angles and distances between objects, work and torque, normals for planes and surfaces, equations of motion, and anything in graphics or physics that needs a direction and a magnitude. Surface integrals in chapter 16 are built directly on the normal vectors you learn here.",
    pitfalls: [
      "Treating a point and a position vector as interchangeable when a calculation depends on the distinction.",
      "Reversing the cross product order; a × b and b × a point opposite ways.",
      "Using a plane's direction vector where the normal belongs, or the reverse.",
      "Skipping the sketch. Quadric surfaces are much easier to identify from a rough picture than from the equation alone.",
    ],
    approach:
      "Get dot and cross products automatic first — they are the two tools everything else uses. Then practise going back and forth between an equation, a sketch, and a verbal description. If you can describe a plane or a quadric surface out loud, you know it.",
  },
  13: {
    number: 13,
    summary:
      "Vector functions trace curves in space. Differentiating one gives a tangent and, in motion problems, velocity; integrating gives position back. Arc length and curvature measure how long a curve is and how sharply it bends.",
    applications:
      "Motion along a path, speed versus velocity, arc length of cables and trajectories, curvature in road and rail design, robotics and animation paths. The unit tangent and normal reappear whenever a surface or curve needs an orientation.",
    pitfalls: [
      "Differentiating the components but then treating the result as a number instead of a vector.",
      "Forgetting the chain rule inside a component such as sin(2t).",
      "Using |r′(t)| as speed and r′(t) as velocity without keeping the distinction straight.",
      "Memorising curvature formulas without knowing which one applies: |T′|/|r′| and |r′ × r″|/|r′|³ are the same quantity.",
    ],
    approach:
      "Work every formula against a circle and a straight line, where you already know the answer. If curvature comes out 1/r for a circle of radius r and 0 for a line, you are using it correctly. Then move to helices and general curves.",
  },
  14: {
    number: 14,
    summary:
      "Derivatives when the output depends on more than one input. A partial derivative changes one variable and freezes the rest. The gradient collects those partials into a vector that points uphill; tangent planes linearise the function; the second derivative test and Lagrange multipliers handle optimisation.",
    applications:
      "Sensitivity and error analysis, heat and diffusion, engineering design, economics, and gradient descent in machine learning. Lagrange multipliers are the standard way to optimise with a budget or constraint.",
    pitfalls: [
      "Differentiating with respect to x while accidentally letting y vary too.",
      "Chain-rule problems where the dependency diagram is skipped and a term goes missing.",
      "Finding critical points but forgetting to evaluate the function there.",
      "Using the discriminant D = f_xx f_yy − f_xy² with the wrong sign convention, or not checking the boundary for absolute extrema.",
      "Lagrange multipliers: solving the system but not comparing against the constraint boundary or endpoints.",
    ],
    approach:
      "Partials first, until they are as automatic as single-variable derivatives. Then gradients and directional derivatives, which are mostly the same skill with a dot product attached. Optimisation last — it combines everything and is where exams concentrate.",
  },
  15: {
    number: 15,
    summary:
      "Integration over areas and volumes. The work is almost entirely in setting up the bounds: choose an order, describe the region as inequalities, integrate. Polar, cylindrical and spherical coordinates are the same idea with a different grid and a volume factor.",
    applications:
      "Mass, centre of mass, moments of inertia, volume, average value, probability densities, surface area, and anything with a density spread over a region. Coordinate changes are what make symmetric problems tractable.",
    pitfalls: [
      "Wrong bounds — by far the most common lost points. Draw the region before writing a single integral.",
      "Switching the order of integration without redrawing the region.",
      "Leaving out the Jacobian: r in polar, r in cylindrical, ρ² sin φ in spherical.",
      "Confusing ρ, φ and θ, especially which angle φ measures.",
      "Setting up a triple integral in the wrong coordinate system because the region looked simpler than it was.",
    ],
    approach:
      "For every problem, sketch the region and write its bounds as inequalities before integrating. Then do the same problem in a second order or coordinate system. If both give the same number, your setup is sound; if not, the sketch is usually wrong.",
  },
  16: {
    number: 16,
    summary:
      "Calculus of vector fields. Line integrals accumulate along curves, surface integrals accumulate over surfaces, and curl and divergence measure local rotation and expansion. Green's, Stokes' and the divergence theorem turn hard boundary integrals into easier area or volume integrals, and back.",
    applications:
      "Fluid flow and flux, circulation, electromagnetism, work along a path, and conservative-field tests. These theorems are the reason physics can move between local differential laws and global integral statements.",
    pitfalls: [
      "Getting the orientation wrong. Reversing a curve or flipping a normal changes the sign.",
      "Applying Green's or Stokes' theorem to a region that is not closed, oriented, or simply connected.",
      "Mixing up curl and divergence — one returns a vector, the other a scalar.",
      "Parameterising a surface without checking that the normal points the way the problem needs.",
      "Choosing a theorem before identifying what the integral actually is: line or surface, scalar or vector.",
    ],
    approach:
      "Classify the integral first: over a curve or a surface, of a scalar or a vector field. That decides the formula. Then check orientation and hypotheses before computing. Do one problem each way — directly and by theorem — until the two agree.",
  },
  17: {
    number: 17,
    summary:
      "Differential equations: equations relating a function to its derivatives. This chapter covers modelling, direction fields, Euler's method and separable equations. It is usually optional in Math 263.",
    applications:
      "Population and decay models, mixing problems, Newton's law of cooling, and any rate equation where the rate depends on the current amount.",
    pitfalls: [
      "Separating variables and forgetting the constant of integration.",
      "Losing a solution when dividing by an expression that can be zero.",
      "Not applying the initial condition until the very end, or applying it before integrating.",
    ],
    approach:
      "Check every solution by differentiating it back into the original equation. That single habit catches most errors in this chapter.",
  },
};

export function guideForChapter(number: number): ChapterGuide | undefined {
  return CHAPTER_GUIDES[number];
}
