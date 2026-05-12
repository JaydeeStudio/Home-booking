import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase'; // Ajuste le chemin avec ../ si besoin
import { addDays, startOfDay, endOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export async function GET(req: Request) {
  // 1. VÉRIFICATION DE SÉCURITÉ
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    // 2. CIBLER LA JOURNÉE DE DEMAIN
    const tomorrow = addDays(new Date(), 1);
    const startOfTomorrow = startOfDay(tomorrow).toISOString();
    const endOfTomorrow = endOfDay(tomorrow).toISOString();

    // 3. RÉCUPÉRER LES RÉSERVATIONS CONFIRMÉES DE DEMAIN
    const { data: bookings, error: bError } = await supabase
      .from('bookings')
      .select('*, spaces(name)')
      .eq('status', 'confirmed')
      .gte('start_time', startOfTomorrow)
      .lte('start_time', endOfTomorrow);

    if (bError) throw bError;

    // 4. RÉCUPÉRER LES CONDITIONS D'UTILISATION (CGV)
    const { data: content } = await supabase
      .from('site_content')
      .select('cgv_text')
      .eq('id', 1)
      .single();

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ message: 'Aucun rappel à envoyer pour demain.' });
    }

    // 5. PRÉPARER ET ENVOYER LES E-MAILS
    const emailPromises = bookings.map((booking) => {
      // On formate l'heure ici pour se simplifier la vie
      const formattedTime = format(new Date(booking.start_time), "HH:mm", { locale: fr });
      
      return fetch(`${new URL(req.url).origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REMINDER',
          user_name: booking.user_name,
          user_email: booking.user_email,
          space_name: booking.spaces?.name,
          start_time: formattedTime,
          cgv_text: content?.cgv_text || "Merci de respecter les locaux et de les rendre propres."
        }),
      });
    });

    // On attend que tous les e-mails soient envoyés
    await Promise.all(emailPromises);

    return NextResponse.json({ success: true, count: bookings.length });
  } catch (error: any) {
    console.error("Erreur Cron Reminders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}