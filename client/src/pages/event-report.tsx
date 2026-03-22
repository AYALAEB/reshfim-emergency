import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import type { Event, Contact, Report } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Send, MessageCircle, Users, Copy, Check, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function formatPhoneDisplay(phone: string): string {
  if (phone.startsWith("972")) {
    return "0" + phone.slice(3);
  }
  return phone;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "in_kibbutz":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">בקיבוץ ✓</Badge>;
    case "outside_kibbutz":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20">מחוץ לקיבוץ ✓</Badge>;
    case "needs_help":
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20">זקוק/ה לעזרה!</Badge>;
    default:
      return <Badge variant="secondary" className="text-muted-foreground">לא דיווח/ה</Badge>;
  }
}

export default function EventReportPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId!;
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error("Event not found");
      return res.json();
    },
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/events", eventId, "reports"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/reports`);
      return res.json();
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: stats } = useQuery<{
    total: number;
    inKibbutz: number;
    outsideKibbutz: number;
    needsHelp: number;
    reported: number;
    notReported: number;
  }>({
    queryKey: ["/api/events", eventId, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/stats`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  const getReportLink = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#/report/${eventId}`;
  };

  const getPersonalReportLink = (contactId: string) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#/report/${eventId}/${contactId}`;
  };

  const getGroupWhatsAppMessage = () => {
    if (!event) return "";
    const link = getReportLink();
    return `שלום לכולם,\nנא לדווח סטטוס לאחר האירוע "${event.name}".\nלחצו על הקישור ומלאו את הטופס:\n${link}\nתודה, הנהלת קיבוץ רשפים`;
  };

  const getPersonalWhatsAppMessage = (contact: Contact) => {
    if (!event) return "";
    const link = getPersonalReportLink(contact.id);
    return `שלום ${contact.name},\nנא לדווח סטטוס לאחר האירוע "${event.name}".\nלחצו על הקישור ומלאו את הטופס:\n${link}\nתודה, הנהלת קיבוץ רשפים`;
  };

  const openGroupWhatsApp = () => {
    const msg = encodeURIComponent(getGroupWhatsAppMessage());
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const openPersonalWhatsApp = (contact: Contact) => {
    const msg = encodeURIComponent(getPersonalWhatsAppMessage(contact));
    const phone = contact.phone;
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const copyGroupMessage = () => {
    navigator.clipboard?.writeText(getGroupWhatsAppMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "ההודעה הועתקה" });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "reports"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "stats"] });
  };

  // Build merged contact-report table
  const getContactStatus = (contactId: string) => {
    return reports?.find((r) => r.contactId === contactId);
  };

  // Reports from non-contacts (via general link)
  const nonContactReports = reports?.filter(
    (r) => !r.contactId || !contacts?.find((c) => c.id === r.contactId)
  ) || [];

  if (eventLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">אירוע לא נמצא</h2>
        <Link href="/">
          <Button variant="secondary" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            חזרה לדף הניהול
          </Button>
        </Link>
      </div>
    );
  }

  const totalReported = stats?.reported || 0;
  const totalContacts = stats?.total || 0;
  const progressPercent = totalContacts > 0 ? Math.round((totalReported / totalContacts) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-back">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold" data-testid="event-title">{event.name}</h2>
          <p className="text-sm text-muted-foreground">
            נוצר {new Date(event.createdAt).toLocaleString("he-IL")}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-9 w-9" data-testid="button-refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <div className="text-2xl font-bold text-emerald-600">{stats.inKibbutz}</div>
              <div className="text-xs font-medium text-emerald-600/80">🟢 בקיבוץ</div>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <div className="text-2xl font-bold text-blue-600">{stats.outsideKibbutz}</div>
              <div className="text-xs font-medium text-blue-600/80">🔵 מחוץ לקיבוץ</div>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <div className="text-2xl font-bold text-red-600">{stats.needsHelp}</div>
              <div className="text-xs font-medium text-red-600/80">🔴 זקוקים לעזרה</div>
            </div>
            <div className="rounded-xl border border-gray-500/20 bg-gray-500/10 px-4 py-3">
              <div className="text-2xl font-bold text-gray-500">{stats.notReported}</div>
              <div className="text-xs font-medium text-gray-500/80">⚪ לא דיווחו</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-card border border-card-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">התקדמות דיווחים</span>
              <span className="text-xs font-bold">{totalReported}/{totalContacts} ({progressPercent}%)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Button
          onClick={() => setShowGroupModal(true)}
          className="h-auto py-4 gap-3 bg-emerald-600 hover:bg-emerald-700 text-white"
          data-testid="button-send-group"
        >
          <Send className="w-5 h-5" />
          <div className="text-right">
            <div className="font-bold">שלח לכולם בבת אחת</div>
            <div className="text-xs opacity-80">שלח הודעה לקבוצת ווטסאפ</div>
          </div>
        </Button>
        <Button
          onClick={() => setShowPersonalModal(true)}
          variant="secondary"
          className="h-auto py-4 gap-3"
          data-testid="button-send-personal"
        >
          <MessageCircle className="w-5 h-5" />
          <div className="text-right">
            <div className="font-bold">שלח קישורים אישיים</div>
            <div className="text-xs opacity-60">שלח לכל איש קשר בנפרד</div>
          </div>
        </Button>
      </div>

      {/* Reports Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-card-border flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">סטטוס דיווחים</h3>
        </div>

        {reportsLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right font-semibold">שם</TableHead>
                <TableHead className="text-right font-semibold">טלפון</TableHead>
                <TableHead className="text-right font-semibold">סטטוס</TableHead>
                <TableHead className="text-right font-semibold">שעת דיווח</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts?.map((contact) => {
                const report = getContactStatus(contact.id);
                return (
                  <TableRow key={contact.id} data-testid={`report-row-${contact.id}`}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm" dir="ltr">
                      {formatPhoneDisplay(contact.phone)}
                    </TableCell>
                    <TableCell>{getStatusBadge(report?.status || "")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {report ? new Date(report.reportedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {nonContactReports.map((report) => (
                <TableRow key={report.id} data-testid={`report-row-extra-${report.id}`}>
                  <TableCell className="font-medium">
                    {report.name}
                    <span className="text-xs text-muted-foreground mr-2">(דיווח חיצוני)</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm" dir="ltr">
                    {formatPhoneDisplay(report.phone)}
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(report.reportedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                </TableRow>
              ))}
              {(!contacts || contacts.length === 0) && nonContactReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    אין אנשי קשר. הוסיפו אנשי קשר בעמוד &quot;אנשי קשר&quot;
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Group WhatsApp Modal */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-group-whatsapp">
          <DialogHeader>
            <DialogTitle>שליחה לקבוצת ווטסאפ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-line border" dir="rtl" data-testid="group-message-preview">
              {getGroupWhatsAppMessage()}
            </div>

            <Button
              onClick={openGroupWhatsApp}
              className="w-full h-14 gap-3 bg-[#25D366] hover:bg-[#1da851] text-white text-base font-bold"
              data-testid="button-open-group-whatsapp"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.462-1.497A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.252 0-4.336-.711-6.042-1.921l-.422-.302-2.651.89.888-2.647-.33-.437A9.716 9.716 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/>
              </svg>
              שלח בווטסאפ
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              לאחר לחיצה, בחרו את קבוצת הווטסאפ אליה תרצו לשלוח
            </p>

            <Button
              variant="ghost"
              className="w-full gap-2 text-sm"
              onClick={copyGroupMessage}
              data-testid="button-copy-message"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "הועתק!" : "העתק הודעה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Personal Links Modal */}
      <Dialog open={showPersonalModal} onOpenChange={setShowPersonalModal}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" data-testid="dialog-personal-whatsapp">
          <DialogHeader>
            <DialogTitle>שליחת קישורים אישיים</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {contacts && contacts.length > 0 ? (
              contacts.map((contact) => {
                const report = getContactStatus(contact.id);
                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    data-testid={`personal-contact-${contact.id}`}
                  >
                    <div>
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-muted-foreground font-mono" dir="ltr">
                        {formatPhoneDisplay(contact.phone)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report && getStatusBadge(report.status)}
                      <Button
                        size="sm"
                        className="gap-1.5 bg-[#25D366] hover:bg-[#1da851] text-white"
                        onClick={() => openPersonalWhatsApp(contact)}
                        data-testid={`button-send-personal-${contact.id}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        שלח
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                אין אנשי קשר. הוסיפו אנשי קשר בעמוד &quot;אנשי קשר&quot;
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
