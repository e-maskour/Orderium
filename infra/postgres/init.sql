-- PostgreSQL initialisation script
-- Runs once on first container start (before any data exists).
-- Creates the master tenant-registry database alongside the default app DB.

SELECT 'CREATE DATABASE orderium_master'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'orderium_master'
)\gexec

-- Legacy default DB (used by business modules not yet converted to per-tenant).
-- Kept alongside orderium_master so both connections succeed on first boot.
SELECT 'CREATE DATABASE orderium_db'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'orderium_db'
)\gexec
