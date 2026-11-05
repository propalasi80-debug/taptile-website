/**
 * Every email Taptile sends, written once.
 *
 *   Account (via the Supabase Send Email Hook, see functions/auth-email):
 *     signup, invite, magiclink, recovery, email_change (both halves),
 *     reauthentication, and the security notices Supabase can send:
 *     password / email / phone changed, sign-in method linked / unlinked,
 *     two-step sign-in on / off.
 *   Waitlist (functions/waitlist-confirmation): the welcome email.
 *   Broadcasts and orders (rendered from here, stored as Resend templates):
 *     launch, build update, order confirmed, order shipped.
 *
 * Voice: two people writing to someone they're glad to hear from. Warm,
 * plain, short. Say what happened, what to do, and what happens if you do
 * nothing. Never promise a date or a price we haven't set.
 */
import { BRAND, esc, render, type Email, type Message } from './layout.ts';

/* ------------------------------------------------------------- account -- */
export interface AuthUser {
  email: string;
  new_email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthEmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new: string;
  token_hash_new: string;
  old_email?: string;
  old_phone?: string;
  provider?: string;
  factor_type?: string;
}

export interface Outgoing extends Email {
  to: string;
  tag: string;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

/** The link Supabase verifies before sending the person on to redirect_to. */
export function verifyUrl(supabaseUrl: string, tokenHash: string, type: string, redirectTo: string): string {
  const q = new URLSearchParams({ token: tokenHash, type, redirect_to: redirectTo });
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1/verify?${q.toString()}`;
}

function firstName(user: AuthUser): string {
  const full = user.user_metadata?.['full_name'];
  return typeof full === 'string' && full.trim() ? full.trim().split(/\s+/)[0] : '';
}

function providerName(p?: string): string {
  const names: Record<string, string> = { google: 'Google', github: 'GitHub', apple: 'Apple', email: 'Email and password' };
  return (p && names[p]) || (p ? p[0].toUpperCase() + p.slice(1) : 'A sign-in method');
}

const strong = (s: string) => `<strong style="color:#ffffff;font-weight:600;">${esc(s)}</strong>`;

/**
 * One Supabase hook call can mean more than one email: a secure email change
 * confirms at both the old and the new address.
 */
export function authEmails(user: AuthUser, d: AuthEmailData, supabaseUrl: string): Outgoing[] {
  const redirect = d.redirect_to || d.site_url || BRAND.site;
  const forgot = `${BRAND.site}/forgot-password`;
  const type = d.email_action_type;
  const out: Outgoing[] = [];
  const add = (to: string, m: Message, key?: string) =>
    out.push({ ...render(m), to, tag: `auth-${type}`, idempotencyKey: key ? `auth-${type}-${key}` : undefined });

  switch (type) {
    case 'signup': {
      const url = verifyUrl(supabaseUrl, d.token_hash, 'signup', redirect);
      add(user.email, {
        subject: 'Confirm your email for Taptile',
        preheader: 'One tap and your account is ready.',
        label: 'Confirm your email',
        heading: 'Nearly there.',
        blocks: [
          { kind: 'p', html: `Thanks for making a Taptile account. Tap below to confirm ${strong(user.email)} and you're all set.` },
          { kind: 'button', label: 'Confirm my email', url },
          { kind: 'link', url },
          { kind: 'note', html: "Didn't sign up? No worries &mdash; just ignore this and nothing will happen." },
        ],
        footer: { kind: 'account' },
      }, d.token_hash);
      break;
    }
    case 'invite': {
      const url = verifyUrl(supabaseUrl, d.token_hash, 'invite', redirect);
      const name = firstName(user);
      add(user.email, {
        subject: "You're invited to the Taptile team",
        preheader: 'Set a password and you’re in.',
        label: 'Team invite',
        heading: 'Welcome to the team.',
        blocks: [
          { kind: 'p', html: `${name ? `Hi ${esc(name)} &mdash; y` : 'Y'}ou've been invited to the Taptile team dashboard. It's where we write the build updates and keep an eye on the waitlist.` },
          { kind: 'p', html: `Set a password for ${strong(user.email)} and you're in.` },
          { kind: 'button', label: 'Set my password', url },
          { kind: 'link', url },
          { kind: 'note', html: "The link works once. Weren't expecting an invite? Just ignore it." },
          { kind: 'signoff' },
        ],
        footer: { kind: 'account' },
      }, d.token_hash);
      break;
    }
    case 'magiclink': {
      const url = verifyUrl(supabaseUrl, d.token_hash, 'magiclink', redirect);
      add(user.email, {
        subject: 'Your Taptile sign-in link',
        preheader: 'Tap to sign in. Works once, lasts an hour.',
        label: 'Sign in',
        heading: "Here's your way in.",
        blocks: [
          { kind: 'p', html: `Tap below to sign in as ${strong(user.email)}. The link works once and lasts an hour.` },
          { kind: 'button', label: 'Sign me in', url },
          { kind: 'link', url },
          { kind: 'note', html: "Didn't ask for this? You can ignore it &mdash; nobody gets in without this link." },
        ],
        footer: { kind: 'account' },
      }, d.token_hash);
      break;
    }
    case 'recovery': {
      const url = verifyUrl(supabaseUrl, d.token_hash, 'recovery', redirect);
      add(user.email, {
        subject: 'Reset your Taptile password',
        preheader: 'Pick a new one — the link lasts an hour.',
        label: 'Password reset',
        heading: "Let's get you back in.",
        blocks: [
          { kind: 'p', html: `Someone (hopefully you) asked to reset the password for ${strong(user.email)}. Tap below to pick a new one &mdash; the link works once and lasts an hour.` },
          { kind: 'button', label: 'Pick a new password', url },
          { kind: 'link', url },
          { kind: 'note', html: "Wasn't you? Just ignore this. Your password won't change." },
        ],
        footer: { kind: 'account' },
      }, d.token_hash);
      break;
    }
    case 'email_change': {
      const newEmail = user.new_email ?? '';
      // Supabase's field names are swapped for backward compatibility:
      // token_hash_new goes with the CURRENT address, token_hash with the NEW one.
      const secure = Boolean(d.token_hash_new && d.token_hash);
      if (secure) {
        const urlOld = verifyUrl(supabaseUrl, d.token_hash_new, 'email_change', redirect);
        add(user.email, {
          subject: 'Changing your Taptile email?',
          preheader: `Confirm the move to ${newEmail}.`,
          label: 'Email change',
          heading: 'Moving to a new email?',
          blocks: [
            { kind: 'p', html: `We got a request to switch your Taptile account from ${strong(user.email)} to ${strong(newEmail)}. If that's you, confirm below &mdash; we'll send a quick check to the new address too.` },
            { kind: 'button', label: 'Yes, that was me', url: urlOld },
            { kind: 'link', url: urlOld },
          ],
          footer: { kind: 'security' },
        }, `${d.token_hash_new}-old`);
      }
      const hashForNew = d.token_hash || d.token_hash_new;
      if (newEmail && hashForNew) {
        const urlNew = verifyUrl(supabaseUrl, hashForNew, 'email_change', redirect);
        add(newEmail, {
          subject: 'Confirm your new email for Taptile',
          preheader: 'One tap to make this your Taptile email.',
          label: 'Email change',
          heading: 'Is this your new address?',
          blocks: [
            { kind: 'p', html: `Confirm ${strong(newEmail)} and it becomes the email for your Taptile account.` },
            { kind: 'button', label: 'Confirm this email', url: urlNew },
            { kind: 'link', url: urlNew },
            { kind: 'note', html: 'Not you? Ignore this and nothing changes.' },
          ],
          footer: { kind: 'account' },
        }, `${hashForNew}-new`);
      }
      break;
    }
    case 'reauthentication': {
      add(user.email, {
        subject: `${d.token} is your Taptile code`,
        preheader: 'Pop it in to confirm it’s you.',
        label: 'Verification code',
        heading: "Here's your code.",
        blocks: [
          { kind: 'p', html: "Pop this in to confirm it's you. It only lasts a few minutes." },
          { kind: 'code', code: d.token },
          { kind: 'note', html: `Didn't ask for a code? Someone might have your password &mdash; <a href="${forgot}" style="color:#b4b4ba;text-decoration:underline;">reset it here</a> and reply to let us know.` },
        ],
        footer: { kind: 'security' },
      }, d.token_hash || d.token);
      break;
    }
    case 'password_changed_notification':
      add(user.email, notice('Your Taptile password was changed', 'Your password was changed.',
        `Just a heads-up: the password for ${strong(user.email)} was changed. If that was you, you're all set &mdash; nothing else to do.`, forgot));
      break;
    case 'email_changed_notification':
      add(d.old_email || user.email, notice('Your Taptile email was changed', 'Your email was changed.',
        `Just a heads-up: your Taptile account now uses ${strong(user.email)} instead of ${strong(d.old_email || 'this address')}. If you made the change, you're all set.`, forgot));
      break;
    case 'phone_changed_notification':
      add(user.email, notice('Your Taptile phone number was changed', 'Your phone number was changed.',
        "Just a heads-up: the phone number on your Taptile account was changed. If that was you, you're all set.", forgot));
      break;
    case 'identity_linked_notification':
      add(user.email, notice(`${providerName(d.provider)} is now linked to Taptile`, `${providerName(d.provider)} is linked.`,
        `You can now sign in to Taptile with ${strong(providerName(d.provider))}. If you set that up, you're all set.`, forgot));
      break;
    case 'identity_unlinked_notification':
      add(user.email, notice(`${providerName(d.provider)} was removed from Taptile`, `${providerName(d.provider)} was removed.`,
        `${strong(providerName(d.provider))} can't be used to sign in to your Taptile account anymore. If you removed it, you're all set.`, forgot));
      break;
    case 'mfa_factor_enrolled_notification':
      add(user.email, notice('Two-step sign-in is on', 'Two-step sign-in is on.',
        `Nice &mdash; your Taptile account now asks for a second step${d.factor_type ? ` (${esc(d.factor_type.toUpperCase())})` : ''} when you sign in. That makes it a lot harder for anyone else to get in.`, forgot));
      break;
    case 'mfa_factor_unenrolled_notification':
      add(user.email, notice('Two-step sign-in was turned off', 'Two-step sign-in is off.',
        `Two-step sign-in${d.factor_type ? ` (${esc(d.factor_type.toUpperCase())})` : ''} was turned off for your Taptile account. If you did that, you're all set &mdash; though we'd suggest turning it back on.`, forgot));
      break;
    default:
      // A new action type we haven't written yet: send something sensible
      // rather than nothing, and say so in the logs.
      console.warn('auth-email: unknown action type', type);
      if (d.token_hash) {
        const url = verifyUrl(supabaseUrl, d.token_hash, type, redirect);
        add(user.email, {
          subject: 'Quick check from Taptile',
          preheader: 'One tap to carry on.',
          label: 'Confirm',
          heading: 'Just checking it’s you.',
          blocks: [
            { kind: 'p', html: `Tap below to carry on with your Taptile account, ${strong(user.email)}.` },
            { kind: 'button', label: 'Carry on', url },
            { kind: 'link', url },
          ],
          footer: { kind: 'account' },
        }, d.token_hash);
      }
  }
  return out;
}

/** The shared shape of every "something changed on your account" notice. */
function notice(subject: string, heading: string, html: string, forgot: string): Message {
  return {
    subject,
    preheader: "Just letting you know. If it wasn't you, we'll help.",
    label: 'Account security',
    heading,
    blocks: [
      { kind: 'p', html },
      { kind: 'button', label: "Wasn't me — reset my password", url: forgot },
    ],
    footer: { kind: 'security' },
  };
}

/* ------------------------------------------------------------- waitlist -- */
export function waitlistWelcome(interest: string, leaveUrl: string): Email {
  const board = interest && interest !== 'Not sure yet' ? interest : 'Taptile Dialect';
  return render({
    subject: "You're on the list — thanks for joining Taptile",
    preheader: "It means a lot. Here's what happens next.",
    label: 'Waitlist',
    heading: 'Thanks for being early.',
    blocks: [
      { kind: 'p', html: "Hey &mdash; thanks for joining. Taptile is just the two of us building a macropad in New Zealand, so every name on this list means a lot." },
      { kind: 'p', html: `When the first batch of the ${esc(board)} is ready, you'll hear about it <strong style="color:#ffffff;font-weight:600;">before anyone else</strong>.` },
      { kind: 'facts', rows: [['Board', board], ['Your spot', 'First access to batch one'], ['Emails', 'Only when there’s real news'], ['Cost to wait', 'Nothing']] },
      { kind: 'p', html: "Until then we're sharing the build as it happens &mdash; the wins and the things that didn't work." },
      { kind: 'button', label: "See how it's going", url: `${BRAND.site}/updates` },
      { kind: 'note', html: 'Got a question, or an idea for what Taptile should do? Hit reply &mdash; it comes straight to us.' },
      { kind: 'signoff' },
    ],
    footer: { kind: 'list', leaveUrl },
  });
}

/* ---------------------------------------- broadcasts and orders (Resend) -- */
/*
 * These are stored as Resend templates (launch-announcement, build-update,
 * order-confirmation, order-shipped), so their
 * variables use Resend's triple-brace syntax and are filled in at send time.
 * RESEND_UNSUBSCRIBE_URL is Resend's own one-click unsubscribe for broadcasts.
 */
export function launchTemplate(): Email {
  return render({
    subject: "It's ready — the Taptile Dialect is open for orders",
    preheader: 'You waited, so you get first go.',
    label: 'Orders open',
    heading: "It's finally ready.",
    blocks: [
      { kind: 'image', src: `${BRAND.site}/og.jpg`, alt: 'The Taptile Dialect', width: 492, height: 258 },
      { kind: 'p', html: "When you joined the waitlist we said you'd hear first. This is that email: the first batch of the Taptile Dialect is open, and you get first go before we post it anywhere else." },
      { kind: 'facts', rows: [['Batch', '{{{BATCH_SIZE}}}'], ['Price', '{{{PRICE}}}'], ['Ships', '{{{SHIP_WINDOW}}}']] },
      { kind: 'button', label: 'Get yours', url: '{{{ORDER_URL}}}' },
      { kind: 'note', html: 'Waitlist early access ends {{{EARLY_ENDS}}}. Questions before you order? Reply and ask &mdash; we answer every one.' },
      { kind: 'p', html: 'Thanks for waiting with us.' },
      { kind: 'signoff' },
    ],
    footer: { kind: 'list', leaveUrl: '{{{RESEND_UNSUBSCRIBE_URL}}}' },
  });
}

export function updateTemplate(): Email {
  return render({
    subject: '{{{TITLE}}}',
    preheader: '{{{SUMMARY}}}',
    label: 'From the build',
    heading: '{{{TITLE}}}',
    blocks: [
      { kind: 'p', html: '{{{SUMMARY}}}' },
      { kind: 'button', label: 'Read the full update', url: '{{{URL}}}' },
      { kind: 'note', html: 'Thoughts? Hit reply &mdash; we read everything.' },
      { kind: 'signoff' },
    ],
    footer: { kind: 'list', leaveUrl: '{{{RESEND_UNSUBSCRIBE_URL}}}' },
  });
}

export function orderConfirmedTemplate(): Email {
  return render({
    subject: 'Thanks for your order ({{{ORDER_NUMBER}}})',
    preheader: "It's yours. We'll email again the moment it ships.",
    label: 'Order confirmed',
    heading: 'Thank you — it’s yours.',
    blocks: [
      { kind: 'p', html: "Your order's in. We're a tiny team, so every order means a lot &mdash; thank you for backing us. We'll email again the moment it ships, with tracking." },
      { kind: 'facts', rows: [['Order', '{{{ORDER_NUMBER}}}'], ['Board', '{{{ITEM}}}'], ['Quantity', '{{{QUANTITY}}}'], ['Total', '{{{TOTAL}}}'], ['Ships to', '{{{SHIP_TO}}}']] },
      { kind: 'button', label: 'View my order', url: '{{{ORDER_URL}}}' },
      { kind: 'signoff' },
    ],
    footer: { kind: 'order' },
  });
}

export function orderShippedTemplate(): Email {
  return render({
    subject: 'Your Taptile is on its way',
    preheader: 'Order {{{ORDER_NUMBER}}} just left us.',
    label: 'Shipped',
    heading: "It's on its way.",
    blocks: [
      { kind: 'p', html: "Your Taptile (order {{{ORDER_NUMBER}}}) just left us. Tracking can take a few hours to wake up, so don't worry if it's quiet at first." },
      { kind: 'facts', rows: [['Carrier', '{{{CARRIER}}}'], ['Tracking', '{{{TRACKING_NUMBER}}}']] },
      { kind: 'button', label: 'Track it', url: '{{{TRACKING_URL}}}' },
      { kind: 'note', html: 'We\'d love to see it on your desk when it lands &mdash; tag us on Instagram <a href="https://www.instagram.com/trytaptile/" style="color:#b4b4ba;text-decoration:underline;">@trytaptile</a>.' },
      { kind: 'signoff' },
    ],
    footer: { kind: 'order' },
  });
}

/* --------------------------------------------- orders (sent with real values) -- */
/*
 * Unlike the Resend-stored templates above, these are rendered at send time
 * by the stripe-webhook and order-shipped functions, with values that came
 * from a customer's checkout. Every value goes through esc(), here or in the
 * renderer: treat all of it as hostile.
 */
export interface OrderEmailFacts {
  orderNumber: string;
  item: string;
  quantity: number;
  total: string;
  shipTo: string;
}

/** To the team, the moment Stripe reports a paid session. */
export function orderReceivedForTeam(o: OrderEmailFacts & { email: string; phone: string; adminUrl: string }): Email {
  return render({
    subject: `New order ${o.orderNumber} — ${o.total}`,
    preheader: `${o.item} × ${o.quantity}, ships to ${o.shipTo}`,
    label: 'New order',
    heading: `Order ${o.orderNumber} just came in.`,
    blocks: [
      { kind: 'p', html: `Someone just paid for a ${strong(o.item)}. Stripe has the payment, and their receipt is on its way from Stripe.` },
      {
        kind: 'facts',
        rows: [
          ['Order', o.orderNumber],
          ['Board', o.item],
          ['Qty', String(o.quantity)],
          ['Total', o.total],
          ['Ships to', o.shipTo || '—'],
          ['Phone', o.phone || '—'],
          ['Email', o.email],
        ],
      },
      { kind: 'button', label: 'Open in admin', url: o.adminUrl },
      { kind: 'note', html: 'Print the label in eShip and mark it shipped in admin; that sends the tracking email.' },
    ],
    footer: { kind: 'order' },
  });
}

/** To the customer, when the order is marked shipped in admin. Same words as orderShippedTemplate(). */
export function orderShipped(o: { orderNumber: string; carrier: string; trackingNumber: string; trackingUrl: string }): Email {
  const trackingUrl = /^https?:\/\//i.test(o.trackingUrl.trim()) ? o.trackingUrl.trim() : '';
  const blocks: Message['blocks'] = [
    { kind: 'p', html: `Your Taptile (order ${strong(o.orderNumber)}) just left us. Tracking can take a few hours to wake up, so don't worry if it's quiet at first.` },
    { kind: 'facts', rows: [['Carrier', o.carrier || 'NZ Post'], ['Tracking', o.trackingNumber || 'Coming by email']] },
  ];
  if (trackingUrl) blocks.push({ kind: 'button', label: 'Track it', url: trackingUrl });
  else blocks.push({ kind: 'note', html: "We'll email the tracking link as soon as the courier gives us one." });
  blocks.push(
    { kind: 'note', html: 'We\'d love to see it on your desk when it lands &mdash; tag us on Instagram <a href="https://www.instagram.com/trytaptile/" style="color:#b4b4ba;text-decoration:underline;">@trytaptile</a>.' },
    { kind: 'signoff' },
  );
  return render({
    subject: 'Your Taptile is on its way',
    preheader: `Order ${o.orderNumber} just left us.`,
    label: 'Shipped',
    heading: "It's on its way.",
    blocks,
    footer: { kind: 'order' },
  });
}
