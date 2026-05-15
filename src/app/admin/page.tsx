"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { format, startOfDay, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Lock, LogOut, CheckCircle2, XCircle, Trash2, Edit, Save, 
  CalendarIcon, ChevronLeft, ChevronRight, X, AlertTriangle, Plus 
} from "lucide-react";
import Link from "next/link";

const ROOM_ORDER = [
  "Conférence 1", "Conférence 2", "Espace canapés", 
  "Social Stairs", "Bureaux", "Grande salle", "Enfance"
];

// GÉNÉRATEUR D'HORAIRES (Tranches de 15 min de 06:00 à 23:00)
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

const addMinutesToTimeStr = (timeStr: string, minsToAdd: number) => {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date(); 
  date.setHours(h, m + minsToAdd, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<'requests'|'blocks'|'content'>('requests');
  const [bookings, setBookings] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  
  // Multi-blocage state
  const [blockData, setBlockData] = useState({ 
    title: "Bloqué (Maintenance/Event)", 
    start_time: "08:00", 
    end_time: "12:00" 
  });
  const [selectedSpacesToBlock, setSelectedSpacesToBlock] = useState<string[]>([]);
  const [blockDate, setBlockDate] = useState(new Date());

  const [siteContent, setSiteContent] = useState({ intro_title: "", intro_paragraph: "", cgv_text: "" });
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const checkAuth = async () => {
    const { data } = await supabase.from('admin_auth').select('password').eq('id', 1).single();
    if (data && data.password === password) { 
      setIsAuthenticated(true); 
      localStorage.setItem('admin_auth', 'true'); 
    } else { 
      alert("Mot de passe incorrect"); 
    }
  };

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === 'true') setIsAuthenticated(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: bData } = await supabase.from("bookings").select("*, spaces(*)").order("start_time", { ascending: true });
    if (bData) setBookings(bData);
    
    const { data: sData } = await supabase.from("spaces").select("*");
    if (sData) {
      setSpaces(sData.sort((a, b) => (ROOM_ORDER.indexOf(a.name) === -1 ? 99 : ROOM_ORDER.indexOf(a.name)) - (ROOM_ORDER.indexOf(b.name) === -1 ? 99 : ROOM_ORDER.indexOf(b.name))));
    }
    
    const { data: cData } = await supabase.from("site_content").select("*").eq("id", 1).single();
    if (cData) setSiteContent(cData);
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

    if (error) { setErrorMessage("Le créneau chevauche une autre réservation validée."); return; }
    
    setSelectedBooking(null); setIsEditing(false); fetchData();
  };

  const updateStatus = async (id: string, status: 'confirmed' | 'rejected') => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    if (status === 'rejected') {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (!error) { fetchData(); setSelectedBooking(null); }
      return;
    }

    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) { setErrorMessage("Conflit d'horaire avec un autre événement."); return; }
    
    setSelectedBooking(null); fetchData();
  };

  const createMultiBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSpacesToBlock.length === 0) { 
      setErrorMessage("Veuillez sélectionner au moins une salle."); 
      return; 
    }

    const st = new Date(blockDate); const [sh, sm] = blockData.start_time.split(':'); st.setHours(parseInt(sh), parseInt(sm), 0);
    const et = new Date(blockDate); const [eh, em] = blockData.end_time.split(':'); et.setHours(parseInt(eh), parseInt(em), 0);

    if (st < new Date()) { setErrorMessage("Impossible de bloquer dans le passé."); return; }

    const blocksToInsert = selectedSpacesToBlock.map(spaceId => ({
      space_id: spaceId, 
      user_name: "ADMIN", 
      user_email: "admin@eglisehome.com", 
      reason: blockData.title, 
      status: 'confirmed', 
      start_time: st.toISOString(), 
      end_time: et.toISOString(), 
      is_block: true
    }));

    const { error } = await supabase.from("bookings").insert(blocksToInsert);
    if (error) { setErrorMessage("Certaines salles sélectionnées sont déjà réservées à ces heures."); return; }

    setBlockData({ title: "Bloqué (Maintenance/Event)", start_time: "08:00", end_time: "12:00" });
    setSelectedSpacesToBlock([]);
    alert("Bloquage réussi !");
    fetchData();
  };

  const toggleSpaceBlock = (spaceId: string) => {
    if (selectedSpacesToBlock.includes(spaceId)) {
      setSelectedSpacesToBlock(prev => prev.filter(id => id !== spaceId));
    } else {
      setSelectedSpacesToBlock(prev => [...prev, spaceId]);
    }
  };

  const saveContent = async () => {
    setIsSavingContent(true);
    await supabase.from("site_content").update(siteContent).eq("id", 1);
    setIsSavingContent(false); 
    alert("Contenu mis à jour !");
  };

  const deleteBooking = async (id: string) => {
    if (confirm("Supprimer ce blocage ou cette réservation ?")) {
      await supabase.from("bookings").delete().eq("id", id); 
      fetchData();
    }
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-gray-100">
        <div className="w-16 h-16 bg-black text-white rounded-2xl mx-auto flex items-center justify-center mb-6"><Lock size={28} /></div>
        <h1 className="text-2xl font-black uppercase mb-6">Accès Restreint</h1>
        <form onSubmit={(e) => { e.preventDefault(); checkAuth(); }}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full border rounded-xl p-4 bg-gray-50 mb-4 text-center font-bold tracking-widest focus:border-black outline-none transition-colors" />
          <button type="submit" className="w-full bg-black text-white font-black uppercase py-4 rounded-xl hover:bg-gray-800 transition">Déverrouiller</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-black">H</div><span className="font-black uppercase tracking-widest text-sm hidden sm:inline">Administration</span></div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'requests' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-black'}`}>Demandes</button>
          <button onClick={() => setActiveTab('blocks')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'blocks' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-black'}`}>Bloquer</button>
          <button onClick={() => setActiveTab('content')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'content' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-black'}`}>CMS</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-4">
        
        {/* ONGLET DEMANDES */}
        {activeTab === 'requests' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.filter(b => !b.is_block).map(b => (
              <div key={b.id} onClick={() => { setSelectedBooking(b); setIsEditing(false); setAdminMessage(""); }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-md text-[10px] font-black uppercase ${b.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{b.status === 'pending' ? 'En attente' : 'Validé'}</div>
                  <div className="text-right"><div className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(b.start_time), "d MMM", { locale: fr })}</div><div className="text-xs font-black text-gray-900">{format(new Date(b.start_time), "HH:mm")} - {format(new Date(b.end_time), "HH:mm")}</div></div>
                </div>
                <h3 className="font-black text-lg text-gray-900 truncate">{b.user_name}</h3>
                <div className="text-xs font-bold text-gray-500 mt-1 uppercase" style={{ color: b.spaces?.color }}>{b.spaces?.name}</div>
              </div>
            ))}
          </div>
        )}

        {/* ONGLET BLOQUER (MULTI-SALLES ET CHIPS) */}
        {activeTab === 'blocks' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2"><Lock size={20}/> Bloquer des créneaux</h2>
            <form onSubmit={createMultiBlock} className="space-y-6">
              
              <div className="flex items-center justify-between w-full sm:max-w-xs bg-gray-50 p-2 rounded-xl border border-gray-200">
                <button type="button" onClick={() => setBlockDate(subDays(blockDate, 1))} className="p-2 hover:bg-gray-200 rounded-lg"><ChevronLeft size={18}/></button>
                <span className="font-black capitalize text-sm">{format(blockDate, "EEEE d MMMM", { locale: fr })}</span>
                <button type="button" onClick={() => setBlockDate(addDays(blockDate, 1))} className="p-2 hover:bg-gray-200 rounded-lg"><ChevronRight size={18}/></button>
              </div>

              {/* HAUTEURS ALIGNÉES h-[52px] */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Titre (Motif)</label>
                  <input type="text" required value={blockData.title} onChange={e => setBlockData({...blockData, title: e.target.value})} className="w-full h-[52px] border rounded-xl px-4 bg-gray-50 font-bold" />
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Début</label>
                    <select value={blockData.start_time} onChange={e => setBlockData({...blockData, start_time: e.target.value, end_time: addMinutesToTimeStr(e.target.value, 15)})} className="w-full h-[52px] border rounded-xl px-4 bg-gray-50 font-bold cursor-pointer">
                      {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Fin</label>
                    <select value={blockData.end_time} onChange={e => setBlockData({...blockData, end_time: e.target.value})} className="w-full h-[52px] border rounded-xl px-4 bg-gray-50 font-bold cursor-pointer">
                      {generateTimeOptions(blockData.start_time, true).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* MULTI-SÉLECTION AVEC CHIPS */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block">Salles à bloquer simultanément</label>
                <div className="flex flex-wrap gap-2">
                  {spaces.map(space => {
                    const isSelected = selectedSpacesToBlock.includes(space.id);
                    return (
                      <button 
                        key={space.id} type="button" onClick={() => toggleSpaceBlock(space.id)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors border ${isSelected ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      >
                        {isSelected && <CheckCircle2 size={14} className="inline mr-1" />} {space.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button type="submit" className="bg-black text-white px-8 h-[52px] rounded-xl font-black uppercase text-xs w-full sm:w-auto hover:bg-gray-800 transition-colors">
                Bloquer les salles
              </button>
            </form>

            <div className="mt-12">
              <h3 className="text-xs font-black text-gray-400 uppercase mb-4">Créneaux bloqués récemment</h3>
              <div className="space-y-2">
                {bookings.filter(b => b.is_block).map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <div className="font-bold text-sm">{b.reason}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase">{format(new Date(b.start_time), "d MMM")} • {format(new Date(b.start_time), "HH:mm")} - {format(new Date(b.end_time), "HH:mm")} • <span style={{color: b.spaces?.color}}>{b.spaces?.name}</span></div>
                    </div>
                    <button onClick={() => deleteBooking(b.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ONGLET CMS */}
        {activeTab === 'content' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 space-y-6">
            <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2"><Edit size={20}/> Textes du site</h2>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Titre Introduction Accueil</label>
              <input type="text" value={siteContent.intro_title} onChange={e => setSiteContent({...siteContent, intro_title: e.target.value})} className="w-full border rounded-xl p-4 bg-gray-50 font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Texte Introduction Accueil</label>
              <textarea value={siteContent.intro_paragraph} onChange={e => setSiteContent({...siteContent, intro_paragraph: e.target.value})} className="w-full border rounded-xl p-4 bg-gray-50 font-medium h-32" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Règles & Conditions (Pour rappel E-mail)</label>
              <textarea value={siteContent.cgv_text} onChange={e => setSiteContent({...siteContent, cgv_text: e.target.value})} className="w-full border rounded-xl p-4 bg-gray-50 font-medium h-48" />
            </div>
            <button onClick={saveContent} disabled={isSavingContent} className="bg-black text-white px-8 py-4 rounded-xl font-black uppercase text-xs flex items-center gap-2 hover:bg-gray-800 transition-colors">
              {isSavingContent ? 'Enregistrement...' : <><Save size={16}/> Enregistrer</>}
            </button>
          </div>
        )}
      </main>

      {/* MODAL DÉTAILS DEMANDE & MODIFICATION */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="font-black uppercase text-lg">Détails</h2>
              <button onClick={() => setSelectedBooking(null)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-6">
              
              {!isEditing ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase">Demandeur</div>
                      <div className="font-black text-xl">{selectedBooking.user_name}</div>
                      <div className="text-sm font-medium text-gray-500">{selectedBooking.user_email} • {selectedBooking.user_phone}</div>
                    </div>
                    <button onClick={() => { 
                      setEditData({ 
                        ...selectedBooking, 
                        start_time: format(new Date(selectedBooking.start_time), "HH:mm"), 
                        end_time: format(new Date(selectedBooking.end_time), "HH:mm") 
                      }); 
                      setIsEditing(true); 
                    }} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <Edit size={16}/>
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Espace & Horaire</div>
                    <div className="font-bold text-sm" style={{color: selectedBooking.spaces?.color}}>{selectedBooking.spaces?.name}</div>
                    <div className="font-bold text-sm text-gray-900">{format(new Date(selectedBooking.start_time), "EEEE d MMMM", { locale: fr })}</div>
                    <div className="font-black text-lg">{format(new Date(selectedBooking.start_time), "HH:mm")} - {format(new Date(selectedBooking.end_time), "HH:mm")}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Motif</div>
                    <p className="bg-gray-50 p-4 rounded-xl font-medium text-sm text-gray-700 whitespace-pre-wrap">{selectedBooking.reason}</p>
                  </div>
                  
                  {selectedBooking.status === 'pending' && (
                    <div className="border-t pt-6">
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Note à ajouter à l'e-mail (Optionnel)</label>
                      <textarea value={adminMessage} onChange={e => setAdminMessage(e.target.value)} placeholder="Ex: N'oublie pas les clés..." className="w-full border rounded-xl p-3 bg-gray-50 text-sm h-20 mb-4" />
                      <div className="flex gap-3">
                        <button onClick={() => updateStatus(selectedBooking.id, 'confirmed')} className="flex-1 bg-green-500 hover:bg-green-600 transition-colors text-white font-black uppercase py-4 rounded-xl flex items-center justify-center gap-2"><CheckCircle2 size={18}/> Valider</button>
                        <button onClick={() => updateStatus(selectedBooking.id, 'rejected')} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-black uppercase py-4 rounded-xl flex items-center justify-center gap-2 border border-red-200"><XCircle size={18}/> Refuser</button>
                      </div>
                    </div>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <div className="border-t pt-6 text-center">
                      <button onClick={() => deleteBooking(selectedBooking.id)} className="text-red-500 text-xs font-bold uppercase underline">Annuler et supprimer cette réservation</button>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleEditSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Début</label>
                      <select value={editData.start_time} onChange={e => setEditData({...editData, start_time: e.target.value, end_time: addMinutesToTimeStr(e.target.value, 15)})} className="w-full h-[52px] border rounded-xl px-4 bg-gray-50 font-bold cursor-pointer">
                        {generateTimeOptions("06:00", false).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Fin</label>
                      <select value={editData.end_time} onChange={e => setEditData({...editData, end_time: e.target.value})} className="w-full h-[52px] border rounded-xl px-4 bg-gray-50 font-bold cursor-pointer">
                        {generateTimeOptions(editData.start_time, true).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Espace</label>
                    <select value={editData.space_id} onChange={e => setEditData({...editData, space_id: e.target.value})} className="w-full h-[52px] border rounded-xl px-4 bg-gray-50 font-bold cursor-pointer">
                      {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Motif</label>
                    <textarea value={editData.reason} onChange={e => setEditData({...editData, reason: e.target.value})} className="w-full border rounded-xl p-4 bg-gray-50 font-medium h-24" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 transition-colors font-black uppercase py-4 rounded-xl text-xs">Annuler</button>
                    <button type="submit" className="flex-1 bg-black text-white hover:bg-gray-800 transition-colors font-black uppercase py-4 rounded-xl text-xs flex items-center justify-center gap-2"><Save size={16}/> Enregistrer</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4" onClick={() => setErrorMessage("")}>
          <div className="bg-white p-8 rounded-3xl text-center max-w-sm">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle/></div>
            <h2 className="font-black uppercase mb-2">Erreur</h2>
            <p className="text-sm text-gray-500">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}