"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Footprints } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Email atau password salah");
      }

      toast.success("Login berhasil!");

      // PENTING: Arahkan ke dashboard dan refresh agar cookie terbaca
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false); // Hentikan loading hanya jika gagal
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo & Judul */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
              <Footprints className="w-8 h-8 text-accent" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Chat Shoe Treatment</h1>
          <p className="text-sm text-slate-400">Digital Workflow System</p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              required
              className="neu-input w-full py-3 px-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              required
              className="neu-input w-full py-3 px-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="neu-btn-primary w-full py-3 flex justify-center items-center font-bold text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
