import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, user_name, user_email, space_name, start_time, reason, booking_id } = body;

    // ⚠️ IMPORTANT : Mets l'URL de ton site Vercel ici dès qu'il sera en ligne
    const BASE_URL = "http://localhost:3000"; 
    const ADMIN_EMAIL = 'jonasdellomo@gmail.com'; 

    // Le Logo de ton église (doit être accessible sur internet pour s'afficher dans l'e-mail)
    const LOGO_HTML = `<div style="text-align: center; margin-bottom: 20px;"><img src="${BASE_URL}/logo.png" alt="Home Réservation" style="height: 50px; max-width: 100%; object-fit: contain;" /></div>`;

    // --- CAS A : NOTIFICATION POUR JONAS ---
    if (type === 'NEW_REQUEST') {
      return NextResponse.json(await resend.emails.send({
        from: 'Home Réservation <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `🔔 Nouvelle demande : ${space_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 24px; border-radius: 16px; margin: 0 auto;">
            ${LOGO_HTML}
            <h2 style="color: #111; margin-bottom: 20px; text-align: center;">Nouvelle demande</h2>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
              <p><strong>Qui :</strong> ${user_name}</p>
              <p><strong>Salle :</strong> ${space_name}</p>
              <p><strong>Horaire :</strong> ${new Date(start_time).toLocaleString('fr-FR')}</p>
              <p><strong>Motif :</strong> ${reason}</p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
              <a href="${BASE_URL}/admin?action=validate&id=${booking_id}" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                 ✅ Valider
              </a>
              <a href="${BASE_URL}/admin" 
                 style="background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                 🔍 Voir la demande
              </a>
            </div>
          </div>
        `
      }));
    }

    // --- CAS B : NOTIFICATIONS POUR L'UTILISATEUR ---
    let subject = "";
    let content = "";
    let color = "#000";

    if (type === 'CONFIRMED') {
      subject = "✨ Bonne nouvelle : votre réservation est validée !";
      color = "#10b981";
      content = `
        <h2 style="color: ${color}; text-align: center;">C'est confirmé !</h2>
        <p>Bonjour ${user_name}, nous avons le plaisir de vous informer que votre demande de réservation pour la <strong>${space_name}</strong> a été validée.</p>
        <p>Nous nous réjouissons de vous accueillir.</p>
      `;
    } else if (type === 'DELETED') {
      subject = "Info concernant votre demande de réservation";
      color = "#ef4444";
      content = `
        <h2 style="color: ${color}; text-align: center;">Bonjour ${user_name},</h2>
        <p>Nous avons bien reçu votre demande, mais nous ne pouvons malheureusement pas la valider pour le moment.</p>
        <p>Votre créneau a été libéré. Notre équipe reviendra vers vous très rapidement avec plus d'informations ou pour vous proposer une alternative.</p>
      `;
    } else if (type === 'MODIFIED') {
      subject = "⚠️ Votre réservation a été ajustée";
      color = "#f59e0b";
      content = `
        <h2 style="color: ${color}; text-align: center;">Réservation validée (avec ajustements)</h2>
        <p>Bonjour ${user_name}, votre réservation a été validée !</p>
        <p><strong>Attention :</strong> afin de mieux répondre aux besoins de tous ou pour optimiser l'occupation des locaux, nous avons dû apporter quelques modifications à votre demande initiale.</p>
        <p>Merci de consulter le calendrier en ligne pour vérifier les nouveaux détails (salle ou horaires).</p>
      `;
    }

    return NextResponse.json(await resend.emails.send({
      from: 'Home Réservation <onboarding@resend.dev>',
      to: [user_email],
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; color: #333; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
          ${LOGO_HTML}
          ${content}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 14px; text-align: center;"><strong>Rappel :</strong> ${space_name} le ${new Date(start_time).toLocaleString('fr-FR')}</p>
          <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">Ceci est un message automatique de Home Réservation.</p>
        </div>
      `
    }));

  } catch (error) {
    console.error("Erreur API Email:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}
