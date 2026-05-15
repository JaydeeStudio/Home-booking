"use client";

import { useState } from "react";
import { ChevronDown, Users, CalendarCheck, ShieldCheck, Mail, ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Une fois ma demande envoyée, que se passe-t-il ?",
      answer: "Votre demande est mise 'en attente' sur notre calendrier. Un administrateur de Home va l'étudier. Vous recevrez ensuite un e-mail confirmant la validation de votre créneau ou vous proposant une alternative si la salle n'est plus disponible."
    },
    {
      question: "Puis-je annuler ou modifier ma réservation ?",
      answer: "Oui ! Dans chaque e-mail de confirmation ou de rappel que vous recevez, un lien direct vous permet d'annuler votre réservation en un clic, libérant ainsi la place pour quelqu'un d'autre."
    },
    {
      question: "La réservation des locaux est-elle gratuite ?",
      answer: "Pour les activités liées aux programmes officiels de Home (Sisterhood, réunions d'équipe, etc.), la mise à disposition est gratuite. Pour tout autre événement privé ou externe, des frais de location peuvent s'appliquer. Contactez-nous pour en discuter !"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-[#F4E5D2] selection:text-black">
      
      {/* HEADER / HERO ULTRA-COMPACT */}
      <header className="bg-[#F4E5D2] px-4 py-8 md:py-12 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden rounded-b-[32px]">
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-black text-[#F4E5D2] rounded-xl flex items-center justify-center text-xl md:text-2xl font-black shadow-lg">H</div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight">Home Spaces</h1>
          </div>
          <p className="text-sm md:text-base text-black/80 font-medium max-w-xl mx-auto mb-6 px-4">
            La plateforme de réservation des espaces de l'église, réservée à la communauté Home Lausanne.
          </p>

          {/* LES 3 BLOCS COMPACTS (Grid horizontale sur mobile pour gagner de la place) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto mb-6 px-2">
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl flex items-center gap-3 text-left border border-[#EADDCC]">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><Users size={20} /></div>
              <div>
                <h3 className="text-xs font-black uppercase">Pour la commu</h3>
                <p className="text-[10px] text-gray-600 font-medium leading-tight">Leaders, équipes, groupes de maison...</p>
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl flex items-center gap-3 text-left border border-[#EADDCC]">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0"><CalendarCheck size={20} /></div>
              <div>
                <h3 className="text-xs font-black uppercase">Nos activités</h3>
                <p className="text-[10px] text-gray-600 font-medium leading-tight">Sisterhood, louange, réunions, 313...</p>
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl flex items-center gap-3 text-left border border-[#EADDCC]">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0"><ShieldCheck size={20} /></div>
              <div>
                <h3 className="text-xs font-black uppercase">Validation</h3>
                <p className="text-[10px] text-gray-600 font-medium leading-tight">Soumis à l'accord de l'administration.</p>
              </div>
            </div>
          </div>

          {/* LE BOUTON D'ACTION (Visible sans scroller) */}
          <Link href="/calendrier" className="inline-flex items-center justify-center bg-black text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl text-xs md:text-sm group w-full md:w-auto max-w-sm mx-auto">
            <CalendarDays className="mr-2 w-5 h-5" />
            Accéder au calendrier
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </header>

      {/* RESTE DU CONTENU (Scrollable) */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* BLOC INFO EXTERNE */}
        <div className="bg-gray-900 text-white rounded-[24px] p-6 mb-12 flex flex-col sm:flex-row items-center justify-between shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-white/5 w-32 h-32"><Mail className="w-full h-full" /></div>
          <div className="relative z-10 sm:w-2/3 mb-4 sm:mb-0 text-center sm:text-left">
            <h3 className="text-lg font-black uppercase mb-1">Un événement externe ?</h3>
            <p className="text-gray-400 font-medium text-xs leading-relaxed">
              Les demandes hors programme peuvent engendrer des frais. Écrivez-nous pour nous présenter votre projet.
            </p>
          </div>
          <div className="relative z-10 w-full sm:w-auto">
            <a href="mailto:sabine@eglisehome.com" className="block text-center bg-white text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-gray-100 text-[10px]">
              Contacter Sabine
            </a>
          </div>
        </div>

        {/* FAQ ACCORDION */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight">Questions fréquentes</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
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
    </div>
  );
}