import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// CORRECTION ICI : Google attend maintenant un objet unique {...}
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

const calendar = google.calendar({ version: 'v3', auth });

export async function POST(req: Request) {
  try {
    const { action, booking } = await req.json();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    // 1. CRÉATION OU BLOCAGE
    if (action === 'create') {
      const event = {
        summary: `${booking.status === 'pending' ? '[ATTENTE] ' : ''}${booking.user_name} - ${booking.space_name}`,
        description: `Raison: ${booking.reason}\nEmail: ${booking.user_email}\nLien: https://home-booking.vercel.app/admin`,
        start: { dateTime: booking.start_time },
        end: { dateTime: booking.end_time },
        colorId: booking.space_color === '#EF4444' ? '11' : '1', // Adaptable selon tes couleurs
      };

      const res = await calendar.events.insert({ calendarId, requestBody: event });
      return NextResponse.json({ google_event_id: res.data.id });
    }

    // 2. MISE À JOUR (Validation ou Modification)
    if (action === 'update' && booking.google_event_id) {
      await calendar.events.patch({
        calendarId,
        eventId: booking.google_event_id,
        requestBody: {
          summary: `${booking.status === 'confirmed' ? '✅ ' : '[ATTENTE] '}${booking.user_name} - ${booking.space_name}`,
          start: { dateTime: booking.start_time },
          end: { dateTime: booking.end_time },
        },
      });
      return NextResponse.json({ success: true });
    }

    // 3. SUPPRESSION
    if (action === 'delete' && booking.google_event_id) {
      await calendar.events.delete({ calendarId, eventId: booking.google_event_id });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: 'Aucune action effectuée' });
  } catch (error: any) {
    console.error('Erreur Calendar API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}