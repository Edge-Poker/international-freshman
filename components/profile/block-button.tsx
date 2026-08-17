"use client";

import { useState, useTransition } from "react";
import { toggleBlock } from "@/actions/social";
import { Button } from "@/components/ui/button";
import { Ban, Undo2 } from "lucide-react";

export function BlockButton({
  userId,
  initialBlocked,
}: {
  userId: string;
  initialBlocked: boolean;
}) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function click() {
    if (!blocked && !confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 4000);
      return;
    }
    setConfirm(false);
    start(async () => {
      const res = await toggleBlock(userId);
      if (!res?.error) setBlocked((b) => !b);
    });
  }

  return (
    <Button variant="ghost" disabled={pending} onClick={click}
      className={blocked ? "" : "border-danger/40 text-danger hover:border-danger hover:text-danger"}>
      {blocked ? <Undo2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
      {pending ? "..." : blocked ? "Unblock" : confirm ? "Confirm block?" : "Block user"}
    </Button>
  );
}
