"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Search, Printer, PackageSearch, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function OrdersListPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      // Mengambil data order beserta sepatu yang BELUM diambil (stok fisik)
      const { data } = await supabase
        .from("orders")
        .select(
          `
          *, 
          customer:customers(name, whatsapp), 
          shoes!inner(id, shoe_status, brand, shoe_type)
        `,
        )
        .neq("shoes.shoe_status", "sudah_diambil")
        .order("created_at", { ascending: false });

      if (data) setOrders(data);
      setLoading(false);
    };
    fetchOrders();
  }, [supabase]);

  // Filter Pencarian
  const filteredOrders = orders.filter((o) => {
    const keyword = search.toLowerCase();
    return (
      o.invoice_number.toLowerCase().includes(keyword) ||
      o.customer.name.toLowerCase().includes(keyword) ||
      o.customer.whatsapp.includes(keyword)
    );
  });

  const formatStatus = (status: string) => {
    if (status === "menunggu_pengerjaan") return "Menunggu";
    if (status === "sedang_dikerjakan") return "Dikerjakan";
    if (status === "proses_pencucian") return "Pencucian";
    if (status === "proses_pengeringan") return "Pengeringan";
    if (status === "proses_finishing") return "Finishing";
    if (status === "selesai_dicuci") return "Selesai Cuci";
    if (status === "siap_diambil") return "Siap Diambil";
    return status;
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daftar Transaksi Aktif</h1>
          <p className="text-slate-400 text-sm">
            Menampilkan sepatu yang fisiknya masih ada di toko.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Cari nomor nota, nama pelanggan, atau WhatsApp..."
          className="neu-input pl-10 text-sm !py-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {/* Tabel Data */}
      <div className="neu-card !p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11px] sm:text-xs whitespace-nowrap min-w-max">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">
                  No. Nota
                </th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">
                  Tgl Masuk
                </th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">
                  Pelanggan
                </th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">
                  Sepatu
                </th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700 text-center">
                  Status Sepatu
                </th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700 text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <PackageSearch className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    Tidak ada sepatu aktif di toko saat ini.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-accent">
                      {order.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{order.customer.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {order.customer.whatsapp}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {/* Menampilkan list sepatu yang masih aktif di nota ini */}
                      <div className="flex flex-col gap-1">
                        {order.shoes.map((s: any) => (
                          <span key={s.id} className="text-slate-300">
                            • {s.brand} {s.shoe_type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {order.shoes.map((s: any) => (
                          <span
                            key={s.id}
                            className={`neu-badge text-[9px] uppercase ${
                              s.shoe_status === "menunggu_pengerjaan"
                                ? "bg-slate-800 text-slate-400"
                                : s.shoe_status === "siap_diambil"
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {formatStatus(s.shoe_status)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-accent hover:underline flex items-center justify-center gap-1 font-semibold"
                      >
                        <Printer className="w-3 h-3" /> Lihat Nota
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
