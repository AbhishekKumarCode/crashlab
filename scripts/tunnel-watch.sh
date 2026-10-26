#!/usr/bin/env bash
# Keeps a Cloudflare quick tunnel to the broker alive and keeps the Vercel dashboard
# pointed at it. A quick tunnel gets a new hostname every time cloudflared starts, so
# whenever the hostname changes this script updates VITE_BROKER_URL in the Vercel
# project and redeploys. Needs: cloudflared, an authenticated `vercel` CLI (`vercel login`)
# and the project linked in .vercel/ (done by the first `vercel --prod`).
#
# Run it as a service: scripts/install-tunnel-service.sh
set -u
umask 077
ROOT=$(cd "$(dirname "$0")/.." && pwd)
STATE_DIR=${STATE_DIR:-/var/lib/crashlab}
STATE="$STATE_DIR/broker-url"      # the address the live dashboard was last built with
PORT=${BROKER_PORT:-4000}
# Private, root-only directory: logs here cannot be pre-created or symlinked by other users,
# and the tunnel address is read back from them, so they must not be forgeable.
install -d -m 700 "$STATE_DIR"
LOG="$STATE_DIR/cloudflared.log"
DEPLOY_LOG="$STATE_DIR/vercel-deploy.log"
[ -L "$LOG" ] && rm -f "$LOG"; [ -L "$DEPLOY_LOG" ] && rm -f "$DEPLOY_LOG"

log() { echo "[tunnel-watch] $*"; }
TPID=""
start_tunnel() {
  : > "$LOG"
  cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate >> "$LOG" 2>&1 &
  TPID=$!
  log "cloudflared started (pid $TPID)"
}
trap 'kill "$TPID" 2>/dev/null; exit 0' TERM INT

publish() {
  local url=$1
  cd "$ROOT" || return 1
  log "publishing $url to Vercel"
  # Replace the variable; if adding fails, nothing is deployed and the next pass retries.
  npx vercel env rm VITE_BROKER_URL production --yes > /dev/null 2>&1 || true
  npx vercel env add VITE_BROKER_URL --environment production --type config --value "$url" --yes > /dev/null 2>&1 || { log "env add failed"; return 1; }
  npx vercel --prod --yes > "$DEPLOY_LOG" 2>&1 || { log "deploy failed (see $DEPLOY_LOG)"; return 1; }
  log "dashboard redeployed for $url"
}

start_tunnel
while true; do
  if ! kill -0 "$TPID" 2>/dev/null; then log "cloudflared exited; restarting in 3s"; sleep 3; start_tunnel; fi
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" | tail -1 || true)
  if [ -n "${URL:-}" ] && [ "$URL" != "$(cat "$STATE" 2>/dev/null || true)" ] \
     && curl -fsm 5 "$URL/health" 2>/dev/null | grep -q '"ok":true'; then
    publish "$URL" && echo "$URL" > "$STATE"
  fi
  sleep 10
done
