"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
  Activity,
  ArrowRight,
  User,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: shoes } = await supabase
        .from("shoes")
        .select(
          `
          id, shoe_status, created_at, treatment_price,
          order:orders(id, invoice_number, order_date, updated_at, total_price, payment_status, payment_method, customer:customers(name)), 
          handover:order_handover(handed_over_at)
        `,
        )
        .order("created_at", { ascending: false });

      if (shoes) setRawData(shoes);

      const { data: logs } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (logs) setRecentLogs(logs);

      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const todayStats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });

    let pendapatanHariIni = 0;
    let totalTransaksiHariIni = 0;
    let antrean = 0;
    let dikerjakan = 0;
    let belumLunas = 0;

    const processedOrders = new Set();
    const uniqueOrdersToday = new Set();

    rawData.forEach((s) => {
      if (s.shoe_status === "menunggu_pengerjaan") antrean++;
      if (
        [
          "sedang_dikerjakan",
          "proses_pencucian",
          "proses_pengeringan",
          "proses_finishing",
        ].includes(s.shoe_status)
      )
        dikerjakan++;

      const orderId = s.order.id;
      const isPaid = s.order.payment_status === "paid";
      const paymentDate = new Date(s.order.updated_at || s.order.created_at)
        .toISOString()
        .split("T")[0];

      if (new Date(s.created_at).toISOString().split("T")[0] === todayStr) {
        if (!uniqueOrdersToday.has(orderId)) {
          uniqueOrdersToday.add(orderId);
          totalTransaksiHariIni++;
        }
      }

      if (isPaid && paymentDate === todayStr) {
        if (!processedOrders.has(orderId)) {
          pendapatanHariIni += Number(s.order.total_price);
          processedOrders.add(orderId);
        }
      }

      if (
        !isPaid &&
        new Date(s.created_at).toISOString().split("T")[0] === todayStr
      ) {
        if (!processedOrders.has(`unpaid-${orderId}`)) {
          belumLunas++;
          processedOrders.add(`unpaid-${orderId}`);
        }
      }
    });

    return {
      pendapatanHariIni,
      totalTransaksiHariIni,
      antrean,
      dikerjakan,
      belumLunas,
    };
  }, [rawData]);

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Clock className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto pb-10 overflow-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Halo, Admin</h1>
          <p className="text-slate-400 text-xs md:text-sm">
            Ringkasan operasional hari ini.
          </p>
        </div>
      </div>

      {/* 5 CARD STATISTIK */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
        <div className="neu-card border-l-4 border-l-accent p-3 md:p-5">
          <div className="flex items-center gap-2 text-accent mb-1 md:mb-2">
            <TrendingUp className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Pendapatan</p>
          </div>
          <p className="text-sm md:text-xl font-bold">
            Rp {todayStats.pendapatanHariIni.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="neu-card p-3 md:p-5">
          <div className="flex items-center gap-2 text-status-finishing mb-1 md:mb-2">
            <Package className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Transaksi</p>
          </div>
          <p className="text-sm md:text-xl font-bold">
            {todayStats.totalTransaksiHariIni}{" "}
            <span className="text-xs font-normal">Nota</span>
          </p>
        </div>
        <div className="neu-card p-3 md:p-5">
          <div className="flex items-center gap-2 text-slate-400 mb-1 md:mb-2">
            <Clock className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Antrean</p>
          </div>
          <p className="text-sm md:text-xl font-bold">
            {todayStats.antrean}{" "}
            <span className="text-xs font-normal">Psg</span>
          </p>
        </div>
        <div className="neu-card p-3 md:p-5">
          <div className="flex items-center gap-2 text-status-working mb-1 md:mb-2">
            <Activity className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Dikerjakan</p>
          </div>
          <p className="text-sm md:text-xl font-bold">
            {todayStats.dikerjakan}{" "}
            <span className="text-xs font-normal">Psg</span>
          </p>
        </div>
        <div className="neu-card border-l-4 border-l-red-500 p-3 md:p-5 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-red-400 mb-1 md:mb-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-[10px] font-semibold uppercase">Belum Lunas</p>
          </div>
          <p className="text-sm md:text-xl font-bold">
            {todayStats.belumLunas}{" "}
            <span className="text-xs font-normal">Nota</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Aktivitas Terbaru */}
        <div className="neu-card p-4 md:p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base md:text-lg font-bold text-accent">
              Aktivitas Terbaru
            </h2>
            <Link
              href="/dashboard/activity"
              className="text-xs md:text-sm text-slate-400 hover:text-accent flex items-center gap-1 transition-colors"
            >
              Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3 md:space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">
                Belum ada aktivitas.
              </p>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 text-xs md:text-sm border-b border-slate-800/50 pb-2 last:border-0"
                >
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">{log.action}</p>
                    <p className="text-[10px] md:text-xs text-slate-500">
                      {log.description}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-slate-600 mt-1 flex items-center gap-1">
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
        <div className="neu-card p-4 md:p-5">
          <h2 className="text-base md:text-lg font-bold text-accent mb-4">
            Status Pengerjaan
          </h2>
          <div className="space-y-2 md:space-y-3">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 md:p-3 rounded-lg">
              <span className="text-xs md:text-sm text-slate-300">
                Menunggu Pengerjaan
              </span>
              <span className="font-bold text-slate-400">
                {todayStats.antrean}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 md:p-3 rounded-lg">
              <span className="text-xs md:text-sm text-slate-300">
                Sedang Dikerjakan
              </span>
              <span className="font-bold text-status-working">
                {todayStats.dikerjakan}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 md:p-3 rounded-lg">
              <span className="text-xs md:text-sm text-slate-300">
                Selesai & Siap Diambil
              </span>
              <span className="font-bold text-accent">
                {
                  rawData.filter((s) =>
                    ["selesai_dicuci", "siap_diambil"].includes(s.shoe_status),
                  ).length
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
