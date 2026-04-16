import type { CloudProviderClient, CloudFolder, ProviderMeta } from "./providers";
import { PROVIDER_META } from "./providers";

const client: CloudProviderClient = {
  getMeta(): ProviderMeta {
    return PROVIDER_META.box;
  },

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.BOX_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });
    return `https://account.box.com/api/oauth2/authorize?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const res = await fetch("https://api.box.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.BOX_CLIENT_ID ?? "",
        client_secret: process.env.BOX_CLIENT_SECRET ?? "",
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
      const userRes = await fetch("https://api.box.com/2.0/users/me?fields=login", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const user = await userRes.json();
      email = user.login ?? null;
    } catch { /* non-critical */ }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? null,
      email,
      scopes: null,
    };
  },

  async refreshAccessToken(refreshToken: string) {
    const res = await fetch("https://api.box.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.BOX_CLIENT_ID ?? "",
        client_secret: process.env.BOX_CLIENT_SECRET ?? "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
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
    const folderId = parentFolderId ?? "0"; // Box root folder is "0"
    const res = await fetch(
      `https://api.box.com/2.0/folders/${folderId}/items?fields=id,name,type&limit=100&offset=0`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to list folders");
    return (data.entries ?? [])
      .filter((e: { type: string }) => e.type === "folder")
      .map((f: { id: string; name: string }) => ({
        id: f.id,
        name: f.name,
        path: `/${f.name}`,
        hasChildren: true,
      }));
  },

  async uploadFile(accessToken: string, folderId: string, filename: string, buffer: Buffer, _mimeType: string) {
    const form = new FormData();
    form.append("attributes", JSON.stringify({ name: filename, parent: { id: folderId } }));
    form.append("file", new Blob([new Uint8Array(buffer)]), filename);

    const res = await fetch("https://upload.box.com/api/2.0/files/content", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Upload failed");
    const fileId = data.entries?.[0]?.id;
    return { fileUrl: fileId ? `https://app.box.com/file/${fileId}` : `https://app.box.com/folder/${folderId}` };
  },

  getFolderUrl(folderId: string): string {
    return `https://app.box.com/folder/${folderId}`;
  },
};

export default client;
