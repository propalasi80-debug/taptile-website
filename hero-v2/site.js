/* Taptile site settings. This is the ONE place launch state is changed.
 *
 * SALE_MODE
 *   'soon'     Nothing is for sale. Every buy button becomes "Join the waitlist".  (current)
 *   'preorder' Units are not built and in hand. Buy buttons go to the Payment Link and the
 *              four pre-order lines show under every one of them.
 *   'instock'  The units are built, tested and in hand. Buy buttons go to the Payment Link.
 *
 * Fail-safe: 'preorder' and 'instock' fall back to 'soon' while PAYMENT_LINK is empty, and
 * 'preorder' falls back to 'soon' while SHIP_WINDOW is empty, so the site can never show a
 * buy button that goes nowhere or a pre-order with no dispatch estimate.
 */
window.TAPTILE = {
  SALE_MODE: 'soon',
  PAYMENT_LINK: '',          // Stripe Payment Link (capped at 20 payments). Jenil pastes it here.
  SHIP_WINDOW: '',           // e.g. 'the week of 14 December 2026'. Required for 'preorder'.
  SHIP_REASON: '',           // e.g. 'each unit is assembled and tested by hand first'.
  SUPABASE_URL: '',          // public project URL (same value as VITE_SUPABASE_URL on Vercel)
  SUPABASE_ANON_KEY: '',     // public anon key (same value as VITE_SUPABASE_ANON_KEY)
  SUPPORT_EMAIL: 'support@trytaptile.com'
};

(function () {
  var T = window.TAPTILE, mode = T.SALE_MODE;
  if (mode !== 'soon' && !T.PAYMENT_LINK) mode = 'soon';
  if (mode === 'preorder' && !T.SHIP_WINDOW) mode = 'soon';
  document.documentElement.setAttribute('data-sale', mode);

  function ready(fn) { document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    // Buy buttons: one attribute, three states.
    document.querySelectorAll('[data-buy]').forEach(function (a) {
      var label = a.getAttribute('data-' + mode);
      if (label) a.textContent = label;
      if (mode === 'soon') a.setAttribute('href', a.getAttribute('data-waitlist') || '#waitlist');
      else { a.setAttribute('href', T.PAYMENT_LINK); a.setAttribute('rel', 'noopener'); }
    });
    // Pre-order facts.
    document.querySelectorAll('[data-ship-window]').forEach(function (e) { e.textContent = T.SHIP_WINDOW; });
    document.querySelectorAll('[data-ship-reason]').forEach(function (e) { e.textContent = T.SHIP_REASON; });

    // Waitlist form. Uses the same join_waitlist function as the current live site.
    document.querySelectorAll('form[data-waitlist-form]').forEach(function (f) {
      var out = f.querySelector('[data-wl-msg]'), input = f.querySelector('input[type=email]'), btn = f.querySelector('button');
      function say(t, ok) { out.textContent = t; out.setAttribute('data-ok', ok ? '1' : '0'); }
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var email = (input.value || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) { say('That does not look like a valid email address.', false); input.focus(); return; }
        if (!T.SUPABASE_URL || !T.SUPABASE_ANON_KEY) {
          // Never pretend a signup worked.
          say('Signups are not connected on this preview. Email ' + T.SUPPORT_EMAIL + ' and we will add you.', false);
          return;
        }
        btn.disabled = true; say('Adding you…', true);
        fetch(T.SUPABASE_URL + '/rest/v1/rpc/join_waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: T.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + T.SUPABASE_ANON_KEY },
          body: JSON.stringify({ p_email: email, p_source: 'hero-v2:Taptile Dialect' })
        }).then(function (r) {
          if (!r.ok) throw new Error('rpc');
          say('You are on the list. We will email you once, when Dialect goes on sale.', true); f.reset();
          fetch(T.SUPABASE_URL + '/functions/v1/waitlist-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: T.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + T.SUPABASE_ANON_KEY },
            body: JSON.stringify({ email: email, interest: 'Taptile Dialect' })
          }).catch(function () {});
        }).catch(function () { say('Could not save that just now. Please try again in a moment.', false); })
          .then(function () { btn.disabled = false; });
      });
    });
  });
})();
