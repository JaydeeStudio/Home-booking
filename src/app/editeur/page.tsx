"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  ShieldCheck, 
  LogOut, 
  LayoutTemplate, 
  FileText, 
  Save, 
  CheckCircle2, 
  UploadCloud, 
  X, 
  DoorOpen, 
  Plus, 
  Trash2 
} from "lucide-react";

const ADMIN_WHITELIST = [
  "jonasdellomo@gmail.com", 
  "jonas@eglisehome.com", 
  "nadege@eglisehome.com", 
  "sabine@eglisehome.com", 
  "yves@eglisehome.com", 
  "christine@eglisehome.com", 
  "mathilde@eglisehome.com"
];

const ROOM_ORDER = [
  "Conférence 1", 
  "Conférence 2", 
  "Social Stairs", 
  "Bureaux", 
  "Grande salle", 
  "Enfance", 
  "Espace canapés"
];

export default function EditeurPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState("textes");
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingSpaceId, setUploadingSpaceId] = useState<string | null>(null);

  const [content, setContent] = useState<any>({ 
    intro_title: "", 
    intro_paragraph: "", 
    cgv_text: "", 
    landing_title: "", 
    block1_title: "", 
    block1_text: "", 
    block2_title: "", 
    block2_text: "", 
    block3_title: "", 
    block3_text: "", 
    faq_json: [] 
  });
  
  const [spaces, setSpaces] = useState<any[]>([]);

  useEffect(() => {
    const getSession = async () => { 
      const { data: { session } } = await supabase.auth.getSession(); 
      handleAuth(session?.user || null); 
    };
    
    getSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuth(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = (user: any) => {
    if (user && ADMIN_WHITELIST.includes(user.email!)) { 
      setUser(user); 
      fetchData(); 
    } else if (user) { 
      supabase.auth.signOut(); 
      alert("Accès refusé. Cette adresse e-mail n'est pas autorisée."); 
    } else { 
      setUser(null); 
    }
    setLoading(false);
  };

  const fetchData = async () => {
    const { data: contentData } = await supabase.from("site_content").select("*").eq("id", 1).single();
    if (contentData) {
      if (!contentData.faq_json) contentData.faq_json = [];
      setContent(contentData);
    }

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
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("site_content").update(content).eq("id", 1);
    
    if (!error) {
      triggerSuccess();
    } else {
      alert("Erreur de sauvegarde : " + error.message);
    }
  };

  const handleSaveSpace = async (space: any) => {
    const { error } = await supabase.from("spaces").update({ 
      name: space.name, 
      capacity: space.capacity, 
      description: space.description, 
      color: space.color, 
      image_url: space.image_url 
    }).eq("id", space.id);
    
    if (!error) {
      triggerSuccess();
    } else {
      alert("Erreur de sauvegarde : " + error.message);
    }
  };

  const triggerSuccess = () => { 
    setShowSuccess(true); 
    setTimeout(() => setShowSuccess(false), 2500); 
  };
  
  const updateSpaceState = (id: string, field: string, value: any) => { 
    setSpaces(spaces.map(s => s.id === id ? { ...s, [field]: value } : s)); 
  };

  // GESTION DE LA FAQ
  const addFaq = () => { 
    setContent({ 
      ...content, 
      faq_json: [...content.faq_json, { question: "", answer: "" }] 
    }); 
  };
  
  const updateFaq = (index: number, field: string, value: string) => { 
    const newFaq = [...content.faq_json]; 
    newFaq[index][field] = value; 
    setContent({ ...content, faq_json: newFaq }); 
  };
  
  const removeFaq = (index: number) => { 
    const newFaq = [...content.faq_json]; 
    newFaq.splice(index, 1); 
    setContent({ ...content, faq_json: newFaq }); 
  };

  // GESTION DES IMAGES
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, spaceId: string, currentUrls: string) => {
    const files = e.target.files; 
    if (!files || files.length === 0) return;
    
    setUploadingSpaceId(spaceId);
    
    try {
      const newPublicUrls: string[] = []; 
      const existingUrls = currentUrls ? currentUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]; 
        const fileExt = file.name.split('.').pop();
        const fileName = `${spaceId}-${Date.now()}-${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('room-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('room-images').getPublicUrl(fileName);
        newPublicUrls.push(publicUrl);
      }
      
      updateSpaceState(spaceId, 'image_url', [...existingUrls, ...newPublicUrls].join(', '));
      
    } catch (error: any) { 
      alert("Erreur lors de l'envoi des images : " + error.message); 
    } finally { 
      setUploadingSpaceId(null); 
      e.target.value = ''; 
    }
  };

  const handleRemoveImage = (spaceId: string, currentUrls: string, urlToRemove: string) => {
    if (!confirm("Voulez-vous vraiment retirer cette image ?")) return;
    
    const newUrlsArray = currentUrls.split(',').map(u => u.trim()).filter(Boolean).filter(u => u !== urlToRemove);
    updateSpaceState(spaceId, 'image_url', newUrlsArray.join(', '));
  };

  const returnHome = () => { 
    window.location.href = "/"; 
  };

  if (loading) return null;
  
  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-200 max-w-md w-full text-center">
        <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-indigo-600" />
        <h1 className="text-3xl font-black mb-2 text-gray-900">Mode Éditeur</h1>
        <p className="text-gray-500 mb-8 font-medium">
          Connectez-vous avec votre adresse e-mail administrateur.
        </p>
        <button 
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/editeur' }})} 
          className="w-full bg-indigo-600 text-white font-black uppercase py-4 rounded-2xl flex items-center justify-center hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-600/20"
        >
          Connexion Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] bg-gray-50 font-sans overflow-hidden">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 shrink-0 hidden md:flex">
        <div className="p-8 border-b border-gray-100 flex flex-col items-center justify-center gap-5">
          <div onClick={returnHome} className="cursor-pointer group hover:scale-105 transition-transform">
            <img src="/Logo-Home_noir.png" alt="Logo Home" className="h-7 object-contain" />
          </div>
          <div className="inline-flex flex-col items-center justify-center bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg w-max">
            <div className="flex items-center space-x-2">
              <DoorOpen size={14} className="text-gray-900" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 mt-0.5">Spaces</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mt-1">Éditeur</span>
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col gap-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab("textes")} 
            className={`flex items-center p-4 rounded-2xl font-bold transition-all ${activeTab === "textes" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
          >
            <FileText size={20} className="mr-4" /> Textes & Accueil
          </button>
          <button 
            onClick={() => setActiveTab("espaces")} 
            className={`flex items-center p-4 rounded-2xl font-bold transition-all ${activeTab === "espaces" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
          >
            <LayoutTemplate size={20} className="mr-4" /> Les Salles
          </button>
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="w-full flex items-center justify-center p-4 rounded-2xl font-bold text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut size={20} className="mr-3" /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        
        {/* En-tête mobile */}
        <div className="md:hidden bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div onClick={returnHome} className="cursor-pointer shrink-0">
              <img src="/Logo-Home_noir.png" alt="Logo Home" className="h-5 object-contain" />
            </div>
            <div className="w-[1px] h-6 bg-gray-300 shrink-0"></div>
            <div className="flex flex-col justify-center items-center shrink-0">
              <div className="flex items-center space-x-1.5">
                <DoorOpen size={14} className="text-gray-900" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 mt-0.5 truncate">Spaces</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500 mt-0.5">Éditeur</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab("textes")} 
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === "textes" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}
            >
              Textes
            </button>
            <button 
              onClick={() => setActiveTab("espaces")} 
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === "espaces" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}
            >
              Salles
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 md:p-10">
          
          {/* ONGLET 1 : TEXTES ET ACCUEIL */}
          {activeTab === "textes" && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-3xl font-black mb-8 text-gray-900 flex items-center tracking-tight">
                <FileText className="mr-4 text-indigo-500 w-8 h-8"/> Textes du site public
              </h2>
              
              <form onSubmit={handleSaveContent} className="space-y-8">
                
                {/* BLOC 1 : LANDING PAGE */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-200 space-y-6">
                  <h3 className="font-black uppercase text-xs tracking-widest text-indigo-500 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">1</span> 
                    La Page d'Accueil (Landing Page)
                  </h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Titre sous le grand H</label>
                    <input 
                      type="text" 
                      value={content.landing_title} 
                      onChange={(e) => setContent({...content, landing_title: e.target.value})} 
                      className="w-full border rounded-xl p-4 bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border p-4 rounded-xl bg-gray-50">
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Bloc 1 (Bleu) - Titre</label>
                      <input 
                        type="text" 
                        value={content.block1_title} 
                        onChange={(e) => setContent({...content, block1_title: e.target.value})} 
                        className="w-full border rounded-lg p-2 mb-3 text-sm font-bold" 
                      />
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Bloc 1 - Texte</label>
                      <textarea 
                        value={content.block1_text} 
                        onChange={(e) => setContent({...content, block1_text: e.target.value})} 
                        className="w-full border rounded-lg p-2 text-xs h-20 resize-none" 
                      />
                    </div>
                    
                    <div className="border p-4 rounded-xl bg-gray-50">
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Bloc 2 (Vert) - Titre</label>
                      <input 
                        type="text" 
                        value={content.block2_title} 
                        onChange={(e) => setContent({...content, block2_title: e.target.value})} 
                        className="w-full border rounded-lg p-2 mb-3 text-sm font-bold" 
                      />
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Bloc 2 - Texte</label>
                      <textarea 
                        value={content.block2_text} 
                        onChange={(e) => setContent({...content, block2_text: e.target.value})} 
                        className="w-full border rounded-lg p-2 text-xs h-20 resize-none" 
                      />
                    </div>
                    
                    <div className="border p-4 rounded-xl bg-gray-50">
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Bloc 3 (Orange) - Titre</label>
                      <input 
                        type="text" 
                        value={content.block3_title} 
                        onChange={(e) => setContent({...content, block3_title: e.target.value})} 
                        className="w-full border rounded-lg p-2 mb-3 text-sm font-bold" 
                      />
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Bloc 3 - Texte</label>
                      <textarea 
                        value={content.block3_text} 
                        onChange={(e) => setContent({...content, block3_text: e.target.value})} 
                        className="w-full border rounded-lg p-2 text-xs h-20 resize-none" 
                      />
                    </div>
                  </div>
                  
                  {/* ZONE FAQ */}
                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-sm">Foire aux Questions (FAQ)</h4>
                      <button 
                        type="button" 
                        onClick={addFaq} 
                        className="bg-gray-900 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold flex items-center hover:bg-gray-800 transition"
                      >
                        <Plus size={14} className="mr-1"/> Ajouter une question
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {content.faq_json?.map((faq: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <div className="flex-1 space-y-2">
                            <input 
                              type="text" 
                              placeholder="Question ?" 
                              value={faq.question} 
                              onChange={(e) => updateFaq(i, 'question', e.target.value)} 
                              className="w-full border rounded-lg p-2 text-sm font-bold outline-none" 
                            />
                            <textarea 
                              placeholder="Réponse..." 
                              value={faq.answer} 
                              onChange={(e) => updateFaq(i, 'answer', e.target.value)} 
                              className="w-full border rounded-lg p-2 text-xs h-16 resize-none outline-none" 
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeFaq(i)} 
                            className="p-2 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* BLOC 2 : CALENDRIER PUBLIC */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-200 space-y-6">
                  <h3 className="font-black uppercase text-xs tracking-widest text-indigo-500 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">2</span> 
                    Le Calendrier de Réservation
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Titre (Sidebar gauche)</label>
                    <input 
                      type="text" 
                      required 
                      value={content.intro_title} 
                      onChange={(e) => setContent({...content, intro_title: e.target.value})} 
                      className="w-full border rounded-xl p-4 bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Paragraphe d'explication</label>
                    <textarea 
                      required 
                      value={content.intro_paragraph} 
                      onChange={(e) => setContent({...content, intro_paragraph: e.target.value})} 
                      className="w-full border rounded-xl p-4 bg-gray-50 font-medium h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                </div>

                {/* BLOC 3 : CGV (E-MAILS) */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-200">
                  <h3 className="font-black uppercase text-xs tracking-widest text-indigo-500 flex items-center mb-6">
                    <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">3</span> 
                    Conditions Générales (CGV)
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Texte complet (Apparaît dans le formulaire et dans l'e-mail de rappel de la veille)
                    </label>
                    <textarea 
                      required 
                      value={content.cgv_text} 
                      onChange={(e) => setContent({...content, cgv_text: e.target.value})} 
                      className="w-full border rounded-xl p-4 bg-gray-50 font-medium h-80 resize-none outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-indigo-700 transition-colors flex items-center justify-center shadow-xl shadow-indigo-600/20 text-sm"
                >
                  <Save size={20} className="mr-3" /> Enregistrer tous les textes
                </button>
              </form>
            </div>
          )}

          {/* ONGLET 2 : SALLES */}
          {activeTab === "espaces" && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-3xl font-black mb-4 text-gray-900 flex items-center tracking-tight">
                <LayoutTemplate className="mr-4 text-indigo-500 w-8 h-8"/> Gérer les Salles
              </h2>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                Modifiez ici les informations visibles par le public. N'oubliez pas d'enregistrer chaque salle individuellement.
              </p>
              
              <div className="space-y-8">
                {spaces.map(space => (
                  <div key={space.id} className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-200 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-2" style={{backgroundColor: space.color}}></div>
                    
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-gray-100 pb-6 gap-4">
                      <h3 className="text-2xl font-black uppercase tracking-tight" style={{color: space.color}}>{space.name}</h3>
                      <button 
                        onClick={() => handleSaveSpace(space)} 
                        className="bg-gray-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg"
                      >
                        <Save size={16} className="mr-2" /> Enregistrer la salle
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-5">
                        
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2">Nom de la salle</label>
                          <input 
                            type="text" 
                            value={space.name} 
                            onChange={(e) => updateSpaceState(space.id, 'name', e.target.value)} 
                            className="w-full border rounded-xl p-3 bg-gray-50 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-gray-900" 
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2">Capacité (Places)</label>
                            <input 
                              type="number" 
                              value={space.capacity} 
                              onChange={(e) => updateSpaceState(space.id, 'capacity', e.target.value)} 
                              className="w-full border rounded-xl p-3 bg-gray-50 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-gray-900" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2">Couleur de la salle</label>
                            <div className="flex items-center space-x-2 border rounded-xl p-1 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-gray-900">
                              <input 
                                type="color" 
                                value={space.color} 
                                onChange={(e) => updateSpaceState(space.id, 'color', e.target.value)} 
                                className="h-10 w-10 rounded-lg cursor-pointer border-0 bg-transparent p-0" 
                              />
                              <input 
                                type="text" 
                                value={space.color} 
                                onChange={(e) => updateSpaceState(space.id, 'color', e.target.value)} 
                                className="w-full bg-transparent font-bold text-sm outline-none uppercase px-2" 
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2">Galerie Photos</label>
                          <div className="mt-2 border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative bg-white">
                            <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-xs text-gray-500 font-bold">Cliquez ou glissez vos images ici</p>
                            <p className="text-[10px] text-gray-400 mt-1">Vous pouvez uploader plusieurs images d'un coup.</p>
                            
                            <input 
                              type="file" 
                              accept="image/*" 
                              multiple 
                              onChange={(e) => handleImageUpload(e, space.id, space.image_url || "")} 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                              disabled={uploadingSpaceId === space.id} 
                            />
                            
                            {uploadingSpaceId === space.id && (
                              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-2xl z-10 backdrop-blur-sm">
                                <UploadCloud className="w-6 h-6 text-indigo-600 animate-bounce mb-2" />
                                <span className="text-sm font-black text-indigo-600 uppercase">Envoi en cours...</span>
                              </div>
                            )}
                          </div>
                          
                          {space.image_url && (
                            <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scroll-smooth">
                              {space.image_url.split(',').map((url: string) => url.trim()).filter(Boolean).map((url: string, idx: number) => (
                                <div key={idx} className="relative w-24 h-24 shrink-0 group/image rounded-xl overflow-hidden border">
                                  <img src={url} alt={`img-${idx}`} className="w-full h-full object-cover" />
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveImage(space.id, space.image_url, url)} 
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover/image:opacity-100 hover:bg-red-600 transition"
                                  >
                                    <X size={12}/>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2">Description & Matériel</label>
                        <textarea 
                          value={space.description || ""} 
                          onChange={(e) => updateSpaceState(space.id, 'description', e.target.value)} 
                          className="w-full border rounded-xl p-4 bg-gray-50 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-gray-900 text-sm flex-1 min-h-[250px] resize-none" 
                          placeholder="Décrivez l'ambiance et le matériel..." 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* NOTIFICATION FLOTTANTE DE SUCCÈS */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center font-bold animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CheckCircle2 className="text-green-400 mr-3 w-6 h-6" /> 
          Modifications enregistrées !
        </div>
      )}
    </div>
  );
}