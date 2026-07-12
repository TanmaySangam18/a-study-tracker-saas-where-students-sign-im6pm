import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, useSupabase } from "./config";
import { SESSION_COOKIE, verifySessionToken } from "./auth-cookie";
import { findUserById } from "./user-store";
import type { SessionUser } from "./types";

export const SUPABASE_COOKIE = "sb_access_token";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();

  if (useSupabase) {
    const token = cookieStore.get(SUPABASE_COOKIE)?.value;
    if (!token) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data?.id !== "string" || typeof data?.email !== "string") return null;
      return { id: data.id, email: data.email, accessToken: token };
    } catch {
      return null;
    }
  }

  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const verified = verifySessionToken(token);
  if (!verified) return null;
  const user = findUserById(verified.userId);
  if (!user) return null;
  return { id: user.id, email: user.email };
}
