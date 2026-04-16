import type { CloudProviderClient, CloudFolder, ProviderMeta } from "./providers";
import { PROVIDER_META } from "./providers";

const SCOPES = "Files.ReadWrite.All offline_access User.Read";

const client: CloudProviderClient = {
  getMeta(): ProviderMeta {
    return PROVIDER_META.onedrive;
  },

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.ONEDRIVE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      state,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.ONEDRIVE_CLIENT_ID ?? "",
        client_secret: process.env.ONEDRIVE_CLIENT_SECRET ?? "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        scope: SCOPES,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description ?? "Token exchange failed");

    // Get user email from Microsoft Graph
    let email: string | null = null;
    try {
      const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const user = await userRes.json();
      email = user.mail ?? user.userPrincipalName ?? null;
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
    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.ONEDRIVE_CLIENT_ID ?? "",
        client_secret: process.env.ONEDRIVE_CLIENT_SECRET ?? "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: SCOPES,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description ?? "Token refresh failed");
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in ?? null,
      refreshToken: data.refresh_token,
    };
  },

  async listFolders(accessToken: string, parentFolderId?: string): Promise<CloudFolder[]> {
    const endpoint = parentFolderId
      ? `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children?$filter=folder ne null&$orderby=name&$top=100`
      : "https://graph.microsoft.com/v1.0/me/drive/root/children?$filter=folder ne null&$orderby=name&$top=100";

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Failed to list folders");
    return (data.value ?? []).map((f: { id: string; name: string; parentReference?: { path?: string } }) => ({
      id: f.id,
      name: f.name,
      path: f.parentReference?.path ? `${f.parentReference.path}/${f.name}`.replace(/^\/drive\/root:/, "") : `/${f.name}`,
      hasChildren: true,
    }));
  },

  async uploadFile(accessToken: string, folderId: string, filename: string, buffer: Buffer, mimeType: string) {
    // For files under 4MB, use simple upload
    const endpoint = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(filename)}:/content`;
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": mimeType,
      },
      body: new Uint8Array(buffer),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Upload failed");
    return { fileUrl: data.webUrl ?? `https://onedrive.live.com/?id=${data.id}` };
  },

  getFolderUrl(folderId: string): string {
    return `https://onedrive.live.com/?id=${folderId}`;
  },
};

export default client;
