"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Html5Qrcode } from "html5-qrcode";
import {
  Loader2,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  Camera,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function ScanPage() {
  const supabase = createClient();
  const router = useRouter();

  const [shoeData, setShoeData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
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
    };
    checkRole();
  }, [supabase]);

  useEffect(() => {
    if (shoeData || loading) return;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        setScanner(html5QrCode);

        // Meminta izin kamera & mencari kamera belakang
        const devices = await Html5Qrcode.getCameras();

        if (devices && devices.length) {
          let cameraId = devices[0].id;

          // Prioritaskan kamera belakang
          const backCamera = devices.find(
            (device) =>
              device.label.toLowerCase().includes("back") ||
              device.label.toLowerCase().includes("belakang") ||
              device.label.toLowerCase().includes("rear"),
          );
          if (backCamera) {
            cameraId = backCamera.id;
          }

          await html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              await html5QrCode.stop();
              await handleScan(decodedText);
            },
            () => {
              // Abaikan error frame per frame
            },
          );

          setIsCameraReady(true);
          setScanError(null);
        } else {
          setScanError("Kamera tidak ditemukan di perangkat ini.");
        }
      } catch (err: any) {
        // Ini akan menangkap jika user menolak izin
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setScanError(
            "Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.",
          );
        } else if (err.name === "NotFoundError") {
          setScanError("Kamera tidak ditemukan.");
        } else {
          setScanError(
            "Gagal mengakses kamera. Pastikan perangkat memiliki kamera.",
          );
        }
        console.error(err);
      }
    };

    startScanner();

    return () => {
      if (scanner) {
        scanner.stop().catch((e) => console.error("Stop scanner error", e));
      }
    };
  }, [shoeData, loading]);

  const handleScan = async (qrCode: string) => {
    setLoading(true);
    setScanError(null);
    try {
      const { data: shoe, error } = await supabase
        .from("shoes")
        .select(
          `
          *, 
          order:orders(invoice_number, customer:customers(name, whatsapp)), 
          treatment:treatments(name),
          assignment:shoe_assignments(technician:profiles(full_name))
        `,
        )
        .eq("qr_code", qrCode)
        .single();

      if (error || !shoe)
        throw new Error("QR Code tidak valid atau sepatu tidak ditemukan.");

      if (userRole === "technician") {
        if (shoe.shoe_status !== "menunggu_pengerjaan") {
          throw new Error(
            `Sepatu ini sudah diambil/dikerjakan (Status: ${shoe.shoe_status.replace(/_/g, " ")}).`,
          );
        }
      } else if (userRole === "cashier") {
        if (shoe.shoe_status !== "selesai_dicuci") {
          throw new Error(
            `Sepatu ini belum selesai dicuci (Status: ${shoe.shoe_status.replace(/_/g, " ")}).`,
          );
        }
      }

      setShoeData(shoe);
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
      setTimeout(() => window.location.reload(), 2500);
    }
  };

  const confirmAction = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir.");

      if (userRole === "technician") {
        await supabase
          .from("shoes")
          .update({ shoe_status: "sedang_dikerjakan" })
          .eq("id", shoeData.id);
        await supabase.from("shoe_assignments").insert({
          shoe_id: shoeData.id,
          technician_id: user.id,
          started_at: new Date().toISOString(),
          assignment_status: "active",
        });
        await supabase.from("shoe_status_history").insert({
          shoe_id: shoeData.id,
          previous_status: "menunggu_pengerjaan",
          new_status: "sedang_dikerjakan",
          changed_by: user.id,
          notes: "Diambil teknisi via scan QR",
        });

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          user_name: "Teknisi",
          user_role: "technician",
          action: "Mulai Pengerjaan",
          description: `Teknisi mengambil sepatu ${shoeData.shoe_code} untuk dikerjakan.`,
          related_transaction_id: shoeData.order.invoice_number,
        });

        toast.success("Berhasil mengambil pekerjaan!");
        router.push("/dashboard/my-jobs");
      }

      if (userRole === "cashier") {
        await supabase
          .from("shoes")
          .update({ shoe_status: "siap_diambil" })
          .eq("id", shoeData.id);
        await supabase.from("shoe_status_history").insert({
          shoe_id: shoeData.id,
          previous_status: "selesai_dicuci",
          new_status: "siap_diambil",
          changed_by: user.id,
          notes: "Dikonfirmasi siap diambil oleh Kasir",
        });

        await supabase.from("notifications").insert({
          customer_id: shoeData.order.customer_id,
          order_id: shoeData.order_id,
          shoe_id: shoeData.id,
          notification_type: "ready_for_pickup",
          channel: "whatsapp",
          message: `Halo kak! Sepatu ${shoeData.brand} kamu sudah selesai dan siap diambil.`,
          delivery_status: "sent",
        });
        toast.success("Status berhasil diubah menjadi Siap Diambil!");
        router.push("/dashboard/ready");
      }
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-center">Scan QR Sepatu</h1>
      <p className="text-center text-slate-400 text-sm mb-4">
        {userRole === "technician"
          ? "Scan untuk mengambil pekerjaan baru."
          : "Scan sepatu yang selesai dicuci untuk konfirmasi SIAP DIAMBIL."}
      </p>

      {!shoeData && !loading && (
        <div className="neu-card overflow-hidden relative">
          <div
            id="reader"
            className="w-full"
            style={{ minHeight: "300px" }}
          ></div>

          {!isCameraReady && !scanError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-accent mb-2" />
              <p className="text-sm text-slate-400">Menyiapkan Kamera...</p>
              <p className="text-[10px] text-slate-500 mt-2 text-center max-w-[200px]">
                (Jika muncul pop-up izin, klik "Izinkan")
              </p>
            </div>
          )}

          {scanError && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-10">
              <Camera className="w-12 h-12 text-red-400 mb-3" />
              <p className="text-red-400 font-semibold text-sm mb-4">
                {scanError}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Coba Lagi
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      )}

      {shoeData && !loading && (
        <div className="neu-card space-y-4">
          <div className="flex items-center gap-3 text-accent mb-4 border-b border-slate-700 pb-4">
            <CheckCircle2 className="w-6 h-6" />
            <h2 className="text-lg font-bold">QR Code Terverifikasi</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <span className="text-slate-400">Nota</span>
            <span className="font-semibold text-right">
              {shoeData.order.invoice_number}
            </span>

            <span className="text-slate-400">Pelanggan</span>
            <span className="font-semibold text-right">
              {shoeData.order.customer.name}
            </span>

            <span className="text-slate-400">WhatsApp</span>
            <span className="font-semibold text-right text-accent">
              {shoeData.order.customer.whatsapp}
            </span>

            <span className="text-slate-400">Sepatu</span>
            <span className="font-semibold text-right">
              {shoeData.brand} - {shoeData.shoe_type}
            </span>

            <span className="text-slate-400">Treatment</span>
            <span className="font-bold text-accent text-right">
              {shoeData.treatment?.name}
            </span>
          </div>

          {userRole === "cashier" && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-start gap-2 mt-4">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-200">
                Pastikan Anda sudah memeriksa fisik sepatu dan hasil
                pengerjaannya sebelum mengonfirmasi.
              </p>
            </div>
          )}

          <button
            onClick={confirmAction}
            className="neu-btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 mt-4"
          >
            <PackageCheck className="w-5 h-5" />
            {userRole === "technician"
              ? "Konfirmasi & Mulai Kerjakan"
              : "Konfirmasi Siap Diambil"}
          </button>
        </div>
      )}
    </div>
  );
}
