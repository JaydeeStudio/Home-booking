"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  format, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  startOfDay, 
  addMonths, 
  subMonths 
} from "date-fns";
import { fr } from "date-fns/locale";
import { 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Trash2, 
  CheckCircle2, 
  Edit3, 
  Search, 
  ShieldCheck, 
  Clock, 
  Save, 
  Lock, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  DoorOpen 
} from "lucide-react";

// LA LISTE BLANCHE DES EMAILS
const ADMIN_WHITELIST = [
  "jonasdellomo@gmail.com", 
  "jonas@eglisehome.com", 
  "nadege@eglisehome.com", 
  "sabine@eglisehome.com", 
  "yves@eglisehome.com", 
  "christine@eglisehome.com", 
  "mathilde@eglisehome.com"
];

// L'ORDRE FIGÉ DES SALLES
const ROOM_ORDER = [
  "Conférence 1",
  "Conférence 2",
  "Social Stairs",
  "Bureaux",
  "Grande salle",
  "Enfance",
  "Espace canapés"
];

// LE GÉNÉRATEUR STRICT DE 15 MINUTES (CHOIX 2)
const generateTimeOptions = (minTimeStr = "06:00", isEnd = false) => {
  const options = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 23 && m > 0) continue;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      if (timeStr < minTimeStr) continue;
      if (isEnd && timeStr === minTimeStr) continue;
      options.push(timeStr);
    }
  }
  return options;
};

// FONCTION POUR AJOUTER DES MINUTES
const addMinutesToTimeStr = (timeStr: string, minsToAdd: number) => {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date(); 
  date.setHours(h, m + minsToAdd, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [currentMonthView, setCurrentMonthView] = useState(startOfMonth(new Date()));
  const [searchTerm, setSearchTerm] = useState("");
  
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockSuccessMessage, setBlockSuccessMessage] = useState(""); 
  const [recurrenceOption, setRecurrenceOption] = useState("none");
  
  const [conflictModal, setConflictModal] = useState(false);
  const [conflictingBookings, setConflictingBookings] = useState<any[]>([]);
  const [pendingBlocks, setPendingBlocks] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [editData, setEditData] = useState({ 
    user_name: "", 
    space_id: "", 
    reason: "", 
    start_time: "", 
    end_time: "" 
  });

  const [blockData, setBlockData] = useState({ 
    title: "Bloqué (Maintenance/Event)", 
    start_time: "08:00", 
    end_time: "12:00" 
  });
  
  const [selectedSpacesToBlock, setSelectedSpacesToBlock] = useState<string[]>([]);
  const [blockDate, setBlockDate] = useState(new Date());

  const today = startOfDay(new Date());

  useEffect(() => {
    const getSession = async () => { 
      const { data: { session } } = await supabase.auth.getSession(); 
      handleAuth(session?.user || null); 
    };
    getSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuth(session?.user || null)
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = (user: any) => {
    if (user && ADMIN_WHITELIST.includes(user.email!)) {
      setUser(user);
    } else if (user) { 
      supabase.auth.signOut(); 
      alert("Accès refusé. Vous n'avez pas les droits d'administration."); 
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      const fetchSpaces = async () => {
        const { data } = await supabase.from("spaces").select("*");
        if (data) {
          const sorted = data.sort((a, b) => {
            let indexA = ROOM_ORDER.indexOf(a.name);
            let indexB = ROOM_ORDER.indexOf(b.name);
            if (indexA === -1) indexA = 99; 
            if (indexB === -1) indexB = 99;
            return indexA - indexB;
          });
          setSpaces(sorted);
        }
      };
      fetchSpaces();
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    const { data } = await supabase.from("bookings").select("*, spaces(name, color)");
    if (data) setBookings(data);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') { 
        setSelectedBooking(null); 
        setIsEditing(false); 
        setShowBlockModal(false); 
        setBlockSuccessMessage(""); 
        setIsSidebarOpen(false); 
        setConflictModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const openBookingModal = (b: any) => {
    setSelectedBooking(b); 
    setIsEditing(false); 
    setAdminMessage("");
    setEditData({ 
      user_name: b.user_name, 
      space_id: b.space_id, 
      reason: b.reason, 
      start_time: format(new Date(b.start_time), "HH:mm"), 
      end_time: format(new Date(b.end_time), "HH:mm") 
    });
  };

  const updateStatus = async (id: string, status: 'confirmed' | 'rejected') => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    if (status === 'rejected') {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (!error) {
        await notifyUser('DELETED', booking, adminMessage);
        
        if (booking.google_event_id) {
          fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', booking })
          }).catch(err => console.error("Erreur Calendar:", err));
        }

        setBookings(prev => prev.filter(b => b.id !== id));
        setSelectedBooking(null);
      } else {
        setErrorMessage("Erreur lors de la suppression : " + error.message);
      }
      return;
    }

    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    
    if (error) {
      if (error.message.includes("prevent_double_booking")) {
        setErrorMessage("Ce créneau chevauche une autre réservation ou un blocage déjà validé pour cette salle. Vérifiez bien les horaires (même une minute en commun suffit à bloquer !).");
      } else {
        setErrorMessage("Une erreur est survenue : " + error.message);
      }
      return;
    }

    await notifyUser('CONFIRMED', booking, adminMessage);
    
    if (booking.google_event_id) {
      fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          booking: { 
            ...booking, 
            status: 'confirmed',
            space_name: booking.spaces?.name 
          } 
        })
      }).catch(err => console.error("Erreur Calendar:", err));
    }

    setSelectedBooking(null); 
    fetchBookings();
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = new Date(selectedBooking.start_time); 
    const [sh, sm] = editData.start_time.split(':'); 
    st.setHours(parseInt(sh), parseInt(sm), 0);
    
    const et = new Date(selectedBooking.end_time); 
    const [eh, em] = editData.end_time.split(':'); 
    et.setHours(parseInt(eh), parseInt(em), 0);

    const { error } = await supabase.from("bookings").update({
      space_id: editData.space_id, 
      user_name: editData.user_name, 
      reason: editData.reason, 
      start_time: st.toISOString(), 
      end_time: et.toISOString(), 
      status: 'confirmed'
    }).eq("id", selectedBooking.id);

    if (error) {
      if (error.message.includes("prevent_double_booking")) {
        setErrorMessage("Les horaires modifiés créent un conflit avec un autre événement déjà validé pour cette salle.");
      } else {
        setErrorMessage("Erreur de modification : " + error.message);
      }
      return;
    }

    const spaceObj = spaces.find(s => s.id === editData.space_id);
    await notifyUser('MODIFIED', { 
      ...selectedBooking, 
      space_id: editData.space_id, 
      start_time: st.toISOString(), 
      end_time: et.toISOString(), 
      reason: editData.reason 
    }, adminMessage);
    
    if (selectedBooking.google_event_id) {
      fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          booking: { 
            ...selectedBooking, 
            status: 'confirmed', 
            start_time: st.toISOString(), 
            end_time: et.toISOString(),
            space_name: spaceObj?.name
          } 
        })
      }).catch(err => console.error("Erreur Calendar Update:", err));
    }

    setSelectedBooking(null); 
    setIsEditing(false); 
    fetchBookings();
  };

  const notifyUser = async (type: string, booking: any, adminMsg: string) => {
    if(!booking.user_email || booking.user_email === user?.email) return; 
    
    const sColor = spaces.find(s => s.id === booking.space_id)?.color || booking.spaces?.color;
    
    await fetch('/api/send-email', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type, 
        user_name: booking.user_name, 
        user_email: booking.user_email, 
        booking_id: booking.id,
        space_name: spaces.find(s => s.id === booking.space_id)?.name || booking.spaces?.name, 
        space_color: sColor,
        start_time: booking.start_time, 
        end_time: booking.end_time, 
        reason: booking.reason, 
        admin_message: adminMsg
      })
    });
  };

  const toggleSpaceBlock = (spaceId: string) => {
    if (selectedSpacesToBlock.includes(spaceId)) {
      setSelectedSpacesToBlock(prev => prev.filter(id => id !== spaceId));
    } else {
      setSelectedSpacesToBlock(prev => [...prev, spaceId]);
    }
  };

  const generateBlocks = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedSpacesToBlock.length === 0) { 
      setErrorMessage("Veuillez sélectionner au moins une salle en cliquant sur son nom ci-dessous."); 
      return; 
    }

    let currentDay = new Date(blockDate);
    const endRecDate = recurrenceOption === "none" 
      ? currentDay 
      : new Date((document.querySelector('input[name="end_recurrence"]') as HTMLInputElement)?.value || currentDay);
      
    const blocks: any[] = []; 
    let limit = 0; 

    while (currentDay <= endRecDate && limit < 365) {
      const st = new Date(currentDay); 
      const [sh, sm] = blockData.start_time.split(':'); 
      st.setHours(parseInt(sh), parseInt(sm), 0);
      
      const et = new Date(currentDay); 
      const [eh, em] = blockData.end_time.split(':'); 
      et.setHours(parseInt(eh), parseInt(em), 0);
      
      selectedSpacesToBlock.forEach(space_id => {
        blocks.push({
          space_id, 
          user_name: blockData.title, 
          user_email: user?.email || "admin@home.com",
          user_phone: "-",
          reason: "Créneau bloqué automatiquement par l'administration.",
          start_time: st.toISOString(), 
          end_time: et.toISOString(), 
          status: 'confirmed',
          is_block: true
        });
      });

      if (recurrenceOption === 'daily') currentDay = addDays(currentDay, 1);
      else if (recurrenceOption === 'weekly') currentDay = addDays(currentDay, 7);
      else if (recurrenceOption === 'monthly') currentDay = addMonths(currentDay, 1);
      else break;
      
      limit++;
    }

    if (blocks.length > 0) {
      const globalStart = blocks[0].start_time;
      const globalEnd = blocks[blocks.length - 1].end_time;

      const spaceIds = selectedSpacesToBlock;
      const { data: existing } = await supabase.from("bookings").select("*")
        .in("space_id", spaceIds)
        .gte("end_time", globalStart)
        .lte("start_time", globalEnd);

      if (existing && existing.length > 0) {
        const overlaps = existing.filter(b => {
          return blocks.some(block => {
            return block.space_id === b.space_id && 
                   new Date(block.start_time).getTime() < new Date(b.end_time).getTime() && 
                   new Date(block.end_time).getTime() > new Date(b.start_time).getTime();
          });
        });

        if (overlaps.length > 0) {
          setConflictingBookings(overlaps);
          setPendingBlocks(blocks);
          setShowBlockModal(false);
          setConflictModal(true);
          return; 
        }
      }
    }

    executeBlockInsertion(blocks);
  };

  const executeBlockInsertion = async (blocksToInsert: any[]) => {
    const { data: insertedBlocks, error } = await supabase.from("bookings").insert(blocksToInsert).select();
    
    if (error) {
      alert("Erreur lors de la création des blocs.");
    } else { 
      if (insertedBlocks && insertedBlocks.length > 0) {
        insertedBlocks.forEach(block => {
          const spaceObj = spaces.find(s => s.id === block.space_id);
          fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'create', 
              booking: { 
                ...block, 
                space_name: spaceObj?.name, 
                space_color: spaceObj?.color 
              } 
            })
          })
          .then(res => res.json())
          .then(async (calData) => {
            if (calData.google_event_id) {
              await supabase.from("bookings").update({ google_event_id: calData.google_event_id }).eq("id", block.id);
            }
          })
          .catch(err => console.error("Erreur Calendar Block Creation:", err));
        });
      }

      setConflictModal(false);
      setShowBlockModal(false); 
      setBlockSuccessMessage(`${blocksToInsert.length} créneau(x) bloqué(s) avec succès !`);
      setBlockData({ title: "Bloqué (Maintenance/Event)", start_time: "08:00", end_time: "12:00" });
      setSelectedSpacesToBlock([]);
      fetchBookings(); 
    }
  };

  const deleteBooking = async (id: string) => {
    if (confirm("Supprimer ce blocage définitivement ?")) {
      await supabase.from("bookings").delete().eq("id", id);
      fetchBookings();
    }
  };

  const returnHome = () => { 
    setCurrentDate(today); 
    setCurrentMonthView(today); 
    setIsSidebarOpen(false); 
  };

  const filteredBookings = bookings.filter(b => (
    b.user_name + (b.user_email||"") + b.reason + (b.spaces?.name || "")
  ).toLowerCase().includes(searchTerm.toLowerCase()));
  
  const pendingBookings = filteredBookings.filter(b => b.status === 'pending');

  const monthStart = startOfMonth(currentMonthView); 
  const monthEnd = endOfMonth(monthStart);
  
  const calendarDays = eachDayOfInterval({ 
    start: startOfWeek(monthStart, { weekStartsOn: 1 }), 
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }) 
  });
  
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  if (loading) return null;
  
  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl border max-w-md w-full text-center font-sans">
        <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-black" />
        <h1 className="text-3xl font-black mb-8">Admin Login</h1>
        <button 
          onClick={() => supabase.auth.signInWithOAuth({ 
            provider: 'google', 
            options: { 
              redirectTo: window.location.origin + '/admin', 
              queryParams: { prompt: 'select_account' } 
            }
          })} 
          className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:scale-[1.02] transition-transform"
        >
          Continuer avec Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-gray-50 font-sans overflow-hidden relative">
      
      {/* HEADER HAUT POUR MOBILE */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex justify-center items-center z-40 shrink-0 gap-3">
        <div onClick={returnHome} className="cursor-pointer shrink-0">
          <img src="/Logo-Home_noir.png" alt="Logo Home" className="h-5 object-contain" />
        </div>
        <div className="w-[1px] h-6 bg-gray-300 shrink-0"></div>
        <div className="flex flex-col justify-center items-center shrink-0">
          <div className="flex items-center space-x-1.5">
            <DoorOpen size={14} className="text-gray-900" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 mt-0.5 truncate">
              Réservation
            </span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 mt-0.5">
            Administrateur
          </span>
        </div>
      </div>

      {/* SIDEBAR ADMIN DESKTOP */}
      <aside className="hidden lg:flex inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 border-b border-gray-100 flex flex-col items-center justify-center gap-5">
          <div onClick={returnHome} className="cursor-pointer group">
            <div className="group-hover:scale-105 transition-transform">
              <img src="/Logo-Home_noir.png" alt="Logo Home" className="h-7 object-contain" />
            </div>
          </div>
          
          <div className="inline-flex flex-col items-center justify-center bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg w-max">
             <div className="flex items-center space-x-2">
               <DoorOpen size={14} className="text-gray-900" />
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 mt-0.5">
                 Réservation
               </span>
             </div>
             <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mt-1">
               Panneau admin
             </span>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6 shrink-0">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm capitalize">
                {format(currentMonthView, "MMMM yyyy", { locale: fr })}
              </span>
              <div className="flex space-x-1">
                <button 
                  onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))} 
                  className="p-1 hover:bg-gray-200 rounded-md"
                >
                  <ChevronLeft size={16}/>
                </button>
                <button 
                  onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))} 
                  className="p-1 hover:bg-gray-200 rounded-md"
                >
                  <ChevronRight size={16}/>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => (
                <div key={d} className="text-[10px] font-bold text-gray-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const isSelected = isSameDay(day, currentDate);
                return (
                  <div 
                    key={i} 
                    onClick={() => {setCurrentDate(day); setIsSidebarOpen(false);}} 
                    className={`h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer active:scale-90 
                    ${isSelected ? 'bg-black text-white font-bold active:bg-gray-800' : 'hover:bg-gray-200 active:bg-gray-300'} 
                    ${!isSameMonth(day, currentMonthView) && !isSelected ? 'text-gray-400' : ''}`}
                  >
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              En attente ({pendingBookings.length})
            </h2>
            <div className="space-y-3">
              {pendingBookings.map(b => (
                <div 
                  key={b.id} 
                  onClick={() => openBookingModal(b)} 
                  className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 hover:border-blue-300 cursor-pointer transition-all"
                >
                  <span className="text-[9px] font-black px-2 py-1 rounded bg-blue-100 text-blue-700 mb-2 inline-block uppercase tracking-wider">
                    {b.spaces?.name}
                  </span>
                  <p className="font-bold text-sm">{b.user_name}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <Clock size={12} className="mr-1"/> 
                    {format(new Date(b.start_time), "d MMM HH:mm", {locale:fr})}
                  </p>
                </div>
              ))}
              {pendingBookings.length === 0 && (
                <p className="text-xs text-gray-400 italic">Aucune demande en attente.</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* MODAL CALENDRIER ADMIN (MOBILE UNIQUEMENT) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:hidden" onMouseDown={(e) => {if(e.target === e.currentTarget) setIsSidebarOpen(false)}}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">Choisir une date</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-sm capitalize">
                  {format(currentMonthView, "MMMM yyyy", { locale: fr })}
                </span>
                <div className="flex space-x-1">
                  <button onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))} className="p-1 hover:bg-gray-200 rounded-md transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => (
                  <div key={d} className="text-[10px] font-bold text-gray-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const isSelected = isSameDay(day, currentDate);
                  return (
                    <div 
                      key={i} 
                      onClick={() => {setCurrentDate(day); setIsSidebarOpen(false);}} 
                      className={`h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer active:scale-90 
                      ${isSelected ? 'bg-black text-white font-bold active:bg-gray-800' : 'hover:bg-gray-200 active:bg-gray-300'} 
                      ${!isSameMonth(day, currentMonthView) && !isSelected ? 'text-gray-400' : ''}`}
                    >
                      {format(day, "d")}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative bg-gray-50">
        
        {/* HEADER DE NAVIGATION ADMIN */}
        <header className="px-3 lg:px-8 py-3 lg:py-5 flex items-center justify-between z-40 flex-shrink-0 w-full gap-2 lg:gap-4">
          
          <div className="lg:hidden flex-shrink-0 w-[80px]">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-black bg-white rounded-xl shadow-sm border border-gray-200 hover:opacity-70 transition-opacity">
              <CalendarIcon size={20} />
            </button>
          </div>

          <div className="flex-1 flex justify-center lg:justify-start">
            <div className="flex items-center justify-between w-full max-w-[200px] sm:max-w-[260px] bg-white p-1 sm:p-1.5 lg:p-2 rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm h-[48px]">
              <button 
                onClick={() => setCurrentDate(subDays(currentDate, 1))} 
                className="p-1.5 sm:p-2 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-200 border"
              >
                <ChevronLeft size={18}/>
              </button>
              
              <div 
                className="cursor-pointer hover:opacity-70 transition-opacity flex-1 text-center px-0.5 truncate" 
                onClick={() => setIsSidebarOpen(true)}
              >
                 <span className="text-[13px] sm:text-lg font-black capitalize truncate">
                    <span className="hidden sm:inline">{format(currentDate, "EEEE d MMMM", { locale: fr })}</span>
                    <span className="sm:hidden">{format(currentDate, "EEE d MMM", { locale: fr }).replace('.', '')}</span>
                 </span>
              </div>
              
              <button 
                onClick={() => setCurrentDate(addDays(currentDate, 1))} 
                className="p-1.5 sm:p-2 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-200 border"
              >
                <ChevronRight size={18}/>
              </button>
            </div>
          </div>

          <div className="flex-shrink-0 w-[80px] lg:w-auto flex items-center justify-end gap-2 lg:gap-4">
            
            <div className="relative hidden lg:block">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-11 pr-4 py-0 bg-white rounded-2xl text-sm border border-gray-200 w-64 focus:ring-2 focus:ring-black outline-none font-bold transition-all shadow-sm h-[48px]" 
              />
            </div>
            
            <button 
              onClick={() => setShowBlockModal(true)} 
              className="hidden lg:flex h-[48px] px-5 bg-indigo-50 text-indigo-700 rounded-2xl hover:bg-indigo-100 font-bold items-center justify-center transition-colors border border-indigo-100 shadow-sm text-xs leading-snug text-left"
            >
              <Lock size={18} className="mr-3"/>
              <span>Bloquer des<br/>créneaux</span>
            </button>

            <button 
              onClick={() => supabase.auth.signOut()} 
              className="hidden lg:flex h-[48px] px-5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 font-bold items-center text-sm transition-colors border border-red-100 shadow-sm"
            >
              <LogOut size={18} className="mr-3"/> Déconnexion
            </button>

            {/* Boutons Mobile */}
            <button 
              onClick={() => setShowBlockModal(true)} 
              className="lg:hidden h-[48px] w-[48px] bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100 flex items-center justify-center shadow-sm"
            >
              <Lock size={20}/>
            </button>
            <button 
              onClick={() => supabase.auth.signOut()} 
              className="lg:hidden h-[48px] w-[48px] bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100 flex items-center justify-center shadow-sm"
            >
              <LogOut size={20}/>
            </button>
          </div>
        </header>

        {/* RECHERCHE ET ATTENTE SOUS LE HEADER SUR MOBILE */}
        <div className="lg:hidden px-4 pb-4 flex flex-col gap-4 flex-shrink-0 z-30">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher (nom, salle...)" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-11 pr-4 py-3 bg-white rounded-xl text-sm border border-gray-200 w-full focus:ring-2 focus:ring-black outline-none font-bold shadow-sm" 
            />
          </div>
          {pendingBookings.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                En attente ({pendingBookings.length})
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                {pendingBookings.map(b => (
                  <div 
                    key={b.id} 
                    onClick={() => openBookingModal(b)} 
                    className="shrink-0 w-48 p-3 rounded-2xl border border-blue-100 bg-white hover:border-blue-300 cursor-pointer transition-all shadow-sm"
                  >
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-700 mb-1.5 inline-block uppercase tracking-wider">
                      {b.spaces?.name}
                    </span>
                    <p className="font-bold text-sm truncate">{b.user_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                      <Clock size={10} className="mr-1"/> 
                      {format(new Date(b.start_time), "d MMM HH:mm", {locale:fr})}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <main className="flex-1 flex flex-col min-h-0 px-4 lg:px-8 pb-4 lg:pb-8 relative">
          {searchTerm ? (
             <div className="h-full bg-white rounded-3xl border border-gray-200 shadow-sm p-8 overflow-auto mt-2 lg:mt-0">
                <div className="flex items-center justify-between mb-8 border-b pb-4">
                  <h2 className="text-2xl font-black">Résultats : "{searchTerm}"</h2>
                  <button 
                    onClick={() => setSearchTerm("")} 
                    className="text-sm font-bold bg-gray-100 px-4 py-2 rounded-xl hover:bg-gray-200"
                  >
                    Effacer
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBookings.map(b => (
                    <div 
                      key={b.id} 
                      onClick={() => openBookingModal(b)} 
                      className="p-6 border border-gray-100 bg-white rounded-2xl cursor-pointer hover:border-black hover:shadow-lg transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span 
                          className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-gray-50" 
                          style={{color: b.spaces?.color}}
                        >
                          {b.spaces?.name}
                        </span>
                        <span 
                          className={`text-[9px] font-black uppercase px-2 py-1 rounded ${b.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
                        >
                          {b.status === 'pending' ? 'Attente' : 'Confirmé'}
                        </span>
                      </div>
                      <p className="font-bold text-lg mb-1">{b.user_name}</p>
                      <p className="text-sm font-medium text-gray-500 mb-4">
                        {format(new Date(b.start_time), "d MMMM yyyy • HH:mm", {locale:fr})}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-2">{b.reason}</p>
                    </div>
                  ))}
                </div>
             </div>
          ) : (
            <div className="flex-1 bg-white rounded-[32px] border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-hidden mt-2 lg:mt-0">
              <div className="flex-1 overflow-auto relative scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full border-separate border-spacing-0 min-w-[800px]">
                  <thead>
                    <tr className="sticky top-0 z-30">
                      <th className="sticky left-0 z-50 bg-gray-50 border-b border-r border-gray-100 w-16 lg:w-20 h-20 shadow-[1px_1px_0_rgba(0,0,0,0.02)]">
                        <Clock size={16} className="mx-auto text-gray-400" />
                      </th>
                      {spaces.map(space => (
                        <th key={space.id} className="bg-white/95 backdrop-blur-md border-b border-r border-gray-100 h-20 px-2 leading-tight">
                          <span className="text-[11px] lg:text-xs font-black uppercase tracking-widest block truncate" style={{ color: space.color }}>
                            {space.name}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mt-1">
                            {space.capacity ? `${space.capacity} places` : 'Capacité N/A'}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map(h => (
                      <tr key={h} className="h-16">
                        <td className="sticky left-0 z-20 bg-gray-50 border-r border-b border-gray-100 text-[10px] font-bold text-gray-400 text-center shadow-[1px_0_0_rgba(0,0,0,0.02)]">
                          {h}:00
                        </td>
                        {spaces.map(space => {
                          const spaceBookings = bookings.filter(b => b.space_id === space.id && isSameDay(new Date(b.start_time), currentDate));
                          return (
                            <td key={space.id} className="border-r border-b border-gray-50 relative p-0 h-16 bg-white hover:bg-gray-50 transition-colors">
                              {spaceBookings.filter(b => new Date(b.start_time).getHours() === h).map(b => (
                                <div 
                                  key={b.id} 
                                  onClick={() => openBookingModal(b)} 
                                  className={`absolute inset-x-1.5 z-10 rounded-xl p-2 text-[10px] font-black text-white truncate shadow-sm cursor-pointer hover:scale-[1.02] transition-transform ${b.status === 'pending' ? 'opacity-70 border-dashed border-2 border-white/50' : 'opacity-100'}`} 
                                  style={{ 
                                    top: '4px', 
                                    height: `calc(${(new Date(b.end_time).getHours() - new Date(b.start_time).getHours() + (new Date(b.end_time).getMinutes() - new Date(b.start_time).getMinutes())/60 ) * 64}px - 8px)`, 
                                    backgroundColor: space.color 
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
            </div>
          )}
        </main>
      </div>

      {/* MODAL BLOCAGE MULTIPLE (AVEC SELECTEURS A 15 MIN) */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onMouseDown={(e) => {if(e.target === e.currentTarget) setShowBlockModal(false)}}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-8 font-sans border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-indigo-900 flex items-center">
                <Lock className="mr-2" size={20}/> Bloquer
              </h2>
              <button 
                onClick={() => setShowBlockModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={generateBlocks} className="space-y-4">
              
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Date de début
                </label>
                <input 
                  type="date" 
                  name="start_date" 
                  required 
                  defaultValue={format(currentDate, "yyyy-MM-dd")} 
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 font-bold focus:bg-white outline-none" 
                />
              </div>

              {/* SÉLECTEURS 15 MIN */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    De
                  </label>
                  <select 
                    name="start_time" 
                    required 
                    value={blockData.start_time} 
                    onChange={e => setBlockData({...blockData, start_time: e.target.value, end_time: addMinutesToTimeStr(e.target.value, 15)})} 
                    className="w-full h-[52px] border border-gray-200 rounded-xl px-4 bg-gray-50 font-bold focus:bg-white outline-none cursor-pointer"
                  >
                    {generateTimeOptions("06:00", false).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    À
                  </label>
                  <select 
                    name="end_time" 
                    required 
                    value={blockData.end_time} 
                    onChange={e => setBlockData({...blockData, end_time: e.target.value})} 
                    className="w-full h-[52px] border border-gray-200 rounded-xl px-4 bg-gray-50 font-bold focus:bg-white outline-none cursor-pointer"
                  >
                    {generateTimeOptions(blockData.start_time, true).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1 mt-2">
                  Nom du créneau
                </label>
                <input 
                  type="text" 
                  name="block_name" 
                  value={blockData.title} 
                  onChange={e => setBlockData({...blockData, title: e.target.value})} 
                  placeholder="Ex: Célébrations" 
                  required 
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 font-bold focus:bg-white outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    Récurrence
                  </label>
                  <select 
                    name="recurrence" 
                    value={recurrenceOption} 
                    onChange={(e) => setRecurrenceOption(e.target.value)} 
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 font-bold focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="none">Une seule fois</option>
                    <option value="daily">Tous les jours</option>
                    <option value="weekly">Ttes les semaines</option>
                    <option value="monthly">Tous les mois</option>
                  </select>
                </div>
                {recurrenceOption !== "none" && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                      Jusqu'au
                    </label>
                    <input 
                      type="date" 
                      name="end_recurrence" 
                      required 
                      className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 font-bold focus:bg-white outline-none" 
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block mt-2">
                  Salles à bloquer simultanément
                </label>
                <div className="flex flex-wrap gap-2">
                  {spaces.map(space => {
                    const isSelected = selectedSpacesToBlock.includes(space.id);
                    return (
                      <button 
                        key={space.id} 
                        type="button" 
                        onClick={() => toggleSpaceBlock(space.id)} 
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors border 
                        ${isSelected ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      >
                        {isSelected && <CheckCircle2 size={14} className="inline mr-1" />} 
                        {space.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl mt-4 hover:scale-[1.02] shadow-xl shadow-indigo-600/20 transition-all text-sm"
              >
                Bloquer ces créneaux
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ALERTE CONFLIT */}
      {conflictModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[120] p-4" onMouseDown={(e) => {if(e.target === e.currentTarget) setConflictModal(false)}}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-8 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight text-red-600 flex items-center">
                <AlertTriangle className="mr-2" size={24}/> Conflits détectés
              </h2>
              <button 
                onClick={() => setConflictModal(false)} 
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">
              Les réservations suivantes chevauchent les créneaux que vous essayez de bloquer. Voulez-vous tout de même forcer le blocage ?
            </p>
            
            <div className="flex-1 overflow-auto mb-6 space-y-3 bg-red-50/50 p-4 rounded-2xl border border-red-100">
              {conflictingBookings.map((b, i) => (
                <div key={i} className="p-3 bg-white border border-red-200 rounded-xl shadow-sm">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-100 text-red-700 mb-1 inline-block uppercase tracking-wider">
                    {b.spaces?.name}
                  </span>
                  <p className="font-bold text-sm text-gray-900">{b.user_name}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <Clock size={12} className="mr-1"/> 
                    {format(new Date(b.start_time), "d MMM yyyy • HH:mm", {locale:fr})} à {format(new Date(b.end_time), "HH:mm")}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 shrink-0">
              <button 
                onClick={() => setConflictModal(false)} 
                className="flex-1 p-4 bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-black rounded-2xl text-sm uppercase tracking-wider"
              >
                Annuler
              </button>
              <button 
                onClick={() => executeBlockInsertion(pendingBlocks)} 
                className="flex-1 p-4 bg-red-600 text-white hover:bg-red-700 transition font-black rounded-2xl shadow-lg shadow-red-600/20 text-sm uppercase tracking-wider"
              >
                Forcer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUCCESS BLOCAGE */}
      {blockSuccessMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4" onMouseDown={() => setBlockSuccessMessage("")}>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-10 text-center border">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Opération réussie</h2>
            <p className="text-gray-500 font-medium mb-8">{blockSuccessMessage}</p>
            <button 
              onClick={() => setBlockSuccessMessage("")} 
              className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl hover:scale-105 transition-transform flex items-center justify-center"
            >
              Parfait <ChevronRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL GESTION RESERVATION */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onMouseDown={(e) => {if(e.target === e.currentTarget){setSelectedBooking(null); setIsEditing(false);}}}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 p-8 font-sans max-h-[90vh] overflow-y-auto border border-white/20">
             
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">
                  {isEditing ? "Modifier" : "Gérer la demande"}
                </h2>
                <button 
                  type="button" 
                  onClick={() => {setSelectedBooking(null); setIsEditing(false);}} 
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
                >
                  <X className="w-5 h-5"/>
                </button>
             </div>
             
             <form onSubmit={handleEditSave} className="space-y-6">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                          Demandeur
                        </label>
                        <input 
                          required 
                          className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 font-bold focus:bg-white outline-none" 
                          value={editData.user_name} 
                          onChange={e => setEditData({...editData, user_name: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                          Espace
                        </label>
                        <select 
                          className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 font-bold focus:bg-white outline-none cursor-pointer" 
                          value={editData.space_id} 
                          onChange={e => setEditData({...editData, space_id: e.target.value})}
                        >
                          {spaces.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* SÉLECTEURS MODIFICATION (CHOIX 2 : STRICTEMENT 15 MIN) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                          Début
                        </label>
                        <select 
                          required 
                          className="w-full h-[52px] border border-gray-200 rounded-xl px-4 bg-gray-50 font-bold focus:bg-white outline-none cursor-pointer" 
                          value={editData.start_time} 
                          onChange={e => setEditData({...editData, start_time: e.target.value, end_time: addMinutesToTimeStr(e.target.value, 15)})} 
                        >
                          {generateTimeOptions("06:00", false).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                          Fin
                        </label>
                        <select 
                          required 
                          className="w-full h-[52px] border border-gray-200 rounded-xl px-4 bg-gray-50 font-bold focus:bg-white outline-none cursor-pointer" 
                          value={editData.end_time} 
                          onChange={e => setEditData({...editData, end_time: e.target.value})} 
                        >
                          {generateTimeOptions(editData.start_time, true).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-black text-xl text-gray-900">{selectedBooking.user_name}</p>
                          {selectedBooking.user_email && (
                            <p className="text-xs text-gray-500 font-medium mt-1">
                              {selectedBooking.user_phone} • {selectedBooking.user_email}
                            </p>
                          )}
                        </div>
                        <span 
                          className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-100" 
                          style={{color: selectedBooking.spaces?.color}}
                        >
                          {selectedBooking.spaces?.name}
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center shadow-sm">
                        <Clock size={16} className="text-gray-400 mr-3"/>
                        <p className="text-sm font-bold text-gray-800">
                          {format(new Date(selectedBooking.start_time), "EEEE d MMMM yyyy", {locale:fr})} 
                          <span className="text-gray-400 mx-1">•</span> 
                          {format(new Date(selectedBooking.start_time), "HH:mm")} à {format(new Date(selectedBooking.end_time), "HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="bg-blue-50/50 p-6 rounded-[24px] border border-blue-100">
                      <strong className="block mb-2 uppercase text-[10px] font-black tracking-widest text-blue-500">
                        Motif
                      </strong> 
                      <p className="text-sm text-blue-900 font-medium">{selectedBooking.reason}</p>
                    </div>
                  </div>
                )}
                
                {selectedBooking.user_email && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block px-1">
                      Message de l'Admin (Facultatif - Envoyé au demandeur)
                    </label>
                    <textarea 
                      placeholder="Ex: Réservation validée, mais attention à bien éteindre en partant..." 
                      className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all font-medium h-24 resize-none" 
                      value={adminMessage} 
                      onChange={e => setAdminMessage(e.target.value)} 
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => updateStatus(selectedBooking.id, 'rejected')} 
                    className="p-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-5 h-5 mb-2"/> Supprimer
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(!isEditing)} 
                    className="p-4 bg-gray-50 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center hover:bg-gray-200 transition border border-gray-100"
                  >
                    <Edit3 className="w-5 h-5 mb-2"/> {isEditing ? "Annuler" : "Modifier"}
                  </button>
                  
                  {isEditing ? (
                    <button 
                      type="submit" 
                      className="p-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center shadow-xl hover:bg-gray-800 transition"
                    >
                      <Save className="w-5 h-5 mb-2"/> Sauver
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => updateStatus(selectedBooking.id, 'confirmed')} 
                      className={`p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center transition 
                        ${selectedBooking.status === 'confirmed' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-500 text-white shadow-lg hover:bg-green-600'}`} 
                      disabled={selectedBooking.status === 'confirmed'}
                    >
                      <CheckCircle2 className="w-5 h-5 mb-2"/> {selectedBooking.status === 'confirmed' ? 'Déjà validé' : 'Valider'}
                    </button>
                  )}
                </div>
             </form>
          </div>
        </div>
      )}

      {/* MODAL ERREUR GLOBALE */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[150] p-4" onMouseDown={() => setErrorMessage("")}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-8 flex flex-col items-center text-center border border-white/20">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-2">Impossible</h2>
            <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">{errorMessage}</p>
            <button 
              onClick={() => setErrorMessage("")} 
              className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-colors text-sm uppercase tracking-widest shadow-lg"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}