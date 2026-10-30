# Legal and trust review — things only you can resolve

Written 30 October 2026 from a read of the live code, the terms, the privacy
policy and the dashboard. **This is not legal advice.** It is a list of places
where the site says something that may not be true, or where the law expects a
decision you haven't made yet. A free first stop in NZ is your local **Community
Law Centre** (communitylaw.org.nz); for the pre-order setup, an hour with a
lawyer is cheap insurance.

Ordered by risk. "Now" means the site is saying it today.

---

## 1. The terms and the dashboard disagree about who runs Taptile — NOW

- `src/content/legal/terms.md` §1 says: no registered company, two individuals
  trading in their own names, **both under 18**.
- `src/dashboard/mock/index.ts` launch gates 3 and 4 are marked **done**:
  "Company registered, both founders on the paperwork" and "Business account
  open, processor approved for pre-orders".

One of these is wrong. The public terms must describe who customers are
actually contracting with. If an adult or a company is now involved, the terms
need rewriting before anything else. If you are both still under 18:

- Payment processors (Stripe included) generally require the account holder to
  be 18+. An adult (parent or guardian) usually has to hold the account.
- Contracts with minors can be reviewed or cancelled under Part 6 of the
  Contract and Commercial Law Act 2017. The terms already disclose this, which
  is good.

**Decide:** who is the legal seller? Then update terms §1 and the gates.

## 2. "Designed and assembled in New Zealand" — NOW

Shown in the footer on every page and in the home page's search/social
description (`src/pages/Landing.tsx`, `src/site/chrome.tsx`). Nothing has been
assembled yet (`docs/HANDOFF.md`: "Nothing has been ordered"). A claim about
where a product is made is covered by the **Fair Trading Act 1986**, and your
own launch gate 5 lists "no unearned origin claim".

"Designed in New Zealand" is true today. "Assembled in New Zealand" becomes
true once you're actually assembling here.

**Decide:** change to "Designed in New Zealand" until assembly starts? (I can
make the edit; I haven't, because it changes public copy.)

## 3. The configurator is in the terms and privacy policy but not on the site — NOW

Terms §5 and the privacy policy describe a browser configurator. There is no
`/configurator` route in `src/App.tsx`. Describing a feature that isn't there
isn't dangerous in itself, but it's inaccurate.

**Decide:** is the configurator coming back? If not soon, mark those sections
"coming later".

## 4. The waitlist promises "one email… nothing else" — NOW

The form says "One email when the first batch is ready. No payment." and "We
will email you … Nothing else." Under the **Unsolicited Electronic Messages Act
2007**, consent covers what you told people. Sending devlog updates or marketing
to the waitlist would break that promise.

**Do:** only send waitlist members what they signed up for, or change the
wording before collecting more emails.

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
  Don't publish a ship window until gate 8 clears. The returns draft gives a
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

## 8. Admin dashboard

The Messages tab showed "3 unread" permanently. The number was hard-coded. It's
removed on the `inventory-tracker` branch.
