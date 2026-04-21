"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, CreditCard, LogOut, Crown, AlertTriangle, Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isFree = profile?.licenseType === "FREE";

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans text-slate-900 flex-row">
      
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-800 text-white flex flex-col shrink-0 z-50 transform transition-transform duration-300 ease-in-out lg:transform-none ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-slate-700/50">
          <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
            Smart<span className="text-blue-500">Seat</span>
          </span>
          <button className="lg:hidden text-slate-400 p-2 -mr-2" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5"/>
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 pb-4">
          <div className="text-[0.65rem] uppercase tracking-wider px-6 py-2 text-slate-500 font-semibold mt-4">Klassen</div>
          <nav className="space-y-0.5 mt-1">
            <Link 
              href="/dashboard"
              className={`flex items-center gap-3 px-6 py-3 text-sm transition ${
                pathname === "/dashboard" ? "bg-white/10 text-white border-r-4 border-blue-500" : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              Schülerlisten & Pläne
            </Link>
            <div className="text-[0.65rem] uppercase tracking-wider px-6 py-2 text-slate-500 font-semibold mt-6">Einstellungen</div>
            <Link 
              href="/dashboard/upgrade"
              className={`flex items-center gap-3 px-6 py-3 text-sm transition ${
                pathname === "/dashboard/upgrade" ? "bg-white/10 text-white border-r-4 border-blue-500" : "text-slate-400 hover:text-white"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Lizenz & Upgrade
            </Link>

            {user?.email === 'jona.noack@outlook.de' && (
              <Link 
                href="/admin"
                className={`flex items-center gap-3 px-6 py-3 text-sm transition ${
                  pathname === "/admin" ? "bg-white/10 text-white border-r-4 border-blue-500" : "text-slate-400 hover:text-white"
                }`}
              >
                <Crown className="w-4 h-4" />
                Admin Bereich
              </Link>
            )}
          </nav>
        </div>

        <div className="p-4 mt-auto border-t border-slate-700/50 shrink-0">
          <div className="bg-slate-900 rounded-lg p-3 mb-3 text-xs">
             <div className="flex items-center gap-2 mb-1">
                Aktueller Plan:
                <span className={`px-2 py-0.5 rounded text-[0.65rem] font-bold tracking-wider ${
                  profile?.licenseType === 'ULTRA' ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {profile?.licenseType}
                </span>
             </div>
             <span className="text-slate-400 block break-all truncate">{profile?.email}</span>
          </div>
          <button 
            onClick={() => logout()}
            className="flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 font-medium p-3 rounded-lg transition w-full"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-slate-100">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 w-full">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-slate-500 hover:text-slate-900 p-2 -ml-2 rounded-lg hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-sm font-medium text-slate-500 hidden sm:flex items-center gap-2">
              Dashboard 
              {pathname !== "/dashboard" && (
                <>
                   <span className="text-slate-300">/</span> 
                   <strong className="text-slate-700">{pathname.includes("classes/") ? "Klasse" : "Upgrade"}</strong>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-1.5 border border-slate-200 rounded-full text-sm shrink-0">
            {profile?.licenseType === 'ULTRA' && (
               <span className="bg-gradient-to-br from-amber-500 to-amber-600 text-white px-2 py-0.5 rounded text-[0.65rem] font-bold hidden sm:inline-block">ULTRA</span>
            )}
            <strong className="font-semibold text-slate-800 truncate max-w-[120px] sm:max-w-none">{profile?.name || "Lehrer"}</strong>
          </div>
        </header>

        <div className="flex-1 overflow-auto overflow-x-hidden w-full relative">
          {children}
        </div>
      </main>
    </div>
  );
}
