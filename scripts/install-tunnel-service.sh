#!/usr/bin/env bash
# Installs scripts/tunnel-watch.sh as a systemd service that starts on boot and restarts on failure.
# Undo with: systemctl disable --now crashlab-tunnel && rm /etc/systemd/system/crashlab-tunnel.service
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
chmod +x "$ROOT/scripts/tunnel-watch.sh"
cat > /etc/systemd/system/crashlab-tunnel.service <<EOF
[Unit]
Description=CrashLab broker tunnel + dashboard pointer
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=HOME=$HOME
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=$ROOT/scripts/tunnel-watch.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now crashlab-tunnel
echo "installed; follow it with: journalctl -u crashlab-tunnel -f"
