import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();

  // isso sincroniza cookies e finaliza o login
  await supabase.auth.exchangeCodeForSession(req.url);

  return NextResponse.redirect("/");
}
