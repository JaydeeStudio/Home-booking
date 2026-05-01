"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { format, addDays, subDays, startOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { LogOut, ChevronLeft, ChevronRight, X, Trash2, Check, Edit3, Clock, Search, Save, ShieldCheck } from "lucide-react";

const ADMIN_WHITELIST = ["jonas@eglisehome.com", "nadege@eglisehome.com", "sabine@eglisehome.com", "yves@eglisehome.com", "christine@eglisehome.com", "mathilde@eglisehome.com", "jonasdellomo@gmail.com"];

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [searchTerm, setSearchTerm] = useState("");
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  useEffect(() => {
    if (user) {
      supabase.from("spaces").select("*").then(({ data }) => { if (data) setSpaces(data); });
      supabase.from("bookings").select("*, spaces(name, color)").then(({ data }) => { if (data) setBookings(data); });
    }
  }, [user]);

  if (loading) return <div className="p-10">Vérification...</div>;

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-6">Accès Admin</h1>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/admin' }})} className="w-full bg-black text-white py-3 rounded-xl font-bold">Connexion Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden font-sans">
      <header className="h-20 bg-white border-b px-8 flex items-center justify-between flex-shrink-0">
        <h1 className="font-black text-xl uppercase">Admin</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setViewMode(viewMode === 'day' ? 'week' : 'day')} className="text-xs font-bold px-4 py-2 bg-gray-100 rounded-lg uppercase">{viewMode}</button>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="p-2 text-red-600 bg-red-50 rounded-lg"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r bg-white overflow-y-auto p-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase mb-4">Demandes en attente</h2>
          {bookings.filter(b => b.status === 'pending').map(b => (
            <div key={b.id} onClick={() => setSelectedBooking(b)} className="p-4 border rounded-2xl mb-2 cursor-pointer hover:border-black">
              <p className="font-bold text-sm">{b.user_name}</p>
              <p className="text-xs text-gray-500">{b.spaces?.name}</p>
            </div>
          ))}
        </aside>

        <div className="flex-1 overflow-auto p-8">
           <div className="bg-white rounded-3xl border shadow-sm p-6">
              <p className="text-gray-400 text-sm">Le calendrier admin est prêt.</p>
           </div>
        </div>
      </main>

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold">Détails</h2>
              <button onClick={() => setSelectedBooking(null)}><X/></button>
            </div>
            <p className="mb-4"><strong>Demandeur:</strong> {selectedBooking.user_name}</p>
            <div className="flex space-x-2">
              <button className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold" onClick={() => setSelectedBooking(null)}>Valider</button>
              <button className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold" onClick={() => setSelectedBooking(null)}>Refuser</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
