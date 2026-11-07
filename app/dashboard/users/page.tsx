"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, UserCog, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateRole = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
      toast.success("Role berhasil diperbarui!");
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kelola Pengguna</h1>
        <p className="text-slate-400 text-sm">
          Atur hak akses (role) untuk staf Anda.
        </p>
      </div>

      <div className="grid gap-4 mt-6">
        {users.map((u) => (
          <div
            key={u.id}
            className="neu-card flex flex-col md:flex-row justify-between md:items-center gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="neu-card-inset p-3 rounded-full">
                {u.role === "admin" ? (
                  <ShieldCheck className="w-6 h-6 text-accent" />
                ) : (
                  <UserIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <h3 className="font-bold">{u.full_name}</h3>
                <p className="text-sm text-slate-400">{u.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Role:</span>
              <select
                className="neu-input !py-2 !w-auto cursor-pointer capitalize"
                value={u.role}
                onChange={(e) => updateRole(u.id, e.target.value)}
                disabled={updatingId === u.id}
              >
                <option value="admin">Admin</option>
                <option value="cashier">Cashier</option>
                <option value="technician">Technician</option>
              </select>
              {updatingId === u.id && (
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
