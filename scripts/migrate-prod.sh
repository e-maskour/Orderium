#!/usr/bin/env bash
# ==============================================================================
# migrate-prod.sh — Run / revert migrations inside the PRODUCTION Docker container
# ==============================================================================
#
# Usage:
#   ./scripts/migrate-prod.sh <target> <operation> [options]
#
# Targets:
#   master         Runs against orderium_master (tenants table, lifecycle schema)
#   tenant         Runs against all active tenant databases
#   tenant <slug>  Runs against a single tenant database (e.g. tenant acme)
#
# Operations:
#   run            Apply all pending migrations
#   revert         Revert the last applied migration  ⚠ DESTRUCTIVE
#   show           Show pending migrations without applying them
#
# Note: 'generate' is not available in production — generate migrations locally
#       and deploy them via a new image build.
#
# How the container name is resolved (in order):
#   1. PROD_API_CONTAINER env var (set this if you know the name)
#   2. Auto-detect: first running container whose name contains "api" and "prod"
#      or the Dokploy default pattern (service name "api" in the compose project)
#
# Examples:
#   ./scripts/migrate-prod.sh master run
#   ./scripts/migrate-prod.sh tenant run
#   ./scripts/migrate-prod.sh tenant run acme
#   ./scripts/migrate-prod.sh tenant revert acme
#   ./scripts/migrate-prod.sh master revert
#   ./scripts/migrate-prod.sh tenant show
#
# Override container name:
#   PROD_API_CONTAINER=my-api-container-name ./scripts/migrate-prod.sh master run
# ==============================================================================

set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[migrate-prod]${RESET} $*"; }
success() { echo -e "${GREEN}[migrate-prod] ✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}[migrate-prod] ⚠${RESET} $*"; }
die()     { echo -e "${RED}[migrate-prod] ✗ ERROR:${RESET} $*" >&2; exit 1; }

# ── Resolve container name ─────────────────────────────────────────────────────
resolve_container() {
  # 1. Explicit env override
  if [[ -n "${PROD_API_CONTAINER:-}" ]]; then
    echo "$PROD_API_CONTAINER"
    return
  fi

  # 2. Try common Dokploy naming patterns:
  #    - <project>-api-1  (compose v2 default)
  #    - orderium-api     (explicit container_name in compose)
  for pattern in "orderium-api-1" "orderium-api" "api-1"; do
    if docker ps --format '{{.Names}}' | grep -q "^${pattern}$"; then
      echo "$pattern"
      return
    fi
  done

  # 3. Fuzzy: find first container whose name matches *api* and is running
  local found
  found=$(docker ps --format '{{.Names}}' | grep -i 'api' | grep -v 'dev' | head -n1 || true)
  if [[ -n "$found" ]]; then
    echo "$found"
    return
  fi

  die "Could not auto-detect the production API container.\n  Set PROD_API_CONTAINER=<name> and retry."
}

CONTAINER=$(resolve_container)
info "Using container: ${BOLD}${CONTAINER}${RESET}"

# Verify it is actually running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  die "Container '${CONTAINER}' is not running."
fi

# ── Detect environment inside container (ts-node vs compiled JS) ───────────────
# Production images run compiled JS in /app/dist; dist/database/data-source.js
# must exist. If the image is the 'development' target it uses ts-node instead.
has_dist() {
  docker exec "$CONTAINER" test -f "dist/database/data-source.js" 2>/dev/null
}

run_typeorm_cmd() {
  # $1 = full typeorm sub-command string, e.g. "migration:run -d dist/database/data-source.js"
  if has_dist; then
    docker exec -it "$CONTAINER" \
      node node_modules/typeorm/cli.js $1
  else
    docker exec -it "$CONTAINER" \
      sh -c "pnpm run typeorm -- $1"
  fi
}

# ── Parse arguments ────────────────────────────────────────────────────────────
TARGET="${1:-}"
OPERATION="${2:-}"

[[ -z "$TARGET" ]]    && die "Missing <target>. Use: master | tenant"
[[ -z "$OPERATION" ]] && die "Missing <operation>. Use: run | revert | show"

# ── Prod safety banner ─────────────────────────────────────────────────────────
echo ""
echo -e "${RED}${BOLD}⚠  PRODUCTION — You are modifying live databases  ⚠${RESET}"
echo ""

# ── Dispatch ───────────────────────────────────────────────────────────────────
case "$TARGET" in

  # ── MASTER ─────────────────────────────────────────────────────────────────
  master)
    case "$OPERATION" in
      run)
        info "Running master migrations (production) …"
        read -rp "Type 'MIGRATE MASTER' to confirm: " CONFIRM
        [[ "$CONFIRM" != "MIGRATE MASTER" ]] && { echo "Aborted."; exit 0; }

        if has_dist; then
          docker exec -it "$CONTAINER" \
            node node_modules/typeorm/cli.js migration:run \
            -d dist/database/master-data-source.js
        else
          docker exec -it "$CONTAINER" \
            sh -c "pnpm run typeorm -- migration:run -d src/database/master-data-source.ts"
        fi
        success "Master migrations applied."
        ;;
      revert)
        warn "REVERTING master migration on PRODUCTION. This may break tenant provisioning."
        read -rp "Type 'REVERT MASTER' to confirm: " CONFIRM
        [[ "$CONFIRM" != "REVERT MASTER" ]] && { echo "Aborted."; exit 0; }

        if has_dist; then
          docker exec -it "$CONTAINER" \
            node node_modules/typeorm/cli.js migration:revert \
            -d dist/database/master-data-source.js
        else
          docker exec -it "$CONTAINER" \
            sh -c "pnpm run typeorm -- migration:revert -d src/database/master-data-source.ts"
        fi
        success "Master migration reverted."
        ;;
      show)
        info "Pending master migrations:"
        if has_dist; then
          docker exec -it "$CONTAINER" \
            node node_modules/typeorm/cli.js migration:show \
            -d dist/database/master-data-source.js
        else
          docker exec -it "$CONTAINER" \
            sh -c "pnpm run typeorm -- migration:show -d src/database/master-data-source.ts"
        fi
        ;;
      generate)
        die "'generate' is not supported in production. Run it locally and deploy a new image."
        ;;
      *)
        die "Unknown operation '${OPERATION}'. Use: run | revert | show"
        ;;
    esac
    ;;

  # ── TENANT ─────────────────────────────────────────────────────────────────
  tenant)
    SLUG="${3:-}"

    case "$OPERATION" in
      run)
        if [[ -n "$SLUG" ]]; then
          warn "Running migrations for tenant '${SLUG}' on PRODUCTION."
          read -rp "Type '${SLUG}' to confirm: " CONFIRM
          [[ "$CONFIRM" != "$SLUG" ]] && { echo "Aborted."; exit 0; }
          info "Migrating tenant '${SLUG}' …"

          if has_dist; then
            docker exec -it "$CONTAINER" \
              node src/scripts/migrate-all-tenants.js "--tenant=${SLUG}" 2>/dev/null || \
            docker exec -it "$CONTAINER" \
              node -e "
                const { main } = require('./dist/scripts/migrate-all-tenants');
                main && main();
              " 2>/dev/null || \
            docker exec -it "$CONTAINER" \
              sh -c "node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js"
          else
            docker exec -it "$CONTAINER" \
              npx ts-node -r tsconfig-paths/register \
              src/scripts/migrate-all-tenants.ts "--tenant=${SLUG}"
          fi
          success "Migrations applied for tenant '${SLUG}'."

        else
          warn "Running migrations for ALL tenants on PRODUCTION."
          echo -e "  This will modify every active tenant database."
          read -rp "Type 'MIGRATE ALL TENANTS' to confirm: " CONFIRM
          [[ "$CONFIRM" != "MIGRATE ALL TENANTS" ]] && { echo "Aborted."; exit 0; }
          info "Migrating all active tenants …"

          if has_dist; then
            # In production the script may be compiled to dist/ or still run via ts-node
            # Try compiled first, fall back gracefully
            docker exec -it "$CONTAINER" \
              sh -c '
                if [ -f dist/scripts/migrate-all-tenants.js ]; then
                  node dist/scripts/migrate-all-tenants.js
                else
                  npx ts-node -r tsconfig-paths/register src/scripts/migrate-all-tenants.ts
                fi
              '
          else
            docker exec -it "$CONTAINER" \
              npx ts-node -r tsconfig-paths/register \
              src/scripts/migrate-all-tenants.ts
          fi
          success "All-tenant migration run complete."
        fi
        ;;

      revert)
        [[ -z "$SLUG" ]] && die "Revert requires a tenant slug. Usage:\n  $0 tenant revert <slug>"
        warn "REVERTING last migration for tenant '${SLUG}' on PRODUCTION."
        warn "This may cause DATA LOSS and application errors."
        read -rp "Type 'REVERT ${SLUG}' to confirm: " CONFIRM
        [[ "$CONFIRM" != "REVERT ${SLUG}" ]] && { echo "Aborted."; exit 0; }

        if has_dist; then
          docker exec -it "$CONTAINER" \
            sh -c "DB_NAME=orderium_${SLUG} node node_modules/typeorm/cli.js migration:revert -d dist/database/data-source.js"
        else
          docker exec -it "$CONTAINER" \
            sh -c "DB_NAME=orderium_${SLUG} pnpm run typeorm -- migration:revert -d src/database/data-source.ts"
        fi
        success "Last migration reverted for tenant '${SLUG}'."
        ;;

      show)
        if [[ -n "$SLUG" ]]; then
          info "Pending migrations for tenant '${SLUG}':"
          if has_dist; then
            docker exec -it "$CONTAINER" \
              sh -c "DB_NAME=orderium_${SLUG} node node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js"
          else
            docker exec -it "$CONTAINER" \
              sh -c "DB_NAME=orderium_${SLUG} pnpm run typeorm -- migration:show -d src/database/data-source.ts"
          fi
        else
          info "Pending migrations (using default tenant data-source):"
          if has_dist; then
            docker exec -it "$CONTAINER" \
              node node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js
          else
            docker exec -it "$CONTAINER" \
              sh -c "pnpm run typeorm -- migration:show -d src/database/data-source.ts"
          fi
        fi
        ;;

      generate)
        die "'generate' is not supported in production. Run it locally and deploy a new image."
        ;;

      *)
        die "Unknown operation '${OPERATION}'. Use: run | revert | show"
        ;;
    esac
    ;;

  *)
    die "Unknown target '${TARGET}'. Use: master | tenant"
    ;;
esac
