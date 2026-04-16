import { NextResponse } from "next/server";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { getProviderClient, ALL_PROVIDERS, type CloudProvider } from "@/lib/cloud/providers";
import { getValidAccessTokenByPartner } from "@/lib/cloud/token-refresh";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider: providerParam } = await params;
    const session = await requireSession();
    const account = await getCurrentAccount(session.userId);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 403 });

    if (!ALL_PROVIDERS.includes(providerParam as CloudProvider)) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }
    const provider = providerParam as CloudProvider;

    const tokenResult = await getValidAccessTokenByPartner(account.id, provider);
    if (!tokenResult) {
      return NextResponse.json({ error: "Not connected to this provider" }, { status: 400 });
    }

    const url = new URL(request.url);
    const parentId = url.searchParams.get("parentId") ?? undefined;

    const client = await getProviderClient(provider);
    const folders = await client.listFolders(tokenResult.accessToken, parentId);

    return NextResponse.json({ folders });
  } catch (err) {
    console.error("[cloud-folders] error:", err);
    return NextResponse.json({ error: "Failed to load folders" }, { status: 500 });
  }
}
