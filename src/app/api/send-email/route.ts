import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);
const formatGoogleDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, user_name, user_email, space_name, space_color = "#111827", start_time, end_time, reason, booking_id, admin_message, cgv_text } = body;

    const BASE_URL = "https://home-booking-sigma.vercel.app"; 
    const ADMIN_EMAIL = 'jonasdellomo@gmail.com'; 
    const LOGO_URL = `${BASE_URL}/logo.png`;

    const startDate = new Date(start_time);
    const endDate = end_time ? new Date(end_time) : new Date(startDate.getTime() + 60 * 60 * 1000);
    
    // Formatage des dates en Heure Suisse
    const swissDateOptions: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const swissTimeOptions: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' };
    
    let dateStr = startDate.toLocaleDateString('fr-CH', swissDateOptions);
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    const startTimeStr = startDate.toLocaleTimeString('fr-CH', swissTimeOptions);
    const endTimeStr = endDate.toLocaleTimeString('fr-CH', swissTimeOptions);

    const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Réservation : " + space_name)}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${encodeURIComponent("Motif : " + reason + (admin_message ? "\n\nNote de l'admin : " + admin_message : ""))}&location=${encodeURIComponent(space_name)}&sf=true&output=xml`;
    const icsUrl = `https://ics.agical.io/?subject=${encodeURIComponent("Réservation : " + space_name)}&dtstart=${startDate.toISOString()}&dtend=${endDate.toISOString()}&description=${encodeURIComponent(reason)}&location=${encodeURIComponent(space_name)}&reminder=10`;
    const cancelUrl = `${BASE_URL}/gerer?id=${booking_id}`;

    // WRAPPER PRINCIPAL
    const wrapEmail = (title: string, content: string) => `
      <div style="background-color: #f9fafb; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
          <div style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #f3f4f6;">
            <img src="${LOGO_URL}" alt="Home Réservation" style="height: 52px; margin-bottom: 24px;" />
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #111827; text-transform: uppercase;">${title}</h1>
          </div>
          <div style="padding: 40px;">
            ${content}
          </div>
        </div>
      </div>
    `;

    // BLOC CENTRAL (Couleurs dynamiques : vert, rouge, orange, gris)
    const buildDetailsBlock = (blockTitle: string, theme: 'neutral' | 'green' | 'orange' | 'red' = 'neutral') => {
       const colors = {
          neutral: { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' },
          green:   { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' },
          orange:  { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
          red:     { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' }
       };
       const c = colors[theme];
       return `
        <div style="background-color: ${c.bg}; border: 1px solid ${c.border}; border-radius: 16px; padding: 24px; margin: 30px 0; text-align: center;">
          ${blockTitle ? `<p style="margin: 0 0 16px 0; color: ${c.text}; font-size: 11px; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">${blockTitle}</p>` : ''}
          <div style="display: inline-block; background-color: ${space_color}15; border: 1px solid ${space_color}30; color: ${space_color}; padding: 6px 16px; border-radius: 100px; font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 16px;">
            ${space_name}
          </div>
          <div style="color: #111827; font-size: 18px; font-weight: 900; margin-bottom: 8px;">
            ${dateStr}
          </div>
          <div style="color: #374151; font-size: 16px; font-weight: bold;">
            De ${startTimeStr} à ${endTimeStr}
          </div>
        </div>
      `;
    };

    const adminNoteHtml = admin_message ? `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 30px 0;"><p style="margin: 0; color: #1e3a8a; font-size: 11px; text-transform: uppercase; font-weight: 900; margin-bottom: 6px;">Message de l'administration</p><p style="margin: 0; color: #1d4ed8; font-size: 15px; line-height: 1.5;">${admin_message}</p></div>` : "";
    const agendaButtons = `<div style="margin-top: 40px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 30px;"><p style="margin-bottom: 20px; font-size: 12px; font-weight: 900; color: #6b7280; text-transform: uppercase;">Ajouter à mon agenda</p><a href="${googleUrl}" style="background: white; color: #374151; border: 1px solid #e5e7eb; padding: 12px 20px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; margin: 0 8px 16px 0; font-size: 13px;">Google Calendar</a><a href="${icsUrl}" style="background: white; color: #374151; border: 1px solid #e5e7eb; padding: 12px 20px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; margin: 0 0 16px 0; font-size: 13px;">Apple / Outlook</a></div>`;
    const cancelLink = booking_id ? `<div style="text-align: center; margin-top: 20px;"><a href="${cancelUrl}" style="color: #ef4444; font-size: 12px; text-decoration: underline;">Annuler cette réservation</a></div>` : "";
    const legalFooter = `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #9ca3af; text-align: center;"><p>Conformément à votre engagement lors de la réservation, nous vous rappelons que vous êtes tenus de respecter nos <a href="${BASE_URL}/cgv" style="color: #6b7280; text-decoration: underline;">conditions d'utilisation</a> des locaux.</p></div>`;

    if (type === 'NEW_REQUEST') {
      const adminContent = `
        <p style="font-size: 16px; color: #374151; text-align: center;">Nouvelle demande soumise par <strong>${user_name}</strong>.</p>
        ${buildDetailsBlock("Détails de la demande", "neutral")}
        <div style="background: #f3f4f6; padding: 16px 20px; border-radius: 12px; margin-bottom: 30px;">
          <p style="margin: 0; color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 900; margin-bottom: 6px;">Motif</p>
          <p style="margin: 0; color: #111827; font-size: 14px;">${reason}</p>
        </div>
        <div style="text-align: center; margin-top: 40px;">
          <a href="${BASE_URL}/admin" style="background: #111827; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; display: inline-block;">Traiter dans l'Admin</a>
        </div>
      `;
      return NextResponse.json(await resend.emails.send({
        from: 'Home Réservation <onboarding@resend.dev>', to: [ADMIN_EMAIL],
        subject: `🔔 Demande : ${space_name} par ${user_name}`, html: wrapEmail("Nouvelle Demande", adminContent)
      }));
    }

    if (type === 'USER_CANCELLED') {
      const adminCancelContent = `
        <p style="font-size: 16px; color: #374151; text-align: center;"><strong>${user_name}</strong> a annulé sa réservation.</p>
        ${buildDetailsBlock("Créneau libéré", "red")}
      `;
      return NextResponse.json(await resend.emails.send({
        from: 'Home Réservation <onboarding@resend.dev>', to: [ADMIN_EMAIL],
        subject: `❌ Annulation : ${space_name} par ${user_name}`, html: wrapEmail("Réservation Annulée", adminCancelContent)
      }));
    }

    let subject = ""; let content = ""; let emailTitle = "";

    if (type === 'CONFIRMED') {
      emailTitle = "Réservation Confirmée"; 
      subject = `✨ Votre réservation est validée (${space_name})`;
      content = `
        <p style="font-size: 16px; color: #374151;">Bonjour <strong>${user_name}</strong>,</p>
        <p style="font-size: 16px; color: #374151;">Bonne nouvelle ! Votre réservation de salle a bien été validée par l'administration.</p>
        ${buildDetailsBlock("Détails de votre réservation", "green")}
        ${adminNoteHtml}
        ${agendaButtons}
        ${cancelLink}
        ${legalFooter}
      `;
    } else if (type === 'DELETED') {
      emailTitle = "Réservation Refusée"; 
      subject = `❌ Annulation de votre demande (${space_name})`;
      content = `
        <p style="font-size: 16px; color: #374151;">Bonjour <strong>${user_name}</strong>,</p>
        <p style="font-size: 16px; color: #374151;">Nous avons bien reçu votre demande, mais nous ne pouvons malheureusement pas valider ce créneau.</p>
        ${buildDetailsBlock("Demande annulée", "red")}
        ${adminNoteHtml}
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 12px; margin-top: 30px;">
          <p style="margin: 0; color: #b91c1c; font-size: 14px; text-align: center;"><strong>⚠️ Attention :</strong> Si cet événement avait déjà été ajouté à votre calendrier personnel, merci de le supprimer manuellement.</p>
        </div>
      `;
    } else if (type === 'MODIFIED') {
      emailTitle = "Réservation Ajustée"; 
      subject = `⚠️ Votre réservation a été modifiée (${space_name})`;
      content = `
        <p style="font-size: 16px; color: #374151;">Bonjour <strong>${user_name}</strong>,</p>
        <p style="font-size: 16px; color: #374151;">Votre réservation a bien été validée, mais l'administration a dû apporter <strong>des modifications à l'horaire ou à la salle</strong>.</p>
        ${buildDetailsBlock("⚠️ Nouveaux horaires validés", "orange")}
        ${adminNoteHtml}
        <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; margin-top: 30px;">
          <p style="margin: 0; color: #b45309; font-size: 14px; text-align: center;"><strong>🔄 Rappel Agenda :</strong> N'oubliez pas de mettre à jour votre calendrier personnel avec ces nouveaux horaires !</p>
        </div>
        ${agendaButtons}
        ${cancelLink}
        ${legalFooter}
      `;
    } else if (type === 'REMINDER') {
      emailTitle = "Rappel de Réservation"; 
      subject = `Rappel : Votre réservation de demain (${space_name})`;
      content = `
        <p style="font-size: 16px; color: #374151;">Bonjour <strong>${user_name}</strong>,</p>
        <p style="font-size: 16px; color: #374151;">Ceci est un petit rappel automatique concernant votre réservation prévue pour demain.</p>
        ${buildDetailsBlock("Prévu demain", "neutral")}
        <div style="margin: 30px 0; text-align: center;">
          <p style="font-size: 14px; color: #4b5563; margin-bottom: 15px;">Avant votre venue, merci de relire les consignes d'utilisation des locaux (rangement, ménage, extinction des feux).</p>
          <a href="${BASE_URL}/cgv" style="display: inline-block; background: #111827; color: white; padding: 14px 24px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 13px; text-transform: uppercase;">Consulter les consignes</a>
        </div>
        ${cancelLink}
      `;
    }

    return NextResponse.json(await resend.emails.send({
      from: 'Home Réservation <onboarding@resend.dev>', to: [user_email],
      subject: subject, html: wrapEmail(emailTitle, content)
    }));
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}