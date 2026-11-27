import GeekArchiveApp from "../components/GeekArchiveApp";
import { demoModeAllowed, isSupabaseConfigured } from "../lib/supabase";

// A real deployment must be connected to Supabase. Rather than silently falling back
// to demo sign-in (where any password works), show the operator what's missing.
function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16 text-[#163126]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5E7A5E]">Geek Archive</p>
      <h1 className="mt-2 text-3xl font-bold">This site isn&apos;t connected yet</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#3E4F46]">
        Geek Archive needs its database before people can sign up. The site owner should set{" "}
        <code className="rounded bg-[#EEF4EE] px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-[#EEF4EE] px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and redeploy. See the
        README&apos;s &quot;Going live&quot; section.
      </p>
    </main>
  );
}

export default function HomePage() {
  if (!isSupabaseConfigured && !demoModeAllowed) return <SetupRequired />;
  return <GeekArchiveApp />;
}
