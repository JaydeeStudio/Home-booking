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
    <div className="fixed inset-0 flex overflow-hidden bg-gray-50 font-sans">
      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r flex flex-col transition-transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 border-b font-black text-xl">RÉSERVATION</div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="bg-gray-50 p-4 rounded-2xl border">
            <div className="grid grid-cols-7 gap-1">
              {eachDayOfInterval({ 
                start: startOfWeek(startOfMonth(currentMonthView), {weekStartsOn: 1}), 
                end: endOfWeek(endOfMonth(currentMonthView), {weekStartsOn: 1}) 
              }).map((day, i) => (
                <div key={i} onClick={() => !isBefore(day, today) && setCurrentDate(day)} 
                     className={`h-8 flex items-center justify-center rounded-lg text-xs cursor-pointer ${isSameDay(day, currentDate) ? 'bg-black text-white' : 'hover:bg-gray-200'}`}>
                  {format(day, "d")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden"><Menu/></button>
            <div className="flex items-center space-x-2">
              <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 bg-gray-50 rounded-lg"><ChevronLeft size={18}/></button>
              <span className="font-bold capitalize">{format(currentDate, "EEEE d MMMM", { locale: fr })}</span>
              <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 bg-gray-50 rounded-lg"><ChevronRight size={18}/></button>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-black text-white px-6 py-2 rounded-xl font-bold">Réserver</button>
        </header>

        <main className="flex-1 overflow-hidden p-4 lg:p-8">
          <div className="h-full w-full bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto relative">
              <table className="w-full border-collapse table-fixed min-w-[800px]">
                <thead>
                  <tr className="sticky top-0 z-30">
                    <th className="sticky left-0 z-40 bg-gray-100 border-b border-r w-20 h-16"><Clock size={16} className="mx-auto text-gray-400" /></th>
                    {spaces.map(space => (
                      <th key={space.id} className="bg-white/95 backdrop-blur border-b border-r h-16 px-2">
                        <span className="text-[10px] font-black uppercase" style={{ color: space.color }}>{space.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(h => (
                    <tr key={h} className="h-16">
                      <td className="sticky left-0 z-20 bg-gray-50 border-r border-b text-[10px] font-bold text-gray-300 text-center">{h}:00</td>
                      {spaces.map(space => {
                        const isOccupied = bookings.some(b => b.space_id === space.id && h >= new Date(b.start_time).getHours() && h < new Date(b.end_time).getHours());
                        return (
                          <td key={space.id} className="border-r border-b relative p-0">
                            <div onClick={() => !isOccupied && handleSlotClick(space.id, h)} className={`w-full h-full ${isOccupied ? 'bg-gray-50/50' : 'cursor-pointer hover:bg-gray-50'}`}></div>
                            {bookings.filter(b => b.space_id === space.id && new Date(b.start_time).getHours() === h).map(b => (
                              <div key={b.id} className="absolute inset-x-1 z-10 rounded-lg p-1 text-[9px] font-bold text-white truncate" 
                                   style={{ top: '2px', height: '60px', backgroundColor: space.color }}>
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
          </div>
        </main>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Réservation</h2>
              <button onClick={() => setIsModalOpen(false)}><X/></button>
            </div>
            <div className="space-y-4">
              <input placeholder="Nom" className="w-full border rounded-xl p-3" value={formData.user_name} onChange={e => setFormData({...formData, user_name: e.target.value})} />
              <button className="w-full bg-black text-white py-3 rounded-xl font-bold" onClick={() => setIsModalOpen(false)}>Fermer (Test)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
