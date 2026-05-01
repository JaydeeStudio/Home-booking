"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { 
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameDay, isBefore, startOfDay, addMonths, subMonths
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Menu } from "lucide-react";

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
    const fetchSpaces = async () => {
      const { data } = await supabase.from("spaces").select("*");
      if (data) {
        setSpaces(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, space_id: data[0].id }));
      }
    };
    fetchSpaces();
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      const start = new Date(currentDate); start.setHours(0,0,0,0);
      const end = new Date(currentDate); end.setHours(23,59,59,999);
      const { data } = await supabase.from("bookings").select("*")
        .gte("start_time", start.toISOString()).lte("start_time", end.toISOString());
      if (data) setBookings(data);
    };
    fetchBookings();
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
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r flex flex-col transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 border-b flex items-center space-x-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          <div className="font-black text-sm leading-tight uppercase">Réservation<br/><span className="text-gray-400">de salle</span></div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="bg-gray-50 p-4 rounded-2xl border mb-4">
             <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))}><ChevronLeft size={16}/></button>
                <span className="text-xs font-bold capitalize">{format(currentMonthView, "MMMM yyyy", { locale: fr })}</span>
                <button onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))}><ChevronRight size={16}/></button>
             </div>
             <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-bold text-gray-400 mb-2">
                {['L','M','M','J','V','S','D'].map(d => <div key={d}>{d}</div>)}
             </div>
             <div className="grid grid-cols-7 gap-1">
                {eachDayOfInterval({ 
                  start: startOfWeek(startOfMonth(currentMonthView), {weekStartsOn: 1}), 
                  end: endOfWeek(endOfMonth(currentMonthView), {weekStartsOn: 1}) 
                }).map((day, i) => (
                  <div key={i} onClick={() => !isBefore(day, today) && setCurrentDate(day)} 
                       className={`h-7 flex items-center justify-center rounded-lg text-[10px] cursor-pointer transition-colors ${isSameDay(day, currentDate) ? 'bg-black text-white' : isBefore(day, today) ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-200'}`}>
                    {format(day, "d")}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="h-20 bg-white border-b px-4 lg:px-8 flex items-center justify-between z-40">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu/></button>
            <div className="flex items-center space-x-2">
              <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className={`p-2 rounded-lg ${isSameDay(currentDate, today) ? 'opacity-20 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-200'}`}><ChevronLeft size={18}/></button>
              <span className="font-bold capitalize text-sm md:text-base">{format(currentDate, "EEEE d MMMM", { locale: fr })}</span>
              <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-200"><ChevronRight size={18}/></button>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-black text-white px-4 md:px-6 py-2 rounded-xl font-bold text-sm">Réserver</button>
        </header>

        {/* CALENDAR GRID WRAPPER */}
        <main className="flex-1 relative p-4 md:p-8 overflow-hidden bg-gray-50">
          <div className="h-full w-full bg-white rounded-3xl border shadow-sm overflow-auto">
            <table className="w-full border-separate border-spacing-0 min-w-[800px]">
              <thead>
                <tr>
                  {/* COIN HAUT GAUCHE - FIXE */}
                  <th className="sticky top-0 left-0 z-50 bg-gray-100 border-b border-r w-16 md:w-20 h-16 shadow-[2px_2px_0_rgba(0,0,0,0.05)]">
                    <Clock size={16} className="mx-auto text-gray-400" />
                  </th>
                  {/* NOMS DES SALLES - FIXES EN HAUT */}
                  {spaces.map(space => (
                    <th key={space.id} className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-r h-16 px-2 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                      <span className="text-[10px] font-black uppercase tracking-widest block truncate" style={{ color: space.color }}>
                        {space.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(h => (
                  <tr key={h}>
                    {/* HEURES - FIXES À GAUCHE */}
                    <td className="sticky left-0 z-40 bg-gray-50 border-r border-b h-16 text-[10px] font-bold text-gray-300 text-center shadow-[2px_0_0_rgba(0,0,0,0.05)]">
                      {h}:00
                    </td>
                    {/* CELLULES DE RÉSERVATION */}
                    {spaces.map(space => {
                      const spaceBookings = bookings.filter(b => b.space_id === space.id);
                      const isOccupied = spaceBookings.some(b => h >= new Date(b.start_time).getHours() && h < new Date(b.end_time).getHours());
                      const isPast = (new Date(currentDate).setHours(h)) < new Date().getTime();
                      
                      return (
                        <td key={space.id} className="border-r border-b relative p-0 h-16">
                          <div 
                            onClick={() => !isOccupied && !isPast && handleSlotClick(space.id, h)} 
                            className={`w-full h-full ${isOccupied || isPast ? 'bg-gray-50/50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                          />
                          {/* Affichage des blocs */}
                          {spaceBookings.filter(b => new Date(b.start_time).getHours() === h).map(b => (
                            <div 
                              key={b.id} 
                              className="absolute inset-x-1 z-10 rounded-lg p-2 text-[9px] font-black text-white truncate shadow-sm pointer-events-none" 
                              style={{ 
                                top: '4px', 
                                height: `${(new Date(b.end_time).getHours() - new Date(b.start_time).getHours()) * 64 - 8}px`, 
                                backgroundColor: space.color,
                                opacity: b.status === 'pending' ? 0.6 : 1
                              }}
                            >
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

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xl">RÉSERVATION</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <input placeholder="Prénom & Nom" className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-black outline-none" value={formData.user_name} onChange={e => setFormData({...formData, user_name: e.target.value})} />
              <button className="w-full bg-black text-white py-4 rounded-xl font-bold hover:scale-[1.02] transition-transform" onClick={() => setIsModalOpen(false)}>Fermer l'exemple</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
