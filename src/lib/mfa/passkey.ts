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

const RP_NAME = "SiteLaunch";

function getRpId(): string {
  if (process.env.PASSKEY_RP_ID) return process.env.PASSKEY_RP_ID;

  // In development on localhost, the RP ID must be "localhost"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
    return "localhost";
  }

  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com").replace(/:\d+$/, "");
}

function getExpectedOrigins(): string[] {
  const origins: string[] = [];
  const rpId = getRpId();

  // Always include the configured app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Include common variants
  origins.push(`https://app.${rpId}`);
  origins.push(`https://${rpId}`);

  // Dev: include localhost origins
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
    origins.push("http://localhost:3001");
    origins.push("http://127.0.0.1:3000");
  }

  // Deduplicate
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
  const { data } = await admin
    .from("user_passkeys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

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

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
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
 * Verify and store a new passkey registration
 */
export async function verifyAndStoreRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  deviceName?: string,
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigins(),
    expectedRPID: getRpId(),
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Passkey registration verification failed");
  }

  const { credential } = verification.registrationInfo;

  const admin = createAdminClient();
  await admin.from("user_passkeys").insert({
    user_id: userId,
    credential_id: typeof credential.id === "string" ? credential.id : Buffer.from(credential.id).toString("base64url"),
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    device_name: deviceName || "Passkey",
    transports: response.response.transports ?? [],
  });

  // Mark MFA as enabled on the profile
  await admin
    .from("profiles")
    .update({ mfa_enabled: true })
    .eq("id", userId);

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
    expectedOrigin: getExpectedOrigins(),
    expectedRPID: getRpId(),
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, "base64url"),
      counter: passkey.counter,
      transports: passkey.transports as AuthenticatorTransportFuture[],
    },
  });

  if (verification.verified) {
    // Update counter
    const admin = createAdminClient();
    await admin
      .from("user_passkeys")
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq("credential_id", passkey.credentialId);
  }

  return verification;
}
