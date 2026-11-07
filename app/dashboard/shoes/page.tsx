"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Search,
  Clock,
  Droplets,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";
import { formatDate } from "@/lib/format";

const STATUS_TABS = [
  { id: "belum", label: "Belum Dikerjakan", icon: Clock },
  { id: "sedang", label: "Sedang Dikerjakan", icon: Droplets },
  { id: "selesai", label: "Selesai Dikerjakan", icon: CheckCircle2 },
  { id: "diambil", label: "Sudah Diambil", icon: PackageCheck },
];

export default function ShoesMonitoringPage() {
  const supabase = createClient();
  const [shoes, setShoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("belum");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchShoes = async () => {
      const { data } = await supabase
        .from("shoes")
        .select(
          `
          id, shoe_code, brand, shoe_type, shoe_status, created_at,
          order:orders(invoice_number, customer:customers(name)),
          treatment:treatments(name),
          assignment:shoe_assignments(technician:profiles(full_name), started_at, completed_at)
        `,
        )
        .order("created_at", { ascending: false });

      if (data) setShoes(data);
      setLoading(false);
    };
    fetchShoes();
  }, [supabase]);

  // Filter Berdasarkan Tab & Search
  const filteredShoes = useMemo(() => {
    return shoes.filter((s) => {
      // 1. Filter Tab
      let matchTab = false;
      if (activeTab === "belum")
        matchTab = s.shoe_status === "menunggu_pengerjaan";
      else if (activeTab === "sedang")
        matchTab = [
          "sedang_dikerjakan",
          "proses_pencucian",
          "proses_pengeringan",
          "proses_finishing",
        ].includes(s.shoe_status);
      else if (activeTab === "selesai")
        matchTab = ["selesai_dicuci", "siap_diambil"].includes(s.shoe_status);
      else if (activeTab === "diambil")
        matchTab = s.shoe_status === "sudah_diambil";

      // 2. Filter Search
      const keyword = search.toLowerCase();
      const matchSearch =
        s.shoe_code.toLowerCase().includes(keyword) ||
        s.order.invoice_number.toLowerCase().includes(keyword) ||
        s.order.customer.name.toLowerCase().includes(keyword);

      return matchTab && matchSearch;
    });
  }, [shoes, activeTab, search]);

  const getTabCount = (tabId: string) => {
    return shoes.filter((s) => {
      if (tabId === "belum") return s.shoe_status === "menunggu_pengerjaan";
      if (tabId === "sedang")
        return [
          "sedang_dikerjakan",
          "proses_pencucian",
          "proses_pengeringan",
          "proses_finishing",
        ].includes(s.shoe_status);
      if (tabId === "selesai")
        return ["selesai_dicuci", "siap_diambil"].includes(s.shoe_status);
      if (tabId === "diambil") return s.shoe_status === "sudah_diambil";
      return false;
    }).length;
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Monitoring Sepatu</h1>
        <p className="text-slate-400 text-sm">
          Pantau pergerakan setiap sepatu dari masuk hingga diambil.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-slate-900 p-1 rounded-xl shadow-neu-in gap-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-slate-800 text-accent shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label} ({getTabCount(tab.id)})
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Cari ID Sepatu, No. Nota, atau Pelanggan..."
          className="neu-input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {/* Tabel Data */}
      <div className="neu-card !p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-max">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="p-4 font-semibold border-b border-slate-700">
                  ID Sepatu
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  No. Nota
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Pelanggan
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Sepatu
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Treatment
                </th>

                {activeTab === "sedang" && (
                  <th className="p-4 font-semibold border-b border-slate-700">
                    Teknisi & Waktu Mulai
                  </th>
                )}
                {activeTab === "selesai" && (
                  <th className="p-4 font-semibold border-b border-slate-700">
                    Teknisi
                  </th>
                )}
                {activeTab === "diambil" && (
                  <th className="p-4 font-semibold border-b border-slate-700">
                    Teknisi
                  </th>
                )}

                <th className="p-4 font-semibold border-b border-slate-700 text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredShoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Tidak ada sepatu di kategori ini.
                  </td>
                </tr>
              ) : (
                filteredShoes.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4 font-semibold text-accent">
                      {s.shoe_code}
                    </td>
                    <td className="p-4 text-slate-300">
                      {s.order.invoice_number}
                    </td>
                    <td className="p-4">{s.order.customer.name}</td>
                    <td className="p-4">
                      {s.brand} - {s.shoe_type}
                    </td>
                    <td className="p-4 text-slate-400">{s.treatment?.name}</td>

                    {(activeTab === "sedang" ||
                      activeTab === "selesai" ||
                      activeTab === "diambil") && (
                      <td className="p-4">
                        <p className="font-medium text-slate-200">
                          {s.assignment?.[0]?.technician?.full_name || "-"}
                        </p>
                        {activeTab === "sedang" &&
                          s.assignment?.[0]?.started_at && (
                            <p className="text-xs text-slate-500">
                              {formatDate(s.assignment[0].started_at)}
                            </p>
                          )}
                      </td>
                    )}

                    <td className="p-4 text-center">
                      <span
                        className={`neu-badge text-[10px] uppercase ${
                          s.shoe_status === "sudah_diambil"
                            ? "bg-green-500/10 text-green-400"
                            : s.shoe_status === "menunggu_pengerjaan"
                              ? "bg-slate-800 text-slate-400"
                              : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {s.shoe_status.replace(/_/g, " ")}
                      </span>
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
