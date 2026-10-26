#!/usr/bin/env bash
# Quick checks that the broker is reachable the way the dashboard reaches it.
# Usage: scripts/smoke.sh [broker-url]   (defaults to http://127.0.0.1:4000)
# Reads tokens from .env. Exits non-zero if anything fails.
set -u
cd "$(dirname "$0")/.."
URL="${1:-http://127.0.0.1:4000}"
ORIGIN="${DASHBOARD_ORIGIN:-https://crashlab-sandbox.vercel.app}"
val() { grep "^$1=" .env | cut -d= -f2-; }
AUDIT=$(val AUDIT_TOKEN); VIEWER=$(val VIEWER_TOKEN); BLUE=$(val BLUE_TEAM_TOKEN)
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "  ok    $1"; else echo "  FAIL  $1 (expected $2, got $3)"; fail=1; fi
}
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
echo "smoke test against $URL"
check "health answers"                          200 "$(code $URL/health)"
# A browser sends a preflight before any call that carries an Authorization header.
for p in /audit /verify /config /trigger-run; do
  check "preflight $p allowed (204)"            204 "$(code -X OPTIONS -H "Origin: $ORIGIN" -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: authorization,content-type' $URL$p)"
done
hdr=$(curl -s -m 15 -i -X OPTIONS -H "Origin: $ORIGIN" -H 'Access-Control-Request-Method: POST' $URL/audit | tr -d '\r' | grep -i '^access-control-allow-headers' | tr 'A-Z' 'a-z')
case "$hdr" in *authorization*) echo "  ok    preflight allows the Authorization header";; *) echo "  FAIL  preflight does not allow Authorization"; fail=1;; esac
check "viewer can read /audit"                  200 "$(code -H "authorization: Bearer $VIEWER" $URL/audit)"
check "viewer can verify the chain"             200 "$(code -H "authorization: Bearer $VIEWER" $URL/verify)"
leaks=$(curl -s -m 15 -H "authorization: Bearer $VIEWER" $URL/audit | grep -c '"prompt":"')
check "viewer feed contains no attack prompts"  0 "$leaks"
check "viewer cannot read /attacks"             403 "$(code -H "authorization: Bearer $VIEWER" $URL/attacks)"
check "viewer cannot switch the model"          403 "$(code -X POST -H "authorization: Bearer $VIEWER" -H 'content-type: application/json' -d '{"model":"x"}' $URL/config)"
check "blue team token cannot read /audit"      403 "$(code -H "authorization: Bearer $BLUE" $URL/audit)"
check "operator can read /audit"                200 "$(code -H "authorization: Bearer $AUDIT" $URL/audit)"
v=$(curl -s -m 15 -H "authorization: Bearer $AUDIT" $URL/verify)
case "$v" in *'"ok":true'*) echo "  ok    chain verifies";; *) echo "  FAIL  chain does not verify: $v"; fail=1;; esac
check "browser visit to / redirects (302)"      302 "$(code -H 'Accept: text/html' $URL/)"
[ $fail -eq 0 ] && echo "all checks passed" || echo "SOME CHECKS FAILED"
exit $fail
