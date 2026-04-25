# Visual Overhaul Change Log — CalcTutor (2026-04-14)

## Theme and system direction
- Chosen direction: **Editorial Math Lab**.
- Constraint set:
  - no default/vanilla UI styling;
  - expressive contrast layer with soft gradient mesh background;
  - layered glass-like surfaces and strong section hierarchy;
  - concise, purposeful motion only on major section entry and control-hover states;
  - reduced-motion and focus-visible protections added.

## DFII estimate
- Directionality fit: 0.78
- Visual distinction: 0.81
- Feasibility: 0.87
- Performance risk: 0.78
- Consistency risk: 0.71
- Estimated DFII: **0.79**

## Files changed
- `app.py`
- `assets/custom.css`

## Visual changes implemented
- Replaced runtime tray/modal style block with stylesheet classes.
- Added semantic classes in Python-generated HTML for memory stats, final answer, generated problem card and tray/modal structure.
- Introduced token layer (`--ct-*`) and reduced-motion guard in `assets/custom.css`.
- Added tray and modal visual system to CSS with explicit class/ID hooks.
- Added new classes for:
  - final answer block
  - generated problem preview card and head
  - memory empty states and footnotes
  - queue badge support and queue chip interactions
  - focus-visible and interactive micro-motion rules
- Consolidated major section styling and responsive adjustments across solve/practice/chat/step/tile systems.

## Manual QA checklist
- Solve flow:
  - input focus glow and math preview updates as typing occurs
  - solve CTA remains reachable and visible in desktop/mobile layouts
- Practice flow:
  - tile select/deselect state updates
  - queue chip injection and ordering badge rendering
  - generate CTA appears/disappears as expected
- Practice modal:
  - open/close transitions, close backdrop, footer CTA actions
- Why-panel and step toggles:
  - row expansion, got-it indicator, and spacing changes
- Chat flow:
  - input row sizing, send button hit area, bubble readability, thinking state
- Cross-theme check:
  - light and dark mode still readable, especially code/math rendering
- Accessibility check:
  - keyboard focus on controls
  - 44px minimum tap targets for key controls
  - reduced-motion respected in OS settings
