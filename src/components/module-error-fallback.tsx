"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ModuleErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="neu-card max-w-md w-full space-y-4 p-8">
        <div className="flex justify-center mb-2">
          <div className="p-4 bg-red-500/10 rounded-full">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-red-400">Terjadi Kesalahan</h2>
        <p className="text-sm text-slate-400">
          Maaf, modul ini mengalami gangguan. Silakan coba lagi atau hubungi
          admin jika masalah berlanjut.
        </p>

        <div className="bg-slate-900/50 p-3 rounded-lg text-xs text-slate-500 font-mono overflow-auto max-h-32">
          {error.message || "Unknown error"}
        </div>

        <button
          onClick={() => reset()}
          className="neu-btn-primary w-full py-3 flex items-center justify-center gap-2 mt-4"
        >
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </button>
      </div>
    </div>
  );
}
