import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const tomorrow = addDays(new Date(), 1);
    const startOfTomorrow = startOfDay(tomorrow).toISOString();
    const endOfTomorrow = endOfDay(tomorrow).toISOString();

    // On récupère le nom ET la couleur de la salle
    const { data: bookings, error: bError } = await supabase
      .from('bookings')
      .select('*, spaces(name, color)')
      .eq('status', 'confirmed')
      .gte('start_time', startOfTomorrow)
      .lte('start_time', endOfTomorrow);

    if (bError) throw bError;
    if (!bookings || bookings.length === 0) return NextResponse.json({ message: 'Rien pour demain.' });

    const emailPromises = bookings.map((booking) => {
      return fetch(`${new URL(req.url).origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REMINDER',
          user_name: booking.user_name,
          user_email: booking.user_email,
          space_name: booking.spaces?.name,
          space_color: booking.spaces?.color, // Couleur dynamique récupérée ici !
          start_time: booking.start_time,
          booking_id: booking.id
        }),
      });
    });

    await Promise.all(emailPromises);
    return NextResponse.json({ success: true, count: bookings.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}