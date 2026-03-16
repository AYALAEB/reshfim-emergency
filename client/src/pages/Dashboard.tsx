import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Plus, ChevronLeft, Trash2, CheckCircle2, Clock } from "lucide-react";
import type { Event } from "@shared/schema";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard() {
  const { toast } = useToast();
  const [newEventName, setNewEventName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createEvent = useMutation({
    mutationFn: (name: string) =>
      apiRequest("POST", "/api/events", {
        name,
        createdAt: new Date().toISOString(),
        isActive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setNewEventName("");
      setDialogOpen(false);
      toast({ title: "אירוע נוצר בהצלחה" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "אירוע נמחק" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/events/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
  });

  const activeEvents = events.filter(e => e.isActive);
  const pastEvents = events.filter(e => !e.isActive);

  return (
    <div className="space-y-6">
      {/* Hero + new event */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">אירועי חירום</h2>
          <p className="text-sm text-muted-foreground">ניהול נוכחות בזמן אמת</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-event" className="gap-2">
              <Plus size={16} />
              אירוע חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm mx-4" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-primary" />
                אירוע חדש
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="event-name">שם האירוע</Label>
                <Input
                  id="event-name"
                  data-testid="input-event-name"
                  placeholder='למשל: "אזעקה 16.3.2026"'
                  value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && newEventName.trim() && createEvent.mutate(newEventName.trim())}
                  autoFocus
                />
              </div>
              <Button
                data-testid="button-create-event"
                className="w-full"
                disabled={!newEventName.trim() || createEvent.isPending}
                onClick={() => createEvent.mutate(newEventName.trim())}
              >
                {createEvent.isPending ? "יוצר..." : "צור אירוע ושלח הודעות"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active events */}
      {activeEvents.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
            פעיל עכשיו
          </h3>
          {activeEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onDelete={() => deleteEvent.mutate(event.id)}
              onToggle={() => toggleActive.mutate({ id: event.id, isActive: false })}
            />
          ))}
        </section>
      )}

      {/* Empty state */}
      {activeEvents.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">אין אירועים פעילים כרגע</p>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
              <Plus size={14} className="ml-1" /> פתח אירוע חדש
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Past events */}
      {pastEvents.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Clock size={14} />
            היסטוריה
          </h3>
          {pastEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onDelete={() => deleteEvent.mutate(event.id)}
              onToggle={() => toggleActive.mutate({ id: event.id, isActive: true })}
              past
            />
          ))}
        </section>
      )}
    </div>
  );
}

function EventCard({
  event,
  onDelete,
  onToggle,
  past,
}: {
  event: Event;
  onDelete: () => void;
  onToggle: () => void;
  past?: boolean;
}) {
  return (
    <Card className={`transition-all ${past ? "opacity-70" : "border-primary/30 shadow-sm"}`} data-testid={`card-event-${event.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">{event.name}</span>
              {!past && (
                <Badge className="status-in text-xs shrink-0">פעיל</Badge>
              )}
              {past && (
                <Badge variant="secondary" className="text-xs shrink-0">הסתיים</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(event.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={e => { e.preventDefault(); onDelete(); }}
              data-testid={`button-delete-event-${event.id}`}
            >
              <Trash2 size={15} />
            </Button>
            <Link href={`/events/${event.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-open-event-${event.id}`}>
                <ChevronLeft size={18} />
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Link href={`/events/${event.id}`} className="flex-1">
            <Button variant={past ? "outline" : "default"} size="sm" className="w-full" data-testid={`button-view-event-${event.id}`}>
              {past ? "צפה בדוח" : "ניהול אירוע"}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            data-testid={`button-toggle-event-${event.id}`}
          >
            {past ? "הפעל מחדש" : "סיים אירוע"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
