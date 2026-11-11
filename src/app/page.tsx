"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
  Activity,
  ArrowRight,
  User,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";

export default function DashboardPage() {
  // HAPUS: const supabase = createClient();
  const [loading, setLoading] = useState(true);

  // State Data Statistik
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    pending: 0,
    working: 0,
    doneWashing: 0,
    unpaidCount: 0,
  });

  // State Data Aktivitas Terbaru
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient(); // <-- PINDAHKAN KE SINI

      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Jakarta",
      });

      // 1. Hitung Statistik Hari Ini
      const { data: todayOrdersData } = await supabase
        .from("orders")
        .select("total_price, payment_status")
        .eq("order_date", today);

      const todayRevenue =
        todayOrdersData
          ?.filter((o) => o.payment_status === "paid")
          .reduce((sum, o) => sum + Number(o.total_price), 0) || 0;
      const unpaidCount =
        todayOrdersData?.filter((o) => o.payment_status === "unpaid").length ||
        0;

      const { count: pending } = await supabase
        .from("shoes")
        .select("*", { count: "exact", head: true })
        .eq("shoe_status", "menunggu_pengerjaan");
      const { count: working } = await supabase
        .from("shoes")
        .select("*", { count: "exact", head: true })
        .in("shoe_status", [
          "sedang_dikerjakan",
          "proses_pencucian",
          "proses_pengeringan",
          "proses_finishing",
        ]);
      const { count: doneWashing } = await supabase
        .from("shoes")
        .select("*", { count: "exact", head: true })
        .in("shoe_status", ["selesai_dicuci", "siap_diambil"]);

      setStats({
        todayRevenue,
        todayOrders: todayOrdersData?.length || 0,
        pending: pending || 0,
        working: working || 0,
        doneWashing: doneWashing || 0,
        unpaidCount,
      });

      // 2. Aktivitas Terbaru (Ambil dari activity_logs)
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (logs) setRecentLogs(logs);

      setLoading(false);
    };

    fetchData();
  }, []); // <-- Dependency array kosong (hanya jalan sekali)

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Clock className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 overflow-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">
            Halo, Operator (Mode Full Access)
          </h1>
          <p className="text-slate-400 text-sm">
            Berikut adalah ringkasan operasional hari ini.
          </p>
        </div>
      </div>

      {/* Statistik Utama */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="neu-card">
          <div className="flex items-center gap-2 text-accent mb-2">
            <TrendingUp className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Pendapatan</p>
          </div>
          <p className="text-xl font-bold">
            Rp {stats.todayRevenue.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="neu-card">
          <div className="flex items-center gap-2 text-status-finishing mb-2">
            <Package className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Transaksi</p>
          </div>
          <p className="text-xl font-bold">
            {stats.todayOrders}{" "}
            <span className="text-xs font-normal">Nota</span>
          </p>
        </div>
        <div className="neu-card">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Clock className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Antrean</p>
          </div>
          <p className="text-xl font-bold">
            {stats.pending} <span className="text-xs font-normal">Sepatu</span>
          </p>
        </div>
        <div className="neu-card">
          <div className="flex items-center gap-2 text-status-working mb-2">
            <Activity className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Dikerjakan</p>
          </div>
          <p className="text-xl font-bold">
            {stats.working} <span className="text-xs font-normal">Sepatu</span>
          </p>
        </div>
        <div className="neu-card border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Belum Lunas</p>
          </div>
          <p className="text-xl font-bold">
            {stats.unpaidCount}{" "}
            <span className="text-xs font-normal">Nota</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aktivitas Terbaru */}
        <div className="neu-card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-accent">Aktivitas Terbaru</h2>
            <Link
              href="/dashboard/activity"
              className="text-sm text-slate-400 hover:text-accent flex items-center gap-1 transition-colors"
            >
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">
                Belum ada aktivitas hari ini.
              </p>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 text-sm border-b border-slate-800/50 pb-3 last:border-0"
                >
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">{log.action}</p>
                    <p className="text-xs text-slate-500">{log.description}</p>
                    <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> {log.user_name} •{" "}
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Cepat */}
        <div className="neu-card">
          <h2 className="text-lg font-bold text-accent mb-4">
            Status Pengerjaan
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
              <span className="text-sm text-slate-300">
                Menunggu Pengerjaan
              </span>
              <span className="font-bold text-slate-400">{stats.pending}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
              <span className="text-sm text-slate-300">Sedang Dikerjakan</span>
              <span className="font-bold text-status-working">
                {stats.working}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
              <span className="text-sm text-slate-300">
                Selesai & Siap Diambil
              </span>
              <span className="font-bold text-accent">{stats.doneWashing}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
