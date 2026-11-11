"use client";
import { Printer } from "lucide-react";

export default function PrintButton({
  invoiceNumber,
}: {
  invoiceNumber: string;
}) {
  const handlePrint = () => {
    // Mengubah judul dokumen sementara agar nama file PDF-nya rapi
    const originalTitle = document.title;
    document.title = `Nota-${invoiceNumber}`;

    // Memicu dialog print browser
    window.print();

    // Mengembalikan judul semula setelah print selesai/dibatalkan
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <button
      onClick={handlePrint}
      className="neu-btn-primary flex items-center gap-2 print:hidden"
    >
      <Printer className="w-4 h-4" /> Cetak PDF
    </button>
  );
}
