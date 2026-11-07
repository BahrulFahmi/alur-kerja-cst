import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ScanLine, ArrowRight, User } from "lucide-react";

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: shoes } = await supabase
    .from("shoes")
    .select(
      "id, shoe_code, brand, shoe_type, condition_before, order:orders(invoice_number, customer:customers(name)), treatment:treatments(name)",
    )
    .eq("shoe_status", "menunggu_pengerjaan")
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pekerjaan Tersedia</h1>
          <p className="text-slate-400 text-sm">
            Sepatu yang menunggu untuk diambil dari area kasir.
          </p>
        </div>
        <Link
          href="/dashboard/scan"
          className="neu-btn-primary flex items-center gap-2"
        >
          <ScanLine className="w-5 h-5" /> Scan Manual
        </Link>
      </div>

      <div className="grid gap-4">
        {!shoes || shoes.length === 0 ? (
          <div className="neu-card text-center py-10">
            <p className="text-slate-400">Belum ada pekerjaan baru.</p>
          </div>
        ) : (
          shoes.map((shoe: any) => (
            <div
              key={shoe.id}
              className="neu-card flex flex-col md:flex-row justify-between md:items-center gap-4"
            >
              <div>
                <p className="text-xs text-accent font-semibold mb-1">
                  {shoe.order.invoice_number}
                </p>
                <h3 className="font-bold text-lg">
                  {shoe.brand} - {shoe.shoe_type}
                </h3>
                <p className="text-sm text-slate-400">
                  Treatment: {shoe.treatment?.name}
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm bg-slate-800/50 w-fit px-3 py-1 rounded-md">
                  <User className="w-4 h-4 text-slate-500" />{" "}
                  {shoe.order.customer.name}
                </div>
              </div>
              <Link
                href={`/dashboard/scan?code=${shoe.shoe_code}`}
                className="neu-btn-primary flex items-center justify-center gap-2"
              >
                Ambil & Scan <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
