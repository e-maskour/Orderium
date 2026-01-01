import db from '../../db/sqlite';
import { Customer, CreateCustomerDTO, UpdateCustomerDTO } from './customer.model';

export class CustomerRepository {
  // Search customer by phone
  findByPhone(phone: string): Customer | undefined {
    const stmt = db.prepare('SELECT * FROM customers WHERE phone = ?');
    return stmt.get(phone) as Customer | undefined;
  }

  // Search customers by partial phone (for autocomplete)
  searchByPhone(phonePrefix: string, limit = 10): Customer[] {
    const stmt = db.prepare(`
      SELECT * FROM customers 
      WHERE phone LIKE ? 
      ORDER BY lastOrderAt DESC, createdAt DESC 
      LIMIT ?
    `);
    return stmt.all(`${phonePrefix}%`, limit) as Customer[];
  }

  // Get all customers (with pagination)
  findAll(limit = 50, offset = 0): Customer[] {
    const stmt = db.prepare(`
      SELECT * FROM customers 
      ORDER BY lastOrderAt DESC, createdAt DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as Customer[];
  }

  // Get customer by ID
  findById(id: number): Customer | undefined {
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
    return stmt.get(id) as Customer | undefined;
  }

  // Create new customer
  create(data: CreateCustomerDTO): Customer {
    const stmt = db.prepare(`
      INSERT INTO customers (phone, name, address, latitude, longitude, googleMapsUrl, wazeUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.phone,
      data.name,
      data.address || null,
      data.latitude || null,
      data.longitude || null,
      data.googleMapsUrl || null,
      data.wazeUrl || null
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  // Update customer
  update(phone: string, data: UpdateCustomerDTO): Customer | undefined {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.address !== undefined) {
      updates.push('address = ?');
      values.push(data.address);
    }
    if (data.latitude !== undefined) {
      updates.push('latitude = ?');
      values.push(data.latitude);
    }
    if (data.longitude !== undefined) {
      updates.push('longitude = ?');
      values.push(data.longitude);
    }
    if (data.googleMapsUrl !== undefined) {
      updates.push('googleMapsUrl = ?');
      values.push(data.googleMapsUrl);
    }
    if (data.wazeUrl !== undefined) {
      updates.push('wazeUrl = ?');
      values.push(data.wazeUrl);
    }

    if (updates.length === 0) {
      return this.findByPhone(phone);
    }

    updates.push("updatedAt = datetime('now')");
    values.push(phone);

    const stmt = db.prepare(`
      UPDATE customers 
      SET ${updates.join(', ')} 
      WHERE phone = ?
    `);
    
    stmt.run(...values);
    return this.findByPhone(phone);
  }

  // Upsert (create or update)
  upsert(data: CreateCustomerDTO): Customer {
    const existing = this.findByPhone(data.phone);
    
    if (existing) {
      return this.update(data.phone, data)!;
    } else {
      return this.create(data);
    }
  }

  // Increment order count
  incrementOrderCount(phone: string): void {
    const stmt = db.prepare(`
      UPDATE customers 
      SET totalOrders = totalOrders + 1, 
          lastOrderAt = datetime('now'),
          updatedAt = datetime('now')
      WHERE phone = ?
    `);
    stmt.run(phone);
  }

  // Delete customer
  delete(phone: string): boolean {
    const stmt = db.prepare('DELETE FROM customers WHERE phone = ?');
    const result = stmt.run(phone);
    return result.changes > 0;
  }

  // Get total count
  count(): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM customers');
    const result = stmt.get() as { count: number };
    return result.count;
  }
}

export const customerRepo = new CustomerRepository();
