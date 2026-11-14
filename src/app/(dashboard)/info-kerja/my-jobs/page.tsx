"use client";
import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  Droplets,
  Wind,
  Sparkles,
  Clock,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

const STATUS_LIST = [
  {
    value: "sedang_dikerjakan",
    label: "Sedang Dikerjakan",
    icon: Clock,
    color: "text-blue-400",
  },
  {
    value: "proses_pencucian",
    label: "Proses Pencucian",
    icon: Droplets,
    color: "text-cyan-400",
  },
  {
    value: "proses_pengeringan",
    label: "Proses Pengeringan",
    icon: Wind,
    color: "text-amber-400",
  },
  {
    value: "proses_finishing",
    label: "Proses Finishing",
    icon: Sparkles,
    color: "text-purple-400",
  },
  {
    value: "selesai_dicuci",
    label: "Selesai Dicuci",
    icon: CheckCircle2,
    color: "text-green-400",
  },
];

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [setCurrentUser] = useState<any>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);

      // 1. Ambil User ID
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (!meRes.ok) throw new Error("Gagal mengambil sesi user");
      const meData = await meRes.json();

      if (!meData.user) {
        setLoading(false);
        return;
      }
      setCurrentUser(meData.user);

      // 2. Ambil Pekerjaan
      const res = await fetch(`/api/my-jobs?userId=${meData.user.id}`, {
        cache: "no-store",
      });

      // Tangkap error dari API
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal memuat pekerjaan");
      }

      const data = await res.json();
      setJobs(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message); // Menampilkan pesan error dari database
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const updateStatus = async (shoeId: string, newStatus: string) => {
    setUpdatingId(shoeId);
    try {
      // Cukup kirim statusnya saja. Satpam API akan mendeteksi siapa yang login.
      const res = await fetch(`/api/info-kerja/${shoeId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal update status.");
      }

      if (newStatus === "selesai_dicuci") {
        toast.success("Pekerjaan selesai! Sepatu siap dicek Kasir.");
      } else {
        toast.success("Status berhasil diperbarui!");
      }

      await fetchJobs(); // Refresh data
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const calculateEstimatedDate = (shoe: any) => {
    if (!shoe.treatment?.duration_max_days) return "-";
    const estDate = new Date(shoe.created_at);
    estDate.setDate(estDate.getDate() + shoe.treatment.duration_max_days);
    return formatDate(estDate.toISOString());
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold">Pekerjaan Saya</h1>
        <p className="text-slate-400 text-sm">
          Daftar sepatu yang sedang Anda kerjakan. Update status sesuai tahapan.
        </p>
      </div>

      <div className="grid gap-4 mt-6">
        {jobs.length === 0 ? (
          <div className="neu-card text-center py-10">
            <p className="text-slate-400">
              Tidak ada pekerjaan aktif. Silakan scan QR untuk mengambil
              pekerjaan baru.
            </p>
          </div>
        ) : (
          jobs.map((job) => {
            const shoe = job.shoe;
            const currentStatus = STATUS_LIST.find(
              (s) => s.value === shoe.shoe_status,
            );
            const [itemType, itemModel] = shoe.shoe_type?.split(" - ") || [
              "Sepatu",
              "",
            ];

            return (
              <div
                key={job.id}
                className="neu-card flex flex-col justify-between p-4 md:p-5"
              >
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs text-accent font-semibold mb-1">
                    {shoe.order?.invoice_number}
                  </p>
                  <h3 className="font-bold text-base md:text-lg leading-tight">
                    {itemType} - {shoe.brand}{" "}
                    {itemModel ? `- ${itemModel}` : ""}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400">
                    Pelanggan: {shoe.order?.customer?.name || "-"}
                  </p>
                  <p className="text-xs md:text-sm text-slate-400">
                    Treatment: {shoe.treatment?.name || "-"}
                  </p>
                  <p className="text-xs md:text-sm font-semibold text-amber-400 flex items-center gap-1 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Estimasi: {calculateEstimatedDate(shoe)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {shoe.shoe_status === "sedang_dikerjakan" && (
                      <button
                        onClick={() =>
                          updateStatus(shoe.id, "proses_pencucian")
                        }
                        disabled={updatingId === shoe.id}
                        className="neu-btn text-xs px-3 py-2 flex items-center gap-2 flex-1 md:flex-none justify-center"
                      >
                        {updatingId === shoe.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Droplets className="w-3 h-3" />
                        )}
                        Mulai Cuci
                      </button>
                    )}
                    {shoe.shoe_status === "proses_pencucian" && (
                      <button
                        onClick={() =>
                          updateStatus(shoe.id, "proses_pengeringan")
                        }
                        disabled={updatingId === shoe.id}
                        className="neu-btn text-xs px-3 py-2 flex items-center gap-2 flex-1 md:flex-none justify-center"
                      >
                        {updatingId === shoe.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wind className="w-3 h-3" />
                        )}
                        Selesai Cuci
                      </button>
                    )}
                    {shoe.shoe_status === "proses_pengeringan" && (
                      <button
                        onClick={() =>
                          updateStatus(shoe.id, "proses_finishing")
                        }
                        disabled={updatingId === shoe.id}
                        className="neu-btn text-xs px-3 py-2 flex items-center gap-2 flex-1 md:flex-none justify-center"
                      >
                        {updatingId === shoe.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        Selesai Kering
                      </button>
                    )}
                    {shoe.shoe_status === "proses_finishing" && (
                      <button
                        onClick={() => updateStatus(shoe.id, "selesai_dicuci")}
                        disabled={updatingId === shoe.id}
                        className="neu-btn-primary text-xs px-3 py-2 flex items-center gap-2 flex-1 md:flex-none justify-center"
                      >
                        {updatingId === shoe.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Selesai Finishing
                      </button>
                    )}
                  </div>
                  <div
                    className={`neu-badge bg-slate-800 ${currentStatus?.color} flex items-center gap-1 shrink-0`}
                  >
                    {currentStatus?.icon && (
                      <currentStatus.icon className="w-3 h-3" />
                    )}
                    {currentStatus?.label}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
