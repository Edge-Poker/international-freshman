"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/actions/profile";
import { Avatar } from "@/components/profile/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";

export function SettingsForm({
  initial,
}: {
  initial: { name: string; nickname: string; bio: string; avatarUrl: string };
}) {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [nickname, setNickname] = useState(initial.nickname);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ error: "Your photo must be 5 MB or smaller." });
      return;
    }
    setUploading(true);
    setMsg({});
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600" });
    if (error) {
      setMsg({ error: "Could not upload the photo. Did you run migration 0005 in Supabase?" });
    } else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function save() {
    setMsg({});
    start(async () => {
      const res = await updateProfile({ name, nickname, bio, avatarUrl });
      if (res?.error) setMsg({ error: res.error });
      else {
        setMsg({ ok: "Salvo!" });
        router.refresh();
      }
    });
  }

  return (
    <div className="card p-5 sm:p-6">
      {/* foto */}
      <div className="flex items-center gap-5">
        <Avatar url={avatarUrl} name={nickname || name} size="lg" />
        <div>
          <Button variant="ghost" type="button" disabled={uploading}
            onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {avatarUrl ? "Change photo" : "Add photo"}
          </Button>
          <p className="mt-2 text-xs text-dim">JPG or PNG, up to 5 MB.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => uploadAvatar(e.target.files?.[0])} />
      </div>

      <label className="mt-6 block text-sm">
        <span className="text-dim">Nickname (required, becomes your @ in posts)</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          placeholder="Ex: PedroPro"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 outline-none focus:border-accent"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="text-dim">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 outline-none focus:border-accent"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="text-dim">Bio (optional, up to 200 characters)</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Ex: Grinder de NL10, estudando ranges e ICM."
          className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-ink-900 p-3 outline-none focus:border-accent"
        />
        <span className="mt-1 block text-right font-mono text-xs text-dim">{bio.length}/200</span>
      </label>

      {msg.error && <p className="mt-3 text-sm text-danger">{msg.error}</p>}
      {msg.ok && <p className="mt-3 text-sm text-accent">{msg.ok}</p>}

      <div className="mt-5 flex justify-end">
        <Button onClick={save} disabled={pending || uploading || nickname.trim().length < 3}>
          {pending ? "Salvando..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
