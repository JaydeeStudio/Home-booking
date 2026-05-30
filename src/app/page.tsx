"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { ChevronDown, Users, CalendarCheck, ShieldCheck, Mail, ArrowRight, CalendarDays, X, Send, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [content, setContent] = useState<any>(null);
  
  // États pour le formulaire de contact
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: ""
  });

  const defaultFaqs = [
    { question: "Une fois ma demande envoyée, que se passe-t-il ?", answer: "Votre demande est mise 'en attente'. Vous recevrez ensuite un e-mail confirmant la validation ou vous proposant une alternative." },
    { question: "Puis-je annuler ou modifier ma réservation ?", answer: "Oui ! Dans chaque e-mail, un lien direct vous permet d'annuler votre réservation en un clic." },
    { question: "Est-ce gratuit ?", answer: "Gratuit pour les activités liées aux programmes officiels de Home. Pour tout autre événement, des frais de location peuvent s'appliquer." }
  ];

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase.from("site_content").select("*").eq("id", 1).single();
      if (data) setContent(data);
    };
    fetchContent();
  }, []);

  const faqs = content?.faq_json && content.faq_json.length > 0 ? content.faq_json : defaultFaqs;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CONTACT_FORM',
          user_name: `${formData.firstName} ${formData.lastName}`,
          user_email: formData.email,
          user_phone: formData.phone,
          reason: formData.message,
          // On passe l'adresse cible (éditable dans l'admin) pour que l'API sache à qui envoyer
          target_email: content?.ext_btn_link?.replace('mailto:', '') || 'sabine@eglisehome.com'
        })
      });
      setContactSuccess(true);
      setTimeout(() => {
        setIsContactOpen(false);
        setContactSuccess(false);
        setFormData({ firstName: "", lastName: "", email: "", phone: "", message: "" });
      }, 3000);
    } catch (error) {
      alert("Une erreur est survenue lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactClick = (e: React.MouseEvent) => {
    const link = content?.ext_btn_link || "mailto:sabine@eglisehome.com";
    // Si le lien édité par l'admin est un mailto, on intercepte et on ouvre notre modale
    if (link.startsWith('mailto:')) {
      e.preventDefault();
      setIsContactOpen(true);
    }
    // Sinon, c'est une URL classique (ex: un lien vers un Google Form), on laisse faire le comportement normal
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-[#F4E5D2] selection:text-black">
      
      <header className="bg-[#F4E5D2] px-4 py-8 md:py-12 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden rounded-b-[32px]">
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-black text-[#F4E5D2] rounded-xl flex items-center justify-center text-xl md:text-2xl font-black shadow-lg">H</div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight">Home Spaces</h1>
          </div>
          <p className="text-sm md:text-base text-black/80 font-medium max-w-xl mx-auto mb-6 px-4">
            {content?.landing_title || "La plateforme de réservation des espaces de l'église, réservée à la communauté Home Lausanne."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto mb-6 px-2">
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl flex items-center gap-3 text-left border border-[#EADDCC]">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><Users size={20} /></div>
              <div>
                <h3 className="text-xs font-black uppercase">{content?.block1_title || "Pour la commu"}</h3>
                <p className="text-[10px] text-gray-600 font-medium leading-tight">{content?.block1_text || "Leaders, équipes, groupes de maison..."}</p>
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl flex items-center gap-3 text-left border border-[#EADDCC]">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0"><CalendarCheck size={20} /></div>
              <div>
                <h3 className="text-xs font-black uppercase">{content?.block2_title || "Nos activités"}</h3>
                <p className="text-[10px] text-gray-600 font-medium leading-tight">{content?.block2_text || "Sisterhood, louange, réunions, 313..."}</p>
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl flex items-center gap-3 text-left border border-[#EADDCC]">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0"><ShieldCheck size={20} /></div>
              <div>
                <h3 className="text-xs font-black uppercase">{content?.block3_title || "Validation"}</h3>
                <p className="text-[10px] text-gray-600 font-medium leading-tight">{content?.block3_text || "Soumis à l'accord de l'administration."}</p>
              </div>
            </div>
          </div>

          <Link href="/calendrier" className="inline-flex items-center justify-center bg-black text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl text-xs md:text-sm group w-full md:w-auto max-w-sm mx-auto">
            <CalendarDays className="mr-2 w-5 h-5" />
            Accéder à la réservation
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-gray-900 text-white rounded-[24px] p-6 mb-12 flex flex-col sm:flex-row items-center justify-between shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-white/5 w-32 h-32"><Mail className="w-full h-full" /></div>
          <div className="relative z-10 sm:w-2/3 mb-4 sm:mb-0 text-center sm:text-left">
            <h3 className="text-lg font-black uppercase mb-1">{content?.ext_event_title || "Un événement externe ?"}</h3>
            <p className="text-gray-400 font-medium text-xs leading-relaxed">
              {content?.ext_event_text || "Les demandes hors programme peuvent engendrer des frais. Écrivez-nous pour nous présenter votre projet."}
            </p>
          </div>
          <div className="relative z-10 w-full sm:w-auto">
            <a 
              href={content?.ext_btn_link || "mailto:sabine@eglisehome.com"} 
              onClick={handleContactClick}
              className="block cursor-pointer text-center bg-white text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-gray-100 text-[10px]"
            >
              {content?.ext_btn_text || "Contacter Sabine"}
            </a>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight">Questions fréquentes</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq: any, index: number) => (
            <div key={index} className={`bg-white border transition-all duration-300 rounded-2xl overflow-hidden ${openFaq === index ? 'border-gray-300 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
              <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full px-5 py-4 flex items-center justify-between text-left">
                <span className="font-bold text-gray-900 text-sm pr-4">{faq.question}</span>
                <div className={`w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center shrink-0 transition-transform ${openFaq === index ? 'rotate-180 bg-gray-100' : ''}`}>
                  <ChevronDown size={14} className="text-gray-500" />
                </div>
              </button>
              <div className={`px-5 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-48 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-gray-600 text-xs leading-relaxed font-medium pt-2 border-t border-gray-100">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODALE DE CONTACT */}
      {isContactOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={(e) => {if(e.target === e.currentTarget && !isSubmitting) setIsContactOpen(false)}}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col border border-white/20">
            {contactSuccess ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-2">Message envoyé</h2>
                <p className="text-sm text-gray-500 font-medium">Nous vous répondrons dans les plus brefs délais.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">Nous contacter</h2>
                    <p className="text-xs font-medium text-gray-500 mt-1">Présentez-nous votre projet d'événement.</p>
                  </div>
                  <button type="button" onClick={() => {if(!isSubmitting) setIsContactOpen(false)}} className="bg-gray-50 p-2.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50">
                    <X size={20} className="text-gray-600"/>
                  </button>
                </div>
                
                <div className="overflow-y-auto p-6 flex-1">
                  <form id="contactForm" onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Prénom *</label>
                        <input type="text" required disabled={isSubmitting} value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="block w-full h-[52px] border border-gray-200 rounded-xl px-4 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Nom *</label>
                        <input type="text" required disabled={isSubmitting} value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="block w-full h-[52px] border border-gray-200 rounded-xl px-4 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">E-mail *</label>
                        <input type="email" required disabled={isSubmitting} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="block w-full h-[52px] border border-gray-200 rounded-xl px-4 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Téléphone *</label>
                        <input type="tel" required disabled={isSubmitting} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="block w-full h-[52px] border border-gray-200 rounded-xl px-4 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Votre demande *</label>
                      <textarea required disabled={isSubmitting} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} placeholder="Décrivez votre besoin en détail..." className="block w-full border border-gray-200 rounded-xl p-4 bg-gray-50 font-medium h-32 resize-none outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" />
                    </div>
                  </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-white shrink-0">
                  <button 
                    type="submit" 
                    form="contactForm"
                    disabled={isSubmitting} 
                    className={`w-full text-white font-black uppercase py-4 rounded-2xl shadow-xl text-sm transition-all flex items-center justify-center ${isSubmitting ? 'bg-gray-800 cursor-wait' : 'bg-black hover:scale-[1.02]'}`}
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
                      <><Send size={18} className="mr-2" /> Envoyer le message</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}