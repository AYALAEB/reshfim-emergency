import { useParams } from "wouter";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Event, type Contact, type Report } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  ArrowRight,
  Send,
  Phone,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Users,
  MessageCircle
} from "lucide-react";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);

  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}`),
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/events", eventId, "reports"],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}/reports`),
    refetchInterval: 5000,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">טוען...</p>
      </div>
    );
  }

  // Map latest report per contact
  const reportMap = new Map<number, Report>();
  for (const r of reports) {
    if (r.contactId) {
      reportMap.set(r.contactId, r);
    }
  }

  const needHelp = contacts.filter(c => reportMap.get(c.id)?.status === "need_help");
  const safeIn = contacts.filter(c => reportMap.get(c.id)?.status === "safe_in");
  const safeOut = contacts.filter(c => reportMap.get(c.id)?.status === "safe_out");
  const notReported = contacts.filter(c => !reportMap.has(c.id));

  // Build WhatsApp report link
  const getReportUrl = (contactId: number) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#/report/${eventId}/${contactId}`;
  };

  const getWhatsAppUrl = (contact: Contact) => {
    const url = getReportUrl(contact.id);
    const phone = contact.phone.replace(/\D/g, "");
    const intlPhone = phone.startsWith("0") ? "972" + phone.slice(1) : phone;
    const msg = encodeURIComponent(
      `שלום ${contact.name},\nנא לדווח על מצבך באירוע חירום:\n${url}`
    );
    return `https://wa.me/${intlPhone}?text=${msg}`;
  };

  const sendAllWhatsApp = () => {
    // Open group-style message with all links
    const base = window.location.origin + window.location.pathname;
    const lines = notReported.map(c => `• ${c.name}: ${base}#/report/${eventId}/${c.id}`).join("\n");
    const msg = encodeURIComponent(
      `⚠️ *אירוע חירום – ${event.name}*\n\nנא לדווח על מצבכם:\n\n${lines}\n\nצח״י רשפים`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 shadow-md">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 gap-1 px-2">
                <ArrowRight className="h-4 w-4" />
                חזרה
              </Button>
            </Link>
          </div>
          <h1 className="text-lg font-bold">{event.name}</h1>
          <p className="text-primary-foreground/75 text-xs">{event.createdAt}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "בקיבוץ", count: safeIn.length, cls: "status-safe-in" },
            { label: "מחוץ", count: safeOut.length, cls: "status-safe-out" },
            { label: "עזרה", count: needHelp.length, cls: "status-need-help" },
            { label: "לא דיווחו", count: notReported.length, cls: "status-no-report" },
          ].map(s => (
            <div key={s.label} className={`rounded-lg p-3 ${s.cls}`}>
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-[11px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Help needed – urgent */}
        {needHelp.length > 0 && (
          <Card className="border-2 border-destructive bg-destructive/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                זקוקים לעזרה ({needHelp.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {needHelp.map(c => {
                const r = reportMap.get(c.id)!;
                return (
                  <div key={c.id} className="flex items-start justify-between gap-2 rounded-md bg-background p-2 border border-destructive/20">
                    <div>
                      <div className="font-semibold text-sm">{c.name}</div>
                      {r.notes && <div className="text-xs text-muted-foreground mt-0.5">{r.notes}</div>}
                    </div>
                    <a href={`tel:${c.phone}`} className="shrink-0">
                      <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </Button>
                    </a>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Send to all who haven't reported */}
        {notReported.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  לא דיווחו עדיין ({notReported.length})
                </CardTitle>
                <Button
                  size="sm"
                  className="gap-1 h-8 bg-green-600 hover:bg-green-700 text-white text-xs"
                  onClick={sendAllWhatsApp}
                  data-testid="button-send-all-whatsapp"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  שלח לכולם
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ScrollArea className="max-h-52">
                <div className="space-y-1.5">
                  {notReported.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-2 py-1 border-b border-border/50 last:border-0">
                      <span className="text-sm">{c.name}</span>
                      <a href={getWhatsAppUrl(c)} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs text-green-700 border-green-300 hover:bg-green-50" data-testid={`button-whatsapp-${c.id}`}>
                          <Send className="h-3 w-3" />
                          שלח
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Reported contacts */}
        {(safeIn.length > 0 || safeOut.length > 0) && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                דיווחו ({safeIn.length + safeOut.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ScrollArea className="max-h-64">
                <div className="space-y-1.5">
                  {[...safeIn, ...safeOut].map(c => {
                    const r = reportMap.get(c.id)!;
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2 py-1 border-b border-border/50 last:border-0">
                        <span className="text-sm">{c.name}</span>
                        <Badge
                          className={`text-xs ${r.status === "safe_in" ? "status-safe-in" : "status-safe-out"}`}
                          variant="outline"
                        >
                          {r.status === "safe_in" ? "✅ בקיבוץ" : "🔵 מחוץ"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {contacts.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-muted-foreground text-sm">אין אנשי קשר ברשימה</p>
              <Link href="/contacts">
                <Button variant="link" size="sm" className="mt-1">הוסף אנשי קשר</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
