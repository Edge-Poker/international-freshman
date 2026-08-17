"use client";

import { useState, useTransition } from "react";
import { toggleFollow } from "@/actions/social";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";

export function FollowButton({
  userId,
  initialFollowing,
}: {
  userId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();

  return (
    <Button
      variant={following ? "ghost" : "primary"}
      disabled={pending}
      onClick={() => {
        setFollowing((f) => !f);
        start(async () => {
          const res = await toggleFollow(userId);
          if (res?.error) setFollowing((f) => !f);
        });
      }}
    >
      {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? "Seguindo" : "Follow"}
    </Button>
  );
}
