import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Event } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, ChevronLeft, Trash2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EventStats from "@/components/EventStats";

export default function ManagementPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventName, setEventName] = useState("");
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createEvent = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/events", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowCreateModal(false);
      setEventName("");
      toast({ title: "אירוע נוצר בהצלחה" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "אירוע נמחק" });
    },
  });

  const handleCreate = () => {
    if (!eventName.trim()) return;
    createEvent.mutate(eventName.trim());
  };

  // Generate default name with current date
  const getDefaultEventName = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `אזעקה - ${day}.${month}.${year}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" data-testid="page-title">ניהול אירועים</h2>
          <p className="text-sm text-muted-foreground mt-1">צרו אירוע חדש ועקבו אחרי הדיווחים</p>
        </div>
        <Button
          onClick={() => {
            setEventName(getDefaultEventName());
            setShowCreateModal(true);
          }}
          className="gap-2"
          data-testid="button-create-event"
        >
          <Plus className="w-4 h-4" />
          צור אירוע חדש
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : events && events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-card border border-card-border rounded-xl p-5 hover:border-primary/30 transition-colors"
              data-testid={`event-card-${event.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <Link href={`/event/${event.id}`}>
                  <div className="cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <h3 className="text-base font-bold group-hover:text-primary transition-colors" data-testid={`event-name-${event.id}`}>
                        {event.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(event.createdAt).toLocaleString("he-IL")}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => deleteEvent.mutate(event.id)}
                    data-testid={`button-delete-event-${event.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Link href={`/event/${event.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-view-event-${event.id}`}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <EventStats eventId={event.id} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card border border-card-border rounded-xl" data-testid="empty-events">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-base font-semibold mb-1">אין אירועים</h3>
          <p className="text-sm text-muted-foreground mb-6">צרו אירוע חדש כדי להתחיל לעקוב אחרי דיווחים</p>
          <Button
            onClick={() => {
              setEventName(getDefaultEventName());
              setShowCreateModal(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            צור אירוע חדש
          </Button>
        </div>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-create-event">
          <DialogHeader>
            <DialogTitle>יצירת אירוע חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="event-name">שם האירוע</Label>
              <Input
                id="event-name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="לדוגמה: אזעקה - 22.3.2026"
                className="mt-1.5"
                dir="rtl"
                data-testid="input-event-name"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)} data-testid="button-cancel-create">
              ביטול
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!eventName.trim() || createEvent.isPending}
              data-testid="button-confirm-create"
            >
              {createEvent.isPending ? "יוצר..." : "צור אירוע"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
