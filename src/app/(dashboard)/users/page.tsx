import React from "react";
import { getUsers } from "@/actions/users";
import { getCurrentUser } from "@/lib/auth";
import { UsersViewClient } from "@/components/users/users-view-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [users, currentUser] = await Promise.all([
    getUsers(),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-6">
      <UsersViewClient users={users} currentUserId={currentUser?.id} />
    </div>
  );
}
