"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImagePlus, X, Loader2 } from "lucide-react";

const MAX = 4;

/**
 * Seleciona até 4 imagens, envia pro bucket forum-images do Supabase
 * Storage e devolve as URLs publicas via onChange. O upload exige
 * usuário autenticado (policy forum_images_upload).
 */
export function ImageUploader({
  urls,
  onChange,
  bucket = "forum-images",
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const remaining = MAX - urls.length;
    const chosen = Array.from(files).slice(0, remaining);
    if (chosen.length === 0) {
      setError(`Maximo de ${MAX} fotos por mensagem.`);
      return;
    }
    setUploading(true);
    const novos: string[] = [];
    for (const file of chosen) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) {
        setError("Each image must be 5 MB or smaller.");
        continue;
      }
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        setError("Could not upload the image. Please try again.");
        continue;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      novos.push(data.publicUrl);
    }
    onChange([...urls, ...novos]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {urls.map((u) => (
          <div key={u} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="anexo" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => onChange(urls.filter((x) => x !== u))}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-danger"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {urls.length < MAX && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-dim transition-colors hover:border-accent/50 hover:text-accent"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[10px]">{urls.length}/{MAX}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
