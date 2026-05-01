import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, user_name, user_email, space_name, start_time, reason, booking_id } = body;

    const BASE_URL = "https://home-booking-sigma.vercel.app"; 
    const ADMIN_EMAIL = 'jonasdellomo@gmail.com'; 

    const LOGO_HTML = `<div style="text-align: center; margin-bottom: 20px;"><img src="${BASE_URL}/logo.png" alt="Home Réservation" style="height: 50px; max-width: 100%; object-fit: contain;" /></div>`;

    if (type === 'NEW_REQUEST') {
      return NextResponse.json(await resend.emails.send({
        from: 'Home Réservation <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `🔔 Nouvelle demande : ${space_name}`,
        html: `<div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 24px; border-radius: 16px; margin: 0 auto;">${LOGO_HTML}<h2 style="text-align: center;">Nouvelle demande</h2><p><strong>Qui :</strong> ${user_name}</p><p><strong>Salle :</strong> ${space_name}</p><a href="${BASE_URL}/admin?action=validate&id=${booking_id}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block; text-align: center;">✅ Valider</a></div>`
      }));
    }

    return NextResponse.json({ message: "Notification envoyée" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
