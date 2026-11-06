import type { PrimerItem, PrimerLesson } from "@/types/primer";

type CustomBase = Omit<
  PrimerItem,
  "hints" | "misconceptionTags" | "rubric" | "difficulty"
> & {
  hints: [string, string, string, string];
  tags?: string[];
  difficulty?: 1 | 2 | 3 | 4;
};

function item(base: CustomBase): PrimerItem {
  const { hints, tags, difficulty, ...rest } = base;
  return {
    ...rest,
    hints: {
      nudge: hints[0],
      technique: hints[1],
      nextStep: hints[2],
      fullSolution: hints[3],
    },
    misconceptionTags: tags ?? [],
    rubric: rest.answer,
    difficulty: difficulty ?? 1,
  };
}

export const CUSTOM_LESSONS: Record<string, PrimerLesson> = {
  "15.3": {
    skillId: "u4_polar",
    eli5:
      "Circles and pie slices love polar. Replace $dA$ by $r\\,dr\\,d\\theta$ — the extra $r$ is the Jacobian. Don't forget it.",
    analogy: "Measuring pizza with radius and angle instead of x and y.",
    firstMove:
      "Draw the region. If it is a disk, annulus, or sector, try polar before anything else.",
    workedExample: {
      prompt:
        "Evaluate $\\iint_D (x^2+y^2)\\,dA$ where $D$ is the unit disk.",
      solution:
        "Use $x^2+y^2=r^2$ and $dA=r\\,dr\\,d\\theta$. The disk is $0\\le r\\le 1$, $0\\le\\theta\\le 2\\pi$. Then $\\iint_D (x^2+y^2)\\,dA=\\int_0^{2\\pi}\\!\\int_0^1 r^3\\,dr\\,d\\theta=\\frac{\\pi}{2}$.",
    },
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
    glossaryIds: ["polar-coords-mv", "jacobian", "double-integral"],
  },

  "14.4": {
    skillId: "custom_14_4",
    eli5:
      "At a point, a smooth surface has a tangent plane. It is the flat piece that best matches the surface: $z=f(a,b)+f_x(a,b)(x-a)+f_y(a,b)(y-b)$. The same formula gives the linearization $L(x,y)$.",
    analogy: "Zoom in far enough on a curved surface and it looks flat.",
    firstMove:
      "Evaluate $f$, $f_x$, and $f_y$ at the point, then plug into the plane formula.",
    workedExample: {
      prompt: "Find the tangent plane to $z=x^2+y^2$ at $(1,2)$.",
      solution:
        "$f(1,2)=5$, $f_x=2x$ so $f_x(1,2)=2$, $f_y=2y$ so $f_y(1,2)=4$. The plane is $z=5+2(x-1)+4(y-2)=2x+4y-5$.",
    },
    glossaryIds: ["tangent-plane", "normal-vector"],
  },

  "15.4": {
    skillId: "custom_15_4",
    eli5:
      "With density $\\rho(x,y)$, a double integral adds mass: $m=\\iint\\rho\\,dA$. The first moments are $M_y=\\iint x\\rho\\,dA$ and $M_x=\\iint y\\rho\\,dA$, so the center of mass is $(\\bar x,\\bar y)=(M_y/m,M_x/m)$.",
    analogy: "A metal plate: density says how much mass sits on each patch.",
    firstMove:
      "Find the mass first, then the moments, then divide. Do not divide before both moments are computed.",
    workedExample: {
      prompt:
        "Find the center of mass of the unit square $0\\le x,y\\le1$ with density $\\rho(x,y)=x$.",
      solution:
        "$m=\\int_0^1\\!\\int_0^1 x\\,dy\\,dx=\\frac12$. $M_y=\\int_0^1\\!\\int_0^1 x^2\\,dy\\,dx=\\frac13$. $M_x=\\int_0^1\\!\\int_0^1 xy\\,dy\\,dx=\\frac14$. So $(\\bar x,\\bar y)=(2/3,1/2)$.",
    },
    glossaryIds: ["double-integral"],
  },

  "15.5": {
    skillId: "custom_15_5",
    eli5:
      "For a graph $z=f(x,y)$, a tiny patch has area $\\sqrt{1+f_x^2+f_y^2}\\,dA$, so $S=\\iint_D\\sqrt{1+f_x^2+f_y^2}\\,dA$. For a parametric surface, replace the factor with $\\|\\mathbf{r}_u\\times\\mathbf{r}_v\\|$.",
    analogy: "Tilt a flat tile: its shadow is smaller than its surface, so the area factor is at least 1.",
    firstMove:
      "Compute $f_x$ and $f_y$, form the area factor, then integrate over the shadow region $D$.",
    workedExample: {
      prompt:
        "Find the surface area of $z=x^2+y^2$ above the unit disk.",
      solution:
        "$f_x=2x$, $f_y=2y$, so $\\sqrt{1+4(x^2+y^2)}=\\sqrt{1+4r^2}$. Then $S=\\int_0^{2\\pi}\\!\\int_0^1\\sqrt{1+4r^2}\\,r\\,dr\\,d\\theta=\\frac{\\pi}{6}(5\\sqrt5-1)$.",
    },
    glossaryIds: ["surface-area", "parametric-surface"],
  },

  "16.6": {
    skillId: "custom_16_6",
    eli5:
      "A parametric surface $\\mathbf{r}(u,v)$ maps a parameter rectangle into space. The tangent vectors $\\mathbf{r}_u$ and $\\mathbf{r}_v$ span the tangent plane; $\\|\\mathbf{r}_u\\times\\mathbf{r}_v\\|$ is the local area scale, so $dS=\\|\\mathbf{r}_u\\times\\mathbf{r}_v\\|\\,du\\,dv$.",
    analogy: "A curved grid of tiles: each tiny parameter rectangle becomes a tiny parallelogram on the surface.",
    firstMove:
      "Differentiate in $u$ and $v$, cross the two tangent vectors, then take the length.",
    workedExample: {
      prompt:
        "For $\\mathbf{r}(u,v)=\\langle u,v,u^2+v^2\\rangle$, find $\\mathbf{r}_u\\times\\mathbf{r}_v$ and the area element.",
      solution:
        "$\\mathbf{r}_u=\\langle1,0,2u\\rangle$, $\\mathbf{r}_v=\\langle0,1,2v\\rangle$, so $\\mathbf{r}_u\\times\\mathbf{r}_v=\\langle-2u,-2v,1\\rangle$ and $dS=\\sqrt{1+4u^2+4v^2}\\,du\\,dv$.",
    },
    glossaryIds: ["parametric-surface", "surface-area", "normal-vector"],
  },

  "9.1": {
    skillId: "custom_9_1",
    eli5:
      "A differential equation relates an unknown function to its derivatives. A solution is a function that satisfies the equation; an initial condition selects one member of the family.",
    analogy: "A rule for how a quantity changes, plus where it starts.",
    firstMove:
      "Differentiate the proposed solution and substitute it back. Then apply the initial condition.",
    workedExample: {
      prompt: "Solve $y'=0.2y$ with $y(0)=5$.",
      solution:
        "The general solution is $y=Ce^{0.2t}$. The initial condition gives $C=5$, so $y=5e^{0.2t}$.",
    },
    glossaryIds: ["derivative"],
  },

  "9.2": {
    skillId: "custom_9_2",
    eli5:
      "A direction field draws the slope $y'=f(x,y)$ at each point; a solution follows the arrows. Euler's method steps along the tangent: $y_{n+1}=y_n+h\\,f(x_n,y_n)$.",
    analogy: "A field of compass needles; you walk by following the needle under your feet.",
    firstMove:
      "At the point, compute the slope. Move $h$ in $x$ and $h\\cdot\\text{slope}$ in $y$.",
    workedExample: {
      prompt:
        "Use one Euler step with $h=0.1$ for $y'=x+y$, $y(0)=1$.",
      solution:
        "At $(0,1)$ the slope is $0+1=1$. So $y(0.1)\\approx1+0.1(1)=1.1$.",
    },
    glossaryIds: ["derivative"],
  },

  "9.3": {
    skillId: "custom_9_3",
    eli5:
      "A separable equation has the form $dy/dx=g(x)h(y)$. Separate the variables, integrate both sides, solve for $y$, then apply the initial condition.",
    analogy: "Put all the y's on one side and all the x's on the other, then integrate.",
    firstMove:
      "Factor the right side. Divide by $h(y)$ and multiply by $dx$ before integrating.",
    workedExample: {
      prompt: "Solve $dy/dx=xy$ with $y(0)=2$.",
      solution:
        "Separate: $dy/y=x\\,dx$. Integrate: $\\ln|y|=x^2/2+C$, so $y=Ce^{x^2/2}$. Since $y(0)=2$, $C=2$ and $y=2e^{x^2/2}$.",
    },
    glossaryIds: ["derivative", "antiderivative"],
  },
};

export const CUSTOM_ITEMS: Record<string, PrimerItem[]> = {
  "14.4": [
    item({
      id: "c14_4_learn",
      skillId: "custom_14_4",
      kind: "learn",
      prompt:
        "For $f(x,y)=x^2+y^2$, what is $f_x(1,2)$?",
      answerType: "numeric",
      answer: "2",
      hints: [
        "Differentiate in $x$; treat $y$ as a constant.",
        "$f_x=2x$.",
        "At $x=1$, $2x=2$.",
        "$f_x(1,2)=2$.",
      ],
      tags: ["PARTIAL_AT_POINT"],
    }),
    item({
      id: "c14_4_guided",
      skillId: "custom_14_4",
      kind: "guided",
      prompt:
        "Which is the tangent plane to $z=x^2+y^2$ at $(1,2)$?",
      answerType: "choice",
      answer: "$z=2x+4y-5$",
      choices: ["$z=2x+4y-5$", "$z=2x+4y+5$", "$z=x+2y-5$"],
      hints: [
        "$f(1,2)=5$, $f_x(1,2)=2$, $f_y(1,2)=4$.",
        "Use $z=f(a,b)+f_x(a,b)(x-a)+f_y(a,b)(y-b)$.",
        "$z=5+2(x-1)+4(y-2)$.",
        "Simplify: $z=2x+4y-5$.",
      ],
      tags: ["TANGENT_PLANE"],
    }),
    item({
      id: "c14_4_drill1",
      skillId: "custom_14_4",
      kind: "drill",
      prompt:
        "For $f(x,y)=xy$ at $(2,3)$, enter $f_x,f_y$.",
      answerType: "tuple",
      answer: "3,2",
      hints: [
        "$f_x=y$ and $f_y=x$.",
        "At $(2,3)$, $y=3$ and $x=2$.",
        "Enter the pair in the order $f_x,f_y$.",
        "$f_x=3$, $f_y=2$.",
      ],
      tags: ["PARTIAL_AT_POINT"],
    }),
    item({
      id: "c14_4_drill2",
      skillId: "custom_14_4",
      kind: "drill",
      prompt:
        "Which is the tangent plane to $z=xy$ at $(2,3)$?",
      answerType: "choice",
      answer: "$z=3x+2y-6$",
      choices: ["$z=3x+2y-6$", "$z=2x+3y-6$", "$z=3x+2y+6$"],
      hints: [
        "$f(2,3)=6$, $f_x=3$, $f_y=2$.",
        "$z=6+3(x-2)+2(y-3)$.",
        "Expand: $6+3x-6+2y-6$.",
        "$z=3x+2y-6$.",
      ],
      tags: ["TANGENT_PLANE"],
    }),
    item({
      id: "c14_4_mix",
      skillId: "custom_14_4",
      kind: "mix",
      prompt:
        "Use the tangent plane for $f(x,y)=x^2+y^2$ at $(1,2)$ to approximate $f(1.1,1.9)$.",
      answerType: "numeric",
      answer: "4.8",
      hints: [
        "The tangent plane is $z=2x+4y-5$.",
        "Substitute $x=1.1$, $y=1.9$.",
        "$2(1.1)+4(1.9)-5$.",
        "$2.2+7.6-5=4.8$.",
      ],
      difficulty: 2,
      tags: ["LINEARIZATION"],
    }),
    item({
      id: "c14_4_mastery",
      skillId: "custom_14_4",
      kind: "mastery",
      prompt:
        "A normal vector to the tangent plane of $z=x^2+y^2$ at $(1,2)$ is $\\langle a,b,c\\rangle$. Enter $a,b,c$.",
      answerType: "tuple",
      answer: "2,4,-1",
      hints: [
        "Write the plane as $2x+4y-z-5=0$.",
        "The normal is the coefficient vector of $x,y,z$.",
        "The coefficients are $2,4,-1$.",
        "$\\langle2,4,-1\\rangle$.",
      ],
      difficulty: 2,
      tags: ["NORMAL_VECTOR"],
    }),
  ],

  "15.4": [
    item({
      id: "c15_4_learn",
      skillId: "custom_15_4",
      kind: "learn",
      prompt:
        "A unit square has constant density $\\rho=2$. What is its mass?",
      answerType: "numeric",
      answer: "2",
      hints: [
        "Mass is density times area.",
        "The unit square has area 1.",
        "$m=2\\cdot1$.",
        "$m=2$.",
      ],
      tags: ["MASS"],
    }),
    item({
      id: "c15_4_guided",
      skillId: "custom_15_4",
      kind: "guided",
      prompt:
        "For the unit square with density $\\rho(x,y)=x$, find $M_y=\\iint x\\rho\\,dA$.",
      answerType: "numeric",
      answer: "1/3",
      accept: ["0.333", "0.3333"],
      hints: [
        "$M_y=\\iint x^2\\,dA$.",
        "$\\int_0^1\\!\\int_0^1 x^2\\,dy\\,dx$.",
        "Inner integral gives $x^2$; integrate $x^2$ from 0 to 1.",
        "$M_y=1/3$.",
      ],
      difficulty: 2,
      tags: ["MOMENT"],
    }),
    item({
      id: "c15_4_drill1",
      skillId: "custom_15_4",
      kind: "drill",
      prompt:
        "For the unit square with density $\\rho(x,y)=x$, find $M_x=\\iint y\\rho\\,dA$.",
      answerType: "numeric",
      answer: "1/4",
      accept: ["0.25"],
      hints: [
        "$M_x=\\iint xy\\,dA$.",
        "$\\int_0^1\\!\\int_0^1 xy\\,dy\\,dx$.",
        "Inner integral gives $x/2$; integrate from 0 to 1.",
        "$M_x=1/4$.",
      ],
      difficulty: 2,
      tags: ["MOMENT"],
    }),
    item({
      id: "c15_4_drill2",
      skillId: "custom_15_4",
      kind: "drill",
      prompt:
        "For the unit square with density $\\rho(x,y)=x$, find $\\bar x$.",
      answerType: "numeric",
      answer: "2/3",
      accept: ["0.667", "0.6667"],
      hints: [
        "You need $m$ and $M_y$.",
        "$m=1/2$ and $M_y=1/3$.",
        "$\\bar x=M_y/m$.",
        "$\\bar x=(1/3)/(1/2)=2/3$.",
      ],
      difficulty: 2,
      tags: ["CENTER_OF_MASS"],
    }),
    item({
      id: "c15_4_mix",
      skillId: "custom_15_4",
      kind: "mix",
      prompt:
        "A uniform unit square has constant density. Enter its center of mass $\\bar x,\\bar y$.",
      answerType: "tuple",
      answer: "1/2,1/2",
      accept: ["0.5,0.5"],
      hints: [
        "A uniform square balances at its geometric center.",
        "The midpoint of $[0,1]$ is $1/2$ in each direction.",
        "$\\bar x=1/2$, $\\bar y=1/2$.",
        "$(1/2,1/2)$.",
      ],
      difficulty: 2,
      tags: ["CENTER_OF_MASS"],
    }),
    item({
      id: "c15_4_mastery",
      skillId: "custom_15_4",
      kind: "mastery",
      prompt:
        "For the unit square with density $\\rho(x,y)=x$, find $I_y=\\iint x^2\\rho\\,dA$.",
      answerType: "numeric",
      answer: "1/4",
      accept: ["0.25"],
      hints: [
        "$I_y=\\iint x^2\\rho\\,dA=\\iint x^3\\,dA$.",
        "$\\int_0^1\\!\\int_0^1 x^3\\,dy\\,dx$.",
        "Inner integral gives $x^3$; integrate from 0 to 1.",
        "$I_y=1/4$.",
      ],
      difficulty: 2,
      tags: ["MOMENT_OF_INERTIA"],
    }),
  ],

  "15.5": [
    item({
      id: "c15_5_learn",
      skillId: "custom_15_5",
      kind: "learn",
      prompt:
        "For $z=x^2+y^2$, which factor goes inside the surface-area integral?",
      answerType: "choice",
      answer: "$\\sqrt{1+4x^2+4y^2}$",
      choices: [
        "$\\sqrt{1+4x^2+4y^2}$",
        "$\\sqrt{1+2x+2y}$",
        "$1$",
      ],
      hints: [
        "The factor is $\\sqrt{1+f_x^2+f_y^2}$.",
        "$f_x=2x$, $f_y=2y$.",
        "Square them and add 1.",
        "$\\sqrt{1+4x^2+4y^2}$.",
      ],
      tags: ["SURFACE_AREA"],
    }),
    item({
      id: "c15_5_guided",
      skillId: "custom_15_5",
      kind: "guided",
      prompt: "For $z=x+y$, the area factor is...",
      answerType: "choice",
      answer: "$\\sqrt{3}$",
      choices: ["$\\sqrt{3}$", "$\\sqrt{2}$", "$1$"],
      hints: [
        "$f_x=1$, $f_y=1$.",
        "$\\sqrt{1+1^2+1^2}$.",
        "$\\sqrt{3}$, not $\\sqrt{2}$.",
        "The factor is $\\sqrt{3}$.",
      ],
      tags: ["SURFACE_AREA"],
    }),
    item({
      id: "c15_5_drill1",
      skillId: "custom_15_5",
      kind: "drill",
      prompt:
        "Find the surface area of $z=x+y$ over the unit square. Round to 3 decimals.",
      answerType: "numeric",
      answer: "1.732",
      accept: ["1.73", "1.7321"],
      hints: [
        "The area factor is $\\sqrt{3}$.",
        "The shadow region has area 1.",
        "$S=\\sqrt{3}\\cdot1$.",
        "$S\\approx1.732$.",
      ],
      difficulty: 2,
      tags: ["SURFACE_AREA"],
    }),
    item({
      id: "c15_5_drill2",
      skillId: "custom_15_5",
      kind: "drill",
      prompt:
        "Find the surface area of $z=0$ over the unit disk. Use $\\pi\\approx3.14$.",
      answerType: "numeric",
      answer: "3.14",
      accept: ["3.1416", "3.14"],
      hints: [
        "$f_x=f_y=0$, so the factor is 1.",
        "The region is the unit disk, area $\\pi$.",
        "$S=\\iint_D1\\,dA=\\pi$.",
        "$S\\approx3.14$.",
      ],
      difficulty: 2,
      tags: ["SURFACE_AREA"],
    }),
    item({
      id: "c15_5_mix",
      skillId: "custom_15_5",
      kind: "mix",
      prompt:
        "Which is the surface area of $z=x^2+y^2$ over the unit disk?",
      answerType: "choice",
      answer: "$\\frac{\\pi}{6}(5\\sqrt5-1)$",
      choices: [
        "$\\frac{\\pi}{6}(5\\sqrt5-1)$",
        "$\\pi$",
        "$2\\pi$",
      ],
      hints: [
        "Use $\\sqrt{1+4r^2}$ and polar coordinates.",
        "$S=2\\pi\\int_0^1 r\\sqrt{1+4r^2}\\,dr$.",
        "Let $u=1+4r^2$; the inner integral is $\\frac{1}{12}(5\\sqrt5-1)$.",
        "$S=\\frac{\\pi}{6}(5\\sqrt5-1)$.",
      ],
      difficulty: 3,
      tags: ["SURFACE_AREA"],
    }),
    item({
      id: "c15_5_mastery",
      skillId: "custom_15_5",
      kind: "mastery",
      prompt: "For a parametric surface, the area element is...",
      answerType: "choice",
      answer: "$\\|\\mathbf{r}_u\\times\\mathbf{r}_v\\|\\,du\\,dv$",
      choices: [
        "$\\|\\mathbf{r}_u\\times\\mathbf{r}_v\\|\\,du\\,dv$",
        "$\\|\\mathbf{r}_u\\cdot\\mathbf{r}_v\\|\\,du\\,dv$",
        "$du\\,dv$",
      ],
      hints: [
        "The tangent vectors span a tiny parallelogram.",
        "The parallelogram area is the length of the cross product.",
        "Include both parameter differentials.",
        "$dS=\\|\\mathbf{r}_u\\times\\mathbf{r}_v\\|\\,du\\,dv$.",
      ],
      difficulty: 2,
      tags: ["PARAMETRIC_SURFACE"],
    }),
  ],

  "16.6": [
    item({
      id: "c16_6_learn",
      skillId: "custom_16_6",
      kind: "learn",
      prompt:
        "For $\\mathbf{r}(u,v)=\\langle u,v,u^2+v^2\\rangle$, enter $\\mathbf{r}_u$ at $(u,v)=(1,2)$.",
      answerType: "tuple",
      answer: "1,0,2",
      hints: [
        "Differentiate each component with respect to $u$.",
        "$\\mathbf{r}_u=\\langle1,0,2u\\rangle$.",
        "Substitute $u=1$.",
        "$\\langle1,0,2\\rangle$.",
      ],
      tags: ["PARAMETRIC_SURFACE"],
    }),
    item({
      id: "c16_6_guided",
      skillId: "custom_16_6",
      kind: "guided",
      prompt:
        "For the same surface, enter $\\mathbf{r}_u\\times\\mathbf{r}_v$ as $a,b,c$.",
      answerType: "tuple",
      answer: "-2u,-2v,1",
      hints: [
        "$\\mathbf{r}_u=\\langle1,0,2u\\rangle$, $\\mathbf{r}_v=\\langle0,1,2v\\rangle$.",
        "Use the determinant formula for the cross product.",
        "The $\\mathbf{k}$ component is $1\\cdot1-0\\cdot0=1$.",
        "$\\langle-2u,-2v,1\\rangle$.",
      ],
      difficulty: 2,
      tags: ["CROSS_PRODUCT"],
    }),
    item({
      id: "c16_6_drill1",
      skillId: "custom_16_6",
      kind: "drill",
      prompt:
        "For the same surface, enter the area factor $\\|\\mathbf{r}_u\\times\\mathbf{r}_v\\|$.",
      answerType: "exact",
      answer: "√(1+4u^2+4v^2)",
      accept: ["sqrt(1+4u^2+4v^2)", "sqrt(1+4u²+4v²)"],
      hints: [
        "You found $\\langle-2u,-2v,1\\rangle$.",
        "Take the length: $\\sqrt{(-2u)^2+(-2v)^2+1^2}$.",
        "Simplify the squares.",
        "$\\sqrt{1+4u^2+4v^2}$.",
      ],
      difficulty: 2,
      tags: ["SURFACE_AREA"],
    }),
    item({
      id: "c16_6_drill2",
      skillId: "custom_16_6",
      kind: "drill",
      prompt: "Which parametrizes the sphere of radius $a$?",
      answerType: "choice",
      answer: "$\\langle a\\sin\\phi\\cos\\theta,a\\sin\\phi\\sin\\theta,a\\cos\\phi\\rangle$",
      choices: [
        "$\\langle a\\sin\\phi\\cos\\theta,a\\sin\\phi\\sin\\theta,a\\cos\\phi\\rangle$",
        "$\\langle a\\cos\\phi\\cos\\theta,a\\cos\\phi\\sin\\theta,a\\sin\\phi\\rangle$",
        "$\\langle a\\cos\\theta,a\\sin\\theta,a\\rangle$",
      ],
      hints: [
        "Use spherical coordinates with $\\rho=a$.",
        "$x=\\rho\\sin\\phi\\cos\\theta$, $y=\\rho\\sin\\phi\\sin\\theta$, $z=\\rho\\cos\\phi$.",
        "Substitute $\\rho=a$.",
        "The first choice.",
      ],
      difficulty: 2,
      tags: ["PARAMETRIZATION"],
    }),
    item({
      id: "c16_6_mastery",
      skillId: "custom_16_6",
      kind: "mastery",
      prompt:
        "A small parameter rectangle has sides $\\Delta u$ and $\\Delta v$. Its surface area is approximately...",
      answerType: "choice",
      answer: "$\\|\\mathbf{r}_u\\times\\mathbf{r}_v\\|\\,\\Delta u\\,\\Delta v$",
      choices: [
        "$\\|\\mathbf{r}_u\\times\\mathbf{r}_v\\|\\,\\Delta u\\,\\Delta v$",
        "$\\|\\mathbf{r}_u\\cdot\\mathbf{r}_v\\|\\,\\Delta u\\,\\Delta v$",
        "$\\Delta u\\,\\Delta v$",
      ],
      hints: [
        "The tangent vectors become the sides of a parallelogram.",
        "Parallelogram area is the cross-product length.",
        "Scale by the parameter increments.",
        "The first choice.",
      ],
      difficulty: 2,
      tags: ["SURFACE_AREA"],
    }),
  ],

  "9.1": [
    item({
      id: "c9_1_learn",
      skillId: "custom_9_1",
      kind: "learn",
      prompt: "Does $y=e^{2x}$ solve $y'=2y$?",
      answerType: "choice",
      answer: "Yes",
      choices: ["Yes", "No"],
      hints: [
        "Differentiate $e^{2x}$.",
        "$y'=2e^{2x}$.",
        "Compare with $2y=2e^{2x}$.",
        "They match, so yes.",
      ],
      tags: ["VERIFY_SOLUTION"],
    }),
    item({
      id: "c9_1_guided",
      skillId: "custom_9_1",
      kind: "guided",
      prompt: "What is the general solution of $y'=3y$?",
      answerType: "choice",
      answer: "$y=Ce^{3x}$",
      choices: ["$y=Ce^{3x}$", "$y=3x+C$", "$y=Ce^{-3x}$"],
      hints: [
        "The rate is proportional to $y$.",
        "The solution grows exponentially with rate 3.",
        "Keep the arbitrary constant.",
        "$y=Ce^{3x}$.",
      ],
      tags: ["EXPONENTIAL_MODEL"],
    }),
    item({
      id: "c9_1_drill1",
      skillId: "custom_9_1",
      kind: "drill",
      prompt: "If $y'=ky$ and $y(0)=7$, what is $C$ in $y=Ce^{kt}$?",
      answerType: "numeric",
      answer: "7",
      hints: [
        "Substitute $t=0$.",
        "$y(0)=Ce^0=C$.",
        "Set $C=7$.",
        "$C=7$.",
      ],
      tags: ["INITIAL_CONDITION"],
    }),
    item({
      id: "c9_1_drill2",
      skillId: "custom_9_1",
      kind: "drill",
      prompt:
        "If $y'=0.1y$ and $y(0)=200$, approximate $y(10)$.",
      answerType: "numeric",
      answer: "543.66",
      accept: ["543.7", "543.66"],
      hints: [
        "The solution is $y=200e^{0.1t}$.",
        "At $t=10$, $y=200e^1$.",
        "$e\\approx2.718$.",
        "$y\\approx543.66$.",
      ],
      difficulty: 2,
      tags: ["EXPONENTIAL_MODEL"],
    }),
    item({
      id: "c9_1_mix",
      skillId: "custom_9_1",
      kind: "mix",
      prompt: "Which function solves $y''+y=0$?",
      answerType: "choice",
      answer: "$\\sin x$",
      choices: ["$\\sin x$", "$e^x$", "$x^2$"],
      hints: [
        "Differentiate twice and add the function.",
        "$(\\sin x)''=-\\sin x$.",
        "$-\\sin x+\\sin x=0$.",
        "$\\sin x$ works.",
      ],
      difficulty: 2,
      tags: ["VERIFY_SOLUTION"],
    }),
    item({
      id: "c9_1_mastery",
      skillId: "custom_9_1",
      kind: "mastery",
      prompt: "Solve $y'=2t$ with $y(0)=3$.",
      answerType: "exact",
      answer: "t^2+3",
      accept: ["3+t^2"],
      hints: [
        "Integrate $2t$.",
        "$y=t^2+C$.",
        "Use $y(0)=3$ to find $C$.",
        "$y=t^2+3$.",
      ],
      difficulty: 2,
      tags: ["INITIAL_CONDITION"],
    }),
  ],

  "9.2": [
    item({
      id: "c9_2_learn",
      skillId: "custom_9_2",
      kind: "learn",
      prompt: "For $y'=x+y$, what is the slope at $(1,2)$?",
      answerType: "numeric",
      answer: "3",
      hints: [
        "Substitute $x=1$, $y=2$ into the right side.",
        "$1+2$.",
        "The slope is 3.",
        "3.",
      ],
      tags: ["DIRECTION_FIELD"],
    }),
    item({
      id: "c9_2_guided",
      skillId: "custom_9_2",
      kind: "guided",
      prompt:
        "Use one Euler step with $h=0.1$ for $y'=y$, $y(0)=1$. Enter $y(0.1)$.",
      answerType: "numeric",
      answer: "1.1",
      hints: [
        "The slope at $(0,1)$ is 1.",
        "$y_{n+1}=y_n+h\\,f(x_n,y_n)$.",
        "$1+0.1(1)$.",
        "$1.1$.",
      ],
      tags: ["EULER"],
    }),
    item({
      id: "c9_2_drill1",
      skillId: "custom_9_2",
      kind: "drill",
      prompt:
        "Use one Euler step with $h=0.5$ for $y'=x$, $y(0)=0$. Enter $y(0.5)$.",
      answerType: "numeric",
      answer: "0",
      hints: [
        "The slope at $(0,0)$ is $x=0$.",
        "$y_{n+1}=0+0.5(0)$.",
        "The step stays at 0.",
        "$0$.",
      ],
      tags: ["EULER"],
    }),
    item({
      id: "c9_2_drill2",
      skillId: "custom_9_2",
      kind: "drill",
      prompt:
        "Use two Euler steps with $h=0.5$ for $y'=1$, $y(0)=0$. Enter $y(1)$.",
      answerType: "numeric",
      answer: "1",
      hints: [
        "The slope is always 1.",
        "Each step adds $0.5$.",
        "Two steps add $1$.",
        "$y(1)\\approx1$.",
      ],
      tags: ["EULER"],
    }),
    item({
      id: "c9_2_mix",
      skillId: "custom_9_2",
      kind: "mix",
      prompt: "The direction field of $y'=y$ has horizontal slopes when...",
      answerType: "choice",
      answer: "$y=0$",
      choices: ["$y=0$", "$x=0$", "$y=x$"],
      hints: [
        "Horizontal means slope 0.",
        "Set $y'=0$.",
        "$y=0$.",
        "$y=0$.",
      ],
      difficulty: 2,
      tags: ["DIRECTION_FIELD"],
    }),
    item({
      id: "c9_2_mastery",
      skillId: "custom_9_2",
      kind: "mastery",
      prompt:
        "Use one Euler step with $h=0.2$ for $y'=x+y$ at $(0,1)$. Enter $y(0.2)$.",
      answerType: "numeric",
      answer: "1.2",
      hints: [
        "The slope at $(0,1)$ is $0+1=1$.",
        "$y_{n+1}=1+0.2(1)$.",
        "$1+0.2$.",
        "$1.2$.",
      ],
      difficulty: 2,
      tags: ["EULER"],
    }),
  ],

  "9.3": [
    item({
      id: "c9_3_learn",
      skillId: "custom_9_3",
      kind: "learn",
      prompt: "Which is the separated form of $dy/dx=xy$?",
      answerType: "choice",
      answer: "$dy/y=x\\,dx$",
      choices: ["$dy/y=x\\,dx$", "$dy=xy\\,dx$", "$dy/dx=y$"],
      hints: [
        "Divide both sides by $y$.",
        "Multiply by $dx$.",
        "The y's and x's should be on opposite sides.",
        "$dy/y=x\\,dx$.",
      ],
      tags: ["SEPARABLE"],
    }),
    item({
      id: "c9_3_guided",
      skillId: "custom_9_3",
      kind: "guided",
      prompt: "What is the general solution of $dy/dx=2y$?",
      answerType: "choice",
      answer: "$y=Ce^{2x}$",
      choices: ["$y=Ce^{2x}$", "$y=2x+C$", "$y=Ce^{-2x}$"],
      hints: [
        "Separate: $dy/y=2\\,dx$.",
        "Integrate: $\\ln|y|=2x+C$.",
        "Exponentiate.",
        "$y=Ce^{2x}$.",
      ],
      tags: ["SEPARABLE"],
    }),
    item({
      id: "c9_3_drill1",
      skillId: "custom_9_3",
      kind: "drill",
      prompt: "Solve $dy/dx=x$ with $y(0)=1$.",
      answerType: "exact",
      answer: "x^2/2+1",
      accept: ["1+x^2/2"],
      hints: [
        "Integrate $x$.",
        "$y=x^2/2+C$.",
        "Use $y(0)=1$.",
        "$y=x^2/2+1$.",
      ],
      difficulty: 2,
      tags: ["SEPARABLE"],
    }),
    item({
      id: "c9_3_drill2",
      skillId: "custom_9_3",
      kind: "drill",
      prompt: "Solve $dy/dx=y$ with $y(0)=3$.",
      answerType: "choice",
      answer: "$y=3e^x$",
      choices: ["$y=3e^x$", "$y=e^{3x}$", "$y=3x$"],
      hints: [
        "Separate: $dy/y=dx$.",
        "Integrate: $\\ln|y|=x+C$.",
        "Use $y(0)=3$ to find $C$.",
        "$y=3e^x$.",
      ],
      difficulty: 2,
      tags: ["SEPARABLE"],
    }),
    item({
      id: "c9_3_mix",
      skillId: "custom_9_3",
      kind: "mix",
      prompt: "Solve $dy/dx=1/y$.",
      answerType: "choice",
      answer: "$y^2/2=x+C$",
      choices: ["$y^2/2=x+C$", "$y^2=x+C$", "$\\ln y=x+C$"],
      hints: [
        "Separate: $y\\,dy=dx$.",
        "Integrate both sides.",
        "$y^2/2=x+C$.",
        "$y^2/2=x+C$.",
      ],
      difficulty: 2,
      tags: ["SEPARABLE"],
    }),
    item({
      id: "c9_3_mastery",
      skillId: "custom_9_3",
      kind: "mastery",
      prompt: "Solve $dy/dx=xy$ with $y(0)=2$.",
      answerType: "choice",
      answer: "$y=2e^{x^2/2}$",
      choices: ["$y=2e^{x^2/2}$", "$y=e^{2x}$", "$y=x^2+2$"],
      hints: [
        "Separate: $dy/y=x\\,dx$.",
        "Integrate: $\\ln|y|=x^2/2+C$.",
        "Use $y(0)=2$.",
        "$y=2e^{x^2/2}$.",
      ],
      difficulty: 3,
      tags: ["SEPARABLE"],
    }),
  ],
};
