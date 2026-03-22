import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Layout from "./Layout";
import type { Event } from "@shared/schema";

export default function EventsPage() {
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: allReports = {} } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/all-reports-count"],
    queryFn: async () => {
      // Fetch report counts for all events
      const counts: Record<string, number> = {};
      for (const ev of events) {
        const reps = await apiRequest("GET", `/api/events/${ev.id}/reports`).then(r => r.json());
        counts[ev.id] = reps.length;
      }
      return counts;
    },
    enabled: events.length > 0,
  });

  const createEvent = useMutation({
    mutationFn: () => apiRequest("POST", "/api/events", { name }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowForm(false);
      setName("");
    },
  });

  const now = new Date();
  const dateStr = `${now.getDate()}.${now.getMonth()+1}.${now.getFullYear()}`;

  return (
    <Layout subtitle="מערכת ניהול מצבי חירום">
      {/* New event card */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="font-bold text-red-600 text-base border-b-2 border-red-100 pb-2 mb-3">📋 אירועים</h2>
        {!showForm ? (
          <button
            data-testid="btn-new-event"
            onClick={() => setShowForm(true)}
            className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition"
          >
            + אירוע חדש
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">שם האירוע</label>
              <input
                data-testid="input-event-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={`אזעקה - ${dateStr}`}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                onKeyDown={e => e.key === "Enter" && createEvent.mutate()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                data-testid="btn-create-event"
                onClick={() => createEvent.mutate()}
                disabled={!name.trim() || createEvent.isPending}
                className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {createEvent.isPending ? "יוצר..." : "צור אירוע"}
              </button>
              <button
                onClick={() => { setShowForm(false); setName(""); }}
                className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Events list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-center text-gray-500 text-sm mt-8">אין אירועים עדיין. לחץ "אירוע חדש" כדי להתחיל.</p>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <button
              key={ev.id}
              data-testid={`event-item-${ev.id}`}
              onClick={() => navigate(`/events/${ev.id}`)}
              className="w-full bg-white rounded-xl shadow-sm p-4 flex justify-between items-center hover:border-red-400 border-2 border-transparent transition text-right"
            >
              <div>
                <div className="font-semibold">{ev.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{ev.createdAt}</div>
              </div>
              <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full">
                {(allReports as any)[ev.id] ?? 0} דיווחים
              </span>
            </button>
          ))}
        </div>
      )}
    </Layout>
  );
}
