export default function CGVPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-[32px] shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-black uppercase tracking-tight">Conditions d'Utilisation</h1>
          <p className="text-gray-500 mt-2">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-black mb-3">1. Engagement de l'utilisateur</h2>
            <p>En réservant une salle via notre plateforme, vous vous engagez à respecter les lieux, le matériel mis à disposition, et à laisser l'espace dans l'état exact de propreté où vous l'avez trouvé.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-3">2. Validation et Annulation</h2>
            <p>Toute demande de réservation est soumise à l'approbation de l'administration. Nous nous réservons le droit de refuser ou de modifier une réservation en cas de force majeure ou de conflit d'agenda.</p>
            <p className="mt-2">En cas d'empêchement, vous vous engagez à annuler votre réservation le plus tôt possible via le lien fourni dans votre e-mail de confirmation.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-3">3. Sécurité et Responsabilité</h2>
            <p>Le demandeur est financièrement et légalement responsable des dégradations causées durant le créneau réservé. Assurez-vous d'éteindre les lumières, le chauffage, et de verrouiller les accès lors de votre départ.</p>
          </section>

          <div className="mt-10 pt-8 border-t border-gray-100 text-center">
            <a href="/" className="inline-block bg-black text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform">Retour à l'accueil</a>
          </div>
        </div>
      </div>
    </div>
  );
}
