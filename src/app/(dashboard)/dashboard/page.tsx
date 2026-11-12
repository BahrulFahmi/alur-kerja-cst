"use client";
import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    pending: 0,
    working: 0,
    doneWashing: 0,
    unpaidCount: 0,
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();

        if (data.stats) setStats(data.stats);
        if (data.recentLogs) setRecentLogs(data.recentLogs);
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
          <h1 className="text-2xl font-bold">Halo, Operator</h1>
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
              href="/activity"
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
                      <User className="w-3 h-3" /> {log.userName} •{" "}
                      {formatDateTime(log.createdAt)}
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
