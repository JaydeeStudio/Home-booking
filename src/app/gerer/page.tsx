"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Clock, XCircle, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

function GererContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBooking();
    } else {
      setError("Aucun identifiant de réservation fourni.");
      setLoading(false);
    }
  }, [id]);

  const fetchBooking = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, spaces(name, color)")
      .eq("id", id)
      .single();

    if (error || !data) {
      setError("Cette réservation est introuvable ou a déjà été supprimée.");
    } else {
      setBooking(data);
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm("Voulez-vous vraiment annuler cette réservation ? Cette action est irréversible et libérera la salle.")) return;
    
    setIsCancelling(true);

    try {
      // 1. SUPPRESSION DANS GOOGLE CALENDAR
      if (booking.google_event_id) {
        await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', booking })
        });
      }

      // 2. ENVOI DE L'E-MAIL À L'ADMINISTRATION
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'USER_CANCELLED',
          user_name: booking.user_name,
          user_email: booking.user_email,
          space_name: booking.spaces?.name,
          space_color: booking.spaces?.color,
          start_time: booking.start_time,
          end_time: booking.end_time,
        })
      });

      // 3. SUPPRESSION DANS SUPABASE
      await supabase.from("bookings").delete().eq("id", id);

      setSuccess(true);
    } catch (err) {
      alert("Une erreur est survenue lors de l'annulation. Veuillez contacter l'administration.");
    }
    
    setIsCancelling(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="animate-pulse font-bold text-gray-400 tracking-widest uppercase">Chargement...</div>
      </div>
    );
  }

  if (error || success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans selection:bg-[#F4E5D2] selection:text-black">
        <div className="bg-white p-8 md:p-12 rounded-[32px] shadow-xl max-w-md w-full text-center border border-gray-100 animate-in zoom-in-95 duration-300">
          {success ? (
            <>
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-4">Réservation Annulée</h1>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                Votre créneau a bien été libéré. L'administration a été notifiée de votre annulation.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-4">Oups</h1>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">{error}</p>
            </>
          )}
          <Link href="/" className="inline-flex items-center justify-center bg-black text-white font-black uppercase tracking-widest py-4 px-8 rounded-2xl hover:scale-105 transition-transform shadow-xl text-sm w-full">
            <ArrowLeft className="mr-2 w-5 h-5"/> Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans selection:bg-[#F4E5D2] selection:text-black">
      <div className="bg-white rounded-[32px] shadow-xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center border-b border-gray-100 bg-gray-50/50">
          <div className="w-12 h-12 bg-black text-[#F4E5D2] rounded-xl flex items-center justify-center text-xl font-black mx-auto mb-4 shadow-lg">H</div>
          <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">Gérer ma demande</h1>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-200 text-center">
            <span 
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-100 mb-4 inline-block" 
              style={{color: booking.spaces?.color}}
            >
              {booking.spaces?.name}
            </span>
            <p className="font-black text-xl text-gray-900 mb-2 capitalize">
              {format(new Date(booking.start_time), "EEEE d MMMM yyyy", {locale:fr})}
            </p>
            <p className="text-gray-500 font-bold flex items-center justify-center bg-white py-2 px-4 rounded-xl border border-gray-100 mx-auto w-max shadow-sm mt-3">
              <Clock size={16} className="mr-2"/> 
              {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
            </p>
          </div>

          <div className="flex justify-between items-center px-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Au nom de</p>
              <p className="font-bold text-gray-900 text-sm">{booking.user_name}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Statut</p>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {booking.status === 'confirmed' ? 'Validé' : 'En attente'}
              </span>
            </div>
          </div>

          <button 
            onClick={handleCancel} 
            disabled={isCancelling} 
            className="w-full bg-red-50 text-red-600 font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-colors border border-red-100 mt-8 shadow-sm"
          >
            {isCancelling ? "Annulation en cours..." : <><Trash2 className="mr-2 w-5 h-5"/> Annuler la réservation</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// Le composant par défaut doit envelopper GererContent avec Suspense pour gérer useSearchParams proprement sur Next.js
export default function GererPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans font-bold text-gray-400 uppercase tracking-widest">Chargement...</div>}>
      <GererContent />
    </Suspense>
  );
}