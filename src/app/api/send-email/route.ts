import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);
const formatGoogleDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

// Fonction pour forcer l'heure Suisse
const formatSwissTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('fr-CH', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, user_name, user_email, space_name, space_color = "#111827", start_time, end_time, reason, booking_id, admin_message, cgv_text } = body;

    const BASE_URL = "https://home-booking-sigma.vercel.app"; 
    const ADMIN_EMAIL = 'jonasdellomo@gmail.com'; 
    const LOGO_URL = `${BASE_URL}/logo.png`;

    // Si on a des dates (pas le cas pour CONTACT_FORM)
    let startDate, endDate, googleUrl, icsUrl, cancelUrl;
    
    if (start_time) {
      startDate = new Date(start_time);
      endDate = end_time ? new Date(end_time) : new Date(startDate.getTime() + 60 * 60 * 1000);
      googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Réservation : " + space_name)}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${encodeURIComponent("Motif : " + reason + (admin_message ? "\n\nNote de l'admin : " + admin_message : ""))}&location=${encodeURIComponent(space_name)}&sf=true&output=xml`;
      icsUrl = `https://ics.agical.io/?subject=${encodeURIComponent("Réservation : " + space_name)}&dtstart=${startDate.toISOString()}&dtend=${endDate.toISOString()}&description=${encodeURIComponent(reason)}&location=${encodeURIComponent(space_name)}&reminder=10`;
      cancelUrl = `${BASE_URL}/gerer?id=${booking_id}`;
    }

    const swissDateTimeOptions: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Zurich', dateStyle: 'full', timeStyle: 'short' };
    const swissDateLongOptions: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Zurich', dateStyle: 'long' };

    // LA FONCTION ACCEPTE BIEN 3 ARGUMENTS
    const wrapEmail = (title: string, badgeColor: string, content: string) => `
      <div style="background-color: #f9fafb; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
          <div style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #f3f4f6;">
            <img src="${LOGO_URL}" alt="Home Réservation" style="height: 52px; margin-bottom: 24px;" />
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #111827; text-transform: uppercase;">${title}</h1>
          </div>
          <div style="padding: 40px;">
            ${space_name ? `<div style="display: inline-block; background-color: ${badgeColor}15; border: 1px solid ${badgeColor}30; color: ${badgeColor}; padding: 6px 16px; border-radius: 100px; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 24px;">Salle : ${space_name}</div>` : ''}
            ${content}
          </div>
        </div>
      </div>
    `;

    // --- LE NOUVEAU FORMULAIRE DE CONTACT ---
    if (type === 'CONTACT_FORM') {
      const contactContent = `
        <p style="font-size: 16px; color: #374151;">Un nouveau message a été envoyé depuis la page d'accueil par <strong>${user_name}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 30px 0; background: #f9fafb; border-radius: 16px; overflow: hidden;">
          <tr><td style="padding: 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: bold; width: 30%;">E-mail</td><td style="padding: 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: bold;"><a href="mailto:${user_email}" style="color: #3b82f6;">${user_email}</a></td></tr>
          <tr><td style="padding: 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: bold;">Téléphone</td><td style="padding: 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: bold;">${body.user_phone}</td></tr>
          <tr><td style="padding: 16px; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: bold;">Message</td><td style="padding: 16px; color: #111827; white-space: pre-wrap;">${reason}</td></tr>
        </table>
        <div style="text-align: center; margin-top: 40px;">
          <a href="mailto:${user_email}" style="background: #111827; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; display: inline-block;">Répondre à ${user_name}</a>
        </div>
      `;
      return NextResponse.json(await resend.emails.send({
        from: 'Home Contact <onboarding@resend.dev>', 
        to: [body.target_email || ADMIN_EMAIL], 
        replyTo: user_email, 
        subject: `Nouveau message de ${user_name}`, 
        html: wrapEmail("Nouveau Message Externe", "#3b82f6", contactContent)
      }));
    }

    if (!startDate) return NextResponse.json({ error: "Start date is required for this action." }, { status: 400 });

    if (type === 'NEW_REQUEST') {
      const adminContent = `
        <p style="font-size: 16px; color: #374151;">Demande soumise par <strong>${user_name}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 30px 0; background: #f9fafb; border-radius: 16px; overflow: hidden;">
          <tr><td style="padding: 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: bold; width: 30%;">Date & Heure</td><td style="padding: 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: bold;">${startDate.toLocaleString('fr-CH', swissDateTimeOptions)}</td></tr>
          <tr><td style="padding: 16px; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: bold;">Motif</td><td style="padding: 16px; color: #111827;">${reason}</td></tr>
        </table>
        <div style="text-align: center; margin-top: 40px;">
          <a href="${BASE_URL}/admin?action=validate&id=${booking_id}" style="background: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; display: inline-block; margin-right: 12px;">Valider</a>
          <a href="${BASE_URL}/admin" style="background: #111827; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; display: inline-block;">Admin</a>
        </div>
      `;
      return NextResponse.json(await resend.emails.send({
        from: 'Home Réservation <onboarding@resend.dev>', to: [ADMIN_EMAIL],
        subject: `🔔 Demande : ${space_name} par ${user_name}`, html: wrapEmail("Nouvelle Demande", space_color, adminContent)
      }));
    }

    if (type === 'USER_CANCELLED') {
      const adminCancelContent = `<p style="font-size: 16px; color: #374151;"><strong>${user_name}</strong> a annulé sa réservation.</p><p style="font-size: 16px; color: #374151;">Le créneau du <strong>${startDate.toLocaleString('fr-CH', swissDateTimeOptions)}</strong> a été libéré.</p>`;
      return NextResponse.json(await resend.emails.send({
        from: 'Home Réservation <onboarding@resend.dev>', to: [ADMIN_EMAIL],
        subject: `❌ Annulation : ${space_name} par ${user_name}`, html: wrapEmail("Réservation Annulée", space_color, adminCancelContent)
      }));
    }

    let subject = ""; let content = ""; let emailTitle = "";
    const adminNoteHtml = admin_message ? `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 30px 0;"><p style="margin: 0; color: #1e3a8a; font-size: 11px; text-transform: uppercase; font-weight: 900; margin-bottom: 6px;">Message de l'administration</p><p style="margin: 0; color: #1d4ed8; font-size: 15px;">${admin_message}</p></div>` : "";
    const agendaButtons = `<div style="margin-top: 40px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 30px;"><p style="margin-bottom: 20px; font-size: 12px; font-weight: 900; color: #6b7280; text-transform: uppercase;">Ajouter à mon agenda</p><a href="${googleUrl}" style="background: white; color: #374151; border: 1px solid #e5e7eb; padding: 12px 20px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; margin: 0 8px 16px 0; font-size: 13px;">Google Calendar</a><a href="${icsUrl}" style="background: white; color: #374151; border: 1px solid #e5e7eb; padding: 12px 20px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; margin: 0 0 16px 0; font-size: 13px;">Apple / Outlook</a></div>`;
    const cancelLink = booking_id ? `<div style="text-align: center; margin-top: 20px;"><a href="${cancelUrl}" style="color: #ef4444; font-size: 12px; text-decoration: underline;">Annuler cette réservation</a></div>` : "";
    const legalFooter = `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #9ca3af; text-align: center;"><p>Conformément à votre engagement lors de la réservation, nous vous rappelons que vous êtes tenus de respecter nos <a href="${BASE_URL}/cgv" style="color: #6b7280; text-decoration: underline;">conditions d'utilisation</a> des locaux.</p></div>`;

    if (type === 'CONFIRMED') {
      emailTitle = "Réservation Confirmée"; subject = `✨ Votre réservation est validée (${space_name})`;
      content = `<p style="font-size: 16px; color: #374151;">Bonjour <strong>${user_name}</strong>,</p><p style="font-size: 16px; color: #374151;">Votre demande pour le <strong>${startDate.toLocaleString('fr-CH', swissDateTimeOptions)}</strong> a bien été validée.</p>${adminNoteHtml}${agendaButtons}${cancelLink}${legalFooter}`;
    } else if (type === 'DELETED') {
      emailTitle = "Réservation Annulée"; subject = `Info concernant votre demande (${space_name})`;
      content = `<p style="font-size: 16px; color: #374151;">Bonjour <strong>${user_name}</strong>,</p><p style="font-size: 16px; color: #374151;">Nous avons bien reçu votre demande pour le <strong>${startDate.toLocaleString('fr-CH', swissDateLongOptions)}</strong>, mais nous ne pouvons malheureusement pas la maintenir.</p>${adminNoteHtml}<div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 12px; margin-top: 30px;"><p style="margin: 0; color: #b91c1c; font-size: 14px; text-align: center;"><strong>⚠️ Attention :</strong> Si cet événement avait été ajouté à votre calendrier personnel, merci de le supprimer manuellement.</p></div>`;
    } else if (type === 'MODIFIED') {
      emailTitle = "Réservation Ajustée"; subject = `⚠️ Votre réservation a été modifiée (${space_name})`;
      content = `<p style="font-size: 16px; color: #374151;">Bonjour <strong>${user_name}</strong>,</p><p style="font-size: 16px; color: #374151;">Votre réservation a bien été traitée, mais l'administration a dû y apporter des ajustements.</p>${adminNoteHtml}<div style="background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; margin-top: 30px;"><p style="margin: 0; color: #b45309; font-size: 14px; text-align: center;"><strong>🔄 Rappel Agenda :</strong> N'oubliez pas de mettre à jour votre calendrier personnel.</p></div>${agendaButtons}${cancelLink}${legalFooter}`;
    } else if (type === 'REMINDER') {
      emailTitle = "Rappel de Réservation"; 
      subject = `Rappel : Votre réservation de demain (${space_name})`;
      
      const displayTime = formatSwissTime(start_time);

      content = `
        <p style="font-size: 16px; color: #374151;">Bonjour <strong>${user_name}</strong>,</p>
        <p style="font-size: 16px; color: #374151;">Ceci est un petit rappel automatique pour votre réservation de demain dans l'espace <strong>${space_name}</strong>.</p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 16px; margin: 25px 0; text-align: center; border: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: bold;">Heure de rendez-vous</p>
          <p style="margin: 5px 0 0; color: #111827; font-size: 24px; font-weight: 900;">${displayTime}</p>
        </div>

        <div style="margin: 30px 0; text-align: center;">
          <p style="font-size: 14px; color: #4b5563; margin-bottom: 15px;">Avant votre venue, merci de relire les consignes d'utilisation des locaux (rangement, ménage, extinction des feux).</p>
          <a href="${BASE_URL}/cgv" style="display: inline-block; background: #111827; color: white; padding: 14px 24px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 13px; text-transform: uppercase;">Consulter les consignes</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">Besoin d'annuler ? <a href="${cancelUrl}" style="color: #ef4444; text-decoration: underline;">Cliquez ici</a></p>

        <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #f3f4f6; text-align: center;">
          <img src="${LOGO_URL}" alt="H" style="height: 40px; margin-bottom: 15px;" />
          <p style="margin: 0; font-size: 13px; color: #111827; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Home</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #9ca3af; font-style: normal;">Rue de la Borde 14 – 1018 Lausanne</p>
        </div>
      `;
    }

    return NextResponse.json(await resend.emails.send({
      from: 'Home Réservation <onboarding@resend.dev>', to: [user_email],
      subject: subject, html: wrapEmail(emailTitle, space_color, content)
    }));
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}