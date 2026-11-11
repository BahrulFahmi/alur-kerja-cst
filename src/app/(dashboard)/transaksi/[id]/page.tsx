"use client";
import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  CreditCard,
  Receipt,
  Tag,
  X,
  Printer,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
// IMPORT LIBRARY WEB THERMAL PRINTER
import {
  WebThermalPrinter,
  ConnectionMode,
  PaperSize,
  Align,
} from "@quan-erp/web-thermal-printer";

export default function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // State untuk Modal Preview
  const [showPreview, setShowPreview] = useState<"label" | "struk" | null>(
    null,
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const { id } = await params;

      // 1. Ambil Role User via API
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setUserRole(meData.user?.role);
      }

      // 2. Ambil Detail Order via API
      const res = await fetch(`/api/transaksi/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat nota");

      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params]);

  const calculateMaxEstimatedDate = (orderData: any) => {
    if (!orderData || !orderData.shoes || orderData.shoes.length === 0)
      return "-";

    let maxDays = 0;

    orderData.shoes.forEach((shoe: any) => {
      const days = shoe.treatment?.durationMaxDays || 1;
      if (days > maxDays) maxDays = days;
    });

    if (maxDays > 0) {
      const estDate = new Date(orderData.createdAt);
      estDate.setDate(estDate.getDate() + maxDays);
      return formatDate(estDate.toISOString());
    }
    return "-";
  };

  const handleDeleteShoe = async (shoeId: string, shoeStatus: string) => {
    if (shoeStatus !== "menunggu_pengerjaan") {
      return toast.error("Sepatu sudah dikerjakan, tidak bisa dihapus.");
    }
    if (!confirm("Hapus item ini dari nota?")) return;

    try {
      // 1. Hapus Sepatu via API
      const delRes = await fetch(`/api/transaksi/${shoeId}`, {
        method: "DELETE",
      });
      if (!delRes.ok) throw new Error("Gagal menghapus item");

      // 2. Hitung ulang total harga
      const remainingShoes = order.shoes.filter((s: any) => s.id !== shoeId);
      const newTotal = remainingShoes.reduce(
        (sum: number, s: any) => sum + Number(s.treatmentPrice),
        0,
      );

      // 3. Update total harga order via API (Anda harus memastikan route ini ada)
      await fetch(`/api/transaksi/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalPrice: newTotal }),
      });

      toast.success("Item berhasil dihapus.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );
  if (!order) return <p className="p-8 text-white">Order tidak ditemukan</p>;

  const canEdit = userRole === "cashier";
  const isPaid = order.paymentStatus === "paid";

  const rupiah = (n: number) => `Rp${Number(n || 0).toLocaleString("id-ID")}`;

  // --- FUNGSI CETAK STRUK ---
  const executePrintReceipt = async () => {
    if (typeof navigator === "undefined" || !(navigator as any).bluetooth) {
      toast.error(
        "Browser Anda tidak mendukung Bluetooth. Gunakan Chrome Android.",
      );
      return;
    }

    try {
      const printer = new WebThermalPrinter({
        mode: ConnectionMode.Bluetooth,
        paperSize: PaperSize["58mm"],
      });

      await printer.connect();

      printer
        .initialize()
        .line("CHAT SHOE TREATMENT", { align: Align.Center, bold: true })
        .line(order.invoiceNumber, { align: Align.Center })
        .line(isPaid ? "LUNAS" : "BELUM LUNAS", { align: Align.Center })
        .line("--------------------------------")
        .line(`Pelanggan: ${order.customer?.name}`)
        .line(`Tanggal  : ${formatDate(order.createdAt)}`)
        .line(`Estimasi : ${calculateMaxEstimatedDate(order)}`)
        .line("--------------------------------");

      order.shoes.forEach((shoe: any) => {
        const itemType = shoe.shoeType?.split(" - ")[0] || "Sepatu";
        const itemModel = shoe.shoeType?.split(" - ")[1] || "";
        const title = [
          itemType,
          [shoe.brand, itemModel].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(" - ");
        const price =
          Number(shoe.treatmentPrice) === 0
            ? "FREE"
            : rupiah(shoe.treatmentPrice);

        printer
          .line(title, { bold: true })
          .line(`${shoe.treatment?.name || "-"} | ${shoe.shoeCode}`)
          .line(price, { align: Align.Right });
      });

      printer.line("--------------------------------");

      if (order.discountAmount > 0) {
        printer
          .line(`Diskon (${order.promoNotes || "Promo"})`)
          .line(`- ${rupiah(order.discountAmount)}`, { align: Align.Right });
      }

      printer
        .line("TOTAL", { bold: true })
        .line(rupiah(order.totalPrice), { align: Align.Right, bold: true })
        .line("--------------------------------")
        .line("Terima kasih", { align: Align.Center })
        .line("Simpan struk ini untuk pengambilan", { align: Align.Center })
        .line("--------------------------------")
        .cutPaper()
        .execute();

      toast.success("Struk berhasil dikirim ke printer!");
      setShowPreview(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal terhubung ke printer.");
    }
  };

  // --- FUNGSI CETAK LABEL ---
  const executePrintLabels = async () => {
    if (typeof navigator === "undefined" || !(navigator as any).bluetooth) {
      toast.error(
        "Browser Anda tidak mendukung Bluetooth. Gunakan Chrome Android.",
      );
      return;
    }

    try {
      const printer = new WebThermalPrinter({
        mode: ConnectionMode.Bluetooth,
        paperSize: PaperSize["58mm"],
      });

      await printer.connect();

      for (const shoe of order.shoes) {
        const itemType = shoe.shoeType?.split(" - ")[0] || "Sepatu";
        const itemModel = shoe.shoeType?.split(" - ")[1] || "";
        const title = [
          itemType,
          [shoe.brand, itemModel].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(" - ");
        const price =
          Number(shoe.treatmentPrice) === 0
            ? "FREE"
            : rupiah(shoe.treatmentPrice);

        printer
          .initialize()
          .line("CHAT SHOE TREATMENT", { align: Align.Center, bold: true })
          .line(order.invoiceNumber, { align: Align.Center })
          .line("--------------------------------")
          .printQRCode({
            data: shoe.qrCode,
            size: 6,
            align: Align.Center,
          })
          .line("--------------------------------")
          .line(`${title} | ${shoe.treatment?.name || "-"}`)
          .line(`Pelanggan: ${order.customer?.name} | Kode: ${shoe.shoeCode}`)
          .line(
            `Harga: ${price} | Estimasi: ${calculateMaxEstimatedDate(order)}`,
          )
          .line("--------------------------------")
          .cutPaper()
          .execute();
      }

      toast.success("Label berhasil dikirim ke printer!");
      setShowPreview(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal terhubung ke printer.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* HEADER UI */}
      <div className="flex flex-col gap-4 mb-6 print:hidden">
        <div className="flex justify-between items-center w-full gap-2">
          <button
            onClick={() => router.back()}
            className="neu-btn flex items-center justify-center gap-2 flex-1 md:flex-none py-2"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>

          <div className="flex gap-2 flex-1 md:flex-none">
            <button
              onClick={() => setShowPreview("struk")}
              className="neu-btn flex items-center justify-center gap-2 flex-1 md:flex-none py-2"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden md:inline">Cetak Struk</span>
              <span className="md:hidden">Struk</span>
            </button>
            <button
              onClick={() => setShowPreview("label")}
              className="neu-btn-primary flex items-center justify-center gap-2 flex-1 md:flex-none py-2"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden md:inline">Cetak Label</span>
              <span className="md:hidden">Label</span>
            </button>
          </div>
        </div>

        <div className="text-center w-full">
          <h1 className="text-lg md:text-xl font-bold">
            Nota {order.invoiceNumber}
          </h1>
        </div>
      </div>

      {/* NOTA TAMPILAN LAYAR */}
      <div className="neu-card print:hidden">
        <div className="text-center border-b border-slate-700 pb-2 mb-3">
          <h2 className="text-xl font-bold text-white">CHAT SHOE TREATMENT</h2>
          <p className="text-xs text-slate-400">{order.invoiceNumber}</p>
          <div className="mt-1 flex justify-center">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isPaid
                  ? "bg-green-500/10 text-green-400 border border-green-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
              }`}
            >
              <CreditCard className="w-3 h-3" />{" "}
              {isPaid ? "LUNAS" : "BELUM LUNAS"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs mb-3">
          <span className="text-slate-400">Pelanggan</span>
          <span className="font-semibold">{order.customer?.name}</span>
          <span className="text-slate-400">Tanggal</span>
          <span>{formatDate(order.createdAt)}</span>
          <span className="text-slate-400">Estimasi</span>
          <span>{calculateMaxEstimatedDate(order)}</span>
        </div>

        <div className="space-y-3">
          {order.shoes?.map((shoe: any) => {
            const itemType = shoe.shoeType?.split(" - ")[0] || "Sepatu";
            const itemModel = shoe.shoeType?.split(" - ")[1] || "";
            return (
              <div
                key={shoe.id}
                className="border border-slate-700 rounded-lg p-2 flex gap-2 items-center relative group"
              >
                <div className="bg-white p-1 rounded-md shrink-0">
                  <QRCodeSVG value={shoe.qrCode} size={50} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">
                    {itemType} - {shoe.brand} {itemModel && `- ${itemModel}`}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {shoe.shoeCode}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {shoe.treatment?.name || "-"}
                  </p>
                  <p className="font-bold text-xs mt-1 text-accent">
                    {Number(shoe.treatmentPrice) === 0
                      ? "FREE"
                      : `Rp ${Number(shoe.treatmentPrice).toLocaleString("id-ID")}`}
                  </p>
                </div>
                {canEdit && shoe.shoeStatus === "menunggu_pengerjaan" && (
                  <button
                    onClick={() => handleDeleteShoe(shoe.id, shoe.shoeStatus)}
                    className="absolute top-1 right-1 p-1 bg-red-500/10 text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-2 border-t border-slate-700 space-y-1">
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-xs text-red-400">
              <span>Diskon ({order.promoNotes})</span>
              <span>
                - Rp {Number(order.discountAmount).toLocaleString("id-ID")}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm">Total Tagihan</span>
            <span className="font-bold text-lg text-accent">
              Rp {Number(order.totalPrice).toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {canEdit &&
        order.shoes?.some(
          (s: any) => s.shoeStatus !== "menunggu_pengerjaan",
        ) && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-xl flex items-center gap-2 print:hidden">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Beberapa item sudah diproses dan tidak dapat dihapus.
          </div>
        )}

      {/* MODAL PREVIEW CETAK */}
      {showPreview && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3 sticky top-0 bg-slate-900 z-10">
              <h2 className="font-bold text-lg text-accent">
                Preview {showPreview === "struk" ? "Struk" : "Label"}
              </h2>
              <button
                onClick={() => setShowPreview(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* AREA PREVIEW */}
            <div
              className="bg-white text-black p-3 font-mono text-[10px] w-full mx-auto shadow-inner"
              style={{ width: "56mm" }}
            >
              {/* PREVIEW STRUK */}
              {showPreview === "struk" && (
                <div className="space-y-1">
                  <div className="text-center font-bold text-sm">
                    CHAT SHOE TREATMENT
                  </div>
                  <div className="text-center">{order.invoiceNumber}</div>
                  <div className="text-center">
                    {isPaid ? "LUNAS" : "BELUM LUNAS"}
                  </div>
                  <div className="border-b border-dashed border-black my-1"></div>
                  <div>Pelanggan : {order.customer?.name}</div>
                  <div>Tanggal : {formatDate(order.createdAt)}</div>
                  <div>Estimasi : {calculateMaxEstimatedDate(order)}</div>
                  <div className="border-b border-dashed border-black my-1"></div>

                  {order.shoes?.map((shoe: any) => {
                    const itemType = shoe.shoeType?.split(" - ")[0] || "Sepatu";
                    const itemModel = shoe.shoeType?.split(" - ")[1] || "";
                    const title = [
                      itemType,
                      [shoe.brand, itemModel].filter(Boolean).join(" "),
                    ]
                      .filter(Boolean)
                      .join(" - ");
                    const price =
                      Number(shoe.treatmentPrice) === 0
                        ? "FREE"
                        : rupiah(shoe.treatmentPrice);
                    return (
                      <div key={shoe.id} className="mb-1">
                        <div className="font-bold">{title}</div>
                        <div>
                          {shoe.treatment?.name || "-"} | {shoe.shoeCode}
                        </div>
                        <div className="text-right">{price}</div>
                      </div>
                    );
                  })}

                  <div className="border-b border-dashed border-black my-1"></div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Diskon</span>
                      <span>- {rupiah(order.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs mt-1">
                    <span>TOTAL</span>
                    <span>{rupiah(order.totalPrice)}</span>
                  </div>
                  <div className="border-b border-dashed border-black my-1"></div>
                  <div className="text-center mt-2">Terima kasih</div>
                  <div className="text-center">
                    Simpan struk ini untuk pengambilan
                  </div>
                </div>
              )}

              {/* PREVIEW LABEL (PER SEPATU) */}
              {showPreview === "label" && (
                <div className="space-y-4">
                  {order.shoes?.map((shoe: any) => {
                    const itemType = shoe.shoeType?.split(" - ")[0] || "Sepatu";
                    const itemModel = shoe.shoeType?.split(" - ")[1] || "";
                    const title = [
                      itemType,
                      [shoe.brand, itemModel].filter(Boolean).join(" "),
                    ]
                      .filter(Boolean)
                      .join(" - ");
                    const price =
                      Number(shoe.treatmentPrice) === 0
                        ? "FREE"
                        : rupiah(shoe.treatmentPrice);
                    return (
                      <div
                        key={shoe.id}
                        className="border-b border-dashed border-black pb-2 mb-2 last:border-0"
                      >
                        <div className="text-center font-bold text-sm mb-1">
                          CHAT SHOE TREATMENT
                        </div>
                        <div className="text-center mb-1">
                          {order.invoiceNumber}
                        </div>
                        <div className="flex justify-center my-2">
                          <QRCodeSVG value={shoe.qrCode} size={80} />
                        </div>
                        <div className="font-bold">{title}</div>
                        <div>Treatment: {shoe.treatment?.name || "-"}</div>
                        <div>Pelanggan: {order.customer?.name}</div>
                        <div>Kode: {shoe.shoeCode}</div>
                        <div className="font-bold mt-1">Harga: {price}</div>
                        <div className="text-center mt-1">
                          Estimasi: {calculateMaxEstimatedDate(order)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TOMBOL AKSI (PRINT / BATAL) */}
            <div className="flex w-full gap-3 pt-2">
              <button
                onClick={() => setShowPreview(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={
                  showPreview === "struk"
                    ? executePrintReceipt
                    : executePrintLabels
                }
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
