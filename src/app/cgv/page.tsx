"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, DoorOpen, Shield } from "lucide-react";
import Link from "next/link";

export default function CGVPage() {
  const [content, setContent] = useState({ cgv_text: "", cgv_last_updated: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase.from("site_content").select("cgv_text, cgv_last_updated").eq("id", 1).single();
      if (data) {
        setContent(data);
      }
      setLoading(false);
    };
    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Shield className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* LOGO ET RETOUR (CENTRÉS) */}
        <div className="flex flex-col items-center mb-12">
          <Link href="/" className="group flex flex-col items-center">
            <img src="/Logo-Home_noir.png" alt="Logo Home" className="h-8 object-contain mb-4 group-hover:scale-105 transition-transform" />
            <div className="flex items-center text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full shadow-sm border border-indigo-50">
              <ArrowLeft size={12} className="mr-2" /> Retour au site
            </div>
          </Link>
        </div>

        {/* BLOC DE CONTENU */}
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-200 overflow-hidden">
          
          {/* EN-TÊTE DU BLOC (CENTRÉ COMME LA CAPTURE) */}
          <div className="p-8 md:p-12 border-b border-gray-50 flex flex-col items-center text-center">
            
            {/* Badge avec icône Porte (DoorOpen) */}
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-8 border border-gray-100 shadow-inner">
               <DoorOpen className="w-6 h-6 text-gray-900" />
            </div>
            
            <div className="inline-flex items-center space-x-2 bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg mb-4">
               <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                 Réservation de salle
               </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-4">
              Conditions d'utilisation
            </h1>
            
            {content.cgv_last_updated && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                Dernière mise à jour : {format(new Date(content.cgv_last_updated), "d MMMM yyyy", { locale: fr })}
              </p>
            )}
          </div>

          {/* CORPS DU TEXTE */}
          <div className="p-8 md:p-12 bg-white">
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap text-sm md:text-base">
                {content.cgv_text}
              </p>
            </div>
          </div>

          {/* PIED DE PAGE DU BLOC */}
          <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex justify-center">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
               Administration Home • Lausanne, Suisse
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
