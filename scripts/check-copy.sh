#!/usr/bin/env bash
# Handoff §14 — copy rules are legal constraints, so they are checked, not trusted.
#
# src/dashboard/copyRules.ts is excluded because it is the canonical list: it
# names the banned phrases in order to forbid them, and is rendered on the
# Help page. Every other hit in src/ is a real defect.
#
# The word boundaries matter. "$preview" contains "review" and "aria-pressed"
# contains "press", so a looser pattern fires on correct code.
set -uo pipefail

PATTERN='backlit|backlight|per-key[ -]?rgb|cherry[ -]?mx|made in new zealand|as seen in'

# Stock counters ("only 3 left", "12 remaining") are banned on the public site.
# The admin dashboard is private and counts stock on purpose, so it's skipped.
COUNTER='\b(only )?[0-9]+ (left|remaining)\b|\b[0-9]+ (units |boards )?(already )?sold\b'

status=0

if grep -rniE "$PATTERN" src/ --exclude=copyRules.ts; then
  echo
  echo "FAIL: banned phrase above. See src/dashboard/copyRules.ts for the replacement."
  status=1
fi

if grep -rniE "$COUNTER" src/ --exclude-dir=dashboard; then
  echo
  echo "FAIL: stock counter above. Never show how many are left or sold."
  status=1
fi

[ "$status" -ne 0 ] && exit "$status"
echo "PASS: no banned phrases in src/"

# Not a failure: placeholders are expected until launch. They are a deploy
# blocker for production, so say how many are left on every build.
fills=$(grep -rno '\[FILL IN' src/content src/pages src/site src/components 2>/dev/null | wc -l | tr -d ' ')
if [ "$fills" -gt 0 ]; then
  echo "WARN: $fills [FILL IN] placeholder(s) on public pages. Fill every one before the live link goes on production:"
  grep -rnoc '\[FILL IN' src/content src/pages src/site src/components 2>/dev/null | grep -v ':0$' | sed 's/^/  /'
fi
