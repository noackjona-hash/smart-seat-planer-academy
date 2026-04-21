import React from "react";

export default function Impressum() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Impressum</h1>
      
      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Angaben gemäß § 5 TMG</h2>
          <p>
            Jona Noack<br />
            Musterstraße 1<br />
            12345 Musterstadt
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Kontakt</h2>
          <p>
            Telefon: +49 (0) 123 44 55 66<br />
            E-Mail: jona.noack@outlook.de
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p>
            Jona Noack<br />
            Musterstraße 1<br />
            12345 Musterstadt
          </p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
            <a href="https://ec.europa.eu/consumers/odr" className="text-blue-600 hover:underline"> https://ec.europa.eu/consumers/odr</a>.<br />
            Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
          <p className="mt-2">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>
      </div>
    </div>
  );
}
