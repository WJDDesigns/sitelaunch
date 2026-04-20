import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormSchema } from "@/lib/forms";
import { PROVIDER_META, type CloudProvider } from "@/lib/cloud/providers";
import SubmissionActions from "./SubmissionActions";
import SubmissionTabs from "./SubmissionTabs";

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

  // Load cloud sync logs
  const { data: syncLogs } = await supabase
    .from("cloud_sync_log")
    .select("field_key, cloud_folder_url, status, cloud_integrations:integration_id ( provider )")
    .eq("submission_id", sub.id);

  const cloudSyncByField: Record<string, { provider: string; folderUrl: string | null; status: string }> = {};
  for (const log of syncLogs ?? []) {
    const ci = Array.isArray(log.cloud_integrations) ? log.cloud_integrations[0] : log.cloud_integrations;
    cloudSyncByField[log.field_key] = {
      provider: (ci as { provider?: string } | null)?.provider ?? "unknown",
      folderUrl: log.cloud_folder_url,
      status: log.status,
    };
  }

  type FileRow = NonNullable<typeof fileRows>[number] & { url: string | null };
  const filesByField: Record<string, FileRow[]> = {};
  const allFiles: (FileRow & { fieldLabel: string })[] = [];

  if ((fileRows ?? []).length > 0) {
    const { data: signedResults } = await supabase.storage
      .from("submissions")
      .createSignedUrls(
        fileRows!.map((f) => f.storage_path),
        60 * 60,
      );

    const urlByPath: Record<string, string | null> = {};
    for (const r of signedResults ?? []) {
      if (r.path) urlByPath[r.path] = r.signedUrl ?? null;
    }

    for (const f of fileRows!) {
      const enriched: FileRow = { ...f, url: urlByPath[f.storage_path] ?? null };
      (filesByField[f.field_key] ||= []).push(enriched);

      // Find field label from schema
      let fieldLabel = f.field_key;
      if (schema) {
        for (const step of schema.steps) {
          const field = step.fields.find((fd) => fd.id === f.field_key);
          if (field) { fieldLabel = field.label; break; }
        }
      }
      allFiles.push({ ...enriched, fieldLabel });
    }
  }

  function prettySize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const totalFileSize = allFiles.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0);
  const hasFiles = allFiles.length > 0;

  /* ── Build field label lookup for cloud sync ── */
  const featureLabels: Record<string, string> = {
    contactForm: "Contact Form", callToAction: "CTA", liveChat: "Live Chat",
    blog: "Blog", testimonials: "Testimonials", video: "Video", mobileResponsive: "Mobile Ready",
  };

  /* ── Responses tab content ── */
  const responsesContent = schema ? (
    <div className="divide-y divide-outline-variant/5">
      {schema.steps.map((step) => (
        <section key={step.id} className="p-5 sm:p-8">
          <h3 className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mb-4">
            {step.title}
          </h3>
          <dl className="space-y-4">
            {step.fields.map((f) => {
              if (f.type === "file" || f.type === "files") {
                const files = filesByField[f.id] ?? [];
                return (
                  <div key={f.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                    <dt className="text-xs text-on-surface-variant/60">{f.label}</dt>
                    <dd className="sm:col-span-2">
                      {files.length === 0 ? (
                        <span className="text-sm text-on-surface-variant/40">&mdash;</span>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-on-surface">
                          <i className="fa-solid fa-paperclip text-[10px] text-on-surface-variant/40" />
                          <span>{files.length} file{files.length !== 1 ? "s" : ""}</span>
                          <span className="text-xs text-on-surface-variant/40">&middot; {prettySize(files.reduce((s, fl) => s + (fl.size_bytes ?? 0), 0))}</span>
                          {hasFiles && (
                            <span className="text-[10px] text-primary font-medium">&mdash; see Files tab</span>
                          )}
                        </div>
                      )}
                      {cloudSyncByField[f.id] && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <i className={`${PROVIDER_META[cloudSyncByField[f.id].provider as CloudProvider]?.icon ?? "fa-solid fa-cloud"} ${PROVIDER_META[cloudSyncByField[f.id].provider as CloudProvider]?.color ?? "text-primary"}`} />
                          {cloudSyncByField[f.id].status === "synced" && cloudSyncByField[f.id].folderUrl ? (
                            <a
                              href={cloudSyncByField[f.id].folderUrl!}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-medium"
                            >
                              View in {PROVIDER_META[cloudSyncByField[f.id].provider as CloudProvider]?.displayName ?? "Cloud"}
                              <i className="fa-solid fa-arrow-up-right-from-square text-[9px] ml-1" />
                            </a>
                          ) : cloudSyncByField[f.id].status === "failed" ? (
                            <span className="text-error font-medium">Cloud sync failed</span>
                          ) : (
                            <span className="text-on-surface-variant/60">Syncing to cloud...</span>
                          )}
                        </div>
                      )}
                    </dd>
                  </div>
                );
              }
              const v = data[f.id];

              /* ── Competitor Analyzer — rich rendering ── */
              if (f.type === "competitor_analyzer") {
                let competitors: { url: string; notes?: string; analysis?: {
                  title?: string | null; description?: string | null;
                  techStack?: string[]; socialLinks?: string[];
                  features?: Record<string, boolean>;
                  aiSnapshot?: string | null; navLinks?: string[];
                }}[] = [];
                try {
                  const raw = typeof v === "string" && v ? JSON.parse(v) : v;
                  competitors = Array.isArray(raw) ? raw : [];
                } catch { /* empty */ }

                if (competitors.length === 0) {
                  return (
                    <div key={f.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <dt className="text-xs text-on-surface-variant/60">{f.label}</dt>
                      <dd className="sm:col-span-2 text-sm text-on-surface-variant/40">&mdash;</dd>
                    </div>
                  );
                }

                return (
                  <div key={f.id}>
                    <dt className="text-xs text-on-surface-variant/60 mb-3">{f.label}</dt>
                    <dd className="space-y-4">
                      {competitors.map((comp, ci) => (
                        <div key={ci} className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 overflow-hidden">
                          <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-on-surface-variant/60 bg-surface-container">
                              {ci + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-on-surface truncate">
                                {comp.analysis?.title || comp.url}
                              </p>
                              <a href={comp.url} target="_blank" rel="noreferrer"
                                className="text-xs text-primary hover:underline truncate block">
                                {comp.url} <i className="fa-solid fa-arrow-up-right-from-square text-[8px] ml-0.5" />
                              </a>
                            </div>
                          </div>

                          <div className="px-5 py-4 space-y-3">
                            {comp.analysis?.description && (
                              <p className="text-sm text-on-surface-variant leading-relaxed">{comp.analysis.description}</p>
                            )}
                            {((comp.analysis?.techStack && comp.analysis.techStack.length > 0) || (comp.analysis?.socialLinks && comp.analysis.socialLinks.length > 0)) && (
                              <div className="flex flex-wrap gap-1.5">
                                {comp.analysis?.techStack?.map((t, i) => (
                                  <span key={`t-${i}`} className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-primary/10 text-primary">{t}</span>
                                ))}
                                {comp.analysis?.socialLinks?.map((s, i) => (
                                  <span key={`s-${i}`} className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">{s}</span>
                                ))}
                              </div>
                            )}
                            {comp.analysis?.features && Object.values(comp.analysis.features).some(Boolean) && (
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(comp.analysis.features).filter(([, v]) => v).map(([key]) => (
                                  <span key={key} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium flex items-center gap-1">
                                    <i className="fa-solid fa-check text-[7px]" />
                                    {featureLabels[key] ?? key}
                                  </span>
                                ))}
                              </div>
                            )}
                            {comp.analysis?.aiSnapshot && (
                              <div className="rounded-lg bg-surface-container/50 p-4 border border-outline-variant/10">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <i className="fa-solid fa-wand-magic-sparkles text-[9px] text-primary" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">AI Analysis</span>
                                </div>
                                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line">
                                  {comp.analysis.aiSnapshot}
                                </p>
                              </div>
                            )}
                            {!comp.analysis?.aiSnapshot && comp.analysis?.navLinks && comp.analysis.navLinks.length > 0 && (
                              <div>
                                <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Navigation</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {comp.analysis.navLinks.map((l, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">{l}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {comp.notes && (
                              <div className="pt-2 border-t border-outline-variant/10">
                                <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Client Notes</span>
                                <p className="text-sm text-on-surface mt-0.5 whitespace-pre-wrap">{comp.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </dd>
                  </div>
                );
              }

              /* ── Default field rendering ── */
              const display =
                v === undefined || v === null || v === ""
                  ? "\u2014"
                  : typeof v === "object" ? JSON.stringify(v) : String(v);
              return (
                <div key={f.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <dt className="text-xs text-on-surface-variant/60">{f.label}</dt>
                  <dd className="sm:col-span-2 text-sm text-on-surface whitespace-pre-wrap">
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
  );

  /* ── Files tab content ── */
  // Group files by their field label
  const fileGroups: { fieldLabel: string; fieldId: string; files: FileRow[] }[] = [];
  if (schema) {
    for (const step of schema.steps) {
      for (const f of step.fields) {
        if ((f.type === "file" || f.type === "files") && filesByField[f.id]?.length) {
          fileGroups.push({ fieldLabel: f.label, fieldId: f.id, files: filesByField[f.id] });
        }
      }
    }
  }

  // File type icon helper
  function mimeIcon(mime: string | null): string {
    if (!mime) return "fa-file";
    if (mime.startsWith("image/")) return "fa-file-image";
    if (mime.includes("pdf")) return "fa-file-pdf";
    if (mime.includes("word") || mime.includes("document")) return "fa-file-word";
    if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "fa-file-excel";
    if (mime.includes("presentation") || mime.includes("powerpoint")) return "fa-file-powerpoint";
    if (mime.startsWith("video/")) return "fa-file-video";
    if (mime.startsWith("audio/")) return "fa-file-audio";
    if (mime.includes("zip") || mime.includes("archive") || mime.includes("compressed")) return "fa-file-zipper";
    if (mime.includes("text/") || mime.includes("json") || mime.includes("xml")) return "fa-file-code";
    return "fa-file";
  }

  function mimeColor(mime: string | null): string {
    if (!mime) return "text-on-surface-variant/50";
    if (mime.startsWith("image/")) return "text-primary";
    if (mime.includes("pdf")) return "text-error";
    if (mime.includes("word") || mime.includes("document")) return "text-blue-400";
    if (mime.includes("sheet") || mime.includes("excel")) return "text-emerald-400";
    if (mime.startsWith("video/")) return "text-purple-400";
    if (mime.startsWith("audio/")) return "text-amber-400";
    return "text-on-surface-variant/50";
  }

  const filesContent = (
    <div className="p-5 sm:p-8">
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="fa-solid fa-paperclip text-primary text-sm" />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">{allFiles.length} file{allFiles.length !== 1 ? "s" : ""}</p>
            <p className="text-[10px] text-on-surface-variant/50">{prettySize(totalFileSize)} total</p>
          </div>
        </div>
      </div>

      {/* File groups by field */}
      <div className="space-y-6">
        {fileGroups.map((group) => (
          <div key={group.fieldId}>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{group.fieldLabel}</h4>
              <span className="text-[10px] text-on-surface-variant/40">{group.files.length} file{group.files.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="space-y-2">
              {group.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl bg-surface-container-low/50 border border-outline-variant/[0.06] hover:border-primary/15 transition-all group"
                >
                  {/* File icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-surface-container shrink-0`}>
                    <i className={`fa-solid ${mimeIcon(file.mime_type)} ${mimeColor(file.mime_type)} text-base`} />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{file.filename}</p>
                    <p className="text-xs text-on-surface-variant/50">
                      {file.mime_type ?? "file"}
                      {file.size_bytes ? ` \u00B7 ${prettySize(file.size_bytes)}` : ""}
                      {file.created_at ? ` \u00B7 ${new Date(file.created_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>

                  {/* Preview thumbnail for images */}
                  {file.url && file.mime_type?.startsWith("image/") && (
                    <a href={file.url} target="_blank" rel="noreferrer" className="shrink-0 hidden sm:block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="w-10 h-10 rounded-lg object-cover border border-outline-variant/10"
                      />
                    </a>
                  )}

                  {/* Download button */}
                  {file.url && (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 transition-all"
                      title="Download"
                    >
                      <i className="fa-solid fa-download text-sm" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Cloud sync status */}
            {cloudSyncByField[group.fieldId] && (
              <div className="mt-2 ml-14 flex items-center gap-2 text-xs">
                <i className={`${PROVIDER_META[cloudSyncByField[group.fieldId].provider as CloudProvider]?.icon ?? "fa-solid fa-cloud"} ${PROVIDER_META[cloudSyncByField[group.fieldId].provider as CloudProvider]?.color ?? "text-primary"}`} />
                {cloudSyncByField[group.fieldId].status === "synced" && cloudSyncByField[group.fieldId].folderUrl ? (
                  <a
                    href={cloudSyncByField[group.fieldId].folderUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    View in {PROVIDER_META[cloudSyncByField[group.fieldId].provider as CloudProvider]?.displayName ?? "Cloud"}
                    <i className="fa-solid fa-arrow-up-right-from-square text-[9px] ml-1" />
                  </a>
                ) : cloudSyncByField[group.fieldId].status === "failed" ? (
                  <span className="text-error font-medium">Cloud sync failed</span>
                ) : (
                  <span className="text-on-surface-variant/60">Syncing to cloud...</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8"><div className="max-w-3xl space-y-6">
      <header>
        <Link
          href="/dashboard/submissions"
          className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Submissions
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-headline tracking-tight text-on-surface">
              {sub.client_name || "Untitled submission"}
            </h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {sub.client_email || "\u2014"} &middot; {partner?.name ?? "Unknown partner"}
            </p>
          </div>
          <SubmissionActions submissionId={sub.id} currentStatus={sub.status} />
        </div>
      </header>

      <div className="glass-panel rounded-2xl border border-outline-variant/15 p-4 sm:p-6 space-y-2 text-sm">
        <Row label="Received">
          {sub.submitted_at
            ? new Date(sub.submitted_at).toLocaleString()
            : `Draft (started ${new Date(sub.created_at).toLocaleDateString()})`}
        </Row>
        <Row label="Submission ID">
          <span className="font-mono text-xs text-on-surface-variant">{sub.id}</span>
        </Row>
      </div>

      {hasFiles ? (
        <SubmissionTabs
          responsesContent={responsesContent}
          filesContent={filesContent}
          fileCount={allFiles.length}
        />
      ) : (
        <div className="bg-surface-container rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
          <div className="px-5 sm:px-8 py-5 border-b border-outline-variant/10">
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Responses</h2>
          </div>
          {responsesContent}
        </div>
      )}
    </div></div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
      <div className="text-xs text-on-surface-variant/60">{label}</div>
      <div className="sm:col-span-2 text-on-surface">{children}</div>
    </div>
  );
}
