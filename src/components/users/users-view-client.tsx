"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Shield, ShieldCheck, Edit2, Trash2, X, Check, Key } from "lucide-react";
import { createUser, updateUser } from "@/actions/users";
import { toast } from "sonner";
import { Role, UserStatus } from "@prisma/client";

export function UsersViewClient({
  users,
  currentUserId,
}: {
  users: any[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Pagination State
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 10;
  const totalUserPages = Math.max(1, Math.ceil(users.length / userPageSize));
  const paginatedUsers = users.slice(
    (userPage - 1) * userPageSize,
    userPage * userPageSize
  );

  // New User State
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.STAFF);

  // Edit User State
  const [editFullName, setEditFullName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<Role>(Role.STAFF);
  const [editStatus, setEditStatus] = useState<UserStatus>(UserStatus.ACTIVE);

  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setEditFullName(u.fullName || "");
    setEditPassword("");
    setEditRole(u.role || Role.STAFF);
    setEditStatus(u.status || UserStatus.ACTIVE);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      try {
        await createUser({
          username: username.trim(),
          fullName: fullName.trim(),
          password: password.trim(),
          role,
        });

        toast.success(`User ${username} created!`);
        setShowNewModal(false);
        setUsername("");
        setFullName("");
        setPassword("");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to create user");
      }
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    startTransition(async () => {
      try {
        await updateUser({
          id: editingUser.id,
          fullName: editFullName.trim() || undefined,
          role: editRole,
          status: editStatus,
          password: editPassword.trim() ? editPassword.trim() : undefined,
        });

        toast.success(`User ${editingUser.username} updated successfully!`);
        setEditingUser(null);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update user");
      }
    });
  };

  const handleToggleStatus = async (userObj: any) => {
    const newStatus =
      userObj.status === UserStatus.ACTIVE ? UserStatus.DISABLED : UserStatus.ACTIVE;

    startTransition(async () => {
      try {
        await updateUser({
          id: userObj.id,
          status: newStatus,
        });
        toast.success(`User status changed to ${newStatus}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update user status");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-sm text-slate-500 mt-1">Team accounts and role permissions</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New User</span>
        </button>
      </div>

      {/* Users Table matching 16-27-31.png */}
      <div className="bg-white border border-[#ede8e1] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ede8e1] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#FAF8F5]/50">
                <th className="py-3.5 px-6">Username</th>
                <th className="py-3.5 px-5">Name</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">View</th>
                <th className="py-3.5 px-5">Edit</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e1]/60 text-sm">
              {paginatedUsers.map((u) => {
                const isCurrent = u.id === currentUserId;
                const canView = true;
                const canEdit = u.role === "ADMIN" || u.role === "SUPER_STAFF";

                return (
                  <tr key={u.id} className="hover:bg-[#FAF8F5]/50">
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                      <span>{u.username}</span>
                      {isCurrent && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          YOU
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-slate-700 font-medium">{u.fullName}</td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164e3f]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          {u.role === "ADMIN"
                            ? "Admin"
                            : u.role === "SUPER_STAFF"
                            ? "Super Staff"
                            : u.role === "STAFF"
                            ? "Staff"
                            : "Viewer"}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ring-1 ring-inset ring-current/10 ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-600 font-medium">
                      {canView ? "Yes" : "No"}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-600 font-medium">
                      {canEdit ? "Yes" : "No"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            title={u.status === "ACTIVE" ? "Disable User" : "Activate User"}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Users Pagination */}
        {totalUserPages > 1 && (
          <div className="p-4 border-t border-[#ede8e1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Showing {(userPage - 1) * userPageSize + 1} to{" "}
              {Math.min(userPage * userPageSize, users.length)} of{" "}
              {users.length} users
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={userPage <= 1}
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
              >
                Previous
              </button>
              <span className="px-2 py-1 font-semibold text-slate-700">
                Page {userPage} of {totalUserPages}
              </span>
              <button
                disabled={userPage >= totalUserPages}
                onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New User Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">New User Account</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Radwen Hossain"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. radwen"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-800"
                >
                  <option value={Role.ADMIN}>Admin (Full Access)</option>
                  <option value={Role.SUPER_STAFF}>Super Staff (Orders, Invoices, Accounts)</option>
                  <option value={Role.STAFF}>Staff (Orders & Image Uploads)</option>
                  <option value={Role.VIEWER}>Viewer (Read-only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">
                Edit User — {editingUser.username}
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-800"
                >
                  <option value={Role.ADMIN}>Admin (Full Access)</option>
                  <option value={Role.SUPER_STAFF}>Super Staff (Orders, Invoices, Accounts)</option>
                  <option value={Role.STAFF}>Staff (Orders & Image Uploads)</option>
                  <option value={Role.VIEWER}>Viewer (Read-only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-800"
                >
                  <option value={UserStatus.ACTIVE}>Active</option>
                  <option value={UserStatus.DISABLED}>Disabled</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
