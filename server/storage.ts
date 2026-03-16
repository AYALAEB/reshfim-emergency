import type { Contact, InsertContact, Event, InsertEvent, Report, InsertReport } from "@shared/schema";

export interface IStorage {
  getContacts(): Contact[];
  getContact(id: number): Contact | undefined;
  addContact(contact: InsertContact): Contact;
  updateContact(id: number, contact: Partial<InsertContact>): Contact | undefined;
  deleteContact(id: number): boolean;
  clearContacts(): void;

  getEvents(): Event[];
  getEvent(id: number): Event | undefined;
  createEvent(event: InsertEvent): Event;
  deleteEvent(id: number): boolean;

  getReportsByEvent(eventId: number): Report[];
  addReport(report: InsertReport): Report;
}

class MemStorage implements IStorage {
  private _contacts: Contact[] = [];
  private _events: Event[] = [];
  private _reports: Report[] = [];
  private contactSeq = 1;
  private eventSeq = 1;
  private reportSeq = 1;

  getContacts(): Contact[] { return this._contacts; }

  getContact(id: number): Contact | undefined {
    return this._contacts.find(c => c.id === id);
  }

  addContact(data: InsertContact): Contact {
    const c: Contact = { id: this.contactSeq++, name: data.name, phone: data.phone };
    this._contacts.push(c);
    return c;
  }

  updateContact(id: number, data: Partial<InsertContact>): Contact | undefined {
    const idx = this._contacts.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this._contacts[idx] = { ...this._contacts[idx], ...data };
    return this._contacts[idx];
  }

  deleteContact(id: number): boolean {
    const idx = this._contacts.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this._contacts.splice(idx, 1);
    return true;
  }

  clearContacts(): void { this._contacts = []; }

  getEvents(): Event[] { return [...this._events].reverse(); }

  getEvent(id: number): Event | undefined {
    return this._events.find(e => e.id === id);
  }

  createEvent(data: InsertEvent): Event {
    const e: Event = { id: this.eventSeq++, name: data.name, createdAt: data.createdAt, active: data.active ?? "true" };
    this._events.push(e);
    return e;
  }

  deleteEvent(id: number): boolean {
    const idx = this._events.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this._events.splice(idx, 1);
    return true;
  }

  getReportsByEvent(eventId: number): Report[] {
    return this._reports.filter(r => r.eventId === eventId);
  }

  addReport(data: InsertReport): Report {
    const existing = this._reports.findIndex(
      r => r.eventId === data.eventId && r.contactId === data.contactId
    );
    if (existing !== -1) {
      this._reports[existing] = { ...this._reports[existing], ...data };
      return this._reports[existing];
    }
    const r: Report = {
      id: this.reportSeq++,
      eventId: data.eventId,
      contactId: data.contactId,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      status: data.status,
      details: data.details ?? null,
      reportedAt: data.reportedAt,
    };
    this._reports.push(r);
    return r;
  }
}

export const storage = new MemStorage();
