"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Search,
  Clock,
  Droplets,
  CheckCircle2,
  Eye,
  ScanLine,
  XCircle,
  CreditCard,
  AlertTriangle,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Html5QrcodeScanner } from "html5-qrcode";
import Link from "next/link";

const PAYMENT_METHODS = ["Cash", "QR BCA", "QR BSI", "Bank BTN", "Bank BSI"];

const STATUS_LIST = [
  { value: "sedang_dikerjakan", label: "Dikerjakan", icon: Clock },
  { value: "proses_pencucian", label: "Pencucian", icon: Droplets },
  { value: "proses_pengeringan", label: "Pengeringan", icon: Clock },
  { value: "proses_finishing", label: "Finishing", icon: CheckCircle2 },
  { value: "selesai_dicuci", label: "Selesai Cuci", icon: CheckCircle2 },
];

export default function CheckingPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<
    "belum" | "dikerjakan" | "selesai" | "siap_diambil" | "overdue"
  >("belum");
  const [shoes, setShoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // State Modal Scan
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [scannedShoe, setScannedShoe] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // State Modal Pembayaran
  const [payingOrder, setPayingOrder] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    const { data } = await supabase
      .from("shoes")
      .select(
        `
        id, shoe_code, brand, shoe_type, shoe_status, created_at, qr_code,
        order:orders(id, invoice_number, order_date, total_price, payment_status, payment_method, customer:customers(name, whatsapp)), 
        treatment:treatments(name), 
        assignment:shoe_assignments(technician:profiles(full_name), assignment_status)
      `,
      )
      .order("created_at", { ascending: false });

    if (data) setShoes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  // Filter Tab & Pencarian
  const filteredShoes = useMemo(() => {
    const now = new Date();
    return shoes.filter((s) => {
      const keyword = search.toLowerCase();
      const matchSearch =
        s.order.invoice_number.toLowerCase().includes(keyword) ||
        s.order.customer.name.toLowerCase().includes(keyword) ||
        s.brand.toLowerCase().includes(keyword);

      if (!matchSearch) return false;

      const createdDate = new Date(s.created_at);
      const diffDays = Math.ceil(
        Math.abs(now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isOverdue = diffDays > 3 && s.shoe_status !== "sudah_diambil";

      if ((activeTab as string) === "overdue") return isOverdue;
      if (isOverdue && (activeTab as string) !== "overdue") return false;

      if (activeTab === "belum") return s.shoe_status === "menunggu_pengerjaan";
      if (activeTab === "dikerjakan")
        return [
          "sedang_dikerjakan",
          "proses_pencucian",
          "proses_pengeringan",
          "proses_finishing",
        ].includes(s.shoe_status);
      if (activeTab === "selesai") return s.shoe_status === "selesai_dicuci";
      if (activeTab === "siap_diambil") return s.shoe_status === "siap_diambil";

      return false;
    });
  }, [shoes, activeTab, search]);

  // Hitung jumlah tiap tab
  const getTabCount = (tab: string) => {
    const now = new Date();
    return shoes.filter((s) => {
      const createdDate = new Date(s.created_at);
      const diffDays = Math.ceil(
        Math.abs(now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isOverdue = diffDays > 3 && s.shoe_status !== "sudah_diambil";

      if (tab === "overdue") return isOverdue;
      if (isOverdue) return false;

      if (tab === "belum") return s.shoe_status === "menunggu_pengerjaan";
      if (tab === "dikerjakan")
        return [
          "sedang_dikerjakan",
          "proses_pencucian",
          "proses_pengeringan",
          "proses_finishing",
        ].includes(s.shoe_status);
      if (tab === "selesai") return s.shoe_status === "selesai_dicuci";
      if (tab === "siap_diambil") return s.shoe_status === "siap_diambil";
      return false;
    }).length;
  };

  // --- FUNGSI SCAN ---
  const startScanner = () => {
    setShowScanner(true);
    setScannedShoe(null);
    setTimeout(() => {
      const qrScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false,
      );
      qrScanner.render(
        async (decodedText) => {
          qrScanner.clear();
          await handleScan(decodedText);
        },
        (error) => {},
      );
      setScanner(qrScanner);
    }, 100);
  };

  const closeScanner = () => {
    if (scanner) scanner.clear().catch((e) => console.error(e));
    setShowScanner(false);
    setScannedShoe(null);
  };

  const handleScan = async (qrCode: string) => {
    setScanLoading(true);
    try {
      const { data: shoe, error } = await supabase
        .from("shoes")
        .select(
          "*, order:orders(invoice_number, customer:customers(name)), treatment:treatments(name)",
        )
        .or(`qr_code.eq.${qrCode},shoe_code.eq.${qrCode}`)
        .single();

      if (error || !shoe) throw new Error("QR Code tidak valid.");
      if (shoe.shoe_status !== "menunggu_pengerjaan") {
        throw new Error(
          `Sepatu sudah dikerjakan (Status: ${shoe.shoe_status}).`,
        );
      }

      setScannedShoe(shoe);
    } catch (err: any) {
      toast.error(err.message);
      closeScanner();
    } finally {
      setScanLoading(false);
    }
  };

  // --- FUNGSI AMBIL PEKERJAAN (DIPERBAIKI) ---
  const confirmTakeJob = async () => {
    setUpdatingId(scannedShoe.id);
    try {
      // 1. Ambil user yang sedang login saat ini (Yoga/Rasyid/Rafly)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi login habis. Silakan login ulang.");

      // 2. Ambil nama profil untuk verifikasi & notifikasi
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // 3. Update status sepatu
      await supabase
        .from("shoes")
        .update({ shoe_status: "sedang_dikerjakan" })
        .eq("id", scannedShoe.id);

      // 4. Simpan penugasan menggunakan user.id (BUKAN mengambil acak dari DB)
      await supabase.from("shoe_assignments").insert({
        shoe_id: scannedShoe.id,
        technician_id: user.id,
        started_at: new Date().toISOString(),
        assignment_status: "active",
      });

      await supabase.from("shoe_status_history").insert({
        shoe_id: scannedShoe.id,
        previous_status: "menunggu_pengerjaan",
        new_status: "sedang_dikerjakan",
        notes: `Diambil via scan oleh ${profile?.full_name || "Teknisi"}`,
      });

      toast.success(
        `Berhasil mengambil pekerjaan sebagai ${profile?.full_name || "Teknisi"}!`,
      );
      closeScanner();
      setActiveTab("dikerjakan");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // --- FUNGSI UPDATE STATUS ---
  const updateStatus = async (
    shoeId: string,
    newStatus: string,
    prevStatus: string,
  ) => {
    setUpdatingId(shoeId);
    try {
      await supabase
        .from("shoes")
        .update({ shoe_status: newStatus })
        .eq("id", shoeId);
      await supabase.from("shoe_status_history").insert({
        shoe_id: shoeId,
        previous_status: prevStatus,
        new_status: newStatus,
        notes: "Update status",
      });

      if (newStatus === "selesai_dicuci") {
        await supabase
          .from("shoe_assignments")
          .update({
            assignment_status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("shoe_id", shoeId)
          .eq("assignment_status", "active");
        toast.success("Pekerjaan selesai! Siap dicek Kasir.");
        setActiveTab("selesai");
      } else {
        toast.success("Status diperbarui!");
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // --- FUNGSI KASIR ---
  const confirmReady = async (shoeId: string) => {
    setUpdatingId(shoeId);
    try {
      await supabase
        .from("shoes")
        .update({ shoe_status: "siap_diambil" })
        .eq("id", shoeId);
      await supabase.from("shoe_status_history").insert({
        shoe_id: shoeId,
        previous_status: "selesai_dicuci",
        new_status: "siap_diambil",
        notes: "Konfirmasi siap diambil",
      });
      toast.success("Sepatu siap diambil!");
      setActiveTab("siap_diambil");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePayNow = async () => {
    if (!selectedMethod) return toast.error("Pilih metode pembayaran!");
    setUpdatingId(payingOrder.order.id);
    try {
      await supabase
        .from("orders")
        .update({ payment_status: "paid", payment_method: selectedMethod })
        .eq("id", payingOrder.order.id);
      toast.success("Pembayaran Lunas!");
      setPayingOrder(null);
      setSelectedMethod("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleHandover = async (shoe: any) => {
    if (shoe.order.payment_status !== "paid")
      return toast.error("Pembayaran belum lunas!");
    if (!confirm("Serahkan sepatu ke pelanggan?")) return;

    setUpdatingId(shoe.id);
    try {
      await supabase
        .from("shoes")
        .update({ shoe_status: "sudah_diambil" })
        .eq("id", shoe.id);
      await supabase
        .from("order_handover")
        .insert({ shoe_id: shoe.id, notes: "Diserahkan" });

      const { count } = await supabase
        .from("shoes")
        .select("*", { count: "exact", head: true })
        .eq("order_id", shoe.order.id)
        .neq("shoe_status", "sudah_diambil");
      if (count === 0)
        await supabase
          .from("orders")
          .update({ order_status: "completed" })
          .eq("id", shoe.order.id);

      toast.success("Sepatu diserahkan!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="max-w-full mx-auto space-y-4 pb-20">
      {/* Header - Hanya Judul & Tombol Scan */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Pantauan Pengerjaan</h1>
          <p className="text-slate-400 text-xs md:text-sm">
            Pusat kendali operasional.
          </p>
        </div>

        <button
          onClick={startScanner}
          className="neu-btn-primary w-full md:w-auto flex items-center justify-center gap-2 py-3 md:py-2"
        >
          <ScanLine className="w-5 h-5" /> Scan QR
        </button>
      </div>

      {/* Tabs (Scrollable di Mobile) */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {[
          { id: "belum", label: "Belum" },
          { id: "dikerjakan", label: "Dikerjakan" },
          { id: "selesai", label: "Selesai" },
          { id: "siap_diambil", label: "Siap Ambil" },
          { id: "overdue", label: "Overdue", icon: AlertTriangle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all ${
              activeTab === tab.id
                ? tab.id === "overdue"
                  ? "bg-red-500/20 text-red-400 shadow-inner"
                  : "bg-slate-800 text-accent shadow-inner"
                : "text-slate-400 bg-slate-900 border border-slate-800"
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />} {tab.label} (
            {getTabCount(tab.id)})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Cari nota, pelanggan..."
          className="neu-input pl-10 py-3 md:py-2 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {/* Tabel */}
      <div className="neu-card !p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[850px]">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="px-3 py-3 font-semibold border-b border-slate-700">
                  No. Nota
                </th>
                <th className="px-3 py-3 font-semibold border-b border-slate-700">
                  Tgl Masuk
                </th>
                <th className="px-3 py-3 font-semibold border-b border-slate-700">
                  Pelanggan
                </th>
                <th className="px-3 py-3 font-semibold border-b border-slate-700">
                  Item
                </th>
                <th className="px-3 py-3 font-semibold border-b border-slate-700">
                  Teknisi
                </th>
                <th className="px-3 py-3 font-semibold border-b border-slate-700 text-center">
                  Status Bayar
                </th>
                <th className="px-3 py-3 font-semibold border-b border-slate-700 text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredShoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Tidak ada data di kategori ini.
                  </td>
                </tr>
              ) : (
                filteredShoes.map((shoe) => {
                  // PERBAIKAN: Hanya ambil assignment yang benar-benar active
                  const activeAssignment = shoe.assignment?.find(
                    (a: any) => a.assignment_status === "active",
                  );
                  const technicianName =
                    activeAssignment?.technician?.full_name;

                  return (
                    <tr
                      key={shoe.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-3 py-3 font-semibold text-accent whitespace-nowrap">
                        {shoe.order.invoice_number}
                      </td>
                      <td className="px-3 py-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {formatDate(shoe.created_at)}
                      </td>
                      <td className="px-3 py-3">{shoe.order.customer.name}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {shoe.brand} - {shoe.shoe_type}
                        <div className="text-[10px] text-slate-500">
                          {shoe.treatment?.name || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {technicianName ? (
                          <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                            <UserCircle2 className="w-4 h-4 text-accent" />
                            {technicianName}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`neu-badge text-[10px] uppercase ${shoe.order.payment_status === "paid" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                        >
                          {shoe.order.payment_status === "paid"
                            ? "Lunas"
                            : "Belum Lunas"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/dashboard/orders/${shoe.order.id}`}
                            className="p-2 bg-slate-800 rounded-lg text-accent hover:bg-slate-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {activeTab === "dikerjakan" && (
                            <div className="flex gap-1">
                              {STATUS_LIST.filter(
                                (s) => s.value !== shoe.shoe_status,
                              ).map((st) => (
                                <button
                                  key={st.value}
                                  onClick={() =>
                                    updateStatus(
                                      shoe.id,
                                      st.value,
                                      shoe.shoe_status,
                                    )
                                  }
                                  disabled={updatingId === shoe.id}
                                  className="neu-btn !py-1 !px-2 text-[10px]"
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {activeTab === "selesai" && (
                            <button
                              onClick={() => confirmReady(shoe.id)}
                              disabled={updatingId === shoe.id}
                              className="neu-btn-primary !py-1 !px-3 text-xs"
                            >
                              Siap
                            </button>
                          )}

                          {activeTab === "siap_diambil" && (
                            <div className="flex gap-1">
                              {shoe.order.payment_status !== "paid" && (
                                <button
                                  onClick={() => setPayingOrder(shoe)}
                                  className="neu-btn !py-1 !px-3 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10"
                                >
                                  Bayar
                                </button>
                              )}
                              <button
                                onClick={() => handleHandover(shoe)}
                                disabled={
                                  updatingId === shoe.id ||
                                  shoe.order.payment_status !== "paid"
                                }
                                className={`neu-btn-primary !py-1 !px-3 text-xs ${shoe.order.payment_status !== "paid" ? "opacity-30 cursor-not-allowed" : ""}`}
                              >
                                Serahkan
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL SCANNER --- */}
      {showScanner && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="font-bold text-lg text-accent">Scan QR Sepatu</h2>
              <button
                onClick={closeScanner}
                className="text-slate-500 hover:text-slate-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {!scannedShoe ? (
              <>
                <div
                  id="reader"
                  className="w-full rounded-xl overflow-hidden bg-black text-white"
                ></div>
                {scanLoading && (
                  <p className="text-center text-sm text-accent animate-pulse">
                    Memproses QR...
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Nota:{" "}
                  <strong className="text-accent">
                    {scannedShoe.order.invoice_number}
                  </strong>
                </p>
                <p className="text-sm text-slate-300">
                  Item: {scannedShoe.brand} - {scannedShoe.shoe_type}
                </p>
                <button
                  onClick={confirmTakeJob}
                  disabled={updatingId === scannedShoe.id}
                  className="neu-btn-primary w-full py-3"
                >
                  {updatingId === scannedShoe.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Ambil & Mulai Kerjakan"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL PEMBAYARAN --- */}
      {payingOrder && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
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
            <p className="text-sm text-slate-300">
              Nota:{" "}
              <strong className="text-accent">
                {payingOrder.order.invoice_number}
              </strong>
            </p>
            <p className="text-lg font-bold">
              Total: Rp {payingOrder.order.total_price.toLocaleString("id-ID")}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSelectedMethod(method)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${selectedMethod === method ? "bg-accent/20 text-accent border-accent/50" : "bg-slate-800 text-slate-400 border-slate-700"}`}
                >
                  {method}
                </button>
              ))}
            </div>
            <button
              onClick={handlePayNow}
              disabled={!selectedMethod || updatingId === payingOrder.order.id}
              className="neu-btn-primary w-full py-3 mt-2 flex justify-center"
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
