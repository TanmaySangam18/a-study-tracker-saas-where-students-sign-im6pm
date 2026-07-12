"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { StudySession } from "../../lib/types";

type FormState = {
  subject: string;
  durationMinutes: string;
  studiedAt: string;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // move back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

const emptyForm: FormState = { subject: "", durationMinutes: "", studiedAt: todayISO() };

export default function DashboardClient({ email }: { email: string }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = await res.json();
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const weekStats = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    const inWeek = sessions.filter((s) => new Date(`${s.studiedAt}T00:00:00`) >= weekStart);
    const totalMinutes = inWeek.reduce((sum, s) => sum + s.durationMinutes, 0);

    const days: { iso: string; label: string; minutes: number }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const minutes = inWeek
        .filter((s) => s.studiedAt === iso)
        .reduce((sum, s) => sum + s.durationMinutes, 0);
      days.push({ iso, label: d.toLocaleDateString(undefined, { weekday: "short" }), minutes });
    }

    return { totalMinutes, sessionCount: inWeek.length, days };
  }, [sessions]);

  const maxDayMinutes = Math.max(1, ...weekStats.days.map((d) => d.minutes));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedSubject = form.subject.trim();
    const minutes = Number(form.durationMinutes);

    if (!trimmedSubject) {
      setFormError('Give this session a subject, like "Organic Chemistry".');
      return;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setFormError("Duration must be a positive number of minutes.");
      return;
    }
    if (!form.studiedAt) {
      setFormError("Pick a date for this session.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: trimmedSubject,
          durationMinutes: minutes,
          studiedAt: form.studiedAt,
        }),
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Could not save that session.");
        return;
      }
      setSessions((prev) => [data.session, ...prev]);
      setForm({ ...emptyForm, studiedAt: form.studiedAt });
    } catch {
      setFormError("Something went wrong. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const previous = sessions;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/items?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        setSessions(previous);
      }
    } catch {
      setSessions(previous);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-zinc-900">Recall</span>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-zinc-500 sm:inline">{email}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition duration-150 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Your week at a glance</h1>
          <p className="text-base leading-7 text-zinc-500">
            Log every session and watch your weekly total build.
          </p>
        </div>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-zinc-500">This week</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
                {formatMinutes(weekStats.totalMinutes)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {weekStats.sessionCount} session{weekStats.sessionCount === 1 ? "" : "s"} logged
              </p>
            </div>
            <div className="flex items-end gap-3">
              {weekStats.days.map((day) => (
                <div key={day.iso} className="flex flex-col items-center gap-2">
                  <div className="flex h-20 w-6 items-end rounded-full bg-zinc-100">
                    <div
                      className="w-full rounded-full bg-indigo-600 transition-all duration-150"
                      style={{ height: `${Math.max(4, (day.minutes / maxDayMinutes) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-zinc-400">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Log a session</h2>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <div>
              <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Organic Chemistry"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 transition duration-150 placeholder:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              />
            </div>
            <div>
              <label htmlFor="duration" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Minutes
              </label>
              <input
                id="duration"
                type="number"
                min={1}
                max={1440}
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                placeholder="45"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 transition duration-150 placeholder:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              />
            </div>
            <div>
              <label htmlFor="studiedAt" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Date
              </label>
              <input
                id="studiedAt"
                type="date"
                value={form.studiedAt}
                onChange={(e) => setForm((f) => ({ ...f, studiedAt: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Log session"}
              </button>
            </div>
          </form>
          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Session history</h2>

          {status === "loading" ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-zinc-200 bg-white" />
              ))}
            </div>
          ) : status === "error" ? (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 text-center">
              <p className="text-sm text-zinc-600">We couldn&apos;t load your sessions.</p>
              <button
                onClick={loadSessions}
                className="mt-3 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition duration-150 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Try again
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
              <p className="text-base font-medium text-zinc-700">No sessions yet</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Log your first study session above and it will show up here.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 transition duration-150 hover:border-zinc-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{session.subject}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {formatDay(session.studiedAt)} · {formatMinutes(session.durationMinutes)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deletingId === session.id}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition duration-150 hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                  >
                    {deletingId === session.id ? "Removing…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
