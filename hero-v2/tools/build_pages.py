#!/usr/bin/env python3
"""Builds the policy, support and contact pages from the text below. Run from hero-v2/: python3 tools/build_pages.py
[FILL IN ...] marks a fact only Jenil, Palasi or the adult on the business can supply. tools/check_site.py refuses to pass while any remain."""
import pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import common as LP  # shared FOOTER / ORIGIN / GST so every page says the same thing
root = pathlib.Path(__file__).resolve().parent.parent
UPDATED = "24 November 2026"
F = lambda t: f'<span class="fill">[FILL IN: {t}]</span>'

def page(slug, title, h1, lede, body, desc, noindex=False):
    robots = '<meta name="robots" content="noindex">' if noindex else ''
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · Taptile</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://trytaptile.com/{slug}">{robots}
<meta property="og:type" content="website"><meta property="og:site_name" content="Taptile">
<meta property="og:title" content="{title} · Taptile"><meta property="og:description" content="{desc}">
<meta property="og:url" content="https://trytaptile.com/{slug}"><meta property="og:image" content="https://trytaptile.com/og.jpg">
<link rel="icon" type="image/png" href="favicon.png">
<meta name="theme-color" content="#DCDCDC">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site.css">
<link rel="stylesheet" href="pages.css">
<script src="site.js"></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<nav id="nav" aria-label="Main"><div class="nb">
  <a class="logo" href="index.html" aria-label="Taptile home"><img src="logo.png" alt="" width="96" height="96">Taptile</a>
  <div class="links"><a href="index.html">Dialect</a><a href="packs.html">Packs</a><a href="support.html#software">Software</a><a href="support.html"{' class="on"' if slug in ('support','contact') else ''}>Support</a></div>
  <div class="act"><a class="navcta" data-buy data-waitlist="index.html#waitlist" data-soon="Join the waitlist" data-preorder="Pre-order" data-instock="Buy" href="index.html#waitlist">Join the waitlist</a></div>
</div></nav>
<main id="main">
<header class="ph"><h1>{h1}</h1><p>{lede}</p></header>
<article class="doc">
{body}
<p class="upd">Last updated: {UPDATED}</p>
</article>
</main>
{LP.FOOTER}
</body>
</html>
'''
    (root / f'{slug}.html').write_text(html)

SELLER = F('the legal seller. Either the company name and NZ company number, or the adult\'s full name "trading as Taptile". Depends on the company or sole trader decision')

# ------------------------------------------------------------------ TERMS
page('terms', 'Terms', 'Terms.', 'What you agree to when you use this site or buy a Dialect. Plain English, New Zealand law.', f'''
<p class="short"><b>The short version.</b> Taptile sells the Dialect in trade, so the Fair Trading Act and the Consumer Guarantees Act protect you, and nothing here takes that away. One Dialect is NZ$99.99 with no GST. You get a 12-month warranty and 7 days to change your mind. We ship within New Zealand only. Joining the waitlist is not an order.</p>

<h2>1. Who you are dealing with</h2>
<p>Taptile is a small New Zealand hardware business in the Manawatū, started and run by two founders who are both under 18. Because of that, an adult stands behind every sale: orders are sold by {SELLER}, who is responsible for your order, your refund and your warranty.</p>
<p>We sell in trade. That means the Fair Trading Act 1986 and the Consumer Guarantees Act 1993 apply to everything we sell.</p>
<p>Contact: <a href="mailto:support@trytaptile.com">support@trytaptile.com</a>. We reply within 1 working day.</p>

<h2>2. The waitlist</h2>
<p>Joining the waitlist is not placing an order. It does not hold a unit or a price for you, and it does not commit either of us to anything. We send one email when the Dialect goes on sale. You can leave at any time with the link in that email, or by emailing us.</p>

<h2>3. Ordering and paying</h2>
<ul>
<li><b>Price.</b> One Dialect is NZ$99.99. All prices are in New Zealand dollars. Taptile is not GST-registered, so no GST is charged and we cannot issue a GST invoice. Shipping is shown before you pay.</li>
<li><b>Payment.</b> Card payments are handled by Stripe. We never see or store your card number.</li>
<li><b>When the sale is made.</b> Your order is accepted when we email your order confirmation. If we cannot fill an order, for example because the run has sold out, we refund you in full.</li>
<li><b>The first run is 20 units.</b> Checkout stops taking orders once they are sold.</li>
</ul>

<h2>4. Pre-orders</h2>
<p>If a Dialect is sold before it is built and in our hands, it is sold as a pre-order and labelled that way next to the buy button. A pre-order always shows that the unit is not yet in production, the estimated dispatch window and the reason for it. You can cancel a pre-order for a full refund at any time before it is dispatched, with no conditions. If we are going to miss the window we told you, we email you as soon as we know and you can cancel for a full refund.</p>

<h2>5. Shipping</h2>
<p>We ship to New Zealand addresses only, by NZ Post tracked courier. The detail is on the <a href="shipping.html">shipping page</a>, and it forms part of these terms.</p>

<h2>6. Returns, faults and warranty</h2>
<p>You have 7 days after your Dialect arrives to change your mind, a 12-month warranty, and your rights under the Consumer Guarantees Act. The detail is on the <a href="returns.html">returns and warranty page</a>, and it forms part of these terms.</p>

<h2>7. Your consumer rights</h2>
<p>The Consumer Guarantees Act 1993 gives you guarantees that cannot be removed, including that goods are of acceptable quality, match their description, and arrive on time and in good condition. Nothing in these terms limits or excludes those guarantees. We do not contract out of the Act for anyone, including business buyers.</p>

<h2>8. Software and firmware</h2>
<p>The Dialect works as a standard USB keyboard with nothing to install. You can change what the keys and dials do with Vial or vial.rocks. Changing keys, building macros or loading different firmware is at your own risk: a bad layout can make the pad stop responding until it is reset, which is normal for programmable hardware and not a fault. The <a href="support.html">support page</a> shows how to reset it.</p>
<p>The firmware is built on QMK and Vial and is open source under the GNU General Public License. Nothing in these terms takes away any right that licence gives you. The source is linked from the <a href="support.html#firmware">support page</a>.</p>

<h2>9. Our name and designs</h2>
<p>The Taptile name, this site's content and the Dialect's designs belong to Taptile. App and product names mentioned on this site are trademarks of their owners, and Taptile is not affiliated with or endorsed by them.</p>

<h2>10. Buying from a business run by under-18s</h2>
<p>Both founders are under 18. Under Part 2, subpart 6 of the Contract and Commercial Law Act 2017, a contract generally cannot be enforced against someone under 18 unless a court or the Disputes Tribunal finds it fair and reasonable. That is why an adult is the seller named in section 1, so your order, refund and warranty are fully enforceable. We tell you this plainly because you are entitled to know who you are buying from.</p>

<h2>11. If we change these terms</h2>
<p>The terms that apply to your order are the ones on this page on the day you ordered. We will not change them for an order you have already placed.</p>

<h2>12. Law and disputes</h2>
<p>New Zealand law governs these terms. If we cannot sort a problem out between us, the Disputes Tribunal is usually the quickest and cheapest place to take it. Nothing in these terms excludes or limits liability that cannot legally be excluded.</p>
''', 'Taptile terms: price, pre-orders, shipping, returns, warranty and your Consumer Guarantees Act rights.')

# ------------------------------------------------------------------ RETURNS
page('returns', 'Returns and warranty', 'Returns and <em>warranty.</em>', 'Seven days to change your mind. Twelve months of warranty. Your consumer rights on top.', f'''
<p class="short"><b>The short version.</b> Changed your mind? Tell us within 7 days of it arriving. Something wrong with it? Email us and we fix it, replace it or refund you, and we pay the postage both ways. Email <a href="mailto:support@trytaptile.com">support@trytaptile.com</a> and we reply within 1 working day.</p>

<h2>Changed your mind</h2>
<ul>
<li>Email us within <b>7 days of receiving</b> your Dialect.</li>
<li>It needs to be unused and in its box with everything that came with it.</li>
<li>You pay the return postage. We email you the return address.</li>
<li>We refund the price of the Dialect. The original shipping is not refunded.</li>
<li>We start your refund within 2 working days of checking the returned unit.</li>
</ul>
<p>A change-of-mind return is something we offer by choice. It sits on top of your legal rights and does not replace them.</p>

<h2>If something is wrong with it</h2>
<ul>
<li>Email us and tell us what is happening. A photo or short video helps.</li>
<li>We pay the postage both ways.</li>
<li>Within 1 working day of inspecting it we tell you whether we will repair it, replace it or refund you.</li>
<li>Refunds are started within 2 working days of agreeing one.</li>
</ul>

<h2>12-month warranty</h2>
<p>Every Dialect has a 12-month warranty from the day it is delivered. If it develops a fault in normal use during that time, we repair it, replace it or refund you, and we pay the postage.</p>
<p>The warranty does not cover:</p>
<ul>
<li>damage from drops, liquid or taking the board apart beyond swapping switches and keycaps as shown on the <a href="support.html">support page</a>;</li>
<li>custom firmware that drives the underglow harder than the firmware we ship. For example, running every light at full white continuously makes the board hot and is not covered.</li>
</ul>
<p>These limits apply to this extra warranty only. They do not limit your rights under the Consumer Guarantees Act.</p>

<h2>Your rights under the Consumer Guarantees Act</h2>
<p>The Consumer Guarantees Act 1993 guarantees that what you buy is of acceptable quality, matches its description and is fit for its purpose. If it is not, you are entitled to a repair, a replacement or a refund, depending on how serious the problem is. Those rights are yours whatever this page says, they are not limited to 12 months, and we do not contract out of them for anyone.</p>
<p>More about your rights: <a href="https://www.consumerprotection.govt.nz/general-help/consumer-laws/consumer-guarantees-act" rel="noopener">consumerprotection.govt.nz</a>.</p>

<h2>Pre-orders</h2>
<p>You can cancel a pre-order for a full refund at any time before it is dispatched, with no conditions.</p>
''', 'Taptile returns and warranty: 7-day change of mind, 12-month warranty and your Consumer Guarantees Act rights.')

# ------------------------------------------------------------------ SHIPPING
page('shipping', 'Shipping', 'Shipping.', 'New Zealand only, tracked, one flat price wherever you live.', f'''
<p class="short"><b>The short version.</b> We ship to New Zealand addresses by NZ Post tracked courier for a flat {F('flat NZ shipping price, in NZD. Weigh the boxed unit first')}. Rural addresses pay the same. In-stock orders are dispatched 1 to 3 working days after payment.</p>

<h2>Where we ship</h2>
<p>New Zealand addresses only for now. We cannot ship overseas yet.</p>

<h2>What it costs</h2>
<p>One flat price per order: {F('flat NZ shipping price, in NZD')}. Rural delivery costs you nothing extra. The shipping price is shown before you pay. Prices are in New Zealand dollars and no GST is charged.</p>

<h2>When it leaves us</h2>
<ul>
<li><b>In-stock orders:</b> dispatched 1 to 3 working days after payment.</li>
<li><b>Pre-orders:</b> the estimated dispatch window is shown next to the buy button and in your order email. If that changes, we email you and you can cancel for a full refund.</li>
</ul>
<p>We email you a tracking number when your order is dispatched.</p>

<h2>If it is late, lost or damaged</h2>
<p>If tracking has not moved for 3 working days, tell us and we chase NZ Post for you. Your order is our responsibility until it reaches you. If it arrives damaged or does not arrive, email <a href="mailto:support@trytaptile.com">support@trytaptile.com</a> and we replace it or refund you. The Consumer Guarantees Act guarantees that goods arrive on time and in good condition.</p>
''', 'Taptile shipping: New Zealand only, NZ Post tracked courier, one flat price including rural addresses.')

# ------------------------------------------------------------------ PRIVACY
page('privacy', 'Privacy', 'Privacy.', 'What we collect, why, where it is kept and how to see or fix it.', f'''
<p class="short"><b>The short version.</b> If you join the waitlist we keep your email address. If you order, we keep what we need to send your Dialect and look after its warranty. We run no analytics and no trackers. Some of your information is stored overseas, and we say where. You can ask to see or correct anything we hold by emailing <a href="mailto:support@trytaptile.com">support@trytaptile.com</a>.</p>

<h2>Who is responsible</h2>
<p>Taptile's privacy officer is {F('name of the privacy officer. The Privacy Act requires one. It can be the adult on the business')}. Contact them at <a href="mailto:support@trytaptile.com">support@trytaptile.com</a>.</p>

<h2>No analytics, no tracking</h2>
<p>We run no analytics of any kind and no advertising or third-party tracking cookies. Nothing about how you browse this site is recorded or sold.</p>

<h2>What we collect, and why</h2>
<h3>If you join the waitlist</h3>
<p>Your email address, the page you signed up on and the time. We use it to send you one email when the Dialect goes on sale. You do not have to give it: the site works without joining.</p>
<h3>If you order</h3>
<ul>
<li>Your name, email address, delivery address and phone number if you give one, so we can send your order and contact you about it.</li>
<li>What you bought, when, and what you paid, because New Zealand tax law requires us to keep business records for 7 years.</li>
<li>The serial number of the unit we sent you, so we can honour its warranty and contact you if there is ever a safety recall.</li>
</ul>
<p>You need to give us these details to place an order, because we cannot deliver without them.</p>
<h3>Payment details</h3>
<p>Card payments are handled by Stripe. Your card number goes to Stripe, not to us, and we never see or store it.</p>
<h3>If you email us</h3>
<p>Your message and email address, so we can reply.</p>
<h3>Server logs</h3>
<p>Our host records IP addresses and basic request details as a normal part of serving pages. We do not use them for anything else.</p>

<h2>Browser storage</h2>
<p>We do not set advertising or tracking cookies. If you join the waitlist, your browser may remember that you did, so the form does not ask again.</p>

<h2>Who else sees your information</h2>
<table>
<tr><th>Provider</th><th>What for</th><th>Where</th></tr>
<tr><td>Supabase</td><td>Stores the waitlist and order records</td><td>London, United Kingdom</td></tr>
<tr><td>Stripe</td><td>Takes payment and holds the payment record</td><td>Overseas, including the United States</td></tr>
<tr><td>Resend</td><td>Sends our emails</td><td>Ireland</td></tr>
<tr><td>Google Workspace</td><td>Runs the support inbox</td><td>Overseas</td></tr>
<tr><td>Vercel</td><td>Hosts this website</td><td>Overseas</td></tr>
<tr><td>NZ Post</td><td>Delivers your order, using your name, address and phone number</td><td>New Zealand</td></tr>
</table>
<p>We do not sell personal information and we do not share it beyond these providers.</p>

<h2>Your information leaving New Zealand</h2>
<p>Because several of these providers store data overseas, your information is held outside New Zealand. Information privacy principle 12 of the Privacy Act 2020 means we should tell you that plainly, so here it is: waitlist and order records are stored in the United Kingdom, payment records are held by Stripe overseas, and emails pass through Ireland. We keep a copy of our order records in New Zealand as well.</p>

<h2>How long we keep it</h2>
<ul>
<li><b>Waitlist entries:</b> until you leave the list, ask us to remove you, or we have sent the launch email and closed the list.</li>
<li><b>Order records:</b> 7 years, as tax law requires.</li>
<li><b>Support emails:</b> until the matter is finished and any warranty has ended.</li>
</ul>

<h2>Your rights</h2>
<p>Under the Privacy Act 2020 you can ask what personal information we hold about you and ask us to correct it. Email <a href="mailto:support@trytaptile.com">support@trytaptile.com</a>. We reply within 1 working day and will give you a decision within 20 working days.</p>
<p>If you are not happy with how we handled a request, you can complain to the Office of the Privacy Commissioner at <a href="https://www.privacy.org.nz" rel="noopener">privacy.org.nz</a>.</p>

<h2>Children</h2>
<p>We do not check anyone's age when they join the waitlist. If you believe a child has given us their details without a parent or guardian knowing, email us and we will delete them.</p>

<h2>If something goes wrong</h2>
<p>If we have a privacy breach that is likely to cause someone serious harm, we will tell the Office of the Privacy Commissioner and the people affected, as the Privacy Act requires.</p>

<h2>Changes to this policy</h2>
<p>We update this page whenever what the site does changes. The current version is always here.</p>
''', 'Taptile privacy policy: what we collect, why, where it is stored and your rights under the Privacy Act 2020.')

# ------------------------------------------------------------------ CONTACT
page('contact', 'Contact', 'Contact.', 'One inbox, read by the people who build the Dialect.', f'''
<p class="short">Email <a href="mailto:support@trytaptile.com">support@trytaptile.com</a>. We reply within 1 working day.</p>
<h2>What to include</h2>
<ul>
<li><b>An order:</b> your order number or the email you ordered with.</li>
<li><b>A fault:</b> what is happening, and a photo or short video if you can.</li>
<li><b>A return:</b> see <a href="returns.html">returns and warranty</a> first. We email you the return address.</li>
<li><b>A team order:</b> how many Dialects and when you need them.</li>
</ul>
<h2>Who we are</h2>
<p>Taptile is a small hardware business in the Manawatū, New Zealand. Orders are sold by {SELLER}. We sell in trade, so the Fair Trading Act and the Consumer Guarantees Act apply.</p>
<h2>Privacy requests</h2>
<p>To see or correct what we hold about you, email the same address. See the <a href="privacy.html">privacy policy</a>.</p>
''', 'Contact Taptile: support@trytaptile.com, with a reply within 1 working day.')

# ------------------------------------------------------------------ THANKS
page('thanks', 'Thank you', 'Thank you. <em>Your order is in.</em>', 'Here is what happens next.', f'''
<p class="short">We have emailed your order confirmation from support@trytaptile.com. If it has not arrived in a few minutes, check your junk folder, then email us.</p>
<h2>What happens next</h2>
<ol>
<li>We assemble your Dialect, test every key, dial and light, and record its serial number against your order.</li>
<li>We dispatch it by NZ Post tracked courier and email you the tracking number. The timing is in your order email and on the <a href="shipping.html">shipping page</a>.</li>
<li>When it arrives, plug it in. The <a href="support.html">quick start</a> takes about a minute.</li>
</ol>
<h2>Changed your mind already?</h2>
<p>Pre-orders can be cancelled for a full refund any time before dispatch. Otherwise you have 7 days after it arrives. See <a href="returns.html">returns and warranty</a>.</p>
''', 'Your Taptile order is confirmed.', noindex=True)

# ------------------------------------------------------------------ SUPPORT
page('support', 'Support', 'Quick <em>start.</em>', 'Plug it in. It works. Change anything you like after that.', f'''
<p class="short">Your Dialect works the moment you plug it in, on Windows, macOS and Linux, with nothing to install. Stuck? Email <a href="mailto:support@trytaptile.com">support@trytaptile.com</a> and we reply within 1 working day.</p>

<h2>1. Plug it in</h2>
<p>Use the braided USB-C cable from the box and plug straight into your computer. The underglow comes on in white.</p>

<h2>2. What the keys and dials do out of the box</h2>
<div class="keys" aria-label="Key layout: 1 2 3, 4 5 6, 7 8 9"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span></div>
<ul>
<li><b>Keys:</b> they type 1 to 9 until you give them a job.</li>
<li><b>Left dial:</b> turn for volume, press to mute.</li>
<li><b>Right dial:</b> turn to scroll.</li>
<li><b>Lighting:</b> hold the right dial down, then turn the left dial for brightness or the right dial for colour.</li>
</ul>

<h2 id="software">3. Make it yours</h2>
<p>Change any key or dial with <b>Vial</b>, a free app, or with <b>vial.rocks</b> in Google Chrome or Microsoft Edge. Your layout is saved on the Dialect itself, so it works the same on any computer you plug it into.</p>
<ol>
<li>Open <a href="https://vial.rocks" rel="noopener">vial.rocks</a> in Chrome or Edge, or install Vial from <a href="https://get.vial.today" rel="noopener">get.vial.today</a>.</li>
<li>Connect and choose Taptile Dialect.</li>
<li>Click a key or dial and pick what it should do.</li>
</ol>
<p>Vial and vial.rocks are independent open-source projects. Taptile does not run them.</p>

<h2>4. Swapping switches</h2>
<p>The switches are hot-swap and MX-compatible, so you can pull one out and push another in without soldering. Unplug the Dialect first, check the two pins on the new switch are straight, and press it in gently. Never force a switch.</p>

<h2 id="firmware">Firmware and source code</h2>
<p>The Dialect's firmware is open source under the GNU General Public License. It is built on QMK and Vial, with thanks to their contributors. You are free to read it, change it and share it under that licence.</p>
<p>Source code: {F('public URL of the firmware source. The repository is still private; publish it with the v1.0.0 release')}.</p>
<p>Running your own firmware is welcome. Firmware that drives the underglow harder than ours makes the board hot and is not covered by the extra 12-month warranty. Your Consumer Guarantees Act rights are not affected.</p>

<h2>If the pad stops responding</h2>
<p>Unplug it, wait five seconds and plug it back in, directly into the computer rather than through a hub. Try a different USB-C cable, because some cables only charge. If it still does not respond, email us and we will get you going again.</p>
''', 'Taptile Dialect quick start: what the keys and dials do, how to remap them, and where the open-source firmware lives.')
print('pages built')
