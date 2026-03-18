import { useParams } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, MapPin, LogOut, HelpCircle } from "lucide-react";

export default function ReportPage() {
  const { eventId, contactId } = useParams<{ eventId: string; contactId: string }>();
  const [status, setStatus] = useState<"safe_in" | "safe_out" | "need_help" | null>(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: info, isLoading } = useQuery<{ event: any; contact: any }>({
    queryKey: ["/api/report-info", eventId, contactId],
    queryFn: () => apiRequest("GET", `/api/report-info/${eventId}/${contactId}`),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/reports", {
        eventId: Number(eventId),
        contactId: Number(contactId),
        name: info?.contact?.name ?? "",
        phone: info?.contact?.phone ?? "",
        status,
        notes: notes.trim() || null,
        reportedAt: new Date().toLocaleString("he-IL"),
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-muted-foreground">קישור לא תקין</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const messages: Record<string, { icon: any; text: string; color: string }> = {
      safe_in: { icon: CheckCircle2, text: "הדיווח התקבל – בקיבוץ ובסדר", color: "text-green-600" },
      safe_out: { icon: LogOut, text: "הדיווח התקבל – מחוץ לקיבוץ ובסדר", color: "text-blue-600" },
      need_help: { icon: HelpCircle, text: "הדיווח התקבל – צוות החירום יצור קשר", color: "text-red-600" },
    };
    const m = messages[status!];
    const Icon = m.icon;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background" dir="rtl">
        <div className="text-center max-w-xs">
          <Icon className={`h-16 w-16 ${m.color} mx-auto mb-4`} />
          <h2 className="text-xl font-bold mb-2">תודה, {info.contact.name}!</h2>
          <p className={`font-medium ${m.color}`}>{m.text}</p>
          <p className="text-sm text-muted-foreground mt-3">צח״י רשפים קיבל את הדיווח שלך</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <h1 className="text-xl font-bold">אירוע חירום</h1>
        <p className="text-primary-foreground/80 text-sm mt-0.5">{info.event.name}</p>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
        {/* Auto-filled info */}
        <div className="bg-muted/50 rounded-lg px-4 py-3 border border-border">
          <div className="text-xs text-muted-foreground">שם</div>
          <div className="font-semibold">{info.contact.name}</div>
          {info.contact.phone && (
            <>
              <div className="text-xs text-muted-foreground mt-2">טלפון</div>
              <div className="font-medium text-sm">{info.contact.phone}</div>
            </>
          )}
        </div>

        {/* Status buttons */}
        <div className="space-y-3">
          <p className="font-semibold text-center text-sm">מה המצב שלך?</p>

          <button
            onClick={() => setStatus("safe_in")}
            className={`w-full rounded-xl p-4 border-2 transition-all text-right ${
              status === "safe_in"
                ? "border-green-600 bg-green-50"
                : "border-border hover:border-green-400 bg-background"
            }`}
            data-testid="button-safe-in"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${status === "safe_in" ? "bg-green-600 text-white" : "bg-green-100"}`}>
                ✅
              </div>
              <div>
                <div className="font-bold text-green-800">אני בקיבוץ והכל בסדר</div>
                <div className="text-xs text-muted-foreground">נמצא בקיבוץ, אין צורך בסיוע</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStatus("safe_out")}
            className={`w-full rounded-xl p-4 border-2 transition-all text-right ${
              status === "safe_out"
                ? "border-blue-600 bg-blue-50"
                : "border-border hover:border-blue-400 bg-background"
            }`}
            data-testid="button-safe-out"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${status === "safe_out" ? "bg-blue-600 text-white" : "bg-blue-100"}`}>
                🔵
              </div>
              <div>
                <div className="font-bold text-blue-800">אני לא בקיבוץ והכל בסדר</div>
                <div className="text-xs text-muted-foreground">נמצא מחוץ לקיבוץ, בסדר</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStatus("need_help")}
            className={`w-full rounded-xl p-4 border-2 transition-all text-right ${
              status === "need_help"
                ? "border-red-600 bg-red-50"
                : "border-border hover:border-red-400 bg-background"
            }`}
            data-testid="button-need-help"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${status === "need_help" ? "bg-red-600 text-white" : "bg-red-100"}`}>
                🆘
              </div>
              <div>
                <div className="font-bold text-red-800">אני זקוק/ה לעזרה</div>
                <div className="text-xs text-muted-foreground">קשר דחוף עם צוות החירום</div>
              </div>
            </div>
          </button>
        </div>

        {/* Notes for help request */}
        {status === "need_help" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">פרטים נוספים (אופציונלי)</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="תאר את המצב – מיקום, סוג הסיוע הנדרש..."
              rows={3}
              className="text-sm"
              data-testid="textarea-notes"
            />
          </div>
        )}

        {/* Submit */}
        <Button
          className="w-full h-12 text-base"
          onClick={() => submitMutation.mutate()}
          disabled={!status || submitMutation.isPending}
          data-testid="button-submit-report"
        >
          {submitMutation.isPending ? "שולח..." : "שלח דיווח"}
        </Button>
      </div>
    </div>
  );
}
