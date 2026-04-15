/**
 * Vercel Domains API — add/remove custom domains from the project automatically.
 *
 * Required env vars:
 *   VERCEL_API_TOKEN   — a Vercel personal access token or team token
 *   VERCEL_PROJECT_ID  — the project ID (found in Project Settings → General)
 *   VERCEL_TEAM_ID     — (optional) team/org ID if the project is under a team
 */

const API_BASE = "https://api.vercel.com";

function headers() {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN is not set.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function teamQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${teamId}` : "";
}

function projectId(): string {
  const id = process.env.VERCEL_PROJECT_ID;
  if (!id) throw new Error("VERCEL_PROJECT_ID is not set.");
  return id;
}

/**
 * Add a custom domain to the Vercel project.
 * Vercel will automatically provision an SSL certificate once DNS resolves.
 * Returns the recommended CNAME target for DNS configuration.
 */
export async function addDomainToVercel(
  domain: string,
): Promise<{ ok: boolean; error?: string; cnameTarget?: string }> {
  try {
    const res = await fetch(
      `${API_BASE}/v10/projects/${projectId()}/domains${teamQuery()}`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ name: domain }),
      },
    );

    const data = await res.json();

    const isOk = res.ok
      || data?.error?.code === "domain_already_in_use"
      || data?.error?.code === "domain_already_exists";

    if (!isOk) {
      return {
        ok: false,
        error: data?.error?.message ?? `Vercel API error: ${res.status}`,
      };
    }

    // Fetch the domain config to get the recommended CNAME target
    const cnameTarget = await getDomainCnameTarget(domain);

    return { ok: true, cnameTarget };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to register domain with hosting: ${(err as Error).message}`,
    };
  }
}

/**
 * Get the recommended CNAME target for a domain from Vercel's domain config API.
 */
async function getDomainCnameTarget(domain: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `${API_BASE}/v6/domains/${domain}/config${teamQuery()}`,
      { headers: headers() },
    );
    if (res.ok) {
      const data = await res.json();
      // cnames array contains the recommended CNAME targets
      if (data?.cnames?.length > 0) return data.cnames[0];
    }

    // Fallback: try the project domain endpoint
    const projRes = await fetch(
      `${API_BASE}/v9/projects/${projectId()}/domains/${domain}${teamQuery()}`,
      { headers: headers() },
    );
    if (projRes.ok) {
      const projData = await projRes.json();
      if (projData?.apexName) {
        // Vercel uses a project-specific CNAME like <hash>.vercel-dns-017.com
        // The verification array may contain it
        if (projData?.verification?.[0]?.value) {
          return projData.verification[0].value;
        }
      }
    }
  } catch {
    // Non-critical — fall back to default
  }
  return undefined;
}

/**
 * Remove a custom domain from the Vercel project.
 */
export async function removeDomainFromVercel(
  domain: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${API_BASE}/v9/projects/${projectId()}/domains/${domain}${teamQuery()}`,
      {
        method: "DELETE",
        headers: headers(),
      },
    );

    if (res.ok || res.status === 404) return { ok: true };

    const data = await res.json();
    return {
      ok: false,
      error: data?.error?.message ?? `Vercel API error: ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to remove domain from hosting: ${(err as Error).message}`,
    };
  }
}

/**
 * Check if the Vercel domain API is configured.
 */
export function isVercelConfigured(): boolean {
  return !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}
