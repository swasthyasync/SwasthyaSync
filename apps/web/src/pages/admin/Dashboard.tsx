import React, { useEffect, useState } from "react";

type KPI = {
  therapistUtilizationPct: number; // 0-100
  noShowRatePct: number; // 0-100
  avgSessionMinutes: number;
  upcomingCount: number;
  utilizationByTherapist: { name: string; pct: number }[];
  recentAppointments: {
    id: string;
    patientName: string;
    procedure: string;
    startTime: string; // ISO
    practitioner: string;
    status: "scheduled" | "completed" | "no-show" | "cancelled";
  }[];
};

const MOCK_DATA: KPI = {
  therapistUtilizationPct: 68,
  noShowRatePct: 7,
  avgSessionMinutes: 47,
  upcomingCount: 12,
  utilizationByTherapist: [
    { name: "Dr. Meera", pct: 82 },
    { name: "Therapist Ravi", pct: 73 },
    { name: "Therapist Sita", pct: 56 },
    { name: "Therapist Arjun", pct: 45 }
  ],
  recentAppointments: [
    {
      id: "apt_1001",
      patientName: "Asha Rao",
      procedure: "Abhyanga",
      startTime: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      practitioner: "Therapist Ravi",
      status: "scheduled"
    },
    {
      id: "apt_1000",
      patientName: "Ramesh K",
      procedure: "Pizhichil",
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      practitioner: "Dr. Meera",
      status: "completed"
    },
    {
      id: "apt_0998",
      patientName: "Sunita P",
      procedure: "Shirodhara",
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      practitioner: "Therapist Sita",
      status: "no-show"
    }
  ]
};

export default function Dashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<KPI | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<string>("All Centers");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadMetrics() {
      setLoading(true);
      setError(null);
      const base = process.env.REACT_APP_API_URL || "http://localhost:4000";
      try {
        const res = await fetch(`${base}/admin/metrics?center=${encodeURIComponent(selectedCenter)}`, {
          credentials: "include"
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as KPI;
        if (mounted) {
          setMetrics(json);
        }
      } catch (err) {
        // fallback to mock data for frontend dev
        console.warn("Could not fetch admin metrics, using mock data:", err);
        if (mounted) {
          setMetrics(MOCK_DATA);
          setError("Using mock data (backend unreachable).");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadMetrics();
    return () => {
      mounted = false;
    };
  }, [selectedCenter]);

  return (
    <div className="p-6 md:p-8">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-800">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview — clinic utilization, no-shows, and recent activity</p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedCenter}
            onChange={(e) => setSelectedCenter(e.target.value)}
            className="border rounded px-3 py-2 bg-white text-sm"
            aria-label="Select center"
          >
            <option>All Centers</option>
            <option>Delhi - AIIA Clinic</option>
            <option>Bengaluru - Center B</option>
          </select>

          <button
            onClick={() => {
              // manual refresh
              setMetrics(null);
              setLoading(true);
              setError(null);
              // effect will run because selectedCenter didn't change; quick trick: toggle to force load
              setSelectedCenter((s) => s);
            }}
            className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded">
          {error}
        </div>
      )}

      <main>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Therapist Utilization"
            value={metrics ? `${metrics.therapistUtilizationPct}%` : "—"}
            hint="Percent of booked capacity"
            loading={loading}
          />
          <KPICard
            title="No-show Rate"
            value={metrics ? `${metrics.noShowRatePct}%` : "—"}
            hint="Missed appointments"
            loading={loading}
          />
          <KPICard
            title="Avg Session"
            value={metrics ? `${metrics.avgSessionMinutes} min` : "—"}
            hint="Average therapy duration"
            loading={loading}
          />
          <KPICard
            title="Upcoming Today"
            value={metrics ? `${metrics.upcomingCount}` : "—"}
            hint="Confirmed bookings"
            loading={loading}
          />
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-slate-800">Utilization by Therapist</h2>
            <p className="text-sm text-slate-500">Shows utilization percentage per therapist</p>
          </div>

          <div className="space-y-3">
            {(metrics?.utilizationByTherapist || []).map((u) => (
              <div key={u.name} className="bg-white p-3 rounded shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{u.name}</div>
                  <div className="text-sm text-slate-500">Utilization: {u.pct}%</div>
                </div>
                <div className="w-40">
                  <div className="h-3 bg-slate-100 rounded overflow-hidden">
                    <div
                      className={`h-3 rounded ${u.pct >= 75 ? "bg-emerald-500" : u.pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                      style={{ width: `${Math.min(100, u.pct)}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            ))}

            {(!metrics || metrics.utilizationByTherapist.length === 0) && (
              <div className="text-sm text-slate-500">No utilization data available.</div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-slate-800">Recent Appointments</h2>
            <div className="text-sm text-slate-500">Latest activity across the center</div>
          </div>

          <div className="bg-white rounded shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Procedure</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Practitioner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {(metrics?.recentAppointments || []).map((apt) => (
                  <tr key={apt.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{apt.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{apt.patientName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{apt.procedure}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{apt.practitioner}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {new Date(apt.startTime).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={apt.status} />
                    </td>
                  </tr>
                ))}
                {(!metrics || metrics.recentAppointments.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                      No recent appointments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------- Small presentational components ---------- */

function KPICard({ title, value, hint, loading }: { title: string; value: string | number; hint?: string; loading?: boolean }) {
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-800">{loading ? "Loading..." : value}</div>
        </div>
        <div className="text-xs text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "scheduled" | "completed" | "no-show" | "cancelled" }) {
  const mapping: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-indigo-100 text-indigo-800" },
    completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800" },
    "no-show": { label: "No-show", className: "bg-rose-100 text-rose-800" },
    cancelled: { label: "Cancelled", className: "bg-yellow-100 text-yellow-800" }
  };

  const meta = mapping[status] || mapping.scheduled;
  return <span className={`px-2 py-1 rounded text-xs font-medium ${meta.className}`}>{meta.label}</span>;
}
