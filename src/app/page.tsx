"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { 
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay, addMonths, subMonths
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2, Calendar as CalendarIcon, Clock, Menu } from "lucide-react";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonthView, setCurrentMonthView] = useState(startOfMonth(new Date()));
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    space_id: "", user_name: "", user_email: "", 
    phone_prefix: "+41", user_phone: "",
    reason: "", start_time: "10:00", end_time: "12:00"
  });

  const today = startOfDay(new Date());

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchSpaces = async () => {
      const { data } = await supabase.from("spaces").select("*");
      if (data) {
        setSpaces(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, space_id: data[0].id }));
      }
    };
    fetchSpaces();
  }, []);

  const fetchBookings = async () => {
    const startOfDayCurrent = new Date(currentDate); startOfDayCurrent.setHours(0, 0, 0, 0);
    const endOfDayCurrent = new Date(currentDate); endOfDayCurrent.setHours(23, 59, 59, 999);
    const { data } = await supabase.from("bookings").select("*")
      .gte("start_time", startOfDayCurrent.toISOString()).lte("start_time", endOfDayCurrent.toISOString());
    if (data) setBookings(data);
  };

  useEffect(() => { fetchBookings(); }, [currentDate]);

  const handleSlotClick = (spaceId: string, hour: number) => {
    const startHourStr = hour.toString().padStart(2, '0') + ":00";
    const endHourNumber = hour + 2 > 22 ? 22 : hour + 2; 
    const endHourStr = endHourNumber.toString().padStart(2, '0') + ":00";
    setFormData(prev => ({ ...prev, space_id: spaceId, start_time: startHourStr, end_time: endHourStr }));
    setIsModalOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(currentDate); const [sh, sm] = formData.start_time.split(':'); start.setHours(parseInt(sh), parseInt(sm), 0);
    const end = new Date(currentDate); const [eh, em] = formData.end_time.split(':'); end.setHours(parseInt(eh), parseInt(em), 0);
    
    if (start < new Date()) {
      alert("⚠️ Vous ne pouvez pas réserver un créneau dans le passé.");
      return;
    }

    const { data, error } = await supabase.from("bookings").insert([{
      space_id: formData.space_id, user_name: formData.user_name, user_email: formData.user_email,
      user_phone: `${formData.phone_prefix} ${formData.user_phone}`, reason: formData.reason, 
      start_time: start.toISOString(), end_time: end.toISOString(), status: 'pending'
    }]).select();

    if (!error && data) {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'NEW_REQUEST', booking_id: data[0].id, user_name: formData.user_name, user_email: formData.user_email,
          space_name: spaces.find(s => s.id === formData.space_id)?.name, start_time: start.toISOString(), reason: formData.reason
        })
      });
      setIsModalOpen(false);
      setShowSuccess(true);
      fetchBookings(); 
    }
  };

  const selectDate = (day: Date) => {
    if (!isBefore(day, today)) {
      setCurrentDate(day);
      if (window.innerWidth < 1024) setIsSidebarOpen(false); 
    }
  };

  const hours = Array.from({ length: 15 }, (_, i) => i + 8);
  if (!isMounted) return null;

  return (
    /* h-screen + fixed + overflow-hidden = La page est une prison, rien ne bouge en dehors du calendrier */
    <div className="fixed inset-0 flex h-screen w-screen bg-gray-50 font-sans overflow-hidden select-none">
      
      {/* 1. SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out transform
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-lg font-black uppercase tracking-tight leading-none text-gray-900">
            Réservation <br/><span className="text-gray-500">de salle</span>
          </h1>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm capitalize">{format(currentMonthView, "MMMM yyyy", { locale: fr })}</span>
              <div className="flex space-x-1">
                <button onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => <div key={d} className="text-[10px] font-bold text-gray-400">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentMonthView), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentMonthView), { weekStartsOn: 1 }) }).map((day, i) => {
                const isSelected = isSameDay(day, currentDate);
                const isPast = isBefore(day, today);
                return (
                  <div key={i} onClick={() => selectDate(day)} className={`h-8 flex items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition-all ${isPast ? 'text-gray-200 cursor-not-allowed' : isSelected ? 'bg-black text-white' : 'hover:bg-gray-200 text-gray-700'}`}>
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. ZONE PRINCIPALE */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        
        <header className="bg-white border-b px-4 lg:px-8 py-4 flex justify-between items-center h-20 flex-shrink-0 z-50">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-xl bg-gray-50 border"><Menu className="w-5 h-5"/></button>
            <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className={`p-2 rounded-xl bg-gray-50 ${!isSameDay(currentDate, today) ? 'hover:bg-gray-100' : 'opacity-20'}`}><ChevronLeft className="w-5 h-5"/></button>
            <span className="text-lg font-black capitalize">{format(currentDate, "EEEE d MMMM", { locale: fr })}</span>
            <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100"><ChevronRight className="w-5 h-5"/></button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-black text-white px-6 py-2.5 rounded-2xl font-bold flex items-center shadow-lg"><Plus className="w-5 h-5 mr-2" /> Demander</button>
        </header>

        {/* C'est ici que l'on fixe le scroll : h-full sur main + overflow-auto sur le div enfant */}
        <main className="flex-1 min-h-0 p-4 lg:p-8 bg-gray-100/50 relative">
          <div className="h-full w-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-auto overscroll-none relative">
            
            <div className="inline-flex min-w-full items-start">
              
              {/* HEURES FIGÉES (Sticky Left) */}
              <div className="w-16 lg:w-20 flex-shrink-0 sticky left-0 z-40 bg-gray-50 border-r border-gray-100">
                <div className="h-16 border-b border-gray-100 sticky top-0 bg-gray-100 z-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-400"/>
                </div>
                {hours.map(h => <div key={h} className="h-16 border-b border-gray-100 text-center text-[10px] font-black text-gray-300 pt-3">{h}:00</div>)}
              </div>

              {/* SALLES FIGÉES (Sticky Top) */}
              <div className="flex flex-1">
                {spaces.map(space => {
                  const spaceBookings = bookings.filter(b => b.space_id === space.id);
                  return (
                    <div key={space.id} className="min-w-[140px] flex-1 border-r border-gray-100 last:border-r-0">
                      
                      <div className="h-16 border-b border-gray-100 sticky top-0 z-30 bg-white/95 backdrop-blur-sm flex items-center justify-center px-2 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: space.color }}>{space.name}</span>
                      </div>

                      <div className="relative">
                        {hours.map(h => {
                          const isOccupied = spaceBookings.some(b => h >= new Date(b.start_time).getHours() && h < new Date(b.end_time).getHours());
                          const isPast = (new Date(currentDate).setHours(h)) < new Date().getTime();
                          return (
                            <div key={h} onClick={() => !isOccupied && !isPast && handleSlotClick(space.id, h)} 
                               className={`h-16 border-b border-gray-100 flex items-center justify-center group ${isOccupied || isPast ? 'bg-gray-50/50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                              {!isOccupied && !isPast && <Plus className="w-4 h-4 text-gray-200 opacity-0 group-hover:opacity-100" />}
                            </div>
                          );
                        })}

                        {spaceBookings.map(b => {
                          const start = new Date(b.start_time); const end = new Date(b.end_time);
                          const top = (start.getHours() + start.getMinutes()/60 - 8) * 64;
                          const height = (end.getHours() + end.getMinutes()/60 - (start.getHours() + start.getMinutes()/60)) * 64;
                          return (
                            <div key={b.id} className={`absolute inset-x-1 rounded-xl p-2 shadow-sm border pointer-events-none ${b.status === 'pending' ? 'opacity-60 border-dashed' : ''}`}
                               style={{ top: `${top}px`, height: `${height}px`, backgroundColor: space.color, borderColor: 'rgba(0,0,0,0.1)' }}>
                              <p className="text-[10px] font-black text-white truncate">{b.user_name}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODALS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-black">Réservation</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X/></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
               <div><label className="text-[10px] font-black text-gray-400 uppercase">Espace</label>
               <select className="w-full border rounded-xl p-3 bg-gray-50" value={formData.space_id} onChange={(e) => setFormData({...formData, space_id: e.target.value})}>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
               <div className="flex space-x-4">
                 <div className="flex-1"><label className="text-[10px] font-black text-gray-400 uppercase">Début</label><input type="time" className="w-full border rounded-xl p-3" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} /></div>
                 <div className="flex-1"><label className="text-[10px] font-black text-gray-400 uppercase">Fin</label><input type="time" className="w-full border rounded-xl p-3" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} /></div>
               </div>
               <div><label className="text-[10px] font-black text-gray-400 uppercase">Nom Complet</label><input type="text" required className="w-full border rounded-xl p-3" value={formData.user_name} onChange={(e) => setFormData({...formData, user_name: e.target.value})} /></div>
               <div><label className="text-[10px] font-black text-gray-400 uppercase">E-mail</label><input type="email" required className="w-full border rounded-xl p-3" value={formData.user_email} onChange={(e) => setFormData({...formData, user_email: e.target.value})} /></div>
               <div><label className="text-[10px] font-black text-gray-400 uppercase">Raison</label><textarea required className="w-full border rounded-xl p-3 h-20" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} /></div>
               <button type="submit" className="w-full bg-black text-white font-black py-4 rounded-2xl shadow-xl">Envoyer la demande</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
