"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { 
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameDay, isBefore, startOfDay, addMonths, subMonths
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Menu, Calendar as CalendarIcon } from "lucide-react";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonthView, setCurrentMonthView] = useState(startOfMonth(new Date()));
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    space_id: "", 
    first_name: "", 
    last_name: "", 
    user_email: "", 
    phone: "+41 ",
    reason: "", 
    start_time: "10:00", 
    end_time: "12:00"
  });

  const today = startOfDay(new Date());

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: s } = await supabase.from("spaces").select("*");
      if (s) {
        setSpaces(s);
        if (s.length > 0) setFormData(prev => ({ ...prev, space_id: s[0].id }));
      }
      const start = new Date(currentDate); start.setHours(0,0,0,0);
      const end = new Date(currentDate); end.setHours(23,59,59,999);
      const { data: b } = await supabase.from("bookings").select("*")
        .gte("start_time", start.toISOString()).lte("start_time", end.toISOString());
      if (b) setBookings(b);
    };
    fetchData();
  }, [currentDate]);

  if (!isMounted) return null;

  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  const handleSlotClick = (spaceId: string, hour: number) => {
    setFormData(prev => ({ 
      ...prev, 
      space_id: spaceId, 
      start_time: `${hour.toString().padStart(2, '0')}:00`, 
      end_time: `${(hour + 1).toString().padStart(2, '0')}:00` 
    }));
    setIsModalOpen(true);
  };

  const handleDateSelect = (day: Date) => {
    if (!isBefore(day, today)) {
      setCurrentDate(day);
      setIsSidebarOpen(false); // Ferme le menu sur mobile après sélection
    }
  };

  return (
    <div className="fixed inset-0 flex bg-gray-50 font-sans overflow-hidden">
      
      {/* SIDEBAR MOBILE & DESKTOP */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-sm font-black uppercase leading-tight">Réservation<br/><span className="text-gray-400">de salle</span></h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 bg-gray-50 rounded-full text-gray-400"><X size={20}/></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-xs capitalize">{format(currentMonthView, "MMMM yyyy", { locale: fr })}</span>
              <div className="flex space-x-1">
                <button onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md"><ChevronLeft size={14}/></button>
                <button onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md"><ChevronRight size={14}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-bold text-gray-300 mb-2">
              {['L','M','M','J','V','S','D'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {eachDayOfInterval({ 
                start: startOfWeek(startOfMonth(currentMonthView), {weekStartsOn: 1}), 
                end: endOfWeek(endOfMonth(currentMonthView), {weekStartsOn: 1}) 
              }).map((day, i) => (
                <div key={i} onClick={() => handleDateSelect(day)} 
                     className={`h-8 flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer transition-all ${isSameDay(day, currentDate) ? 'bg-black text-white' : isBefore(day, today) ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-200 text-gray-700'}`}>
                  {format(day, "d")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="h-20 bg-white border-b border-gray-100 px-4 lg:px-10 flex items-center justify-between z-40 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-gray-50 rounded-xl border border-gray-200"><Menu size={20}/></button>
            <div className="flex items-center space-x-2">
              <button onClick={() => !isSameDay(currentDate, today) && setCurrentDate(subDays(currentDate, 1))} className={`p-2 rounded-xl ${isSameDay(currentDate, today) ? 'opacity-20 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-200'}`}><ChevronLeft size={18}/></button>
              <span className="font-black text-sm md:text-lg capitalize tracking-tight">{format(currentDate, "EEEE d MMMM", { locale: fr })}</span>
              <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-200"><ChevronRight size={18}/></button>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-black/10 flex items-center">
            <Plus size={16} className="mr-2" /> Réserver
          </button>
        </header>

        <main className="flex-1 overflow-hidden p-3 lg:p-8">
          <div className="h-full w-full bg-white rounded-[24px] lg:rounded-[32px] border border-gray-200 shadow-sm overflow-auto">
            <table className="w-full border-separate border-spacing-0 min-w-[800px]">
              <thead>
                <tr className="sticky top-0 z-30">
                  <th className="sticky left-0 z-50 bg-gray-50 border-b border-r border-gray-100 w-20 h-16"><Clock size={16} className="mx-auto text-gray-300" /></th>
                  {spaces.map(space => (
                    <th key={space.id} className="bg-white/95 backdrop-blur-md border-b border-r border-gray-100 h-16 px-4">
                      <span className="text-[10px] font-black uppercase tracking-widest block truncate" style={{ color: space.color }}>{space.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(h => (
                  <tr key={h} className="h-16">
                    <td className="sticky left-0 z-20 bg-gray-50 border-r border-b border-gray-100 text-[10px] font-black text-gray-300 text-center">{h}:00</td>
                    {spaces.map(space => {
                      const spaceBookings = bookings.filter(b => b.space_id === space.id);
                      const isOccupied = spaceBookings.some(b => h >= new Date(b.start_time).getHours() && h < new Date(b.end_time).getHours());
                      const slotTime = new Date(currentDate); slotTime.setHours(h, 0, 0, 0);
                      const isPast = slotTime < new Date();
                      
                      return (
                        <td key={space.id} className="border-r border-b border-gray-50 relative p-0 h-16">
                          <div onClick={() => !isOccupied && !isPast && handleSlotClick(space.id, h)} 
                               className={`w-full h-full ${isOccupied || isPast ? 'bg-gray-100/40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 transition-colors'}`} />
                          
                          {spaceBookings.filter(b => new Date(b.start_time).getHours() === h).map(b => (
                            <div key={b.id} className="absolute inset-x-1.5 z-10 rounded-xl p-2 text-[10px] font-black text-white truncate shadow-sm pointer-events-none" 
                                 style={{ top: '6px', height: `calc(${(new Date(b.end_time).getHours() - new Date(b.start_time).getHours()) * 64}px - 12px)`, backgroundColor: space.color }}>
                              {b.user_name}
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
        </main>
      </div>

      {/* MODAL FORMULAIRE COMPLET */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-black text-xl uppercase tracking-tight text-gray-900">Demande de réservation</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Prénom *</label>
                <input required placeholder="Jean" className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white outline-none transition-all font-bold" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Nom *</label>
                <input required placeholder="Dupont" className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white outline-none transition-all font-bold" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">E-mail *</label>
                <input required type="email" placeholder="jean@exemple.com" className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white outline-none transition-all font-bold" value={formData.user_email} onChange={e => setFormData({...formData, user_email: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Téléphone *</label>
                <input required placeholder="+41 79 123 45 67" className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white outline-none transition-all font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Heure de début</label>
                <input type="time" className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 outline-none font-bold" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Heure de fin</label>
                <input type="time" className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 outline-none font-bold" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
              </div>
            </div>
            
            <div className="mb-8">
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Raison de la demande *</label>
              <textarea required rows={3} placeholder="Réunion, répétition, etc." className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white outline-none transition-all font-bold" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
            </div>

            <button className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-black/20 hover:scale-[1.01] active:scale-95 transition-all" 
                    onClick={() => { console.log(formData); setIsModalOpen(false); }}>
              Envoyer la demande
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
