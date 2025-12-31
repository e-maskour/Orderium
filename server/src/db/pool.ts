import sql from "mssql";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const config: sql.config = {
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  server: env.db.host,
  options: {
    encrypt: false,              // true for Azure
    trustServerCertificate: true // local / self-signed
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;

  try {
    pool = await new sql.ConnectionPool(config).connect();
    logger.info("✅ SQL Server connected");
    return pool;
  } catch (err) {
    logger.error(err, "❌ SQL Server connection failed");
    throw err;
  }
}
