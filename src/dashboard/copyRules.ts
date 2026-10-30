/**
 * The §14 copy rules — the canonical list, rendered by the Help page.
 *
 * This is the ONE file allowed to contain the banned phrases, because it is
 * the file that names them in order to forbid them. `npm run check:copy`
 * excludes this path and fails on a hit anywhere else in src/.
 *
 * These are legal constraints, not style preferences. Breaking one is a
 * defect: the first is a false product claim, the second a trademark, the
 * third an origin claim the supply chain does not support, and the last two
 * are commitments nobody has authority to make yet.
 */

export interface CopyRule {
  never: string;
  instead: string;
  why: string;
}

export const COPY_RULES: CopyRule[] = [
  {
    never: '"backlit", "backlight", "per-key RGB"',
    instead: '"13 underglow LEDs, on the underside"',
    why: 'The board has 13 LEDs on its underside that light the desk. It does not light the keys. Claiming otherwise is a false product claim.',
  },
  {
    never: '"Cherry MX"',
    instead: '"MX-compatible"',
    why: 'Standard footprint, not a licensed brand.',
  },
  {
    never: '"Made in New Zealand"',
    instead: '"Designed in New Zealand" or "Final assembly in New Zealand"',
    why: 'The PCBs are made and assembled by JLCPCB overseas. Design and final assembly are ours; the product as a whole is not "made" here.',
  },
  {
    never: 'A real price',
    instead: '[FILL IN]',
    why: 'Not locked. Launch gate 7.',
  },
  {
    never: 'A real ship date or window',
    instead: '[FILL IN]',
    why: 'Not locked. Launch gate 8, blocked on case printing.',
  },
];

/**
 * The catch-all rule. Kept as a sentence rather than a row because it is a
 * prohibition on whole categories of content, not a word swap.
 */
export const COPY_ALSO_NEVER =
  'Also never: fake reviews, endorsements, press logos, “as seen in” strips, or sold-counters — anywhere, including placeholder art. Never render artwork showing light coming up through the keys.';
