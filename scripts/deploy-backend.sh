#!/usr/bin/env bash
#
# Deploys the backend from this repository into a cPanel Node.js application folder.
# Called by .cpanel.yml after a push, and can be run by hand:
#
#     scripts/deploy-backend.sh /home/viralkar/backend
#
# Set DRY_RUN=1 to do only the file steps and print (not run) the install, migrate and build commands. That is how
# the layout was tested without a server.
#
# What it never touches: the server's .env file and the uploads/ folder. Both live inside the deploy folder and
# both are kept between deploys.

set -euo pipefail

DEPLOY_PATH="${1:?Usage: deploy-backend.sh <deploy-folder>, for example /home/viralkar/backend}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$DEPLOY_PATH/apps/backend"

# In a dry run, commands are printed instead of run.
run() {
  if [[ -n "${DRY_RUN:-}" ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

log() { echo "==> $*"; }

# cPanel's Node.js Selector keeps each app's Node version in its own environment. A deploy task does not load it
# by itself, so find and activate the newest one for this app, if there is one.
activate_node() {
  local app_name
  app_name="$(basename "$DEPLOY_PATH")"
  local candidate
  candidate="$(ls -d "$HOME"/nodevenv/"$app_name"/*/bin/activate 2>/dev/null | sort -V | tail -n 1 || true)"
  if [[ -n "$candidate" ]]; then
    log "Using Node from $candidate"
    # shellcheck disable=SC1090
    source "$candidate"
  fi
}

# The server's .env holds the database password and JWT secrets. It is created by hand, once, and never comes from git.
require_env_file() {
  if [[ ! -f "$APP_DIR/.env" && -z "${DRY_RUN:-}" ]]; then
    echo "ERROR: $APP_DIR/.env does not exist." >&2
    echo "Create it once from apps/backend/.env.example before the first deploy. See docs/DEPLOYMENT.md." >&2
    exit 1
  fi
}

log "Deploying backend from $REPO_ROOT to $DEPLOY_PATH"
[[ -z "${DRY_RUN:-}" ]] && activate_node

mkdir -p "$DEPLOY_PATH/apps" "$APP_DIR/uploads" "$APP_DIR/tmp"
require_env_file

# Remove what a rebuild recreates, so a file deleted from git does not linger and get compiled. .env, uploads/ and
# node_modules are deliberately left alone.
log "Cleaning old build files"
rm -rf "$APP_DIR/src" "$APP_DIR/prisma" "$APP_DIR/dist" "$APP_DIR/test"

log "Copying files"
cp "$REPO_ROOT/package.json" "$REPO_ROOT/package-lock.json" "$DEPLOY_PATH/"
# The trailing /. copies the contents, so this works the first time and on every later deploy.
for item in src prisma package.json tsconfig.json tsconfig.build.json nest-cli.json; do
  if [[ -e "$REPO_ROOT/apps/backend/$item" ]]; then
    cp -R "$REPO_ROOT/apps/backend/$item" "$APP_DIR/"
  fi
done

cd "$DEPLOY_PATH"

# The root lockfile covers every app in the repository, but only the backend is deployed here, so install just that
# one. Development packages are needed: the build (Nest CLI, TypeScript) and Prisma's migration tool live there.
log "Installing packages"
run npm ci --workspace=apps/backend

cd "$APP_DIR"

log "Generating the database client"
run npx prisma generate

# Migrations run before the new code starts. If one fails the script stops here and the app keeps the old build
# until it is restarted.
log "Applying database migrations"
run npx prisma migrate deploy

log "Building"
run npm run build

log "Restarting the app"
run touch "$APP_DIR/tmp/restart.txt"

log "Done"
