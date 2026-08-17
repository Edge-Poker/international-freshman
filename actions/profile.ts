"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().max(60).optional().or(z.literal("")),
  nickname: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "Nickname: 3 to 20 letters, numbers or _ (no spaces)"),
  bio: z.string().trim().max(200, "Your bio can be at most 200 characters").optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export async function updateProfile(input: {
  name: string;
  nickname: string;
  bio: string;
  avatarUrl: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, nickname, bio, avatarUrl } = parsed.data;

  // nickname único (ignorando o próprio usuário)
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("nickname", nickname)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { error: "That nickname is already taken, pick another one." };

  const { error } = await supabase
    .from("profiles")
    .update({
      name: name || null,
      nickname,
      bio: bio || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

const prefsSchema = z.object({
  notifyMessages: z.boolean(),
  notifyMentions: z.boolean(),
  notifyOnlyMutuals: z.boolean(),
});

/** Salva as preferências de notificação e privacidade da conta. */
export async function savePrefs(input: {
  notifyMessages: boolean;
  notifyMentions: boolean;
  notifyOnlyMutuals: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid preferences." };

  const { error } = await supabase
    .from("profiles")
    .update({
      notify_messages: parsed.data.notifyMessages,
      notify_mentions: parsed.data.notifyMentions,
      notify_only_mutuals: parsed.data.notifyOnlyMutuals,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}
