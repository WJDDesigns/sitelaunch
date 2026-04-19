import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/notifications — returns the current user's last 50 notifications.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[notifications] GET failed:", error.message);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }

  return NextResponse.json({ notifications: data });
}

/**
 * PATCH /api/notifications — mark notifications as read.
 * Body: { ids: string[] } or { all: true }
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.all === true) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("[notifications] PATCH mark-all failed:", error.message);
      return NextResponse.json({ error: "Failed to update notifications." }, { status: 500 });
    }
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .in("id", body.ids);

    if (error) {
      console.error("[notifications] PATCH mark-ids failed:", error.message);
      return NextResponse.json({ error: "Failed to update notifications." }, { status: 500 });
    }
  } else {
    return NextResponse.json(
      { error: "Provide { ids: string[] } or { all: true }" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
