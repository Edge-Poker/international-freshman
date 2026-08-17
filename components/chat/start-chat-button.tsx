"use client";

import { useState, useTransition } from "react";
import { startConversation } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function StartChatButton({ otherUserId }: { otherUserId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await startConversation(otherUserId);
            if (res?.error) setError(res.error);
          })
        }
      >
        <Send className="h-4 w-4" /> {pending ? "Abrindo..." : "Send message"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
