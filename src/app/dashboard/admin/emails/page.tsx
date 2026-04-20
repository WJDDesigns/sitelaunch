import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import EmailTemplatesEditor from "./EmailTemplatesEditor";

export default async function EmailTemplatesPage() {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { data: templates } = await admin
    .from("email_templates")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      <header>
        <Link
          href="/dashboard/admin"
          className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Platform
        </Link>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface mt-2">
          Email Templates
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage the branded email templates sent by linqme.
        </p>
      </header>

      <EmailTemplatesEditor templates={templates ?? []} />
    </div>
  );
}
