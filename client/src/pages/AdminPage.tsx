import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Event, Contact, Report } from "@shared/schema";
import { Users, Plus, Trash2, ExternalLink, AlertCircle, CheckCircle, MapPin, HelpCircle } from "lucide-react";

export default function AdminPage() {
  const [newEventName, setNewEventName] = useState("");
  const { toast } = useToast();

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const createEventMutation = useMutation({
    mutationFn: async (name: string) => {
      const now = new Date();
      const formatted = now.toLocaleDateString("he-IL", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
      return apiRequest("POST", "/api/events", { name, createdAt: formatted, active: true }).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setNewEventName("");
      toast({ title: "אירוע נוצר בהצלחה" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const handleCreateEvent = () => {
    const name = newEventName.trim() || `אזעקה - ${new Date().toLocaleDateString("he-IL")}`;
    createEventMutation.mutate(name);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-red-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 40 40" className="w-9 h-9" aria-label="לוגו רשפים">
              <circle cx="20" cy="20" r="18" fill="none" stroke="white" strokeWidth="2.5"/>
              <path d="M20 8 L24 16 L20 13 L16 16 Z" fill="white"/>
              <path d="M20 13 L22 20 L20 18 L18 20 Z" fill="white" opacity="0.7"/>
              <circle cx="20" cy="24" r="3" fill="white"/>
            </svg>
            <div>
              <h1 className="text-xl font-bold leading-tight">צח"י רשפים</h1>
              <p className="text-red-200 text-xs">מערכת דיווח חירום</p>
            </div>
          </div>
          <Link href="/contacts">
            <Button variant="outline" className="border-white text-white hover:bg-red-600 gap-2" data-testid="btn-contacts">
              <Users className="w-4 h-4" />
              אנשי קשר ({contacts.length})
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Create Event */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">יצירת אירוע חדש</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="שם האירוע (למשל: אזעקה 15.3.2026)"
                value={newEventName}
                onChange={e => setNewEventName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateEvent()}
                className="flex-1"
                data-testid="input-event-name"
              />
              <Button
                onClick={handleCreateEvent}
                disabled={createEventMutation.isPending}
                className="bg-red-700 hover:bg-red-800 gap-2"
                data-testid="btn-create-event"
              >
                <Plus className="w-4 h-4" />
                צור אירוע
              </Button>
            </div>
            {contacts.length === 0 && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                אין אנשי קשר — <Link href="/contacts" className="underline">הוסף אנשי קשר</Link> תחילה
              </p>
            )}
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            אירועים ({events.length})
          </h2>

          {eventsLoading && (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
            </div>
          )}

          {!eventsLoading && events.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>אין אירועים עדיין — צור אירוע חדש למעלה</p>
              </CardContent>
            </Card>
          )}

          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              contacts={contacts}
              onDelete={() => deleteEventMutation.mutate(event.id)}
            />
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="hover:underline">
          Created with Perplexity Computer
        </a>
      </footer>
    </div>
  );
}

function EventCard({ event, contacts, onDelete }: { event: Event; contacts: Contact[]; onDelete: () => void }) {
  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ["/api/events", event.id, "reports"],
    queryFn: () => apiRequest("GET", `/api/events/${event.id}/reports`).then(r => r.json()),
    refetchInterval: 5000,
  });

  const inKibbutz = reports.filter(r => r.status === "in_kibbutz").length;
  const outKibbutz = reports.filter(r => r.status === "out_kibbutz").length;
  const needHelp = reports.filter(r => r.status === "need_help").length;
  const noReport = contacts.length - reports.length;

  return (
    <Card className={needHelp > 0 ? "border-red-500 shadow-red-100" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{event.name}</h3>
              {needHelp > 0 && (
                <Badge variant="destructive" className="pulse-red text-xs">
                  {needHelp} זקוקים לעזרה!
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{event.createdAt}</p>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 mb-3">
              <StatBadge icon={<CheckCircle className="w-3 h-3" />} label={`${inKibbutz} בקיבוץ`} className="status-in-kibbutz" />
              <StatBadge icon={<MapPin className="w-3 h-3" />} label={`${outKibbutz} בחוץ`} className="status-out-kibbutz" />
              <StatBadge icon={<HelpCircle className="w-3 h-3" />} label={`${needHelp} עזרה`} className="status-need-help" />
              <StatBadge icon={<AlertCircle className="w-3 h-3" />} label={`${noReport} לא דיווחו`} className="status-no-report" />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Link href={`/event/${event.id}`}>
                <Button size="sm" variant="outline" className="gap-1 text-xs" data-testid={`btn-view-event-${event.id}`}>
                  <ExternalLink className="w-3 h-3" />
                  פתח דוח
                </Button>
              </Link>
              <SendWhatsAppButton event={event} contacts={contacts} />
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={onDelete}
            data-testid={`btn-delete-event-${event.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBadge({ icon, label, className }: { icon: React.ReactNode; label: string; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {icon}
      {label}
    </span>
  );
}

function SendWhatsAppButton({ event, contacts }: { event: Event; contacts: Contact[] }) {
  const [open, setOpen] = useState(false);
  const baseUrl = window.location.origin + window.location.pathname;

  const sendToAll = () => {
    if (contacts.length === 0) return;
    const messages = contacts.map(c => {
      const url = `${baseUrl}#/report/${event.id}/${c.id}`;
      return `שלום ${c.name},\n\n🔴 *${event.name}*\n\nנא לדווח על מצבך:\n${url}`;
    });
    // Send first contact via WhatsApp
    const encoded = encodeURIComponent(messages[0]);
    window.open(`https://wa.me/${contacts[0].phone}?text=${encoded}`, "_blank");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs"
        onClick={() => setOpen(!open)}
        data-testid={`btn-whatsapp-${event.id}`}
      >
        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.549 4.119 1.516 5.857L.057 23.18l5.448-1.43A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.946 0-3.77-.524-5.337-1.436l-.382-.227-3.232.849.863-3.148-.249-.396A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        שלח בוואטסאפ
      </Button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-card border rounded-lg shadow-xl p-3 min-w-[200px] space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2">שלח קישורים אישיים</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {contacts.map(c => {
              const url = `${baseUrl}#/report/${event.id}/${c.id}`;
              const msg = encodeURIComponent(`שלום ${c.name},\n\n🔴 *${event.name}*\n\nנא לדווח על מצבך:\n${url}`);
              const phone = c.phone.replace(/\D/g, "").replace(/^0/, "972");
              return (
                <a
                  key={c.id}
                  href={`https://wa.me/${phone}?text=${msg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
                  data-testid={`btn-wa-contact-${c.id}`}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-green-600 shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.549 4.119 1.516 5.857L.057 23.18l5.448-1.43A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.946 0-3.77-.524-5.337-1.436l-.382-.227-3.232.849.863-3.148-.249-.396A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  <span className="truncate">{c.name}</span>
                  <span className="text-muted-foreground text-xs mr-auto">{c.phone}</span>
                </a>
              );
            })}
          </div>
          <Button size="sm" variant="ghost" className="w-full text-xs mt-1" onClick={() => setOpen(false)}>
            סגור
          </Button>
        </div>
      )}
    </div>
  );
}
