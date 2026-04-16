"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Users, LayoutDashboard, Star, Check } from "lucide-react";

export default function LandingPage() {
  const { user, loginWithGoogle, isLoading } = useAuth();
  const router = useRouter();

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
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-slate-200 p-4 shrink-0 px-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
          <LayoutDashboard className="w-6 h-6" />
          <span>Smart Seat Planer</span>
        </div>
        <button 
          onClick={loginWithGoogle}
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
              onClick={loginWithGoogle}
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
        
        <div className="flex-1 relative w-full max-w-lg">
          <div className="absolute inset-0 bg-slate-100 rounded-xl transform rotate-3 border border-slate-200"></div>
          <div className="relative bg-white rounded-xl shadow-sm border border-slate-200 p-8 grid grid-cols-2 gap-4">
            {/* Mockup UI representation */}
            <div className="col-span-2 h-12 bg-slate-50 rounded mb-4 flex items-center px-4 gap-3 border border-slate-200">
               <div className="w-3 h-3 rounded bg-red-400"></div>
               <div className="w-3 h-3 rounded bg-amber-400"></div>
               <div className="w-3 h-3 rounded bg-green-400"></div>
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-video bg-blue-50/50 border border-blue-100 rounded flex items-center justify-center flex-col gap-2">
                <Users className="text-blue-300 w-8 h-8" />
                <div className="w-16 h-2 bg-blue-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
