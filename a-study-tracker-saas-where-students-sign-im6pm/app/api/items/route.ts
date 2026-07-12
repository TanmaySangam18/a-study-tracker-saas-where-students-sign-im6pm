// Study sessions API — requires auth, scoped to the signed-in user.
//
// If SUPABASE_URL + SUPABASE_ANON_KEY are set, rows persist in Supabase via PostgREST,
// authenticated as the current user (their access token, not a service-role key) so
// Row Level Security enforces isolation. Expected schema:
//
//   create table study_sessions (
//     id uuid primary key default gen_random_uuid(),
//     user_id uuid not null default auth.uid() references auth.users(id),
//     subject text not null,
//     duration_minutes int not null,
//     studied_at date not null,
//     created_at timestamptz not null default now()
//   );
//   alter table study_sessions enable row level security;
//   create policy "select own" on study_sessions for select using (auth.uid() = user_id);
//   create policy "insert own" on study_sessions for insert with check (auth.uid() = user_id);
//   create policy "delete own" on study_sessions for delete using (auth.uid() = user_id);
//
// Otherwise, an in-memory store keeps it running with zero config (not durable across
// serverless cold starts — good enough for a local/demo run).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { SUPABASE_URL, SUPABASE_ANON_KEY, useSupabase } from "../../../lib/config";
import { getCurrentUser } from "../../../lib/session";
import type { StudySession } from "../../../lib/types";

type Global = typeof globalThis & {
  __studyTrackerItems?: Map<string, StudySession>;
};

const g = globalThis as Global;
const memoryItems = g.__studyTrackerItems ?? (g.__studyTrackerItems = new Map());

const MAX_SUBJECT_LENGTH = 80;

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function validatePayload(
  body: unknown
):
  | { ok: true; subject: string; durationMinutes: number; studiedAt: string }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }
  const { subject, durationMinutes, studiedAt } = body as {
    subject?: unknown;
    durationMinutes?: unknown;
    studiedAt?: unknown;
  };

  if (typeof subject !== "string" || subject.trim().length === 0 || subject.length > MAX_SUBJECT_LENGTH) {
    return { ok: false, error: `Subject is required (max ${MAX_SUBJECT_LENGTH} characters).` };
  }
  if (
    typeof durationMinutes !== "number" ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 1440
  ) {
    return { ok: false, error: "Duration must be a number of minutes between 1 and 1440." };
  }
  if (typeof studiedAt !== "string" || !isValidDate(studiedAt)) {
    return { ok: false, error: "studiedAt must be a valid date (YYYY-MM-DD)." };
  }

  return { ok: true, subject: subject.trim(), durationMinutes, studiedAt };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (useSupabase) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/study_sessions?select=*&order=studied_at.desc,created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${user.accessToken}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Could not load study sessions." }, { status: 502 });
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const sessions: StudySession[] = rows.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      subject: String(row.subject),
      durationMinutes: Number(row.duration_minutes),
      studiedAt: String(row.studied_at),
      createdAt: String(row.created_at),
    }));
    return NextResponse.json({ sessions });
  }

  const sessions = Array.from(memoryItems.values())
    .filter((item) => item.userId === user.id)
    .sort((a, b) => (a.studiedAt < b.studiedAt ? 1 : -1));
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validatePayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  if (useSupabase) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/study_sessions`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${user.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        subject: validated.subject,
        duration_minutes: validated.durationMinutes,
        studied_at: validated.studiedAt,
        user_id: user.id,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Could not save the study session." }, { status: 502 });
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const row = rows[0];
    const session: StudySession = {
      id: String(row.id),
      userId: String(row.user_id),
      subject: String(row.subject),
      durationMinutes: Number(row.duration_minutes),
      studiedAt: String(row.studied_at),
      createdAt: String(row.created_at),
    };
    return NextResponse.json({ session }, { status: 201 });
  }

  const session: StudySession = {
    id: randomUUID(),
    userId: user.id,
    subject: validated.subject,
    durationMinutes: validated.durationMinutes,
    studiedAt: validated.studiedAt,
    createdAt: new Date().toISOString(),
  };
  memoryItems.set(session.id, session);
  return NextResponse.json({ session }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  if (useSupabase) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/study_sessions?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${user.accessToken}`,
        },
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Could not delete the study session." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  const existing = memoryItems.get(id);
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  memoryItems.delete(id);
  return NextResponse.json({ ok: true });
}
