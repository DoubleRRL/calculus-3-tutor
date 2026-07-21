import type { InteractionSpec } from "@/types/interactions";
import { SKILLS } from "./skills";

export type LessonDemo = {
  /** One-line micro-goal shown above the widget. */
  goal: string;
  spec: InteractionSpec;
};

export type Lesson = {
  skillId: string;
  /** Plain-language explanation (KaTeX ok via $...$). */
  eli5: string;
  /** Optional short analogy. */
  analogy?: string;
  /** Worked baby example when no interactive demo fits. */
  workedExample?: string;
  /** Interactive baby demo — preferred when a widget teaches the idea. */
  demo?: LessonDemo;
};

const LESSONS: Record<string, Omit<Lesson, "skillId">> = {
  diag_derivatives: {
    eli5:
      "A derivative is how fast something changes. If $y=x^2$, the slope at each $x$ is $2x$. Chain rule: differentiate the outside, multiply by the inside's derivative.",
    analogy: "Like a speedometer: position over time → velocity.",
    workedExample:
      "$\\dfrac{d}{dx}(3x^2+1)=6x$. Product: $(uv)'=u'v+uv'$. Chain: $(e^{2x})'=e^{2x}\\cdot 2$.",
  },
  diag_integrals: {
    eli5:
      "An integral adds up tiny pieces. The antiderivative undoes a derivative. Definite integral $\\int_a^b f$ is signed area from $a$ to $b$.",
    analogy: "Stacking thin rectangles under a curve — Riemann sums.",
    workedExample:
      "$\\int_0^2 2x\\,dx=[x^2]_0^2=4$. $u$-sub: $\\int 2x e^{x^2}dx$ with $u=x^2$.",
  },
  diag_vectors2d: {
    eli5:
      "A 2D vector $\\langle a,b\\rangle$ is an arrow. Length $\\sqrt{a^2+b^2}$. Dot product $a_1a_2+b_1b_2$ is zero when arrows are perpendicular.",
    analogy: "Directions on a flat map — north and east components.",
    demo: {
      goal: "Drag v until the live dot product hits ~0. That moment is orthogonality.",
      spec: {
        type: "vector",
        grid: { min: -3, max: 3, step: 1 },
        vectors: [
          { id: "u", tip: { x: 2, y: 0 }, fixed: true, label: "u" },
          { id: "v", tip: { x: 1, y: 1 }, label: "v" },
        ],
        task: { kind: "orthogonal", aId: "u", bId: "v" },
        show: ["dot", "magnitude"],
      },
    },
  },
  u1_coords3d: {
    eli5:
      "3D space adds a $z$ axis. Distance between points is $\\sqrt{\\Delta x^2+\\Delta y^2+\\Delta z^2}$. A sphere is all points at fixed distance from a center.",
    analogy: "GPS needs latitude, longitude, and altitude — three numbers.",
    workedExample:
      "Distance $(0,0,0)$ to $(2,3,6)$: $\\sqrt{4+9+36}=7$. Sphere radius $4$: $(x-a)^2+(y-b)^2+(z-c)^2=16$.",
  },
  u1_vectors: {
    eli5:
      "Vectors in $\\mathbb{R}^3$ still add tip-to-tail and scale by stretching. The unit vector points the same way with length $1$: $\\hat{\\mathbf{u}}=\\mathbf{u}/\\|\\mathbf{u}\\|$.",
    analogy: "A push has strength and direction — that's a vector.",
    demo: {
      goal: "Fixed u and v. Drag w so its tip lands at u+v (watch components add).",
      spec: {
        type: "vector",
        grid: { min: -1, max: 5, step: 1 },
        vectors: [
          { id: "u", tip: { x: 2, y: 1 }, fixed: true, label: "u" },
          { id: "v", tip: { x: 1, y: 2 }, fixed: true, label: "v" },
          { id: "w", tip: { x: 1, y: 1 }, label: "w" },
        ],
        task: { kind: "sum", aId: "u", bId: "v", resultId: "w" },
        show: ["magnitude"],
      },
    },
  },
  u1_dot: {
    eli5:
      "Dot product $\\mathbf{u}\\cdot\\mathbf{v}=\\|u\\|\\|v\\|\\cos\\theta$. Positive = acute angle, zero = right angle, negative = obtuse. Projection measures how much of one vector lies along another.",
    analogy: "How much of a shove goes in a chosen direction.",
    demo: {
      goal: "Drag v until it is perpendicular to fixed u — the live dot product should hit 0.",
      spec: {
        type: "vector",
        grid: { min: -4, max: 4, step: 1 },
        vectors: [
          { id: "u", tip: { x: 3, y: 1 }, fixed: true, label: "u" },
          { id: "v", tip: { x: 2, y: 2 }, label: "v" },
        ],
        task: { kind: "orthogonal", aId: "u", bId: "v" },
        show: ["dot", "projection"],
      },
    },
  },
  u1_cross: {
    eli5:
      "In 3D, $\\mathbf{u}\\times\\mathbf{v}$ is a vector perpendicular to both, length = parallelogram area. In the plane we only see the $z$-component $u_xv_y-u_yv_x$ — the signed area.",
    analogy: "Right-hand rule: fingers from u to v, thumb points cross.",
    demo: {
      goal: "With u=⟨3,0⟩ fixed, drag v so the live (u×v)_z readout equals 6.",
      spec: {
        type: "vector",
        grid: { min: -1, max: 5, step: 1 },
        vectors: [
          { id: "u", tip: { x: 3, y: 0 }, fixed: true, label: "u" },
          { id: "v", tip: { x: 1, y: 1 }, label: "v" },
        ],
        task: { kind: "matchTip", vectorId: "v", target: { x: 0, y: 2 } },
        show: ["cross", "magnitude"],
      },
    },
  },
  u1_lines_planes: {
    eli5:
      "A line needs a point and a direction: $\\mathbf{r}(t)=\\mathbf{r}_0+t\\mathbf{d}$. A plane needs a point and a normal: $\\mathbf{n}\\cdot(\\mathbf{r}-\\mathbf{r}_0)=0$.",
    analogy: "Line = laser beam. Plane = infinite flat sheet with a 'up' arrow (normal).",
    workedExample:
      "Line through $(1,0,0)$ along $\\langle 0,1,1\\rangle$: $\\langle 1,t,t\\rangle$. Plane through origin with normal $\\langle 1,2,3\\rangle$: $x+2y+3z=0$.",
  },
  u1_quadrics: {
    eli5:
      "Quadrics are the 3D cousins of conic sections. All-positive squares → ellipsoid. A minus among squares → hyperboloid. One linear variable → paraboloid. Orbit the shape, then name it.",
    analogy: "Circles/ellipses/hyperbolas extruded or spun into 3D.",
    demo: {
      goal: "Orbit this surface. When you recognize the shape, pick its name below.",
      spec: {
        type: "surface3d",
        surface: { kind: "zfn", preset: "paraboloid" },
        task: {
          kind: "identify",
          answer: "Elliptic paraboloid",
          choices: [
            "Ellipsoid",
            "Elliptic paraboloid",
            "Hyperboloid of one sheet",
            "Cone",
          ],
        },
      },
    },
  },
  u1_cyl_sph: {
    eli5:
      "Cylindrical: $(r,\\theta,z)$ — polar in $xy$ plus height. Spherical: $(\\rho,\\theta,\\phi)$ — distance from origin and two angles. Convert when the solid's symmetry matches.",
    analogy: "Cylindrical = lighthouse coords. Spherical = GPS from Earth's center.",
    workedExample:
      "$(x,y,z)=(1,1,\\sqrt{2})$ → cylindrical $r=\\sqrt{2}$, $\\theta=\\pi/4$, $z=\\sqrt{2}$. Spherical $\\rho=2$, $\\phi=\\pi/4$.",
  },
  u2_vector_fn: {
    eli5:
      "A vector function $\\mathbf{r}(t)=\\langle x(t),y(t),z(t)\\rangle$ traces a space curve as $t$ moves. Differentiate and integrate component-wise.",
    analogy: "A fly's position over time — three coords, one clock $t$.",
    demo: {
      goal: "Scrub t to π/2. The point should sit at the top of the circle ⟨0,2⟩.",
      spec: {
        type: "curve",
        grid: { min: -3, max: 3, step: 1 },
        curve: { kind: "circle", r: 2 },
        tRange: [0, 6.2832],
        initialT: 0.2,
        task: { kind: "atT", t: 1.5708 },
      },
    },
  },
  u2_arc_length: {
    eli5:
      "Arc length adds up tiny speeds: $L=\\int_a^b \\|\\mathbf{r}'(t)\\|\\,dt$. Fast stretches of the curve contribute more length per $dt$.",
    analogy: "Odometer reading along the path, not the straight shortcut.",
    workedExample:
      "$\\mathbf{r}=\\langle t,t\\rangle$ from $0$ to $1$: $\\|r'\\|=\\sqrt{2}$, length $\\sqrt{2}$.",
  },
  u2_motion: {
    eli5:
      "Velocity $\\mathbf{v}=\\mathbf{r}'$, acceleration $\\mathbf{a}=\\mathbf{v}'$. Speed is $\\|\\mathbf{v}\\|$. On a circle at constant speed, $\\mathbf{a}$ points inward and is always perpendicular to $\\mathbf{v}$.",
    analogy: "Car: velocity = where you're pointed × how fast; accel = how that changes.",
    demo: {
      goal: "Scrub to t=0 on the circle. Confirm the red a arrow is perpendicular to the green v arrow.",
      spec: {
        type: "curve",
        grid: { min: -3, max: 3, step: 1 },
        curve: { kind: "circle", r: 2 },
        tRange: [0, 6.2832],
        initialT: 1,
        task: { kind: "accelPerpVel", t: 0 },
      },
    },
  },
  u3_functions: {
    eli5:
      "A function of two variables $f(x,y)$ needs a whole plane of inputs. Level curves are the set where $f$ is constant — like contour lines on a topographic map.",
    analogy: "Temperature on a city map — one number at every (x,y).",
    demo: {
      goal: "Drag the probe around. Watch f and the contours — same height means same level curve.",
      spec: {
        type: "contour",
        grid: { min: -3, max: 3, step: 1 },
        fn: { kind: "preset", name: "paraboloid" },
        levels: [0.5, 1, 2, 3, 4],
        initialProbe: { x: 1.2, y: 0.8 },
        task: { kind: "placeProbe", target: { x: 1, y: 0 } },
      },
    },
  },
  u3_limits: {
    eli5:
      "Multivariable limits are pickier: you must get the same value along every path. Different path limits ⇒ the limit does not exist. Matching paths never proves existence alone.",
    analogy: "Approaching a mountain peak on different trails — if heights disagree, there's no single summit value.",
    workedExample:
      "$f=\\frac{xy}{x^2+y^2}$: along $y=0$ → 0; along $y=x$ → $1/2$. Limit DNE at $(0,0)$.",
    demo: {
      goal: "On this saddle, drag the probe toward the origin along the x-axis, then along y=x. Watch f change differently — that's why limits can fail.",
      spec: {
        type: "contour",
        grid: { min: -3, max: 3, step: 1 },
        fn: { kind: "preset", name: "saddle" },
        levels: [-2, -1, 0, 1, 2],
        initialProbe: { x: 2, y: 0 },
        task: { kind: "placeProbe", target: { x: 0, y: 0 }, tolerance: 0.5 },
      },
    },
  },
  u3_partials: {
    eli5:
      "A partial derivative freezes one variable and differentiates in the other. $f_x$ = slope if you walk parallel to the $x$-axis. Second partials: $f_{xx}$, $f_{xy}$, …",
    analogy: "Hold the elevator floor constant; measure how steep the hallway is.",
    workedExample:
      "$f=x^2y+y^3$: $f_x=2xy$, $f_y=x^2+3y^2$, $f_{xy}=2x$.",
  },
  u3_chain: {
    eli5:
      "If $z=f(x,y)$ and $x,y$ depend on $t$, then $\\frac{dz}{dt}=f_x x'+f_y y'$. Draw a tree: $z$ branches to $x$ and $y$, each to $t$.",
    analogy: "Two routes feed the total change — add both contributions.",
    workedExample:
      "$z=x^2+y^2$, $x=t$, $y=t^2$: $z'=2x(1)+2y(2t)=2t+4t^3$.",
    demo: {
      goal: "Hover each edge of the tree. Say the rule out loud (partial vs chain) before you hit I get it.",
      spec: {
        type: "chainTree",
        preset: "z_xy_t",
        nodes: [
          { id: "z", label: "z", x: 180, y: 36 },
          { id: "x", label: "x", x: 100, y: 110 },
          { id: "y", label: "y", x: 260, y: 110 },
          { id: "t", label: "t", x: 180, y: 184 },
        ],
        edges: [
          {
            id: "z_x",
            from: "z",
            to: "x",
            label: "∂z/∂x",
            rule: "partial",
            tip: "Hold $y$ fixed; contributes $f_x$ in $\\frac{dz}{dt}$.",
          },
          {
            id: "z_y",
            from: "z",
            to: "y",
            label: "∂z/∂y",
            rule: "partial",
            tip: "Hold $x$ fixed; contributes $f_y$ in $\\frac{dz}{dt}$.",
          },
          {
            id: "x_t",
            from: "x",
            to: "t",
            label: "dx/dt",
            rule: "chain",
            tip: "Chain: multiply the upstream partial by $\\frac{dx}{dt}$.",
          },
          {
            id: "y_t",
            from: "y",
            to: "t",
            label: "dy/dt",
            rule: "chain",
            tip: "Chain: multiply the upstream partial by $\\frac{dy}{dt}$.",
          },
        ],
      },
    },
  },
  u3_gradient: {
    eli5:
      "The gradient $\\nabla f=\\langle f_x,f_y\\rangle$ points steepest ascent and is always perpendicular to level curves. Directional derivative $D_{\\mathbf{u}}f=\\nabla f\\cdot\\mathbf{u}$ is the slope in direction $\\mathbf{u}$.",
    analogy: "Compass needle on a hill: always straight uphill, never along the contour.",
    demo: {
      goal: "Place the probe at (1,0). The green ∇f arrow should point radially out, perpendicular to the circular level curve.",
      spec: {
        type: "contour",
        grid: { min: -3, max: 3, step: 1 },
        fn: { kind: "preset", name: "paraboloid" },
        levels: [0.5, 1, 2, 3],
        initialProbe: { x: 0.5, y: 1.5 },
        task: { kind: "placeProbe", target: { x: 1, y: 0 } },
      },
    },
  },
  u3_extrema: {
    eli5:
      "Critical points solve $\\nabla f=\\mathbf{0}$ (or undefined). The second-derivative test uses $D=f_{xx}f_{yy}-(f_{xy})^2$ to classify min / max / saddle.",
    analogy: "Find where the slope vanishes, then check if it's a valley, peak, or mountain pass.",
    demo: {
      goal: "Drag the probe until ∇f vanishes (arrow shrinks to nothing) — that's the critical point of f=x²+y².",
      spec: {
        type: "contour",
        grid: { min: -3, max: 3, step: 1 },
        fn: { kind: "preset", name: "paraboloid" },
        levels: [0.5, 1, 2, 3, 4],
        initialProbe: { x: 1.5, y: 1.2 },
        task: { kind: "criticalPoint", target: { x: 0, y: 0 } },
      },
    },
  },
  u3_lagrange: {
    eli5:
      "To optimize $f$ on a constraint $g=c$, set $\\nabla f=\\lambda\\nabla g$ and keep $g=c$. Geometrically: level curve of $f$ is tangent to the constraint.",
    analogy: "Best picnic spot on a circular trail — contour of 'niceness' just kisses the trail.",
    demo: {
      goal: "Constraint circle shown in brass. Drag the probe onto the circle near (2,0) — a tangency point for f=x²+y².",
      spec: {
        type: "contour",
        grid: { min: -3, max: 3, step: 1 },
        fn: { kind: "preset", name: "paraboloid" },
        levels: [1, 2, 3, 4],
        constraint: { kind: "circle", cx: 0, cy: 0, r: 2 },
        initialProbe: { x: 0.5, y: 0.5 },
        task: { kind: "lagrangeTangency", target: { x: 2, y: 0 } },
      },
    },
  },
  u4_double_rect: {
    eli5:
      "A double integral over a rectangle adds $f(x,y)\\,dA$. Fubini: integrate one variable at a time — $\\int_a^b\\int_c^d f\\,dy\\,dx$ when the box is $[a,b]\\times[c,d]$.",
    analogy: "Volume under a roof over a rectangular floor plan.",
    demo: {
      goal: "Shaded rectangle [0,2]×[0,3]. Set order dy dx and drag limits to match ∫₀²∫₀³ 1 dy dx.",
      spec: {
        type: "region",
        grid: { min: -1, max: 4, step: 1 },
        shade: { kind: "rect", x0: 0, x1: 2, y0: 0, y1: 3 },
        integrand: "1",
        initial: {
          order: "dydx",
          outerLo: 0,
          outerHi: 1,
          innerLo: 0,
          innerHi: 1,
        },
        solution: {
          order: "dydx",
          outerLo: 0,
          outerHi: 2,
          innerLo: 0,
          innerHi: 3,
        },
        accept: [
          {
            order: "dxdy",
            outerLo: 0,
            outerHi: 3,
            innerLo: 0,
            innerHi: 2,
          },
        ],
      },
    },
  },
  u4_bounds: {
    eli5:
      "For a weird region, pick an order. Type I ($dy\\,dx$): $x$ runs between constants; for each $x$, $y$ runs between curves. Type II flips that. The shaded shape tells you which curves are inner bounds.",
    analogy: "Scan left-to-right with a vertical strip, or bottom-to-top with a horizontal strip.",
    demo: {
      goal: "Triangle under y=x from x=0 to 2. Outer: x from 0→2. Inner chips: y from 0→x (not a fake constant height).",
      spec: {
        type: "region",
        grid: { min: -0.5, max: 3, step: 0.5 },
        shade: {
          kind: "underCurve",
          x0: 0,
          x1: 2,
          yTop: "x",
          yBottom: 0,
        },
        integrand: "1",
        innerChoices: [0, "x", "y", "x2", "1-x", 2],
        initial: {
          order: "dydx",
          outerLo: 0,
          outerHi: 1,
          innerLo: 0,
          innerHi: "x2",
        },
        solution: {
          order: "dydx",
          outerLo: 0,
          outerHi: 2,
          innerLo: 0,
          innerHi: "x",
        },
        accept: [
          {
            order: "dxdy",
            outerLo: 0,
            outerHi: 2,
            innerLo: "y",
            innerHi: 2,
          },
        ],
      },
    },
  },
  u4_polar: {
    eli5:
      "Circles and pie slices love polar. Replace $dA$ by $r\\,dr\\,d\\theta$ — the extra $r$ is the Jacobian. Don't forget it.",
    analogy: "Measuring pizza with radius and angle instead of x and y.",
    demo: {
      goal: "Quarter disk of radius 2. Choose r dr dθ; set θ: 0→π/2 and r: 0→2.",
      spec: {
        type: "region",
        grid: { min: -0.5, max: 3, step: 0.5 },
        shade: {
          kind: "polarSector",
          r0: 0,
          r1: 2,
          theta0: 0,
          theta1: 1.5708,
        },
        integrand: "1",
        initial: {
          order: "rdθ",
          outerLo: 0,
          outerHi: 1,
          innerLo: 0,
          innerHi: 1,
        },
        solution: {
          order: "rdθ",
          outerLo: 0,
          outerHi: 1.5708,
          innerLo: 0,
          innerHi: 2,
        },
      },
    },
  },
  u4_triple: {
    eli5:
      "Triple integrals add over a solid: $\\iiint f\\,dV$. Set up nested limits for $x,y,z$ (or other coords) describing the 3D region.",
    analogy: "Volume of a room, or mass if $f$ is density.",
    demo: {
      goal: "Orbit the paraboloid. Click near the bottom (0,0) — that's where the solid often sits on the xy-plane.",
      spec: {
        type: "surface3d",
        surface: { kind: "zfn", preset: "paraboloid" },
        task: { kind: "probeAt", target: [0, 0], tolerance: 0.45 },
      },
    },
  },
  u4_cyl_sph_int: {
    eli5:
      "Match coordinates to the solid: cylinder/cone → cylindrical ($dV=r\\,dr\\,d\\theta\\,dz$). Ball/ice-cream from origin → spherical ($dV=\\rho^2\\sin\\phi\\,d\\rho\\,d\\phi\\,d\\theta$). Box → rectangular.",
    analogy: "Use the measuring sticks that share the object's symmetry.",
    workedExample:
      "Unit ball: $\\int_0^{2\\pi}\\int_0^{\\pi}\\int_0^1 \\rho^2\\sin\\phi\\,d\\rho\\,d\\phi\\,d\\theta=\\frac{4}{3}\\pi$.",
  },
  u4_jacobian: {
    eli5:
      "Change of variables $x=x(u,v)$, $y=y(u,v)$ needs the absolute value of the Jacobian determinant $|\\partial(x,y)/\\partial(u,v)|$ as the area stretch factor — same role as $r$ in polar.",
    analogy: "How much a rubber sheet stretches when you remesh the coordinates.",
    workedExample:
      "Polar: $x=r\\cos\\theta$, $y=r\\sin\\theta$ → Jacobian $r$.",
    demo: {
      goal: "Drag the column tips (î→ and ĵ→) until |J|≈3. The parallelogram area is exactly |J| for the unit square — that stretch is why polar needs the extra r.",
      spec: {
        type: "jacobian",
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        task: { kind: "matchDet", target: 3 },
      },
    },
  },
  u5_fields: {
    eli5:
      "A vector field assigns an arrow to every point — wind, force, flow. Sketch by sampling: at each $(x,y)$ draw $\\mathbf{F}(x,y)$.",
    analogy: "Weather map of wind: an arrow at every city.",
    workedExample:
      "$\\mathbf{F}=\\langle -y,x\\rangle$ swirls counterclockwise around the origin.",
  },
  u5_line: {
    eli5:
      "A line integral $\\int_C \\mathbf{F}\\cdot d\\mathbf{r}$ adds how much the field pushes along a path. Parametrize $C$, substitute, integrate in $t$.",
    analogy: "Work done walking through a wind field along a trail.",
    workedExample:
      "On $C:$ $\\mathbf{r}(t)=\\langle t,t\\rangle$, $0\\le t\\le 1$, $\\mathbf{F}=\\langle x,y\\rangle$: $\\int_0^1 \\langle t,t\\rangle\\cdot\\langle 1,1\\rangle dt=1$.",
    demo: {
      goal: "Scrub t. Mist arrows are F; watch F·r' and the running integral — it grows fastest when F aligns with velocity.",
      spec: {
        type: "curve",
        grid: { min: -3, max: 3, step: 1 },
        curve: { kind: "circle", r: 1.5 },
        tRange: [0, 6.2832],
        initialT: 0.2,
        field: "rotate",
        task: { kind: "atT", t: 1.5708, tolerance: 0.4 },
      },
    },
  },
  u5_conservative: {
    eli5:
      "Conservative means $\\mathbf{F}=\\nabla f$ for some potential. Then path integrals depend only on endpoints. In 2D, check $P_y=Q_x$. Curl zero (on a simply connected domain) is the test.",
    analogy: "Gravity: work depends on height change, not the hiking trail.",
    workedExample:
      "$\\langle 2x,2y\\rangle=\\nabla(x^2+y^2)$ is conservative. $\\langle -y,x\\rangle$ is not ($P_y=-1\\neq 1=Q_x$).",
  },
  u5_green: {
    eli5:
      "Green's theorem: a closed planar loop's circulation equals the double integral of $(\\partial Q/\\partial x-\\partial P/\\partial y)$ over the interior. Line ↔ area.",
    analogy: "Summing tiny swirls inside a region equals the swirl around the fence.",
    demo: {
      goal: "Region under y=x from 0 to 1 — the kind of planar region Green applies to. Set dy dx limits 0→1, y:0→x.",
      spec: {
        type: "region",
        grid: { min: -0.5, max: 2, step: 0.5 },
        shade: {
          kind: "underCurve",
          x0: 0,
          x1: 1,
          yTop: "x",
          yBottom: 0,
        },
        integrand: "Q_x-P_y",
        innerChoices: [0, "x", "1-x", 1],
        initial: {
          order: "dydx",
          outerLo: 0,
          outerHi: 0.5,
          innerLo: 0,
          innerHi: "1-x",
        },
        solution: {
          order: "dydx",
          outerLo: 0,
          outerHi: 1,
          innerLo: 0,
          innerHi: "x",
        },
      },
    },
  },
  u5_curl_div: {
    eli5:
      "Curl measures local spin; divergence measures local source/sink. In 3D, $\\nabla\\times\\mathbf{F}$ and $\\nabla\\cdot\\mathbf{F}$. Curl zero ↔ conservative (nice domains).",
    analogy: "Curl = tiny paddlewheel spin. Div = how much fluid is created at a point.",
    workedExample:
      "$\\mathbf{F}=\\langle -y,x,0\\rangle$: curl $=\\langle 0,0,2\\rangle$, div $=0$.",
  },
  u5_surface: {
    eli5:
      "Surface integrals add over a surface — scalar (mass of a shell) or flux $\\iint_S \\mathbf{F}\\cdot d\\mathbf{S}$. Parametrize, include the normal factor $\\mathbf{r}_u\\times\\mathbf{r}_v$.",
    analogy: "How much wind blows through a window screen.",
    workedExample:
      "Flux of $\\langle 0,0,z\\rangle$ up through $z=1$, $x^2+y^2\\le 1$ is area $\\pi$.",
  },
  u5_stokes: {
    eli5:
      "Stokes: circulation around a surface's boundary equals flux of curl through the surface. Green's theorem is the flat special case.",
    analogy: "Fence circulation = total spin of the paddles on the tarp.",
    workedExample:
      "Choose the easiest surface with the given boundary — often a flat disk instead of a fancy cap.",
    demo: {
      goal: "Orbit the surface. The mirror shows rim circulation = curl flux — same number both ways (Stokes).",
      spec: {
        type: "surface3d",
        surface: { kind: "zfn", preset: "paraboloid" },
        task: { kind: "stokesCompare" },
      },
    },
  },
  u5_divergence: {
    eli5:
      "Divergence theorem: flux out of a closed surface equals $\\iiint(\\nabla\\cdot\\mathbf{F})\\,dV$ over the solid inside. Surface flux ↔ volume sources.",
    analogy: "Net fluid leaving a sealed room = total creation inside.",
    workedExample:
      "For $\\mathbf{F}=\\langle x,y,z\\rangle$ out of the unit sphere: $\\iiint 3\\,dV=4\\pi$.",
    demo: {
      goal: "Click near the origin (bottom of the bowl). Think of a source sitting there — divergence measures that creation.",
      spec: {
        type: "surface3d",
        surface: { kind: "zfn", preset: "paraboloid" },
        task: { kind: "divIntuition", target: [0, 0], tolerance: 0.5 },
      },
    },
  },
  u5_theorem_pick: {
    eli5:
      "Under time pressure: closed planar curve → Green. Oriented surface with boundary → Stokes (curl flux). Closed solid's outer flux → Divergence. Conservative field → potential / endpoints only.",
    analogy: "A flowchart: dimension of the region + open vs closed → picks the theorem.",
    workedExample:
      "Flux out of a balloon → Divergence. Circulation around a wire loop bounding a surface → Stokes. Flat region in $xy$-plane → Green.",
  },
};

export function lessonForSkill(skillId: string): Lesson | undefined {
  const body = LESSONS[skillId];
  if (!body) return undefined;
  return { skillId, ...body };
}

/** Ensure every skill has a lesson entry (dev assert). */
export function assertLessonsComplete(): void {
  const missing = SKILLS.filter((s) => !LESSONS[s.id]).map((s) => s.id);
  if (missing.length) {
    throw new Error(`Missing lessons for: ${missing.join(", ")}`);
  }
}

assertLessonsComplete();
