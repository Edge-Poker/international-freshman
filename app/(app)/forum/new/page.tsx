import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { NewTopicForm } from "@/components/forum/new-topic-form";
import type { ForumCategory } from "@/types/forum";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "New post" };

export default async function NewPostPage() {
  const { supabase } = await requirePremium();
  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, slug, title, description")
    .order("position");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
      <Link href="/forum" className="inline-flex items-center gap-2 text-sm text-dim hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to forum
      </Link>
      <h1 className="mt-4 font-display text-2xl font-black tracking-tight sm:text-3xl">New post</h1>
      <p className="mt-1 text-dim">A question, something you figured out, or anything worth sharing with other students.</p>
      <div className="mt-6">
        <NewTopicForm categories={(categories ?? []) as ForumCategory[]} />
      </div>
    </main>
  );
}
