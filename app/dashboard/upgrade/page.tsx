"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { Check, Crown, Key, ExternalLink } from "lucide-react";
import { LicenseType } from "@/contexts/AuthContext";

const TIERS = [
  {
    name: "FREE",
    price: 0,
    features: ["Max. 1 Klasse", "Werbung eingeblendet", "Basisfunktionen"],
    color: "bg-gray-100 text-gray-800"
  },
  {
    name: "STARTER",
    price: 10,
    features: ["Werbefrei", "Unbegrenzte Klassen", "Automatischer Sitzplan"],
    color: "bg-blue-100 text-blue-800"
  },
  {
    name: "BASIC",
    price: 25,
    features: ["Alle Starter Features", "Sitzplan PDF-Export", "Seminar-Geschenk-Option"],
    color: "bg-green-100 text-green-800"
  },
  {
    name: "PRO",
    price: 35,
    features: ["Alle Basic Features", "Cloud-Sync", "1x Einzel-Coaching inklusive"],
    color: "bg-purple-100 text-purple-800"
  },
  {
    name: "ULTRA",
    price: 50,
    features: ["Alle Pro Features", "Sitzplan Magic-Photo-Import", "1x Einzel-Coaching inklusive"],
    popular: true,
    color: "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300"
  }
];

export default function UpgradePage() {
  const { user, profile } = useAuth();
  const [licenseKey, setLicenseKey] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const currentPrice = profile?.originalPricePaid || 0;
  const currentTier = profile?.licenseType || "FREE";

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim() || !user) return;
    
    setRedeeming(true);
    setMessage({ text: "", type: "" });
    try {
      const q = query(collection(db, "licenseKeys"), where("key", "==", licenseKey.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setMessage({ text: "Lizenzschlüssel ungültig oder nicht gefunden.", type: "error" });
        setRedeeming(false);
        return;
      }

      const keyDoc = snap.docs[0];
      const keyData = keyDoc.data();

      if (keyData.isUsed) {
        setMessage({ text: "Dieser Schlüssel wurde bereits verwendet.", type: "error" });
        setRedeeming(false);
        return;
      }

      const targetTier = keyData.type as LicenseType;
      const targetTierConfig = TIERS.find(t => t.name === targetTier);
      const newPrice = targetTierConfig?.price || 0;

      // Mark key as used
      await updateDoc(doc(db, "licenseKeys", keyDoc.id), {
        isUsed: true,
        assignedTo: user.uid
      });

      // Upgrade user
      await updateDoc(doc(db, "users", user.uid), {
        licenseType: targetTier,
        licenseKey: keyData.key,
        originalPricePaid: newPrice
      });

      setMessage({ text: `Erfolgreich auf ${targetTier} geupgradet!`, type: "success" });
      setLicenseKey("");
      
    } catch (e) {
      console.error(e);
      setMessage({ text: "Fehler beim Einlösen des Schlüssels.", type: "error" });
    }
    setRedeeming(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lizenzen & Upgrades</h1>
        <p className="text-slate-500 mt-2 text-sm">Profitiere von unserem flexiblen Pay-the-Difference-Modell.</p>
      </div>

      {/* Code Redemption */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" />
            Schlüssel einlösen
          </h3>
          <p className="text-sm text-slate-500 mt-1">Hast du einen Lizenzcode erhalten? Gib ihn hier ein.</p>
        </div>
        <form onSubmit={handleRedeem} className="flex gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="XXXX-XXXX-XXXX-XXXX" 
            value={licenseKey}
            onChange={e => setLicenseKey(e.target.value.toUpperCase())}
            className="border border-slate-300 rounded-lg px-4 py-2 font-mono outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
          <button 
            type="submit" 
            disabled={redeeming || !licenseKey}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition"
          >
            {redeeming ? "Wird geprüft..." : "Einlösen"}
          </button>
        </form>
      </div>
      
      {message.text && (
        <div className={`p-4 rounded-lg font-medium text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Pricing Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-6">Wähle dein Upgrade</h2>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          {TIERS.map(tier => {
            const isCurrent = currentTier === tier.name;
            const canUpgrade = tier.price > currentPrice;
            const diffPrice = tier.price - currentPrice;

            return (
              <div 
                key={tier.name} 
                className={`relative bg-white rounded-2xl border-2 flex flex-col p-6 shadow-sm ${
                  tier.popular ? 'border-amber-400' : isCurrent ? 'border-blue-500' : 'border-slate-100 hover:border-slate-300'
                } transition-all`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-br from-amber-500 to-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    Unser Bestseller
                  </div>
                )}
                
                <div className="mb-4">
                  <span className={`inline-block px-2 py-1 rounded text-[0.65rem] tracking-wider uppercase font-bold ${tier.color} mb-3`}>
                    {tier.name}
                  </span>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {tier.price}€
                  </div>
                  {canUpgrade && !isCurrent && diffPrice > 0 && (
                    <div className="text-blue-500 text-xs font-semibold mt-1">
                      Upgrade für nur +{diffPrice}€
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="text-xs text-slate-600 flex items-start gap-2">
                       <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                       <span className="leading-tight">{f}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  disabled={isCurrent || !canUpgrade}
                  onClick={() => alert(`Kauf-Simulation für das ${tier.name} Upgrade (Preis: ${diffPrice}€) gestartet.`)}
                  className={`w-full py-2.5 rounded-lg font-bold text-sm transition ${
                    isCurrent 
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed' 
                      : !canUpgrade 
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                      : tier.popular 
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:opacity-90 shadow-sm'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  {isCurrent ? "Deine Lizenz" : canUpgrade ? `Upgrade auf ${tier.name}` : "Enthalten"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
