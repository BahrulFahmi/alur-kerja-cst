"use client";
import { useState, useEffect } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  CreditCard,
  Printer,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

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
      // Ambil langsung dari database, bukan dari teks deskripsi
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

  const esc = (t: any) =>
    String(t ?? "").replace(
      /[&<>"]/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[
          c
        ] as string,
    );

  // Cetak dokumen HTML lewat iframe tersembunyi (tidak terpengaruh layout dashboard)
  const printHtml = (html: string, fitSelector?: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      // Struk: ukur tinggi isi lalu jadikan tinggi kertas (Chrome tidak
      // mendukung "size: 57mm auto", jadi tingginya harus angka pasti).
      if (fitSelector) {
        const el = doc.querySelector(fitSelector) as HTMLElement | null;
        if (el) {
          const mm =
            Math.ceil((el.getBoundingClientRect().height * 25.4) / 96) + 2;
          const st = doc.createElement("style");
          st.textContent = `@page { size: 57mm ${mm}mm; margin: 0; }`;
          doc.head.appendChild(st);
        }
      }
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 300);
  };

  const rupiah = (n: number) => `Rp${Number(n || 0).toLocaleString("id-ID")}`;

  // Cetak struk/nota thermal: lebar kertas 57-58 mm, tinggi mengikuti isi.
  const handlePrintReceipt = () => {
    const estimasi = calculateMaxEstimatedDate(order);
    const itemsHtml = order.shoes
      .map((shoe: any) => {
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
        return `
          <div class="item">
            <div class="name">${esc(title)}</div>
            <div class="row small"><span>${esc(shoe.treatment?.name || "-")}</span><b>${esc(price)}</b></div>
            <div class="small mono">${esc(shoe.shoe_code)}</div>
          </div>`;
      })
      .join("");

    const discountHtml =
      order.discount_amount > 0
        ? `<div class="row small"><span>Diskon${order.promo_notes ? ` (${esc(order.promo_notes)})` : ""}</span><span>- ${esc(rupiah(order.discount_amount))}</span></div>`
        : "";

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Struk ${esc(order.invoice_number)}</title>
      <style>
        @page { margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: #000;
          font-family: Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .receipt { width: 57mm; padding: 2mm 3mm 4mm; font-size: 8.5pt; line-height: 1.25; }
        .center { text-align: center; }
        .brand { font-size: 11pt; font-weight: 800; }
        .small { font-size: 7.5pt; }
        .mono { font-family: "Courier New", monospace; color: #000; }
        .row { display: flex; justify-content: space-between; gap: 2mm; }
        .row > span:first-child { min-width: 0; word-break: break-word; }
        .row > b, .row > span:last-child { white-space: nowrap; }
        .hr { border-top: 0.3mm dashed #000; margin: 1.5mm 0; }
        .item { margin-bottom: 1.5mm; }
        .name { font-weight: 700; word-break: break-word; }
        .total { font-size: 10pt; font-weight: 800; }
        .badge { display: inline-block; border: 0.3mm solid #000; padding: 0 2mm;
          font-size: 7.5pt; font-weight: 800; margin-top: 1mm; }
      </style></head><body>
        <div class="receipt">
          <div class="center">
            <div class="brand">CHAT SHOE TREATMENT</div>
            <div class="small">${esc(order.invoice_number)}</div>
            <div class="badge">${isPaid ? "LUNAS" : "BELUM LUNAS"}</div>
          </div>
          <div class="hr"></div>
          <div class="row small"><span>Pelanggan</span><span>${esc(order.customer?.name)}</span></div>
          <div class="row small"><span>Tanggal</span><span>${esc(formatDate(order.created_at))}</span></div>
          <div class="row small"><span>Estimasi</span><span>${esc(estimasi)}</span></div>
          <div class="hr"></div>
          ${itemsHtml}
          <div class="hr"></div>
          ${discountHtml}
          <div class="row total"><span>TOTAL</span><span>${esc(rupiah(order.total_price))}</span></div>
          <div class="hr"></div>
          <div class="center small">Terima kasih<br/>Simpan struk ini untuk pengambilan</div>
        </div>
      </body></html>`;

    printHtml(html, ".receipt");
  };

  // Cetak stiker: ukuran kustom 7,675 cm x 5,925 cm, 1 sepatu = 1 halaman.
  // Dicetak lewat iframe tersembunyi supaya tidak terpengaruh layout dashboard.
  const handlePrintLabels = () => {
    const estimasi = calculateMaxEstimatedDate(order);
    const labelsHtml = order.shoes
      .map((shoe: any) => {
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
            : `Rp${Number(shoe.treatment_price).toLocaleString("id-ID")}`;
        const qr = renderToStaticMarkup(
          <QRCodeSVG value={shoe.qr_code} size={256} />,
        );
        return `
          <div class="sticker">
            <div class="left">
              <div class="title">${esc(title)}</div>
              <div class="meta">
                <span>${esc(shoe.treatment?.name || "-")}</span>
                <span>${esc(order.customer?.name)} · ${esc(order.invoice_number)}</span>
                <span>${esc(shoe.shoe_code)} · Est. ${esc(estimasi)}</span>
              </div>
            </div>
            <div class="right">
              <div class="qr">${qr}</div>
              <div class="price">${esc(price)}</div>
            </div>
          </div>`;
      })
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Label ${esc(order.invoice_number)}</title>
      <style>
        @page { size: 76.75mm 59.25mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: #000;
          font-family: Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sticker { width: 76.75mm; height: 59.25mm; padding: 2mm; overflow: hidden;
          display: grid; grid-template-columns: 1fr 27mm; gap: 1.5mm;
          page-break-after: always; break-after: page; }
        .sticker:last-child { page-break-after: auto; break-after: auto; }
        .left { border: 0.4mm solid #000; display: flex; flex-direction: column;
          justify-content: space-between; align-items: center; padding: 1.5mm; min-width: 0; }
        .title { flex: 1; display: flex; align-items: center; justify-content: center;
          text-align: center; font-weight: 800; font-size: 17pt; line-height: 1.1;
          word-break: break-word; overflow: hidden; }
        .meta { width: 100%; display: flex; flex-direction: column; gap: 0.3mm;
          font-size: 6pt; line-height: 1.15; text-align: center;
          border-top: 0.3mm dashed #000; padding-top: 1mm; }
        .right { display: flex; flex-direction: column; border: 0.4mm solid #000; min-width: 0; }
        .qr { flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 1mm; min-height: 0; }
        .qr svg { width: 100%; height: 100%; }
        .price { border-top: 0.4mm solid #000; text-align: center;
          font-weight: 800; font-size: 11pt; padding: 1mm 0; }
      </style></head><body>${labelsHtml}</body></html>`;

    printHtml(html);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* UI LAYAR (otomatis disembunyikan saat print) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="neu-btn flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <h1 className="text-xl font-bold">Nota {order.invoice_number}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReceipt}
            className="neu-btn flex items-center gap-2"
          >
            <Receipt className="w-4 h-4" /> Cetak Struk
          </button>
          <button
            onClick={handlePrintLabels}
            className="neu-btn-primary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Cetak Label
          </button>
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
