import Link from "next/link";

export default function LandingPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "/login";
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="text-xl font-semibold tracking-tight">SiteLaunch</div>
        <nav className="flex items-center gap-4">
          <Link href={appUrl} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Sign in
          </Link>
          <Link
            href={appUrl}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Client onboarding, launched.
          </h1>
          <p className="text-lg text-slate-600">
            A white-label onboarding platform for agencies. Collect everything you need
            to build a site — branding, content, files — in one guided, native-feeling flow.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href={appUrl}
              className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700"
            >
              Launch your first project
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SiteLaunch
      </footer>
    </main>
  );
}
