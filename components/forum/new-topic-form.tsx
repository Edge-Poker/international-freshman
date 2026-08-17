"use client";

import { useState, useTransition } from "react";
import { createTopic } from "@/actions/forum";
import { ImageUploader } from "@/components/forum/image-uploader";
import { MentionTextarea } from "@/components/forum/mention-textarea";
import { Button } from "@/components/ui/button";
import type { ForumCategory } from "@/types/forum";

export function NewTopicForm({ categories }: { categories: ForumCategory[] }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createTopic({ categoryId, title, body, images });
      // sucesso redireciona no servidor; só tratamos erro aqui
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="card p-5 sm:p-6">
      <label className="block text-sm">
        <span className="text-dim">Categoria</span>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 outline-none focus:border-accent"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm">
        <span className="text-dim">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: How do I ask a professor for a recommendation letter?"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 outline-none focus:border-accent"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="text-dim">Message</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Write your question, or whatever you want to share..."
          className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-ink-900 p-3 outline-none focus:border-accent"
        />
      </label>

      <div className="mt-4">
        <p className="mb-2 text-sm text-dim">Photos (up to 4)</p>
        <ImageUploader urls={images} onChange={setImages} />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end">
        <Button onClick={submit} disabled={pending || title.trim().length < 4 || body.trim().length === 0}>
          {pending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
