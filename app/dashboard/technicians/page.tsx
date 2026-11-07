"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, CheckCircle2, Clock, Search } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function TechniciansPage() {
  const supabase = createClient();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // 1. Ambil semua user dengan role teknisi
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "technician");

      // 2. Ambil semua riwayat penugasan
      const { data: tasks } = await supabase.from("shoe_assignments").select(`
          id, technician_id, started_at, completed_at, assignment_status,
          shoe:shoes!inner(shoe_status, brand, shoe_type, order:orders(invoice_number))
        `);

      if (profiles) setTechnicians(profiles);
      if (tasks) setAssignments(tasks);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  // Hitung Statistik per Teknisi
  const techStats = useMemo(() => {
    return technicians.map((tech) => {
      const techTasks = assignments.filter((a) => a.technician_id === tech.id);

      const activeTasks = techTasks.filter(
        (a) => a.assignment_status === "active",
      ).length;
      const completedTasks = techTasks.filter(
        (a) => a.assignment_status === "completed",
      );

      // Hitung rata-rata durasi (dalam jam)
      let totalDurationHours = 0;
      completedTasks.forEach((t) => {
        if (t.started_at && t.completed_at) {
          const start = new Date(t.started_at).getTime();
          const end = new Date(t.completed_at).getTime();
          totalDurationHours += (end - start) / (1000 * 60 * 60);
        }
      });
      const avgDuration =
        completedTasks.length > 0
          ? (totalDurationHours / completedTasks.length).toFixed(1)
          : "0";

      return {
        ...tech,
        activeTasks,
        completedTasks: completedTasks.length,
        avgDuration,
      };
    });
  }, [technicians, assignments]);

  const filteredStats = techStats.filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()),
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
        <h1 className="text-2xl font-bold">Monitoring Teknisi</h1>
        <p className="text-slate-400 text-sm">
          Pantau performa dan beban kerja masing-masing teknisi.
        </p>
      </div>

      {/* Ringkasan Atas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="neu-card">
          <div className="flex items-center gap-2 text-accent mb-2">
            <Users className="w-5 h-5" />
            <p className="text-sm font-semibold uppercase">Total Teknisi</p>
          </div>
          <p className="text-3xl font-bold">{technicians.length}</p>
        </div>
        <div className="neu-card">
          <div className="flex items-center gap-2 text-status-working mb-2">
            <Clock className="w-5 h-5" />
            <p className="text-sm font-semibold uppercase">
              Sepatu Sedang Dikerjakan
            </p>
          </div>
          <p className="text-3xl font-bold">
            {assignments.filter((a) => a.assignment_status === "active").length}
          </p>
        </div>
        <div className="neu-card">
          <div className="flex items-center gap-2 text-status-done mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-semibold uppercase">
              Total Sepatu Selesai
            </p>
          </div>
          <p className="text-3xl font-bold">
            {
              assignments.filter((a) => a.assignment_status === "completed")
                .length
            }
          </p>
        </div>
      </div>

      {/* Pencarian */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Cari nama teknisi..."
          className="neu-input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {/* Tabel Performa */}
      <div className="neu-card !p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-max">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Nama Teknisi
                </th>
                <th className="p-4 font-semibold border-b border-slate-700 text-center">
                  Pengerjaan Aktif
                </th>
                <th className="p-4 font-semibold border-b border-slate-700 text-center">
                  Total Selesai
                </th>
                <th className="p-4 font-semibold border-b border-slate-700 text-center">
                  Rata-rata Waktu
                </th>
                <th className="p-4 font-semibold border-b border-slate-700 text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStats.map((tech) => (
                <tr
                  key={tech.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-4 font-semibold text-accent">
                    {tech.full_name}
                  </td>
                  <td className="p-4 text-center">
                    <span className="neu-badge bg-amber-500/10 text-amber-400">
                      {tech.activeTasks}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="neu-badge bg-green-500/10 text-green-400">
                      {tech.completedTasks}
                    </span>
                  </td>
                  <td className="p-4 text-center font-medium">
                    {tech.avgDuration} Jam
                  </td>
                  <td className="p-4 text-center">
                    <button className="text-accent hover:underline text-sm">
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
