"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ShieldCheck, LogOut, LayoutTemplate, FileText, Save, CheckCircle2, UploadCloud, X, DoorOpen, PlusCircle, Trash2, Home, Calendar } from "lucide-react";

const ADMIN_WHITELIST = [
  "jonasdellomo@gmail.com", "jonas@eglisehome.com", "nadege@eglisehome.com", 
  "sabine@eglisehome.com", "yves@eglisehome.com", "christine@eglisehome.com", "mathilde@eglisehome.com"
];

const ROOM_ORDER = ["Conférence 1", "Conférence 2", "Social Stairs", "Bureaux", "Grande salle", "Enfance", "Espace canapés"];

const DEFAULT_FAQS = [
  { question: "Une fois ma demande envoyée, que se passe-t-il ?", answer: "Votre demande est mise 'en attente'. Vous recevrez ensuite un e-mail confirmant la validation ou vous proposant une alternative." },
  { question: "Puis-je annuler ou modifier ma réservation ?", answer: "Oui ! Dans chaque e-mail, un lien direct vous permet d'annuler votre réservation en un clic." },
  { question: "Est-ce gratuit ?", answer: "Gratuit pour les activités liées aux programmes officiels de Home. Pour tout autre événement, des frais de location peuvent s'appliquer." }
];

export default function EditeurPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // NOUVEAU SYSTÈME D'ONGLETS
  const [activeTab, setActiveTab] = useState("accueil"); 
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingSpaceId, setUploadingSpaceId] = useState<string | null>(null);

  const [content, setContent] = useState({ 
    intro_title: "", intro_paragraph: "", cgv_text: "",
    landing_title: "", block1_title: "", block1_text: "", block2_title: "", block2_text: "", block3_title: "", block3_text: "",
    ext_event_title: "", ext_event_text: "", ext_btn_text: "", ext_btn_link: "",
    faq_json: [] as { question: string, answer: string }[]
  });
  
  const [spaces, setSpaces] = useState<any[]>([]);

  useEffect(() => {
    const getSession = async () => { const { data: { session } } = await supabase.auth.getSession(); handleAuth(session?.user || null); };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => handleAuth(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = (user: any) => {
    if (user && ADMIN_WHITELIST.includes(user.email!)) { setUser(user); fetchData(); } 
    else if (user) { supabase.auth.signOut(); alert("Accès refusé."); } 
    else { setUser(null); }
    setLoading(false);
  };

  const fetchData = async () => {
    const { data: contentData } = await supabase.from("site_content").select("*").eq("id", 1).single();
    if (contentData) {
      // ON INJECTE LES DEFAULTS SI LE CHAMP EST VIDE DANS LA BDD
      setContent({
        intro_title: contentData.intro_title || "",
        intro_paragraph: contentData.intro_paragraph || "",
        cgv_text: contentData.cgv_text || "",
        landing_title: contentData.landing_title || "La plateforme de réservation des espaces de l'église, réservée à la communauté Home Lausanne.",
        block1_title: contentData.block1_title || "Pour la commu",
        block1_text: contentData.block1_text || "Leaders, équipes, groupes de maison...",
        block2_title: contentData.block2_title || "Nos activités",
        block2_text: contentData.block2_text || "Sisterhood, louange, réunions, 313...",
        block3_title: contentData.block3_title || "Validation",
        block3_text: contentData.block3_text || "Soumis à l'accord de l'administration.",
        ext_event_title: contentData.ext_event_title || "Un événement externe ?",
        ext_event_text: contentData.ext_event_text || "Les demandes hors programme peuvent engendrer des frais. Écrivez-nous pour nous présenter votre projet.",
        ext_btn_text: contentData.ext_btn_text || "Contacter Sabine",
        ext_btn_link: contentData.ext_btn_link || "mailto:sabine@eglisehome.com",
        faq_json: contentData.faq_json && contentData.faq_json.length > 0 ? contentData.faq_json : DEFAULT_FAQS
      });
    }

    const { data: spacesData } = await supabase.from("spaces").select("*");
    if (spacesData) {
      const sorted = spacesData.sort((a, b) => {
        let indexA = ROOM_ORDER.indexOf(a.name); let indexB = ROOM_ORDER.indexOf(b.name);
        if (indexA === -1) indexA = 99; if (indexB === -1) indexB = 99;
        return indexA - indexB;
      });
      setSpaces(sorted);
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("site_content").update({
      intro_title: content.intro_title, intro_paragraph: content.intro_paragraph, cgv_text: content.cgv_text,
      landing_title: content.landing_title, block1_title: content.block1_title, block1_text: content.block1_text,
      block2_title: content.block2_title, block2_text: content.block2_text, block3_title: content.block3_title, block3_text: content.block3_text,
      ext_event_title: content.ext_event_title, ext_event_text: content.ext_event_text, ext_btn_text: content.ext_btn_text, ext_btn_link: content.ext_btn_link,
      faq_json: content.faq_json
    }).eq("id", 1);
    if (!error) triggerSuccess(); else alert("Erreur de sauvegarde : " + error.message);
  };

  const handleSaveSpace = async (space: any) => {
    const { error } = await supabase.from("spaces").update({ name: space.name, capacity: space.capacity, description: space.description, color: space.color, image_url: space.image_url }).eq("id", space.id);
    if (!error) triggerSuccess(); else alert("Erreur : " + error.message);
  };

  const triggerSuccess = () => { setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2500); };
  const updateSpaceState = (id: string, field: string, value: any) => { setSpaces(spaces.map(s => s.id === id ? { ...s, [field]: value } : s)); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, spaceId: string, currentUrls: string) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploadingSpaceId(spaceId);
    try {
      const newPublicUrls: string[] = [];
      const existingUrls = currentUrls ? currentUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i]; const fileName = `${spaceId}-${Date.now()}-${i}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('room-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('room-images').getPublicUrl(fileName);
        newPublicUrls.push(publicUrl);
      }
      updateSpaceState(spaceId, 'image_url', [...existingUrls, ...newPublicUrls].join(', '));
    } catch (error: any) { alert("Erreur d'envoi : " + error.message); } 
    finally { setUploadingSpaceId(null); e.target.value = ''; }
  };

  const handleRemoveImage = (spaceId: string, currentUrls: string, urlToRemove: string) => {
    if (!confirm("Voulez-vous retirer cette image ?")) return;
    updateSpaceState(spaceId, 'image_url', currentUrls.split(',').map(u => u.trim()).filter(Boolean).filter(u => u !== urlToRemove).join(', '));
  };

  const addFaqItem = () => setContent({ ...content, faq_json: [...content.faq_json, { question: "", answer: "" }] });
  const updateFaqItem = (index: number, field: 'question' | 'answer', value: string) => { const newFaq = [...content.faq_json]; newFaq[index][field] = value; setContent({ ...content, faq_json: newFaq }); };
  const removeFaqItem = (index: number) => { const newFaq = [...content.faq_json]; newFaq.splice(index, 1); setContent({ ...content, faq_json: newFaq }); };
  const returnHome = () => { window.location.href = "/"; };

  if (loading) return null;
  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-200 max-w-md w-full text-center font-sans"><ShieldCheck className="w-16 h-16 mx-auto mb-6 text-indigo-600" /><h1 className="text-3xl font-black mb-2 text-gray-900">Mode Éditeur</h1><button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/editeur' }})} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold mt-6">Connexion Administrateur</button></div></div>
  );

  return (
    <div className="flex h-[100dvh] bg-gray-50 font-sans overflow-hidden">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 shrink-0 hidden md:flex">
        <div className="p-8 border-b border-gray-100 flex flex-col items-center justify-center gap-5">
          <div onClick={returnHome} className="cursor-pointer group"><img src="/Logo-Home_noir.png" className="h-7 object-contain group-hover:scale-105 transition-transform" /></div>
          <div className="inline-flex flex-col items-center bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg w-max"><div className="flex items-center space-x-2"><DoorOpen size={14} className="text-gray-900" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-700 mt-0.5">Réservation</span></div><span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mt-1">Éditeur</span></div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col gap-2 overflow-y-auto">
          <button onClick={() => setActiveTab("accueil")} className={`flex items-center p-4 rounded-2xl font-bold transition-all ${activeTab === "accueil" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-gray-500 hover:bg-gray-100"}`}><Home size={20} className="mr-4" /> Accueil & FAQ</button>
          <button onClick={() => setActiveTab("calendrier")} className={`flex items-center p-4 rounded-2xl font-bold transition-all ${activeTab === "calendrier" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-gray-500 hover:bg-gray-100"}`}><Calendar size={20} className="mr-4" /> Calendrier & CGV</button>
          <button onClick={() => setActiveTab("espaces")} className={`flex items-center p-4 rounded-2xl font-bold transition-all ${activeTab === "espaces" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-gray-500 hover:bg-gray-100"}`}><LayoutTemplate size={20} className="mr-4" /> Les Salles</button>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50"><button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center p-4 rounded-2xl font-bold text-red-600 hover:bg-red-50"><LogOut size={20} className="mr-3" /> Déconnexion</button></div>
      </aside>

      {/* ZONE DE CONTENU PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="md:hidden bg-white px-4 py-3 border-b flex justify-between items-center sticky top-0 z-20 shadow-sm shrink-0 overflow-x-auto gap-2">
          <button onClick={() => setActiveTab("accueil")} className={`shrink-0 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors ${activeTab === "accueil" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100"}`}>Accueil & FAQ</button>
          <button onClick={() => setActiveTab("calendrier")} className={`shrink-0 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors ${activeTab === "calendrier" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100"}`}>Calendrier & CGV</button>
          <button onClick={() => setActiveTab("espaces")} className={`shrink-0 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors ${activeTab === "espaces" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100"}`}>Salles</button>
        </div>

        <div className="max-w-4xl mx-auto p-4 md:p-10">
          
          {/* ONGLET 1 : ACCUEIL & FAQ */}
          {activeTab === "accueil" && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-3xl font-black mb-8 text-gray-900 flex items-center tracking-tight"><Home className="mr-4 text-indigo-500 w-8 h-8"/> Accueil & FAQ</h2>
              <form onSubmit={handleSaveContent} className="space-y-8">
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-200">
                  <h3 className="font-black uppercase text-xs tracking-widest text-indigo-500 mb-6 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">1</span> En-tête principal
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Sous-titre explicatif</label>
                    <input type="text" value={content.landing_title} onChange={(e) => setContent({...content, landing_title: e.target.value})} className="w-full border rounded-xl p-4 bg-gray-50 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="border p-4 rounded-xl bg-gray-50"><h4 className="font-bold text-xs mb-3 flex items-center"><span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-2 text-[8px]">1</span> Bloc Gauche</h4><input type="text" value={content.block1_title} onChange={(e) => setContent({...content, block1_title: e.target.value})} className="w-full mb-2 border rounded-lg p-2 text-xs outline-none" /><textarea value={content.block1_text} onChange={(e) => setContent({...content, block1_text: e.target.value})} className="w-full border rounded-lg p-2 text-xs outline-none h-16 resize-none" /></div>
                    <div className="border p-4 rounded-xl bg-gray-50"><h4 className="font-bold text-xs mb-3 flex items-center"><span className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mr-2 text-[8px]">2</span> Bloc Milieu</h4><input type="text" value={content.block2_title} onChange={(e) => setContent({...content, block2_title: e.target.value})} className="w-full mb-2 border rounded-lg p-2 text-xs outline-none" /><textarea value={content.block2_text} onChange={(e) => setContent({...content, block2_text: e.target.value})} className="w-full border rounded-lg p-2 text-xs outline-none h-16 resize-none" /></div>
                    <div className="border p-4 rounded-xl bg-gray-50"><h4 className="font-bold text-xs mb-3 flex items-center"><span className="w-4 h-4 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mr-2 text-[8px]">3</span> Bloc Droite</h4><input type="text" value={content.block3_title} onChange={(e) => setContent({...content, block3_title: e.target.value})} className="w-full mb-2 border rounded-lg p-2 text-xs outline-none" /><textarea value={content.block3_text} onChange={(e) => setContent({...content, block3_text: e.target.value})} className="w-full border rounded-lg p-2 text-xs outline-none h-16 resize-none" /></div>
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-200">
                  <h3 className="font-black uppercase text-xs tracking-widest text-indigo-500 mb-6 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">2</span> Événement externe (Bandeau noir)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-700 mb-2">Titre du bloc</label><input type="text" value={content.ext_event_title} onChange={(e) => setContent({...content, ext_event_title: e.target.value})} className="w-full border rounded-xl p-3 bg-gray-50 font-bold" /></div>
                    <div><label className="block text-xs font-bold text-gray-700 mb-2">Bouton (Texte)</label><input type="text" value={content.ext_btn_text} onChange={(e) => setContent({...content, ext_btn_text: e.target.value})} className="w-full border rounded-xl p-3 bg-gray-50 font-medium" /></div>
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-700 mb-2">Explication</label><textarea value={content.ext_event_text} onChange={(e) => setContent({...content, ext_event_text: e.target.value})} className="w-full border rounded-xl p-3 bg-gray-50 font-medium h-20 resize-none" /></div>
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-700 mb-2">Bouton (Lien Email / URL)</label><input type="text" value={content.ext_btn_link} onChange={(e) => setContent({...content, ext_btn_link: e.target.value})} className="w-full border rounded-xl p-3 bg-gray-50 font-medium text-blue-600" /></div>
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-200">
                  <h3 className="font-black uppercase text-xs tracking-widest text-indigo-500 mb-6 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">3</span> Foire Aux Questions (FAQ)
                  </h3>
                  <div className="space-y-4">
                    {content.faq_json.map((faq, index) => (
                      <div key={index} className="flex flex-col md:flex-row gap-3 items-start border border-gray-200 p-4 rounded-xl bg-gray-50">
                        <div className="flex-1 w-full space-y-3">
                          <input type="text" value={faq.question} onChange={(e) => updateFaqItem(index, 'question', e.target.value)} placeholder="Question" className="w-full border rounded-lg p-3 text-sm font-bold" />
                          <textarea value={faq.answer} onChange={(e) => updateFaqItem(index, 'answer', e.target.value)} placeholder="Réponse" className="w-full border rounded-lg p-3 text-sm font-medium h-20 resize-none" />
                        </div>
                        <button type="button" onClick={() => removeFaqItem(index)} className="bg-white border text-red-500 p-3 rounded-xl hover:bg-red-50"><Trash2 size={20} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={addFaqItem} className="w-full border-2 border-dashed border-gray-300 text-gray-500 py-4 rounded-xl font-bold flex items-center justify-center hover:bg-gray-50 text-sm"><PlusCircle size={18} className="mr-2" /> Ajouter une question</button>
                  </div>
                </div>

                <button type="submit" className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl sticky bottom-4 z-30 hover:scale-[1.02] transition"><Save size={20} className="mr-3 inline" /> Enregistrer Accueil & FAQ</button>
              </form>
            </div>
          )}

          {/* ONGLET 2 : CALENDRIER & CGV */}
          {activeTab === "calendrier" && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-3xl font-black mb-8 text-gray-900 flex items-center tracking-tight"><Calendar className="mr-4 text-indigo-500 w-8 h-8"/> Calendrier & CGV</h2>
              <form onSubmit={handleSaveContent} className="space-y-8">
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-200">
                  <h3 className="font-black uppercase text-xs tracking-widest text-indigo-500 mb-6 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">1</span> Bloc Info du Calendrier
                  </h3>
                  <div className="space-y-6">
                    <div><label className="block text-xs font-bold text-gray-700 mb-2">Titre du bloc</label><input type="text" value={content.intro_title} onChange={(e) => setContent({...content, intro_title: e.target.value})} className="w-full border rounded-xl p-4 bg-gray-50 font-bold outline-none" /></div>
                    <div><label className="block text-xs font-bold text-gray-700 mb-2">Texte d'explication</label><textarea value={content.intro_paragraph} onChange={(e) => setContent({...content, intro_paragraph: e.target.value})} className="w-full border rounded-xl p-4 bg-gray-50 font-medium h-32 resize-none" /></div>
                  </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-200">
                  <h3 className="font-black uppercase text-xs tracking-widest text-indigo-500 mb-6 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">2</span> Conditions Générales
                  </h3>
                  <textarea required value={content.cgv_text} onChange={(e) => setContent({...content, cgv_text: e.target.value})} className="w-full border rounded-xl p-4 bg-gray-50 font-medium h-80 resize-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl sticky bottom-4 z-30 hover:scale-[1.02] transition"><Save size={20} className="mr-3 inline" /> Enregistrer Calendrier & CGV</button>
              </form>
            </div>
          )}

          {/* ONGLET 3 : SALLES */}
          {activeTab === "espaces" && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-3xl font-black mb-8 text-gray-900 flex items-center tracking-tight"><LayoutTemplate className="mr-4 text-indigo-500 w-8 h-8"/> Gérer les Salles</h2>
              <div className="space-y-8">
                {spaces.map(space => (
                  <div key={space.id} className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-2" style={{backgroundColor: space.color}}></div>
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 border-b pb-6 gap-4">
                       <h3 className="text-2xl font-black uppercase tracking-tight" style={{color: space.color}}>{space.name}</h3>
                       <button onClick={() => handleSaveSpace(space)} className="bg-gray-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center hover:bg-indigo-600"><Save size={16} className="mr-2" /> Enregistrer</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-5">
                        <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-2">Nom de la salle</label><input type="text" value={space.name} onChange={(e) => updateSpaceState(space.id, 'name', e.target.value)} className="w-full border rounded-xl p-3 bg-gray-50 font-bold" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-2">Capacité</label><input type="number" value={space.capacity} onChange={(e) => updateSpaceState(space.id, 'capacity', e.target.value)} className="w-full border rounded-xl p-3 bg-gray-50 font-bold" /></div>
                          <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-2">Couleur</label><div className="flex items-center space-x-2 border rounded-xl p-1 bg-gray-50"><input type="color" value={space.color} onChange={(e) => updateSpaceState(space.id, 'color', e.target.value)} className="h-10 w-10 cursor-pointer" /><input type="text" value={space.color} onChange={(e) => updateSpaceState(space.id, 'color', e.target.value)} className="w-full bg-transparent font-bold text-sm uppercase px-2" /></div></div>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black text-gray-400 mb-2">Photos</label>
                          <div className="mt-2 border-2 border-dashed rounded-2xl p-6 text-center relative hover:bg-gray-50 bg-white"><UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" /><p className="text-xs text-gray-500 font-bold">Glissez vos images ici</p><input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, space.id, space.image_url || "")} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploadingSpaceId === space.id} />{uploadingSpaceId === space.id && <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-2xl z-10"><UploadCloud className="w-6 h-6 text-indigo-600 animate-bounce mb-2" /><span className="text-sm font-black text-indigo-600 uppercase">Envoi...</span></div>}</div>
                          {space.image_url && <div className="flex gap-3 mt-4 overflow-x-auto pb-2">{space.image_url.split(',').map((url: string) => url.trim()).filter(Boolean).map((url: string, idx: number) => (<div key={idx} className="relative w-24 h-24 shrink-0 group/image rounded-xl overflow-hidden border"><img src={url} className="w-full h-full object-cover" /><button type="button" onClick={() => handleRemoveImage(space.id, space.image_url, url)} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover/image:opacity-100 hover:bg-red-600"><X size={12}/></button></div>))}</div>}
                        </div>
                      </div>
                      <div className="flex flex-col"><label className="block text-[10px] uppercase font-black text-gray-400 mb-2">Description</label><textarea value={space.description || ""} onChange={(e) => updateSpaceState(space.id, 'description', e.target.value)} className="w-full border rounded-xl p-4 bg-gray-50 font-medium h-full min-h-[250px] resize-none" placeholder="Description de la salle..." /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {showSuccess && <div className="fixed bottom-8 right-8 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center font-bold animate-in slide-in-from-bottom-5"><CheckCircle2 className="text-green-400 mr-3 w-6 h-6" /> Enregistré avec succès !</div>}
    </div>
  );
}