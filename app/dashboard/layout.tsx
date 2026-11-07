import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = { full_name: "Admin Chat Shoe", role: "admin" };

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) profile = data;
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar profile={profile} />
      {/* pb-24 agar tidak tertutup bottom nav di HP */}
      <main className="flex-1 p-4 md:p-8 md:ml-64 pb-24 md:pb-8 w-full">
        {children}
      </main>
    </div>
  );
}
