import React, { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import MatchesTable from "./components/MatchesTable";
import VideoPlayer from "./components/VideoPlayer";
import AdminPanel from "./components/AdminPanel";
import PaymentSimulator from "./components/PaymentSimulator";
import { Match, User } from "./types";
import { mockFetch as fetch } from "./dbMock";
import { 
  Tv, 
  User as UserIcon, 
  Lock, 
  LogOut, 
  Crown, 
  AlertCircle, 
  Play, 
  ShieldCheck, 
  Wrench,
  Smartphone,
  ChevronRight,
  Sparkles,
  Ticket,
  ExternalLink,
  CreditCard,
  Database,
  X
} from "lucide-react";

export default function App() {
  const [page, setPage] = useState<"login" | "register" | "dashboard" | "watch" | "admin" | "payment-simulate">("login");
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  // Status Alerts
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Load States
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Operator Selection state for Papi.mg payment links
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedCheckoutProvider, setSelectedCheckoutProvider] = useState<"MVOLA" | "ORANGE_MONEY" | "AIRTEL_MONEY" | "BRED">("MVOLA");

  // Database Access and Inspection states
  const [dbContent, setDbContent] = useState<any>(null);
  const [isDbExpanded, setIsDbExpanded] = useState(false);
  const [dbJsonString, setDbJsonString] = useState("");
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbSaveSuccess, setDbSaveSuccess] = useState<string | null>(null);

  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const verifyPaymentStatus = async (payId: string, userToken: string) => {
    setIsVerifyingPayment(true);
    let attempts = 0;
    const maxAttempts = 15; // check 15 times (30 seconds)

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payments/status/${payId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success") {
            setIsVerifyingPayment(false);
            setSuccessNotice("🏆 Félicitations ! Votre paiement a été validé avec succès 🇲🇬 Votre accès Premium à vie FootStream est actif !");
            fetchUserProfile(userToken);
            return;
          } else if (data.status === "failed") {
            setIsVerifyingPayment(false);
            setErrorNotice("Échec de la validation de la transaction ou paiement refusé.");
            return;
          }
        }
      } catch (err) {
        console.error("Error checking payment status:", err);
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 2000);
      } else {
        setIsVerifyingPayment(false);
        setSuccessNotice("Paiement en cours de traitement par l'opérateur. Votre accès premium sera actif d'ici un court instant.");
        fetchUserProfile(userToken);
      }
    };

    checkStatus();
  };

  // Authenticate session from localStorage and check URL parameters on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserProfile(savedToken);

      // Check if redirected from Papi.mg checkout securely
      const urlParams = new URLSearchParams(window.location.search);
      const status = urlParams.get("status");
      const paymentId = urlParams.get("payment_id");

      if (status === "success" && paymentId) {
        verifyPaymentStatus(paymentId, savedToken);
        // Clear query parameters from address bar to keep it beautiful
        window.history.replaceState({}, document.title, "/");
      } else if (status === "cancelled" || status === "failed") {
        setErrorNotice("Le paiement a été interrompu ou annulé.");
        window.history.replaceState({}, document.title, "/");
      }
    } else {
      setPage("login");
    }
  }, []);

  // Sync matches when user changes or session starts
  useEffect(() => {
    if (token) {
      loadMatches(token);
    }
  }, [token, page]);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: authToken }
      });
      if (res.ok) {
        const userData = await res.json();
        setCurrentUser(userData);
        setPage("dashboard");
      } else {
        // Token has expired or is invalid
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  };

  const loadMatches = async (authToken: string) => {
    try {
      const res = await fetch("/api/matches", {
        headers: { Authorization: authToken || "" }
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (err) {
      console.error("Failed to load matches", err);
    }
  };

  const handleLoginSubmit = async (email: string, password: string) => {
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        setSuccessNotice("Connexion réussie !");
        setPage("dashboard");
        setTimeout(() => setSuccessNotice(null), 3000);
      } else {
        const err = await res.json();
        setErrorNotice(err.error || "Identifiants invalides");
      }
    } catch {
      setErrorNotice("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (payload: { email: string; password: string; name: string; phone: string }) => {
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        setSuccessNotice("Inscription complétée avec succès !");
        setPage("dashboard");
        setTimeout(() => setSuccessNotice(null), 3000);
      } else {
        const err = await res.json();
        setErrorNotice(err.error || "Erreur lors de la création du compte");
      }
    } catch {
      setErrorNotice("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setCurrentUser(null);
    setActiveMatchId(null);
    setActivePaymentId(null);
    setPage("login");
  };

  // Trigger Payment flow
  const handleInitiatePayment = async (provider: string = "MVOLA") => {
    if (!token) return;
    setIsCheckoutLoading(true);
    setErrorNotice(null);
    setShowCheckoutModal(false); // Hide selector modal once initiated
    
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { 
          "Authorization": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ provider, origin: window.location.origin })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          if (data.simulated) {
            // Simulated portal inside the application UI
            // Ex: format url /payment/simulate/:id
            const payId = data.checkoutUrl.split("/payment/simulate/")[1];
            setActivePaymentId(payId);
            setPage("payment-simulate");
          } else {
            // Real external Papi.mg link redirection
            window.location.href = data.checkoutUrl;
          }
        }
      } else {
        setErrorNotice("Impossible d'initier le paiement. Réessayez.");
      }
    } catch {
      setErrorNotice("Erreur de connexion au module de paiement.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  // Watch protected match check
  const handleWatchClick = (matchId: string) => {
    if (!currentUser) return;
    const isUserPremium = currentUser.isPremium || currentUser.email === "admin@exemple.com";

    if (!isUserPremium) {
      setErrorNotice("Accès refusé: Abonnez-vous d'abord à FootStream Premium (10 000 Ar à vie) !");
      setTimeout(() => setErrorNotice(null), 6000);
      return;
    }

    setActiveMatchId(matchId);
    setPage("watch");
  };

  // Developer tool logic for extreme comfort of inspection
  const handleDevForcePremium = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/payments/force-premium", {
        method: "POST",
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setSuccessNotice("Compte Premium activé instantanément via Démo !");
        setTimeout(() => setSuccessNotice(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDevLogin = async (role: "admin" | "user") => {
    const email = role === "admin" ? "admin@exemple.com" : "client_test@example.com";
    const password = role === "admin" ? "adminpassword" : "userpassword";

    setIsLoading(true);
    setErrorNotice(null);
    try {
      // First attempt to register in case of database reset, then login
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: role === "admin" ? "Admin de Demo" : "Utilisateur Test",
          phone: "+261 34 88 555 12"
        })
      });

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        setSuccessNotice(`Connecté en tant que ${role === "admin" ? "Admin" : "Abonné"} !`);
        setPage("dashboard");
        setTimeout(() => setSuccessNotice(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDatabase = async () => {
    try {
      const res = await fetch("/api/admin/database");
      if (res.ok) {
        const data = await res.json();
        setDbContent(data);
        setDbJsonString(JSON.stringify(data, null, 2));
        setDbError(null);
      }
    } catch (err) {
      console.error("Failed to fetch database", err);
    }
  };

  const handleSaveDatabase = async () => {
    try {
      setDbError(null);
      setDbSaveSuccess(null);
      let parsed;
      try {
        parsed = JSON.parse(dbJsonString);
      } catch (e: any) {
        setDbError(`Erreur de syntaxe JSON : ${e.message}`);
        return;
      }

      const res = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });

      if (res.ok) {
        setDbSaveSuccess("Base de données mise à jour !");
        setDbContent(parsed);
        if (token) {
          fetchUserProfile(token);
          loadMatches(token);
        }
        setTimeout(() => setDbSaveSuccess(null), 3000);
      } else {
        const errData = await res.json();
        setDbError(errData.error || "Impossible de sauvegarder la base de données.");
      }
    } catch {
      setDbError("Erreur lors de la sauvegarde.");
    }
  };

  const handleResetDatabase = async () => {
    setDbError(null);
    setDbSaveSuccess(null);
    try {
      const res = await fetch("/api/admin/database/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDbContent(data.db);
        setDbJsonString(JSON.stringify(data.db, null, 2));
        setDbSaveSuccess("Base de données réinitialisée !");
        
        if (token) {
          fetchUserProfile(token);
          loadMatches(token);
        }
        setTimeout(() => setDbSaveSuccess(null), 3000);
      }
    } catch {
      setDbError("Erreur lors de la réinitialisation.");
    }
  };

  const activeMatch = matches.find(m => m.id === activeMatchId);

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Banner Notice */}
      {errorNotice && (
        <div className="bg-red-500 text-white text-xs text-center py-2.5 px-4 font-bold flex items-center justify-center gap-2 relative animate-slide-down">
          <AlertCircle className="w-4 h-4" />
          <span>{errorNotice}</span>
          <button onClick={() => setErrorNotice(null)} className="absolute right-4 font-black hover:opacity-85">✕</button>
        </div>
      )}

      {successNotice && (
        <div className="bg-emerald-500 text-slate-950 text-xs text-center py-2.5 px-4 font-bold flex items-center justify-center gap-2 relative animate-slide-down">
          <ShieldCheck className="w-4 h-4" />
          <span>{successNotice}</span>
          <button onClick={() => setSuccessNotice(null)} className="absolute right-4 font-black hover:opacity-85">✕</button>
        </div>
      )}

      {/* Payment Active Verification Overlay */}
      {isVerifyingPayment && (
        <div id="payment-verifier-overlay" className="fixed inset-0 bg-[#09090B]/95 z-50 flex flex-col items-center justify-center p-6 animate-fade-in text-center">
          <div className="relative flex items-center justify-center w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <Crown className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-white tracking-tight mb-2">Vérification de votre paiement... 🇲🇬</h3>
          <p className="text-slate-400 text-xs max-w-sm leading-normal">
            Papi.mg traite la transaction et met à jour votre compte premium en temps réel. Ne fermez pas cette page.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">MVOLA / ORANGE MONEY / AIRTEL / CARD</span>
          </div>
        </div>
      )}

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-30 bg-[#121214]/90 backdrop-blur border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div 
            onClick={() => token && setPage("dashboard")} 
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="bg-emerald-500 text-slate-950 p-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/10">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                FootStream Mada
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20">
                  MVP
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Coupe du Monde à Madagascar</p>
            </div>
          </div>

          {/* User Status / Action bar */}
          {currentUser && (
            <div className="flex items-center gap-3">
              {/* Premium Status Badge */}
              {currentUser.isPremium ? (
                <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-xs font-bold shadow-inner">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  PREMIUM ENREGISTRÉ
                </div>
              ) : (
                <button
                  onClick={handleInitiatePayment}
                  disabled={isCheckoutLoading}
                  className="hidden sm:flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 px-4 py-1.5 rounded-full text-xs font-black cursor-pointer shadow-lg shadow-amber-500/10 transition"
                >
                  {isCheckoutLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Ticket className="w-3.5 h-3.5" />
                      Activer Premium (10 000 Ar)
                    </>
                  )}
                </button>
              )}

              {/* Profile Card & Log-out */}
              <div className="flex items-center gap-1.5 bg-[#09090B] border border-white/10 p-1.5 rounded-xl">
                <div className="bg-[#121214] text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="max-w-[100px] truncate">{currentUser.name}</span>
                </div>

                {currentUser.email === "admin@exemple.com" && page !== "admin" && (
                  <button
                    onClick={() => setPage("admin")}
                    className="p-1 px-2.5 text-xs font-bold text-emerald-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-emerald-500 transition cursor-pointer"
                  >
                    Admin Panel
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg transition hover:bg-slate-900 cursor-pointer"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        
        {page === "login" && (
          <LoginForm
            isLoading={isLoading}
            error={errorNotice}
            onSubmit={handleLoginSubmit}
            onNavigateToRegister={() => {
              setErrorNotice(null);
              setPage("register");
            }}
            onLoginSuccess={(authToken, user) => {
              localStorage.setItem("token", authToken);
              setToken(authToken);
              setCurrentUser(user);
              setPage("dashboard");
            }}
          />
        )}

        {page === "register" && (
          <RegisterForm
            isLoading={isLoading}
            error={errorNotice}
            onSubmit={handleRegisterSubmit}
            onNavigateToLogin={() => {
              setErrorNotice(null);
              setPage("login");
            }}
            onRegisterSuccess={(authToken, user) => {
              localStorage.setItem("token", authToken);
              setToken(authToken);
              setCurrentUser(user);
              setPage("dashboard");
            }}
          />
        )}

        {page === "dashboard" && currentUser && (
          <div className="space-y-6">
            {/* Promo Banner for non-premium */}
            {!currentUser.isPremium && currentUser.email !== "admin@exemple.com" && (
              <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-[#0A0A0C] to-[#0A0A0C]">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex gap-1 items-center bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase px-2.5 py-1 rounded">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Offre Promotionnelle Madagascar
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                    Accès Total Illimité à FootStream Mada 🇲🇬
                  </h2>
                  <p className="text-sm text-slate-300">
                    Bénéficiez d'une retransmission fluide en direct des 64 matchs de la Coupe du Monde avec un coût d'activation unique de{" "}
                    <span className="font-bold text-amber-400">10 000 Ar</span> payable par MVola, Orange Money ou Airtel Money. Aucun abonnement récurrent.
                  </p>
                </div>
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  disabled={isCheckoutLoading}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm py-4 px-8 rounded-xl cursor-pointer shadow-lg shadow-amber-500/10 transition shrink-0 flex items-center justify-center gap-2"
                >
                  {isCheckoutLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 fill-slate-950" />
                      Acheter l'accès à 10 000 Ar
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Matches list */}
            <MatchesTable
              matches={matches}
              isPremium={currentUser.isPremium || currentUser.email === "admin@exemple.com"}
              onWatchMatch={handleWatchClick}
              onTriggerPremium={() => setShowCheckoutModal(true)}
            />
          </div>
        )}

        {page === "watch" && activeMatchId && currentUser && (
          <div className="space-y-6">
            {/* Immersive View Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage("dashboard")}
                className="text-xs font-bold text-slate-300 hover:text-emerald-400 flex items-center gap-1.5 transition cursor-pointer"
              >
                ← Quitter le visionnage
              </button>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pink shrink-0 animate-pulse" />
                Flux HD {activeMatch?.status === "live" ? "Direct" : "Replay"}
              </div>
            </div>

            {/* Main Video Arena */}
            <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl overflow-hidden p-4 md:p-6 shadow-2xl">
              <div className="mb-4">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  {activeMatch?.competition}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3 mt-1">
                  <span>{activeMatch?.homeFlag} {activeMatch?.homeTeam}</span>
                  <span className="text-slate-500 font-medium text-xs py-0.5 px-1 bg-slate-950 rounded border border-slate-850">vs</span>
                  <span>{activeMatch?.awayFlag} {activeMatch?.awayTeam}</span>
                </h2>
              </div>

              {activeMatch ? (
                <VideoPlayer
                  url={activeMatch.videoUrl}
                  title={`${activeMatch.homeTeam} vs ${activeMatch.awayTeam}`}
                />
              ) : (
                <p className="text-slate-500 text-sm py-12 text-center">Aucun flux disponible</p>
              )}
            </div>
          </div>
        )}

        {page === "payment-simulate" && activePaymentId && (
          <PaymentSimulator
            paymentId={activePaymentId}
            userPhone={currentUser?.phone}
            userName={currentUser?.name}
            onPaymentCancel={() => {
              setActivePaymentId(null);
              setPage("dashboard");
            }}
            onPaymentSuccess={async () => {
              setActivePaymentId(null);
              if (token) {
                // Refresh profile to pull down fresh isPremium field from server
                await fetchUserProfile(token);
              }
              setPage("dashboard");
            }}
          />
        )}

        {page === "admin" && token && currentUser?.email === "admin@exemple.com" && (
          <AdminPanel
            token={token}
            onNavigateBack={() => setPage("dashboard")}
          />
        )}

      </main>

      {/* Papi.mg Payment Selection Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowCheckoutModal(false)}
          />
          
          {/* Content Modal Card */}
          <div className="relative w-full max-w-md bg-[#0C0C0E] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-slate-100 overflow-hidden">
            {/* Elegant Background Accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl" />
            
            {/* Header */}
            <div className="flex items-start justify-between relative mb-6">
              <div>
                <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full w-fit">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Passer Premium
                </div>
                <h3 className="text-xl font-black text-white tracking-tight mt-2.5">
                  Moyen de paiement papi.mg
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Coût unique d'activation : <span className="font-extrabold text-amber-400 font-mono text-xs">10 000 Ar</span>
                </p>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="bg-[#121214] hover:bg-[#1A1A1E] border border-white/5 rounded-full p-2 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector list of providers */}
            <div className="space-y-3 mb-6 relative">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                Choisissez votre opérateur ou carte
              </span>

              {/* MVola Option */}
              <button
                type="button"
                onClick={() => setSelectedCheckoutProvider("MVOLA")}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition text-left cursor-pointer ${
                  selectedCheckoutProvider === "MVOLA"
                    ? "border-amber-500 bg-amber-500/5 text-slate-100"
                    : "border-white/5 bg-[#09090B] hover:border-white/10 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center font-black text-amber-500 text-xs">
                    MV
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-white block">MVola (Telma)</span>
                    <span className="block text-[10px] text-slate-400">Paiement Mobile National</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedCheckoutProvider === "MVOLA" ? "border-amber-500 bg-amber-500" : "border-slate-600"
                }`}>
                  {selectedCheckoutProvider === "MVOLA" && <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                </div>
              </button>

              {/* Orange Money Option */}
              <button
                type="button"
                onClick={() => setSelectedCheckoutProvider("ORANGE_MONEY")}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition text-left cursor-pointer ${
                  selectedCheckoutProvider === "ORANGE_MONEY"
                    ? "border-orange-500 bg-orange-500/5 text-slate-100"
                    : "border-white/5 bg-[#09090B] hover:border-white/10 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center font-black text-orange-500 text-xs">
                    OM
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-white block">Orange Money</span>
                    <span className="block text-[10px] text-slate-400">Paiement Mobile National</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedCheckoutProvider === "ORANGE_MONEY" ? "border-orange-500 bg-orange-500" : "border-slate-600"
                }`}>
                  {selectedCheckoutProvider === "ORANGE_MONEY" && <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                </div>
              </button>

              {/* Airtel Money Option */}
              <button
                type="button"
                onClick={() => setSelectedCheckoutProvider("AIRTEL_MONEY")}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition text-left cursor-pointer ${
                  selectedCheckoutProvider === "AIRTEL_MONEY"
                    ? "border-rose-500 bg-rose-500/5 text-slate-100"
                    : "border-white/5 bg-[#09090B] hover:border-white/10 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center font-black text-rose-500 text-xs">
                    AM
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-white block">Airtel Money</span>
                    <span className="block text-[10px] text-slate-400">Paiement Mobile National</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedCheckoutProvider === "AIRTEL_MONEY" ? "border-rose-500 bg-rose-500" : "border-slate-600"
                }`}>
                  {selectedCheckoutProvider === "AIRTEL_MONEY" && <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                </div>
              </button>

              {/* Visa Option (BRED) */}
              <button
                type="button"
                onClick={() => setSelectedCheckoutProvider("BRED")}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition text-left cursor-pointer ${
                  selectedCheckoutProvider === "BRED"
                    ? "border-indigo-500 bg-indigo-500/5 text-slate-100"
                    : "border-white/5 bg-[#09090B] hover:border-white/10 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center font-black text-indigo-400 text-xs">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-white block">Carte VISA / Mastercard</span>
                    <span className="block text-[10px] text-slate-400">Paiement CB via Papi.mg BRED</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedCheckoutProvider === "BRED" ? "border-indigo-500 bg-indigo-500" : "border-slate-600"
                }`}>
                  {selectedCheckoutProvider === "BRED" && <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                </div>
              </button>
            </div>

            {/* Progress Actions */}
            <div className="space-y-3 relative">
              <button
                type="button"
                disabled={isCheckoutLoading}
                onClick={() => handleInitiatePayment(selectedCheckoutProvider)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 font-extrabold text-xs text-slate-950 uppercase tracking-widest py-3.5 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/10 transition flex items-center justify-center gap-2"
              >
                {isCheckoutLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Générer le lien sécurisé</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              
              <div className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Sécurisé par la passerelle de paiement papi.mg</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Developer/Judge Playground Overlay */}
      <footer className="mt-auto py-12 border-t border-white/5 bg-[#09090B]">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs font-semibold">
            <span>MVP FootStream Mada © 2026</span>
            <span>•</span>
            <span className="text-emerald-500">Antananarivo, Madagascar</span>
          </div>

          {/* Dev Inspection Dock Card */}
          <div className="bg-[#0C0C0E] border border-white/5 p-5 rounded-2xl shadow-xl max-w-2xl mx-auto text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Wrench className="w-5 h-5 text-emerald-400" />
                <span>Outils facilités de Test & Démonstration</span>
              </div>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                Dev Mode
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Pour vous simplifier l'examen du MVP, utilisez ces boutons pour sauter les barrières d'authentification ou forcer les statuts de paiement en un clic :
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleDevLogin("admin")}
                className="bg-slate-800 text-white hover:bg-slate-755 hover:border-emerald-500 border border-slate-700 text-xs py-2.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                🔑 Connexion Admin
              </button>
              
              <button
                onClick={() => handleDevLogin("user")}
                className="bg-slate-800 text-white hover:bg-slate-755 hover:border-emerald-500 border border-slate-700 text-xs py-2.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                👤 Connexion Client Test
              </button>

              <button
                onClick={handleDevForcePremium}
                disabled={!currentUser}
                title={!currentUser ? "Connectez-vous d'abord" : "Accorder le statut Premium à vie"}
                className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-xs py-2.5 px-3 rounded-lg font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👑 Devenir Premium (Test)
              </button>
            </div>
            
            <div className="text-[10px] text-slate-500 text-center leading-normal">
              Utilise le mail officiel admin hardcodé <code className="bg-slate-950 p-1 text-red-400 rounded">admin@exemple.com</code> pour débloquer la vue <code className="bg-slate-950 p-1 text-slate-300 rounded font-mono">/admin</code>.
            </div>

            {/* Direct Database access panel requested by developer */}
            <div className="mt-4 border-t border-white/5 pt-4">
              <button
                onClick={() => {
                  const n = !isDbExpanded;
                  setIsDbExpanded(n);
                  if (n) fetchDatabase();
                }}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition py-1"
              >
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>📁 Inspecter & Modifier la base de données (JSON direct)</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isDbExpanded ? "rotate-90" : ""}`} />
              </button>

              {isDbExpanded && (
                <div className="mt-3 space-y-3 animate-fade-in text-xs">
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Faites des modifications directement dans la structure JSON ci-dessous (modifier/supprimer les utilisateurs, changer les matches, ou forcer des paiements). Votre base est enregistrée sur <code className="bg-slate-950 p-0.5 text-slate-300 rounded font-mono">database.json</code> :
                  </p>

                  <textarea
                    value={dbJsonString}
                    onChange={(e) => setDbJsonString(e.target.value)}
                    rows={10}
                    className="w-full bg-[#09090B] border border-white/5 rounded-xl p-3 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                    placeholder="Chargement ou édition de database.json..."
                  />

                  {dbError && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{dbError}</span>
                    </div>
                  )}

                  {dbSaveSuccess && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{dbSaveSuccess}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center gap-2 pt-1 border-t border-white/5">
                    <button
                      onClick={fetchDatabase}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold py-1.5 px-3 rounded-lg transition cursor-pointer"
                    >
                      🔄 Recharger
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={handleResetDatabase}
                        className="bg-red-500/10 hover:bg-red-50 hover:text-white border border-red-500/20 text-red-400 text-[11px] font-bold py-1.5 px-3 rounded-lg transition cursor-pointer"
                      >
                        ⚠️ Réinitialiser Tout
                      </button>
                      <button
                        onClick={handleSaveDatabase}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-extrabold py-1.5 px-4 rounded-lg transition shadow shadow-emerald-500/10 cursor-pointer"
                      >
                        💾 Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
