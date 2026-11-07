"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Activity, Search } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export default function ActivityLogPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100); // Ambil 100 log terbaru

      if (data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, [supabase]);

  const filteredLogs = logs.filter(
    (l) =>
      l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.related_transaction_id?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-accent" /> Activity Log
        </h1>
        <p className="text-slate-400 text-sm">
          Jejak audit seluruh aktivitas pengguna dalam sistem.
        </p>
      </div>

      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Cari user, aksi, atau no. nota..."
          className="neu-input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      <div className="neu-card !p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-max">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Waktu
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Pengguna
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Role
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Aksi
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  No. Nota Terkait
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Belum ada aktivitas tercatat.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4 text-slate-400">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="p-4 font-medium text-slate-200">
                      {log.user_name || "Sistem"}
                    </td>
                    <td className="p-4">
                      <span className="neu-badge bg-slate-800 text-[10px] uppercase text-slate-300">
                        {log.user_role || "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-accent">{log.action}</p>
                      <p className="text-xs text-slate-500">
                        {log.description}
                      </p>
                    </td>
                    <td className="p-4 font-medium">
                      {log.related_transaction_id || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
