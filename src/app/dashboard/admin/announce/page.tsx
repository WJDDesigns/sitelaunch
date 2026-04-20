import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AnnouncementForm from "./AnnouncementForm";
import AnnouncementList from "./AnnouncementList";
import StatusUpdatesSection from "./StatusUpdatesSection";
import AnnounceTabs from "./AnnounceTabs";
import type { AnnouncementRow } from "./actions";
import { getStatusUpdates } from "./status-actions";

export default async function AnnouncePage() {
  await requireSuperadmin();

  const admin = createAdminClient();
  const { data: announcements } = await admin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const statusUpdates = await getStatusUpdates();

  const statusContent = (
    <StatusUpdatesSection statusUpdates={statusUpdates} />
  );

  const bannerContent = (
    <>
      {/* New announcement form */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          New announcement
        </h2>
        <AnnouncementForm />
      </section>

      {/* Existing announcements */}
      <section>
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          All announcements
        </h2>
        <AnnouncementList announcements={(announcements ?? []) as AnnouncementRow[]} />
      </section>
    </>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          <i className="fa-solid fa-bullhorn text-primary mr-3" />
          Announcements & Status
        </h1>
        <p className="text-on-surface-variant mt-1">
          Create dashboard banners and manage the public status page.
        </p>
      </header>

      <AnnounceTabs
        statusContent={statusContent}
        bannerContent={bannerContent}
      />
    </div>
  );
}
