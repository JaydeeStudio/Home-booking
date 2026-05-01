"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Trash2 } from "lucide-react";

function CancelForm() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      supabase.from("bookings").select("*, spaces(name, color)").eq("id", id).single().then(({ data }) => {
        setBooking(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleCancel = async () => {
    if (!booking) return;
    setLoading(true);

    const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
    if (!error) {
      await fetch('/api/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'USER_CANCELLED', user_name: booking.user_name, space_name: booking.spaces?.name,
          space_color: booking.spaces?.color, start_time: booking.start_time
        })
      });
      setSuccess(true);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center font-bold">Recherche de la réservation...</div>;
  if (!booking && !success) return <div className="p-10 text-center font-bold">Réservation introuvable ou déjà annulée.</div>;

  if (success) {
    return (
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-sm text-center border">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-12 h-12 text-green-600" /></div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Réservation annulée</h2>
        <p className="text-gray-500 font-medium mb-8">Le créneau a bien été libéré pour les autres utilisateurs. N'oubliez pas de le supprimer de votre agenda personnel si vous l'y aviez ajouté.</p>
        <a href="/" className="w-full bg-black text-white font-black py-4 rounded-2xl flex items-center justify-center hover:scale-105 transition-transform">Retour à l'accueil</a>
      </div>
    );
  }

  return (
    <div className="bg-white p-10 rounded-[32px] shadow-2xl w-full max-w-md border border-gray-100">
      <div className="text-center mb-8">
        <img src="/logo.png" alt="Logo" className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">Gérer ma réservation</h2>
      </div>
      <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200">
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white rounded-lg shadow-sm border mb-4 inline-block" style={{color: booking.spaces?.color}}>{booking.spaces?.name}</span>
        <p className="font-bold text-lg mb-1">{booking.user_name}</p>
        <p className="text-sm font-medium text-gray-500">{format(new Date(booking.start_time), "EEEE d MMMM yyyy", {locale:fr})} • {format(new Date(booking.start_time), "HH:mm")} à {format(new Date(booking.end_time), "HH:mm")}</p>
      </div>
      <button onClick={handleCancel} className="w-full bg-red-50 text-red-600 border border-red-200 font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center text-sm"><Trash2 className="w-5 h-5 mr-2" /> Annuler cette réservation</button>
      <a href="/" className="block text-center mt-6 text-sm font-bold text-gray-400 hover:text-black">Retour à l'accueil</a>
    </div>
  );
}

export default function GererPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <Suspense fallback={<div className="font-bold">Chargement...</div>}>
        <CancelForm />
      </Suspense>
    </div>
  );
}
