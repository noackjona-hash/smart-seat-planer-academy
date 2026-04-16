<div className="flex items-center gap-3">
    <svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Das 3x3 Raster der Tische/Sitzplätze - symbolisiert den Smart Seat Planer [cite: 6] */}
      <rect x="2" y="2" width="10" height="10" rx="2" fill="#1e293b"/>
      <rect x="17" y="2" width="10" height="10" rx="2" fill="#1e293b"/>
      <rect x="32" y="2" width="10" height="10" rx="2" fill="#1e293b"/>
      
      <rect x="2" y="17" width="10" height="10" rx="2" fill="#1e293b"/>
      {/* Das Zentrum: Der optimierte Smart-Seat in Electric Cyan - symbolisiert die Optimierung [cite: 12] */}
      <rect x="17" y="17" width="10" height="10" rx="2" fill="#00e5ff" className="animate-pulse"/>
      <rect x="32" y="17" width="10" height="10" rx="2" fill="#1e293b"/>
      
      <rect x="2" y="32" width="10" height="10" rx="2" fill="#1e293b"/>
      <rect x="17" y="32" width="10" height="10" rx="2" fill="#1e293b"/>
      <rect x="32" y="32" width="10" height="10" rx="2" fill="#1e293b"/>
      
      {/* Verbindungslinien (Algorithmus-Vibe) [cite: 12] */}
      <path d="M12 7H17M27 7H32M7 12V17M7 27V32" stroke="#94a3b8" strokeWidth="1"/>
    </svg>
    <div className="flex flex-col leading-tight">
      <span className="text-xl font-bold text-slate-800">Smart Seat</span>
      <span className="text-sm font-light tracking-widest uppercase text-cyan-500">Planer & Academy</span>
    </div>
  </div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4333f963-cae5-42db-899d-35d8c20bac3e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
