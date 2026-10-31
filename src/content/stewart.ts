import type { ChapterDef, SectionDef } from "@/types/course";

/**
 * Stewart Calculus, 9th edition — chapters 12–16, plus chapter 17 as an
 * optional module. These are section references only; the app never ships
 * textbook problem text.
 */
export const STEWART_CHAPTERS: ChapterDef[] = [
  {
    number: 12,
    title: "Vectors and the Geometry of Space",
    sections: [
      {
        id: "12.1",
        chapter: 12,
        title: "Three-Dimensional Coordinate Systems",
        blurb: "Plot points and surfaces in space; distance and spheres.",
        prereqs: [],
      },
      {
        id: "12.2",
        chapter: 12,
        title: "Vectors",
        blurb: "Add, scale, and resolve vectors; components and magnitude.",
        prereqs: ["12.1"],
      },
      {
        id: "12.3",
        chapter: 12,
        title: "The Dot Product",
        blurb: "Angles, projections, and orthogonality.",
        prereqs: ["12.2"],
      },
      {
        id: "12.4",
        chapter: 12,
        title: "The Cross Product",
        blurb: "Cross products, torque, and parallelogram area.",
        prereqs: ["12.2", "12.3"],
      },
      {
        id: "12.5",
        chapter: 12,
        title: "Equations of Lines and Planes",
        blurb: "Line and plane equations; intersections and distances.",
        prereqs: ["12.3", "12.4"],
      },
      {
        id: "12.6",
        chapter: 12,
        title: "Cylinders and Quadric Surfaces",
        blurb: "Recognize and sketch cylinders and quadric surfaces.",
        prereqs: ["12.1"],
      },
    ],
  },
  {
    number: 13,
    title: "Vector Functions",
    sections: [
      {
        id: "13.1",
        chapter: 13,
        title: "Vector Functions and Space Curves",
        blurb: "Trace space curves; evaluate vector functions and limits.",
        prereqs: ["12.2"],
      },
      {
        id: "13.2",
        chapter: 13,
        title: "Derivatives and Integrals of Vector Functions",
        blurb: "Differentiate and integrate vector-valued functions.",
        prereqs: ["13.1"],
      },
      {
        id: "13.3",
        chapter: 13,
        title: "Arc Length and Curvature",
        blurb: "Arc length, unit tangent and normal, curvature.",
        prereqs: ["13.2"],
      },
      {
        id: "13.4",
        chapter: 13,
        title: "Motion in Space: Velocity and Acceleration",
        blurb: "Velocity, acceleration, and speed along a path.",
        prereqs: ["13.2"],
      },
    ],
  },
  {
    number: 14,
    title: "Partial Derivatives",
    sections: [
      {
        id: "14.1",
        chapter: 14,
        title: "Functions of Several Variables",
        blurb: "Domain, range, level curves, and graphs of f(x, y).",
        prereqs: ["12.1"],
      },
      {
        id: "14.2",
        chapter: 14,
        title: "Limits and Continuity",
        blurb: "Take limits along paths and test continuity.",
        prereqs: ["14.1"],
      },
      {
        id: "14.3",
        chapter: 14,
        title: "Partial Derivatives",
        blurb: "Partial and higher derivatives; implicit differentiation.",
        prereqs: ["14.1"],
      },
      {
        id: "14.4",
        chapter: 14,
        title: "Tangent Planes and Linear Approximations",
        blurb: "Tangent planes, differentials, linear approximation.",
        prereqs: ["14.3"],
      },
      {
        id: "14.5",
        chapter: 14,
        title: "The Chain Rule",
        blurb: "Chain rule for several variables, including implicit forms.",
        prereqs: ["14.3"],
      },
      {
        id: "14.6",
        chapter: 14,
        title: "Directional Derivatives and the Gradient Vector",
        blurb: "Directional derivatives, gradients, max rate of change.",
        prereqs: ["14.3", "12.3"],
      },
      {
        id: "14.7",
        chapter: 14,
        title: "Maximum and Minimum Values",
        blurb: "Critical points, second derivative test, absolute extrema.",
        prereqs: ["14.3"],
      },
      {
        id: "14.8",
        chapter: 14,
        title: "Lagrange Multipliers",
        blurb: "Constrained optimization with Lagrange multipliers.",
        prereqs: ["14.6", "14.7"],
      },
    ],
  },
  {
    number: 15,
    title: "Multiple Integrals",
    sections: [
      {
        id: "15.1",
        chapter: 15,
        title: "Double Integrals over Rectangles",
        blurb: "Set up and evaluate double integrals; Fubini's theorem.",
        prereqs: ["14.1"],
      },
      {
        id: "15.2",
        chapter: 15,
        title: "Double Integrals over General Regions",
        blurb: "Integrate over general regions; switch the order.",
        prereqs: ["15.1"],
      },
      {
        id: "15.3",
        chapter: 15,
        title: "Double Integrals in Polar Coordinates",
        blurb: "Polar regions, area element, and symmetry.",
        prereqs: ["15.2"],
      },
      {
        id: "15.4",
        chapter: 15,
        title: "Applications of Double Integrals",
        blurb: "Density, mass, center of mass, moments of inertia.",
        prereqs: ["15.2"],
      },
      {
        id: "15.5",
        chapter: 15,
        title: "Surface Area",
        blurb: "Surface area with a double integral.",
        prereqs: ["15.2", "14.3"],
      },
      {
        id: "15.6",
        chapter: 15,
        title: "Triple Integrals",
        blurb: "Triple integrals and volume.",
        prereqs: ["15.1"],
      },
      {
        id: "15.7",
        chapter: 15,
        title: "Triple Integrals in Cylindrical Coordinates",
        blurb: "Cylindrical coordinates and symmetric solids.",
        prereqs: ["15.6", "15.3"],
      },
      {
        id: "15.8",
        chapter: 15,
        title: "Triple Integrals in Spherical Coordinates",
        blurb: "Spherical coordinates: cones, spheres, and ρ bounds.",
        prereqs: ["15.6", "15.7"],
      },
      {
        id: "15.9",
        chapter: 15,
        title: "Change of Variables in Multiple Integrals",
        blurb: "Jacobians and change of variables.",
        prereqs: ["15.6"],
      },
    ],
  },
  {
    number: 16,
    title: "Vector Calculus",
    sections: [
      {
        id: "16.1",
        chapter: 16,
        title: "Vector Fields",
        blurb: "Sketch and match vector fields; conservative fields.",
        prereqs: ["12.2"],
      },
      {
        id: "16.2",
        chapter: 16,
        title: "Line Integrals",
        blurb: "Line integrals of scalar and vector fields; work.",
        prereqs: ["13.2", "16.1"],
      },
      {
        id: "16.3",
        chapter: 16,
        title: "The Fundamental Theorem for Line Integrals",
        blurb: "Path independence and potential functions.",
        prereqs: ["16.2", "14.6"],
      },
      {
        id: "16.4",
        chapter: 16,
        title: "Green's Theorem",
        blurb: "Circulation and flux forms of Green's theorem.",
        prereqs: ["16.2"],
      },
      {
        id: "16.5",
        chapter: 16,
        title: "Curl and Divergence",
        blurb: "Curl and divergence, and what they mean locally.",
        prereqs: ["16.1", "14.3"],
      },
      {
        id: "16.6",
        chapter: 16,
        title: "Parametric Surfaces and Their Areas",
        blurb: "Parameterize surfaces and compute their areas.",
        prereqs: ["16.5", "15.5"],
      },
      {
        id: "16.7",
        chapter: 16,
        title: "Surface Integrals",
        blurb: "Surface integrals of scalar and vector fields; flux.",
        prereqs: ["16.6"],
      },
      {
        id: "16.8",
        chapter: 16,
        title: "Stokes' Theorem",
        blurb: "Stokes' theorem and orientation.",
        prereqs: ["16.4", "16.7"],
      },
      {
        id: "16.9",
        chapter: 16,
        title: "The Divergence Theorem",
        blurb: "Flux through closed surfaces.",
        prereqs: ["16.7", "16.5"],
      },
    ],
  },
  {
    number: 17,
    title: "Differential Equations (optional)",
    sections: [
      {
        id: "17.1",
        chapter: 17,
        title: "Modeling with Differential Equations",
        blurb: "Build a model and check that a function solves it.",
        prereqs: [],
        optional: true,
      },
      {
        id: "17.2",
        chapter: 17,
        title: "Direction Fields and Euler's Method",
        blurb: "Read slope fields; approximate solutions numerically.",
        prereqs: ["17.1"],
        optional: true,
      },
      {
        id: "17.3",
        chapter: 17,
        title: "Separable Equations",
        blurb: "Solve separable equations with initial conditions.",
        prereqs: ["17.1"],
        optional: true,
      },
    ],
  },
];

export const ALL_STEWART_SECTIONS: SectionDef[] = STEWART_CHAPTERS.flatMap(
  (c) => c.sections,
);

export const STEWART_BY_ID: Record<string, SectionDef> = Object.fromEntries(
  ALL_STEWART_SECTIONS.map((s) => [s.id, s]),
);

/** Chapter 12–16 on by default; 17 stays off until the syllabus says otherwise. */
export const DEFAULT_INCLUDED_TOPIC_IDS: string[] = ALL_STEWART_SECTIONS.filter(
  (s) => !s.optional,
).map((s) => s.id);
