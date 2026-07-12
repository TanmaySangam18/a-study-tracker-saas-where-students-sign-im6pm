import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, useSupabase } from "../../../lib/config";
import { createUser, findUserByEmail, verifyPassword } from "../../../lib/user-store";
import { createSessionToken, SESSION_COOKIE, MAX_AGE_SECONDS } from "../../../lib/auth-cookie";
import { getCurrentUser, SUPABASE_COOKIE } from "../../../lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(
  body: unknown
): { ok: true; email: string; password: string } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }
  const { email, password } = body as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  return { ok: true, email, password };
}

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user: user ? { id: user.id, email: user.email } : null });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action =
    typeof body === "object" && body !== null ? (body as { action?: unknown }).action : undefined;
  if (action !== "signup" && action !== "login") {
    return NextResponse.json({ error: "action must be 'signup' or 'login'." }, { status: 400 });
  }

  const validated = validateCredentials(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { email, password } = validated;

  if (useSupabase) {
    const endpoint =
      action === "signup"
        ? `${SUPABASE_URL}/auth/v1/signup`
        : `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

    const supabaseRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await supabaseRes.json();

    if (!supabaseRes.ok) {
      const message =
        typeof data?.error_description === "string"
          ? data.error_description
          : typeof data?.msg === "string"
          ? data.msg
          : "Authentication failed.";
      const status = supabaseRes.status >= 400 && supabaseRes.status < 500 ? supabaseRes.status : 400;
      return NextResponse.json({ error: message }, { status });
    }

    if (!data.access_token) {
      return NextResponse.json({
        user: null,
        message: "Account created. Check your inbox to confirm your email, then log in.",
      });
    }

    const response = NextResponse.json({
      user: { id: data.user?.id, email: data.user?.email ?? email },
    });
    response.cookies.set(SUPABASE_COOKIE, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: typeof data.expires_in === "number" ? data.expires_in : MAX_AGE_SECONDS,
    });
    return response;
  }

  if (action === "signup") {
    if (findUserByEmail(email)) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 400 }
      );
    }
    const user = createUser(email, password);
    const token = createSessionToken(user.id);
    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
    return response;
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  const token = createSessionToken(user.id);
  const response = NextResponse.json({ user: { id: user.id, email: user.email } });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(SUPABASE_COOKIE);
  return response;
}
