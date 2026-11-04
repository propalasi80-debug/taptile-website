#!/usr/bin/env bash
# The policy pages are legal requirements, not design. A site overhaul may
# restyle them, move them, rebuild the footer, but this fails the build if:
#
#  - a policy document is missing or emptied
#  - a policy page has no route, or nothing on the public site links to it
#  - /thanks (where Stripe sends buyers) has no route
#  - the support email in launch.ts isn't in every policy
#  - analytics or a tracking pixel is added while privacy.md promises none
#
# See CLAUDE.md "Legal pages" before changing anything this checks.
set -uo pipefail
fail=0
err() { echo "FAIL: $*"; fail=1; }

LEGAL=src/content/legal
for doc in terms privacy shipping returns; do
  f="$LEGAL/$doc.md"
  if [ ! -s "$f" ] || [ "$(wc -c < "$f")" -lt 800 ]; then
    err "$f is missing or nearly empty."
  fi
done

# Every policy needs a route, and a link from the site footer: the one place
# that's on every page. The footer is whichever public file renders <footer>,
# so it can move or be rebuilt freely.
footers=$(grep -rlE "<footer" src/ --exclude-dir=dashboard)
[ -z "$footers" ] && err "no <footer> on the public site. The policy links live there."
for page in terms privacy shipping returns contact; do
  grep -rqE "path=[\"'{]+/$page[\"'}]" src/ || err "no route for /$page."
  # shellcheck disable=SC2086
  [ -n "$footers" ] && { grep -qE "(to|href)=[\"'{]+/$page[\"'}#?]" $footers || err "the footer doesn't link to /$page."; }
done
grep -rqE "path=[\"'{]+/thanks[\"'}]" src/ || err "no route for /thanks. Stripe redirects every buyer there."

email=$(grep -oE "SUPPORT_EMAIL = '[^']+'" src/site/launch.ts | cut -d"'" -f2)
if [ -z "$email" ]; then
  err "SUPPORT_EMAIL not found in src/site/launch.ts."
else
  for doc in terms privacy shipping returns; do
    grep -q "$email" "$LEGAL/$doc.md" || err "$LEGAL/$doc.md doesn't mention the support email $email."
  done
fi

# privacy.md says "Taptile runs no analytics of any kind". Adding any of these
# makes that false, which is a Privacy Act problem. Update privacy.md (and the
# CSP in vercel.json) first, then add the tracker to the allowlist below.
TRACKERS='googletagmanager|google-analytics|gtag\(|fbq\(|connect\.facebook\.net|analytics\.tiktok|ttq\.|plausible|posthog|@vercel/analytics|@vercel/speed-insights|hotjar|clarity\.ms|segment\.(com|io)|mixpanel|amplitude|umami'
if grep -rniE "$TRACKERS" src/ index.html package.json --exclude-dir=content; then
  err "analytics or tracking found above, but privacy.md promises none."
fi

[ "$fail" -ne 0 ] && { echo; echo "Policy check failed. See CLAUDE.md, 'Legal pages'."; exit 1; }
echo "PASS: policy pages present, routed, linked; no trackers"
