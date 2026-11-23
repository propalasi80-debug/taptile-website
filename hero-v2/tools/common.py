"""Shared text for every Hero v2 page (footer, origin line, GST line, pre-order lines)."""

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
    <div class="fcols" role="navigation" aria-label="Footer">
      <div><b>Shop</b><a href="index.html">Dialect</a><a href="packs.html">Packs</a></div>
      <div><b>Software</b><a href="support.html#software">Setting up</a><a href="index.html#apps">Preset packs</a><a href="support.html#firmware">Firmware and source</a></div>
      <div><b>Support</b><a href="support.html">Quick start</a><a href="contact.html">Contact</a><a href="shipping.html">Shipping</a><a href="returns.html">Returns and warranty</a></div>
    </div>
    <div class="fbot"><span>{ORIGIN} © 2026 Taptile</span><span><a href="terms.html">Terms</a><a href="privacy.html">Privacy</a></span></div>
    <p class="flegal">Product images on this site are 3D renders of the Dialect until photos of finished units replace them. {GST} App and product names are trademarks of their owners; Taptile is not affiliated with or endorsed by them.</p>
  </div>
</footer>'''
NAVCTA = '<div class="act"><a class="navcta" data-buy data-soon="Join the waitlist" data-preorder="Pre-order" data-instock="Buy" href="#waitlist">Join the waitlist</a></div>'
HEAD = '<link rel="stylesheet" href="site.css">\n<script src="site.js"></script>\n</head>'
SKIP = '<body>\n<a class="skip" href="#main">Skip to content</a>'

