import { Event, InsertEvent, Contact, InsertContact, Report, InsertReport } from "@shared/schema";

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
  getReports(eventId: number): Promise<Report[]>;
  getReport(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  getReportByEventAndContact(eventId: number, contactId: number): Promise<Report | undefined>;
}

class MemStorage implements IStorage {
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

  async createEvent(event: InsertEvent): Promise<Event> {
    const newEvent: Event = { ...event, id: this.eventCounter++ };
    this.events.set(newEvent.id, newEvent);
    return newEvent;
  }

  async updateEvent(id: number, data: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    const updated = { ...event, ...data };
    this.events.set(id, updated);
    return updated;
  }

  async deleteEvent(id: number): Promise<void> {
    this.events.delete(id);
  }

  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values()).sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const newContact: Contact = { ...contact, id: this.contactCounter++ };
    this.contacts.set(newContact.id, newContact);
    return newContact;
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    const updated = { ...contact, ...data };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: number): Promise<void> {
    this.contacts.delete(id);
  }

  async bulkCreateContacts(contacts: InsertContact[]): Promise<Contact[]> {
    const created: Contact[] = [];
    for (const contact of contacts) {
      const newContact = await this.createContact(contact);
      created.push(newContact);
    }
    return created;
  }

  async getReports(eventId: number): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter(r => r.eventId === eventId)
      .sort((a, b) => b.id - a.id);
  }

  async getReport(id: number): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async createReport(report: InsertReport): Promise<Report> {
    const newReport: Report = { ...report, id: this.reportCounter++ };
    this.reports.set(newReport.id, newReport);
    return newReport;
  }

  async getReportByEventAndContact(eventId: number, contactId: number): Promise<Report | undefined> {
    return Array.from(this.reports.values()).find(
      r => r.eventId === eventId && r.contactId === contactId
    );
  }
}

export const storage = new MemStorage();
