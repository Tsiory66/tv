import React, { useState, useEffect } from "react";
import { Match, MatchStatus } from "../types";
import { mockFetch as fetch } from "../dbMock";
import { Plus, Edit2, Trash2, ShieldAlert, Check, RefreshCw, PlusCircle, ArrowLeft, HelpCircle } from "lucide-react";

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

  useEffect(() => {
    fetchMatches();
    fetchTeams();
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
