import React from "react";

export default function Datenschutz() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Datenschutzerklärung</h1>
      
      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Datenschutz auf einen Blick</h2>
          <h3 className="font-semibold mt-4 mb-1">Allgemeine Hinweise</h3>
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Verschlüsselung: Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL-bzw. TLS-Verschlüsselung. Alle Daten, die Sie in diesem Tool verwalten, werden sicher in Cloud-Datenbanken gespeichert.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">2. Datenerfassung auf dieser Website</h2>
          <h3 className="font-semibold mt-4 mb-1">Wer ist verantwortlich für die Datenerfassung?</h3>
          <p>
            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
          </p>
          
          <h3 className="font-semibold mt-4 mb-1">Hosting</h3>
          <p>
            Wir hosten unsere Website bei Google Cloud und Firebase. Anbieter ist Google Ireland Limited. Wenn Sie unsere Website besuchen, erfasst Firebase verschiedene Logfiles inklusive Ihrer IP-Adressen. Die Details finden Sie in der Datenschutzerklärung von Google.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">3. Verarbeitung von Schülerdaten</h2>
          <p>
            Als Nutzer unserer Plattform (z.B. Lehrkraft) können Sie Daten von Schülerinnen und Schülern anlegen. Wir verarbeiten diese Daten ausschließlich in Ihrem Auftrag. Die Daten in den Datenbanken sind vor unbefugtem Zugriff geschützt. Wir empfehlen, die PDF-Exporte (Sitzpläne) sicher aufzubewahren und mit Bedacht weiterzugeben. Beim PDF-Export werden sensible Merkmale (z.B. Schwächen oder spezielle Bedürfnisse) automatisch herausgefiltert und nicht auf das Dokument gedruckt (&quot;mache es verschlüsselt&quot;/anonymisiert für Ansichtsfremde).
          </p>
        </section>
      </div>
    </div>
  );
}
