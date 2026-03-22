import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";
import { contacts, events, reports } from "@shared/schema";
import type { Contact, InsertContact, Event, InsertEvent, Report, InsertReport } from "@shared/schema";

const sqlite = new Database("reshafim.db");
const db = drizzle(sqlite);

// Create tables if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL
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

export interface IStorage {
  // Contacts
  getContacts(): Contact[];
  addContact(c: InsertContact): Contact;
  deleteContact(id: string): void;
  getContact(id: string): Contact | undefined;

  // Events
  getEvents(): Event[];
  createEvent(e: InsertEvent): Event;
  getEvent(id: string): Event | undefined;

  // Reports
  getReports(eventId: string): Report[];
  getReport(eventId: string, contactId: string): Report | undefined;
  submitReport(r: InsertReport): Report;
}

export const storage: IStorage = {
  getContacts() {
    return db.select().from(contacts).all();
  },
  addContact(c: InsertContact) {
    return db.insert(contacts).values(c).returning().get();
  },
  deleteContact(id: string) {
    db.delete(contacts).where(eq(contacts.id, id)).run();
  },
  getContact(id: string) {
    return db.select().from(contacts).where(eq(contacts.id, id)).get();
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
