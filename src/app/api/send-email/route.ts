import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, user_name, space_name } = body;

    const BASE_URL = "https://home-booking-sigma.vercel.app";
    const ADMIN_EMAIL = "jonasdellomo@gmail.com";

    if (type === 'NEW_REQUEST') {
      await resend.emails.send({
        from: 'Home Réservation <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `🔔 Nouvelle demande : ${space_name}`,
        html: `<div style="font-family: sans-serif;"><h2>Nouvelle demande</h2><p>De: ${user_name}</p><p>Salle: ${space_name}</p></div>`
      });
    }

    return NextResponse.json({ message: "OK" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
