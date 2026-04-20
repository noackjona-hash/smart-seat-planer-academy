"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Users, LayoutDashboard, Star, Check } from "lucide-react";

export default function LandingPage() {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, isLoading, authError, clearAuthError } = useAuth();
  const router = useRouter();
  
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    try {
      if (authMode === 'LOGIN') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name);
      }
    } catch (error) {
      // Handled in Context
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      {authError && (
        <div className="fixed top-0 inset-x-0 z-50 p-4 bg-rose-500 text-white flex flex-col md:flex-row items-center justify-center gap-4 text-sm shadow-md font-medium animate-in slide-in-from-top-4">
          <span>
            {authError === 'popup-blocked' 
              ? "Login blockiert! Dein Browser unterdrückt das Google-Popup." 
              : `Fehler: ${authError}`}
          </span>
          {authError === 'popup-blocked' && (
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noreferrer"
              onClick={() => clearAuthError()}
              className="bg-white text-rose-600 px-4 py-1.5 rounded-full font-bold shadow-sm hover:bg-rose-50 transition"
            >
              App in neuem Tab öffnen
            </a>
          )}
          <button onClick={() => clearAuthError()} className="ml-4 opacity-80 hover:opacity-100">
            Schließen
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="border-b border-slate-200 p-4 shrink-0 px-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
          <LayoutDashboard className="w-6 h-6" />
          <span>Smart Seat Planer</span>
        </div>
        <button 
          onClick={() => {
            setAuthMode('LOGIN');
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition"
        >
          Login / Registrieren
        </button>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-8 py-24 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-semibold border border-blue-100">
            <Star className="w-4 h-4" />
            Von Schülern für Lehrkräfte
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Stressfreie Klassen mit dem perfekten Sitzplan
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl">
            Unser KI-gestützter Algorithmus berechnet in Sekunden die optimale Sitzordnung. 
            Trenne Störenfriede, fördere Schwächere und importiere Schüler-Wünsche automatisch per Foto.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={() => {
                setAuthMode('REGISTER');
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-md font-bold text-lg shadow-sm transition flex items-center justify-center gap-2"
            >
              Kostenlos starten
            </button>
          </div>
          
          <ul className="space-y-3 pt-6">
            {['DSGVO-konform', 'PDF-Export', 'Pay-the-Difference Upgrades'].map(feature => (
              <li key={feature} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex-1 w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
              {authMode === 'LOGIN' ? 'Willkommen zurück' : 'Jetzt starten'}
            </h2>
            
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'REGISTER' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Max Mustermann"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="name@schule.de"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Passwort</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {isSubmittingAuth ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : authMode === 'LOGIN' ? 'Anmelden' : 'Konto erstellen'}
              </button>
            </form>

            <div className="text-center text-sm text-slate-600 mt-6 pt-4 border-t border-slate-100">
              {authMode === 'LOGIN' ? (
                <>Neu hier? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-blue-600 font-bold hover:underline">Registrieren</button></>
              ) : (
                <>Bereits ein Konto? <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-blue-600 font-bold hover:underline">Anmelden</button></>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
