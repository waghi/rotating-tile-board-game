# Sumshift

Sumshift is a 4 × 4 sliding magic-square game. Shift rows and columns, with tiles wrapping around the edges, until the four rows, four columns, and two diagonals all match the target sum. Starting a new puzzle or changing difficulty gives you a different target and a fresh set of 16 unique integers. Reset restores the current puzzle without changing its target. Live totals and hints help you find a solution.

The project uses React, TypeScript, TanStack Start, and CSS. Netlify hosts the app; the puzzle runs entirely in the browser and does not save progress between visits.

## Run locally

With Node.js 24 and pnpm installed:

```sh
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The arrows are keyboard-accessible, and you can also swipe or drag a tile to shift its line. Run `pnpm test` to check the puzzle logic and starter UI.
