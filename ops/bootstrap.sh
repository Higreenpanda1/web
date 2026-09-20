#!/usr/bin/env bash
#
# HiGreenPanda — first-boot hardening for the VPS.
#
# Everything in DEPLOY.md §1, in one idempotent script. Run it as root over SSH
# immediately after the server is created, before anything else:
#
#   scp ops/bootstrap.sh root@<vps-ip>:/root/
#   ssh root@<vps-ip> 'bash /root/bootstrap.sh'
#
# Re-running is safe. Use --dry-run to see exactly what it would do first.
#
# THE ONE THING THIS PROTECTS YOU FROM: it disables SSH password login. If no
# SSH key is installed, that locks you out of your own server. The script
# refuses to touch the SSH config unless it can see a usable key first, and it
# validates the config before restarting the daemon. Hostinger's browser
# terminal in hPanel is the way back in if something still goes wrong — find
# it before you need it.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# ── output ───────────────────────────────────────────────────────────────────
c_ok=$'\033[0;32m'; c_warn=$'\033[0;33m'; c_err=$'\033[0;31m'
c_step=$'\033[1;36m'; c_off=$'\033[0m'
step() { printf '\n%s==> %s%s\n' "$c_step" "$1" "$c_off"; }
ok()   { printf '%s  ok%s %s\n' "$c_ok" "$c_off" "$1"; }
warn() { printf '%s  !!%s %s\n' "$c_warn" "$c_off" "$1"; }
die()  { printf '\n%serror%s %s\n\n' "$c_err" "$c_off" "$1" >&2; exit 1; }

# Every mutating command goes through this, so --dry-run is honest.
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '       would run: %s\n' "$*"
  else
    "$@"
  fi
}

# A fresh Ubuntu box runs apt on its own: apt-daily fires shortly after boot,
# and installing unattended-upgrades below starts it immediately. Either will
# be holding the dpkg lock when the next install starts, and apt-get's default
# behaviour is to give up at once rather than wait. So: say what is happening,
# wait for the lock to clear, and hand apt a timeout of its own as a backstop.
wait_for_apt() {
  # fuser lives in psmisc, which is not guaranteed on a minimal image. Without
  # it we still have apt's own Lock::Timeout below, so this is a nicer message
  # rather than the mechanism.
  command -v fuser >/dev/null 2>&1 || return 0
  local waited=0
  while fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock \
              /var/lib/apt/lists/lock >/dev/null 2>&1; do
    if [ "$waited" -eq 0 ]; then
      warn "another apt process is running (usually the automatic security"
      printf '       updates that start on a new server). Waiting for it.\n'
    fi
    [ "$waited" -ge 600 ] && die "apt has been locked for ten minutes.
Something is stuck. Reboot the server from hPanel and run this again."
    sleep 5
    waited=$(( waited + 5 ))
  done
  [ "$waited" -gt 0 ] && ok "apt is free again after ${waited}s"
  return 0
}

apt_get() {
  wait_for_apt
  DEBIAN_FRONTEND=noninteractive apt-get -o DPkg::Lock::Timeout=600 "$@"
}

write_file() { # write_file <path> <<<content on stdin
  local path="$1"
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '       would write %s:\n' "$path"
    sed 's/^/         | /'
  else
    cat > "$path"
  fi
}

[ "$DRY_RUN" -eq 1 ] && printf '%s\n' "DRY RUN — nothing will be changed."

# ── preflight ────────────────────────────────────────────────────────────────
step "Preflight"

[ "$(id -u)" -eq 0 ] || die "Run this as root."

if [ -r /etc/os-release ]; then
  . /etc/os-release
  ok "$PRETTY_NAME"
  case "${VERSION_ID:-}" in
    24.04) ;;
    *) warn "Expected Ubuntu 24.04; continuing on ${VERSION_ID:-unknown}." ;;
  esac
else
  warn "Cannot identify the distribution; continuing."
fi

# Free memory matters: DEPLOY.md §2 builds the Docker image on this box.
mem_total_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
mem_total_gb=$(( mem_total_kb / 1024 / 1024 ))
if [ "$mem_total_gb" -lt 7 ]; then
  warn "${mem_total_gb} GB RAM. The Next build in §2 may struggle under 8 GB."
else
  ok "${mem_total_gb} GB RAM"
fi

# ── the lockout check, before anything is changed ────────────────────────────
step "Checking for an SSH key before touching the SSH config"

root_keys=/root/.ssh/authorized_keys
key_count=0
if [ -s "$root_keys" ]; then
  key_count=$(grep -cve '^[[:space:]]*$' -e '^[[:space:]]*#' "$root_keys") || true
  key_count=${key_count:-0}
fi

if [ "$key_count" -eq 0 ]; then
  die "No SSH key in $root_keys.

This script disables SSH password login. Without a key you would be locked out
of the server the moment it restarts sshd.

Add your public key first — in hPanel under the VPS's SSH keys section, or by
appending it to $root_keys — then run this again. Verify from your own machine
that 'ssh root@<vps-ip>' works using the key BEFORE re-running."
fi
ok "$key_count key(s) found — safe to proceed"

# ── deploy user ──────────────────────────────────────────────────────────────
step "Creating the '$DEPLOY_USER' user"

if id "$DEPLOY_USER" >/dev/null 2>&1; then
  ok "$DEPLOY_USER already exists"
else
  run adduser --disabled-password --gecos "" "$DEPLOY_USER"
  ok "created $DEPLOY_USER"
fi
run usermod -aG sudo "$DEPLOY_USER"

# `|| true` on the assignment, not inside it: under `set -euo pipefail` a failing
# getent (the user does not exist yet on a dry run) would otherwise abort here.
deploy_home=$(getent passwd "$DEPLOY_USER" | cut -d: -f6) || true
deploy_home="${deploy_home:-/home/$DEPLOY_USER}"
run install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$deploy_home/.ssh"
run install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$root_keys" "$deploy_home/.ssh/authorized_keys"
ok "copied $key_count key(s) to $DEPLOY_USER"

# Passwordless sudo: this account is key-only and has no password to type.
write_file /etc/sudoers.d/90-"$DEPLOY_USER" <<EOF
$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL
EOF
if [ "$DRY_RUN" -eq 0 ]; then
  chmod 440 /etc/sudoers.d/90-"$DEPLOY_USER"
  visudo -cf /etc/sudoers.d/90-"$DEPLOY_USER" >/dev/null || die "sudoers file is invalid"
fi
ok "passwordless sudo configured"

# ── ssh ──────────────────────────────────────────────────────────────────────
step "Hardening SSH"

# A drop-in rather than editing sshd_config: Ubuntu includes this directory at
# the top of the main file, and SSH takes the first value it sees, so these win
# without the main file being rewritten on every run.
write_file /etc/ssh/sshd_config.d/99-hgp-hardening.conf <<'EOF'
# Managed by ops/bootstrap.sh — see DEPLOY.md §1
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

if [ "$DRY_RUN" -eq 0 ]; then
  # Validate before restarting. A bad config here is a locked door.
  sshd -t || die "sshd rejected the new config; nothing was restarted. Fix /etc/ssh/sshd_config.d/99-hgp-hardening.conf"
  ok "sshd config validates"
  systemctl restart ssh 2>/dev/null || systemctl restart sshd
  ok "sshd restarted — root login and passwords are now disabled"
else
  printf '       would validate with sshd -t, then restart ssh\n'
fi

warn "Before closing this session, open a SECOND terminal and confirm:"
printf '         ssh %s@%s\n' "$DEPLOY_USER" "$(hostname -I 2>/dev/null | awk '{print $1}')"
warn "If that fails, you still have this session open to fix it."

# ── firewall ─────────────────────────────────────────────────────────────────
step "Firewall"

run apt_get update -qq
run apt_get install -y -qq ufw
# Allow before enabling. The other order drops your own connection.
run ufw --force reset
run ufw default deny incoming
run ufw default allow outgoing
run ufw allow OpenSSH
run ufw allow 80/tcp
run ufw allow 443/tcp
run ufw --force enable
ok "ufw: 22, 80, 443 in; everything else denied. Postgres is never exposed."

# ── patching and brute-force protection ──────────────────────────────────────
step "Unattended upgrades and fail2ban"

run apt_get install -y -qq unattended-upgrades fail2ban
write_file /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

write_file /etc/fail2ban/jail.local <<'EOF'
# Managed by ops/bootstrap.sh — see DEPLOY.md §1
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h
EOF
run systemctl enable --now fail2ban
run systemctl restart fail2ban
ok "security updates applied automatically; sshd brute force banned for 1h after 5 tries"

# ── docker ───────────────────────────────────────────────────────────────────
step "Docker"

if command -v docker >/dev/null 2>&1; then
  ok "docker already installed: $(docker --version 2>/dev/null || echo unknown)"
else
  # From Docker's own repository: the distribution package lags badly.
  run apt_get install -y -qq ca-certificates curl gnupg
  run install -m 0755 -d /etc/apt/keyrings
  if [ "$DRY_RUN" -eq 0 ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu %s stable\n' \
      "$(dpkg --print-architecture)" "$(. /etc/os-release && echo "$VERSION_CODENAME")" \
      > /etc/apt/sources.list.d/docker.list
  else
    printf '       would add download.docker.com gpg key and apt source\n'
  fi
  run apt_get update -qq
  run apt_get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  ok "docker installed"
fi

run systemctl enable --now docker
run usermod -aG docker "$DEPLOY_USER"
ok "$DEPLOY_USER added to the docker group"

# ── done ─────────────────────────────────────────────────────────────────────
step "Done"

cat <<EOF

  Next, in order:

  1. From a SECOND terminal, confirm key-only login works:
       ssh $DEPLOY_USER@$(hostname -I 2>/dev/null | awk '{print $1}')
     Do not close this session until it does.

  2. In hPanel, enable Hostinger's own firewall for this VPS, allowing only
     22, 80 and 443 inbound. That layer sits outside the OS and survives a
     mistake in ufw.

  3. As $DEPLOY_USER, continue at DEPLOY.md §2 — clone, fill in .env, migrate
     and seed through the 'tools' service, then bring the stack up.

  4. Take a Hostinger snapshot once §2 reports every service healthy, BEFORE
     the DNS cutover in §3.

EOF
