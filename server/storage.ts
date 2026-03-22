import {
  type Contact,
  type InsertContact,
  type Event,
  type InsertEvent,
  type Report,
  type InsertReport,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Contacts
  getContacts(): Contact[];
  getContact(id: string): Contact | undefined;
  createContact(contact: InsertContact): Contact;
  updateContact(id: string, contact: InsertContact): Contact | undefined;
  deleteContact(id: string): boolean;

  // Events
  getEvents(): Event[];
  getEvent(id: string): Event | undefined;
  createEvent(event: InsertEvent): Event;
  deleteEvent(id: string): boolean;

  // Reports
  getReportsByEvent(eventId: string): Report[];
  getReport(id: string): Report | undefined;
  getReportByEventAndContact(eventId: string, contactId: string): Report | undefined;
  getReportByEventAndPhone(eventId: string, phone: string): Report | undefined;
  createReport(report: InsertReport): Report;
}

export class InMemoryStorage implements IStorage {
  private contacts: Map<string, Contact> = new Map();
  private events: Map<string, Event> = new Map();
  private reports: Map<string, Report> = new Map();

  // Contacts
  getContacts(): Contact[] {
    return Array.from(this.contacts.values());
  }

  getContact(id: string): Contact | undefined {
    return this.contacts.get(id);
  }

  createContact(contact: InsertContact): Contact {
    const id = randomUUID();
    const newContact: Contact = { id, ...contact };
    this.contacts.set(id, newContact);
    return newContact;
  }

  updateContact(id: string, contact: InsertContact): Contact | undefined {
    const existing = this.contacts.get(id);
    if (!existing) return undefined;
    const updated: Contact = { id, ...contact };
    this.contacts.set(id, updated);
    return updated;
  }

  deleteContact(id: string): boolean {
    return this.contacts.delete(id);
  }

  // Events
  getEvents(): Event[] {
    return Array.from(this.events.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getEvent(id: string): Event | undefined {
    return this.events.get(id);
  }

  createEvent(event: InsertEvent): Event {
    const id = randomUUID();
    const newEvent: Event = {
      id,
      name: event.name,
      createdAt: new Date().toISOString(),
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  deleteEvent(id: string): boolean {
    // Also delete associated reports
    for (const [reportId, report] of this.reports) {
      if (report.eventId === id) {
        this.reports.delete(reportId);
      }
    }
    return this.events.delete(id);
  }

  // Reports
  getReportsByEvent(eventId: string): Report[] {
    return Array.from(this.reports.values())
      .filter((r) => r.eventId === eventId)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }

  getReport(id: string): Report | undefined {
    return this.reports.get(id);
  }

  getReportByEventAndContact(eventId: string, contactId: string): Report | undefined {
    return Array.from(this.reports.values()).find(
      (r) => r.eventId === eventId && r.contactId === contactId
    );
  }

  getReportByEventAndPhone(eventId: string, phone: string): Report | undefined {
    return Array.from(this.reports.values()).find(
      (r) => r.eventId === eventId && r.phone === phone
    );
  }

  createReport(report: InsertReport): Report {
    // Check if already reported (by contactId or phone)
    let existing: Report | undefined;
    if (report.contactId) {
      existing = this.getReportByEventAndContact(report.eventId, report.contactId);
    }
    if (!existing && report.phone) {
      existing = this.getReportByEventAndPhone(report.eventId, report.phone);
    }

    if (existing) {
      // Update existing report
      const updated: Report = {
        ...existing,
        name: report.name,
        phone: report.phone,
        status: report.status,
        reportedAt: new Date().toISOString(),
      };
      this.reports.set(existing.id, updated);
      return updated;
    }

    const id = randomUUID();
    const newReport: Report = {
      id,
      ...report,
      reportedAt: new Date().toISOString(),
    };
    this.reports.set(id, newReport);
    return newReport;
  }
}

export const storage = new InMemoryStorage();
