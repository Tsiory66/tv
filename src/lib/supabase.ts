import { createClient } from "@supabase/supabase-js";
import { Match, User, Payment } from "../types";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

// Initialize Supabase Client if keys are present
export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("MY_SUPABASE"))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

console.log("Supabase client auto-check:", supabase ? "🔌 CONNECTED TO SUPABASE" : "🏠 RUNNING OFFLINE FALLBACK ENGINE");

// --- LOCAL PERSISTENCE BACKEND FOR OUT-OF-THE-BOX PREVIEW ---
interface DBState {
  users: Array<User & { password?: string }>;
  matches: Match[];
  payments: Payment[];
  customTeams: Array<{ name: string; flag: string }>;
  webhookLogs: any[];
}

export const DEFAULT_TEAMS = [
  { name: "Madagascar", flag: "🇲🇬" },
  { name: "France", flag: "🇫🇷" },
  { name: "Brésil", flag: "🇧🇷" },
  { name: "Argentine", flag: "🇦🇷" },
  { name: "Espagne", flag: "🇪🇸" },
  { name: "Angleterre", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Allemagne", flag: "🇩🇪" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Maroc", flag: "🇲🇦" },
  { name: "Sénégal", flag: "🇸🇳" },
  { name: "Côte d’Ivoire", flag: "🇨🇮" },
  { name: "Cameroun", flag: "🇨🇲" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Égypte", flag: "🇪🇬" },
];

export const INITIAL_MATCHES: Match[] = [
  {
    id: "match-1",
    date: "2026-06-12T19:00:00Z",
    homeTeam: "Madagascar",
    homeFlag: "🇲🇬",
    awayTeam: "Maroc",
    awayFlag: "🇲🇦",
    competition: "Coupe du Monde 2026",
    status: "live",
    videoUrl: "https://test-streams.mux.dev/x36xhg/main.m3u8"
  },
  {
    id: "match-2",
    date: "2026-06-15T20:00:00Z",
    homeTeam: "France",
    homeFlag: "🇫🇷",
    awayTeam: "Brésil",
    awayFlag: "🇧🇷",
    competition: "Coupe du Monde 2026",
    status: "upcoming",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  },
  {
    id: "match-3",
    date: "2026-06-08T16:00:00Z",
    homeTeam: "Argentine",
    homeFlag: "🇦🇷",
    awayTeam: "Allemagne",
    awayFlag: "🇩🇪",
    competition: "Coupe du Monde 2026",
    status: "finished",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
  },
  {
    id: "match-4",
    date: "2026-06-11T16:30:00Z",
    homeTeam: "Sénégal",
    homeFlag: "🇸🇳",
    awayTeam: "Côte d’Ivoire",
    awayFlag: "🇨🇮",
    competition: "CAN 2026",
    status: "live",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  }
];

export const DEFAULT_USERS = [
  {
    id: "admin-id",
    email: "admin@exemple.com",
    password: "adminpassword",
    name: "Directeur de FootStream",
    phone: "+261 34 00 000 00",
    isPremium: true
  },
  {
    id: "user-id",
    email: "client_test@example.com",
    password: "userpassword",
    name: "Utilisateur Test",
    phone: "+261 34 88 555 12",
    isPremium: false
  }
];

export function getLocalDB(): DBState {
  const data = localStorage.getItem("footstream_db");
  if (!data) {
    const fresh: DBState = {
      users: DEFAULT_USERS,
      matches: INITIAL_MATCHES,
      payments: [],
      customTeams: [],
      webhookLogs: []
    };
    localStorage.setItem("footstream_db", JSON.stringify(fresh));
    return fresh;
  }
  try {
    const parsed = JSON.parse(data);
    if (!parsed.users) parsed.users = DEFAULT_USERS;
    if (!parsed.matches) parsed.matches = INITIAL_MATCHES;
    if (!parsed.payments) parsed.payments = [];
    if (!parsed.customTeams) parsed.customTeams = [];
    if (!parsed.webhookLogs) parsed.webhookLogs = [];
    return parsed;
  } catch {
    const fresh: DBState = {
      users: DEFAULT_USERS,
      matches: INITIAL_MATCHES,
      payments: [],
      customTeams: [],
      webhookLogs: []
    };
    localStorage.setItem("footstream_db", JSON.stringify(fresh));
    return fresh;
  }
}

export function saveLocalDB(state: DBState) {
  localStorage.setItem("footstream_db", JSON.stringify(state));
}

// --- HYBRID DATABASE ADAPTERS ---
export async function fetchTeamsAdapter(): Promise<Array<{ name: string; flag: string }>> {
  if (supabase) {
    const { data, error } = await supabase.from("custom_teams").select("*");
    if (error) {
      console.error("Error fetching teams from Supabase:", error);
      return DEFAULT_TEAMS;
    }
    const customs = data || [];
    return [...DEFAULT_TEAMS, ...customs];
  } else {
    const db = getLocalDB();
    return [...DEFAULT_TEAMS, ...db.customTeams];
  }
}

export async function insertTeamAdapter(name: string, flag: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from("custom_teams").insert([{ name, flag }]);
    if (error) {
      console.error("Error adding team to Supabase:", error);
      return false;
    }
    return true;
  } else {
    const db = getLocalDB();
    if (db.customTeams.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      return false;
    }
    db.customTeams.push({ name, flag });
    saveLocalDB(db);
    return true;
  }
}

export async function fetchMatchesAdapter(): Promise<Match[]> {
  if (supabase) {
    const { data, error } = await supabase.from("matches").select("*").order("date", { ascending: true });
    if (error) {
      console.error("Error loading matches from Supabase:", error);
      return [];
    }
    return data || [];
  } else {
    const db = getLocalDB();
    return db.matches;
  }
}

export async function insertMatchAdapter(match: Omit<Match, "id">): Promise<Match | null> {
  if (supabase) {
    const { data, error } = await supabase.from("matches").insert([match]).select().single();
    if (error) {
      console.error("Error adding match to Supabase:", error);
      return null;
    }
    return data;
  } else {
    const db = getLocalDB();
    const newMatch: Match = {
      ...match,
      id: "match_" + Math.random().toString(36).substr(2, 9),
    };
    db.matches.push(newMatch);
    saveLocalDB(db);
    return newMatch;
  }
}

export async function updateMatchAdapter(id: string, updates: Partial<Match>): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from("matches").update(updates).eq("id", id);
    return !error;
  } else {
    const db = getLocalDB();
    const i = db.matches.findIndex(m => m.id === id);
    if (i === -1) return false;
    db.matches[i] = { ...db.matches[i], ...updates };
    saveLocalDB(db);
    return true;
  }
}

export async function deleteMatchAdapter(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from("matches").delete().eq("id", id);
    return !error;
  } else {
    const db = getLocalDB();
    db.matches = db.matches.filter(m => m.id !== id);
    saveLocalDB(db);
    return true;
  }
}
