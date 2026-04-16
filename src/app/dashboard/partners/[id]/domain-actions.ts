"use server";

import { resolve } from "dns";
import { promisify } from "util";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const resolveCname = promisify(resolve);

export interface DomainCheckResult {
  status: "verified" | "pending" | "misconfigured" | "error";
  message: string;
  cnameTarget?: string;
}

const EXPECTED_TARGET = "cname.mysitelaunch.com";

export async function verifyDomainAction(
  partnerId: string,
  domain: string,
): Promise<DomainCheckResult> {
  await requireSession();

  // Validate that the caller actually owns this partner / is admin
  const supabase = await createClient();
  const { data: partner, error } = await supabase
    .from("partners")
    .select("custom_domain")
    .eq("id", partnerId)
    .maybeSingle();

  if (error || !partner) {
    return { status: "error", message: "Partner not found." };
  }

  if (!partner.custom_domain || partner.custom_domain !== domain) {
    return {
      status: "error",
      message: "Save your custom domain first, then verify.",
    };
  }

  try {
    // Node's dns.resolve with CNAME type
    const records: string[] = await new Promise((res, rej) => {
      resolve(domain, "CNAME", (err, addresses) => {
        if (err) rej(err);
        else res(addresses as string[]);
      });
    });

    if (!records || records.length === 0) {
      return {
        status: "pending",
        message: `No CNAME record found for ${domain}. It may take up to 48 hours for DNS changes to propagate.`,
      };
    }

    // Check if any record points to Vercel
    const match = records.find(
      (r) =>
        r.replace(/\.$/, "").toLowerCase() === EXPECTED_TARGET,
    );

    if (match) {
      return {
        status: "verified",
        message: `CNAME verified. ${domain} points to ${EXPECTED_TARGET}.`,
        cnameTarget: match.replace(/\.$/, ""),
      };
    }

    return {
      status: "misconfigured",
      message: `CNAME found but points to ${records[0].replace(/\.$/, "")} instead of ${EXPECTED_TARGET}.`,
      cnameTarget: records[0].replace(/\.$/, ""),
    };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "SERVFAIL") {
      return {
        status: "pending",
        message: `No DNS record found for ${domain} yet. Changes can take up to 48 hours to propagate.`,
      };
    }
    return {
      status: "error",
      message: `DNS lookup failed: ${(err as Error).message}`,
    };
  }
}
