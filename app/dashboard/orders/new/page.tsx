"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Trash2,
  Loader2,
  QrCode,
  Tag,
  Clock,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ShoeInput = {
  item_type: "Sepatu" | "Tas" | "Sandal";
  brand: string;
  shoe_type: string;
  shoe_size: string;
  color: string;
  material: string;
  condition_before: string;
  treatment_id: string;
  treatment_price: number;
  before_photos: File[];
};

const emptyShoe: ShoeInput = {
  item_type: "Sepatu",
  brand: "",
  shoe_type: "",
  shoe_size: "",
  color: "",
  material: "",
  condition_before: "",
  treatment_id: "",
  treatment_price: 0,
  before_photos: [],
};

export default function NewOrderPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });

  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    order_date: today,
    notes: "",
    payment_status: "unpaid",
    payment_method: "",
  });

  const [shoes, setShoes] = useState<ShoeInput[]>([{ ...emptyShoe }]);
  const [selectedPromo, setSelectedPromo] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("treatments")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => setTreatments(data || []));
    supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => setPromotions(data || []));
  }, [supabase]);

  const calculateEstimatedDate = (treatmentId: string) => {
    const treatment = treatments.find((t) => t.id === treatmentId);
    if (!treatment) return "-";
    const daysToAdd =
      treatment.duration_max_days || treatment.duration_days || 1;
    const estDate = new Date(form.order_date);
    estDate.setDate(estDate.getDate() + daysToAdd);
    return estDate.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const updateShoe = (i: number, field: keyof ShoeInput, value: any) => {
    const next = [...shoes];
    (next[i] as any)[field] = value;
    if (field === "treatment_id") {
      const t = treatments.find((x) => x.id === value);
      next[i].treatment_price = t?.price || 0;
    }
    setShoes([...next]);
  };

  const handlePhotoUpload = (i: number, files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const next = [...shoes];
    next[i].before_photos = [...next[i].before_photos, ...newFiles];
    setShoes(next);
  };

  const removePhoto = (i: number, fileIndex: number) => {
    const next = [...shoes];
    next[i].before_photos = next[i].before_photos.filter(
      (_, idx) => idx !== fileIndex,
    );
    setShoes(next);
  };

  // --- LOGIKA PERHITUNGAN PROMO ---
  const subtotal = shoes.reduce((s, x) => s + (x.treatment_price || 0), 0);

  let discountAmount = 0;
  let bonusItemPrice = 0;
  let promoNotes = "";

  // 1. Cek Syarat Promo Otomatis
  const isEligibleForPairDiscount = shoes.length >= 5 && shoes.length % 5 === 0;
  const isEligibleForFreePair = shoes.length >= 11;

  if (isEligibleForFreePair) {
    bonusItemPrice = shoes[10]?.treatment_price || 0;
    promoNotes = "Promo Pasangan ke-11 (FREE)";
  } else if (isEligibleForPairDiscount) {
    const pairPrice = shoes[4]?.treatment_price || 0;
    discountAmount = pairPrice * 0.2;
    promoNotes = "Diskon 20% Pasangan ke-5";
  }
  // 2. Cek Promo Manual (Jika tidak memenuhi syarat otomatis)
  else if (selectedPromo) {
    promoNotes = selectedPromo.name;

    // Cek apakah promo tipe "Free"
    if (selectedPromo.name.toLowerCase().includes("free")) {
      bonusItemPrice = shoes[shoes.length - 1]?.treatment_price || 0;
    }
    // Cek jika promo hanya memotong 1 item (apply_to_all == false)
    else if (selectedPromo.apply_to_all === false) {
      const lastItemPrice = shoes[shoes.length - 1]?.treatment_price || 0;

      if (selectedPromo.discount_type === "fixed") {
        discountAmount = Math.min(
          Number(selectedPromo.discount_value),
          lastItemPrice,
        );
      } else if (selectedPromo.discount_type === "percentage") {
        discountAmount =
          (lastItemPrice * Number(selectedPromo.discount_value)) / 100;
      }
    }
    // Jika promo memotong total transaksi (apply_to_all == true)
    else {
      if (selectedPromo.discount_type === "fixed") {
        discountAmount = Number(selectedPromo.discount_value);
      } else if (selectedPromo.discount_type === "percentage") {
        discountAmount =
          (subtotal * Number(selectedPromo.discount_value)) / 100;
      }
    }
  }

  discountAmount = Math.min(discountAmount, subtotal);
  const finalTotal = subtotal - discountAmount - bonusItemPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.payment_status === "paid" && !form.payment_method) {
      return toast.error("Pilih metode pembayaran terlebih dahulu.");
    }

    setLoading(true);
    try {
      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .insert({ name: form.name, whatsapp: form.whatsapp })
        .select()
        .single();
      if (cErr) throw cErr;

      const { data: inv } = await supabase.rpc("generate_invoice_number");

      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          invoice_number: inv,
          customer_id: customer.id,
          order_date: form.order_date,
          total_price: finalTotal,
          notes: form.notes,
          promo_type: "auto_manual_logic",
          discount_amount: discountAmount + bonusItemPrice,
          promo_notes: promoNotes,
          payment_status: form.payment_status,
          payment_method: form.payment_method,
        })
        .select()
        .single();
      if (oErr) throw oErr;

      for (let i = 0; i < shoes.length; i++) {
        const s = shoes[i];
        let itemPrice = s.treatment_price;

        if (isEligibleForFreePair && i === 10) itemPrice = 0;
        else if (isEligibleForPairDiscount && !isEligibleForFreePair && i === 4)
          itemPrice = s.treatment_price * 0.8;
        else if (
          selectedPromo?.name.toLowerCase().includes("free") &&
          i === shoes.length - 1
        )
          itemPrice = 0;
        else if (
          selectedPromo?.apply_to_all === false &&
          i === shoes.length - 1
        ) {
          if (selectedPromo.discount_type === "fixed")
            itemPrice = Math.max(
              0,
              s.treatment_price - Number(selectedPromo.discount_value),
            );
          else if (selectedPromo.discount_type === "percentage")
            itemPrice =
              s.treatment_price *
              (1 - Number(selectedPromo.discount_value) / 100);
        }

        const { data: code } = await supabase.rpc("generate_shoe_code", {
          inv_number: inv,
          item_index: i + 1,
        });

        const photoUrls: string[] = [];
        for (const file of s.before_photos) {
          const fileName = `${inv}/${code}/${Date.now()}-${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from("shoe-photos")
            .upload(fileName, file);
          if (!uploadErr) {
            const { data: urlData } = supabase.storage
              .from("shoe-photos")
              .getPublicUrl(fileName);
            photoUrls.push(urlData.publicUrl);
          }
        }

        const { data: shoe, error: sErr } = await supabase
          .from("shoes")
          .insert({
            order_id: order.id,
            shoe_code: code,
            qr_code: code,
            brand: s.brand || "-",
            shoe_type: `${s.item_type} - ${s.shoe_type}`,
            shoe_size: s.shoe_size || null,
            color: s.color || "-",
            material: s.material || "-",
            condition_before: s.condition_before || "-",
            treatment_id: s.treatment_id || null,
            treatment_price: itemPrice,
            before_photos: photoUrls,
          })
          .select()
          .single();

        if (sErr) throw sErr;

        await supabase.from("shoe_status_history").insert({
          shoe_id: shoe.id,
          new_status: "menunggu_pengerjaan",
          notes: "Transaksi Baru",
        });
      }

      toast.success("Transaksi berhasil dibuat!");
      router.push(`/dashboard/orders/${order.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto space-y-4 pb-24 md:pb-20 px-2 md:px-0"
    >
      <h1 className="text-xl md:text-2xl font-bold mb-4">Transaksi Baru</h1>

      {/* DATA PELANGGAN */}
      <div className="neu-card space-y-3 p-4 md:p-5">
        <h2 className="font-semibold text-accent border-b border-slate-700 pb-2 text-sm md:text-base">
          Data Pelanggan
        </h2>
        <input
          required
          placeholder="Nama pelanggan"
          className="neu-input py-3 md:py-2 text-sm md:text-base"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          placeholder="Nomor WhatsApp (628...)"
          className="neu-input py-3 md:py-2 text-sm md:text-base"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
        />
        <textarea
          placeholder="Catatan tambahan (opsional)"
          className="neu-input py-3 md:py-2 text-sm md:text-base"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      {/* DATA ITEM */}
      {shoes.map((shoe, i) => {
        let isDiscounted = false;
        if (isEligibleForFreePair && i === 10) isDiscounted = true;
        else if (isEligibleForPairDiscount && !isEligibleForFreePair && i === 4)
          isDiscounted = true;
        else if (
          selectedPromo?.name.toLowerCase().includes("free") &&
          i === shoes.length - 1
        )
          isDiscounted = true;
        else if (
          selectedPromo?.apply_to_all === false &&
          i === shoes.length - 1
        )
          isDiscounted = true;

        const estDate = calculateEstimatedDate(shoe.treatment_id);

        return (
          <div
            key={i}
            className={`neu-card space-y-4 p-4 md:p-5 relative ${isDiscounted ? "border border-amber-500/50 bg-amber-500/5" : ""}`}
          >
            {isDiscounted && (
              <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                {isEligibleForFreePair
                  ? "GRATIS (Item ke-11)"
                  : isEligibleForPairDiscount
                    ? "DISKON 20% (Item ke-5)"
                    : "BONUS PROMO"}
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 border-b border-slate-700 pb-3">
              <h2
                className={`font-semibold text-sm md:text-base ${isDiscounted ? "text-amber-400" : "text-accent"}`}
              >
                Item #{i + 1}
              </h2>
              <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                <div className="flex flex-col items-start md:items-end bg-slate-800/50 px-3 py-1 rounded-lg">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">
                    Estimasi
                  </span>
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {estDate}
                  </span>
                </div>
                {shoes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShoes(shoes.filter((_, x) => x !== i))}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Jenis Item
                </label>
                <select
                  className="neu-input py-3 md:py-2 text-sm"
                  value={shoe.item_type}
                  onChange={(e) => updateShoe(i, "item_type", e.target.value)}
                >
                  <option value="Sepatu">Sepatu</option>
                  <option value="Tas">Tas</option>
                  <option value="Sandal">Sandal</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Brand
                </label>
                <input
                  placeholder="cth: Nike"
                  className="neu-input py-3 md:py-2 text-sm"
                  value={shoe.brand}
                  required
                  onChange={(e) => updateShoe(i, "brand", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Tipe/Model
                </label>
                <input
                  placeholder="cth: Sneakers"
                  className="neu-input py-3 md:py-2 text-sm"
                  value={shoe.shoe_type}
                  onChange={(e) => updateShoe(i, "shoe_type", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Ukuran
                </label>
                <input
                  placeholder="cth: 42"
                  className="neu-input py-3 md:py-2 text-sm"
                  value={shoe.shoe_size}
                  onChange={(e) => updateShoe(i, "shoe_size", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                placeholder="Warna"
                className="neu-input py-3 md:py-2 text-sm"
                value={shoe.color}
                onChange={(e) => updateShoe(i, "color", e.target.value)}
              />
              <input
                placeholder="Material"
                className="neu-input py-3 md:py-2 text-sm"
                value={shoe.material}
                onChange={(e) => updateShoe(i, "material", e.target.value)}
              />
            </div>

            <textarea
              placeholder="Kondisi sebelum dicuci"
              className="neu-input py-3 md:py-2 text-sm"
              value={shoe.condition_before}
              onChange={(e) =>
                updateShoe(i, "condition_before", e.target.value)
              }
            />

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Foto Sebelum Dicuci
              </label>
              <div className="flex flex-wrap gap-2">
                {shoe.before_photos.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border border-slate-600"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i, idx)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-[8px] text-slate-500 mt-1">Tambah</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(i, e.target.files)}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Pilih Treatment
              </label>
              <select
                className="neu-input py-3 md:py-2 text-sm"
                value={shoe.treatment_id}
                required
                onChange={(e) => updateShoe(i, "treatment_id", e.target.value)}
              >
                <option value="">-- Pilih Treatment --</option>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} - Rp {t.price.toLocaleString("id-ID")} (Maks{" "}
                    {t.duration_max_days} Hari)
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setShoes([...shoes, { ...emptyShoe }])}
        className="neu-btn w-full flex justify-center gap-2 py-3"
      >
        <Plus className="w-4 h-4" /> Tambah Item Lain
      </button>

      {/* PROMO MANUAL */}
      <div className="neu-card space-y-3 p-4 md:p-5 border-l-4 border-l-amber-500">
        <h2 className="font-semibold text-amber-500 flex items-center gap-2 text-sm md:text-base">
          <Tag className="w-5 h-5" /> Promo & Diskon (Manual)
        </h2>
        <p className="text-xs text-slate-400">
          Pilih promo manual (jika ada). Promo otomatis (Pasangan ke-5 & ke-11)
          akan dihitung jika memenuhi syarat.
        </p>
        <select
          className="neu-input py-3 md:py-2 text-sm"
          value={selectedPromo?.id || ""}
          onChange={(e) => {
            const p = promotions.find((x) => x.id === e.target.value) || null;
            setSelectedPromo(p);
          }}
          disabled={isEligibleForFreePair || isEligibleForPairDiscount}
        >
          <option value="">-- Tanpa Promo Manual --</option>
          {promotions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (
              {p.discount_type === "fixed"
                ? `Rp ${p.discount_value}`
                : `${p.discount_value}%`}
              )
            </option>
          ))}
        </select>
        {(isEligibleForFreePair || isEligibleForPairDiscount) && (
          <p className="text-xs text-emerald-400 font-semibold">
            Sistem mendeteksi Anda memenuhi syarat promo otomatis pasangan!
          </p>
        )}
      </div>

      {/* PEMBAYARAN */}
      <div className="neu-card space-y-3 p-4 md:p-5">
        <h2 className="font-semibold text-accent text-sm md:text-base">
          Status Pembayaran
        </h2>
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          <button
            type="button"
            onClick={() =>
              setForm({ ...form, payment_status: "unpaid", payment_method: "" })
            }
            className={`flex-1 py-3 md:py-2 rounded-xl text-sm font-semibold border transition-all ${form.payment_status === "unpaid" ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-slate-800 text-slate-400 border-transparent"}`}
          >
            Bayar Nanti
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, payment_status: "paid" })}
            className={`flex-1 py-3 md:py-2 rounded-xl text-sm font-semibold border transition-all ${form.payment_status === "paid" ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-slate-800 text-slate-400 border-transparent"}`}
          >
            Bayar Sekarang
          </button>
        </div>
        {form.payment_status === "paid" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {["Cash", "QR BCA", "QR BSI", "Bank BTN", "Bank BSI"].map(
              (method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setForm({ ...form, payment_method: method })}
                  className={`py-3 md:py-2 rounded-lg text-xs font-semibold border transition-all ${form.payment_method === method ? "bg-accent/20 text-accent border-accent/50" : "bg-slate-900 text-slate-400 border-slate-700"}`}
                >
                  {method}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {/* RINGKASAN */}
      <div className="neu-card-inset space-y-2 p-4 md:p-5">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Subtotal ({shoes.length} Item)</span>
          <span>Rp {subtotal.toLocaleString("id-ID")}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-red-400">
            <span>Diskon ({promoNotes})</span>
            <span>- Rp {discountAmount.toLocaleString("id-ID")}</span>
          </div>
        )}

        {bonusItemPrice > 0 && (
          <div className="flex justify-between text-sm text-amber-400">
            <span>Free Item ({promoNotes})</span>
            <span>- Rp {bonusItemPrice.toLocaleString("id-ID")}</span>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-slate-700 pt-2 mt-2">
          <span className="text-slate-400 font-semibold text-sm md:text-base">
            Total Tagihan
          </span>
          <span className="text-xl md:text-2xl font-bold text-accent">
            Rp {finalTotal.toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="neu-btn-primary w-full flex justify-center items-center gap-2 py-4 text-sm md:text-base sticky bottom-20 md:static md:bottom-auto shadow-2xl"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <QrCode className="w-5 h-5" />
        )}{" "}
        Simpan & Generate QR
      </button>
    </form>
  );
}
