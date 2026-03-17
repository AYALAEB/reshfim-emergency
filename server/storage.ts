import { Event, Contact, Report, InsertEvent, InsertContact, InsertReport } from "@shared/schema";
import { events, contacts, reports } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, asc, desc } from "drizzle-orm";
import pg from "pg";

export interface IStorage {
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, data: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<void>;
  bulkCreateContacts(contacts: InsertContact[]): Promise<Contact[]>;
  getReportsByEvent(eventId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  getReportByEventAndContact(eventId: number, contactId: number): Promise<Report | undefined>;
}

// PostgreSQL storage (used when DATABASE_URL is set)
class PgStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor(databaseUrl: string) {
    const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    this.db = drizzle(pool);
    this.initDb();
  }

  private async initDb() {
    try {
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true
        );
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL,
          contact_id INTEGER,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          status TEXT NOT NULL,
          details TEXT,
          reported_at TEXT NOT NULL
        );
      `);
    } catch (e) {
      console.error("DB init error:", e);
    }
  }

  async getEvents(): Promise<Event[]> {
    return await this.db.select().from(events).orderBy(desc(events.id));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const rows = await this.db.select().from(events).where(eq(events.id, id));
    return rows[0];
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    const rows = await this.db.insert(events).values(data).returning();
    return rows[0];
  }

  async updateEvent(id: number, data: Partial<Event>): Promise<Event | undefined> {
    const rows = await this.db.update(events).set(data).where(eq(events.id, id)).returning();
    return rows[0];
  }

  async deleteEvent(id: number): Promise<void> {
    await this.db.delete(events).where(eq(events.id, id));
  }

  async getContacts(): Promise<Contact[]> {
    return await this.db.select().from(contacts).orderBy(asc(contacts.name));
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const rows = await this.db.select().from(contacts).where(eq(contacts.id, id));
    return rows[0];
  }

  async createContact(data: InsertContact): Promise<Contact> {
    const rows = await this.db.insert(contacts).values(data).returning();
    return rows[0];
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact | undefined> {
    const rows = await this.db.update(contacts).set(data).where(eq(contacts.id, id)).returning();
    return rows[0];
  }

  async deleteContact(id: number): Promise<void> {
    await this.db.delete(contacts).where(eq(contacts.id, id));
  }

  async bulkCreateContacts(contactsData: InsertContact[]): Promise<Contact[]> {
    if (contactsData.length === 0) return [];
    const rows = await this.db.insert(contacts).values(contactsData).returning();
    return rows;
  }

  async getReportsByEvent(eventId: number): Promise<Report[]> {
    return await this.db.select().from(reports).where(eq(reports.eventId, eventId));
  }

  async createReport(data: InsertReport): Promise<Report> {
    const rows = await this.db.insert(reports).values(data).returning();
    return rows[0];
  }

  async getReportByEventAndContact(eventId: number, contactId: number): Promise<Report | undefined> {
    const rows = await this.db.select().from(reports).where(
      and(eq(reports.eventId, eventId), eq(reports.contactId, contactId))
    );
    return rows[0];
  }
}

// In-memory fallback (when no DATABASE_URL)
export class MemStorage implements IStorage {
  private events: Map<number, Event> = new Map();
  private contacts: Map<number, Contact> = new Map();
  private reports: Map<number, Report> = new Map();
  private eventCounter = 1;
  private contactCounter = 1;
  private reportCounter = 1;

  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values()).sort((a, b) => b.id - a.id);
  }
  async getEvent(id: number): Promise<Event | undefined> { return this.events.get(id); }
  async createEvent(data: InsertEvent): Promise<Event> {
    const event: Event = { ...data, id: this.eventCounter++ };
    this.events.set(event.id, event);
    return event;
  }
  async updateEvent(id: number, data: Partial<Event>): Promise<Event | undefined> {
    const existing = this.events.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.events.set(id, updated);
    return updated;
  }
  async deleteEvent(id: number): Promise<void> { this.events.delete(id); }
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values()).sort((a, b) => a.name.localeCompare(b.name, "he"));
  }
  async getContact(id: number): Promise<Contact | undefined> { return this.contacts.get(id); }
  async createContact(data: InsertContact): Promise<Contact> {
    const contact: Contact = { ...data, id: this.contactCounter++ };
    this.contacts.set(contact.id, contact);
    return contact;
  }
  async updateContact(id: number, data: Partial<Contact>): Promise<Contact | undefined> {
    const existing = this.contacts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.contacts.set(id, updated);
    return updated;
  }
  async deleteContact(id: number): Promise<void> { this.contacts.delete(id); }
  async bulkCreateContacts(contactsData: InsertContact[]): Promise<Contact[]> {
    const created: Contact[] = [];
    for (const data of contactsData) {
      const contact = await this.createContact(data);
      created.push(contact);
    }
    return created;
  }
  async getReportsByEvent(eventId: number): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(r => r.eventId === eventId);
  }
  async createReport(data: InsertReport): Promise<Report> {
    const report: Report = { ...data, id: this.reportCounter++ };
    this.reports.set(report.id, report);
    return report;
  }
  async getReportByEventAndContact(eventId: number, contactId: number): Promise<Report | undefined> {
    return Array.from(this.reports.values()).find(
      r => r.eventId === eventId && r.contactId === contactId
    );
  }
}

// Auto-select: use PostgreSQL if DATABASE_URL exists, otherwise memory
export const storage: IStorage = process.env.DATABASE_URL
  ? new PgStorage(process.env.DATABASE_URL)
  : new MemStorage();
