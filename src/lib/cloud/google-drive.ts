import type { CloudProviderClient, CloudFolder, ProviderMeta } from "./providers";
import { PROVIDER_META } from "./providers";

const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";

const client: CloudProviderClient = {
  getMeta(): ProviderMeta {
    return PROVIDER_META.google_drive;
  },

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_DRIVE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description ?? "Token exchange failed");

    // Get user email
    let email: string | null = null;
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const user = await userRes.json();
      email = user.email ?? null;
    } catch { /* non-critical */ }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? null,
      email,
      scopes: SCOPES,
    };
  },

  async refreshAccessToken(refreshToken: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_DRIVE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description ?? "Token refresh failed");
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in ?? null,
    };
  },

  async listFolders(accessToken: string, parentFolderId?: string): Promise<CloudFolder[]> {
    const parent = parentFolderId ?? "root";
    const q = `'${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const params = new URLSearchParams({
      q,
      fields: "files(id,name,mimeType)",
      orderBy: "name",
      pageSize: "100",
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Failed to list folders");
    return (data.files ?? []).map((f: { id: string; name: string }) => ({
      id: f.id,
      name: f.name,
      path: f.name,
      hasChildren: true, // Google Drive doesn't tell us; we assume yes
    }));
  },

  async uploadFile(accessToken: string, folderId: string, filename: string, buffer: Buffer, mimeType: string) {
    const metadata = JSON.stringify({ name: filename, parents: [folderId] });
    const boundary = "sitelaunch_upload_boundary";
    const body = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${buffer.toString("base64")}\r\n`,
      `--${boundary}--`,
    ].join("");

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Upload failed");
    return { fileUrl: data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view` };
  },

  getFolderUrl(folderId: string): string {
    return `https://drive.google.com/drive/folders/${folderId}`;
  },
};

export default client;
