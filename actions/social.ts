"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleFollow(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };
  if (user.id === userId) return { error: "You cannot follow yourself." };

  const { data: existente } = await supabase
    .from("follows")
    .select("followed_id")
    .eq("follower_id", user.id)
    .eq("followed_id", userId)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("follows").delete()
        .eq("follower_id", user.id).eq("followed_id", userId)
    : await supabase.from("follows").insert({ follower_id: user.id, followed_id: userId });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, following: !existente };
}

export async function toggleBlock(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };
  if (user.id === userId) return { error: "You cannot block yourself." };

  const { data: existente } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("blocks").delete()
        .eq("blocker_id", user.id).eq("blocked_id", userId)
    : await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: userId });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, blocked: !existente };
}
