"use client";

import { useState, useTransition } from "react";
import { sendMessage } from "@/actions/chat";
import { ImageUploader } from "@/components/forum/image-uploader";
import { Button } from "@/components/ui/button";
import { ImagePlus, Send } from "lucide-react";

export function MessageForm({ conversationId }: { conversationId: number }) {
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!body.trim() && images.length === 0) return;
    setError(null);
    start(async () => {
      const res = await sendMessage({ conversationId, body, images });
      if (res?.error) setError(res.error);
      else {
        setBody("");
        setImages([]);
        setShowUploader(false);
      }
    });
  }

  return (
    <div className="glass sticky bottom-0 rounded-2xl p-3">
      {showUploader && (
        <div className="mb-3">
          <ImageUploader urls={images} onChange={setImages} bucket="chat-images" />
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label="Attach photos"
          onClick={() => setShowUploader((v) => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-dim hover:border-accent/50 hover:text-accent"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Write a message..."
          className="max-h-32 min-h-10 flex-1 resize-y rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 outline-none focus:border-accent"
        />
        <Button onClick={submit} disabled={pending || (!body.trim() && images.length === 0)}
          className="h-10 shrink-0 px-4">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
