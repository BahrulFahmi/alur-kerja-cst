"use client";
import { useState, useEffect, useMemo, useRef } from "react";
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
  UserSquare2,
  BarChart3,
  Eye,
  Tags,
  X,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  // State Filter Baru
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterPickup, setFilterPickup] = useState("all");

  const [activeTab, setActiveTab] = useState<"laporan" | "pelanggan">(
    "laporan",
  );

  const [printPreview, setPrintPreview] = useState<{
    isOpen: boolean;
    html: string;
  }>({ isOpen: false, html: "" });

  const [previewScale, setPreviewScale] = useState(0.6);

  const printRef = useRef<HTMLIFrameElement>(null);

  const closePreview = () => setPrintPreview({ isOpen: false, html: "" });

  // Hitung skala agar kertas A4 selalu muat di layar tanpa scroll
  useEffect(() => {
    if (!printPreview.isOpen) return;

    const PAPER_W = 794; // 210mm
    const PAPER_H = 1123; // 297mm

    const calc = () => {
      const availH = window.innerHeight - 170; // ruang untuk header + tombol
      const availW = window.innerWidth - 48;
      setPreviewScale(Math.min(availH / PAPER_H, availW / PAPER_W, 1));
    };

    calc();
    window.addEventListener("resize", calc);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPrintPreview({ isOpen: false, html: "" });
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("keydown", onKey);
    };
  }, [printPreview.isOpen]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: shoes } = await supabase
        .from("shoes")
        .select(
          `
          id, brand, shoe_type, shoe_status, created_at, treatment_id, treatment_price,
          order:orders(id, invoice_number, order_date, updated_at, total_price, payment_status, payment_method, customer:customers(name, whatsapp)), 
          treatment:treatments(name), 
          assignment:shoe_assignments(technician:profiles(full_name), started_at, completed_at),
          handover:order_handover(handed_over_at)
        `,
        )
        .order("created_at", { ascending: false });

      const { data: techs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "technician");
      const { data: custs } = await supabase
        .from("customers")
        .select(
          `id, name, whatsapp, created_at, orders(id, total_price, created_at)`,
        )
        .order("name", { ascending: true });
      const { data: tr } = await supabase
        .from("treatments")
        .select("*")
        .order("name", { ascending: true });

      if (shoes) setRawData(shoes);
      if (techs) setTechnicians(techs);
      if (custs) setCustomers(custs);
      if (tr) setTreatments(tr);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const revenueStats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });
    const processedOrders = new Set();
    let pendapatanCash = 0;
    let pendapatanTransfer = 0;
    let pendapatanHariIni = 0;

    rawData.forEach((s) => {
      if (s.order.payment_status !== "paid") return;
      const orderId = s.order.id;
      if (processedOrders.has(orderId)) return;

      const paymentDate = new Date(s.order.updated_at || s.order.created_at)
        .toISOString()
        .split("T")[0];
      if (paymentDate === todayStr) {
        const orderTotal = Number(s.order.total_price);
        pendapatanHariIni += orderTotal;
        if (s.order.payment_method === "Cash") pendapatanCash += orderTotal;
        else pendapatanTransfer += orderTotal;
        processedOrders.add(orderId);
      }
    });
    return { pendapatanCash, pendapatanTransfer, pendapatanHariIni };
  }, [rawData]);

  const todayStats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });
    let masukLunas = 0,
      masukBelumLunas = 0,
      keluarSudahBayar = 0,
      keluarBayarHariIni = 0;
    let stokAwalSelesai = 0,
      stokAwalBelumSelesai = 0;

    // Variabel fisik untuk stok akhir
    let totalFisikSelesai = 0;
    let totalFisikBelum = 0;

    rawData.forEach((s) => {
      const createdDateStr = new Date(s.created_at).toISOString().split("T")[0];
      const isCreatedToday = createdDateStr === todayStr;
      const handover = s.handover?.[0];
      const isHandedOverToday =
        handover &&
        new Date(handover.handed_over_at).toISOString().split("T")[0] ===
          todayStr;
      const isSelesai = ["selesai_dicuci", "siap_diambil"].includes(
        s.shoe_status,
      );

      // 1. Hitung Stok Awal (Masuk sebelum hari ini & belum diambil)
      if (!isCreatedToday && s.shoe_status !== "sudah_diambil") {
        if (isSelesai) stokAwalSelesai++;
        else stokAwalBelumSelesai++;
      }

      // 2. Hitung Masuk (Baru masuk hari ini)
      if (isCreatedToday) {
        if (s.order.payment_status === "paid") masukLunas++;
        else masukBelumLunas++;
      }

      // 3. Hitung Keluar (Diambil hari ini)
      if (isHandedOverToday) {
        if (isCreatedToday) keluarSudahBayar++;
        else keluarBayarHariIni++;
      }

      // 4. Hitung Fisik Stok Akhir (Semua yang belum diambil, termasuk overdue)
      if (s.shoe_status !== "sudah_diambil") {
        if (isSelesai) totalFisikSelesai++;
        else totalFisikBelum++;
      }
    });

    const totalStokAwal = stokAwalSelesai + stokAwalBelumSelesai;
    const totalMasuk = masukLunas + masukBelumLunas;
    const totalKeluar = keluarSudahBayar + keluarBayarHariIni;

    // Stok akhir diambil dari hitungan fisik agar sinkron dengan halaman Pantauan
    const totalStokAkhir = totalFisikSelesai + totalFisikBelum;

    return {
      masukLunas,
      masukBelumLunas,
      keluarSudahBayar,
      keluarBayarHariIni,
      stokAwalSelesai,
      stokAwalBelumSelesai,
      stokAkhirSelesai: totalFisikSelesai,
      stokAkhirBelumDikerjakan: totalFisikBelum,
      totalStokAwal,
      totalMasuk,
      totalKeluar,
      totalStokAkhir,
      ...revenueStats,
    };
  }, [rawData, revenueStats]);

  const techPerformance = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });
    const perf: Record<string, number> = {};
    technicians.forEach((t) => (perf[t.full_name] = 0));

    rawData.forEach((s) => {
      const handover = s.handover?.[0];
      const isHandedOverToday =
        handover &&
        new Date(handover.handed_over_at).toISOString().split("T")[0] ===
          todayStr;
      if (isHandedOverToday) {
        const assignment = s.assignment?.[0];
        if (assignment && assignment.technician?.full_name) {
          const name = assignment.technician.full_name;
          perf[name] = (perf[name] || 0) + 1;
        }
      }
    });
    return Object.entries(perf).map(([name, count]) => ({ name, count }));
  }, [rawData, technicians]);

  const filteredData = useMemo(() => {
    return rawData.filter((shoe) => {
      const keyword = search.toLowerCase();
      const matchSearch =
        shoe.order.invoice_number.toLowerCase().includes(keyword) ||
        shoe.order.customer.name.toLowerCase().includes(keyword) ||
        shoe.brand.toLowerCase().includes(keyword);
      if (!matchSearch) return false;

      const shoeDateStr = new Date(shoe.created_at).toISOString().split("T")[0];
      if (dateStart && shoeDateStr < dateStart) return false;
      if (dateEnd && shoeDateStr > dateEnd) return false;

      // Filter Pembayaran
      if (filterPayment === "paid" && shoe.order.payment_status !== "paid")
        return false;
      if (filterPayment === "unpaid" && shoe.order.payment_status === "paid")
        return false;

      // Filter Pengambilan
      const isTaken = shoe.shoe_status === "sudah_diambil";
      if (filterPickup === "taken" && !isTaken) return false;
      if (filterPickup === "not_taken" && isTaken) return false;

      return true;
    });
  }, [rawData, search, dateStart, dateEnd, filterPayment, filterPickup]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.whatsapp.includes(search),
    );
  }, [customers, search]);

  const reportDataTreatment = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });
    const validShoes = rawData.filter((s) => {
      if (s.order.payment_status !== "paid") return false;
      const paymentDate = new Date(s.order.updated_at || s.order.created_at)
        .toISOString()
        .split("T")[0];
      return paymentDate === todayStr;
    });

    const normalize = (str: string) =>
      (str || "").toLowerCase().trim().replace(/-/g, " ");
    let totalKeseluruhanCount = 0;

    const items = treatments.map((t) => {
      const masterName = normalize(t.name);
      const matchedShoes = validShoes.filter(
        (s) => normalize(s.treatment?.name || "") === masterName,
      );
      const count = matchedShoes.length;
      const revenue = matchedShoes.reduce(
        (sum, s) => sum + Number(s.treatment_price),
        0,
      );
      totalKeseluruhanCount += count;
      return { name: t.name, count, revenue };
    });

    const cashInHand = { cash: 0, qr: 0, bsi: 0, bri: 0, bca: 0 };
    validShoes.forEach((s) => {
      const price = Number(s.treatment_price);
      const method = s.order.payment_method?.toLowerCase() || "";
      if (method === "cash") cashInHand.cash += price;
      else if (method.includes("qr")) cashInHand.qr += price;
      else if (method.includes("bsi")) cashInHand.bsi += price;
      else if (method.includes("bri")) cashInHand.bri += price;
      else if (method.includes("bca")) cashInHand.bca += price;
    });

    return {
      items,
      totalCount: totalKeseluruhanCount,
      totalRevenue: revenueStats.pendapatanHariIni,
      cashInHand,
    };
  }, [rawData, treatments, revenueStats]);

  const generatePrintHtml = (type: "harian" | "treatment") => {
    const dateStr = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    let htmlContent = "";

    const cssStyle = `
      @page { size: A4 portrait; margin: 10mm; }
      * { box-sizing: border-box; }
      body { font-family: monospace; font-size: 12px; padding: 0; margin: 0; color: black; background: white; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
      th, td { border: 1px solid black; padding: 4px; text-align: left; word-wrap: break-word; vertical-align: middle; }
      .text-center { text-align: center !important; }
      .text-right { text-align: right !important; }
      .bold { font-weight: bold; }
      .title { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 10px; border: 1px solid black; padding: 5px; }
      .header-info { margin-bottom: 10px; }
      .bg-gray { background-color: #eee; }
      
      .bottom-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .bottom-table > tbody > tr > td { border: none; padding: 0; vertical-align: top; }
      .inner-table { width: 100%; border-collapse: collapse; margin-bottom: 0; table-layout: fixed;}
      .inner-table td, .inner-table th { border: 1px solid black; padding: 4px; }
      .bottom-table > tbody > tr > td:last-child .inner-table { width: calc(100% + 1px); margin-left: -1px; }

      /* CSS KHUSUS AGAR LAPORAN TREATMENT MUAT 1 HALAMAN */
      .compact-table th, .compact-table td { padding: 2px 4px; font-size: 11px; }
      .signature-box { margin-top: 15px !important; }
    `;

    if (type === "harian") {
      htmlContent = `
        <html>
        <head><title>Laporan Harian</title><style>${cssStyle}</style></head>
        <body>
          <div class="title">LAPORAN HARIAN KASIR CHAT SHOE TREATMENT</div>
          <div class="header-info">Hari, tanggal : ${dateStr}</div>

          <table>
            <colgroup><col style="width:30%"/><col style="width:40%"/><col style="width:10%"/><col style="width:20%"/></colgroup>
            <tr>
              <td rowspan="2" style="width: 30%;" class="bold text-center">STOK AWAL SEPATU</td>
              <td class="text-center" style="width: 40%;">Selesai</td>
              <td class="text-center" style="width: 10%;">${todayStats.stokAwalSelesai}</td>
              <td rowspan="2" class="text-center bold" style="width: 20%;">TOTAL<br/>${todayStats.stokAwalSelesai + todayStats.stokAwalBelumSelesai}</td>
            </tr>
            <tr>
              <td class="text-center">Belum Selesai</td>
              <td class="text-center">${todayStats.stokAwalBelumSelesai}</td>
            </tr>
            <tr>
              <td rowspan="2" class="bold text-center">MASUK</td>
              <td class="text-center">Lunas</td>
              <td class="text-center">${todayStats.masukLunas}</td>
              <td rowspan="2" class="text-center bold">TOTAL<br/>${todayStats.masukLunas + todayStats.masukBelumLunas}</td>
            </tr>
            <tr>
              <td class="text-center">Belum Lunas</td>
              <td class="text-center">${todayStats.masukBelumLunas}</td>
            </tr>
            <tr>
              <td rowspan="2" class="bold text-center">KELUAR</td>
              <td class="text-center">Sudah Bayar</td>
              <td class="text-center">${todayStats.keluarSudahBayar}</td>
              <td rowspan="2" class="text-center bold">TOTAL<br/>${todayStats.keluarSudahBayar + todayStats.keluarBayarHariIni}</td>
            </tr>
            <tr>
              <td class="text-center">Bayar Hari Ini</td>
              <td class="text-center">${todayStats.keluarBayarHariIni}</td>
            </tr>
            <tr>
              <td rowspan="2" class="bold text-center">STOK AKHIR SEPATU</td>
              <td class="text-center">Selesai</td>
              <td class="text-center">${todayStats.stokAkhirSelesai}</td>
              <td rowspan="2" class="text-center bold">TOTAL<br/>${todayStats.totalStokAkhir}</td>
            </tr>
            <tr>
              <td class="text-center">Belum dikerjakan</td>
              <td class="text-center">${todayStats.stokAkhirBelumDikerjakan}</td>
            </tr>
          </table>

          <table>
            <colgroup><col style="width:30%"/><col style="width:40%"/><col style="width:10%"/><col style="width:20%"/></colgroup>
            <tr class="bg-gray bold"><td colspan="4" class="text-center">TOTAL PENDAPATAN</td></tr>
            <tr class="bg-gray text-center"><td>Bayar Tunai</td><td>Bayar via QRIS / Transfer</td><td colspan="2">Total Pendapatan</td></tr>
            <tr class="bold text-center">
              <td>Rp ${todayStats.pendapatanCash.toLocaleString("id-ID")}</td>
              <td>Rp ${todayStats.pendapatanTransfer.toLocaleString("id-ID")}</td>
              <td colspan="2">Rp ${todayStats.pendapatanHariIni.toLocaleString("id-ID")}</td>
            </tr>
          </table>

          <table>
            <colgroup><col style="width:30%"/><col style="width:40%"/><col style="width:10%"/><col style="width:20%"/></colgroup>
            <tr class="bg-gray bold">
              <td class="text-center">NAMA SHOETECH</td>
              <td class="text-center">Total pengerjaan</td>
              <td colspan="2" rowspan="${1 + Math.max(5, techPerformance.length)}" class="text-center" style="vertical-align: top;">CATATAN:</td>
            </tr>
            ${techPerformance.map((t) => `<tr><td>${t.name}</td><td class="text-center">${t.count}</td></tr>`).join("")}
            ${[...Array(Math.max(0, 5 - techPerformance.length))].map(() => `<tr><td>&nbsp;</td><td>&nbsp;</td></tr>`).join("")}
          </table>

          <div style="margin-top: 30px;">
            dilaporkan oleh :<br/><br/><br/><br/>
            ____________________
          </div>
        </body>
        </html>
      `;
    } else {
      // Filter hanya item yang ada transaksinya agar tidak memakan tempat
      const activeItems = reportDataTreatment.items.filter(
        (item) => item.count > 0,
      );

      htmlContent = `
        <html>
        <head><title>Laporan Treatment</title><style>${cssStyle}</style></head>
        <body>
          <div class="title">CHAT SHOE TREATMENT</div>
          <div style="margin-bottom: 8px;">Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}</div>

          <table class="compact-table">
            <thead>
              <tr class="bg-gray">
                <th>Treatment</th>
                <th class="text-center" style="width: 25%;">Banyaknya sepatu</th>
                <th class="text-right" style="width: 25%;">Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              ${
                activeItems.length > 0
                  ? activeItems
                      .map(
                        (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-center">${item.count}</td>
                  <td class="text-right">Rp ${item.revenue.toLocaleString("id-ID")}</td>
                </tr>
              `,
                      )
                      .join("")
                  : `<tr><td colspan="3" class="text-center">Tidak ada transaksi</td></tr>`
              }
              <tr class="bg-gray bold">
                <td class="text-right">TOTAL KESELURUHAN</td>
                <td class="text-center">${reportDataTreatment.totalCount}</td>
                <td class="text-right">Rp ${reportDataTreatment.totalRevenue.toLocaleString("id-ID")}</td>
              </tr>
            </tbody>
          </table>

          <table class="bottom-table">
            <tr>
              <td style="width: 50%;">
                <table class="inner-table">
                  <tr class="bg-gray"><td colspan="2" class="bold">Pengeluaran</td></tr>
                  <tr><td style="width: 50%;">Nama</td><td style="width: 50%;" class="text-right">Harga</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                </table>
              </td>
              <td style="width: 50%;">
                <table class="inner-table">
                  <tr class="bg-gray bold"><td style="width: 50%;">Cash In Hand</td><td style="width: 50%;" class="text-right"></td></tr>
                  <tr><td>Cash</td><td class="text-right">${reportDataTreatment.cashInHand.cash > 0 ? `Rp ${reportDataTreatment.cashInHand.cash.toLocaleString("id-ID")}` : ""}</td></tr>
                  <tr><td>QR</td><td class="text-right">${reportDataTreatment.cashInHand.qr > 0 ? `Rp ${reportDataTreatment.cashInHand.qr.toLocaleString("id-ID")}` : ""}</td></tr>
                  <tr><td>BSI</td><td class="text-right">${reportDataTreatment.cashInHand.bsi > 0 ? `Rp ${reportDataTreatment.cashInHand.bsi.toLocaleString("id-ID")}` : ""}</td></tr>
                  <tr><td>BRI</td><td class="text-right">${reportDataTreatment.cashInHand.bri > 0 ? `Rp ${reportDataTreatment.cashInHand.bri.toLocaleString("id-ID")}` : ""}</td></tr>
                  <tr><td>BCA</td><td class="text-right">${reportDataTreatment.cashInHand.bca > 0 ? `Rp ${reportDataTreatment.cashInHand.bca.toLocaleString("id-ID")}` : ""}</td></tr>
                  <tr class="bold"><td>Total</td><td class="text-right">Rp ${reportDataTreatment.totalRevenue.toLocaleString("id-ID")}</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <div class="bg-gray bold" style="padding: 4px; border: 1px solid black; margin-top: 5px; text-align: center;">
            TOTAL KESELURUHAN: ${reportDataTreatment.totalCount} Sepatu - Rp ${reportDataTreatment.totalRevenue.toLocaleString("id-ID")}
          </div>

          <div class="signature-box">
            Nama pembuat laporan<br/><br/><br/><br/>
            ____________________
          </div>
        </body>
        </html>
      `;
    }
    return htmlContent;
  };

  const handlePreview = (type: "harian" | "treatment") => {
    const html = generatePrintHtml(type);
    setPrintPreview({ isOpen: true, html });
  };

  const executePrint = () => {
    const iframe = printRef.current;
    if (!iframe) return;
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(printPreview.html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setPrintPreview({ isOpen: false, html: "" });
    }, 500);
  };

  const exportToExcel = () => {
    if (activeTab === "laporan") {
      if (filteredData.length === 0) return toast.error("Tidak ada data.");
      const excelData = filteredData.map((s, index) => ({
        No: index + 1,
        "No. Nota": s.order.invoice_number,
        "Tgl Masuk": formatDate(s.created_at),
        Pelanggan: s.order.customer.name,
        Item: `${s.brand} - ${s.shoe_type}`,
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
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Transaksi");
      XLSX.writeFile(
        wb,
        `Laporan_Transaksi_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } else {
      if (filteredCustomers.length === 0) return toast.error("Tidak ada data.");
      const excelData = filteredCustomers.map((c, index) => ({
        No: index + 1,
        "Nama Pelanggan": c.name,
        WhatsApp: c.whatsapp,
        "Total Transaksi": c.orders.length,
        "Total Pengeluaran": c.orders.reduce(
          (sum: number, o: any) => sum + Number(o.total_price),
          0,
        ),
      }));
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Pelanggan");
      XLSX.writeFile(
        wb,
        `Data_Pelanggan_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    }
    toast.success("File Excel berhasil diunduh!");
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
    <div className="max-w-full mx-auto space-y-4 pb-24 md:pb-10 px-2 md:px-0">
      <iframe ref={printRef} style={{ display: "none" }} title="print-frame" />

      {/* MODAL PREVIEW PRINT (KOMPAK, TANPA SCROLL) */}
      {printPreview.isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3"
          onClick={closePreview}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200">
                <Printer className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold">Preview Cetak</span>
              </div>
              <button
                onClick={closePreview}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Kertas (diperkecil otomatis, tanpa scroll) */}
            <div
              className="bg-white shadow-xl overflow-hidden rounded-sm"
              style={{
                width: 794 * previewScale,
                height: 1123 * previewScale,
              }}
            >
              <iframe
                srcDoc={printPreview.html.replace(
                  "</head>",
                  "<style>html,body{overflow:hidden !important;} body{padding:10mm !important;}</style></head>",
                )}
                scrolling="no"
                title="preview"
                style={{
                  width: 794,
                  height: 1123,
                  border: "none",
                  display: "block",
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Tombol aksi */}
            <div className="flex w-full gap-3">
              <button
                onClick={closePreview}
                className="flex-1 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={executePrint}
                className="flex-1 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Printer className="w-4 h-4" /> Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Laporan & Data</h1>
          <p className="text-slate-400 text-xs md:text-sm">
            Pusat analisis operasional.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <button
            onClick={() => handlePreview("treatment")}
            className="neu-btn text-xs md:text-sm py-2 md:py-2 w-full md:w-auto justify-center flex gap-2 border-slate-500/50 text-slate-300 hover:bg-slate-500/10"
          >
            <Tags className="w-4 h-4" /> Laporan Treatment
          </button>
          <button
            onClick={() => handlePreview("harian")}
            className="neu-btn text-xs md:text-sm py-2 md:py-2 w-full md:w-auto justify-center flex gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <Printer className="w-4 h-4" /> Tutup Laporan
          </button>
          <button
            onClick={exportToExcel}
            className="neu-btn text-xs md:text-sm py-2 md:py-2 w-full md:w-auto justify-center flex gap-2"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-900 p-1 rounded-xl shadow-neu-in w-full md:w-1/3">
        <button
          onClick={() => setActiveTab("laporan")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${activeTab === "laporan" ? "bg-slate-800 text-accent shadow" : "text-slate-400"}`}
        >
          <BarChart3 className="w-4 h-4" /> Laporan
        </button>
        <button
          onClick={() => setActiveTab("pelanggan")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${activeTab === "pelanggan" ? "bg-slate-800 text-accent shadow" : "text-slate-400"}`}
        >
          <UserSquare2 className="w-4 h-4" /> Pelanggan
        </button>
      </div>

      {/* CARD STATISTIK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="neu-card border-l-4 border-l-accent p-3 md:p-5">
          <div className="flex items-center gap-2 text-accent mb-1">
            <TrendingUp className="w-4 h-4" />
            <p className="text-[10px] md:text-xs font-semibold uppercase">
              Pendapatan
            </p>
          </div>
          <p className="text-sm md:text-xl font-bold">
            Rp {todayStats.pendapatanHariIni.toLocaleString("id-ID")}
          </p>
          <p className="text-[10px] text-slate-500">Hari ini</p>
        </div>
        <div className="neu-card p-3 md:p-5">
          <div className="flex items-center gap-2 text-status-working mb-1">
            <Package className="w-4 h-4" />
            <p className="text-[10px] md:text-xs font-semibold uppercase">
              Masuk
            </p>
          </div>
          <p className="text-sm md:text-xl font-bold">
            {todayStats.totalMasuk}{" "}
            <span className="text-xs font-normal">Psg</span>
          </p>
          <p className="text-[10px] text-slate-500">Hari ini</p>
        </div>
        <div className="neu-card p-3 md:p-5">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <p className="text-[10px] md:text-xs font-semibold uppercase">
              Keluar
            </p>
          </div>
          <p className="text-sm md:text-xl font-bold">
            {todayStats.totalKeluar}{" "}
            <span className="text-xs font-normal">Psg</span>
          </p>
          <p className="text-[10px] text-slate-500">Hari ini</p>
        </div>
        <div className="neu-card border-l-4 border-l-red-500 p-3 md:p-5">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <Clock className="w-4 h-4" />
            <p className="text-[10px] md:text-xs font-semibold uppercase">
              Stok
            </p>
          </div>
          <p className="text-sm md:text-xl font-bold">
            {todayStats.totalStokAkhir}{" "}
            <span className="text-xs font-normal">Psg</span>
          </p>
          <p className="text-[10px] text-slate-500">Belum diambil</p>
        </div>
      </div>

      {/* FILTER (DIPERBARUI AGAR RAPI) */}
      <div className="flex flex-col xl:flex-row gap-3 mt-2 w-full">
        {/* Baris 1 di HP / Kiri di Laptop: Search & Tanggal */}
        <div className="flex flex-col md:flex-row flex-1 gap-3">
          {/* Search */}
          <div className="relative w-full md:w-1/2">
            <input
              type="text"
              placeholder="Cari nota, pelanggan..."
              className="neu-input pl-9 py-3 md:py-2 text-sm w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Filter Tanggal */}
          <div className="flex items-center gap-2 w-full md:w-1/2">
            <input
              type="date"
              className="neu-input cursor-pointer py-3 md:py-2 w-full text-sm"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
            <span className="text-slate-500 text-sm">-</span>
            <input
              type="date"
              className="neu-input cursor-pointer py-3 md:py-2 w-full text-sm"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>
        </div>

        {/* Baris 2 di HP / Kanan di Laptop: Filter Select */}
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
          {/* Filter Pembayaran */}
          <select
            className="neu-input py-3 md:py-2 text-sm w-full md:w-[200px]"
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
          >
            <option value="all">Semua Pembayaran</option>
            <option value="paid">Lunas</option>
            <option value="unpaid">Belum Lunas</option>
          </select>

          {/* Filter Pengambilan */}
          <select
            className="neu-input py-3 md:py-2 text-sm w-full md:w-[200px]"
            value={filterPickup}
            onChange={(e) => setFilterPickup(e.target.value)}
          >
            <option value="all">Semua Pengambilan</option>
            <option value="taken">Sudah Diambil</option>
            <option value="not_taken">Belum Diambil</option>
          </select>
        </div>
      </div>

      {/* TABEL LAPORAN */}
      {activeTab === "laporan" && (
        <div className="neu-card !p-0 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-[11px] md:text-xs min-w-[1000px]">
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
                    Item
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
                    Tgl Diambil
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
                      Tidak ada data ditemukan.
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
                          className={`neu-badge text-[9px] uppercase ${s.shoe_status === "sudah_diambil" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}
                        >
                          {formatStatus(s.shoe_status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`neu-badge text-[9px] uppercase ${s.order.payment_status === "paid" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                        >
                          {s.order.payment_status === "paid"
                            ? "Lunas"
                            : "Belum Lunas"}
                        </span>
                      </td>
                      {/* KOLOM TANGGAL DIAMBIL BARU */}
                      <td className="px-3 py-2 text-center text-slate-400">
                        {s.handover?.[0]?.handed_over_at ? (
                          <span className="flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3 text-green-400" />
                            {formatDate(s.handover[0].handed_over_at)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Link
                          href={`/dashboard/orders/${s.order.id}`}
                          className="text-accent hover:text-accent-glow transition-colors inline-block"
                        >
                          <Eye className="w-4 h-4 mx-auto" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABEL PELANGGAN */}
      {activeTab === "pelanggan" && (
        <div className="neu-card !p-0 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-[11px] md:text-xs min-w-[600px]">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-semibold border-b border-slate-700">
                    Nama Pelanggan
                  </th>
                  <th className="px-3 py-2 font-semibold border-b border-slate-700">
                    WhatsApp
                  </th>
                  <th className="px-3 py-2 font-semibold border-b border-slate-700 text-center">
                    Total Transaksi
                  </th>
                  <th className="px-3 py-2 font-semibold border-b border-slate-700">
                    Total Pengeluaran
                  </th>
                  <th className="px-3 py-2 font-semibold border-b border-slate-700">
                    Transaksi Terakhir
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Tidak ada data pelanggan.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const totalSpent = c.orders.reduce(
                      (sum: number, o: any) => sum + Number(o.total_price),
                      0,
                    );
                    const lastOrder =
                      c.orders.length > 0 ? c.orders[0].created_at : null;
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-3 py-2 font-semibold text-slate-200 flex items-center gap-2">
                          <UserSquare2 className="w-4 h-4 text-accent" />{" "}
                          {c.name}
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          {c.whatsapp}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {c.orders.length} Nota
                        </td>
                        <td className="px-3 py-2 font-medium">
                          Rp {totalSpent.toLocaleString("id-ID")}
                        </td>
                        <td className="px-3 py-2 text-slate-400">
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
      )}
    </div>
  );
}
