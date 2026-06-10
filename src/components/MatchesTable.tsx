import React, { useState } from "react";
import { Match } from "../types";
import { Play, Calendar, Lock, Tv, Activity, Clock, CheckCircle } from "lucide-react";

interface MatchesTableProps {
  matches: Match[];
  isPremium: boolean;
  onWatchMatch: (id: string) => void;
  onTriggerPremium: () => void;
}

export default function MatchesTable({
  matches,
  isPremium,
  onWatchMatch,
  onTriggerPremium,
}: MatchesTableProps) {
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "finished">("all");

  const filteredMatches = matches.filter((m) => {
    if (filter === "all") return true;
    return m.status === filter;
  });

  const getStatusBadge = (status: Match["status"]) => {
    switch (status) {
      case "live":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            LIVE
          </span>
        );
      case "upcoming":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            À venir
          </span>
        );
      case "finished":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <CheckCircle className="w-3.5 h-3.5" />
            Terminé
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full bg-[#121214] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
      {/* Table Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-white/5 bg-[#0C0C0E]/50 gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-emerald-400" />
            Programme des Matchs
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Les matchs en live et diffusion à la demande
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#09090B] p-1 rounded-xl self-start md:self-auto border border-white/5">
          {(["all", "live", "upcoming", "finished"] as const).map((type) => {
            const label = {
              all: "Tous",
              live: "🔴 En Direct",
              upcoming: "⏱️ À venir",
              finished: "📼 Replay"
            }[type];

            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filter === type
                    ? "bg-white/5 text-emerald-400 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matches List */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-white font-bold text-sm">Aucun match disponible</h4>
          <p className="text-slate-500 text-xs mt-1">
            Revenez plus tard ou modifiez votre filtre
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Date & Heure
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Compétition
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Affiche du Match
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Statut
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredMatches.map((match) => (
                <tr
                  key={match.id}
                  className="hover:bg-white/5 transition group duration-150"
                >
                  {/* Date Column */}
                  <td className="px-6 py-4.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                      <span className="text-xs font-semibold text-slate-200">
                        {formatDate(match.date)}
                      </span>
                    </div>
                  </td>

                  {/* Competition Column */}
                  <td className="px-6 py-4.5 whitespace-nowrap">
                    <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold py-1 px-2 rounded-full border border-white/5">
                      {match.competition}
                    </span>
                  </td>

                  {/* Versus Teams Column */}
                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-3 text-white">
                      <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                        <span className="text-lg filter drop-shadow select-none">{match.homeFlag}</span>
                        <span className="text-xs font-bold tracking-wide">{match.homeTeam}</span>
                        <span className="text-xs text-slate-650 font-medium font-mono">vs</span>
                        <span className="text-xs font-bold tracking-wide">{match.awayTeam}</span>
                        <span className="text-lg filter drop-shadow select-none">{match.awayFlag}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status Column */}
                  <td className="px-6 py-4.5 whitespace-nowrap">
                    {getStatusBadge(match.status)}
                  </td>

                  {/* Action Button */}
                  <td className="px-6 py-4.5 text-right whitespace-nowrap">
                    {isPremium ? (
                      <button
                        onClick={() => onWatchMatch(match.id)}
                        className="px-4 py-1.5 bg-emerald-650 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-md group-hover:bg-emerald-550 transition-colors uppercase cursor-pointer"
                      >
                        Watch Now
                      </button>
                    ) : (
                      <button
                        onClick={onTriggerPremium}
                        className="px-4 py-1.5 border border-white/10 text-slate-400 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/10 text-[10px] font-bold rounded-md uppercase transition-all duration-150 cursor-pointer"
                        title="Abonnement Premium Requis"
                      >
                        Premium
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
