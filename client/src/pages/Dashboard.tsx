import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Users, ChevronLeft, Trash2, Eye } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [eventName, setEventName] = useState("");

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createEventMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("POST", "/api/events", {
        name,
        createdAt: new Date().toLocaleString("he-IL"),
        isActive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setOpen(false);
      setEventName("");
      toast({ title: "אירוע נוצר", description: "האירוע החדש נוצר בהצלחה" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "אירוע נמחק" });
    },
  });

  const handleCreate = () => {
    if (!eventName.trim()) return;
    createEventMutation.mutate(eventName.trim());
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold leading-tight">מערכת נוכחות חירום</h1>
              <p className="text-primary-foreground/80 text-xs">קיבוץ רשפים – צח״י</p>
            </div>
          </div>
          <Link href="/contacts">
            <Button variant="secondary" size="sm" className="gap-1 text-sm">
              <Users className="h-4 w-4" />
              אנשי קשר
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Create event button */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 h-12 text-base" data-testid="button-new-event">
              <Plus className="h-5 w-5" />
              אירוע חדש +
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader>
              <DialogTitle>יצירת אירוע חירום</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="event-name">שם האירוע</Label>
                <Input
                  id="event-name"
                  data-testid="input-event-name"
                  placeholder='למשל: "אזעקה – שבת צהריים"'
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  autoFocus
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!eventName.trim() || createEventMutation.isPending}
                data-testid="button-create-event"
              >
                {createEventMutation.isPending ? "יוצר..." : "צור אירוע"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Events list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">אין אירועים פעילים</p>
              <p className="text-sm text-muted-foreground/70 mt-1">לחץ "אירוע חדש +" ליצירת אירוע</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onDelete={() => deleteEventMutation.mutate(event.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EventCard({ event, onDelete }: { event: Event; onDelete: () => void }) {
  const { data: reports = [] } = useQuery({
    queryKey: ["/api/events", event.id, "reports"],
    queryFn: () => apiRequest("GET", `/api/events/${event.id}/reports`),
    refetchInterval: 5000, // auto-refresh every 5 seconds
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const safeIn = reports.filter((r: any) => r.status === "safe_in").length;
  const safeOut = reports.filter((r: any) => r.status === "safe_out").length;
  const needHelp = reports.filter((r: any) => r.status === "need_help").length;
  const total = Array.isArray(contacts) ? contacts.length : 0;
  const notReported = total - reports.length;

  return (
    <Card
      className={`border-2 transition-all ${needHelp > 0 ? "border-destructive help-pulse" : "border-border"}`}
      data-testid={`card-event-${event.id}`}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">{event.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{event.createdAt}</p>
          </div>
          <div className="flex items-center gap-1">
            {needHelp > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                {needHelp} זקוקים לעזרה!
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-md p-2 status-safe-in">
            <div className="text-lg font-bold">{safeIn}</div>
            <div className="text-[10px] leading-tight">בקיבוץ</div>
          </div>
          <div className="rounded-md p-2 status-safe-out">
            <div className="text-lg font-bold">{safeOut}</div>
            <div className="text-[10px] leading-tight">מחוץ</div>
          </div>
          <div className="rounded-md p-2 status-need-help">
            <div className="text-lg font-bold">{needHelp}</div>
            <div className="text-[10px] leading-tight">עזרה</div>
          </div>
          <div className="rounded-md p-2 status-no-report">
            <div className="text-lg font-bold">{notReported}</div>
            <div className="text-[10px] leading-tight">לא דיווחו</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link href={`/events/${event.id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full gap-1">
              <Eye className="h-3.5 w-3.5" />
              פרטים ושליחה
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-white border-destructive/40"
            onClick={onDelete}
            data-testid={`button-delete-event-${event.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
