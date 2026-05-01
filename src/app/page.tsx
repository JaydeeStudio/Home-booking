"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { 
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay, addMonths, subMonths
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, Menu } from "lucide-react";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonthView, setCurrentMonthView] = useState(startOfMonth(new Date()));
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    space_id: "", user_name: "", user_email: "", 
    reason: "", start_time: "10:00", end_time: "12:00"
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

  return (
    <div className="fixed inset-0 flex bg-gray-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 border-b border-gray-100 flex items-center space-x-4">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
          <h1 className="text-lg font-black uppercase tracking-tight text-gray-900 leading-tight">
            Réservation<br/><span className="text-gray-400">de salle</span>
          </h1>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm capitalize">{format(currentMonthView, "MMMM yyyy", { locale: fr })}</span>
              <div className="flex space-x-1">
                <button onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition"><ChevronLeft size={16}/></button>
                <button onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-bold text-gray-400 mb-2">
              {['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {eachDayOfInterval({ 
                start: startOfWeek(startOfMonth(currentMonthView), {weekStartsOn: 1}), 
                end: endOfWeek(endOfMonth(currentMonthView), {weekStartsOn: 1}) 
              }).map((day, i) => (
                <div key={i} onClick={() => !isBefore(day, today) && setCurrentDate(day)} 
                     className={`h-8 flex items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition-all ${isSameDay(day, currentDate) ? 'bg-black text-white shadow-md' : isBefore(day, today) ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-200 text-gray-700'}`}>
                  {format(day, "d")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-20 bg-white border-b border-gray-100 px-6 lg:px-10 flex items-center justify-between z-40 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-gray-50 rounded-xl border border-gray-200"><Menu size={20}/></button>
            <div className="flex items-center space-x-3">
              <button onClick={() => !isSameDay(currentDate, today) && setCurrentDate(subDays(currentDate, 1))} className={`p-2 rounded-xl border ${isSameDay(currentDate, today) ? 'opacity-20 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-200 transition'}`}><ChevronLeft size={20}/></button>
              <span className="font-black text-lg md:text-xl capitalize tracking-tight">{format(currentDate, "EEEE d MMMM", { locale: fr })}</span>
              <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-200 transition"><ChevronRight size={20}/></button>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-black/10 hover:scale-[1.02] transition-transform flex items-center">
            <Plus size={18} className="mr-2" /> Demander
          </button>
        </header>

        <main className="flex-1 overflow-hidden p-4 lg:p-8 bg-gray-50/50">
          <div className="h-full w-full bg-white rounded-[32px] border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            
            <div className="flex-1 overflow-auto relative scroll-smooth">
              <table className="w-full border-separate border-spacing-0 min-w-[900px]">
                <thead>
                  <tr className="sticky top-0 z-30">
                    <th className="sticky left-0 z-50 bg-gray-50 border-b border-r border-gray-100 w-20 h-16 shadow-[1px_0_0_#f3f4f6]">
                      <Clock size={16} className="mx-auto text-gray-300" />
                    </th>
                    {spaces.map(space => (
                      <th key={space.id} className="bg-white/95 backdrop-blur-md border-b border-r border-gray-100 h-16 px-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] block truncate" style={{ color: space.color }}>
                          {space.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(h => (
                    <tr key={h} className="h-16">
                      <td className="sticky left-0 z-20 bg-gray-50 border-r border-b border-gray-100 text-[10px] font-black text-gray-300 text-center shadow-[1px_0_0_#f3f4f6]">
                        {h}:00
                      </td>
                      {spaces.map(space => {
                        const spaceBookings = bookings.filter(b => b.space_id === space.id);
                        const isOccupied = spaceBookings.some(b => h >= new Date(b.start_time).getHours() && h < new Date(b.end_time).getHours());
                        
                        const slotTime = new Date(currentDate);
                        slotTime.setHours(h, 0, 0, 0);
                        const isPast = slotTime < new Date();
                        
                        return (
                          <td key={space.id} className="border-r border-b border-gray-50 relative p-0 h-16 group">
                            <div 
                              onClick={() => !isOccupied && !isPast && handleSlotClick(space.id, h)} 
                              className={`w-full h-full transition-colors flex items-center justify-center
                                ${isOccupied || isPast ? 'bg-gray-100/40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                            >
                              {!isOccupied && !isPast && <Plus size={16} className="text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>

                            {spaceBookings.filter(b => new Date(b.start_time).getHours() === h).map(b => (
                              <div 
                                key={b.id} 
                                className="absolute inset-x-1.5 z-10 rounded-xl p-2 text-[10px] font-black text-white truncate shadow-lg shadow-black/5 pointer-events-none" 
                                style={{ 
                                  top: '6px', 
                                  height: `calc(${(new Date(b.end_time).getHours() - new Date(b.start_time).getHours()) * 64}px - 12px)`, 
                                  backgroundColor: space.color,
                                  opacity: b.status === 'pending' ? 0.6 : 1
                                }}
                              >
                                {b.user_name}
                                {b.status === 'pending' && <span className="block opacity-70 text-[8px] uppercase mt-0.5">En attente</span>}
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

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-black text-2xl tracking-tight text-gray-900 uppercase">Demande de réservation</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Demandeur</label>
                <input placeholder="Prénom Nom" className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all font-medium" value={formData.user_name} onChange={e => setFormData({...formData, user_name: e.target.value})} />
              </div>
              <button className="w-full bg-black text-white py-5 rounded-[20px] font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20" onClick={() => setIsModalOpen(false)}>Soumettre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
