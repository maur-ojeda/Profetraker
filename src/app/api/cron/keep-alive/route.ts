import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  // Verify this is coming from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Simple query to wake up Supabase
  const { error } = await supabase
    .from("profesores")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
