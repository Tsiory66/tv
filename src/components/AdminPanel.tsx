import React, { useState, useEffect } from "react";
import { Match, MatchStatus } from "../types";
import { Plus, Edit2, Trash2, ShieldAlert, Check, RefreshCw, PlusCircle, ArrowLeft, HelpCircle, Server, Copy, CheckSquare } from "lucide-react";
import { supabase } from "../lib/supabase";

interface AdminPanelProps {
  token: string;
  onNavigateBack: () => void;
}

interface Team {
  name: string;
  flag: string;
}

export default function AdminPanel({ token, onNavigateBack }: AdminPanelProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [newsTeamName, setNewTeamName] = useState("");
  const [newTeamFlag, setNewTeamFlag] = useState("🏳️");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMs, setErrorMs] = useState<string | null>(null);
  const [successMs, setSuccessMs] = useState<string | null>(null);

  // Supabase Diagnose States
  const [showSupabaseGuide, setShowSupabaseGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isInjectingDemo, setIsInjectingDemo] = useState(false);
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    profilesOk: boolean | null;
    matchesOk: boolean | null;
    paymentsOk: boolean | null;
    teamsOk: boolean | null;
  }>({
    connected: false,
    profilesOk: null,
    matchesOk: null,
    paymentsOk: null,
    teamsOk: null,
  });

  // Match Form States
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [homeTeam, setHomeTeam] = useState("");
  const [homeFlag, setHomeFlag] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [awayFlag, setAwayFlag] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [competition, setCompetition] = useState("Coupe du Monde 2026");
  const [status, setStatus] = useState<MatchStatus>("upcoming");
  const [videoUrl, setVideoUrl] = useState("");

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches", {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (err) {
      console.error("Error loading matches", err);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        if (data.length > 0) {
          // Set initial values
          if (!homeTeam) {
            setHomeTeam(data[0].name);
            setHomeFlag(data[0].flag);
          }
          if (!awayTeam) {
            setAwayTeam(data[1]?.name || data[0].name);
            setAwayFlag(data[1]?.flag || data[0].flag);
          }
        }
      }
    } catch (err) {
      console.error("Error loading teams", err);
    }
  };

  const checkSupabaseTables = async () => {
    if (!supabase) {
      setDbStatus({
        connected: false,
        profilesOk: false,
        matchesOk: false,
        paymentsOk: false,
        teamsOk: false,
      });
      return;
    }
    try {
      const { error: profErr } = await supabase.from("profiles").select("*").limit(1);
      const { error: matchErr } = await supabase.from("matches").select("*").limit(1);
      const { error: payErr } = await supabase.from("payments").select("*").limit(1);
      const { error: teamErr } = await supabase.from("custom_teams").select("*").limit(1);

      setDbStatus({
        connected: true,
        profilesOk: !profErr || (profErr.code !== "PGRST116" && profErr.code !== "42P01"),
        matchesOk: !matchErr || matchErr.code !== "42P01",
        paymentsOk: !payErr || payErr.code !== "42P01",
        teamsOk: !teamErr || teamErr.code !== "42P01",
      });
    } catch (e) {
      setDbStatus({
        connected: true,
        profilesOk: true,
        matchesOk: true,
        paymentsOk: true,
        teamsOk: true,
      });
    }
  };

  useEffect(() => {
    fetchMatches();
    fetchTeams();
    checkSupabaseTables();
  }, [token]);

  // Adjust flags automatically when selecting a team
  const handleTeamChange = (type: "home" | "away", teamName: string) => {
    const selected = teams.find(t => t.name === teamName);
    if (selected) {
      if (type === "home") {
        setHomeTeam(teamName);
        setHomeFlag(selected.flag);
      } else {
        setAwayTeam(teamName);
        setAwayFlag(selected.flag);
      }
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTeamName) return;
    try {
      setIsLoading(true);
      setErrorMs(null);
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ name: newsTeamName, flag: newTeamFlag }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeams(prev => [...prev, data.team]);
        setNewTeamName("");
        setNewTeamFlag("🏳️");
        setSuccessMs("Équipe ajoutée aux options !");
        setTimeout(() => setSuccessMs(null), 3000);
      } else {
        const data = await res.json();
        setErrorMs(data.error || "Impossible d'ajouter l'équipe");
      }
    } catch {
      setErrorMs("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setMatchDate("");
    setCompetition("Coupe du Monde 2026");
    setStatus("upcoming");
    setVideoUrl("");
    if (teams.length > 1) {
      setHomeTeam(teams[0].name);
      setHomeFlag(teams[0].flag);
      setAwayTeam(teams[1].name);
      setAwayFlag(teams[1].flag);
    }
  };

  const handleMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMs(null);
    setSuccessMs(null);

    if (!homeTeam || !awayTeam || !matchDate || !videoUrl || !competition) {
      setErrorMs("Veuillez remplir tous les champs du match.");
      return;
    }

    if (homeTeam === awayTeam) {
      setErrorMs("Le club à domicile et l'extérieur ne peuvent pas être identiques.");
      return;
    }

    setIsLoading(true);
    const endpoint = isEditing ? `/api/matches/${editingId}` : "/api/matches";
    const method = isEditing ? "PUT" : "POST";

    try {
      // Local ISO verification
      const isoDate = new Date(matchDate).toISOString();
      const payload = {
        date: isoDate,
        homeTeam,
        homeFlag,
        awayTeam,
        awayFlag,
        competition,
        status,
        videoUrl,
      };

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMs(isEditing ? "Match mis à jour avec succès !" : "Match créé avec succès !");
        resetForm();
        fetchMatches();
        setTimeout(() => setSuccessMs(null), 3000);
      } else {
        const err = await res.json();
        setErrorMs(err.error || "Une erreur s'est produite");
      }
    } catch (err) {
      setErrorMs("Erreur de communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInit = (match: Match) => {
    setIsEditing(true);
    setEditingId(match.id);
    setHomeTeam(match.homeTeam);
    setHomeFlag(match.homeFlag);
    setAwayTeam(match.awayTeam);
    setAwayFlag(match.awayFlag);
    
    // Format to datetime-local friendly format
    try {
      const d = new Date(match.date);
      // Offset local string
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - offset * 60 * 1000);
      setMatchDate(localDate.toISOString().slice(0, 16));
    } catch {
      setMatchDate("");
    }

    setCompetition(match.competition);
    setStatus(match.status);
    setVideoUrl(match.videoUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce match ?")) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/matches/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });

      if (res.ok) {
        setSuccessMs("Match supprimé !");
        fetchMatches();
        setTimeout(() => setSuccessMs(null), 3000);
      } else {
        const err = await res.json();
        setErrorMs(err.error || "Impossible de supprimer");
      }
    } catch {
      setErrorMs("Erreur serveur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDemoMatches = async () => {
    try {
      setIsInjectingDemo(true);
      setErrorMs(null);
      setSuccessMs(null);
      const res = await fetch("/api/admin/database/reset", {
        method: "POST",
        headers: { Authorization: token }
      });
      if (res.ok) {
        setSuccessMs("Les matchs de démonstration ont été injectés et synchronisés sur Supabase !");
        fetchMatches();
      } else {
        const err = await res.json();
        setErrorMs(err.error || "Échec de l'injection des données de démonstration. Vérifiez que vos tables existent.");
      }
    } catch {
      setErrorMs("Erreur de communication lors de l'injection.");
    } finally {
      setIsInjectingDemo(false);
    }
  };

  return (
    <div className="space-y-8 font-sans pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0C0C0E] border border-white/5 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/10 text-red-400 p-3 rounded-xl border border-red-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Espace Admin de FootStream</h2>
            <p className="text-xs text-slate-400 mt-1">
              Gérez les matchs en live, programmez de futures diffusions et ajoutez des pays
            </p>
          </div>
        </div>
        <button
          onClick={onNavigateBack}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-755 border border-white/5 px-4 py-2.5 rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au Dashboard
        </button>
      </div>

      {/* SUPABASE DIAGNOSTIC & BOOTSTRAPPING BLOCK */}
      <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/15 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/10">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Liaison Base de Données Supabase
                <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                  dbStatus.connected 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                }`}>
                  {dbStatus.connected ? "Connecté (En direct)" : "Simulation Locale active"}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {dbStatus.connected 
                  ? "Votre application est activement connectée à Supabase." 
                  : "Aucune information d'identification ou .env vide. L'application utilise le moteur autonome local."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSupabaseGuide(!showSupabaseGuide)}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
          >
            {showSupabaseGuide ? "Masquer " : "Afficher "}les diagnostics & migrations
          </button>
        </div>

        {/* Real-time Connection Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/40 p-4 rounded-xl border border-white/5.5">
          <div className="space-y-1">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Table Profiles (Users)</span>
            <span className={`text-[11px] font-bold inline-flex items-center gap-1.5 ${
              dbStatus.profilesOk === null ? "text-slate-400" : dbStatus.profilesOk ? "text-emerald-400" : "text-rose-400"
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                dbStatus.profilesOk === null ? "bg-slate-400 animate-pulse" : dbStatus.profilesOk ? "bg-emerald-400" : "bg-rose-400"
              }`} />
              {dbStatus.profilesOk === null ? "Vérification..." : dbStatus.profilesOk ? "Créée (Active)" : "Non existante ⚠️"}
            </span>
          </div>

          <div className="space-y-1">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Table Matches (Streams)</span>
            <span className={`text-[11px] font-bold inline-flex items-center gap-1.5 ${
              dbStatus.matchesOk === null ? "text-slate-400" : dbStatus.matchesOk ? "text-emerald-400" : "text-rose-400"
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                dbStatus.matchesOk === null ? "bg-slate-400 animate-pulse" : dbStatus.matchesOk ? "bg-emerald-400" : "bg-rose-400"
              }`} />
              {dbStatus.matchesOk === null ? "Vérification..." : dbStatus.matchesOk ? "Créée (Active)" : "Non existante ⚠️"}
            </span>
          </div>

          <div className="space-y-1">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Table Payments</span>
            <span className={`text-[11px] font-bold inline-flex items-center gap-1.5 ${
              dbStatus.paymentsOk === null ? "text-slate-400" : dbStatus.paymentsOk ? "text-emerald-400" : "text-rose-400"
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                dbStatus.paymentsOk === null ? "bg-slate-400 animate-pulse" : dbStatus.paymentsOk ? "bg-emerald-400" : "bg-rose-400"
              }`} />
              {dbStatus.paymentsOk === null ? "Vérification..." : dbStatus.paymentsOk ? "Créée (Active)" : "Non existante ⚠️"}
            </span>
          </div>

          <div className="space-y-1">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Table Custom Teams</span>
            <span className={`text-[11px] font-bold inline-flex items-center gap-1.5 ${
              dbStatus.teamsOk === null ? "text-slate-400" : dbStatus.teamsOk ? "text-emerald-400" : "text-rose-400"
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                dbStatus.teamsOk === null ? "bg-slate-400 animate-pulse" : dbStatus.teamsOk ? "bg-emerald-400" : "bg-rose-400"
              }`} />
              {dbStatus.teamsOk === null ? "Vérification..." : dbStatus.teamsOk ? "Créée (Active)" : "Non existante ⚠️"}
            </span>
          </div>
        </div>

        {showSupabaseGuide && (
          <div className="space-y-6 pt-2 border-t border-white/5 animate-fade-in block">
            {/* Guide Step 1: SQL Migrations */}
            <div className="bg-[#09090B] border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Étape 1 : Exécuter la migration SQL des Tables</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Copiez le script ci-dessous et collez-le directement dans votre éditeur de requêtes SQL Supabase pour créer vos tables en 2 secondes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sql = `-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_flag TEXT,
  away_flag TEXT,
  competition TEXT NOT NULL,
  status TEXT DEFAULT 'upcoming'::text NOT NULL CHECK (status IN ('upcoming', 'live', 'finished')),
  video_url TEXT NOT NULL
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches are viewable by anyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Matches can only be managed by administrators" ON public.matches FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND email = 'admin@exemple.com'
  )
);

-- 3. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC DEFAULT 10000 NOT NULL,
  status TEXT DEFAULT 'pending'::text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  papi_reference TEXT,
  provider TEXT DEFAULT 'MVOLA'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payment histories" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can record their own checkout records" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service Role and internal systems handle administrative updates" ON public.payments FOR ALL USING (true);

-- 4. CUSTOM TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.custom_teams (
  name TEXT PRIMARY KEY,
  flag TEXT DEFAULT '🏳️'::text NOT NULL
);

ALTER TABLE public.custom_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams are viewable by everyone" ON public.custom_teams FOR SELECT USING (true);
CREATE POLICY "Anyone can submit country listings" ON public.custom_teams FOR INSERT WITH CHECK (true);`;
                    navigator.clipboard.writeText(sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-extrabold uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition shrink-0"
                >
                  {copiedSql ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copier le script SQL
                    </>
                  )}
                </button>
              </div>

              {/* Console Quicklink block */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-xs">
                <span className="font-semibold text-emerald-400">🔗 Lien Direct :</span>
                <a
                  href="https://supabase.com/dashboard/project/egfpginsadncgkxrvmdu/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-emerald-400 underline decoration-emerald-500/40 hover:decoration-emerald-450 transition font-mono font-bold"
                >
                  Ouvrir l'Éditeur SQL Supabase (Project egfpginsadncgkxrvmdu) ↗
                </a>
              </div>

              <pre className="p-4 bg-black/60 rounded-xl overflow-x-auto text-[10px] font-mono text-slate-300 max-h-48 border border-white/5 scrollbar-thin">
{`-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Row Level Security & Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_flag TEXT,
  away_flag TEXT,
  competition TEXT NOT NULL,
  status TEXT DEFAULT 'upcoming'::text NOT NULL CHECK (status IN ('upcoming', 'live', 'finished')),
  video_url TEXT NOT NULL
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches are viewable by anyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Matches can only be managed by administrators" ON public.matches FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND email = 'admin@exemple.com'
  )
);

-- 3. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC DEFAULT 10000 NOT NULL,
  status TEXT DEFAULT 'pending'::text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  papi_reference TEXT,
  provider TEXT DEFAULT 'MVOLA'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payment histories" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can record their own checkout records" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service Role and internal systems handle administrative updates" ON public.payments FOR ALL USING (true);`}
              </pre>
            </div>

            {/* Guide Step 2: Edge Function / Webhook setup instructions */}
            <div className="bg-[#09090B] border border-white/5 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Étape 2 : Activer le Webhook automatique (Edge Function)</h4>
              <p className="text-[11px] text-slate-400">
                Papi.mg envoie les notifications de transaction validée par les opérateurs télécoms (Mvola / Orange Money / Airtel Money) directement sur votre application à distance.
              </p>

              <div className="p-4 bg-slate-900 rounded-xl space-y-3.5 border border-white/5 text-xs text-slate-300">
                <p className="font-semibold text-white">Pour configurer la réception automatique des webhooks :</p>
                <ol className="list-decimal list-inside space-y-2 text-[11px] leading-relaxed">
                  <li>
                    Associez l'URL de l'application suivante au panneau des webhooks Papi.mg : <br/>
                    <code className="text-emerald-400 font-mono text-[10px] bg-slate-950 p-1 rounded inline-block mt-1">
                      https://ais-dev-yrldp6fomnsbie4efeqe7v-912734035616.europe-west2.run.app/api/payments/webhook
                    </code>
                  </li>
                  <li>
                    Cette URL de webhook interceptera les notifications d'achat Premium et passera automatiquement l'abonné à Premium <strong className="text-emerald-400">isPremium: true</strong> dans votre table <code className="font-mono text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">profiles</code>.
                  </li>
                  <li>
                    Si vous souhaitez déployer une <strong>Edge Function Supabase</strong> directement pour déléguer la logique : utilisez la commande CLI suivante : <br/>
                    <code className="text-slate-400 font-mono text-[10px] bg-slate-950 p-2 rounded block mt-1.5 border border-white/5 whitespace-pre overflow-x-auto">
                      supabase functions deploy papi-webhook --project-ref egfpginsadncgkxrvmdu
                    </code>
                  </li>
                </ol>
              </div>
            </div>

            {/* Demo Injector helper */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-400">Importer les Matchs initiaux sur Supabase</h4>
                <p className="text-[11px] text-slate-400">
                  Une fois vos tables créées, cliquez sur ce bouton pour injecter instantanément 4 matchs de démonstration en direct et programmés dans votre projet Supabase !
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDemoMatches}
                disabled={isInjectingDemo || !dbStatus.connected}
                className="inline-flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black hover:border-transparent text-[10px] font-black uppercase tracking-widest px-4.5 py-3 rounded-lg cursor-pointer border border-emerald-500/30 transition shadow-md shrink-0"
              >
                {isInjectingDemo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Injection...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Injecter les Matchs de Démo
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {(errorMs || successMs) && (
        <div className="grid grid-cols-1 gap-4">
          {errorMs && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>{errorMs}</span>
            </div>
          )}
          {successMs && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMs}</span>
            </div>
          )}
        </div>
      )}

      {/* Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MATCH CREATING / UPDATING FORM */}
        <div className="lg:col-span-2 bg-[#0C0C0E] border border-white/5 rounded-2xl p-6.5 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            {isEditing ? "Modifier les détails du match" : "Créer un nouveau match"}
          </h3>

          <form onSubmit={handleMatchSubmit} className="space-y-5">
            {/* Nations Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Home Team */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Équipe Domicile
                </label>
                <div className="flex gap-2">
                  <div className="bg-[#09090B] border border-white/10 text-2xl h-12 w-12 rounded-xl flex items-center justify-center select-none shadow">
                    {homeFlag || "🏳️"}
                  </div>
                  <select
                    value={homeTeam}
                    onChange={(e) => handleTeamChange("home", e.target.value)}
                    className="flex-1 h-12 bg-[#09090B] border border-white/10 rounded-xl px-3 text-sm text-white focus:border-emerald-500 outline-none transition"
                  >
                    {teams.map((t) => (
                      <option key={`home-${t.name}`} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Away Team */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Équipe Extérieur
                </label>
                <div className="flex gap-2">
                  <div className="bg-[#09090B] border border-white/10 text-2xl h-12 w-12 rounded-xl flex items-center justify-center select-none shadow">
                    {awayFlag || "🏳️"}
                  </div>
                  <select
                    value={awayTeam}
                    onChange={(e) => handleTeamChange("away", e.target.value)}
                    className="flex-1 h-12 bg-[#09090B] border border-white/10 rounded-xl px-3 text-sm text-white focus:border-emerald-500 outline-none transition"
                  >
                    {teams.map((t) => (
                      <option key={`away-${t.name}`} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date, Competition and Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Date & Heure Locales
                </label>
                <input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full bg-[#09090B] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Compétition
                </label>
                <input
                  type="text"
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  placeholder="Ex : Coupe du Monde 2026"
                  className="w-full bg-[#09090B] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Statut du Match
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MatchStatus)}
                  className="w-full h-11 bg-[#09090B] border border-white/10 rounded-xl px-3 text-sm text-white focus:border-emerald-500 outline-none transition"
                >
                  <option value="upcoming">⏱️ À venir</option>
                  <option value="live">🔴 En Direct (Live)</option>
                  <option value="finished">📼 Terminé (Replay)</option>
                </select>
              </div>
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Lien Canal de Visionnage / URL Vidéo</span>
                <span className="text-[9px] text-slate-500 lowercase">HLS (.m3u8), MP4 (.mp4), ou Iframe</span>
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Ex : https://test-streams.mux.dev/x36xhg/main.m3u8 ou lien Youtube embed"
                className="w-full bg-[#09090B] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                Vous pouvez saisir une balise iframe complète, ou un simple lien d'un média MP4 de test.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-xs py-3.5 px-4 rounded-xl transition cursor-pointer shadow flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : isEditing ? (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Enregistrer les modifications
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Publier le match
                  </>
                )}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-transparent hover:bg-white/5 border border-white/10 text-slate-400 hover:text-white font-bold py-3 px-4 rounded-xl transition cursor-pointer text-xs uppercase tracking-widest"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>

        {/* NOUVELLE ÉQUIPE FORM */}
        <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-6 shadow-xl h-fit space-y-6">
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2 pb-1 border-b border-white/5">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            Ajouter un pays
          </h3>

          <form onSubmit={handleAddTeam} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Nom du Pays
              </label>
              <input
                type="text"
                value={newsTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ex : Afrique du Sud"
                className="w-full bg-[#09090B] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Drapeau (Émoji)
              </label>
              <input
                type="text"
                value={newTeamFlag}
                onChange={(e) => setNewTeamFlag(e.target.value)}
                placeholder="Ex : 🇿🇦"
                className="w-full bg-[#09090B] border border-white/10 rounded-xl p-3 text-sm text-center text-white focus:border-emerald-500 outline-none transition text-lg"
                maxLength={4}
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Copiez un émoji drapeau directement depuis votre clavier de téléphone ou de PC.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !newsTeamName}
              className="w-full bg-white text-black font-extrabold uppercase tracking-widest text-[10px] py-3 rounded-xl transition cursor-pointer"
            >
              Enregistrer le pays
            </button>
          </form>
        </div>
      </div>

      {/* Match List & Controls */}
      <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-6.5 shadow-xl">
        <h3 className="text-base font-bold text-white mb-6">Liste et Gestion des Matchs ({matches.length})</h3>

        {matches.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center">Aucun match disponible à afficher.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/5">
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Compétition</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Source vidéo</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {matches.map((m) => (
                  <tr key={`admin-list-${m.id}`} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3.5 font-bold text-white text-xs">
                      <span className="bg-black/40 px-2 py-1 rounded inline-flex items-center gap-1.5 border border-white/5">
                        <span>{m.homeFlag} {m.homeTeam}</span>
                        <span className="text-[10px] text-slate-550 lowercase font-mono">vs</span>
                        <span>{m.awayFlag} {m.awayTeam}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-350 text-xs">{m.competition}</td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className={`text-[9px] font-bold uppercase rounded-full px-2.5 py-0.5 border ${
                        m.status === "live" 
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : m.status === "upcoming"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[10px] text-slate-550 max-w-[150px] truncate" title={m.videoUrl}>
                      {m.videoUrl}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleEditInit(m)}
                        className="inline-flex p-1.5 rounded-lg bg-[#09090B] text-amber-400 hover:text-white hover:bg-amber-500/10 border border-white/5 transition cursor-pointer"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="inline-flex p-1.5 rounded-lg bg-[#09090B] text-red-400 hover:text-white hover:bg-red-500/10 border border-white/5 transition cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
