"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ShieldCheck, LogOut } from "lucide-react";

const ADMIN_WHITELIST = ["jonasdellomo@gmail.com"];

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && ADMIN_WHITELIST.includes(session.user.email!)) {
        setUser(session.user);
      }
      setLoading(false);
    };
    getSession();
  }, []);

  if (loading) return <div className="p-10">Vérification...</div>;

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center">
          <ShieldCheck className="mx-auto mb-4 w-12 h-12" />
          <h1 className="text-2xl font-bold mb-6">Admin</h1>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/admin' }})} className="bg-black text-white px-8 py-3 rounded-xl font-bold">Connexion Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 font-sans">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black">PANEL ADMIN</h1>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-red-500 font-bold flex items-center"><LogOut className="mr-2"/> Déconnexion</button>
      </div>
      <div className="bg-white p-10 rounded-3xl border shadow-sm">
        <p className="text-gray-500">Le panel est maintenant réparé. Les demandes apparaîtront ici.</p>
      </div>
    </div>
  );
}
