import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('/tmp/portal.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    -- Administrator table
    CREATE TABLE IF NOT EXISTS admin (
      id_admin INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );

    -- Organizations table
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      org_type TEXT NOT NULL, -- 'school' or 'community partner'
      description TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT,
      state TEXT DEFAULT 'OH',
      postal_code TEXT,
      country TEXT DEFAULT 'USA',
      phone TEXT,
      website TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    -- Item types table
    CREATE TABLE IF NOT EXISTS item_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    );

    -- Offers table
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type_id INTEGER NOT NULL,
      resource_type TEXT,
      resource_item TEXT,
      quantity_offered INTEGER NOT NULL CHECK (quantity_offered > 0),
      quantity_committed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open', -- 'open', 'partially_committed', 'fully_committed', 'cancelled'
      available_from_date DATE,
      available_to_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_type_id) REFERENCES item_types(id),
      CHECK (quantity_committed <= quantity_offered)
    );

    -- Requests table
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type_id INTEGER NOT NULL,
      resource_type TEXT,
      resource_item TEXT,
      quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
      quantity_fulfilled INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open', -- 'open', 'partially_committed', 'fully_committed', 'cancelled'
      needed_by_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_type_id) REFERENCES item_types(id),
      CHECK (quantity_fulfilled <= quantity_requested)
    );

    -- Matches table
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      offer_id INTEGER NOT NULL,
      item_type_id INTEGER NOT NULL,
      quantity_matched INTEGER NOT NULL CHECK (quantity_matched > 0),
      status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES requests(id),
      FOREIGN KEY (offer_id) REFERENCES offers(id),
      FOREIGN KEY (item_type_id) REFERENCES item_types(id)
    );

    -- Mailbox table
    CREATE TABLE IF NOT EXISTS mailbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_fromuser INTEGER NOT NULL,
      fromuser TEXT NOT NULL,
      id_touser INTEGER NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_fromuser) REFERENCES users(id),
      FOREIGN KEY (id_touser) REFERENCES users(id)
    );

    -- Reply Mailbox table
    CREATE TABLE IF NOT EXISTS reply_mailbox (
      id_reply INTEGER PRIMARY KEY AUTOINCREMENT,
      id_mailbox INTEGER NOT NULL,
      id_user INTEGER NOT NULL,
      usertype TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_mailbox) REFERENCES mailbox(id),
      FOREIGN KEY (id_user) REFERENCES users(id)
    );
  `);

  // Seed item types if empty
  const itemTypes = db.prepare('SELECT count(*) as count FROM item_types').get() as { count: number };
  if (itemTypes.count === 0) {
    const insert = db.prepare('INSERT INTO item_types (name) VALUES (?)');
    ['Backpack', 'Notebooks', 'Calculators', 'Pencils', 'Hygiene Kits', 'Winter Coats'].forEach(name => {
      insert.run(name);
    });
  }

  // Add new columns to existing tables if they don't exist
  try {
    db.exec(`ALTER TABLE offers ADD COLUMN resource_type TEXT;`);
    db.exec(`ALTER TABLE offers ADD COLUMN resource_item TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE requests ADD COLUMN resource_type TEXT;`);
    db.exec(`ALTER TABLE requests ADD COLUMN resource_item TEXT;`);
  } catch (e) {}
}

export default db;
