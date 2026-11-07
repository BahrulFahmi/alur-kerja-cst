"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Search,
  CheckCircle,
  CreditCard,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

const PAYMENT_METHODS = ["Cash", "QR BCA", "QR BSI", "Bank BTN", "Bank BSI"];

export default function ReadyPage() {
  const supabase = createClient();
  const [shoes, setShoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // State Filter & Search
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  // State Modal Pembayaran
  const [payingOrder, setPayingOrder] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState("");

  const fetchReadyShoes = async () => {
    const { data, error } = await supabase
      .from("shoes")
      .select(
        "*, order:orders(id, invoice_number, order_date, customer:customers(name, whatsapp), total_price, payment_status, payment_method), treatment:treatments(name)",
      )
      .eq("shoe_status", "siap_diambil")
      .order("created_at", { ascending: false });

    if (!error && data) setShoes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReadyShoes();
  }, [supabase]);

  // Proses Pelunasan (Bayar di Tempat)
  const handlePayNow = async () => {
    if (!payingOrder || !selectedMethod)
      return toast.error("Pilih metode pembayaran!");

    setUpdatingId(payingOrder.order.id);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: selectedMethod,
        })
        .eq("id", payingOrder.order.id);

      if (error) throw error;

      toast.success("Pembayaran berhasil divalidasi (Lunas)!");
      setPayingOrder(null);
      setSelectedMethod("");
      await fetchReadyShoes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Proses Serah Terima
  const handleHandover = async (shoe: any) => {
    // Validasi lapis kedua (meskipun tombol disabled)
    if (shoe.order.payment_status !== "paid") {
      return toast.error(
        "Pembayaran belum lunas! Harap validasi pembayaran terlebih dahulu.",
      );
    }

    if (!confirm("Apakah Anda yakin sepatu ini sudah diserahkan ke pelanggan?"))
      return;

    setProcessingId(shoe.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase
        .from("shoes")
        .update({ shoe_status: "sudah_diambil" })
        .eq("id", shoe.id);
      await supabase.from("order_handover").insert({
        shoe_id: shoe.id,
        cashier_id: user!.id,
        notes: "Diserahkan ke pelanggan",
      });

      const { count: remaining } = await supabase
        .from("shoes")
        .select("*", { count: "exact", head: true })
        .eq("order_id", shoe.order.id)
        .neq("shoe_status", "sudah_diambil");

      if (remaining === 0) {
        await supabase
          .from("orders")
          .update({ order_status: "completed" })
          .eq("id", shoe.order.id);
      }

      await supabase.from("activity_logs").insert({
        user_id: user!.id,
        user_name: "Kasir",
        user_role: "cashier",
        action: "Serah Terima",
        description: `Menyerahkan sepatu ke pelanggan.`,
      });

      toast.success("Sepatu berhasil diserahkan!");
      await fetchReadyShoes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredShoes = shoes.filter((s) => {
    const keyword = search.toLowerCase();
    const matchSearch =
      s.order.invoice_number.toLowerCase().includes(keyword) ||
      s.order.customer.name.toLowerCase().includes(keyword) ||
      s.order.customer.whatsapp.includes(keyword);

    const matchPayment = paymentFilter
      ? s.order.payment_status === paymentFilter
      : true;

    return matchSearch && matchPayment;
  });

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <div>
        <h1 className="text-2xl font-bold">Siap Diambil</h1>
        <p className="text-slate-400 text-sm">
          Daftar sepatu yang selesai. Validasi pembayaran sebelum diserahkan.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari nota, pelanggan, atau WhatsApp..."
            className="neu-input pl-10 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <select
          className="neu-input md:w-48 cursor-pointer text-sm"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="">Semua Pembayaran</option>
          <option value="unpaid">Belum Lunas</option>
          <option value="paid">Lunas</option>
        </select>
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
                  WhatsApp
                </th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">
                  Sepatu
                </th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">
                  Total
                </th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700 text-center">
                  Pembayaran
                </th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700 text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredShoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Tidak ada sepatu yang siap diambil.
                  </td>
                </tr>
              ) : (
                filteredShoes.map((shoe) => {
                  const isPaid = shoe.order.payment_status === "paid";

                  return (
                    <tr
                      key={shoe.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-accent">
                        {shoe.order.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(shoe.created_at)}
                      </td>
                      <td className="px-4 py-3">{shoe.order.customer.name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {shoe.order.customer.whatsapp}
                      </td>
                      <td className="px-4 py-3">
                        {shoe.brand} - {shoe.shoe_type}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        Rp {shoe.order.total_price.toLocaleString("id-ID")}
                      </td>

                      {/* Kolom Pembayaran */}
                      <td className="px-4 py-3 text-center">
                        {isPaid ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="neu-badge bg-green-500/10 text-green-400 border-green-500/30">
                              LUNAS
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {shoe.order.payment_method || "-"}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPayingOrder(shoe)}
                            className="neu-badge bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer"
                          >
                            BELUM LUNAS
                          </button>
                        )}
                      </td>

                      {/* Kolom Aksi */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleHandover(shoe)}
                          disabled={!isPaid || processingId === shoe.id}
                          className={`neu-btn-primary flex items-center justify-center gap-1 mx-auto !py-1.5 !px-3 text-xs whitespace-nowrap ${
                            !isPaid ? "opacity-30 cursor-not-allowed" : ""
                          }`}
                          title={
                            !isPaid
                              ? "Harap lunasi pembayaran terlebih dahulu"
                              : "Serahkan sepatu"
                          }
                        >
                          {processingId === shoe.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Serahkan
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PEMBAYARAN (Menggunakan fixed inset-0 untuk memastikan muncul) */}
      {payingOrder && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="font-bold text-lg text-accent">
                Validasi Pembayaran
              </h2>
              <button
                onClick={() => setPayingOrder(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="text-sm text-slate-300">
              <p>
                Nota:{" "}
                <strong className="text-accent">
                  {payingOrder.order.invoice_number}
                </strong>
              </p>
              <p>Pelanggan: {payingOrder.order.customer.name}</p>
              <p className="mt-2 text-lg font-bold">
                Total: Rp{" "}
                {payingOrder.order.total_price.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Pilih Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      selectedMethod === method
                        ? "bg-accent/20 text-accent border-accent/50"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePayNow}
              disabled={!selectedMethod || updatingId === payingOrder.order.id}
              className="neu-btn-primary w-full py-3 flex justify-center mt-2"
            >
              {updatingId === payingOrder.order.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Konfirmasi Lunas"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
