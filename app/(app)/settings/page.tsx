import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/profile/settings-form";
import { PrefsForm } from "@/components/profile/prefs-form";
import { ResetProgressSection } from "@/components/profile/reset-progress-section";
import { RankBadge } from "@/components/profile/rank-badge";
import { coursePct } from "@/lib/format";
import Link from "next/link";

export const metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, nickname, bio, avatar_url, chapters_done, rank_parts, notify_messages, notify_mentions, notify_only_mutuals")
    .eq("id", user!.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
      <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Account settings</h1>
      <p className="mt-1 text-dim">
        Your nickname and photo appear in the forum and on your public profile.
      </p>
      <div className="mt-6">
        <SettingsForm
          initial={{
            name: profile?.name ?? "",
            nickname: profile?.nickname ?? "",
            bio: profile?.bio ?? "",
            avatarUrl: profile?.avatar_url ?? "",
          }}
        />
        <PrefsForm
          initial={{
            messages: profile?.notify_messages ?? true,
            mentions: profile?.notify_mentions ?? true,
            onlyMutuals: profile?.notify_only_mutuals ?? false,
          }}
        />
        <ResetProgressSection />
      </div>
    </main>
  );
}
