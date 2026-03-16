import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Event, Contact, Report } from "@shared/schema";
import { ArrowRight, CheckCircle, MapPin, HelpCircle, AlertCircle, Phone } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  in_kibbutz: "בקיבוץ — הכל בסדר",
  out_kibbutz: "לא בקיבוץ — הכל בסדר",
  need_help: "זקוק/ה לעזרה",
};

const STATUS_CLASS: Record<string, string> = {
  in_kibbutz: "status-in-kibbutz",
  out_kibbutz: "status-out-kibbutz",
  need_help: "status-need-help",
  none: "status-no-report",
};

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = parseInt(id);

  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}`).then(r => r.json()),
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ["/api/events", eventId, "reports"],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}/reports`).then(r => r.json()),
    refetchInterval: 5000,
  });

  const reportMap = new Map(reports.map(r => [r.contactId, r]));
  const needHelp = reports.filter(r => r.status === "need_help");
  const inKibbutz = reports.filter(r => r.status === "in_kibbutz");
  const outKibbutz = reports.filter(r => r.status === "out_kibbutz");
  const noReport = contacts.filter(c => !reportMap.has(c.id));

  if (!event) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">טוען...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-red-700 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-red-600 p-1">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold truncate">{event.name}</h1>
          </div>
          <p className="text-red-200 text-xs mr-8">{event.createdAt}</p>

          {/* Stats bar */}
          <div className="flex gap-3 mt-3 mr-8">
            <StatItem count={inKibbutz.length} label="בקיבוץ" color="bg-green-500" />
            <StatItem count={outKibbutz.length} label="בחוץ" color="bg-blue-400" />
            <StatItem count={needHelp.length} label="עזרה" color="bg-red-400" pulse />
            <StatItem count={noReport.length} label="לא דיווחו" color="bg-white/30" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Need Help — top priority */}
        {needHelp.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              זקוקים לעזרה ({needHelp.length})
            </h2>
            <div className="space-y-2">
              {needHelp.map(r => (
                <Card key={r.id} className="border-red-400">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm">{r.contactName}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{r.contactPhone}</p>
                        {r.details && <p className="text-sm mt-1 text-red-600">"{r.details}"</p>}
                        <p className="text-xs text-muted-foreground mt-1">{r.reportedAt}</p>
                      </div>
                      <a href={`https://wa.me/${r.contactPhone.replace(/\D/g,"").replace(/^0/,"972")}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs shrink-0">
                          <Phone className="w-3 h-3" />
                          חייג
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* All contacts table */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            כל הדיווחים ({contacts.length})
          </h2>
          <div className="space-y-1">
            {contacts.map(c => {
              const report = reportMap.get(c.id);
              return (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-card rounded-lg border">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{c.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {report ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_CLASS[report.status]}`}>
                        {STATUS_LABELS[report.status]}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full border font-medium status-no-report">
                        לא דיווח
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer">Created with Perplexity Computer</a>
      </footer>
    </div>
  );
}

function StatItem({ count, label, color, pulse }: { count: number; label: string; color: string; pulse?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${pulse && count > 0 ? "pulse-red" : ""}`}>{count}</div>
      <div className="text-red-200 text-xs">{label}</div>
    </div>
  );
}
