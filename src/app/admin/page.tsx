"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { format, addDays, subDays, startOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { LogOut, ChevronLeft, ChevronRight, X, Trash2, Check, Edit3, Search, Save, ShieldCheck } from "lucide-react";

const ADMIN_WHITELIST = [
  "jonas@eglisehome.com", 
  "nadege@eglisehome.com", 
  "sabine@eglisehome.com", 
  "yves@eglisehome.com", 
  "christine@eglisehome.com", 
  "mathilde@eglisehome.com",
  "jonasdellomo@gmail.com"
];

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
      handleAuth(session?.user || null);
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuth(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = (user: any) => {
    if (user && ADMIN_WHITELIST.includes(user.email!)) setUser(user);
    else if (user) { supabase.auth.signOut(); alert("Accès refusé : votre e-mail n'est pas autorisé."); }
    else setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      supabase.from("spaces").select("*").then(({ data }) => { if (data) setSpaces(data); });
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    const { data } = await supabase.from("bookings").select("*, spaces(name, color)");
    if (data) setBookings(data);
  };

  useEffect(() => {
    const processAutoValidation = async () => {
      if (user && bookings.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const id = params.get('id');
        
        if (action === 'validate' && id) {
           const bookingToValidate = bookings.find(b => b.id === id);
           if (bookingToValidate && bookingToValidate.status === 'pending') {
             await updateStatus(id, 'confirmed');
             window.history.replaceState({}, '', '/admin');
           }
        }
      }
    };
    processAutoValidation();
  }, [user, bookings]);

  const updateStatus = async (id: string, status: 'confirmed' | 'rejected') => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    if (status === 'rejected') {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (!error) {
        await notifyUser('DELETED', booking);
        setBookings(prev => prev.filter(b => b.id !== id));
        setSelectedBooking(null);
      }
      return;
    }

    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (!error) {
      await notifyUser('CONFIRMED', booking);
      setSelectedBooking(null); 
      fetchBookings();
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("bookings").update({
      space_id: selectedBooking.space_id,
      user_name: selectedBooking.user_name,
      reason: selectedBooking.reason,
      status: 'confirmed'
    }).eq("id", selectedBooking.id);

    if (!error) {
      await notifyUser('MODIFIED', selectedBooking);
      setSelectedBooking(null); 
      setIsEditing(false); 
      fetchBookings();
    }
  };

  const notifyUser = async (type: string, booking: any) => {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        user_name: booking.user_name,
        user_email: booking.user_email,
        space_name: spaces.find(s => s.id === booking.space_id)?.name || booking.spaces?.name,
        start_time: booking.start_time,
        reason: booking.reason
      })
    });
  };

  const filteredBookings = bookings.filter(b => 
    (b.user_name + b.user_email + b.reason + (b.spaces?.name || "")).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const pendingBookings = filteredBookings.filter(b => b.status === 'pending');
  
  const calendarBookings = filteredBookings.filter(b => {
    const bDate = new Date(b.start_time);
    if (viewMode === 'day') return isSameDay(bDate, currentDate);
    return bDate >= startOfWeek(currentDate, { weekStartsOn: 1 }) && bDate <= addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6) && b.status === 'confirmed';
  });

  if (loading) return null;
  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl border max-w-md w-full text-center font-sans">
        <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-black" />
        <h1 className="text-3xl font-black mb-8">Admin Login</h1>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/admin', queryParams: { prompt: 'select_account' } }})} className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:scale-[1.02] transition-transform">
          Continuer avec Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center z-30">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-black uppercase">Admin</h1>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-sm border-none w-64 focus:ring-2 focus:ring-black outline-none" />
          </div>
        </div>
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'day' ? 'bg-white shadow-sm' : ''}`}>JOUR</button>
          <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'week' ? 'bg-white shadow-sm' : ''}`}>SEMAINE</button>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"><LogOut className="w-5 h-5" /></button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r flex flex-col overflow-y-auto p-4 space-y-4 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">En attente ({pendingBookings.length})</h2>
          {pendingBookings.map(b => (
            <div key={b.id} onClick={() => {setSelectedBooking(b); setIsEditing(false);}} className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-black cursor-pointer shadow-sm transition-all hover:shadow-md">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 mb-2 inline-block uppercase">{b.spaces?.name}</span>
              <p className="font-bold text-sm">{b.user_name}</p>
            </div>
          ))}
        </aside>

        <main className="flex-1 bg-gray-50 p-6 overflow-auto">
          <div className="bg-white rounded-3xl shadow-xl border flex min-h-[700px]">
            <div className="w-20 border-r bg-gray-50/50"><div className="h-16 border-b border-gray-100"></div>
              {Array.from({ length: 15 }, (_, i) => i + 8).map(h => <div key={h} className="h-16 border-b border-gray-100 text-[10px] font-black text-gray-300 text-center pt-2">{h}:00</div>)}
            </div>
            <div className="flex-1 flex overflow-x-auto">
              {(viewMode === 'day' ? spaces : Array.from({length: 7}, (_, i) => addDays(startOfWeek(currentDate, {weekStartsOn: 1}), i))).map((item, idx) => (
                <div key={idx} className="flex-1 min-w-[150px] border-r border-gray-100 last:border-r-0 relative">
                  <div className="h-16 border-b border-gray-100 flex items-center justify-center font-black text-[10px] uppercase bg-gray-50/30 z-10">{viewMode === 'day' ? item.name : format(item, "EEEE d", {locale: fr})}</div>
                  <div className="relative h-full">
                    {Array.from({ length: 15 }, (_, i) => i + 8).map(h => <div key={h} className="h-16 border-b border-gray-100"></div>)}
                    {calendarBookings.filter(b => viewMode === 'day' ? b.space_id === item.id : isSameDay(new Date(b.start_time), item)).map(b => {
                      const start = new Date(b.start_time); const end = new Date(b.end_time);
                      const top = (start.getHours() + start.getMinutes()/60 - 8) * 64;
                      const height = (end.getHours() + end.getMinutes()/60 - (start.getHours() + start.getMinutes()/60)) * 64;
                      return (
                        <div key={b.id} onClick={() => {setSelectedBooking(b); setIsEditing(false);}} className="absolute left-1 right-1 rounded-xl p-2 shadow-lg border-l-4 cursor-pointer hover:scale-[1.02] transition-transform z-10" style={{ top: `${top}px`, height: `${height}px`, backgroundColor: `${b.spaces?.color}20`, borderColor: b.spaces?.color }}>
                          <p className="text-[10px] font-black truncate" style={{ color: b.spaces?.color }}>{b.user_name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-8 font-sans">
             <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black">Étudier la demande</h2><button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5"/></button></div>
             <form onSubmit={handleEditSave} className="space-y-4">
                {isEditing ? (
                  <>
                    <div><label className="text-[10px] font-black uppercase text-gray-400">Nom</label><input className="w-full border rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-black" value={selectedBooking.user_name} onChange={e => setSelectedBooking({...selectedBooking, user_name: e.target.value})} /></div>
                    <div><label className="text-[10px] font-black uppercase text-gray-400">Espace</label><select className="w-full border rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-black" value={selectedBooking.space_id} onChange={e => setSelectedBooking({...selectedBooking, space_id: e.target.value})}>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div><label className="text-[10px] font-black uppercase text-gray-400">Raison</label><textarea className="w-full border rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-black" value={selectedBooking.reason} onChange={e => setSelectedBooking({...selectedBooking, reason: e.target.value})} /></div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100"><p className="font-bold text-lg">{selectedBooking.user_name}</p><p className="text-sm text-gray-500">{selectedBooking.user_phone} • {selectedBooking.user_email}</p></div>
                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 text-blue-900 text-sm"><strong>Motif :</strong> {selectedBooking.reason}</div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 pt-6">
                  <button type="button" onClick={() => updateStatus(selectedBooking.id, 'rejected')} className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold text-xs flex flex-col items-center hover:bg-red-100 transition"><Trash2 className="w-5 h-5 mb-1"/> Refuser</button>
                  <button type="button" onClick={() => setIsEditing(!isEditing)} className="p-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs flex flex-col items-center hover:bg-gray-200 transition"><Edit3 className="w-5 h-5 mb-1"/> {isEditing ? "Annuler" : "Modifier"}</button>
                  {isEditing ? (
                    <button type="submit" className="p-4 bg-black text-white rounded-2xl font-bold text-xs flex flex-col items-center shadow-xl hover:bg-gray-800 transition"><Save className="w-5 h-5 mb-1"/> Sauver</button>
                  ) : (
                    <button type="button" onClick={() => updateStatus(selectedBooking.id, 'confirmed')} className="p-4 bg-green-500 text-white rounded-2xl font-bold text-xs flex flex-col items-center shadow-lg shadow-green-500/30 hover:bg-green-600 transition"><Check className="w-5 h-5 mb-1"/> Valider</button>
                  )}
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
