import type { CloudProviderClient, CloudFolder, ProviderMeta } from "./providers";
import { PROVIDER_META } from "./providers";

const client: CloudProviderClient = {
  getMeta(): ProviderMeta {
    return PROVIDER_META.dropbox;
  },

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.DROPBOX_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      token_access_type: "offline",
      state,
    });
    return `https://www.dropbox.com/oauth2/authorize?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DROPBOX_CLIENT_ID ?? "",
        client_secret: process.env.DROPBOX_CLIENT_SECRET ?? "",
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
      const userRes = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
        method: "POST",
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
      scopes: data.scope ?? null,
    };
  },

  async refreshAccessToken(refreshToken: string) {
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DROPBOX_CLIENT_ID ?? "",
        client_secret: process.env.DROPBOX_CLIENT_SECRET ?? "",
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
    const path = parentFolderId || "";
    const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: path || "",
        include_non_downloadable_files: false,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_summary ?? "Failed to list folders");
    return (data.entries ?? [])
      .filter((e: { ".tag": string }) => e[".tag"] === "folder")
      .map((f: { id: string; name: string; path_display: string }) => ({
        id: f.path_display, // Dropbox uses path as identifier
        name: f.name,
        path: f.path_display,
        hasChildren: true,
      }));
  },

  async uploadFile(accessToken: string, folderId: string, filename: string, buffer: Buffer, _mimeType: string) {
    const path = `${folderId}/${filename}`;
    const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({
          path,
          mode: "add",
          autorename: true,
        }),
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(buffer),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_summary ?? "Upload failed");

    // Get a shared link for viewing
    let fileUrl = `https://www.dropbox.com/home${folderId}`;
    try {
      const linkRes = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: data.path_display }),
      });
      const linkData = await linkRes.json();
      if (linkData.url) fileUrl = linkData.url;
    } catch { /* use folder link as fallback */ }

    return { fileUrl };
  },

  getFolderUrl(folderId: string): string {
    return `https://www.dropbox.com/home${folderId}`;
  },
};

export default client;
