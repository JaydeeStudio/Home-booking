"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { 
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay, addMonths, subMonths
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2, Clock, Menu } from "lucide-react";

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
    space_id: "", first_name: "", last_name: "", user_email: "", 
    phone: "+41 ", reason: "", start_time: "10:00", end_time: "12:00"
  });

  const today = startOfDay(new Date());

  useEffect(() => { setIsMounted(true); }, []);

  // Fermeture du modal avec la touche ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsModalOpen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

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
    
    if (start < new Date()) { alert("⚠️ Vous ne pouvez pas réserver dans le passé."); return; }

    const space_name = spaces.find(s => s.id === formData.space_id)?.name;
    const full_name = `${formData.first_name} ${formData.last_name}`;

    const { data, error } = await supabase.from("bookings").insert([{
      space_id: formData.space_id, user_name: full_name, user_email: formData.user_email,
      user_phone: formData.phone, reason: formData.reason, 
      start_time: start.toISOString(), end_time: end.toISOString(), status: 'pending'
    }]).select();

    if (error || !data) {
      alert("⚠️ Erreur lors de la réservation.");
    } else {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'NEW_REQUEST', booking_id: data[0].id, user_name: full_name, user_email: formData.user_email,
          space_name: space_name, start_time: start.toISOString(), reason: formData.reason
        })
      });
      setIsModalOpen(false);
      setShowSuccess(true);
      fetchBookings(); 
    }
  };

  const monthStart = startOfMonth(currentMonthView);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDaysHeader = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

  const selectDate = (day: Date) => {
    if (!isBefore(day, today)) {
      setCurrentDate(day);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    }
  };

  const returnHome = () => { setCurrentDate(today); setCurrentMonthView(today); setIsSidebarOpen(false); };

  const hours = Array.from({ length: 15 }, (_, i) => i + 8);
  if (!isMounted) return null;

  return (
    <div className="flex h-[100dvh] bg-gray-50 font-sans overflow-hidden relative">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 flex flex-col shadow-2xl lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between lg:justify-start">
          <div onClick={returnHome} className="flex items-center space-x-4 cursor-pointer group">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"><img src="/logo.png" alt="Logo" className="w-full h-full object-contain" /></div>
            <h1 className="text-xl font-black uppercase tracking-tight text-gray-900 leading-tight"><span className="block">Réservation</span><span className="block text-gray-400">de salle</span></h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm capitalize">{format(currentMonthView, "MMMM yyyy", { locale: fr })}</span>
              <div className="flex space-x-1">
                <button onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">{weekDaysHeader.map(d => <div key={d} className="text-[10px] font-bold text-gray-400">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => (
                <div key={i} onClick={() => selectDate(day)} className={`h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${isBefore(day, today) ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'} ${!isBefore(day, today) && !isSameDay(day, currentDate) ? 'hover:bg-gray-200 text-gray-700' : ''} ${!isSameMonth(day, currentMonthView) && !isBefore(day, today) ? 'text-gray-400' : ''} ${isSameDay(day, currentDate) ? 'bg-black text-white font-bold shadow-md' : ''}`}>{format(day, "d")}</div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 lg:px-8 py-4 flex justify-between items-center z-10 h-[89px] flex-shrink-0">
          <div className="flex items-center space-x-2 lg:space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 bg-gray-50 border"><Menu className="w-5 h-5"/></button>
            <button onClick={() => {if(!isSameDay(currentDate, today) && !isBefore(subDays(currentDate, 1), today)) setCurrentDate(subDays(currentDate, 1))}} className={`hidden sm:block p-2 rounded-xl transition ${(!isSameDay(currentDate, today) && !isBefore(subDays(currentDate, 1), today)) ? 'hover:bg-gray-100 bg-gray-50' : 'opacity-30 cursor-not-allowed'}`}><ChevronLeft /></button>
            <span className="text-sm sm:text-xl font-black lg:min-w-[200px] text-center capitalize truncate">{format(currentDate, "EEEE d MMMM", { locale: fr })}</span>
            <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="hidden sm:block p-2 hover:bg-gray-100 bg-gray-50 rounded-xl transition"><ChevronRight /></button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-black text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-2xl font-bold hover:bg-gray-800 transition shadow-lg shadow-black/20 flex items-center text-xs lg:text-sm"><Plus className="w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2" /> Demander</button>
        </header>

        <main className="flex-1 overflow-hidden p-4 lg:p-8 relative bg-gray-50">
          <div className="h-full w-full bg-white rounded-3xl border border-gray-200 shadow-xl flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto relative scroll-smooth">
              <table className="w-full border-separate border-spacing-0 min-w-[800px]">
                <thead>
                  <tr className="sticky top-0 z-30">
                    <th className="sticky left-0 z-50 bg-gray-100 border-b border-r border-gray-200 w-16 lg:w-20 h-16"><Clock size={16} className="mx-auto text-gray-400" /></th>
                    {spaces.map(space => (
                      <th key={space.id} className="bg-white/95 backdrop-blur-md border-b border-r border-gray-200 h-16 px-2"><span className="text-[10px] lg:text-xs font-black uppercase tracking-widest block truncate" style={{ color: space.color }}>{space.name}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(h => (
                    <tr key={h} className="h-16">
                      <td className="sticky left-0 z-20 bg-gray-50 border-r border-b border-gray-100 text-[10px] font-bold text-gray-400 text-center">{h}:00</td>
                      {spaces.map(space => {
                        const spaceBookings = bookings.filter(b => b.space_id === space.id);
                        const isOccupied = spaceBookings.some(b => h >= new Date(b.start_time).getHours() && h < new Date(b.end_time).getHours());
                        const isPast = (new Date(currentDate).setHours(h,0,0,0)) < new Date().getTime();
                        return (
                          <td key={space.id} className="border-r border-b border-gray-100 relative p-0 h-16 group">
                            <div onClick={() => !isOccupied && !isPast && handleSlotClick(space.id, h)} className={`w-full h-full transition-colors flex items-center justify-center ${isOccupied || isPast ? 'bg-gray-50/50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                              {!isOccupied && !isPast && <Plus size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                              {isPast && !isOccupied && <span className="text-[9px] text-gray-300 font-medium opacity-50 hidden lg:block">Passé</span>}
                            </div>
                            {spaceBookings.filter(b => new Date(b.start_time).getHours() === h).map(b => (
                              <div key={b.id} className={`absolute inset-x-1.5 z-10 rounded-xl p-2 text-[10px] font-black text-white truncate shadow-sm pointer-events-none transition-all ${b.status === 'pending' ? 'opacity-60 border-dashed border-gray-400' : 'opacity-90'}`} style={{ top: '4px', height: `calc(${(new Date(b.end_time).getHours() - new Date(b.start_time).getHours()) * 64}px - 8px)`, backgroundColor: space.color, borderColor: b.status === 'pending' ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                {b.user_name} {b.status === 'pending' && <span className="block opacity-70 text-[8px] uppercase mt-0.5">En attente</span>}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onMouseDown={(e) => {if(e.target === e.currentTarget) setIsModalOpen(false)}}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Demande de réservation</h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="p-6 space-y-5">
              <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Espace *</label><select className="w-full border rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black bg-gray-50" value={formData.space_id} onChange={(e) => setFormData({...formData, space_id: e.target.value})} required>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="flex space-x-4">
                <div className="flex-1"><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Début *</label><input type="time" required value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} className="w-full border rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black bg-gray-50" /></div>
                <div className="flex-1"><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Fin *</label><input type="time" required value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} className="w-full border rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black bg-gray-50" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Prénom *</label><input type="text" required placeholder="Jean" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full border rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black" /></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Nom *</label><input type="text" required placeholder="Dupont" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full border rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">E-mail *</label><input type="email" required placeholder="jean@email.com" value={formData.user_email} onChange={(e) => setFormData({...formData, user_email: e.target.value})} className="w-full border rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black" /></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Téléphone *</label><input type="tel" required placeholder="+41 79 123 45 67" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black" /></div>
              </div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Raison de la demande *</label><textarea required placeholder="Réunion, rencontre..." value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full border rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black h-24 resize-none" /></div>
              <button type="submit" className="w-full bg-black text-white font-black uppercase py-4 rounded-2xl mt-2 hover:scale-[1.02] transition-transform shadow-xl">Transmettre la demande</button>
            </form>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-10 text-center border">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-12 h-12 text-green-600" /></div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Reçue !</h2>
            <p className="text-gray-500 font-medium mb-8">Votre demande a été transmise. Un e-mail de confirmation vous sera envoyé.</p>
            <button onClick={() => setShowSuccess(false)} className="w-full bg-black text-white font-black py-5 rounded-3xl hover:scale-105 transition-transform flex items-center justify-center">C'est parfait <ChevronRight className="ml-2 w-5 h-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
