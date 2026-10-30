# Legal and trust review — things only you can resolve

Written 30 October 2026 from a read of the live code, the terms, the privacy
policy and the dashboard. **This is not legal advice.** It is a list of places
where the site says something that may not be true, or where the law expects a
decision you haven't made yet. A free first stop in NZ is your local **Community
Law Centre** (communitylaw.org.nz); for the pre-order setup, an hour with a
lawyer is cheap insurance.

Ordered by risk. "Now" means the site is saying it today.

---

## 1. Who the seller is — ANSWERED 30 Oct, one loose end

Confirmed: the sellers are Palasi and Jenil, both under 18, trading in their own
names, based in the Manawatū. Terms §1 already says this (the town was
deliberately left out: the region is enough to say who customers deal with, and
you're both minors).

Still open:
- Launch gates 3 and 4 in `src/dashboard/mock/index.ts` are marked **done**
  ("Company registered", "processor approved"). That contradicts the above.
  Decide what they should say.
- Payment processors (Stripe included) generally require an 18+ account
  holder. Before pre-orders, an adult (parent or guardian) will probably need to
  hold the payment account. That changes who the legal seller is, so terms §1
  would need rewriting at that point.
- Contracts with minors can be reviewed or cancelled under Part 6 of the
  Contract and Commercial Law Act 2017. The terms disclose this.

## 2. Where it's made — FIXED on the branch

The PCBs are made and assembled by JLCPCB overseas, and final assembly
happens in New Zealand. Public copy now says "Designed in New Zealand · Final
assembly in New Zealand" (footer) and "Designed in New Zealand" (search
description). It never says "Made in New Zealand". The copy rules in
`src/dashboard/copyRules.ts` were updated to match. Crediting design tools
(including AI) isn't required.

## 3. The configurator — FIXED on the branch

Terms and privacy now say the site is a waitlist and development updates only,
that the configurator isn't released yet, and that it's planned as a browser
tool and a desktop application. Both documents promise an update before it
ships. The privacy policy needs a real description of what the desktop app
sends, if anything, before release.

## 4. "One email… nothing else" — CHECKED, holds today

No code emails the waitlist about updates or anything else. The only waitlist
emails are the signup confirmation and the leave confirmation. Keep it that
way: when the full shop launches, send exactly one "it's ready" email, and ask
people to opt in to anything more.

## 5. Privacy policy corrections — fixed on the `inventory-tracker` branch, not published

- It listed "What's in your shopping cart" as browser storage. There is no cart.
  Replaced with the referral/campaign tag the site actually stores.
- It didn't mention that the signup records the campaign that sent you
  (`?utm_source=` / `?ref=`). Now it does.
- It called the stored email a "marker". It's your email address. Now it says
  so.

**Approve:** these go live when you approve publishing.

## 6. Before pre-orders open

- **Returns and shipping policies** — drafts in `docs/policies/`. Every
  `[FILL IN]` is a decision.
- **Pre-order delays** — the Fair Trading Act prohibits accepting payment when
  you have no reasonable grounds to believe you can supply in the time stated.
  There's no public release date, which is right. 25 units are built; cables
  and boxes are the only gap (tracked in Admin → Inventory). The returns draft gives a
  full refund on any delay; keep that.
- **GST** — registration is compulsory once turnover passes NZ$60,000 in 12
  months; below that, prices must not say "incl. GST" unless you're registered.
- **Product safety** — confirm with the supplier whether the board or its parts
  need any compliance marking for where you ship. USB-powered, wired-only
  devices are usually low-risk, but check before you sell overseas.
- **Australia** — if you ship there, the Australian Consumer Law applies too
  (the terms already say so).

## 7. Accessibility

New Zealand has no law that specifically requires private websites to meet a
standard. The **Human Rights Act 1993** does prohibit disability discrimination
in providing goods and services, and in the US, small online shops do get ADA
website lawsuits. That risk matters if you sell to US customers.

A statement alone doesn't protect you. What protects you is the site actually
working for people, plus a clear way to get help if it doesn't. As of 30
October 2026:

- Automated WCAG 2.2 AA checks pass on every public page (fixed: footer
  contrast, sign-in tap targets, show-password label).
- Keyboard-only use and 200% zoom work on home, terms and sign-in.
- **Not yet done:** screen-reader testing (VoiceOver / NVDA). Do this before
  publishing the statement.

Draft statement: `docs/policies/accessibility.md`.

## 8. Supabase

The live database has only `waitlist`, `admins`, `updates` and now the two
inventory tables. Migration `0001_team_and_messaging.sql` (profiles,
messaging) was **never applied**, so the admin Messages and Team pages can't
work yet. Also worth turning on: leaked-password protection in Supabase Auth
(Authentication → Passwords).

## 9. Admin dashboard

The Messages tab showed "3 unread" permanently. The number was hard-coded. It's
removed on the `inventory-tracker` branch.
