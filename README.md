# Taptile

Storefront for Taptile — programmable mini keyboards.

> **Status: pre-launch.** One board, the Taptile Dialect, NZ$99.99. Checkout is a
> Stripe Payment Link switched by `VITE_BUY_URL`; while that's blank the site is a
> waitlist. Read [docs/CHECKOUT.md](docs/CHECKOUT.md) before changing anything in
> `src/site/launch.ts`.

## Running it

Requires **Node 20+**.

```bash
npm install
npm run dev
```

Opens on http://localhost:5173. It also listens on your local network, so you
can check the mobile layout on your phone.

## What works

- Landing page and the Taptile Dialect product page
- Scroll-driven turntable render on the landing page — see [docs/RENDER.md](docs/RENDER.md)
- Basket with quantities, persists across refreshes
- Sign in and sign up (needs Supabase keys — see below)
- Account page
- Admin dashboard at `/admin` (allowlisted accounts only): waitlist, inventory,
  and orders fed by the Stripe webhook, with mark-shipped that emails tracking
- Keyboard configurator at `/configurator` — see [docs/CONFIGURATOR.md](docs/CONFIGURATOR.md)

## What does not

- **A measured case.** The footprint on the product page is derived from the
  board plus 3 mm walls, not measured off a printed shell. Correct it once one
  exists. Case height is absent because nothing about it is known yet.
- **The turntable frames.** The component is wired but `public/render/dialect/`
  is empty, so the section hides itself. See [docs/RENDER.md](docs/RENDER.md).
- **Configurator against real hardware.** Written to spec, never tested on a
  board. See [docs/CONFIGURATOR.md](docs/CONFIGURATOR.md) for the checklist.

## Configuration

```bash
cp .env.example .env.local
```

Then fill in your Supabase URL and anon key. Until you do, the sign-in page
shows a setup notice rather than pretending to work. For checkout, paste the
**test** Payment Link into `.env.development` (see the file).

Never put a Stripe secret key in any env file — everything there is compiled
into the public JavaScript bundle, and the build fails if one appears.

## Design system

The look comes from the **V5 brand handoff** (`Taptile V5 brand handoff/site-handoff/`).
It replaces the old Modernist system — if you find zero-radius, 2px-divider styling
anywhere, it is a leftover, not the target.

- **Rounded, not square.** Pills for controls, `rounded-3xl` for panels.
- **One accent: the gradient.** `#3fa0ff → #8b6bff 52% → #e96bd8`. Use `text-grad`,
  `bg-grad`, `rule-grad` or `dot-grad` rather than picking a single stop — a flat
  purple reads as a mistake next to the real thing. Errors use `danger`, deliberately
  outside the gradient.
- **Headings end on a serif italic line.** Archivo 800, then Instrument Serif italic
  via the `serif` class. Never both lines in the same face.
- **Colour lives in the background, not the chrome.** `aurora` / `aurora-soft` wash a
  section; buttons stay white pills.

Tokens live in `tailwind.config.js` and `src/index.css`. Take colours, spacing and type
from there rather than hard-coding values.

## Project layout

```
src/
  site/launch.ts     Payment Link, price, Buy/Pre-order, sold out
  site/Buy.tsx       The one Buy button and the pre-order lines
  lib/orders.ts      Orders (read-only from the browser; shipping via a function)
  content/legal/     Terms, privacy, shipping, returns (markdown)
  lib/auth.tsx       Supabase auth
  pages/             One file per route
  components/        Nav, footer, cart drawer, product art
docs/                What to do before launch
```

## Deploying

Any static host works — Vercel, Netlify, Cloudflare Pages. Build command
`npm run build`, output directory `dist`. Add your environment variables in the
host's dashboard, not in the repo.

## Working together

See [CONTRIBUTING.md](CONTRIBUTING.md).
