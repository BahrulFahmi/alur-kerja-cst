"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Download,
  Search,
  Printer,
  Package,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import Link from "next/link";

export default function HistoryPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);

  // State Filter
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState("");

  // Batas Tanggal (Bulan Berjalan)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
  const todayStr = now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });

  const [dateStart, setDateStart] = useState(firstDayOfMonth);
  const [dateEnd, setDateEnd] = useState(lastDayOfMonth);

  useEffect(() => {
    const fetchData = async () => {
      const { data: shoes } = await supabase
        .from("shoes")
        .select(
          `
          id, brand, shoe_type, shoe_status, created_at, 
          order:orders(id, invoice_number, order_date, total_price, payment_status, customer:customers(name, whatsapp)), 
          treatment:treatments(name), 
          assignment:shoe_assignments(technician:profiles(full_name)),
          handover:order_handover(handed_over_at)
        `,
        )
        .order("created_at", { ascending: false });

      if (shoes) setRawData(shoes);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  // Statistik
  const stats = useMemo(() => {
    let revenueToday = 0;
    let masukBulanIni = 0;
    let diambilBulanIni = 0;
    let belumDiambilTotal = 0;

    rawData.forEach((shoe) => {
      // 1. Statistik Permanen (Semua Bulan)
      if (shoe.shoe_status !== "sudah_diambil") {
        belumDiambilTotal++;
      }

      // 2. Statistik Waktu (Bulan Ini)
      const shoeDateStr = new Date(shoe.created_at).toISOString().split("T")[0];

      // Pendapatan Hari Ini (Lunas)
      if (shoeDateStr === todayStr && shoe.order.payment_status === "paid") {
        revenueToday += Number(shoe.order.total_price);
      }

      // Sepatu Masuk & Keluar Bulan Ini
      if (shoeDateStr >= firstDayOfMonth && shoeDateStr <= lastDayOfMonth) {
        masukBulanIni++;
        if (shoe.shoe_status === "sudah_diambil") {
          diambilBulanIni++;
        }
      }
    });

    return { revenueToday, masukBulanIni, diambilBulanIni, belumDiambilTotal };
  }, [rawData, firstDayOfMonth, lastDayOfMonth, todayStr]);

  const filteredData = useMemo(() => {
    return rawData.filter((shoe) => {
      const keyword = search.toLowerCase();
      const matchSearch =
        shoe.order.invoice_number.toLowerCase().includes(keyword) ||
        shoe.order.customer.name.toLowerCase().includes(keyword) ||
        shoe.brand.toLowerCase().includes(keyword);
      if (!matchSearch) return false;

      if (filterPayment && shoe.order.payment_status !== filterPayment)
        return false;

      const shoeDateStr = new Date(shoe.created_at).toISOString().split("T")[0];

      // Kunci Tabel: Hanya menampilkan transaksi bulan berjalan
      if (shoeDateStr < firstDayOfMonth || shoeDateStr > lastDayOfMonth)
        return false;

      if (dateStart && shoeDateStr < dateStart) return false;
      if (dateEnd && shoeDateStr > dateEnd) return false;

      return true;
    });
  }, [
    rawData,
    search,
    dateStart,
    dateEnd,
    filterPayment,
    firstDayOfMonth,
    lastDayOfMonth,
  ]);

  const exportToExcel = () => {
    if (filteredData.length === 0)
      return toast.error("Tidak ada data untuk diexport.");

    const excelData = filteredData.map((s, index) => ({
      No: index + 1,
      "No. Nota": s.order.invoice_number,
      "Tgl Masuk": formatDate(s.created_at),
      Pelanggan: s.order.customer.name,
      Sepatu: `${s.brand} - ${s.shoe_type}`,
      Teknisi: s.assignment?.[0]?.technician?.full_name || "-",
      "Total Biaya": s.order.total_price,
      "Status Pengerjaan": s.shoe_status.replace(/_/g, " ").toUpperCase(),
      Pembayaran: s.order.payment_status === "paid" ? "Lunas" : "Belum Lunas",
      "Tgl Diambil": s.handover?.[0]?.handed_over_at
        ? formatDate(s.handover[0].handed_over_at)
        : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Kasir");
    XLSX.writeFile(
      wb,
      `Laporan_Kasir_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    toast.success("File Excel berhasil diunduh!");
  };

  const resetFilters = () => {
    setDateStart(firstDayOfMonth);
    setDateEnd(lastDayOfMonth);
    setFilterPayment("");
    setSearch("");
  };

  const formatStatus = (status: string) => {
    if (status === "menunggu_pengerjaan") return "Menunggu";
    if (status === "sedang_dikerjakan") return "Dikerjakan";
    if (status === "proses_pencucian") return "Pencucian";
    if (status === "proses_pengeringan") return "Pengeringan";
    if (status === "proses_finishing") return "Finishing";
    if (status === "selesai_dicuci") return "Selesai Cuci";
    if (status === "siap_diambil") return "Siap Diambil";
    if (status === "sudah_diambil") return "Diambil";
    return status;
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laporan & Stok</h1>
          <p className="text-slate-400 text-sm">
            Data operasional bulan ini (
            {new Date(firstDayOfMonth).toLocaleString("id-ID", {
              month: "long",
              year: "numeric",
            })}
            ).
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="neu-btn flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>

      {/* 4 CARD STATISTIK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="neu-card border-l-4 border-l-accent">
          <div className="flex items-center gap-2 text-accent mb-1">
            <TrendingUp className="w-4 h-4" />
            <p className="text-xs font-semibold uppercase">Pendapatan Harian</p>
          </div>
          <p className="text-xl font-bold">
            Rp {stats.revenueToday.toLocaleString("id-ID")}
          </p>
          <p className="text-[10px] text-slate-500">Hari ini</p>
        </div>

        <div className="neu-card">
          <div className="flex items-center gap-2 text-status-working mb-1">
            <Package className="w-4 h-4" />
            <p className="text-xs font-semibold uppercase">Sepatu Masuk</p>
          </div>
          <p className="text-xl font-bold">
            {stats.masukBulanIni}{" "}
            <span className="text-xs font-normal text-slate-400">Psg</span>
          </p>
          <p className="text-[10px] text-slate-500">Bulan ini</p>
        </div>

        <div className="neu-card">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <p className="text-xs font-semibold uppercase">Sepatu Keluar</p>
          </div>
          <p className="text-xl font-bold">
            {stats.diambilBulanIni}{" "}
            <span className="text-xs font-normal text-slate-400">Psg</span>
          </p>
          <p className="text-[10px] text-slate-500">Sudah diambil</p>
        </div>

        <div className="neu-card border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <Clock className="w-4 h-4" />
            <p className="text-xs font-semibold uppercase">Belum Diambil</p>
          </div>
          <p className="text-xl font-bold">
            {stats.belumDiambilTotal}{" "}
            <span className="text-xs font-normal text-slate-400">Psg</span>
          </p>
          <p className="text-[10px] text-red-400 font-semibold">Stok di toko</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-2 mt-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari nota, pelanggan, atau sepatu..."
            className="neu-input pl-9 text-sm !py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <select
          className="neu-input xl:w-44 cursor-pointer text-sm !py-2"
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
        >
          <option value="">Semua Pembayaran</option>
          <option value="paid">Lunas</option>
          <option value="unpaid">Belum Lunas</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            className="neu-input cursor-pointer text-sm !py-2 w-full"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            min={firstDayOfMonth}
            max={lastDayOfMonth}
          />
          <span className="text-slate-500 text-sm">-</span>
          <input
            type="date"
            className="neu-input cursor-pointer text-sm !py-2 w-full"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            min={firstDayOfMonth}
            max={lastDayOfMonth}
          />
          {(filterPayment ||
            search ||
            dateStart !== firstDayOfMonth ||
            dateEnd !== lastDayOfMonth) && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-400 hover:underline whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tabel Gaya Excel */}
      <div className="neu-card !p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11px] sm:text-xs whitespace-nowrap min-w-max">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="px-3 py-2 font-semibold border-b border-slate-700">
                  No. Nota
                </th>
                <th className="px-3 py-2 font-semibold border-b border-slate-700">
                  Tgl Masuk
                </th>
                <th className="px-3 py-2 font-semibold border-b border-slate-700">
                  Pelanggan
                </th>
                <th className="px-3 py-2 font-semibold border-b border-slate-700">
                  Sepatu
                </th>
                <th className="px-3 py-2 font-semibold border-b border-slate-700">
                  Teknisi
                </th>
                <th className="px-3 py-2 font-semibold border-b border-slate-700">
                  Total
                </th>
                <th className="px-3 py-2 font-semibold border-b border-slate-700 text-center">
                  Status
                </th>
                <th className="px-3 py-2 font-semibold border-b border-slate-700 text-center">
                  Pembayaran
                </th>
                <th className="px-3 py-2 font-semibold border-b border-slate-700 text-center">
                  Tgl Ambil
                </th>
                <th className="px-3 py-2 font-semibold border-b border-slate-700 text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    Tidak ada data ditemukan pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-3 py-2 font-semibold text-accent">
                      {s.order.invoice_number}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="px-3 py-2">{s.order.customer.name}</td>
                    <td className="px-3 py-2">
                      {s.brand} - {s.shoe_type}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-200">
                      {s.assignment?.[0]?.technician?.full_name || "-"}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      Rp {s.order.total_price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`neu-badge text-[9px] uppercase ${
                          s.shoe_status === "sudah_diambil"
                            ? "bg-green-500/10 text-green-400"
                            : s.shoe_status === "menunggu_pengerjaan"
                              ? "bg-slate-800 text-slate-400"
                              : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {formatStatus(s.shoe_status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`neu-badge text-[9px] uppercase ${
                          s.order.payment_status === "paid"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {s.order.payment_status === "paid"
                          ? "Lunas"
                          : "Belum Lunas"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-400">
                      {s.handover?.[0]?.handed_over_at
                        ? formatDate(s.handover[0].handed_over_at)
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Link
                        href={`/dashboard/orders/${s.order.id}`}
                        className="text-accent hover:underline flex items-center justify-center gap-1 font-semibold"
                      >
                        <Printer className="w-3 h-3" /> Print
                      </Link>
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
