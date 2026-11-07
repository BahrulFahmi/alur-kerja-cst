"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Search, UserSquare2 } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchCustomers = async () => {
      // Mengambil data pelanggan beserta agregasi transaksinya
      const { data } = await supabase
        .from("customers")
        .select(
          `
          id, name, whatsapp, created_at,
          orders(id, total_price, created_at)
        `,
        )
        .order("created_at", { ascending: false });

      if (data) setCustomers(data);
      setLoading(false);
    };
    fetchCustomers();
  }, [supabase]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.whatsapp.includes(search),
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
        <h1 className="text-2xl font-bold">Data Pelanggan</h1>
        <p className="text-slate-400 text-sm">
          Database seluruh pelanggan Chat Shoe Treatment.
        </p>
      </div>

      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          placeholder="Cari nama atau WhatsApp..."
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
                  Nama Pelanggan
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  WhatsApp
                </th>
                <th className="p-4 font-semibold border-b border-slate-700 text-center">
                  Total Transaksi
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Total Pengeluaran
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Transaksi Pertama
                </th>
                <th className="p-4 font-semibold border-b border-slate-700">
                  Transaksi Terakhir
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Tidak ada data pelanggan.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const totalSpent = c.orders.reduce(
                    (sum: number, o: any) => sum + Number(o.total_price),
                    0,
                  );
                  const firstOrder =
                    c.orders.length > 0
                      ? c.orders[c.orders.length - 1].created_at
                      : null;
                  const lastOrder =
                    c.orders.length > 0 ? c.orders[0].created_at : null;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4 font-semibold text-slate-200">
                        <div className="flex items-center gap-2">
                          <UserSquare2 className="w-4 h-4 text-accent" />{" "}
                          {c.name}
                        </div>
                      </td>
                      <td className="p-4 text-slate-400">{c.whatsapp}</td>
                      <td className="p-4 text-center">
                        {c.orders.length} Nota
                      </td>
                      <td className="p-4 font-medium">
                        Rp {totalSpent.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-slate-400">
                        {firstOrder ? formatDate(firstOrder) : "-"}
                      </td>
                      <td className="p-4 text-slate-400">
                        {lastOrder ? formatDate(lastOrder) : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
