"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertTriangle, Clock, Search } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function OverduePage() {
  const supabase = createClient();
  const [shoes, setShoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchOverdue = async () => {
      const { data } = await supabase
        .from("shoes")
        .select(
          `
          id, shoe_code, brand, shoe_type, shoe_status, created_at,
          order:orders(invoice_number, customer:customers(name, whatsapp)),
          treatment:treatments(name),
          assignment:shoe_assignments(technician:profiles(full_name), started_at)
        `,
        )
        // Kita ambil yang belum diambil untuk dicek overdue-nya
        .neq("shoe_status", "sudah_diambil");

      if (data) {
        const now = new Date();
        // Filter data yang benar-benar overdue (Lebih dari 3 hari)
        const overdueShoes = data
          .filter((s) => {
            const createdDate = new Date(s.created_at);
            const diffTime = Math.abs(now.getTime() - createdDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Batas waktu (bisa disesuaikan dengan system_settings, untuk sementara hardcode 3 hari)
            const limitDays = 3;
            return diffDays > limitDays;
          })
          .map((s) => {
            const createdDate = new Date(s.created_at);
            const diffDays = Math.ceil(
              Math.abs(now.getTime() - createdDate.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return { ...s, daysPassed: diffDays };
          });

        setShoes(overdueShoes);
      }
      setLoading(false);
    };
    fetchOverdue();
  }, [supabase]);

  const filteredShoes = shoes.filter(
    (s) =>
      s.order.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      s.order.customer.name.toLowerCase().includes(search.toLowerCase()),
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
        <h1 className="text-2xl font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" /> Sepatu Overdue
        </h1>
        <p className="text-slate-400 text-sm">
          Sepatu yang melewati batas waktu operasional (Lebih dari 3 hari).
        </p>
      </div>

      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Cari nomor nota atau pelanggan..."
          className="neu-input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      <div className="neu-card !p-0 overflow-hidden border-l-4 border-l-red-500">
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
                  Tgl Masuk
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Status
                </th>
                <th className="p-4 font-semibold border-b border-slate-700 text-center">
                  Keterlambatan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredShoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Tidak ada sepatu yang overdue. Kerja bagus!
                  </td>
                </tr>
              ) : (
                filteredShoes.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-800/30 transition-colors bg-red-500/5"
                  >
                    <td className="p-4 font-semibold text-red-400">
                      {s.shoe_code}
                    </td>
                    <td className="p-4 text-slate-300">
                      {s.order.invoice_number}
                    </td>
                    <td className="p-4">{s.order.customer.name}</td>
                    <td className="p-4">
                      {s.brand} - {s.shoe_type}
                    </td>
                    <td className="p-4 text-slate-400">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="p-4">
                      <span className="neu-badge bg-slate-800 text-[10px] uppercase text-amber-400">
                        {s.shoe_status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-bold text-red-400 flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4" /> {s.daysPassed} Hari
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
