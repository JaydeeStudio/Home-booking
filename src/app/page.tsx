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

  if (!isMounted) return null;

  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-gray-50 font-sans">
      
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
        <div className="p-6 overflow-y-auto">
          {/* Mini Calendrier simplifié pour le test */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
             <p className="text-xs font-bold text-center mb-2 capitalize">{format(currentDate, "MMMM yyyy", { locale: fr })}</p>
             <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-gray-400 font-bold mb-2">
                {['L','M','M','J','V','S','D'].map(d => <div key={d}>{d}</div>)}
             </div>
             <div className="grid grid-cols-7 gap-1">
                {eachDayOfInterval({ 
                  start: startOfWeek(startOfMonth(currentMonthView), {weekStartsOn: 1}), 
                  end: endOfWeek(endOfMonth(currentMonthView), {weekStartsOn: 1}) 
                }).map((day, i) => (
                  <div key={i} onClick={() => !isBefore(day, today) && setCurrentDate(day)} className={`h-7 flex items-center justify-center rounded-lg text-[10px] cursor-pointer ${isSameDay(day, currentDate) ? 'bg-black text-white' : isBefore(day, today) ? 'text-gray-200' : 'hover:bg-gray-200'}`}>
                    {format(day, "d")}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between z-40 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu/></button>
            <div className="flex items-center space-x-2">
              <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 bg-gray-50 rounded-lg"><ChevronLeft size={18}/></button>
              <span className="font-bold capitalize text-sm lg:text-base">{format(currentDate, "EEEE d MMMM", { locale: fr })}</span>
              <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 bg-gray-50 rounded-lg"><ChevronRight size={18}/></button>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm">Réserver</button>
        </header>

        {/* LA ZONE DE GRILLE - ON UTILISE DES CLASSES CSS "STRICTES" */}
        <div className="flex-1 overflow-hidden p-4 lg:p-8">
          <div className="h-full w-full bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            
            {/* LE WRAPPER QUI SCROLLE */}
            <div className="flex-1 overflow-auto relative">
              <table className="w-full border-collapse table-fixed min-w-max">
                <thead>
                  <tr className="sticky top-0 z-30">
                    {/* Coin supérieur gauche */}
                    <th className="sticky left-0 z-40 bg-gray-100 border-b border-r border-gray-200 w-16 lg:w-20 h-16">
                      <Clock size={16} className="mx-auto text-gray-400" />
                    </th>
                    {/* Noms des salles */}
                    {spaces.map(space => (
                      <th key={space.id} className="bg-white/95 backdrop-blur border-b border-r border-gray-200 h-16 px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest block truncate" style={{ color: space.color }}>
                          {space.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(h => (
                    <tr key={h} className="h-16">
                      {/* Colonne des heures figée à gauche */}
                      <td className="sticky left-0 z-20 bg-gray-50 border-r border-b border-gray-100 text-[10px] font-bold text-gray-300 text-center">
                        {h}:00
                      </td>
                      {/* Cellules de réservation */}
                      {spaces.map(space => {
                        const spaceBookings = bookings.filter(b => b.space_id === space.id);
                        const isOccupied = spaceBookings.some(b => h >= new Date(b.start_time).getHours() && h < new Date(b.end_time).getHours());
                        const isPast = (new Date(currentDate).setHours(h)) < new Date().getTime();
                        
                        return (
                          <td key={space.id} className="border-r border-b border-gray-100 relative p-0">
                            <div 
                              onClick={() => !isOccupied && !isPast && handleSlotClick(space.id, h)}
                              className={`w-full h-full flex items-center justify-center transition-colors ${isOccupied || isPast ? 'bg-gray-50/30 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 group'}`}
                            >
                              {!isOccupied && !isPast && <Plus size={14} className="text-gray-200 opacity-0 group-hover:opacity-100" />}
                            </div>

                            {/* Overlay des réservations */}
                            {spaceBookings.map(b => {
                              const start = new Date(b.start_time);
                              if (start.getHours() === h) {
                                const end = new Date(b.end_time);
                                const duration = end.getHours() - start.getHours();
                                return (
                                  <div 
                                    key={b.id}
                                    className="absolute inset-x-1 z-10 rounded-xl p-2 shadow-sm border border-black/5 pointer-events-none"
                                    style={{ 
                                      top: '4px', 
                                      height: `calc(${duration * 64}px - 8px)`, 
                                      backgroundColor: space.color,
                                      opacity: b.status === 'pending' ? 0.6 : 1
                                    }}
                                  >
                                    <p className="text-[9px] font-black text-white truncate leading-tight">{b.user_name}</p>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SIMPLIFIÉ POUR ÉVITER LES BUGS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Demande de réservation</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="time" className="border rounded-xl p-3" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} />
                <input type="time" className="border rounded-xl p-3" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} />
              </div>
              <input placeholder="Votre nom" className="w-full border rounded-xl p-3" value={formData.user_name} onChange={(e) => setFormData({...formData, user_name: e.target.value})} required />
              <input placeholder="Email" type="email" className="w-full border rounded-xl p-3" value={formData.user_email} onChange={(e) => setFormData({...formData, user_email: e.target.value})} required />
              <textarea placeholder="Raison" className="w-full border rounded-xl p-3 h-20" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} required />
              <button className="w-full bg-black text-white py-4 rounded-2xl font-bold">Envoyer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
