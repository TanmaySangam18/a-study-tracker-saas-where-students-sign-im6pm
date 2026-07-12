export type StudySession = {
  id: string;
  userId: string;
  subject: string;
  durationMinutes: number;
  studiedAt: string; // YYYY-MM-DD
  createdAt: string;
};

export type SessionUser = {
  id: string;
  email: string;
  /** Present only in Supabase mode; used as the Bearer token for RLS-scoped REST calls. */
  accessToken?: string;
};
