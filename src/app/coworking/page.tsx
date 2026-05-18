"use client";

import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ChevronLeft, ChevronRight, X, Monitor, Wifi, Coffee, 
  BatteryCharging, Map, CreditCard, DoorOpen, CheckCircle2, User,
  Calendar as CalendarIcon, Info
} from "lucide-react";

// --- DONNÉES SIMULÉES (Pour la page de test) ---
const MOCK_DESKS = [
  { id: "desk-1", name: "Poste 01", room: "Open Space", type: "hot-desk", price: 25, status: "available", amenities: ["Wifi Haut Débit", "Café inclus", "Prises USB-C"] },
  { id: "desk-2", name: "Poste 02", room: "Open Space", type: "hot-desk", price: 25, status: "occupied", amenities: ["Wifi Haut Débit", "Café inclus", "Prises USB-C"] },
  { id: "desk-3", name: "Poste 03", room: "Open Space", type: "hot-desk", price: 25, status: "available", amenities: ["Wifi Haut Débit", "Café inclus", "Prises USB-C"] },
  { id: "desk-4", name: "Poste 04", room: "Open Space", type: "hot-desk", price: 25, status: "available", amenities: ["Wifi Haut Débit", "Café inclus", "Prises USB-C"] },
  
  { id: "desk-5", name: "Bureau Pro A", room: "Zone Silencieuse", type: "dedicated", price: 40, status: "available", amenities: ["Double Écran 27\"", "Chaise Ergo", "Casier sécurisé"] },
  { id: "desk-6", name: "Bureau Pro B", room: "Zone Silencieuse", type: "dedicated", price: 45, status: "available", amenities: ["Bureau Assis-Debout", "Double Écran 27\"", "Chaise Ergo"] },
];

export default function CoworkingTestPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDesk, setSelectedDesk] = useState<any | null>(null);
  const [isBookingMode, setIsBookingMode] = useState(false);
  const [duration, setDuration] = useState("full-day"); // "half-day" ou "full-day"

  const returnHome = () => { window.location.href = "/"; };

  const handleDeskClick = (desk: any) => {
    if (desk.status === "occupied") return;
    setSelectedDesk(desk);
    setIsBookingMode(true);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-100 font-sans overflow-hidden relative">
      
      {/* HEADER PRINCIPAL */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between z-40 shrink-0 shadow-sm">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={returnHome}>
          <img src="/Logo-Home_noir.png" alt="Logo Home" className="h-6 object-contain group-hover:scale-105 transition-transform" />
          <div className="hidden lg:flex items-center space-x-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
             <Map size={14} className="text-gray-900" />
             <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 mt-0.5">
               Espace Coworking (BETA)
             </span>
          </div>
        </div>

        {/* CONTTRÔLEUR DE DATE CENTRAL */}
        <div className="flex-1 flex justify-center max-w-[260px] mx-auto absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center justify-between w-full bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
            <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 bg-gray-50 rounded-xl hover:bg-gray-200 border">
              <ChevronLeft size={16}/>
            </button>
            <div className="text-center px-2 truncate cursor-pointer hover:opacity-70">
               <span className="text-[13px] font-black capitalize truncate">
                  {format(currentDate, "EEE d MMM", { locale: fr }).replace('.', '')}
               </span>
            </div>
            <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 bg-gray-50 rounded-xl hover:bg-gray-200 border">
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>

        <div className="w-[100px] flex justify-end">
          {/* Espace vide pour équilibrer le header */}
        </div>
      </header>

      {/* CONTENU PRINCIPAL : LE PLAN INTERACTIF */}
      <main className="flex-1 overflow-auto relative p-4 lg:p-8 flex justify-center">
        
        {/* LE CANVAS DU PLAN (Style Blueprint/Grille de construction) */}
        <div className="w-full max-w-5xl bg-white rounded-[40px] border border-gray-200 shadow-xl overflow-hidden relative" 
             style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          
          <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-200 shadow-sm z-10">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">Plan du jour</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">Sélectionnez un poste libre</p>
          </div>

          <div className="p-12 pt-24 pb-24 h-full overflow-y-auto">
            
            {/* ZONE 1 : OPEN SPACE */}
            <div className="mb-16">
              <div className="border-b-2 border-gray-300 pb-2 mb-8 inline-block">
                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center">
                  <Coffee className="mr-3 text-amber-600" size={24}/> L'Open Space
                </h3>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
                {MOCK_DESKS.filter(d => d.room === "Open Space").map(desk => (
                  <DeskNode key={desk.id} desk={desk} isSelected={selectedDesk?.id === desk.id} onClick={() => handleDeskClick(desk)} />
                ))}
                {/* Table visuelle décorative au milieu (Façon architecture) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-12 bg-[#F4E5D2] rounded-full border-4 border-white shadow-inner opacity-40 pointer-events-none -z-10 hidden lg:block"></div>
              </div>
            </div>

            {/* ZONE 2 : BUREAUX SILENCIEUX */}
            <div>
              <div className="border-b-2 border-gray-300 pb-2 mb-8 inline-block">
                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center">
                  <Monitor className="mr-3 text-indigo-600" size={24}/> Zone Silencieuse
                </h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {MOCK_DESKS.filter(d => d.room === "Zone Silencieuse").map(desk => (
                  <DeskNode key={desk.id} desk={desk} isSelected={selectedDesk?.id === desk.id} onClick={() => handleDeskClick(desk)} isLarge />
                ))}
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* PANNEAU LATÉRAL DE RÉSERVATION (Façon Skedda) */}
      {isBookingMode && selectedDesk && (
        <>
          {/* Overlay sombre */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:hidden" onClick={() => setIsBookingMode(false)}></div>
          
          {/* Panneau */}
          <div className="fixed inset-y-0 right-0 w-full lg:w-[450px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.1)] z-50 transform transition-transform border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header du panneau */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                  {selectedDesk.room}
                </span>
                <h2 className="text-2xl font-black mt-2 text-gray-900">{selectedDesk.name}</h2>
              </div>
              <button onClick={() => setIsBookingMode(false)} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition shadow-sm">
                <X size={20}/>
              </button>
            </div>

            {/* Corps du panneau (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Équipements */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Équipements inclus</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDesk.amenities.map((am: string, i: number) => (
                    <span key={i} className="inline-flex items-center text-xs font-bold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">
                      <CheckCircle2 size={12} className="mr-1.5 text-green-600"/> {am}
                    </span>
                  ))}
                </div>
              </div>

              {/* Formulaire de réservation factice */}
              <div className="space-y-5 bg-gray-50 p-6 rounded-[24px] border border-gray-100">
                <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 mb-4">Détails de la demande</h4>
                
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Durée</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setDuration("half-day")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${duration === "half-day" ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                    >
                      Demi-journée
                    </button>
                    <button 
                      onClick={() => setDuration("full-day")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${duration === "full-day" ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                    >
                      Journée entière
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                    <input type="text" placeholder="John Doe" className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 font-medium outline-none focus:ring-2 focus:ring-black" />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400">Tarif estimé</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Payable sur place</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-gray-900">
                        {duration === "half-day" ? selectedDesk.price * 0.6 : selectedDesk.price} CHF
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CGV Spécifiques Coworking */}
              <div className="bg-[#F4E5D2]/50 p-4 rounded-xl border border-[#EADDCC] flex gap-3 items-start">
                <Info size={16} className="text-amber-800 shrink-0 mt-0.5"/>
                <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                  Toute demande de coworking est soumise à validation par l'administration. Un bureau silencieux implique le respect absolu des règles de bruit de l'espace.
                </p>
              </div>

            </div>

            {/* Pied du panneau : Bouton d'action */}
            <div className="p-6 border-t border-gray-100 shrink-0 bg-white">
              <button className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] transition-transform text-sm flex items-center justify-center">
                <CreditCard className="mr-2" size={18}/> Soumettre la demande
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// --- COMPOSANT : UN BUREAU SUR LE PLAN ---
function DeskNode({ desk, isSelected, onClick, isLarge = false }: { desk: any, isSelected: boolean, onClick: () => void, isLarge?: boolean }) {
  const isOccupied = desk.status === "occupied";
  
  return (
    <div 
      onClick={onClick}
      className={`
        relative group cursor-pointer transition-all duration-300 rounded-2xl border-2 flex flex-col justify-between
        ${isLarge ? 'h-40 p-6' : 'h-32 p-4'}
        ${isOccupied 
          ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed' 
          : isSelected 
            ? 'bg-indigo-50 border-indigo-600 shadow-[0_0_0_4px_rgba(79,70,229,0.1)] scale-105 z-10' 
            : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-lg'
        }
      `}
    >
      <div className="flex justify-between items-start">
        <span className={`font-black tracking-tight ${isLarge ? 'text-lg' : 'text-sm'} ${isOccupied ? 'text-gray-400' : 'text-gray-900'}`}>
          {desk.name}
        </span>
        <span className={`w-3 h-3 rounded-full ${isOccupied ? 'bg-red-400' : 'bg-green-400'} shadow-inner`}></span>
      </div>
      
      <div className="flex justify-between items-end mt-4">
        {/* Icones des aménagements (Affiche max 2 pour la lisibilité sur la carte) */}
        <div className="flex gap-1.5 text-gray-400">
          {desk.amenities.some((a:string) => a.includes("Wifi")) && <Wifi size={14} />}
          {desk.amenities.some((a:string) => a.includes("Écran")) && <Monitor size={14} />}
          {desk.amenities.some((a:string) => a.includes("Prises")) && <BatteryCharging size={14} />}
        </div>
        
        {!isOccupied && (
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 group-hover:bg-black group-hover:text-white transition-colors">
            dès {desk.price} CHF
          </span>
        )}
        {isOccupied && (
          <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
            Occupé
          </span>
        )}
      </div>
    </div>
  );
}