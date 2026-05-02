"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { 
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay, addMonths, subMonths
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2, Clock, Info, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonthView, setCurrentMonthView] = useState(startOfMonth(new Date()));
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [viewSpace, setViewSpace] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    space_id: "", first_name: "", last_name: "", user_email: "", 
    phone: "+41 ", reason: "", start_time: "10:00", end_time: "12:00",
    cgv_accepted: false
  });

  const today = startOfDay(new Date());

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') { setIsModalOpen(false); setViewSpace(null); }
    };
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
    if (!formData.cgv_accepted) return;

    const start = new Date(currentDate); const [sh, sm] = formData.start_time.split(':'); start.setHours(parseInt(sh), parseInt(sm), 0);
    const end = new Date(currentDate); const [eh, em] = formData.end_time.split(':'); end.setHours(parseInt(eh), parseInt(em), 0);
    
    if (start < new Date()) { alert("⚠️ Vous ne pouvez pas réserver un créneau dans le passé."); return; }

    const spaceObj = spaces.find(s => s.id === formData.space_id);
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
          space_name: spaceObj?.name, space_color: spaceObj?.color, start_time: start.toISOString(), end_time: end.toISOString(), reason: formData.reason
        })
      });
      setIsModalOpen(false);
      setShowSuccess(true);
      fetchBookings(); 
    }
  };

  const returnHome = () => { setCurrentDate(today); setCurrentMonthView(today); setIsSidebarOpen(false); };

  const openSpaceModal = (space: any) => {
    setViewSpace(space);
    setCurrentImageIndex(0);
  };

  const spaceImages = viewSpace && viewSpace.image_url ? viewSpace.image_url.split(',').map((u: string) => u.trim()).filter(Boolean) : [];

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) setCurrentImageIndex(p => (p + 1) % spaceImages.length);
    if (distance < -minSwipeDistance) setCurrentImageIndex(p => p === 0 ? spaceImages.length - 1 : p - 1);
  };

  const monthStart = startOfMonth(currentMonthView); const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) });
  const weekDaysHeader = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  if (!isMounted) return null;

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-gray-50 font-sans overflow-hidden relative">
      
      {/* HEADER HAUT POUR MOBILE */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center z-40 shrink-0">
        <div onClick={returnHome} className="flex items-center space-x-3 cursor-pointer">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-lg font-black uppercase tracking-tight text-gray-900 leading-none">Home<br/><span className="text-gray-400 text-xs">Réservation</span></h1>
        </div>
      </div>

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 flex flex-col shadow-2xl lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 border-b border-gray-100 hidden lg:flex items-center justify-between">
          <div onClick={returnHome} className="flex items-center space-x-4 cursor-pointer group">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"><img src="/logo.png" alt="Logo" className="w-full h-full object-contain" /></div>
            <h1 className="text-xl font-black uppercase tracking-tight text-gray-900 leading-tight"><span className="block">Home</span><span className="block text-gray-400 text-sm">Réservation</span></h1>
          </div>
        </div>

        {/* MODAL CALENDRIER (VISIBLE UNIQUEMENT SUR MOBILE) */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:hidden" onMouseDown={(e) => {if(e.target === e.currentTarget) setIsSidebarOpen(false)}}>
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">Choisir une date</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5"/></button>
              </div>
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
                  {calendarDays.map((day, i) => {
                    const isPast = isBefore(day, today);
                    const isSelected = isSameDay(day, currentDate);
                    return (
                      <div key={i} onClick={() => { if(!isPast) { setCurrentDate(day); setIsSidebarOpen(false); }}} 
                        className={`h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 
                          ${isPast ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-200 active:scale-90 active:bg-gray-300'} 
                          ${!isPast && !isSelected ? 'text-gray-700' : ''} 
                          ${!isSameMonth(day, currentMonthView) && !isPast ? 'text-gray-400' : ''} 
                          ${isSelected ? 'bg-black text-white font-bold shadow-md active:bg-gray-800' : ''}`}>
                        {format(day, "d")}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 flex-1 overflow-y-auto hidden lg:block">
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
              {calendarDays.map((day, i) => {
                const isPast = isBefore(day, today);
                const isSelected = isSameDay(day, currentDate);
                return (
                  <div key={i} onClick={() => { if(!isPast) setCurrentDate(day); }} 
                    className={`h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 
                      ${isPast ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-200 active:scale-90 active:bg-gray-300'} 
                      ${!isPast && !isSelected ? 'text-gray-700' : ''} 
                      ${!isSameMonth(day, currentMonthView) && !isPast ? 'text-gray-400' : ''} 
                      ${isSelected ? 'bg-black text-white font-bold shadow-md active:bg-gray-800' : ''}`}>
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative bg-gray-50">
        
        {/* SECTION HERO D'EXPLICATION */}
        <div className="px-4 lg:px-8 pt-6 pb-2 shrink-0">
          <div className="bg-white rounded-[24px] p-6 lg:p-8 border border-gray-200 shadow-sm flex items-start sm:items-center">
            <Info className="w-8 h-8 text-blue-500 mr-4 shrink-0 hidden sm:block" />
            <div>
              <h2 className="text-xl lg:text-2xl font-black text-gray-900 mb-2">Bienvenue sur le portail de réservation.</h2>
              <p className="text-gray-500 font-medium text-sm lg:text-base max-w-3xl leading-relaxed">
                Sélectionnez une date dans le calendrier pour visualiser les disponibilités de nos salles en temps réel. Cliquez sur un créneau libre pour formuler votre demande. Chaque demande est soumise à la validation de notre administration.
              </p>
            </div>
          </div>
        </div>

        {/* HEADER DE NAVIGATION (3 BLOCS HARMONISÉS) */}
        <header className="px-4 lg:px-8 py-4 flex justify-between items-center z-10 flex-shrink-0 gap-2">
          
          {/* 1. Bloc gauche (Icône) */}
          <div className="flex-1 flex justify-start lg:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="p-1 text-black bg-transparent outline-none hover:opacity-70 transition-opacity">
              <CalendarIcon size={24} />
            </button>
          </div>
          <div className="hidden lg:block flex-1"></div>

          {/* 2. Bloc centre (Date) */}
          <div className="flex items-center justify-between w-[60%] sm:w-[320px] bg-white p-1.5 lg:p-2 rounded-2xl border border-gray-200 shadow-sm shrink-0">
            <button onClick={() => {if(!isSameDay(currentDate, today) && !isBefore(subDays(currentDate, 1), today)) setCurrentDate(subDays(currentDate, 1))}} className={`p-2 rounded-xl transition ${(!isSameDay(currentDate, today) && !isBefore(subDays(currentDate, 1), today)) ? 'hover:bg-gray-100 bg-gray-50' : 'opacity-30 cursor-not-allowed'}`}>
              <ChevronLeft size={18}/>
            </button>
            
            <div className="cursor-pointer hover:opacity-70 transition-opacity flex-1 text-center px-1" onClick={() => setIsSidebarOpen(true)}>
              <span className="text-[13px] sm:text-lg font-black capitalize">
                <span className="hidden sm:inline">{format(currentDate, "EEEE d MMMM", { locale: fr })}</span>
                <span className="sm:hidden">{format(currentDate, "EEE d MMM", { locale: fr }).replace('.', '')}</span>
              </span>
            </div>

            <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 hover:bg-gray-100 bg-gray-50 rounded-xl transition">
              <ChevronRight size={18}/>
            </button>
          </div>

          {/* 3. Bloc droite (Demande) */}
          <div className="flex-1 flex justify-end">
            <button onClick={() => { setFormData(prev => ({...prev, start_time: "10:00", end_time: "12:00"})); setIsModalOpen(true); }} className="bg-black text-white px-4 lg:px-6 py-3 lg:py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition shadow-xl shadow-black/20 flex items-center text-[10px] lg:text-xs">
              <Plus size={16} className="mr-1 lg:mr-2" /> 
              <span className="hidden sm:inline">Demander</span>
              <span className="sm:hidden">Demande</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 px-4 lg:px-8 pb-4 lg:pb-8 relative">
          <div className="flex-1 bg-white rounded-[32px] border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-auto relative scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-separate border-spacing-0 min-w-[800px]">
                <thead>
                  <tr className="sticky top-0 z-30">
                    <th className="sticky left-0 z-50 bg-gray-50 border-b border-r border-gray-100 w-16 lg:w-20 h-20 shadow-[1px_1px_0_rgba(0,0,0,0.02)]"><Clock size={16} className="mx-auto text-gray-400" /></th>
                    {spaces.map(space => (
                      <th key={space.id} onClick={() => openSpaceModal(space)} className="bg-white/95 backdrop-blur-md border-b border-r border-gray-100 h-20 px-2 leading-tight cursor-pointer hover:bg-gray-50 transition-colors group">
                        <span className="text-[11px] lg:text-xs font-black uppercase tracking-widest block truncate group-hover:scale-105 transition-transform" style={{ color: space.color }}>{space.name}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mt-1">{space.capacity ? `${space.capacity} places` : 'Capacité N/A'}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(h => (
                    <tr key={h} className="h-16">
                      <td className="sticky left-0 z-20 bg-gray-50 border-r border-b border-gray-100 text-[10px] font-bold text-gray-400 text-center shadow-[1px_0_0_rgba(0,0,0,0.02)]">{h}:00</td>
                      {spaces.map(space => {
                        const spaceBookings = bookings.filter(b => b.space_id === space.id);
                        const isOccupied = spaceBookings.some(b => h >= new Date(b.start_time).getHours() && h < new Date(b.end_time).getHours());
                        const slotTime = new Date(currentDate); slotTime.setHours(h, 0, 0, 0);
                        const isPast = slotTime < new Date();
                        
                        return (
                          <td key={space.id} className={`border-r border-b border-gray-100 relative p-0 h-16 group ${isPast ? 'bg-gray-200' : 'bg-white hover:bg-gray-50 transition-colors'}`}>
                            <div onClick={() => !isOccupied && !isPast && handleSlotClick(space.id, h)} className={`w-full h-full flex items-center justify-center ${isOccupied && !isPast ? 'bg-gray-50/50 cursor-not-allowed' : isPast ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                              {!isOccupied && !isPast && <Plus size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                            
                            {/* Affichage normal des réservations (même passées) */}
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

      {/* MODAL PHOTOS DE LA SALLE (CAROUSEL AVEC SWIPE) */}
      {viewSpace && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[110] p-4" onMouseDown={(e) => {if(e.target === e.currentTarget) setViewSpace(null)}}>
          <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div 
              className="relative h-64 bg-gray-100 flex items-center justify-center border-b border-gray-200 group"
              onTouchStart={onTouchStart} 
              onTouchMove={onTouchMove} 
              onTouchEnd={onTouchEnd}
            >
              {spaceImages.length > 0 ? (
                <>
                  <img src={spaceImages[currentImageIndex]} alt={`${viewSpace.name} ${currentImageIndex+1}`} className="w-full h-full object-cover transition-opacity duration-300 select-none pointer-events-none" />
                  
                  {spaceImages.length > 1 && (
                    <>
                      <button onClick={() => setCurrentImageIndex(p => p === 0 ? spaceImages.length - 1 : p - 1)} className="absolute left-4 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition shadow-md text-black opacity-0 group-hover:opacity-100"><ChevronLeft size={20}/></button>
                      <button onClick={() => setCurrentImageIndex(p => (p + 1) % spaceImages.length)} className="absolute right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition shadow-md text-black opacity-0 group-hover:opacity-100"><ChevronRight size={20}/></button>
                      <div className="absolute bottom-4 flex space-x-1.5">
                        {spaceImages.map((_: any, idx: number) => (
                          <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white scale-110' : 'bg-white/50'}`} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-400">
                   <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
                   <p className="font-bold text-sm">Aucune photo disponible</p>
                </div>
              )}
              <button onClick={() => setViewSpace(null)} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition shadow-sm z-10"><X className="w-5 h-5 text-black" /></button>
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-black uppercase tracking-tight mb-2" style={{ color: viewSpace.color }}>{viewSpace.name}</h2>
              <div className="inline-block px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 mb-6 uppercase tracking-wider">
                Capacité : {viewSpace.capacity ? `${viewSpace.capacity} places` : 'Non renseignée'}
              </div>
              {viewSpace.description && <p className="text-gray-600 leading-relaxed font-medium">{viewSpace.description}</p>}
              <button onClick={() => { setViewSpace(null); setFormData(prev => ({...prev, space_id: viewSpace.id, start_time: "10:00", end_time: "12:00"})); setIsModalOpen(true); }} className="w-full mt-8 bg-black text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:scale-[1.02] transition-transform shadow-xl text-sm">Demander cette salle</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULAIRE DE RÉSERVATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onMouseDown={(e) => {if(e.target === e.currentTarget) setIsModalOpen(false)}}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Demande de réservation</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="p-6 space-y-5">
              <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Espace *</label><select className="w-full border border-gray-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black bg-gray-50 font-bold" value={formData.space_id} onChange={(e) => setFormData({...formData, space_id: e.target.value})} required>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="flex space-x-4">
                <div className="flex-1"><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Début *</label><input type="time" required value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black bg-gray-50 font-bold" /></div>
                <div className="flex-1"><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Fin *</label><input type="time" required value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black bg-gray-50 font-bold" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Prénom *</label><input type="text" required placeholder="Jean" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black focus:bg-white bg-gray-50 font-medium transition-colors" /></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Nom *</label><input type="text" required placeholder="Dupont" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black focus:bg-white bg-gray-50 font-medium transition-colors" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">E-mail *</label><input type="email" required placeholder="jean@email.com" value={formData.user_email} onChange={(e) => setFormData({...formData, user_email: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black focus:bg-white bg-gray-50 font-medium transition-colors" /></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Téléphone *</label><input type="tel" required placeholder="+41 79 123 45 67" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black focus:bg-white bg-gray-50 font-medium transition-colors" /></div>
              </div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Raison de la demande *</label><textarea required placeholder="Réunion, rencontre..." value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-black focus:bg-white bg-gray-50 font-medium transition-colors h-24 resize-none" /></div>
              
              <div className="flex items-start mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <input type="checkbox" required id="cgv" checked={formData.cgv_accepted} onChange={(e) => setFormData({...formData, cgv_accepted: e.target.checked})} className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer" />
                <label htmlFor="cgv" className="ml-3 text-xs text-gray-600 font-medium leading-relaxed cursor-pointer">
                  J'ai lu et j'accepte sans réserve les <Link href="/cgv" target="_blank" className="text-black font-bold underline">conditions d'utilisation</Link> de ces locaux.
                </label>
              </div>

              <button type="submit" disabled={!formData.cgv_accepted} className={`w-full text-white font-black uppercase tracking-widest py-4 rounded-2xl mt-4 transition-transform shadow-xl text-sm ${formData.cgv_accepted ? 'bg-black hover:scale-[1.02]' : 'bg-gray-300 cursor-not-allowed'}`}>Transmettre la demande</button>
            </form>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-4" onMouseDown={() => setShowSuccess(false)}>
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