"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; // Ajuste le chemin si besoin
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Shield } from "lucide-react";
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
          <Shield className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Chargement des conditions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors mb-8 bg-indigo-50 px-4 py-2 rounded-xl">
          <ArrowLeft size={16} className="mr-2" /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-8 md:p-12">
          <div className="flex items-center justify-center w-16 h-16 bg-gray-50 rounded-2xl mb-8 border border-gray-100">
             <Shield className="w-8 h-8 text-gray-900" />
          </div>
          
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Conditions d'utilisation</h1>
          
          {content.cgv_last_updated && (
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-10">
              Dernière mise à jour : {format(new Date(content.cgv_last_updated), "d MMMM yyyy", { locale: fr })}
            </p>
          )}

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {content.cgv_text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}