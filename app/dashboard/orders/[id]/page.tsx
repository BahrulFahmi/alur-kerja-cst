"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  CreditCard,
  Receipt,
  Tag,
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
  const supabase = createClient();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLIFrameElement>(null);

  const fetchData = async () => {
    const { id } = await params;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(profile?.role);
    }

    const { data } = await supabase
      .from("orders")
      .select(
        "*, customer:customers(*), shoes(*, treatment:treatments(name, description, duration_max_days))",
      )
      .eq("id", id)
      .single();

    if (data) setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [params, supabase]);

  const calculateMaxEstimatedDate = (orderData: any) => {
    if (!orderData || !orderData.shoes || orderData.shoes.length === 0)
      return "-";

    let maxDays = 0;

    orderData.shoes.forEach((shoe: any) => {
      const days = shoe.treatment?.duration_max_days || 1;
      if (days > maxDays) maxDays = days;
    });

    if (maxDays > 0) {
      const estDate = new Date(orderData.created_at);
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
      await supabase.from("shoes").delete().eq("id", shoeId);
      const remainingShoes = order.shoes.filter((s: any) => s.id !== shoeId);
      const newTotal = remainingShoes.reduce(
        (sum: number, s: any) => sum + Number(s.treatment_price),
        0,
      );
      await supabase
        .from("orders")
        .update({ total_price: newTotal })
        .eq("id", order.id);
      toast.success("Item berhasil dihapus.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading)
    return <div className="p-10 text-center text-white">Memuat nota...</div>;
  if (!order) return <p className="p-8 text-white">Order tidak ditemukan</p>;

  const canEdit = userRole === "cashier";
  const isPaid = order.payment_status === "paid";

  const rupiah = (n: number) => `Rp${Number(n || 0).toLocaleString("id-ID")}`;

  // --- CETAK STRUK VIA BLUETOOTH ---
  const handlePrintReceipt = async () => {
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

      // Bangun Struk (parameter align & bold di dalam line)
      printer
        .initialize()
        .line("CHAT SHOE TREATMENT", { align: Align.Center, bold: true })
        .line(order.invoice_number, { align: Align.Center })
        .line(isPaid ? "LUNAS" : "BELUM LUNAS", { align: Align.Center })
        .line("--------------------------------")
        .line(`Pelanggan : ${order.customer?.name}`)
        .line(`Tanggal   : ${formatDate(order.created_at)}`)
        .line(`Estimasi  : ${calculateMaxEstimatedDate(order)}`)
        .line("--------------------------------");

      // Item-item
      order.shoes.forEach((shoe: any) => {
        const itemType = shoe.shoe_type?.split(" - ")[0] || "Sepatu";
        const itemModel = shoe.shoe_type?.split(" - ")[1] || "";
        const title = [
          itemType,
          [shoe.brand, itemModel].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(" - ");
        const price =
          Number(shoe.treatment_price) === 0
            ? "FREE"
            : rupiah(shoe.treatment_price);

        printer
          .line(title, { bold: true })
          .line(shoe.treatment?.name || "-")
          .line(shoe.shoe_code)
          .line(price, { align: Align.Right });
      });

      printer.line("--------------------------------");

      if (order.discount_amount > 0) {
        printer
          .line(`Diskon (${order.promo_notes || "Promo"})`)
          .line(`- ${rupiah(order.discount_amount)}`, { align: Align.Right });
      }

      printer
        .line("--------------------------------")
        .line("TOTAL", { bold: true })
        .line(rupiah(order.total_price), { align: Align.Right, bold: true })
        .line("--------------------------------")
        .line("Terima kasih", { align: Align.Center })
        .line("Simpan struk ini untuk pengambilan", { align: Align.Center })
        .rule()
        .cutPaper()
        .execute();

      toast.success("Perintah cetak struk berhasil dikirim!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal terhubung ke printer.");
    }
  };

  // --- CETAK LABEL VIA BLUETOOTH ---
  const handlePrintLabels = async () => {
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
        const itemType = shoe.shoe_type?.split(" - ")[0] || "Sepatu";
        const itemModel = shoe.shoe_type?.split(" - ")[1] || "";
        const title = [
          itemType,
          [shoe.brand, itemModel].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(" - ");
        const price =
          Number(shoe.treatment_price) === 0
            ? "FREE"
            : rupiah(shoe.treatment_price);

        printer
          .initialize()
          .line("CHAT SHOE TREATMENT", { align: Align.Center, bold: true })
          .line("--------------------------------")
          .line(title, { bold: true })
          .line(`Treatment: ${shoe.treatment?.name || "-"}`)
          .line(`Pelanggan: ${order.customer?.name}`)
          .line(`Kode: ${shoe.shoe_code}`)
          .line(`Harga: ${price}`, { bold: true })
          .line("--------------------------------")
          .line(`Estimasi: ${calculateMaxEstimatedDate(order)}`, {
            align: Align.Center,
          })
          .rule()
          .cutPaper()
          .execute();
      }

      toast.success("Label berhasil dikirim ke printer!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal terhubung ke printer.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <iframe ref={printRef} style={{ display: "none" }} title="print-frame" />

      {/* HEADER UI - RAPI UNTUK MOBILE */}
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
              onClick={handlePrintReceipt}
              className="neu-btn flex items-center justify-center gap-2 flex-1 md:flex-none py-2"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden md:inline">Cetak Struk</span>
              <span className="md:hidden">Struk</span>
            </button>
            <button
              onClick={handlePrintLabels}
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
            Nota {order.invoice_number}
          </h1>
        </div>
      </div>

      {/* NOTA TAMPILAN LAYAR */}
      <div className="neu-card print:hidden">
        <div className="text-center border-b border-slate-700 pb-2 mb-3">
          <h2 className="text-xl font-bold text-white">CHAT SHOE TREATMENT</h2>
          <p className="text-xs text-slate-400">{order.invoice_number}</p>
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
          <span className="font-semibold">{order.customer.name}</span>
          <span className="text-slate-400">Tanggal</span>
          <span>{formatDate(order.created_at)}</span>
          <span className="text-slate-400">Estimasi</span>
          <span>{calculateMaxEstimatedDate(order)}</span>
        </div>

        <div className="space-y-3">
          {order.shoes.map((shoe: any) => {
            const itemType = shoe.shoe_type?.split(" - ")[0] || "Sepatu";
            const itemModel = shoe.shoe_type?.split(" - ")[1] || "";
            return (
              <div
                key={shoe.id}
                className="border border-slate-700 rounded-lg p-2 flex gap-2 items-center relative group"
              >
                <div className="bg-white p-1 rounded-md shrink-0">
                  <QRCodeSVG value={shoe.qr_code} size={50} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">
                    {itemType} - {shoe.brand} {itemModel && `- ${itemModel}`}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {shoe.shoe_code}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {shoe.treatment?.name || "-"}
                  </p>
                  <p className="font-bold text-xs mt-1 text-accent">
                    {shoe.treatment_price === 0
                      ? "FREE"
                      : `Rp ${shoe.treatment_price.toLocaleString("id-ID")}`}
                  </p>
                </div>
                {canEdit && shoe.shoe_status === "menunggu_pengerjaan" && (
                  <button
                    onClick={() => handleDeleteShoe(shoe.id, shoe.shoe_status)}
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
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-xs text-red-400">
              <span>Diskon ({order.promo_notes})</span>
              <span>- Rp {order.discount_amount.toLocaleString("id-ID")}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm">Total Tagihan</span>
            <span className="font-bold text-lg text-accent">
              Rp {order.total_price.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {canEdit &&
        order.shoes.some(
          (s: any) => s.shoe_status !== "menunggu_pengerjaan",
        ) && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-xl flex items-center gap-2 print:hidden">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Beberapa item sudah diproses dan tidak dapat dihapus.
          </div>
        )}
    </div>
  );
}
