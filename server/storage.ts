import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";
import { contacts, events, reports } from "@shared/schema";
import type { Contact, InsertContact, Event, InsertEvent, Report, InsertReport } from "@shared/schema";
import { normalizePhone } from "@shared/phoneUtils";

const sqlite = new Database("reshafim.db");
const db = drizzle(sqlite);

// Create tables if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_normalized TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT DEFAULT '',
    reported_at TEXT NOT NULL
  );
`);

// Add phone_normalized column if it doesn't exist (migration for existing DBs)
try {
  sqlite.exec(`ALTER TABLE contacts ADD COLUMN phone_normalized TEXT NOT NULL DEFAULT '';`);
  // Backfill existing rows
  const rows = sqlite.prepare("SELECT id, phone FROM contacts").all() as { id: string; phone: string }[];
  const upd = sqlite.prepare("UPDATE contacts SET phone_normalized = ? WHERE id = ?");
  for (const r of rows) upd.run(normalizePhone(r.phone), r.id);
} catch {
  // Column already exists — ignore
}

export interface IStorage {
  getContacts(): Contact[];
  addContact(c: InsertContact): Contact;
  deleteContact(id: string): void;
  getContact(id: string): Contact | undefined;
  findContactByPhone(phone: string): Contact | undefined;

  getEvents(): Event[];
  createEvent(e: InsertEvent): Event;
  getEvent(id: string): Event | undefined;

  getReports(eventId: string): Report[];
  getReport(eventId: string, contactId: string): Report | undefined;
  submitReport(r: InsertReport): Report;
}

export const storage: IStorage = {
  getContacts() {
    return db.select().from(contacts).all();
  },
  addContact(c: InsertContact) {
    const withNorm = { ...c, phoneNormalized: normalizePhone(c.phone) };
    return db.insert(contacts).values(withNorm).returning().get();
  },
  deleteContact(id: string) {
    db.delete(contacts).where(eq(contacts.id, id)).run();
  },
  getContact(id: string) {
    return db.select().from(contacts).where(eq(contacts.id, id)).get();
  },
  findContactByPhone(phone: string) {
    const norm = normalizePhone(phone);
    return db.select().from(contacts).where(eq(contacts.phoneNormalized, norm)).get();
  },

  getEvents() {
    return db.select().from(events).all();
  },
  createEvent(e: InsertEvent) {
    return db.insert(events).values(e).returning().get();
  },
  getEvent(id: string) {
    return db.select().from(events).where(eq(events.id, id)).get();
  },

  getReports(eventId: string) {
    return db.select().from(reports).where(eq(reports.eventId, eventId)).all();
  },
  getReport(eventId: string, contactId: string) {
    return db.select().from(reports)
      .where(and(eq(reports.eventId, eventId), eq(reports.contactId, contactId)))
      .get();
  },
  submitReport(r: InsertReport) {
    return db.insert(reports).values(r).returning().get();
  },
};
