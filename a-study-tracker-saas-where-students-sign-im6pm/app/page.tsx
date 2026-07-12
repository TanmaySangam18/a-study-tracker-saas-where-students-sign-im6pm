import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-zinc-900">Recall</span>
          <Link
            href="/login"
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition duration-150 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          See your study habits, one week at a time.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-500">
          Log every study session in seconds. Recall turns them into a clear weekly picture, so you
          always know where your time went.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition duration-150 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Get started
          </Link>
        </div>

        <dl className="mt-20 grid grid-cols-1 gap-8 border-t border-zinc-200 pt-12 text-left sm:grid-cols-3">
          <div>
            <dt className="text-sm font-semibold text-zinc-900">Log in seconds</dt>
            <dd className="mt-2 text-sm leading-6 text-zinc-500">
              Subject, duration, date. No timers to start or stop.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-zinc-900">Weekly view</dt>
            <dd className="mt-2 text-sm leading-6 text-zinc-500">
              A simple daily breakdown of exactly how much you studied.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-zinc-900">Just yours</dt>
            <dd className="mt-2 text-sm leading-6 text-zinc-500">
              Every account only ever sees its own sessions.
            </dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
