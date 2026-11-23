#!/usr/bin/env python3
# NOTE: one-shot script, already applied on 23 Nov 2026. Re-running it fails on purpose (asserts) because the pages have changed.
"""Legal pass over the Hero v2 pages (index.html, packs.html). Run once from hero-v2/.
Every replacement asserts how many times it expects to match, so a changed page fails loudly."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent

def sub(s, old, new, count=1, regex=False):
    n = len(re.findall(old, s, flags=re.S)) if regex else s.count(old)
    assert n == count, f"expected {count} of {old[:60]!r}, found {n}"
    return re.sub(old, new, s, flags=re.S) if regex else s.replace(old, new)

ORIGIN = "Designed in New Zealand. Finished by hand in New Zealand."
GST = 'Prices in New Zealand dollars (NZD). No GST is charged: Taptile is not GST-registered, so we cannot issue a GST invoice.'
POFACTS = '''<ul class="pofacts" data-mode="preorder">
        <li><b>This is a pre-order.</b> Your Dialect is not yet in production.</li>
        <li><b>Estimated dispatch:</b> <span data-ship-window></span>, because <span data-ship-reason></span>.</li>
        <li><b>Full refund</b> any time before dispatch, no conditions. Email support@trytaptile.com.</li>
        <li>Your rights under the <b>Consumer Guarantees Act</b> apply.</li>
      </ul>'''
FOOTER = f'''<footer class="ft">
  <div class="in">
    <div class="ftop"><span class="lg"><img src="logo.png" alt="" width="96" height="96">Taptile</span><p>One hand. Your whole workflow.</p></div>
    <nav class="fcols" aria-label="Footer">
      <div><b>Shop</b><a href="index.html">Dialect</a><a href="packs.html">Packs</a></div>
      <div><b>Software</b><a href="support.html#software">Setting up</a><a href="index.html#apps">Preset packs</a><a href="support.html#firmware">Firmware and source</a></div>
      <div><b>Support</b><a href="support.html">Quick start</a><a href="contact.html">Contact</a><a href="shipping.html">Shipping</a><a href="returns.html">Returns and warranty</a></div>
    </nav>
    <div class="fbot"><span>{ORIGIN} © 2026 Taptile</span><span><a href="terms.html">Terms</a><a href="privacy.html">Privacy</a></span></div>
    <p class="flegal">Product images on this site are 3D renders of the Dialect until photos of finished units replace them. {GST} App and product names are trademarks of their owners; Taptile is not affiliated with or endorsed by them.</p>
  </div>
</footer>'''
NAVCTA = '<div class="act"><a class="navcta" data-buy data-soon="Join the waitlist" data-preorder="Pre-order" data-instock="Buy" href="#waitlist">Join the waitlist</a></div>'
HEAD = '<link rel="stylesheet" href="site.css">\n<script src="site.js"></script>\n</head>'
SKIP = '<body>\n<a class="skip" href="#main">Skip to content</a>'

# ---------------------------------------------------------------- index.html
p = root / 'index.html'; s = p.read_text()
s = sub(s, '<title>Taptile Dialect</title>', '''<title>Taptile Dialect: nine keys and two dials for your whole workflow</title>
<meta name="description" content="Taptile Dialect is a nine-key macro pad with two aluminium dials, hot-swap MX-compatible switches and underglow. Built for creators, studios and businesses. Designed in New Zealand. NZ$99.99.">
<link rel="canonical" href="https://trytaptile.com/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Taptile">
<meta property="og:title" content="Taptile Dialect. One hand. Your whole workflow.">
<meta property="og:description" content="Nine keys and two dials beside your mouse. Built for creators, studios and businesses. Designed in New Zealand.">
<meta property="og:url" content="https://trytaptile.com/">
<meta property="og:image" content="https://trytaptile.com/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="3D render of the Taptile Dialect macro pad in white, seen from above.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="theme-color" content="#232323">''')
s = sub(s, '</head>', HEAD)
s = sub(s, '<body>', SKIP)
s = sub(s, '<a class="logo" href="#"><img src="logo.png" alt="">Taptile</a>', '<a class="logo" href="index.html" aria-label="Taptile home"><img src="logo.png" alt="" width="96" height="96">Taptile</a>')
s = sub(s, '<a href="#software">Software</a><a href="#faq">Support</a>', '<a href="support.html#software">Software</a><a href="support.html">Support</a>')
s = sub(s, '<div class="act"><a href="#">Sign in</a><a class="bag" href="#">Bag <i>0</i></a></div>', NAVCTA)
s = sub(s, '<section class="hero" id="hero">', '<main id="main">\n<section class="hero" id="hero">')
s = sub(s, '<p class="sub reveal d2">Business and Commercial app available now.</p>',
        '<p class="sub reveal d2"><span data-mode="soon">Coming soon. </span><span data-mode="preorder">Pre-order now. </span>Built for creators, studios and businesses.</p>')
s = sub(s, '<b>Dialect <span>$99.99</span></b><a href="#">Configure →</a>',
        '<b>Dialect <span>NZ$99.99</span></b><a data-buy data-soon="Join the waitlist" data-preorder="Pre-order" data-instock="Buy" href="#waitlist">Join the waitlist</a>')
s = sub(s, '<a class="bk dk2" href="packs.html">Get Dialect, $99.99</a><a class="xl2" href="packs.html#p10">Buying for a team? ›</a></div>',
        '<a class="bk dk2" data-buy data-waitlist="#waitlist" data-soon="Join the waitlist" data-preorder="Pre-order Dialect, NZ$99.99" data-instock="Get Dialect, NZ$99.99" href="#waitlist">Join the waitlist</a><a class="xl2" href="packs.html#p10">Buying for a team? ›</a></div>\n      <p class="fine">NZ$99.99. ' + GST + '</p>\n      ' + POFACTS)
s = sub(s, '<a class="bk" href="packs.html">Get Dialect, $99.99</a><a class="sl-ghost" href="packs.html#p10">Kitting out a team? ›</a></div>',
        '<a class="bk" data-buy data-waitlist="#waitlist" data-soon="Join the waitlist" data-preorder="Pre-order Dialect, NZ$99.99" data-instock="Get Dialect, NZ$99.99" href="#waitlist">Join the waitlist</a><a class="sl-ghost" href="packs.html#p10">Kitting out a team? ›</a></div>\n    <p class="rnote">Images are 3D renders of the Dialect. Photos of finished units replace them at launch.</p>')
# third-party logos -> names only
names = ['Premiere Pro','After Effects','Photoshop','Illustrator','Figma','Blender','Lightroom','Slack','Notion','Spotify','Obsidian','GitHub']
s = sub(s, r'<div class="a4i">.*?</div>', '<p class="a4names">' + ' <span aria-hidden="true">·</span> '.join(names) + '</p>\n      <p class="tmline">Product names are trademarks of their owners. Taptile is not affiliated with or endorsed by them.</p>', regex=True)
s = sub(s, '<a class="a4l" href="#">See all 122 packs ›</a>', '<a class="a4l" href="support.html#software">How presets work ›</a>')
closing = f'''
<section class="fin2" id="waitlist" aria-labelledby="fin-h">
  <div class="sky2" aria-hidden="true"><img loading="lazy" decoding="async" src="cl_c.webp" alt="" style="left:30%;top:14%;width:40vw;opacity:.34"><img loading="lazy" decoding="async" src="cloud.webp" alt="" style="right:-8%;top:54%;width:44vw;transform:scaleX(-1)"><img loading="lazy" decoding="async" src="cloud2.webp" alt="" style="left:-10%;top:60%;width:46vw"></div>
  <div class="in">
    <h2 id="fin-h">One hand. <em>Your whole workflow.</em></h2>
    <p data-mode="soon">Dialect is not on sale yet. Leave your email and we will tell you the day it is.</p>
    <p data-mode="preorder instock">Dialect, NZ$99.99. Ships within New Zealand.</p>
    <form class="wl" data-mode="soon" data-waitlist-form novalidate>
      <label class="sr" for="wl-email" style="position:absolute;left:-9999px">Email address</label>
      <input id="wl-email" type="email" name="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>
      <button type="submit">Join the waitlist</button>
      <span class="wlmsg" data-wl-msg role="status" aria-live="polite"></span>
    </form>
    <p class="wlnote" data-mode="soon">One email when Dialect goes on sale, from Taptile at support@trytaptile.com. Unsubscribe with one click in that email. Joining is not an order and holds no unit or price. See our <a href="privacy.html">privacy policy</a>.</p>
    <div class="ctas" data-mode="preorder instock"><a class="bk w" data-buy data-preorder="Pre-order Dialect, NZ$99.99" data-instock="Get Dialect, NZ$99.99" href="#waitlist">Get Dialect</a><a class="ghost" href="packs.html">See the packs ›</a></div>
    {POFACTS}
    <p class="fine" data-mode="preorder instock">{GST} <a href="shipping.html">Shipping</a>, <a href="returns.html">returns and warranty</a>, <a href="terms.html">terms</a>.</p>
  </div>
</section>
</main>
{FOOTER}
<script>'''
# put the closing section + footer just before the final script block
i = s.rfind('<script>'); assert i > 0
s = s[:i] + closing.lstrip('\n') + s[i+len('<script>'):]
# the page uses scroll-driven scripts that reference nodes by id; keep them untouched
p.write_text(s)

# ---------------------------------------------------------------- packs.html
p = root / 'packs.html'; s = p.read_text()
s = sub(s, '<title>Packs · Taptile Dialect</title>', '''<title>Packs: one Dialect, two, or ten for the team · Taptile</title>
<meta name="description" content="Taptile Dialect comes in packs of 1, 2 or 10. One Dialect is NZ$99.99. Built for creators, studios and businesses. Ships within New Zealand.">
<link rel="canonical" href="https://trytaptile.com/packs">
<meta property="og:type" content="website"><meta property="og:site_name" content="Taptile">
<meta property="og:title" content="Taptile Dialect packs: one for you, ten for the team.">
<meta property="og:description" content="Packs of 1, 2 or 10. Every Dialect is set up the same way.">
<meta property="og:url" content="https://trytaptile.com/packs">
<meta property="og:image" content="https://trytaptile.com/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="favicon.png">
<meta name="theme-color" content="#232323">''')
s = sub(s, '</head>', HEAD)
s = sub(s, '<body>', SKIP)
s = sub(s, '<a class="logo" href="#"><img src="logo.png" alt="">Taptile</a>', '<a class="logo" href="index.html" aria-label="Taptile home"><img src="logo.png" alt="" width="96" height="96">Taptile</a>')
s = sub(s, '<a href="index.html#software">Software</a><a href="#pfaq">Support</a>', '<a href="support.html#software">Software</a><a href="support.html">Support</a>')
s = sub(s, '<div class="act"><a href="#">Sign in</a><a class="bag" href="#">Bag <i>0</i></a></div>', NAVCTA)
s = sub(s, '<section class="phero">', '<main id="main">\n<section class="phero">')
s = sub(s, 'For business and commercial use. Taptile for Business is included with every Dialect.', 'Built for creators, studios and businesses. Taptile for Business is included with every Dialect.')
s = sub(s, '<span class="pr">$99.99</span>', '<span class="pr">NZ$99.99</span>')
s = sub(s, '<b id="tot">$99.99</b></div><button class="add">Add to bag</button></div>',
        '<b id="tot">NZ$99.99</b></div><a class="add" role="button" data-buy data-waitlist="#waitlist" data-soon="Join the waitlist" data-preorder="Pre-order" data-instock="Buy now" href="#waitlist" style="text-decoration:none;text-align:center">Join the waitlist</a></div>\n      ' + POFACTS)
s = sub(s, '<p class="note2">Ships from New Zealand. Price in [FILL IN currency].</p>',
        '<p class="note2">Ships from New Zealand, to New Zealand addresses only. ' + GST + '</p>\n      <p class="note2" data-mode="soon">Dialect is not on sale yet. Join the waitlist and we will email you once, the day it is.</p>\n      <p class="rnote">Images are 3D renders of the Dialect. Photos of finished units replace them at launch.</p>')
s = sub(s, "const price={1:'$99.99',2:'[FILL IN]',10:'[FILL IN]'};", "const price={1:'NZ$99.99',2:'[FILL IN]',10:'[FILL IN]'};")
n = s.count('<span>Designed &amp; assembled in New Zealand</span>'); assert n >= 2, n
s = s.replace('<span>Designed &amp; assembled in New Zealand</span>', '<span>Designed in New Zealand</span><i></i><span>Finished by hand in New Zealand</span>')
s = sub(s, '<span>Made for business</span>', '<span>Built for creators, studios and businesses</span>', count=n)
s = sub(s, '<td>$99.99</td>', '<td>NZ$99.99</td>', count=s.count('<td>$99.99</td>')) if '<td>$99.99</td>' in s else s
s = sub(s, '<details><summary>Can I buy one for personal use?</summary><p>Not right now. Dialect is sold for business and commercial use. Personal use is coming soon.</p></details>',
        '<details><summary>Who is Dialect for?</summary><p>Dialect is built for creators, studios and businesses, and anyone can order one. If you buy it for personal use, the Consumer Guarantees Act covers you as usual. Nothing on this site takes those rights away.</p></details>\n      <details><summary>Is there GST on the price?</summary><p>No. Taptile is not GST-registered, so no GST is charged and we cannot issue a GST invoice. Prices are in New Zealand dollars.</p></details>\n      <details><summary>What about returns and warranty?</summary><p>You get a 12-month warranty on top of your Consumer Guarantees Act rights, and 7 days after it arrives to change your mind. The detail is on the <a href="returns.html">returns and warranty</a> page.</p></details>')
s = sub(s, '<p>Available now for business and commercial use.</p>\n    <div class="ctas"><a class="bk w" href="#choose">Choose your pack</a>',
        '<p data-mode="soon">Dialect is not on sale yet. Leave your email and we will tell you the day it is.</p>\n    <p data-mode="preorder instock">Built for creators, studios and businesses.</p>\n    <form class="wl" data-mode="soon" data-waitlist-form novalidate>\n      <label for="wl-email" style="position:absolute;left:-9999px">Email address</label>\n      <input id="wl-email" type="email" name="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>\n      <button type="submit">Join the waitlist</button>\n      <span class="wlmsg" data-wl-msg role="status" aria-live="polite"></span>\n    </form>\n    <p class="wlnote" data-mode="soon">One email when Dialect goes on sale, from Taptile at support@trytaptile.com. Unsubscribe with one click in that email. Joining is not an order and holds no unit or price. See our <a href="privacy.html">privacy policy</a>.</p>\n    <div class="ctas"><a class="bk w" href="#choose" data-mode="preorder instock">Choose your pack</a>')
s = sub(s, '<section class="fin2">', '<section class="fin2" id="waitlist">')
s = sub(s, r'<footer class="ft">.*?</footer>', FOOTER.replace('\\', '\\\\'), regex=True)
s = sub(s, FOOTER, '</main>\n' + FOOTER)
p.write_text(s)
print('legal pass applied')
