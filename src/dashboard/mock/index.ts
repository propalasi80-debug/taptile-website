/**
 * Reference data for the dashboard.
 *
 * This file used to hold the handoff's sample set — invented orders, revenue,
 * expenses, stock levels, social reach and message threads. All of it is gone.
 * Numbers that look real get quoted as real eventually, and this is a
 * pre-launch company with no sales: showing $4,120 of revenue was going to
 * mislead somebody, including the two people it belongs to.
 *
 * What remains are facts that were actually decided: the size of the first
 * run, the waitlist target, the nine launch gates, and the product spec. The
 * money and inventory pages read empty until something real backs them.
 */

/** Gate 7 and gate 8 are blocked. Until they clear, neither figure exists. */
export const FILL_IN = '[FILL IN]';

export type GateState = 'done' | 'prog' | 'block';
export type Tone = 'lime' | 'blue' | 'rose' | 'grey';

export interface Gate {
  title: string;
  detail: string;
  owner: string;
  state: GateState;
}

/** Decisions, not estimates. */
export const FIGURES = {
  /** First production run: batch 1, all 25 built. */
  runSize: 25,
  /** Of batch 1: sold, kept by the two founders, and used for marketing. */
  forSale: 20,
  keptByFounders: 2,
  marketing: 3,
  /** The floor for opening pre-orders. */
  waitlistTarget: 50,
} as const;

/**
 * The nine gates between today and taking money.
 *
 * Owners are roles rather than names: the second founder's account is created
 * from Settings -> Team, and the real name comes from their profile.
 */
export const GATES: Gate[] = [
  {
    title: 'Firmware confirmed',
    detail: 'QMK builds and flashes on a real board. Both dials map.',
    owner: 'Owner',
    state: 'done',
  },
  {
    title: 'Case fits a real board',
    detail: 'Printed case closes on an assembled PCB with the knobs on.',
    owner: 'Owner',
    state: 'done',
  },
  {
    title: 'Adult on the business',
    detail: 'Company registered, both founders on the paperwork.',
    owner: 'Co-founder',
    state: 'done',
  },
  {
    title: 'Bank + payment processor',
    detail: 'Business account open, processor approved for pre-orders.',
    owner: 'Co-founder',
    state: 'done',
  },
  {
    title: 'False claims removed',
    detail: 'No false lighting claim, no switch brand name, no unearned origin claim.',
    owner: 'Owner',
    state: 'done',
  },
  {
    title: '50 on the waitlist',
    detail: 'The floor for opening pre-orders on the 20 units of batch 1 that are for sale.',
    owner: 'Owner',
    state: 'prog',
  },
  {
    title: 'Price locked',
    detail: 'Unit cost is known. The price is not set, so nothing downstream can be.',
    owner: 'Co-founder',
    state: 'block',
  },
  {
    title: 'Ship window set',
    detail: 'Batch 1 is built (25; 20 for sale). Waiting on USB-C cables and boxes (see Inventory). No public date until they are in.',
    owner: 'Owner',
    state: 'block',
  },
  {
    title: 'Pre-order live',
    detail: 'The last gate. Needs the price and the window before it can open.',
    owner: 'Owner',
    state: 'block',
  },
];

/**
 * Product spec. The wording is load-bearing: "13 underglow LEDs, underside
 * only" and "MX-compatible" are the copy-rule phrasings, not style choices.
 */
export const SPEC = [
  { label: 'Keys', value: '9' },
  { label: 'Encoders', value: '2 dials' },
  { label: 'Switches', value: 'MX-compatible, hot-swap' },
  { label: 'LEDs', value: '13, underglow (underside)' },
  { label: 'MCU', value: 'RP2040' },
  { label: 'Assembly', value: 'PCB by JLCPCB, final assembly in New Zealand' },
];

export const HELP_TOPICS = [
  {
    title: 'Reading the Launch page',
    body: 'What the nine gates mean and which one is holding the rest up.',
  },
  {
    title: 'Adding your co-founder',
    body: 'Settings, then Team. They get an email and set their own password.',
  },
  {
    title: 'Messaging and files',
    body: 'Conversations are private to the people in them. Attachments cap at 25MB.',
  },
  {
    title: 'Waitlist and the gate at 50',
    body: 'Where signups come from and how the gate is counted.',
  },
  {
    title: 'Publishing an update',
    body: 'Writing, saving a draft and publishing a devlog post from Content.',
  },
  {
    title: 'Why pages are empty',
    body: 'Nothing has sold yet. Those pages fill in when there is something to show.',
  },
];

export const HELP_QUESTIONS = [
  {
    q: 'Why does the price show [FILL IN] everywhere?',
    a: 'Because it is not locked. Launch gate 7 is blocked on it, and gates 8 and 9 are blocked behind that. Rendering a placeholder rather than a number means no screenshot of this dashboard can be mistaken for a decision that has not been made.',
  },
  {
    q: 'When can we publish a ship date?',
    a: 'Not until case printing clears the full run. A date published before then is a promise the build queue cannot keep.',
  },
  {
    q: 'Why are Revenue, Orders and Costs empty?',
    a: 'Because nothing has sold and no expense table exists yet. They used to show sample figures from the design handoff; those were removed, because a number that looks real eventually gets quoted as real.',
  },
  {
    q: 'How do I add my co-founder?',
    a: 'Settings, then Team, then Add someone. They get an email with a link to set their own password. Creating the account needs a privileged key, so it runs in an Edge Function rather than in this page.',
  },
  {
    q: 'Who can read my messages?',
    a: 'Only the people in the thread. That is enforced by row-level security in Postgres, not by this page, and attachments sit in a private bucket reachable only through a short-lived signed link.',
  },
  {
    q: 'Why are there two greens?',
    a: 'Lime is the UI accent and marks one thing per view — the active nav item, the primary action, a positive delta. Emerald is the ambient glow and the chart fill. Using them interchangeably flattens the whole interface.',
  },
  {
    q: 'Can I say the keys light up?',
    a: 'No. It has 13 LEDs on its underside that light the desk. It does not light the keys. Saying otherwise is a false product claim, not a wording preference. The full list of phrases to avoid is on this page under Copy rules.',
  },
  {
    q: 'Who can see this dashboard?',
    a: 'Only accounts on the admin allowlist. The list is enforced by row-level security in Postgres, not by this page — editing the page in a browser reveals nothing.',
  },
];
