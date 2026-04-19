import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { createAdminClient } from "@/lib/supabase/admin";

const RP_NAME = "linqme";

/**
 * Derive the WebAuthn Relying Party ID.
 *
 * Rules:
 *  - RP ID must be a domain (no port, no scheme)
 *  - RP ID must equal or be a registrable suffix of the page's origin hostname
 *  - On localhost / lvh.me the RP ID must be "localhost"
 */
function getRpId(): string {
  if (process.env.PASSKEY_RP_ID) return process.env.PASSKEY_RP_ID;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").replace(/:\d+$/, "");

  // Actual localhost — RP ID must be "localhost"
  if (["localhost", "127.0.0.1", "0.0.0.0"].some(p => appUrl.includes(p) || rootDomain.includes(p))) {
    // But not if using lvh.me (which resolves to 127.0.0.1 but has its own hostname)
    if (!appUrl.includes("lvh.me") && !rootDomain.includes("lvh.me")) {
      return "localhost";
    }
  }

  // lvh.me: use "lvh.me" as RP ID (the browser is on app.lvh.me, so lvh.me is valid suffix)
  if (appUrl.includes("lvh.me") || rootDomain.includes("lvh.me")) {
    return "lvh.me";
  }

  if (rootDomain) return rootDomain;

  // Derive from APP_URL: "https://app.linqme.io" → "linqme.io"
  if (appUrl) {
    try {
      const hostname = new URL(appUrl).hostname;
      const parts = hostname.split(".");
      return parts.length > 2 ? parts.slice(1).join(".") : hostname;
    } catch { /* fall through */ }
  }

  return "linqme.io";
}

/**
 * Build the list of acceptable origins for WebAuthn verification.
 * Always includes the real request origin if provided.
 */
function getExpectedOrigins(requestOrigin?: string): string[] {
  const origins: string[] = [];
  const rpId = getRpId();

  if (requestOrigin) origins.push(requestOrigin);

  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""));
  }

  origins.push(`https://app.${rpId}`);
  origins.push(`https://${rpId}`);

  // Dev: localhost variants
  if (rpId === "localhost" || process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
    origins.push("http://localhost:3001");
    origins.push("http://127.0.0.1:3000");
    // lvh.me is a popular dev proxy for 127.0.0.1
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "";
    if (rootDomain.includes("lvh.me")) {
      const port = rootDomain.match(/:(\d+)$/)?.[1] || "3000";
      origins.push(`http://app.lvh.me:${port}`);
      origins.push(`http://lvh.me:${port}`);
    }
  }

  return [...new Set(origins)];
}

export interface StoredPasskey {
  id: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName: string | null;
  transports: string[];
  createdAt: string;
}

/**
 * Get all passkeys for a user
 */
export async function getUserPasskeys(userId: string): Promise<StoredPasskey[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_passkeys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[passkey] getUserPasskeys error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    credentialId: row.credential_id,
    publicKey: row.public_key,
    counter: row.counter,
    deviceName: row.device_name,
    transports: row.transports ?? [],
    createdAt: row.created_at,
  }));
}

/**
 * Generate registration options for a new passkey
 */
export async function getRegistrationOptions(userId: string, userEmail: string) {
  const existingPasskeys = await getUserPasskeys(userId);
  const rpId = getRpId();

  if (process.env.NODE_ENV === "development") console.log("[passkey] getRegistrationOptions -- rpId:", rpId);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  return options;
}

/**
 * Verify and store a new passkey registration.
 * Errors are thrown with descriptive messages for the client.
 */
export async function verifyAndStoreRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  deviceName?: string,
  requestOrigin?: string,
) {
  const rpId = getRpId();
  const origins = getExpectedOrigins(requestOrigin);

  if (process.env.NODE_ENV === "development") console.log("[passkey] verify registration -- rpId:", rpId);

  // Step 1: Verify the WebAuthn response
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origins,
      expectedRPID: rpId,
      requireUserVerification: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[passkey] verifyRegistrationResponse threw:", msg);
    throw new Error(`WebAuthn verification failed: ${msg}`);
  }

  if (!verification.verified || !verification.registrationInfo) {
    console.error("[passkey] verification returned false — verified:", verification.verified);
    throw new Error("Passkey verification returned unverified");
  }

  if (process.env.NODE_ENV === "development") console.log("[passkey] verification succeeded, storing credential...");

  // Step 2: Store the credential in the database
  const { credential } = verification.registrationInfo;

  const admin = createAdminClient();

  const credentialId = typeof credential.id === "string"
    ? credential.id
    : Buffer.from(credential.id).toString("base64url");

  const publicKey = Buffer.from(credential.publicKey).toString("base64url");

  const { error: insertError } = await admin.from("user_passkeys").insert({
    user_id: userId,
    credential_id: credentialId,
    public_key: publicKey,
    counter: credential.counter,
    device_name: deviceName || "Passkey",
    transports: response.response.transports ?? [],
  });

  if (insertError) {
    console.error("[passkey] DB insert failed:", insertError.message, insertError.details, insertError.hint);
    throw new Error(`Failed to store passkey: ${insertError.message}`);
  }

  if (process.env.NODE_ENV === "development") console.log("[passkey] credential stored, updating profile...");

  // Step 3: Mark MFA as enabled on the profile
  const { error: profileError } = await admin
    .from("profiles")
    .update({ mfa_enabled: true })
    .eq("id", userId);

  if (profileError) {
    console.error("[passkey] profile update failed:", profileError.message);
    // Non-fatal — passkey is stored, just the flag wasn't set
  }

  if (process.env.NODE_ENV === "development") console.log("[passkey] registration complete");
  return verification;
}

/**
 * Generate authentication options for passkey sign-in / MFA challenge
 */
export async function getAuthenticationOptions(userId: string) {
  const existingPasskeys = await getUserPasskeys(userId);

  if (existingPasskeys.length === 0) {
    throw new Error("No passkeys registered");
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    allowCredentials: existingPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports as AuthenticatorTransportFuture[],
    })),
    userVerification: "preferred",
  });

  return options;
}

/**
 * Verify a passkey authentication response
 */
export async function verifyAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  requestOrigin?: string,
) {
  const existingPasskeys = await getUserPasskeys(userId);
  const credId = response.id;
  const passkey = existingPasskeys.find((pk) => pk.credentialId === credId);

  if (!passkey) {
    throw new Error("Passkey not found");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigins(requestOrigin),
    expectedRPID: getRpId(),
    requireUserVerification: false,
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, "base64url"),
      counter: passkey.counter,
      transports: passkey.transports as AuthenticatorTransportFuture[],
    },
  });

  if (verification.verified) {
    const admin = createAdminClient();
    await admin
      .from("user_passkeys")
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq("credential_id", passkey.credentialId);
  }

  return verification;
}
