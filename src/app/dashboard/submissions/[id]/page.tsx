import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormSchema } from "@/lib/forms";
import SubmissionActions from "./SubmissionActions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SubmissionDetailPage({ params }: Props) {
  const { id } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: sub, error } = await supabase
    .from("submissions")
    .select(
      `id, status, data, client_name, client_email, submitted_at, created_at, access_token,
       partners ( id, name, slug, primary_color ),
       partner_forms ( id, form_templates ( schema ) )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !sub) notFound();
  const partner = Array.isArray(sub.partners) ? sub.partners[0] : sub.partners;
  const pf = Array.isArray(sub.partner_forms) ? sub.partner_forms[0] : sub.partner_forms;
  const tpl = pf && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  const schema = tpl?.schema as FormSchema | undefined;
  const data = (sub.data as Record<string, unknown>) ?? {};

  const { data: fileRows } = await supabase
    .from("submission_files")
    .select("id, field_key, filename, mime_type, size_bytes, storage_path, created_at")
    .eq("submission_id", sub.id)
    .order("created_at", { ascending: true });

  type FileRow = NonNullable<typeof fileRows>[number] & { url: string | null };
  const filesByField: Record<string, FileRow[]> = {};
  for (const f of fileRows ?? []) {
    const { data: signed } = await supabase.storage
      .from("submissions")
      .createSignedUrl(f.storage_path, 60 * 60);
    (filesByField[f.field_key] ||= []).push({ ...f, url: signed?.signedUrl ?? null });
  }

  function prettySize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8"><div className="max-w-3xl space-y-6">
      <header>
        <Link
          href="/dashboard/submissions"
          className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Submissions
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
              {sub.client_name || "Untitled submission"}
            </h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {sub.client_email || "\u2014"} &middot; {partner?.name ?? "Unknown partner"}
            </p>
          </div>
          <SubmissionActions submissionId={sub.id} currentStatus={sub.status} />
        </div>
      </header>

      <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-2 text-sm">
        <Row label="Received">
          {sub.submitted_at
            ? new Date(sub.submitted_at).toLocaleString()
            : `Draft (started ${new Date(sub.created_at).toLocaleDateString()})`}
        </Row>
        <Row label="Submission ID">
          <span className="font-mono text-xs text-on-surface-variant">{sub.id}</span>
        </Row>
      </div>

      <div className="bg-surface-container rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
        <div className="px-8 py-5 border-b border-outline-variant/10">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Responses</h2>
        </div>
        {schema ? (
          <div className="divide-y divide-outline-variant/5">
            {schema.steps.map((step) => (
              <section key={step.id} className="p-8">
                <h3 className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mb-4">
                  {step.title}
                </h3>
                <dl className="space-y-4">
                  {step.fields.map((f) => {
                    if (f.type === "file" || f.type === "files") {
                      const files = filesByField[f.id] ?? [];
                      return (
                        <div key={f.id} className="grid grid-cols-3 gap-4">
                          <dt className="text-xs text-on-surface-variant/60">{f.label}</dt>
                          <dd className="col-span-2">
                            {files.length === 0 ? (
                              <span className="text-sm text-on-surface-variant/40">&mdash;</span>
                            ) : (
                              <ul className="space-y-2">
                                {files.map((file) => (
                                  <li key={file.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-on-surface truncate">{file.filename}</div>
                                      <div className="text-xs text-on-surface-variant/60">
                                        {file.mime_type ?? "file"} &middot; {prettySize(file.size_bytes)}
                                      </div>
                                    </div>
                                    {file.url && (
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-bold text-primary hover:underline shrink-0"
                                      >
                                        Download <i className="fa-solid fa-download text-[10px] ml-1" />
                                      </a>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </dd>
                        </div>
                      );
                    }
                    const v = data[f.id];
                    const display =
                      v === undefined || v === null || v === ""
                        ? "\u2014"
                        : String(v);
                    return (
                      <div key={f.id} className="grid grid-cols-3 gap-4">
                        <dt className="text-xs text-on-surface-variant/60">{f.label}</dt>
                        <dd className="col-span-2 text-sm text-on-surface whitespace-pre-wrap">
                          {display}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ))}
          </div>
        ) : (
          <div className="p-8 text-sm text-on-surface-variant">No schema available.</div>
        )}
      </div>
    </div></div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-xs text-on-surface-variant/60">{label}</div>
      <div className="col-span-2 text-on-surface">{children}</div>
    </div>
  );
}
