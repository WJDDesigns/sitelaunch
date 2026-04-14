import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  // Partners the user can access (members or superadmin)
  const { data: partners } = await supabase
    .from("partners")
    .select("id, slug, name, custom_domain, logo_url")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            {profile?.full_name || profile?.email} · {profile?.role}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-slate-600 hover:text-slate-900">Sign out</button>
        </form>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Partners</h2>
        {!partners || partners.length === 0 ? (
          <p className="text-sm text-slate-500">
            No partners yet. {profile?.role === "superadmin" && "Create one to get started."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {partners.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.custom_domain || `${p.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
