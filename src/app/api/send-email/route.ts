import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, user_name, space_name, booking_id } = body;

    // Ici, on range l'URL dans une variable "BASE_URL" pour que le code comprenne
    const BASE_URL = "https://home-booking-sigma.vercel.app"; 
    const ADMIN_EMAIL = 'jonasdellomo@gmail.com'; 

    if (type === 'NEW_REQUEST') {
      const { data, error } = await resend.emails.send({
        from: 'Home Réservation <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `🔔 Nouvelle demande : ${space_name}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Nouvelle demande de réservation</h2>
            <p><strong>Nom :</strong> ${user_name}</p>
            <p><strong>Salle :</strong> ${space_name}</p>
            <p style="margin-top: 30px;">
              <a href="${BASE_URL}/admin" style="background: black; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px;">Voir dans l'Admin</a>
            </p>
          </div>
        `
      });
      if (error) throw error;
    }

    return NextResponse.json({ message: "Succès" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
