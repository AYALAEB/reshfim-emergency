import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, ArrowRight, MessageCircle, CheckCircle2,
  XCircle, HelpCircle, Clock, Phone, RefreshCw, Send, Download, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import type { Event, Contact, Report } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  in_kibbutz: "בקיבוץ - בסדר",
  out_kibbutz: "מחוץ לקיבוץ - בסדר",
  need_help: "זקוק/ה לעזרה",
};

const STATUS_CLASS: Record<string, string> = {
  in_kibbutz: "status-in",
  out_kibbutz: "status-out",
  need_help: "status-help",
};

function buildWhatsAppMessage(eventName: string, reportUrl: string, contactName: string) {
  return encodeURIComponent(
    `שלום ${contactName},\n\nקיבוץ רשפים — ${eventName}\n\nנא לדווח על מצבך:\n${reportUrl}\n\nתודה 🙏`
  );
}

function buildWhatsAppBulkMessage(eventName: string, baseUrl: string, eventId: number) {
  const url = `${baseUrl}/#/report/${eventId}`;
  return encodeURIComponent(
    `שלום,\n\nקיבוץ רשפים — ${eventName}\n\nנא לדווח על מצבך:\n${url}\n\nתודה 🙏`
  );
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const eventId = Number(id);
  const baseUrl = window.location.origin;

  const { data: event, isLoading: loadingEvent } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}`).then(r => r.json()),
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: reports = [], isLoading: loadingReports, refetch: refetchReports } = useQuery<Report[]>({
    queryKey: ["/api/events", eventId, "reports"],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}/reports`).then(r => r.json()),
    refetchInterval: 15000, // refresh every 15s
  });

  if (loadingEvent) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">אירוע לא נמצא</p>
        <Link href="/"><Button variant="link" className="mt-2">חזרה לדף הבית</Button></Link>
      </div>
    );
  }

  // Match reports to contacts — by contactId OR by phone number
  function findReport(contact: Contact) {
    return reports.find(r =>
      (r.contactId != null && r.contactId === contact.id) ||
      (r.phone && contact.phone && r.phone.replace(/\D/g, "") === contact.phone.replace(/\D/g, ""))
    );
  }

  const reportedIds = new Set(reports.map(r => r.contactId).filter(Boolean));

  // Build stats — based on matched contacts
  const total = contacts.length;
  const matchedReports = contacts.map(c => findReport(c)).filter(Boolean);
  const reported = matchedReports.length;
  const inKibbutz = matchedReports.filter(r => r!.status === "in_kibbutz").length;
  const outKibbutz = matchedReports.filter(r => r!.status === "out_kibbutz").length;
  const needHelp = matchedReports.filter(r => r!.status === "need_help").length;
  const pending = Math.max(0, total - reported);
  const pct = total > 0 ? Math.round((reported / total) * 100) : 0;

  const helpReports = reports.filter(r => r.status === "need_help");

  // Export personal links to Excel
  function exportLinks() {
    const rows = contacts.map(c => ({
      שם: c.name,
      טלפון: c.phone,
      "קישור אישי לדיווח": `${baseUrl}/#/report/${eventId}/${c.id}`,
      "הודעת ווטסאפ": `שלום ${c.name},\n\nקיבוץ רשפים — ${event?.name}\n\nנא לדווח על מצבך:\n${baseUrl}/#/report/${eventId}/${c.id}\n\nתודה 🙏`,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 55 }, { wch: 80 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "קישורים");
    XLSX.writeFile(wb, `קישורי-דיווח-${event?.name || eventId}.xlsx`);
  }

  // Export all reports to Excel
  function exportReports() {
    const reportMap = new Map(reports.map(r => [r.contactId, r]));
    const rows = contacts.map(c => {
      const r = reportMap.get(c.id);
      return {
        שם: c.name,
        טלפון: c.phone,
        סטטוס: r ? STATUS_LABELS[r.status] : "לא דיווח",
        "זמן דיווח": r?.reportedAt ? new Date(r.reportedAt).toLocaleString("he-IL") : "",
        הערות: r?.details || "",
      };
    });
    // Also add manual reports (no contactId)
    const manualReports = reports.filter(r => !r.contactId);
    manualReports.forEach(r => {
      rows.push({
        שם: r.name || "לא ידוע",
        טלפון: r.phone || "",
        סטטוס: STATUS_LABELS[r.status] || r.status,
        "זמן דיווח": r.reportedAt ? new Date(r.reportedAt).toLocaleString("he-IL") : "",
        הערות: r.details || "",
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "דיווחים");
    XLSX.writeFile(wb, `דיווחים-${event?.name || eventId}.xlsx`);
  }

  return (
    <div className="space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowRight size={18} />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate">{event.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {event.isActive
              ? <Badge className="status-in text-xs">פעיל</Badge>
              : <Badge variant="secondary" className="text-xs">הסתיים</Badge>
            }
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground"
              onClick={() => refetchReports()}
              title="רענן נתונים"
              data-testid="button-refresh"
            >
              <RefreshCw size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* SOS — needs help */}
      {helpReports.length > 0 && (
        <Card className="border-2 border-destructive bg-destructive/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-bold">
              <AlertTriangle size={18} />
              <span>{helpReports.length} זקוקים לעזרה!</span>
            </div>
            {helpReports.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-card rounded-lg p-3">
                <div>
                  <p className="font-semibold text-sm">{r.name}</p>
                  {r.details && <p className="text-xs text-muted-foreground">{r.details}</p>}
                </div>
                {r.phone && (
                  <a href={`tel:${r.phone}`} data-testid={`button-call-help-${r.id}`}>
                    <Button size="sm" className="status-help gap-1">
                      <Phone size={13} />
                      התקשר
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">דיווחו {reported} מתוך {total}</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <StatChip color="status-in" label="בקיבוץ" value={inKibbutz} />
            <StatChip color="status-out" label="מחוץ לקיבוץ" value={outKibbutz} />
            <StatChip color="status-help" label="זקוק לעזרה" value={needHelp} />
            <StatChip color="status-pending" label="לא דיווחו" value={pending} />
          </div>
        </CardContent>
      </Card>

      {/* Export buttons */}
      {contacts.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Download size={15} className="text-primary" />
              ייצוא לאקסל
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="w-full gap-2 text-sm"
                onClick={exportLinks}
                data-testid="button-export-links"
              >
                <FileSpreadsheet size={15} className="text-green-600" />
                ייצא קישורים אישיים
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 text-sm"
                onClick={exportReports}
                data-testid="button-export-reports"
              >
                <FileSpreadsheet size={15} className="text-blue-600" />
                ייצא דיווחים מלאים
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send to all */}
      {contacts.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Send size={15} className="text-primary" />
              שלח הודעות בוואטסאפ
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* Bulk link — to group */}
              <a
                href={`https://api.whatsapp.com/send?text=${buildWhatsAppBulkMessage(event.name, baseUrl, eventId)}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-send-bulk-whatsapp"
              >
                <Button variant="outline" className="w-full gap-2 text-sm">
                  <MessageCircle size={15} className="text-green-600" />
                  שלח קישור כללי לקבוצה
                </Button>
              </a>
              {/* Copy general link */}
              <Button
                variant="outline"
                className="w-full gap-2 text-sm"
                data-testid="button-copy-link"
                onClick={() => {
                  const url = `${baseUrl}/#/report/${eventId}`;
                  navigator.clipboard.writeText(url);
                  toast({ title: "הקישור הועתק!", description: url });
                }}
              >
                העתק קישור כללי
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts list */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base">רשימת אנשי קשר</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingContacts || loadingReports ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">אין אנשי קשר</p>
              <Link href="/contacts">
                <Button variant="link" size="sm">הוסף אנשי קשר</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {contacts.map(contact => {
                const report = findReport(contact);
                const reportUrl = `${baseUrl}/#/report/${eventId}/${contact.id}`;
                const waMsg = buildWhatsAppMessage(event.name, reportUrl, contact.name);
                // Normalize phone to international format
                const rawPhone = contact.phone.replace(/\D/g, "");
                const waPhone = rawPhone.startsWith("972") ? rawPhone
                  : rawPhone.startsWith("0") ? "972" + rawPhone.slice(1)
                  : rawPhone;

                return (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 px-4 py-3"
                    data-testid={`row-contact-${contact.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.phone}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {report ? (
                        <Badge className={`${STATUS_CLASS[report.status]} text-xs whitespace-nowrap`}>
                          {STATUS_LABELS[report.status]}
                        </Badge>
                      ) : (
                        <Badge className="status-pending text-xs">לא דיווח</Badge>
                      )}
                      {/* Personal WhatsApp link */}
                      <a
                        href={`https://wa.me/${waPhone}?text=${waMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`button-wa-${contact.id}`}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                          <MessageCircle size={16} />
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
