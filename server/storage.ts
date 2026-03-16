import { Event, Contact, Report, InsertEvent, InsertContact, InsertReport } from "@shared/schema";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;

  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, data: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<void>;
  bulkCreateContacts(contacts: InsertContact[]): Promise<Contact[]>;

  // Reports
  getReportsByEvent(eventId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  getReportByEventAndContact(eventId: number, contactId: number): Promise<Report | undefined>;
}

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

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

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

  async deleteEvent(id: number): Promise<void> {
    this.events.delete(id);
  }

  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values()).sort((a, b) => a.name.localeCompare(b.name, "he"));
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

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

  async deleteContact(id: number): Promise<void> {
    this.contacts.delete(id);
  }

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

export const storage = new MemStorage();
