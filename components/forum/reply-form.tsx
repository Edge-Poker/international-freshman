"use client";

import { useState, useTransition } from "react";
import { createReply } from "@/actions/forum";
import { ImageUploader } from "@/components/forum/image-uploader";
import { MentionTextarea } from "@/components/forum/mention-textarea";
import { Button } from "@/components/ui/button";

export function ReplyForm({ topicId }: { topicId: number }) {
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createReply({ topicId, body, images });
      if (res?.error) setError(res.error);
      else {
        setBody("");
        setImages([]);
      }
    });
  }

  return (
    <div className="card p-5">
      <p className="mb-3 font-semibold">Responder</p>
      <MentionTextarea
        value={body}
        onChange={setBody}
        rows={4}
        placeholder="Write your reply... use @nickname to mention someone"
        className="w-full resize-y rounded-xl border border-white/10 bg-ink-900 p-3 outline-none focus:border-accent"
      />
      <div className="mt-3">
        <ImageUploader urls={images} onChange={setImages} />
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex justify-end">
        <Button onClick={submit} disabled={pending || body.trim().length === 0}>
          {pending ? "Sending..." : "Post reply"}
        </Button>
      </div>
    </div>
  );
}
