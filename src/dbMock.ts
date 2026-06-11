import { Match, User, Payment } from "./types";

interface WebhookLog {
  id: string;
  timestamp: string;
  payload: any;
  status: "success" | "auth_failed" | "payment_not_found" | "error";
  error?: string;
  paymentId?: string;
}

interface DBState {
  users: Array<User & { password?: string }>;
  matches: Match[];
  payments: Payment[];
  customTeams: Array<{ name: string; flag: string }>;
  webhookLogs: WebhookLog[];
}

const DEFAULT_TEAMS = [
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

const INITIAL_MATCHES: Match[] = [
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

const DEFAULT_USERS = [
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

function getDB(): DBState {
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

function saveDB(state: DBState) {
  localStorage.setItem("footstream_db", JSON.stringify(state));
}

// Custom simple Wait response generator with simulated latencies for maximum natural user experience (150ms-30ms)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function mockFetch(
  url: string,
  options: any = {}
): Promise<{ ok: boolean; status: number; json: () => Promise<any> }> {
  await sleep(180); // ultra fluid artificial delay
  const db = getDB();
  const method = (options.method || "GET").toUpperCase();
  const headers = options.headers || {};
  const token = headers["Authorization"] || headers["authorization"];
  const body = options.body ? JSON.parse(options.body) : null;

  const makeResponse = (status: number, data: any) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  });

  // Regex matching or exact endpoints
  
  // 1. GET /api/auth/me
  if (url === "/api/auth/me") {
    if (!token) {
      return makeResponse(401, { error: "Non connecté / Token absent" });
    }
    const user = db.users.find(u => u.id === token);
    if (!user) {
      return makeResponse(401, { error: "Session invalide ou expirée" });
    }
    // Return safe user without password
    const { password, ...safeUser } = user;
    return makeResponse(200, safeUser);
  }

  // 2. POST /api/auth/login
  if (url === "/api/auth/login" && method === "POST") {
    const { email, password } = body || {};
    const user = db.users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    if (!user || user.password !== password) {
      return makeResponse(400, { error: "Adresse email ou mot de passe incorrect." });
    }
    const { password: _, ...safeUser } = user;
    return makeResponse(200, { token: user.id, user: safeUser });
  }

  // 3. POST /api/auth/register
  if (url === "/api/auth/register" && method === "POST") {
    const { email, password, name, phone } = body || {};
    if (!email || !password || !name) {
      return makeResponse(400, { error: "Tous les champs sont obligatoires" });
    }
    const exists = db.users.some(u => u.email?.toLowerCase() === email?.toLowerCase());
    if (exists) {
      return makeResponse(400, { error: "Cette adresse email est déjà enregistrée." });
    }
    const newUser = {
      id: "usr_" + Math.random().toString(36).substr(2, 9),
      email: email.toLowerCase(),
      password,
      name,
      phone: phone || "",
      isPremium: email.toLowerCase() === "admin@exemple.com"
    };
    db.users.push(newUser);
    saveDB(db);
    const { password: _, ...safeUser } = newUser;
    return makeResponse(200, { token: newUser.id, user: safeUser });
  }

  // 4. GET /api/matches
  if (url === "/api/matches" && method === "GET") {
    return makeResponse(200, db.matches);
  }

  // 5. POST /api/matches
  if (url === "/api/matches" && method === "POST") {
    if (!token) return makeResponse(401, { error: "Accès refusé" });
    const user = db.users.find(u => u.id === token);
    if (!user || user.email !== "admin@exemple.com") {
      return makeResponse(403, { error: "Droits insuffisants" });
    }
    const newMatch = {
      id: "match_" + Math.random().toString(36).substr(2, 9),
      date: body.date || new Date().toISOString(),
      homeTeam: body.homeTeam,
      homeFlag: body.homeFlag,
      awayTeam: body.awayTeam,
      awayFlag: body.awayFlag,
      competition: body.competition,
      status: body.status || "upcoming",
      videoUrl: body.videoUrl
    };
    db.matches.push(newMatch);
    saveDB(db);
    return makeResponse(200, { success: true, match: newMatch });
  }

  // 6. PUT /api/matches/:id
  if (url.startsWith("/api/matches/") && method === "PUT") {
    if (!token) return makeResponse(401, { error: "Accès refusé" });
    const user = db.users.find(u => u.id === token);
    if (!user || user.email !== "admin@exemple.com") {
      return makeResponse(403, { error: "Droits insuffisants" });
    }
    const matchId = url.split("/api/matches/")[1];
    const index = db.matches.findIndex(m => m.id === matchId);
    if (index === -1) {
      return makeResponse(404, { error: "Match introuvable" });
    }
    db.matches[index] = { ...db.matches[index], ...body };
    saveDB(db);
    return makeResponse(200, { success: true });
  }

  // 7. DELETE /api/matches/:id
  if (url.startsWith("/api/matches/") && method === "DELETE") {
    if (!token) return makeResponse(401, { error: "Accès refusé" });
    const user = db.users.find(u => u.id === token);
    if (!user || user.email !== "admin@exemple.com") {
      return makeResponse(403, { error: "Droits insuffisants" });
    }
    const matchId = url.split("/api/matches/")[1];
    db.matches = db.matches.filter(m => m.id !== matchId);
    saveDB(db);
    return makeResponse(200, { success: true });
  }

  // 8. GET /api/teams
  if (url === "/api/teams" && method === "GET") {
    return makeResponse(200, [...DEFAULT_TEAMS, ...db.customTeams]);
  }

  // 9. POST /api/teams
  if (url === "/api/teams" && method === "POST") {
    if (!token) return makeResponse(401, { error: "Accès refusé" });
    const newTeam = { name: body.name, flag: body.flag || "🏳️" };
    const exists = [...DEFAULT_TEAMS, ...db.customTeams].some(t => t.name.toLowerCase() === newTeam.name.toLowerCase());
    if (exists) {
      return makeResponse(400, { error: "Ce pays existe déjà" });
    }
    db.customTeams.push(newTeam);
    saveDB(db);
    return makeResponse(200, { team: newTeam });
  }

  // 10. POST /api/payments/checkout
  if (url === "/api/payments/checkout" && method === "POST") {
    if (!token) return makeResponse(401, { error: "Non connecté" });
    const user = db.users.find(u => u.id === token);
    if (!user) return makeResponse(401, { error: "Utilisateur inconnu" });

    // Generate simulated payment
    const paymentId = "pay_" + Math.random().toString(36).substr(2, 9);
    const newPayment: Payment = {
      id: paymentId,
      userId: user.id,
      amount: 10000,
      status: "pending",
      papiReference: paymentId,
      createdAt: new Date().toISOString()
    };
    db.payments.push(newPayment);
    saveDB(db);

    const provider = body.provider || "MVOLA";
    const origin = body.origin || window.location.origin;

    // Simulate redirection link within frontend routing
    return makeResponse(200, {
      checkoutUrl: `${origin}/payment/simulate/${paymentId}`,
      simulated: true,
      paymentId
    });
  }

  // 11. POST /api/payments/force-premium
  if (url === "/api/payments/force-premium" && method === "POST") {
    if (!token) return makeResponse(401, { error: "Non connecté" });
    const index = db.users.findIndex(u => u.id === token);
    if (index === -1) return makeResponse(404, { error: "Utilisateur introuvable" });
    db.users[index].isPremium = true;
    saveDB(db);
    const { password, ...safeUser } = db.users[index];
    return makeResponse(200, { user: safeUser });
  }

  // 12. GET /api/admin/database
  if (url === "/api/admin/database" && method === "GET") {
    return makeResponse(200, db);
  }

  // 13. POST /api/admin/database
  if (url === "/api/admin/database" && method === "POST") {
    saveDB(body);
    return makeResponse(200, { success: true });
  }

  // 14. POST /api/admin/database/reset
  if (url === "/api/admin/database/reset" && method === "POST") {
    const fresh: DBState = {
      users: DEFAULT_USERS,
      matches: INITIAL_MATCHES,
      payments: [],
      customTeams: [],
      webhookLogs: []
    };
    saveDB(fresh);
    return makeResponse(200, { db: fresh });
  }

  // 15. GET /api/payments/status/:id
  if (url.startsWith("/api/payments/status/") && method === "GET") {
    const paymentId = url.split("/api/payments/status/")[1];
    const pay = db.payments.find(p => p.id === paymentId);
    if (!pay) {
      return makeResponse(404, { error: "Paiement non trouvé" });
    }
    return makeResponse(200, {
      id: pay.id,
      status: pay.status,
      userId: pay.userId
    });
  }

  // 16. POST /api/payments/webhook
  if (url === "/api/payments/webhook" && method === "POST") {
    const paymentId = body.externalId;
    const isSuccess = body.status === "success";
    const payIdx = db.payments.findIndex(p => p.id === paymentId);
    if (payIdx === -1) {
      return makeResponse(404, { error: "Paiement introuvable" });
    }
    db.payments[payIdx].status = isSuccess ? "success" : "failed";
    
    if (isSuccess) {
      const uId = db.payments[payIdx].userId;
      const uIdx = db.users.findIndex(u => u.id === uId);
      if (uIdx !== -1) {
        db.users[uIdx].isPremium = true;
      }
    }
    saveDB(db);
    return makeResponse(200, { success: true });
  }

  // Fallback
  return makeResponse(404, { error: `Endpoint ${url} non géré` });
}
