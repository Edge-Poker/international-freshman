"use client";

import { useState, useTransition } from "react";
import { savePrefs } from "@/actions/profile";

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-dim">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/** Preferências de notificação e privacidade — salvam sozinhas ao alternar. */
export function PrefsForm({
  initial,
}: {
  initial: { messages: boolean; mentions: boolean; onlyMutuals: boolean };
}) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function update(next: typeof prefs) {
    setPrefs(next);
    setMsg(null);
    start(async () => {
      const res = await savePrefs({
        notifyMessages: next.messages,
        notifyMentions: next.mentions,
        notifyOnlyMutuals: next.onlyMutuals,
      });
      setMsg(res?.error ? res.error : "Preferences saved.");
    });
  }

  return (
    <div className="card mt-6 p-6">
      <h2 className="font-semibold">Notifications and privacy</h2>
      <div className="mt-2 divide-y divide-white/5">
        <Toggle
          label="Notificar novas mensagens privadas"
          checked={prefs.messages}
          onChange={(v) => update({ ...prefs, messages: v })}
        />
        <Toggle
          label="Notify me about forum mentions"
          hint="When someone mentions your @nickname in a post or reply"
          checked={prefs.mentions}
          onChange={(v) => update({ ...prefs, mentions: v })}
        />
        <Toggle
          label="Only get notifications from people you follow who follow you back"
          hint="With this on, messages and mentions from non-mutual followers will not notify you"
          checked={prefs.onlyMutuals}
          onChange={(v) => update({ ...prefs, onlyMutuals: v })}
        />
      </div>
      {msg && (
        <p className={`mt-2 text-sm ${msg.includes("salvas") ? "text-accent" : "text-danger"}`}>
          {pending ? "Salvando..." : msg}
        </p>
      )}
    </div>
  );
}
