import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import Layout from "./Layout";
import type { Event, Contact, Report } from "@shared/schema";

type StatusKey = "in" | "out" | "help";

const statusLabel = (s: string) =>
  ({ in: "בקיבוץ ✓", out: "בחוץ ✓", help: "🆘 זקוק לעזרה", none: "לא דיווח" }[s] ?? s);

const statusClass = (s: string) =>
  ({
    in: "bg-green-100 text-green-800",
    out: "bg-blue-100 text-blue-800",
    help: "bg-red-100 text-red-700",
    none: "bg-gray-100 text-gray-500",
  }[s] ?? "bg-gray-100 text-gray-500");

export default function EventDetailPage() {
  const { id: eventId } = useParams<{ id: string }>();

  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: () => fetch(`/api/events/${eventId}`).then(r => r.json()),
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/events", eventId, "reports"],
    queryFn: () => fetch(`/api/events/${eventId}/reports`).then(r => r.json()),
    refetchInterval: 10000, // auto-refresh every 10s
  });

  const reportMap = Object.fromEntries(reports.map(r => [r.contactId, r]));

  const stats = {
    in:   reports.filter(r => r.status === "in").length,
    out:  reports.filter(r => r.status === "out").length,
    help: reports.filter(r => r.status === "help").length,
    none: contacts.length - reports.length,
  };

  const helpPeople = contacts.filter(c => reportMap[c.id]?.status === "help");
  const baseUrl = window.location.origin + window.location.pathname;

  // Normalize for WhatsApp — must be international format without +
  const formatPhone = (phone: string) => {
    let p = phone.replace(/\D/g, "");
    if (p.startsWith("972")) return p;       // already international
    if (p.startsWith("0")) return "972" + p.slice(1);
    return p;
  };

  const makeWALink = (c: Contact) => {
    // FIXED: hash-based URL so it works from WhatsApp links
    const reportUrl = `${baseUrl}#/report/${eventId}/${c.id}`;
    const msg = `היי ${c.name}, נא לדווח על מצבך: ${reportUrl}`;
    return `https://wa.me/${formatPhone(c.phone)}?text=${encodeURIComponent(msg)}`;
  };

  if (!event) return <Layout showBack><p className="text-center text-gray-400 mt-8">טוען...</p></Layout>;

  return (
    <Layout title={event.name} subtitle={event.name} showBack>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatBox num={stats.in}   label="בקיבוץ"   color="text-green-600" />
        <StatBox num={stats.out}  label="בחוץ"      color="text-blue-600"  />
        <StatBox num={stats.help} label="עזרה"      color="text-red-600"   />
        <StatBox num={Math.max(0, stats.none)} label="לא דיווחו" color="text-gray-400" />
      </div>

      {/* Help alert */}
      {helpPeople.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 mb-4">
          <h3 className="font-bold text-red-600 mb-2">⚠️ זקוקים לעזרה!</h3>
          {helpPeople.map(c => (
            <div key={c.id} className="text-sm mb-1">
              <strong>{c.name}</strong> — {c.phone}
              {reportMap[c.id]?.details && (
                <div className="text-gray-600 text-xs mt-0.5">{reportMap[c.id].details}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp links */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="font-bold text-red-600 text-base border-b-2 border-red-100 pb-2 mb-3">📤 שליחת קישורים</h2>
        {contacts.length === 0 ? (
          <p className="text-gray-400 text-sm">אין אנשי קשר. הוסף ב"אנשי קשר".</p>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => {
              const rep = reportMap[c.id];
              const st = rep?.status ?? "none";
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-gray-400 dir-ltr">{c.phone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(st)}`}>
                      {statusLabel(st)}
                    </span>
                    <a
                      href={makeWALink(c)}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-green-600 transition"
                    >
                      📲 שלח
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reports table */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold text-red-600 text-base border-b-2 border-red-100 pb-2 mb-3">📊 דו"ח דיווחים</h2>
        {reportsLoading ? (
          <p className="text-gray-400 text-sm text-center">טוען...</p>
        ) : contacts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">אין אנשי קשר</p>
        ) : (
          <div className="space-y-1">
            {contacts.map(c => {
              const rep = reportMap[c.id];
              const st = rep?.status ?? "none";
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    {rep?.details && <div className="text-xs text-gray-500">{rep.details}</div>}
                    {rep?.reportedAt && <div className="text-xs text-gray-400">{rep.reportedAt}</div>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(st)}`}>
                    {statusLabel(st)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-400 text-center mt-3">מתרענן אוטומטית כל 10 שניות</p>
      </div>
    </Layout>
  );
}

function StatBox({ num, label, color }: { num: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 text-center">
      <div className={`text-2xl font-extrabold ${color}`}>{num}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
