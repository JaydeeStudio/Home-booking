"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay, addMonths, subMonths,
  addYears, subYears
} from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, X, CheckCircle2, Clock, Info, 
  Calendar as CalendarIcon, DoorOpen, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { Turnstile } from '@marsidev/react-turnstile';

const ROOM_ORDER = [
  "Conférence 1",
  "Conférence 2",
  "Espace canapés",
  "Social Stairs",
  "Bureaux",
  "Grande salle",
  "Enfance"
];

// LE GÉNÉRATEUR STRICT DE 15 MINUTES (CHOIX 2)
const generateTimeOptions = (minTimeStr = "06:00", isEnd = false, selectedDate = new Date()) => {
  const options = [];
  const now = new Date();
  const isToday = isSameDay(selectedDate, now);
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 23 && m > 0) continue;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      if (timeStr < minTimeStr) continue;
      if (isEnd && timeStr === minTimeStr) continue;
      if (isToday && !isEnd) {
         if (h < currentHour || (h === currentHour && m <= currentMin)) continue;
      }
      options.push(timeStr);
    }
  }
  return options;
};

const addMinutesToTimeStr = (timeStr: string, minsToAdd: number) => {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date(); date.setHours(h, m + minsToAdd, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function CalendarPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonthView, setCurrentMonthView] = useState(startOfMonth(new Date()));
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [siteContent, setSiteContent] = useState({ 
    intro_title: "Chargement...", 
    intro_paragraph: "" 
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // AJOUT DU CHARGEMENT
  
  const [viewSpace, setViewSpace] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    space_id: "", first_name: "", last_name: "", user_email: "", 
    phone: "+41 ", reason: "", start_time: "10:00", end_time: "10:15",
    cgv_accepted: false
  });

  const today = startOfDay(new Date());

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') { 
        setIsModalOpen(false); 
        setViewSpace(null); 
        setIsSidebarOpen(false);
        setErrorMessage("");
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: spacesData } = await supabase.from("spaces").select("*");
      if (spacesData) {
        const sorted = spacesData.sort((a, b) => {
          let indexA = ROOM_ORDER.indexOf(a.name);
          let indexB = ROOM_ORDER.indexOf(b.name);
          if (indexA === -1) indexA = 99; 
          if (indexB === -1) indexB = 99;
          return indexA - indexB;
        });
        setSpaces(sorted);
        if (sorted.length > 0) setFormData(prev => ({ ...prev, space_id: sorted[0].id }));
      }
      
      const { data: contentData } = await supabase.from("site_content").select("intro_title, intro_paragraph").eq("id", 1).single();
      if (contentData) setSiteContent(contentData);
    };
    fetchData();
  }, []);

  const fetchBookings = async () => {
    const start = new Date(currentDate); start.setHours(0, 0, 0, 0);
    const end = new Date(currentDate); end.setHours(23, 59, 59, 999);
    const { data } = await supabase.from("bookings").select("*")
      .gte("start_time", start.toISOString()).lte("start_time", end.toISOString());
    if (data) setBookings(data);
  };

  useEffect(() => { fetchBookings(); }, [currentDate]);

  const openBookingModal = (spaceId = "") => {
    const options = generateTimeOptions("06:00", false, currentDate);
    if (options.length === 0) { 
      setErrorMessage("Plus aucun créneau disponible pour aujourd'hui."); 
      return; 
    }
    const startStr = options[0];
    const endStr = addMinutesToTimeStr(startStr, 15);
    setFormData({ ...formData, space_id: spaceId || spaces[0]?.id || "", start_time: startStr, end_time: endStr });
    setIsModalOpen(true);
  };

  const handleSlotClick = (spaceId: string, hour: number) => {
    let h = hour;
    if (h < 6) h = 6;
    if (h > 22) h = 22;

    const startStr = h.toString().padStart(2, '0') + ":00";
    const endStr = h.toString().padStart(2, '0') + ":15";
    setFormData(prev => ({ ...prev, space_id: spaceId, start_time: startStr, end_time: endStr }));
    setIsModalOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cgv_accepted || !captchaToken || isSubmitting) return;

    setIsSubmitting(true);

    const start = new Date(currentDate); const [sh, sm] = formData.start_time.split(':'); start.setHours(parseInt(sh), parseInt(sm), 0);
    const end = new Date(currentDate); const [eh, em] = formData.end_time.split(':'); end.setHours(parseInt(eh), parseInt(em), 0);
    
    if (start < new Date()) { 
      setErrorMessage("Impossible de réserver dans le passé. Veuillez choisir un horaire futur."); 
      setIsSubmitting(false);
      return; 
    }
    if (end <= start) { 
      setErrorMessage("L'heure de fin doit obligatoirement être après l'heure de début."); 
      setIsSubmitting(false);
      return; 
    }

    const spaceObj = spaces.find(s => s.id === formData.space_id);
    const full_name = `${formData.first_name} ${formData.last_name}`;

    let googleEventId = null;
    try {
      const calRes = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create', 
          booking: { 
            user_name: full_name, user_email: formData.user_email, reason: formData.reason,
            start_time: start.toISOString(), end_time: end.toISOString(), status: 'pending',
            space_name: spaceObj?.name, space_color: spaceObj?.color 
          } 
        })
      });
      const calData = await calRes.json();
      googleEventId = calData.google_event_id || null;
    } catch (err) {
      console.error("Erreur Google Calendar:", err);
    }

    const { data, error } = await supabase.from("bookings").insert([{
      space_id: formData.space_id, user_name: full_name, user_email: formData.user_email,
      user_phone: formData.phone, reason: formData.reason, 
      start_time: start.toISOString(), end_time: end.toISOString(), status: 'pending',
      google_event_id: googleEventId
    }]).select();

    if (error) { 
      if (error.message.includes("prevent_double_booking")) {
        setErrorMessage("Ce créneau est malheureusement déjà pris ou en attente d'approbation. Veuillez choisir un autre horaire.");
      } else {
        setErrorMessage("Une erreur est survenue : " + error.message); 
      }
      setIsSubmitting(false);
      return; 
    }

    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'NEW_REQUEST', booking_id: data?.[0]?.id, user_name: full_name, user_email: formData.user_email,
        space_name: spaceObj?.name, space_color: spaceObj?.color, start_time: start.toISOString(), end_time: end.toISOString(), reason: formData.reason
      })
    }).catch(console.error);

    setIsModalOpen(false); 
    setShowSuccess(true); 
    setCaptchaToken(null); 
    setIsSubmitting(false);
    fetchBookings(); 
  };

  const returnHome = () => { window.location.href = "/"; };

  const openSpaceModal = (space: any) => { setViewSpace(space); setCurrentImageIndex(0); };

  const spaceImages = viewSpace?.image_url ? viewSpace.image_url.split(',').map((u: string) => u.trim()).filter(Boolean) : [];

  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) setCurrentImageIndex(p => (p + 1) % spaceImages.length);
    if (distance < -50) setCurrentImageIndex(p => p === 0 ? spaceImages.length - 1 : p - 1);
  };

  const monthStart = startOfMonth(currentMonthView);
  const calendarDays = eachDayOfInterval({ 
    start: startOfWeek(monthStart, { weekStartsOn: 1 }), 
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }) 
  });

  if (!isMounted) return null;

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-gray-50 font-sans overflow-hidden relative">

      {/* HEADER MOBILE */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex justify-center items-center z-40 shrink-0 gap-3">
        <div onClick={returnHome} className="cursor-pointer shrink-0">
          <img src="/Logo-Home_noir.png" alt="Logo Home" className="h-5 object-contain" />
        </div>
        <div className="w-[1px] h-4 bg-gray-300 shrink-0"></div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <DoorOpen size={14} className="text-gray-900" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 mt-0.5 truncate">
            Spaces
          </span>
        </div>
      </div>

      {/* TEXTE D'INTRO MOBILE */}
      <div className="lg:hidden bg-[#F4E5D2] px-5 py-4 shrink-0 text-center border-b border-[#EADDCC] shadow-sm">
        <h2 className="text-sm font-black text-black mb-1.5 leading-snug">
          {siteContent.intro_title}
        </h2>
        <p className="text-[11px] text-black/80 font-medium leading-relaxed whitespace-pre-wrap">
          {siteContent.intro_paragraph}
        </p>
      </div>

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 border-b border-gray-100 flex flex-col items-center justify-center gap-5">
          <div onClick={returnHome} className="cursor-pointer group">
            <div className="group-hover:scale-105 transition-transform">
              <img src="/Logo-Home_noir.png" alt="Logo Home" className="h-7 object-contain" />
            </div>
          </div>
          
          <div className="inline-flex items-center justify-center space-x-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg w-max">
             <DoorOpen size={14} className="text-gray-900" />
             <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 mt-0.5">
               Spaces
             </span>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-[#F4E5D2] rounded-2xl p-5 mb-6 border border-[#EADDCC] shadow-inner">
            <h2 className="text-sm font-black text-black mb-2 leading-snug">
              {siteContent.intro_title}
            </h2>
            <p className="text-[11px] text-black/80 font-medium leading-relaxed whitespace-pre-wrap">
              {siteContent.intro_paragraph}
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm capitalize text-gray-900">
                {format(currentMonthView, "MMMM yyyy", { locale: fr })}
              </span>
              <div className="flex space-x-0.5">
                <button onClick={() => setCurrentMonthView(subYears(currentMonthView, 1))} className="p-1.5 hover:bg-gray-200 rounded-md transition text-gray-400 hover:text-gray-900"><ChevronsLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))} className="p-1.5 hover:bg-gray-200 rounded-md transition text-gray-700"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))} className="p-1.5 hover:bg-gray-200 rounded-md transition text-gray-700"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setCurrentMonthView(addYears(currentMonthView, 1))} className="p-1.5 hover:bg-gray-200 rounded-md transition text-gray-400 hover:text-gray-900"><ChevronsRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">{['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => <div key={d} className="text-[9px] font-bold text-gray-400">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const isPast = isBefore(day, today);
                const isSelected = isSameDay(day, currentDate);
                return (
                  <div key={i} onClick={() => { if(!isPast) setCurrentDate(day); }} 
                    className={`h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 
                      ${isPast ? 'text-gray-200 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-200'} 
                      ${isSelected ? 'bg-black text-white font-bold shadow-md' : 'text-gray-700'}`}>
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* MODAL CALENDRIER MOBILE */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:hidden" onMouseDown={(e) => {if(e.target === e.currentTarget) setIsSidebarOpen(false)}}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">Choisir une date</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-sm capitalize text-gray-900">
                  {format(currentMonthView, "MMMM yyyy", { locale: fr })}
                </span>
                <div className="flex space-x-0.5">
                  <button onClick={() => setCurrentMonthView(subYears(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition text-gray-400 hover:text-gray-900"><ChevronsLeft className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition text-gray-700"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition text-gray-700"><ChevronRight className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentMonthView(addYears(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition text-gray-400 hover:text-gray-900"><ChevronsRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const isPast = isBefore(day, today); const isSelected = isSameDay(day, currentDate);
                  return (
                    <div key={i} onClick={() => { if(!isPast) {setCurrentDate(day); setIsSidebarOpen(false);} }} 
                      className={`h-9 flex items-center justify-center rounded-lg text-xs font-medium ${isPast ? 'text-gray-300' : 'cursor-pointer'} ${isSelected ? 'bg-black text-white' : ''}`}>
                      {format(day, "d")}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZONE PRINCIPALE */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-gray-50 relative">
        
        {/* HEADER DE GRILLE */}
        <header className="px-4 lg:px-8 py-4 flex items-center justify-between z-10 shrink-0 w-full gap-2 lg:gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-white rounded-xl shadow-sm border border-gray-200">
            <CalendarIcon size={20} />
          </button>

          <div className="flex-1 flex justify-center lg:justify-start">
            <div className="flex items-center justify-between w-full max-w-[200px] sm:max-w-[260px] bg-white p-1 sm:p-1.5 lg:p-2 rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm h-[48px]">
              <button onClick={() => {if(!isBefore(subDays(currentDate, 1), today)) setCurrentDate(subDays(currentDate, 1))}} className="p-1.5 sm:p-2 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-200 border">
                <ChevronLeft size={18}/>
              </button>
              
              <div onClick={() => setIsSidebarOpen(true)} className="cursor-pointer hover:opacity-70 transition-opacity flex-1 text-center px-0.5 truncate">
                <span className="text-[13px] sm:text-lg font-black capitalize truncate hidden sm:block">
                  {format(currentDate, "EEEE d MMMM", { locale: fr })}
                </span>
                <span className="text-[13px] font-black capitalize truncate sm:hidden">
                  {format(currentDate, "EEE d MMM", { locale: fr }).replace('.', '')}
                </span>
              </div>

              <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1.5 sm:p-2 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-200 border">
                <ChevronRight size={18}/>
              </button>
            </div>
          </div>

          <button onClick={() => openBookingModal()} className="h-12 bg-black text-white px-4 sm:px-6 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition shadow-xl flex items-center justify-center text-[10px]">
            <Plus size={16} className="lg:mr-2" /> 
            <span className="hidden lg:inline">Nouvelle demande</span>
          </button>
        </header>

        {/* GRILLE DES SALLES */}
        <main className="flex-1 flex flex-col min-h-0 px-4 lg:px-8 pb-4 lg:pb-8 relative">
          <div className="flex-1 bg-white rounded-[32px] border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-auto relative overscroll-none" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-separate border-spacing-0 min-w-[800px] pb-12">
                <thead>
                  <tr className="sticky top-0 z-30">
                    <th className="sticky left-0 z-50 bg-gray-50 border-b border-r border-gray-100 w-16 lg:w-20 h-20"><Clock size={16} className="mx-auto text-gray-400" /></th>
                    {spaces.map(space => (
                      <th key={space.id} onClick={() => openSpaceModal(space)} className="bg-white/95 backdrop-blur-md border-b border-r border-gray-100 h-20 px-2 leading-tight cursor-pointer hover:bg-gray-50 transition-colors">
                        <span className="text-[11px] lg:text-xs font-black uppercase tracking-widest block truncate" style={{ color: space.color }}>{space.name}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block mt-1">{space.capacity} places</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 18 }, (_, i) => i + 6).map(h => (
                    <tr key={h} className="h-16">
                      <td className="sticky left-0 z-20 bg-gray-50 border-r border-b border-gray-100 text-[10px] font-bold text-gray-400 text-center">{h}:00</td>
                      {spaces.map(space => {
                        const spaceBookings = bookings.filter(b => b.space_id === space.id);
                        const isOccupied = spaceBookings.some(b => h >= new Date(b.start_time).getHours() && h < new Date(b.end_time).getHours());
                        
                        const slotTime = new Date(currentDate); 
                        slotTime.setHours(h, 0, 0, 0);
                        const isPast = slotTime < new Date();
                        
                        return (
                          <td key={space.id} className={`border-r border-b border-gray-100 relative p-0 h-16 group ${isPast ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}>
                            <div onClick={() => !isOccupied && !isPast && handleSlotClick(space.id, h)} className="w-full h-full flex items-center justify-center cursor-pointer">
                              {!isOccupied && !isPast && <Plus size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                            {spaceBookings.filter(b => new Date(b.start_time).getHours() === h).map(b => (
                              <div key={b.id} className="absolute inset-x-1.5 z-10 rounded-xl p-2 text-[10px] font-black text-white truncate shadow-sm transition-all" style={{ top: '4px', height: `calc(${(new Date(b.end_time).getHours() - new Date(b.start_time).getHours() + (new Date(b.end_time).getMinutes() - new Date(b.start_time).getMinutes())/60 ) * 64}px - 8px)`, backgroundColor: space.color, opacity: b.status === 'pending' ? 0.6 : 0.9 }}>
                                {b.user_name} {b.status === 'pending' && <span className="block opacity-70 text-[8px] mt-0.5">EN ATTENTE</span>}
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

      {/* MODAL PHOTOS SALLE */}
      {viewSpace && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[110] p-4" onMouseDown={(e) => {if(e.target === e.currentTarget) setViewSpace(null)}}>
          <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="relative h-64 sm:h-72 bg-gray-100 flex items-center justify-center group" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              {spaceImages.length > 0 ? (
                <>
                  <a href={spaceImages[currentImageIndex]} target="_blank" rel="noopener noreferrer" className="w-full h-full block cursor-zoom-in">
                    <img src={spaceImages[currentImageIndex]} className="w-full h-full object-cover" />
                  </a>
                  
                  {spaceImages.length > 1 && (
                    <>
                      <div className="absolute inset-x-4 flex justify-between items-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <button onClick={(e) => {e.stopPropagation(); setCurrentImageIndex(p => p === 0 ? spaceImages.length - 1 : p - 1)}} className="p-3 bg-white/90 rounded-full shadow-md hover:bg-white transition pointer-events-auto"><ChevronLeft size={24}/></button>
                        <button onClick={(e) => {e.stopPropagation(); setCurrentImageIndex(p => (p + 1) % spaceImages.length)}} className="p-3 bg-white/90 rounded-full shadow-md hover:bg-white transition pointer-events-auto"><ChevronRight size={24}/></button>
                      </div>
                      
                      <div className="absolute bottom-4 flex space-x-1.5 pointer-events-none">
                        {spaceImages.map((_: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/50 w-1.5'}`} 
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : <Info className="w-10 h-10 text-gray-300" />}
              <button onClick={() => setViewSpace(null)} className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-sm hover:bg-white"><X size={20}/></button>
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-black uppercase mb-2" style={{ color: viewSpace.color }}>{viewSpace.name}</h2>
              <div className="inline-block px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 mb-6 uppercase">Capacité : {viewSpace.capacity} places</div>
              <p className="text-gray-600 text-sm leading-relaxed font-medium whitespace-pre-wrap">{viewSpace.description}</p>
              <button onClick={() => { setViewSpace(null); openBookingModal(viewSpace.id); }} className="w-full mt-8 bg-black text-white font-black uppercase py-4 rounded-2xl shadow-xl text-sm hover:scale-[1.02] transition-transform">Demander cette salle</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉSERVATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onMouseDown={(e) => {if(e.target === e.currentTarget && !isSubmitting) setIsModalOpen(false)}}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Demande de réservation</h2>
              <button type="button" onClick={() => {if(!isSubmitting) setIsModalOpen(false)}} className="bg-gray-100 p-2 rounded-full disabled:opacity-50"><X size={20}/></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="p-6 space-y-5">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center text-sm font-black text-gray-800 capitalize">{format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}</div>
              
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Espace *</label>
                <select className="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-gray-200" value={formData.space_id} onChange={(e) => setFormData({...formData, space_id: e.target.value})} required disabled={isSubmitting}>
                  {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              {/* LA LISTE DE SELECT (CHOIX 2 : STRICT) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Début *</label>
                  <select 
                    required 
                    disabled={isSubmitting}
                    value={formData.start_time} 
                    onChange={(e) => {
                      const newStart = e.target.value;
                      let newEnd = formData.end_time;
                      if (newEnd <= newStart) newEnd = addMinutesToTimeStr(newStart, 15);
                      setFormData({...formData, start_time: newStart, end_time: newEnd});
                    }} 
                    className="block w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer disabled:opacity-50" 
                  >
                    {generateTimeOptions("06:00", false, currentDate).map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Fin *</label>
                  <select 
                    required 
                    disabled={isSubmitting}
                    value={formData.end_time} 
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})} 
                    className="block w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer disabled:opacity-50" 
                  >
                    {generateTimeOptions(formData.start_time, true, currentDate).map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Prénom *</label><input type="text" disabled={isSubmitting} required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="block w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Nom *</label><input type="text" disabled={isSubmitting} required value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="block w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">E-mail *</label><input type="email" disabled={isSubmitting} required value={formData.user_email} onChange={(e) => setFormData({...formData, user_email: e.target.value})} className="block w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Téléphone *</label><input type="tel" disabled={isSubmitting} required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="block w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" /></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Raison *</label><textarea required disabled={isSubmitting} value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="block w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 font-medium h-24 resize-none outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" /></div>
              <div className="flex items-start bg-gray-50 p-4 rounded-xl border border-gray-200">
                <input type="checkbox" required disabled={isSubmitting} checked={formData.cgv_accepted} onChange={(e) => setFormData({...formData, cgv_accepted: e.target.checked})} className="mt-1 w-4 h-4 cursor-pointer accent-black disabled:opacity-50" />
                <label className="ml-3 text-[11px] text-gray-600 font-medium">J'accepte les <Link href="/cgv" target="_blank" className="text-black font-bold underline">conditions d'utilisation</Link>.</label>
              </div>
              
              {!isSubmitting && (
                <div className="mt-4 flex justify-center">
                  <Turnstile siteKey="0x4AAAAAADIiijhYB_5mdeNZ" onSuccess={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken(null)} />
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={!formData.cgv_accepted || !captchaToken || isSubmitting} 
                className={`w-full text-white font-black uppercase py-4 rounded-2xl mt-4 shadow-xl text-sm transition-all flex items-center justify-center ${(!formData.cgv_accepted || !captchaToken) ? 'bg-gray-300 cursor-not-allowed' : isSubmitting ? 'bg-gray-800 cursor-wait' : 'bg-black hover:scale-[1.02]'}`}
              >
                {isSubmitting ? (
                  <>
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     Envoi en cours...
                  </>
                ) : (
                  "Transmettre la demande"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ERREUR GLOBALE */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[150] p-4" onMouseDown={() => setErrorMessage("")}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-8 flex flex-col items-center text-center border border-white/20" onMouseDown={e => e.stopPropagation()}>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-2">Oups !</h2>
            <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">{errorMessage}</p>
            <button onClick={() => setErrorMessage("")} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-colors text-sm uppercase tracking-widest shadow-lg">
              Compris
            </button>
          </div>
        </div>
      )}

      {/* MODAL SUCCÈS */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[120] p-4" onMouseDown={() => setShowSuccess(false)}>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-10 text-center border">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-green-600" /></div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Reçue !</h2>
            <p className="text-gray-500 font-medium mb-8 text-sm leading-relaxed">Votre demande est en cours de validation par notre administration.</p>
            <button onClick={() => setShowSuccess(false)} className="w-full bg-black text-white font-black py-4 rounded-2xl flex items-center justify-center hover:bg-gray-900 transition-colors">C'est parfait <ChevronRight size={20} className="ml-2" /></button>
          </div>
        </div>
      )}
    </div>
  );
}