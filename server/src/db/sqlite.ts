import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const dbPath = path.join(__dirname, '../../data/customers.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
export const db = new Database(dbPath, { 
  verbose: (msg) => logger.debug(msg) 
});

// Create customers table
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    latitude REAL,
    longitude REAL,
    googleMapsUrl TEXT,
    wazeUrl TEXT,
    totalOrders INTEGER DEFAULT 0,
    lastOrderAt TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )
`);

// Create index for fast phone lookup
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_customers_phone 
  ON customers(phone)
`);

logger.info('✅ SQLite database initialized');

export default db;
