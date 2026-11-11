"use client";
import { useState, useEffect } from "react";
import { Loader2, Plus, Tag, X, Clock } from "lucide-react";
import { toast } from "sonner";

export default function TreatmentsPage() {
  const [activeTab, setActiveTab] = useState<"treatments" | "promos">(
    "treatments",
  );
  const [treatments, setTreatments] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State Modal
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Form State Treatment
  const [formTreatment, setFormTreatment] = useState({
    name: "",
    description: "",
    price: 0,
    durationMinDays: 1,
    durationMaxDays: 1,
    isActive: true,
  });

  // Form State Promo
  const [formPromo, setFormPromo] = useState({
    name: "",
    description: "",
    discountType: "fixed",
    discountValue: 0,
    startDate: "",
    endDate: "",
    isActive: true,
    applyToAll: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/treatments", { cache: "no-store" });

      const text = await res.text(); // Baca sebagai teks dulu
      let data;

      try {
        data = JSON.parse(text); // Coba jadikan JSON
      } catch (e) {
        console.error("Server membalas dengan HTML, bukan JSON:", text);
        throw new Error("Kesalahan server internal. Cek terminal VS Code.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat data");
      }

      setTreatments(data.treatments || []);
      setPromos(data.promotions || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "treatment", ...formTreatment }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan treatment");

      toast.success("Treatment berhasil ditambahkan!");
      setShowTreatmentModal(false);
      setFormTreatment({
        name: "",
        description: "",
        price: 0,
        durationMinDays: 1,
        durationMaxDays: 1,
        isActive: true,
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "promo", ...formPromo }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan promo");

      toast.success("Promo berhasil ditambahkan!");
      setShowPromoModal(false);
      setFormPromo({
        name: "",
        description: "",
        discountType: "fixed",
        discountValue: 0,
        startDate: "",
        endDate: "",
        isActive: true,
        applyToAll: true,
      });
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleTreatmentStatus = async (id: string, current: boolean) => {
    try {
      const res = await fetch("/api/treatments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "treatment",
          id,
          isActive: !current,
        }),
      });
      if (!res.ok) throw new Error("Gagal update status");
      toast.success("Status treatment diubah.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const togglePromoStatus = async (id: string, current: boolean) => {
    try {
      const res = await fetch("/api/treatments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "promo",
          id,
          isActive: !current,
        }),
      });
      if (!res.ok) throw new Error("Gagal update status");
      toast.success("Status promo diubah.");
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 relative">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold">Layanan & Promo</h1>
          <p className="text-slate-400 text-sm">
            Kelola daftar harga treatment dan promo aktif.
          </p>
        </div>
        <button
          onClick={() =>
            activeTab === "treatments"
              ? setShowTreatmentModal(true)
              : setShowPromoModal(true)
          }
          className="neu-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah{" "}
          {activeTab === "treatments" ? "Treatment" : "Promo"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl shadow-neu-in w-full md:w-1/2">
        <button
          onClick={() => setActiveTab("treatments")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "treatments" ? "bg-slate-800 text-accent shadow" : "text-slate-400"}`}
        >
          Daftar Treatment
        </button>
        <button
          onClick={() => setActiveTab("promos")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "promos" ? "bg-slate-800 text-accent shadow" : "text-slate-400"}`}
        >
          Daftar Promo
        </button>
      </div>

      {/* Tabel Treatment */}
      {activeTab === "treatments" && (
        <div className="neu-card !p-0 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm min-w-[700px]">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="p-4 font-semibold border-b border-slate-700">
                    Nama Treatment
                  </th>
                  <th className="p-4 font-semibold border-b border-slate-700">
                    Durasi (Hari)
                  </th>
                  <th className="p-4 font-semibold border-b border-slate-700">
                    Harga
                  </th>
                  <th className="p-4 font-semibold border-b border-slate-700 text-center">
                    Status
                  </th>
                  <th className="p-4 font-semibold border-b border-slate-700 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {treatments.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-semibold text-accent">
                      {t.name}
                      <p className="text-xs text-slate-500 font-normal">
                        {t.description}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {t.durationMinDays === t.durationMaxDays
                          ? `${t.durationMaxDays} Hari`
                          : `${t.durationMinDays} - ${t.durationMaxDays} Hari`}
                      </div>
                    </td>
                    <td className="p-4 font-medium">
                      Rp {Number(t.price).toLocaleString("id-ID")}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`neu-badge text-[10px] uppercase ${t.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                      >
                        {t.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleTreatmentStatus(t.id, t.isActive)}
                        className="text-sm text-accent hover:underline"
                      >
                        {t.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabel Promo */}
      {activeTab === "promos" && (
        <div className="neu-card !p-0 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm min-w-[600px]">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="p-4 font-semibold border-b border-slate-700">
                    Nama Promo
                  </th>
                  <th className="p-4 font-semibold border-b border-slate-700">
                    Target Potongan
                  </th>
                  <th className="p-4 font-semibold border-b border-slate-700">
                    Nilai
                  </th>
                  <th className="p-4 font-semibold border-b border-slate-700 text-center">
                    Status
                  </th>
                  <th className="p-4 font-semibold border-b border-slate-700 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {promos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Belum ada promo.
                    </td>
                  </tr>
                ) : (
                  promos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-semibold text-accent flex items-center gap-2">
                        <Tag className="w-4 h-4" /> {p.name}
                      </td>
                      <td className="p-4 text-slate-400 text-xs">
                        {p.applyToAll
                          ? "Seluruh Transaksi"
                          : "Hanya 1 Item (Terakhir)"}
                      </td>
                      <td className="p-4 font-medium">
                        {p.discountType === "percentage"
                          ? `${p.discountValue}%`
                          : `Rp ${Number(p.discountValue).toLocaleString("id-ID")}`}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`neu-badge text-[10px] uppercase ${p.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                        >
                          {p.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => togglePromoStatus(p.id, p.isActive)}
                          className="text-sm text-accent hover:underline"
                        >
                          {p.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL TAMBAH TREATMENT --- */}
      {showTreatmentModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 md:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="font-bold text-lg text-accent">
                Tambah Treatment Baru
              </h2>
              <button
                onClick={() => setShowTreatmentModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddTreatment} className="space-y-3">
              <input
                required
                placeholder="Nama Treatment"
                className="neu-input"
                value={formTreatment.name}
                onChange={(e) =>
                  setFormTreatment({ ...formTreatment, name: e.target.value })
                }
              />
              <textarea
                placeholder="Deskripsi Singkat"
                className="neu-input"
                value={formTreatment.description}
                onChange={(e) =>
                  setFormTreatment({
                    ...formTreatment,
                    description: e.target.value,
                  })
                }
              />

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  required
                  className="neu-input"
                  value={formTreatment.price || ""}
                  onChange={(e) =>
                    setFormTreatment({
                      ...formTreatment,
                      price: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Durasi Minimal (Hari)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="neu-input"
                    value={formTreatment.durationMinDays}
                    onChange={(e) =>
                      setFormTreatment({
                        ...formTreatment,
                        durationMinDays: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Durasi Maksimal (Hari)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="neu-input"
                    value={formTreatment.durationMaxDays}
                    onChange={(e) =>
                      setFormTreatment({
                        ...formTreatment,
                        durationMaxDays: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={formTreatment.isActive}
                  onChange={(e) =>
                    setFormTreatment({
                      ...formTreatment,
                      isActive: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <label className="text-sm text-slate-300">
                  Langsung Aktifkan
                </label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="neu-btn-primary w-full py-3 mt-4 flex justify-center"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Simpan Treatment"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL TAMBAH PROMO --- */}
      {showPromoModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="font-bold text-lg text-accent">
                Tambah Promo Baru
              </h2>
              <button
                onClick={() => setShowPromoModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddPromo} className="space-y-3">
              <input
                required
                placeholder="Nama Promo (cth: Diskon 20%)"
                className="neu-input"
                value={formPromo.name}
                onChange={(e) =>
                  setFormPromo({ ...formPromo, name: e.target.value })
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Tipe Diskon
                  </label>
                  <select
                    className="neu-input"
                    value={formPromo.discountType}
                    onChange={(e) =>
                      setFormPromo({
                        ...formPromo,
                        discountType: e.target.value,
                      })
                    }
                  >
                    <option value="fixed">Nominal (Rp)</option>
                    <option value="percentage">Persentase (%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Nilai Diskon
                  </label>
                  <input
                    type="number"
                    required
                    className="neu-input"
                    value={formPromo.discountValue || ""}
                    onChange={(e) =>
                      setFormPromo({
                        ...formPromo,
                        discountValue: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {/* TARGET POTONGAN */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Target Potongan Diskon
                </label>
                <select
                  className="neu-input"
                  value={formPromo.applyToAll ? "all" : "single"}
                  onChange={(e) =>
                    setFormPromo({
                      ...formPromo,
                      applyToAll: e.target.value === "all",
                    })
                  }
                >
                  <option value="all">Total Transaksi (Semua Item)</option>
                  <option value="single">Hanya 1 Item (Item Terakhir)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={formPromo.isActive}
                  onChange={(e) =>
                    setFormPromo({ ...formPromo, isActive: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label className="text-sm text-slate-300">
                  Langsung Aktifkan
                </label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="neu-btn-primary w-full py-3 mt-4 flex justify-center"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Simpan Promo"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
