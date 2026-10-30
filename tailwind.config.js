/**
 * Tailwind theme for the Taptile storefront.
 *
 * Colours, type and shape come from the V5 brand handoff: near-black ground,
 * one panel tone, and a single blue→violet→pink gradient carrying every accent.
 * Headings are Archivo 800 with an Instrument Serif italic second line.
 *
 * The gradient is the brand. Use `text-grad` / `bg-grad` / `border-grad`
 * rather than picking one of its stops — a flat purple reads as a mistake
 * next to the real thing.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#0b0a0a',
        divider: 'color-mix(in srgb, #f8f4f4 14%, transparent)',
        hairline: 'rgba(255,255,255,.08)',
        surface: '#1a1918',
        surface2: '#232120',
        keycap: '#131111',
        bezel: '#2a2725',
        neutral: {
          100: '#f8f4f4',
          200: '#eae7e7',
          300: '#d7d3d3',
          400: '#bab6b6',
          500: '#9b9797',
          600: '#7d7979',
          700: '#605d5d',
          800: '#444141',
          900: '#2d2b2b',
        },
        /* The three stops of the brand gradient. Reach for these only when a
           gradient is impossible (an SVG stroke, a canvas fill). */
        /* Errors and destructive states. Deliberately outside the brand
           gradient — a failed form should not look like a feature. */
        danger: '#ff6b5c',
        accent: {
          DEFAULT: '#8b6bff',
          blue: '#3fa0ff',
          violet: '#8b6bff',
          pink: '#e96bd8',
        },

      /* ---------------------------------------------------------------
         Admin dashboard tokens (TAPTILE Dialect dashboard handoff).
         Scoped to /admin. Three handoff names are renamed because the
         storefront already owns them and redefining them would restyle
         the public site:
             handoff `ground`  -> `deck`   (storefront ground is #0b0a0a)
             handoff `surface` -> `panel`  (storefront surface is #1a1918)
             handoff `danger`  -> `alert`  (storefront danger is #ff6b5c)
         Everything else matches the handoff verbatim. No hex literals
         belong in dashboard components — add them here instead.
      --------------------------------------------------------------- */
      deck: '#080808',
      rail: '#0b0b0b',
      panel: { DEFAULT: '#101010', top: '#131313', bot: '#0f0f0f' },
      tile: { DEFAULT: '#161616', top: '#1a1a1a', track: '#1f1f1f' },
      line: { DEFAULT: '#1f1f1f', strong: '#2c2c2c', row: '#1a1a1a', rail: '#171717' },

      /* UI accent: gold. The token keeps its old name ("lime") so every
         component that marks the one accented thing per view picks up the
         new colour without being edited. Marks exactly one thing per view. */
      lime: {
        DEFAULT: '#c9a96e',
        light: '#e7d3a3',
        mid: '#b08d4f',
        deep: '#7d6232',
        drop: '#bb9858',
        ink: '#17130b',
      },
      /* Ambient light and chart fills only. Neutral now, so gold stays the
         single accent. Never a UI accent. */
      emerald: { DEFAULT: '#a8a29e', light: '#d6d3d1', dark: '#1c1917', mid: '#e7e5e4' },

      ink: {
        1: '#f5f5f4',
        2: '#d6d3d1',
        3: '#a8a29e',
        4: '#8f8a85',
        5: '#5c5853',
        nav: '#b5b0aa',
      },
      status: { lime: '#c9a96e', blue: '#cbd5e1', rose: '#f4a5a5', grey: '#a8a29e' },
      toggle: { track: '#2a2a2a', knob: '#8f8a85' },
      short: '#3d2626',
      alert: {
        surface: '#1f1414',
        bot: '#170f0f',
        line: '#3d2626',
        text: '#f4b4b4',
        muted: '#b39191',
        ink: '#1f0909',
      },
      chart: {
        1: '#c9a96e', 2: '#e7e5e4', 3: '#8a8580',
        4: '#e7d3a3', 5: '#57534e', 6: '#b08d4f',
        track: '#1d1d1d',
        grid: 'rgba(255,255,255,0.05)',
      },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', '-apple-system', 'sans-serif'],
        /* The italic second line of every heading. */
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        /* Admin dashboard only. The storefront stays on Archivo. */
        dash: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        heading: '800',
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '10px',
        sm: '7px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
        full: '9999px',
        /* Dashboard geometry. */
        chip: '4px',
        tile: '4px',
        card: '4px',
        pill: '3px',
      },
      boxShadow: {
        cap: '0 4px 10px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05)',
        shell: '0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05)',
        glow: '0 3px 10px rgba(255,255,255,.07)',
        lift: '0 5px 14px rgba(255,255,255,.11)',
        nav: '0 10px 30px rgba(0,0,0,.45)',
        panel: '0 20px 60px rgba(0,0,0,.45)',
        /* Dashboard elevation. */
        card: 'inset 0 1px 0 rgba(255,255,255,0.035)',
        'card-sm': 'inset 0 1px 0 rgba(255,255,255,0.035)',
        tile: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        track: 'inset 0 1px 2px rgba(0,0,0,0.4)',
        lime: 'none',
        'lime-sm': 'none',
        'lime-bar': 'none',
      },
      backgroundImage: {
        'lime-grad': 'linear-gradient(#c9a96e,#c9a96e)',
        'panel-grad': 'linear-gradient(#0f0f0f,#0f0f0f)',
        'tile-grad': 'linear-gradient(#161616,#161616)',
        'rail-grad': 'none',
        'alert-grad': 'linear-gradient(180deg,#1f1414 0%,#170f0f 100%)',
        'alert-btn': 'linear-gradient(135deg,#f0779a 0%,#d63f68 100%)',
      },
      /* The dashboard motion table (§9) uses 120ms and 140ms, neither of
         which is a Tailwind default — without these the classes emit nothing. */
      transitionDuration: {
        120: '120ms',
        140: '140ms',
      },
      letterSpacing: {
        heading: '-0.015em',
      },
      maxWidth: {
        shell: '1200px',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pop: {
          '0%,70%,100%': { background: '#2a2725', transform: 'scale(1)', boxShadow: 'none' },
          '35%': {
            background: '#f8f4f4',
            transform: 'scale(1.1)',
            boxShadow: '0 0 18px rgba(255,255,255,.5)',
          },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        pulse: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '.35' },
        },
        keypop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(.94)' },
          '100%': { transform: 'scale(1)' },
        },
        /* The hero board hangs by its cable, so it never sits quite still. */
        float: {
          '0%,100%': { transform: 'translate(-50%, calc(-59% - 5px))' },
          '50%': { transform: 'translate(-50%, calc(-59% + 5px))' },
        },
        /* A slow band of light crossing the hero, well under the artwork. */
        sweep: {
          '0%': { transform: 'translate3d(-40%,-20%,0) rotate(8deg)', opacity: '0' },
          '22%': { opacity: '.45' },
          '60%': { opacity: '.24' },
          '100%': { transform: 'translate3d(60%,30%,0) rotate(8deg)', opacity: '0' },
        },
        /* The colour wash behind the board and the orb. */
        breathe: {
          '0%,100%': { opacity: '.82', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
      animation: {
        rise: 'rise .5s cubic-bezier(.2,.8,.3,1) both',
        pop: 'pop 1.8s ease-in-out infinite',
        marquee: 'marquee 26s linear infinite',
        pulse: 'pulse 2.4s ease-in-out infinite',
        keypop: 'keypop .22s ease-out',
        float: 'float 13s ease-in-out infinite',
        sweep: 'sweep 24s linear infinite',
        breathe: 'breathe 11s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
