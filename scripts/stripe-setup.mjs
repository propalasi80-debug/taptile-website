#!/usr/bin/env node
/**
 * Builds the Stripe side of checkout in one command: product, price, shipping
 * rate, Payment Link and (with --webhook) the endpoint that feeds orders into
 * Supabase. Section 2 of the Stripe handoff as code, so it is done the same
 * way in test mode and again in live mode, and can be re-run without harm.
 *
 * Why a script and not the dashboard: the Payment Link has fourteen settings,
 * and the ones that matter (NZ-only addresses, the phone number the courier
 * needs, the 20-payment cap) are the easiest to miss. Here they're written
 * down once.
 *
 * Why no SDK: Stripe's REST API is form-encoded HTTP. Node 20's fetch does it,
 * and one less dependency is one less thing to audit.
 *
 * The secret key is read from STRIPE_SECRET_KEY and nowhere else. It's never
 * an argument (arguments land in shell history) and never written anywhere.
 * Nothing in this repo may hold it: see CLAUDE.md.
 *
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs --shipping 7.50
 *
 * Re-running finds what already exists (everything is tagged metadata
 * taptile=dialect) and creates only what's missing. A new --price makes a new
 * price and a new link, caps the new link at what's left of the batch, and
 * deactivates the old link. Runbook: docs/CHECKOUT.md.
 */

const API = 'https://api.stripe.com';
const TAG = 'dialect';
const PRODUCT = {
  name: 'Taptile Dialect',
  description:
    'Custom USB-C macropad: 9 MX-compatible keys, 2 rotary dials. Designed and assembled in New Zealand.',
};
const RATE_NAME = 'NZ Post — tracked';
const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'charge.refunded',
];
const ID_PREFIX = {
  '/v1/products': 'prod',
  '/v1/prices': 'price',
  '/v1/shipping_rates': 'shr',
  '/v1/payment_links': 'plink',
  '/v1/webhook_endpoints': 'we',
};

const say = (line = '') => console.log(line);
const warn = (line) => console.log(`\n!! ${line}\n`);
function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------ arguments -- */
function usage(problem) {
  const text = [
    'Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs --shipping 7.50 [options]',
    '',
    '  --shipping 7.50   Flat NZ Post rate in NZD. Required: nobody has confirmed it, so no default.',
    '  --price 99.99     Unit price in NZD (default 99.99).',
    '  --limit 20        Payments the link accepts before closing itself (default 20).',
    '  --image URL       A product image URL, e.g. https://www.trytaptile.com/og.jpg.',
    '  --webhook URL     Also create the Stripe webhook that points at this URL.',
    '  --site URL        The site, for the /thanks redirect (default https://www.trytaptile.com).',
    '  --dry-run         Print every request, send nothing.',
    '  --live            Required before a live key is accepted.',
  ].join('\n');
  if (problem) die(`${problem}\n\n${text}`);
  say(text);
  process.exit(0);
}

function parseArgs(argv) {
  const out = { price: '99.99', limit: '20', site: 'https://www.trytaptile.com', dryRun: false, live: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) usage(`${arg} needs a value`);
      i += 1;
      return v;
    };
    if (arg === '--shipping') out.shipping = value();
    else if (arg === '--price') out.price = value();
    else if (arg === '--limit') out.limit = value();
    else if (arg === '--image') out.image = value();
    else if (arg === '--webhook') out.webhook = value();
    else if (arg === '--site') out.site = value();
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--live') out.live = true;
    else if (arg === '--help' || arg === '-h') usage();
    else usage(`Unknown argument ${arg}`);
  }
  if (!out.shipping) usage('--shipping is required: the flat NZ Post rate in NZD, e.g. --shipping 7.50.');
  if (!/^\d{1,4}$/.test(out.limit)) usage(`--limit must be a whole number, got "${out.limit}"`);
  if (!/^https:\/\/[^/\s]+/.test(out.site)) usage(`--site must be an https URL, got "${out.site}"`);
  if (out.webhook && !/^https:\/\/[^\s]+/.test(out.webhook)) usage(`--webhook must be an https URL, got "${out.webhook}"`);
  out.site = out.site.replace(/\/+$/, '');
  out.limit = Number(out.limit);
  return out;
}

/** "99.99" → 9999 by string arithmetic, because 99.99 * 100 is 9998.999… in floating point. */
function cents(text, what) {
  const m = /^(\d{1,4})(?:\.(\d{1,2}))?$/.exec(String(text).trim());
  if (!m) usage(`${what} must be a plain amount like 99.99, got "${text}"`);
  return Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'));
}
const nzd = (c) => `NZ$${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

const args = parseArgs(process.argv.slice(2));
const priceCents = cents(args.price, '--price');
const shippingCents = cents(args.shipping, '--shipping');
// "89.9" and "89.90" are the same price; store and print one spelling.
args.price = nzd(priceCents).slice(3);

/* ------------------------------------------------------------------ key -- */
const key = process.env.STRIPE_SECRET_KEY ?? '';
const keyShape = /^(sk|rk)_(test|live)_/.exec(key);
if (!keyShape) {
  die(
    'STRIPE_SECRET_KEY is missing, or is not a secret (sk_) or restricted (rk_) key.\n' +
      'Set it for this shell only:  export STRIPE_SECRET_KEY=sk_test_...\n' +
      'Never put it in a file in this repo.',
  );
}
const mode = keyShape[2];
if (mode === 'live' && !args.live) {
  die('That is a LIVE key. Add --live if you mean it. Build and test in test mode first (Stripe → toggle at top right).');
}

/* ------------------------------------------------------------------ http -- */
/** Stripe caps idempotency keys at 255 characters of a limited alphabet. */
const idemKey = (text) => text.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 200);

function stub(method, path, params) {
  if (method === 'GET') return { data: [], has_more: false };
  const prefix = Object.entries(ID_PREFIX).find(([p]) => path.startsWith(p))?.[1] ?? 'obj';
  return {
    id: `${prefix}_DRYRUN`,
    url: `https://buy.stripe.com/${mode === 'test' ? 'test_' : ''}DRYRUN`,
    secret: 'whsec_DRYRUN',
    status: 'enabled',
    ...params,
  };
}

async function api(method, path, params = {}, idem = '') {
  const query = method === 'GET' && Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
  if (args.dryRun) {
    say(`  ${method} ${path}${query}`);
    if (method === 'POST') for (const [k, v] of Object.entries(params)) say(`      ${k} = ${v}`);
    return stub(method, path, params);
  }

  const headers = { Authorization: `Bearer ${key}` };
  let body;
  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Idempotency-Key'] = idemKey(idem);
    body = new URLSearchParams(params).toString();
  }
  let res;
  try {
    res = await fetch(`${API}${path}${query}`, { method, headers, body });
  } catch (err) {
    die(`Could not reach Stripe: ${err instanceof Error ? err.message : err}`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message ?? `HTTP ${res.status}`);
    err.request = `${method} ${path}${query}`;
    err.params = params;
    throw err;
  }
  return json;
}

/** Follow has_more / starting_after until the list is exhausted. */
async function listAll(path, params) {
  const out = [];
  let after;
  for (;;) {
    const page = await api('GET', path, { ...params, limit: '100', ...(after ? { starting_after: after } : {}) });
    out.push(...page.data);
    if (!page.has_more || page.data.length === 0) return out;
    after = page.data[page.data.length - 1].id;
  }
}

/* -------------------------------------------------------------- objects -- */
async function ensureProduct() {
  const found = await api('GET', '/v1/products/search', {
    query: `metadata['taptile']:'${TAG}' AND active:'true'`,
    limit: '10',
  });
  const existing = found.data.find((p) => p.name === PRODUCT.name) ?? found.data[0];
  if (existing) {
    say(`Product:       reusing ${existing.id}`);
    return existing;
  }
  const params = {
    name: PRODUCT.name,
    description: PRODUCT.description,
    shippable: 'true',
    'metadata[taptile]': TAG,
    ...(args.image ? { 'images[0]': args.image } : {}),
  };
  const created = await api('POST', '/v1/products', params, `taptile-product-${TAG}`);
  say(`Product:       created ${created.id}`);
  return created;
}

async function ensurePrice(productId) {
  const prices = await listAll('/v1/prices', { product: productId, active: 'true' });
  const match = prices.find((p) => p.currency === 'nzd' && p.unit_amount === priceCents && !p.recurring);
  if (match) {
    say(`Price:         reusing ${match.id} (${nzd(priceCents)})`);
    return match;
  }
  const created = await api(
    'POST',
    '/v1/prices',
    { product: productId, currency: 'nzd', unit_amount: String(priceCents), nickname: nzd(priceCents), 'metadata[taptile]': TAG },
    `taptile-price-${productId}-${priceCents}`,
  );
  say(`Price:         created ${created.id} (${nzd(priceCents)})`);
  return created;
}

async function ensureRate() {
  const rates = await listAll('/v1/shipping_rates', { active: 'true' });
  const match = rates.find(
    (r) =>
      r.display_name === RATE_NAME &&
      r.type === 'fixed_amount' &&
      r.fixed_amount?.amount === shippingCents &&
      r.fixed_amount?.currency === 'nzd',
  );
  if (match) {
    say(`Shipping rate: reusing ${match.id} (${nzd(shippingCents)})`);
    return match;
  }
  // No delivery_estimate on purpose: no ship dates anywhere until Jenil sets one.
  const created = await api(
    'POST',
    '/v1/shipping_rates',
    {
      display_name: RATE_NAME,
      type: 'fixed_amount',
      'fixed_amount[amount]': String(shippingCents),
      'fixed_amount[currency]': 'nzd',
      'metadata[taptile]': TAG,
    },
    `taptile-rate-${shippingCents}`,
  );
  say(`Shipping rate: created ${created.id} (${nzd(shippingCents)})`);
  return created;
}

const isTosError = (err) =>
  /terms[ _]of[ _]service/i.test(err.message) && /(url|public|settings|business|details)/i.test(err.message);

async function ensureLink(priceId, rateId) {
  const links = (await listAll('/v1/payment_links', { active: 'true', 'expand[]': 'data.line_items' })).filter(
    (l) => l.metadata?.taptile === TAG,
  );
  const priceOf = (l) => l.line_items?.data?.[0]?.price?.id;
  const rateOf = (l) => l.shipping_options?.[0]?.shipping_rate;
  const same = links.find((l) => priceOf(l) === priceId && rateOf(l) === rateId);
  if (same) {
    say(`Payment Link:  reusing ${same.id}`);
    return { link: same, reused: true, consent: !!same.consent_collection?.terms_of_service, replaced: [] };
  }

  // A different price or rate: the batch is still 20 boards, so the new link
  // only gets what the old ones haven't sold. Otherwise it oversells.
  let sold = 0;
  for (const old of links) {
    const sessions = await listAll('/v1/checkout/sessions', { payment_link: old.id, status: 'complete' });
    say(`  old link ${old.id}: ${sessions.length} completed payment(s)`);
    sold += sessions.length;
  }
  const limit = args.limit - sold;
  if (links.length) say(`Payment Link:  ${sold} sold on ${links.length} old link(s), so the new one is capped at ${limit}.`);
  if (limit <= 0) die(`Sold out: ${sold} of ${args.limit}. No new link. Set SOLD_OUT = true in src/site/launch.ts instead.`);

  const base = {
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'line_items[0][adjustable_quantity][enabled]': 'false',
    'shipping_address_collection[allowed_countries][0]': 'NZ',
    'shipping_options[0][shipping_rate]': rateId,
    'phone_number_collection[enabled]': 'true',
    'after_completion[type]': 'redirect',
    'after_completion[redirect][url]': `${args.site}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    'restrictions[completed_sessions][limit]': String(limit),
    allow_promotion_codes: 'false',
    customer_creation: 'always',
    billing_address_collection: 'auto',
    submit_type: 'pay',
    'metadata[taptile]': TAG,
    'metadata[price_nzd]': args.price,
    'payment_intent_data[metadata][taptile]': TAG,
  };
  let link;
  let consent = true;
  try {
    link = await api(
      'POST',
      '/v1/payment_links',
      { ...base, 'consent_collection[terms_of_service]': 'required' },
      `taptile-plink-${priceId}-${rateId}-${limit}`,
    );
  } catch (err) {
    if (!isTosError(err)) throw err;
    consent = false;
    warn(
      'Stripe refused "require terms acceptance" because the account has no Terms URL yet.\n' +
        `   Created the link WITHOUT it. Add ${args.site}/terms under Settings → Business → Public details,\n` +
        '   then re-run with a new --price or edit the link in the dashboard to require terms.',
    );
    link = await api('POST', '/v1/payment_links', base, `taptile-plink-${priceId}-${rateId}-${limit}-noconsent`);
  }
  say(`Payment Link:  created ${link.id} (limit ${limit})`);

  for (const old of links) {
    await api('POST', `/v1/payment_links/${old.id}`, { active: 'false' }, `taptile-plink-off-${old.id}`);
    say(`  deactivated ${old.id} (${old.url})`);
  }
  return { link, reused: false, consent, replaced: links };
}

async function ensureWebhook(url) {
  const hooks = await listAll('/v1/webhook_endpoints', {});
  const same = hooks.find((h) => h.url === url);
  if (same) {
    say(`Webhook:       reusing ${same.id} (${same.status}). Stripe shows its signing secret only once, at creation.`);
    say('               Lost it? Delete the endpoint in Stripe → Developers → Webhooks and re-run.');
    return { hook: same, secret: null };
  }
  const params = {
    url,
    description: 'Taptile orders → Supabase',
    ...Object.fromEntries(WEBHOOK_EVENTS.map((event, i) => [`enabled_events[${i}]`, event])),
  };
  const created = await api('POST', '/v1/webhook_endpoints', params, `taptile-webhook-${url}`);
  say(`Webhook:       created ${created.id}`);
  return { hook: created, secret: created.secret };
}

/* ----------------------------------------------------------------- main -- */
async function main() {
  say(`Stripe setup · ${mode.toUpperCase()} mode${args.dryRun ? ' · DRY RUN, nothing is sent' : ''}`);
  say(`Price ${nzd(priceCents)} · shipping ${nzd(shippingCents)} · limit ${args.limit} · site ${args.site}`);
  say();

  const product = await ensureProduct();
  const price = await ensurePrice(product.id);
  const rate = await ensureRate();
  const result = await ensureLink(price.id, rate.id);
  const webhook = args.webhook ? await ensureWebhook(args.webhook) : null;

  const scope = mode === 'test' ? 'Preview' : 'Production';
  say();
  say('================================================================');
  say(`Payment Link (${mode}):  ${result.link.url}`);
  say();
  say(`Vercel → Settings → Environment Variables, scope ${scope}${mode === 'test' ? ' only' : ''}, then redeploy:`);
  say(`  VITE_BUY_URL=${result.link.url}`);
  say(`  VITE_PRICE_NZD=${args.price}`);
  if (webhook?.secret) {
    say();
    say('Webhook signing secret (shown ONCE, not stored anywhere):');
    say(`  supabase secrets set STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
  }
  if (!result.consent) say('\nTerms acceptance is OFF on this link. See the warning above.');
  say();
  say('Only the dashboard can do these:');
  say('  [ ] Settings → Business → Public details: support email taptile.admin@gmail.com, website,');
  say(`      Terms URL ${args.site}/terms, Privacy URL ${args.site}/privacy`);
  say('  [ ] Settings → Customer emails: Successful payments ON, Refunds ON');
  say('  [ ] Settings → Branding: logo, icon, colours');
  if (mode === 'test') say('  [ ] Repeat this command with the live key and --live once Stripe has verified the account.');
  say('================================================================');
}

main().catch((err) => {
  console.error(`\nStripe said: ${err.message}`);
  if (err.request) console.error(`Request:     ${err.request}`);
  if (err.params) console.error(`Fields:      ${JSON.stringify(err.params, null, 2)}`);
  process.exit(1);
});
