export type CloudProvider = "google_drive" | "dropbox" | "onedrive" | "box";

export const ALL_PROVIDERS: CloudProvider[] = ["google_drive", "dropbox", "onedrive", "box"];

export interface CloudFolder {
  id: string;
  name: string;
  path: string;
  hasChildren: boolean;
}

export interface ProviderMeta {
  provider: CloudProvider;
  displayName: string;
  icon: string; // Font Awesome class
  color: string; // Tailwind color class for accent
}

export interface CloudProviderClient {
  getMeta(): ProviderMeta;
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number | null;
    email: string | null;
    scopes: string | null;
  }>;
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number | null;
    refreshToken?: string;
  }>;
  listFolders(accessToken: string, parentFolderId?: string): Promise<CloudFolder[]>;
  uploadFile(
    accessToken: string,
    folderId: string,
    filename: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ fileUrl: string }>;
  getFolderUrl(folderId: string): string;
}

export const PROVIDER_META: Record<CloudProvider, ProviderMeta> = {
  google_drive: {
    provider: "google_drive",
    displayName: "Google Drive",
    icon: "fa-brands fa-google-drive",
    color: "text-[#4285F4]",
  },
  dropbox: {
    provider: "dropbox",
    displayName: "Dropbox",
    icon: "fa-brands fa-dropbox",
    color: "text-[#0061FF]",
  },
  onedrive: {
    provider: "onedrive",
    displayName: "OneDrive",
    icon: "fa-brands fa-microsoft",
    color: "text-[#0078D4]",
  },
  box: {
    provider: "box",
    displayName: "Box",
    icon: "fa-solid fa-box",
    color: "text-[#0061D5]",
  },
};

// Dynamic import to avoid loading all clients at once
export async function getProviderClient(provider: CloudProvider): Promise<CloudProviderClient> {
  switch (provider) {
    case "google_drive":
      return (await import("./google-drive")).default;
    case "dropbox":
      return (await import("./dropbox")).default;
    case "onedrive":
      return (await import("./onedrive")).default;
    case "box":
      return (await import("./box")).default;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
