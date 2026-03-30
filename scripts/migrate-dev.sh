#!/usr/bin/env bash
# ==============================================================================
# migrate-dev.sh — Run / generate / revert migrations in the DEV Docker container
# ==============================================================================
#
# Usage:
#   ./scripts/migrate-dev.sh <target> <operation> [options]
#
# Targets:
#   master         Runs against orderium_master (tenants table, lifecycle schema)
#   tenant         Runs against all active tenant databases
#   tenant <slug>  Runs against a single tenant database (e.g. tenant acme)
#
# Operations:
#   run            Apply all pending migrations
#   revert         Revert the last applied migration
#   generate <name>  Generate a new migration file from entity diff (tenant only)
#   show           Show pending migrations without applying them
#
# Examples:
#   ./scripts/migrate-dev.sh master run
#   ./scripts/migrate-dev.sh master revert
#   ./scripts/migrate-dev.sh tenant run
#   ./scripts/migrate-dev.sh tenant run acme
#   ./scripts/migrate-dev.sh tenant revert acme
#   ./scripts/migrate-dev.sh tenant generate AddCouponCodeToOrders
#   ./scripts/migrate-dev.sh tenant show
# ==============================================================================

set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[migrate-dev]${RESET} $*"; }
success() { echo -e "${GREEN}[migrate-dev] ✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}[migrate-dev] ⚠${RESET} $*"; }
die()     { echo -e "${RED}[migrate-dev] ✗ ERROR:${RESET} $*" >&2; exit 1; }

# ── Validate container is running ──────────────────────────────────────────────
CONTAINER="orderium-api-dev"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  die "Container '${CONTAINER}' is not running.\n  Start it with: docker compose -f docker-compose.dev.yml up -d"
fi

# ── Parse arguments ────────────────────────────────────────────────────────────
TARGET="${1:-}"
OPERATION="${2:-}"

[[ -z "$TARGET" ]]    && die "Missing <target>. Use: master | tenant"
[[ -z "$OPERATION" ]] && die "Missing <operation>. Use: run | revert | generate <name> | show"

# ── Dispatch ───────────────────────────────────────────────────────────────────
case "$TARGET" in

  # ── MASTER ─────────────────────────────────────────────────────────────────
  master)
    case "$OPERATION" in
      run)
        info "Running master migrations in ${BOLD}${CONTAINER}${RESET} …"
        docker exec -it "$CONTAINER" pnpm run migration:run:master
        success "Master migrations applied."
        ;;
      revert)
        warn "This will revert the last migration on the MASTER database (tenants table)."
        read -rp "Type 'yes' to confirm: " CONFIRM
        [[ "$CONFIRM" != "yes" ]] && { echo "Aborted."; exit 0; }
        docker exec -it "$CONTAINER" pnpm run migration:revert:master
        success "Master migration reverted."
        ;;
      show)
        info "Showing pending master migrations …"
        docker exec -it "$CONTAINER" \
          sh -c 'pnpm run typeorm -- migration:show -d src/database/master-data-source.ts'
        ;;
      generate)
        die "'generate' is not supported for master migrations. Edit migration files manually."
        ;;
      *)
        die "Unknown operation '${OPERATION}' for master. Use: run | revert | show"
        ;;
    esac
    ;;

  # ── TENANT ─────────────────────────────────────────────────────────────────
  tenant)
    SLUG="${3:-}"   # optional: specific tenant slug

    case "$OPERATION" in
      run)
        if [[ -n "$SLUG" ]]; then
          info "Running migrations for tenant '${BOLD}${SLUG}${RESET}' …"
          docker exec -it "$CONTAINER" \
            sh -c "pnpm run typeorm -- migration:run -d src/database/data-source.ts" 2>/dev/null || true
          # Use the dedicated all-tenants script with --tenant flag
          docker exec -it "$CONTAINER" \
            npx ts-node -r tsconfig-paths/register \
            src/scripts/migrate-all-tenants.ts "--tenant=${SLUG}"
          success "Migrations applied for tenant '${SLUG}'."
        else
          info "Running migrations for ALL active tenants …"
          docker exec -it "$CONTAINER" \
            npx ts-node -r tsconfig-paths/register \
            src/scripts/migrate-all-tenants.ts
          success "All-tenant migrations complete."
        fi
        ;;
      revert)
        if [[ -z "$SLUG" ]]; then
          die "Revert requires a specific tenant slug. Usage:\n  $0 tenant revert <slug>"
        fi
        warn "This will revert the last migration for tenant '${SLUG}'."
        read -rp "Type '${SLUG}' to confirm: " CONFIRM
        [[ "$CONFIRM" != "$SLUG" ]] && { echo "Aborted."; exit 0; }
        # Build a one-off revert using the tenant's DB_NAME override
        docker exec -it "$CONTAINER" \
          sh -c "DB_NAME=orderium_${SLUG} pnpm run migration:revert"
        success "Last migration reverted for tenant '${SLUG}'."
        ;;
      generate)
        NAME="${3:-}"
        [[ -z "$NAME" ]] && die "Provide a migration name. Usage:\n  $0 tenant generate <MigrationName>"
        TIMESTAMP=$(date +%s%3N)
        OUTPUT_PATH="src/database/migrations/${TIMESTAMP}-${NAME}"
        info "Generating migration '${NAME}' (${TIMESTAMP}) …"
        docker exec -it "$CONTAINER" \
          sh -c "pnpm run typeorm -- migration:generate ${OUTPUT_PATH} -d src/database/data-source.ts"
        success "Migration file created: ${OUTPUT_PATH}.ts"
        ;;
      show)
        if [[ -n "$SLUG" ]]; then
          info "Showing pending migrations for tenant '${SLUG}' …"
          docker exec -it "$CONTAINER" \
            sh -c "DB_NAME=orderium_${SLUG} pnpm run typeorm -- migration:show -d src/database/data-source.ts"
        else
          info "Showing pending migrations for ALL tenants …"
          docker exec -it "$CONTAINER" \
            sh -c "pnpm run typeorm -- migration:show -d src/database/data-source.ts"
        fi
        ;;
      *)
        die "Unknown operation '${OPERATION}' for tenant. Use: run | revert | generate | show"
        ;;
    esac
    ;;

  *)
    die "Unknown target '${TARGET}'. Use: master | tenant"
    ;;
esac
