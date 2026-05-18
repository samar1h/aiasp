**Settings Panel:**

Add a minimal, subtle Settings option to the bottom-center of the home screen using a small gear SVG icon alongside the word “Settings” — no border or background, just clean understated text with a universally recognizable ⚙-style appearance.

Tapping it should open settings as a **slide-up bottom sheet** (this feels most native to Android and is less disruptive than navigating to a new page).

The settings panel should include:

- **Theme** — toggle between Dark and Light mode
- **Accent Color** — choose from a small set of preset accent colors (4–6 options shown as color swatches)
- **Font Family** — select from 2–3 clean, readable font options (e.g. Default, Serif, Monospace)
- **Font Size** — increase or decrease the global font size of the app (not a fixed size — scale all existing font sizes up or down proportionally, e.g. by +1 or -1 step)
- **Reset Settings** — a reset button that requires two taps to confirm:
  - First tap: button turns red with a "Are you sure?" label
  - Second tap: clears all app storage, cache, localStorage, and resets every setting back to default — then reloads the app

All settings should persist using `localStorage` so they survive page reloads. Changes should apply **instantly and globally** across the entire app without needing a manual refresh (except for full reset).
