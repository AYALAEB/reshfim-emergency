import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Event, Contact } from "@shared/schema";
import { CheckCircle, MapPin, HelpCircle, AlertTriangle } from "lucide-react";

type Status = "in_kibbutz" | "out_kibbutz" | "need_help";

export default function ReportPage() {
  const { eventId, contactId } = useParams<{ eventId: string; contactId: string }>();
  const evId = parseInt(eventId);
  const ctId = parseInt(contactId);

  const [selected, setSelected] = useState<Status | null>(null);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Load event details
  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", evId],
    queryFn: () => apiRequest("GET", `/api/events/${evId}`).then(r => r.json()),
    enabled: !isNaN(evId),
  });

  // Load contact — this is how we auto-fill name and phone
  const { data: contact, isLoading: contactLoading } = useQuery<Contact>({
    queryKey: ["/api/contacts", ctId],
    queryFn: () => apiRequest("GET", `/api/contacts/${ctId}`).then(r => r.json()),
    enabled: !isNaN(ctId),
  });

  const reportMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      const reportedAt = now.toLocaleString("he-IL", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      return apiRequest("POST", `/api/events/${evId}/reports`, {
        eventId: evId,
        contactId: ctId,
        contactName: contact!.name,
        contactPhone: contact!.phone,
        status: selected!,
        details: details.trim() || null,
        reportedAt,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  const isLoading = eventLoading || contactLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-red-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p>טוען...</p>
        </div>
      </div>
    );
  }

  if (!event || !contact) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">קישור לא תקין</h1>
          <p className="text-muted-foreground">לא ניתן למצוא את האירוע או איש הקשר</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">הדיווח התקבל!</h1>
          <p className="text-muted-foreground mb-1">תודה, {contact.name}</p>
          <p className="text-sm text-muted-foreground">
            {selected === "in_kibbutz" && "דיווחת: אני בקיבוץ והכל בסדר"}
            {selected === "out_kibbutz" && "דיווחת: אני לא בקיבוץ והכל בסדר"}
            {selected === "need_help" && "דיווחת: זקוק/ה לעזרה — צח\"י יצרו קשר בהקדם"}
          </p>
          {selected === "need_help" && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 text-sm font-medium">
                צוות חירום רשפים קיבל את דיווחך ויצור קשר בהקדם האפשרי
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-red-700 text-white px-4 py-5">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-200 uppercase tracking-wide">דיווח חירום</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">🔴 {event.name}</h1>
          <p className="text-red-200 text-sm">{event.createdAt}</p>
        </div>
      </div>

      <main className="max-w-sm mx-auto px-4 py-6">
        {/* Auto-filled identity — shown read-only */}
        <div className="bg-muted/50 border rounded-lg px-4 py-3 mb-6">
          <p className="text-xs text-muted-foreground mb-1">מדווח/ת</p>
          <p className="font-bold text-base">{contact.name}</p>
          <p className="text-sm text-muted-foreground" dir="ltr">{contact.phone}</p>
        </div>

        <p className="text-base font-semibold mb-4 text-center">מה מצבך?</p>

        {/* Status buttons */}
        <div className="space-y-3 mb-6">
          <StatusButton
            status="in_kibbutz"
            selected={selected}
            onClick={() => setSelected("in_kibbutz")}
            icon={<CheckCircle className="w-6 h-6" />}
            label="אני בקיבוץ והכל בסדר"
            color="green"
          />
          <StatusButton
            status="out_kibbutz"
            selected={selected}
            onClick={() => setSelected("out_kibbutz")}
            icon={<MapPin className="w-6 h-6" />}
            label="אני לא בקיבוץ והכל בסדר"
            color="blue"
          />
          <StatusButton
            status="need_help"
            selected={selected}
            onClick={() => setSelected("need_help")}
            icon={<HelpCircle className="w-6 h-6" />}
            label="אני זקוק/ה לעזרה"
            color="red"
          />
        </div>

        {/* Details for need_help */}
        {selected === "need_help" && (
          <div className="mb-4 space-y-2">
            <label className="text-sm font-medium">פרט את הבעיה (אופציונלי)</label>
            <Textarea
              placeholder="תאר את המצב..."
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={3}
              className="resize-none"
              data-testid="input-details"
            />
          </div>
        )}

        <Button
          onClick={() => reportMutation.mutate()}
          disabled={!selected || reportMutation.isPending}
          className="w-full h-12 text-base font-semibold bg-red-700 hover:bg-red-800"
          data-testid="btn-submit-report"
        >
          {reportMutation.isPending ? "שולח..." : "שלח דיווח"}
        </Button>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer">Created with Perplexity Computer</a>
      </footer>
    </div>
  );
}

function StatusButton({
  status, selected, onClick, icon, label, color
}: {
  status: Status;
  selected: Status | null;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: "green" | "blue" | "red";
}) {
  const isSelected = selected === status;
  const colors = {
    green: {
      base: "border-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-800",
      active: "border-2 border-green-500 bg-green-100 text-green-800 shadow-md",
    },
    blue: {
      base: "border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800",
      active: "border-2 border-blue-500 bg-blue-100 text-blue-800 shadow-md",
    },
    red: {
      base: "border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-800",
      active: "border-2 border-red-500 bg-red-100 text-red-800 shadow-md",
    },
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-right ${isSelected ? colors[color].active : colors[color].base}`}
      data-testid={`btn-status-${status}`}
    >
      <div className="shrink-0">{icon}</div>
      <span className="text-base font-medium">{label}</span>
      {isSelected && <CheckCircle className="w-5 h-5 mr-auto shrink-0 fill-current opacity-70" />}
    </button>
  );
}
