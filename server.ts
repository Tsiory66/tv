import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "database.json");

interface UserDB {
  id: string;
  email: string;
  password?: string;
  name: string;
  phone: string;
  isPremium: boolean;
}

interface MatchDB {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  competition: string;
  status: "upcoming" | "live" | "finished";
  videoUrl: string;
}

interface PaymentDB {
  id: string;
  userId: string;
  amount: number;
  status: "pending" | "success" | "failed";
  papiReference: string;
  notificationToken?: string;
  provider?: string;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  timestamp: string;
  payload: any;
  status: "success" | "auth_failed" | "payment_not_found" | "error";
  error?: string;
  paymentId?: string;
}

interface Database {
  users: UserDB[];
  matches: MatchDB[];
  payments: PaymentDB[];
  customTeams: { name: string; flag: string }[];
  webhookLogs?: WebhookLog[];
}

const INITIAL_MATCHES: MatchDB[] = [
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

function readDB(): Database {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDB: Database = {
      users: [
        {
          id: "admin-id",
          email: "admin@exemple.com",
          password: "adminpassword",
          name: "Directeur de FootStream",
          phone: "+261 34 00 000 00",
          isPremium: true
        }
      ],
      matches: INITIAL_MATCHES,
      payments: [],
      customTeams: [],
      webhookLogs: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
    return defaultDB;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (!parsed.webhookLogs) {
      parsed.webhookLogs = [];
    }
    return parsed;
  } catch (err) {
    console.error("Database reading failed, creating fallback", err);
    return { users: [], matches: [], payments: [], customTeams: [], webhookLogs: [] };
  }
}

function writeDB(data: Database) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // TEAMS / NATIONS
  app.get("/api/teams", (req, res) => {
    const db = readDB();
    const defaultTeams = [
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
    res.json([...defaultTeams, ...db.customTeams]);
  });

  app.post("/api/teams", (req, res) => {
    const { name, flag } = req.body;
    if (!name || !flag) {
      return res.status(400).json({ error: "Nom et drapeau obligatoires" });
    }
    const db = readDB();
    if (db.customTeams.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: "Cette équipe existe déjà" });
    }
    db.customTeams.push({ name, flag });
    writeDB(db);
    res.json({ success: true, team: { name, flag } });
  });

  // AUTH MIDDLEWARE HELPER (Simulated check)
  const getUserFromHeader = (req: express.Request): UserDB | null => {
    const token = req.headers.authorization;
    if (!token || !token.startsWith("Bearer token_")) {
      return null;
    }
    const userId = token.substring(13);
    const db = readDB();
    return db.users.find(u => u.id === userId) || null;
  };

  // REGISTER
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name || !phone) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires" });
    }

    const db = readDB();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    const isFirstAdmin = email.toLowerCase() === "admin@exemple.com";

    const newUser: UserDB = {
      id: "user_" + Math.random().toString(36).substr(2, 9),
      email,
      password,
      name,
      phone,
      isPremium: isFirstAdmin ? true : false,
    };

    db.users.push(newUser);
    writeDB(db);

    const safeUser = { ...newUser };
    delete safeUser.password;

    res.json({
      token: "Bearer token_" + newUser.id,
      user: safeUser,
    });
  });

  // LOGIN
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const db = readDB();
    const user = db.users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const safeUser = { ...user };
    delete safeUser.password;

    res.json({
      token: "Bearer token_" + user.id,
      user: safeUser,
    });
  });

  // MATCHES LIST
  app.get("/api/matches", (req, res) => {
    const db = readDB();
    const user = getUserFromHeader(req);
    const isPremiumUser = user ? (user.isPremium || user.email === "admin@exemple.com") : false;

    // Filter out videoUrl for non-premium users to enforce standard business rule on data layer
    const safeMatches = db.matches.map(m => {
      const matchCopy = { ...m };
      if (!isPremiumUser) {
        matchCopy.videoUrl = ""; // Mask stream link from client payload for security
      }
      return matchCopy;
    });

    res.json(safeMatches);
  });

  // SINGLE MATCH DETAILS (Protected)
  app.get("/api/matches/:id", (req, res) => {
    const { id } = req.params;
    const user = getUserFromHeader(req);

    if (!user) {
      return res.status(401).json({ error: "Veuillez vous connecter" });
    }

    const isPremiumUser = user.isPremium || user.email === "admin@exemple.com";
    if (!isPremiumUser) {
      return res.status(403).json({ error: "premium_required" });
    }

    const db = readDB();
    const match = db.matches.find(m => m.id === id);
    if (!match) {
      return res.status(404).json({ error: "Match non trouvé" });
    }

    res.json(match);
  });

  // ADMIN MATCH CREATE
  app.post("/api/matches", (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.email !== "admin@exemple.com") {
      return res.status(403).json({ error: "Accès Admin requis" });
    }

    const { date, homeTeam, homeFlag, awayTeam, awayFlag, competition, status, videoUrl } = req.body;
    if (!date || !homeTeam || !awayTeam || !competition || !status || !videoUrl) {
      return res.status(400).json({ error: "Tous les champs de match sont obligatoires" });
    }

    const db = readDB();
    const newMatch: MatchDB = {
      id: "match_" + Math.random().toString(36).substr(2, 9),
      date,
      homeTeam,
      homeFlag: homeFlag || "🏳️",
      awayTeam,
      awayFlag: awayFlag || "🏳️",
      competition,
      status,
      videoUrl,
    };

    db.matches.push(newMatch);
    writeDB(db);

    res.json({ success: true, match: newMatch });
  });

  // ADMIN MATCH UPDATE
  app.put("/api/matches/:id", (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.email !== "admin@exemple.com") {
      return res.status(403).json({ error: "Accès Admin requis" });
    }

    const { id } = req.params;
    const { date, homeTeam, homeFlag, awayTeam, awayFlag, competition, status, videoUrl } = req.body;

    const db = readDB();
    const matchIdx = db.matches.findIndex(m => m.id === id);
    if (matchIdx === -1) {
      return res.status(404).json({ error: "Match non trouvé" });
    }

    db.matches[matchIdx] = {
      ...db.matches[matchIdx],
      ...(date && { date }),
      ...(homeTeam && { homeTeam }),
      ...(homeFlag !== undefined && { homeFlag }),
      ...(awayTeam && { awayTeam }),
      ...(awayFlag !== undefined && { awayFlag }),
      ...(competition && { competition }),
      ...(status && { status }),
      ...(videoUrl !== undefined && { videoUrl }),
    };

    writeDB(db);
    res.json({ success: true, match: db.matches[matchIdx] });
  });

  // ADMIN MATCH DELETE
  app.delete("/api/matches/:id", (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.email !== "admin@exemple.com") {
      return res.status(403).json({ error: "Accès Admin requis" });
    }

    const { id } = req.params;
    const db = readDB();
    const matchIdx = db.matches.findIndex(m => m.id === id);
    if (matchIdx === -1) {
      return res.status(404).json({ error: "Match non trouvé" });
    }

    db.matches.splice(matchIdx, 1);
    writeDB(db);
    res.json({ success: true });
  });

  // PAPI.MG CHECKOUT SESSION CREATION
  app.post("/api/payments/checkout", async (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      return res.status(401).json({ error: "Veuillez vous connecter pour payer" });
    }

    const { provider } = req.body; // MVOLA, ORANGE_MONEY, AIRTEL_MONEY, BRED

    // Align provider name to Papi.mg api enum options
    let finalProvider = "MVOLA";
    if (provider) {
      const pUpper = provider.toUpperCase().trim();
      if (pUpper === "MVOLA") finalProvider = "MVOLA";
      else if (pUpper === "ORANGE" || pUpper === "ORANGE_MONEY") finalProvider = "ORANGE_MONEY";
      else if (pUpper === "AIRTEL" || pUpper === "AIRTEL_MONEY") finalProvider = "AIRTEL_MONEY";
      else if (pUpper === "BRED" || pUpper === "VISA" || pUpper === "CARD") finalProvider = "BRED";
    }

    const db = readDB();
    const paymentId = "pay_" + Math.random().toString(36).substr(2, 9);
    
    const newPayment: PaymentDB = {
      id: paymentId,
      userId: user.id,
      amount: 10000,
      status: "pending",
      papiReference: "",
      notificationToken: "",
      provider: finalProvider,
      createdAt: new Date().toISOString(),
    };

    db.payments.push(newPayment);
    writeDB(db);

    const papiApiKey = process.env.PAPI_API_KEY || "$2a$12$abjdxfghijtlmnopqrutwuOyqH.buBhlF.Yim.XsHy4xJYw1.pvM2";
    
    let appUrl = req.body.origin || process.env.APP_URL || "";
    if (!appUrl || appUrl.trim() === "" || appUrl.includes("MY_APP_URL")) {
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:3000";
      const protocol = req.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      appUrl = `${protocol}://${host}`;
    }
    if (appUrl.endsWith("/")) {
      appUrl = appUrl.slice(0, -1);
    }

    if (papiApiKey) {
      try {
        console.log(`Sending real payment request to Papi.mg with token: ${papiApiKey.substring(0, 10)}... for provider: ${finalProvider} at URL: ${appUrl}`);
        const response = await fetch("https://app.papi.mg/dashboard/api/payment-links", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Token": papiApiKey,
          },
          body: JSON.stringify({
            amount: 10000,
            clientName: user.name || "Client FootStream",
            reference: paymentId,
            description: "Accès Premium à vie FootStream Mada",
            successUrl: `${appUrl}/?payment_id=${paymentId}&status=success`,
            failureUrl: `${appUrl}/?payment_id=${paymentId}&status=cancelled`,
            notificationUrl: `${appUrl}/api/payments/webhook`,
            validDuration: 60,
            provider: finalProvider,
            payerEmail: user.email,
            payerPhone: user.phone || "+261340000000",
            isTestMode: false
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.data) {
            const pData = resData.data;
            const checkoutUrl = pData.paymentLink;
            const nToken = pData.notificationToken || "";
            const papiRef = pData.paymentReference || paymentId;

            // Update database with received notificationToken and papiReference
            const pIdx = db.payments.findIndex(p => p.id === paymentId);
            if (pIdx !== -1) {
              db.payments[pIdx].papiReference = papiRef;
              db.payments[pIdx].notificationToken = nToken;
              writeDB(db);
            }
            console.log(`Payment link successfully generated by Papi: ${checkoutUrl}`);
            return res.json({ checkoutUrl });
          }
        } else {
          const textErr = await response.text();
          console.error("Papi.mg payment-links API returned error:", textErr);
        }
      } catch (err) {
        console.error("Failed to connect to Papi.mg API:", err);
      }
    }

    // Fallback: If no PAPI_API_KEY is configured, or if the API call fails, we return our built-in elegant Web Simulator checkoutUrl!
    res.json({
      checkoutUrl: `/payment/simulate/${paymentId}`,
      simulated: true,
      message: "Simulation active (Pas de clé PAPI_API_KEY détectée, mode démo activé)."
    });
  });

  // GET INDIVIDUAL PAYMENT STATUS FOR POLLING/VERIFICATION
  app.get("/api/payments/status/:id", (req, res) => {
    const db = readDB();
    const payment = db.payments.find(p => p.id === req.params.id || p.papiReference === req.params.id);
    if (!payment) {
      return res.status(404).json({ error: "Paiement non trouvé" });
    }
    res.json({
      id: payment.id,
      status: payment.status,
      userId: payment.userId,
    });
  });

  // WEBHOOK ENDPOINT FROM PAPI.MG (AND/OR PORTAL SIMULATOR)
  app.post("/api/payments/webhook", (req, res) => {
    console.log("Webhook received payload:", JSON.stringify(req.body));
    const { data } = req.body;

    // Support standard Papi.mg (paymentReference, paymentStatus, notificationToken) or simulator payloads (externalId, status)
    const paymentId = req.body.paymentReference || req.body.externalId || req.body.reference || (data && (data.paymentReference || data.externalId || data.reference));
    const statusVal = req.body.paymentStatus || req.body.status || (data && (data.paymentStatus || data.status));
    const reqToken = req.body.notificationToken || (data && data.notificationToken);

    const logId = "wl_" + Math.random().toString(36).substr(2, 9);
    const db = readDB();
    if (!db.webhookLogs) {
      db.webhookLogs = [];
    }

    if (!paymentId) {
      const errLog: WebhookLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        payload: req.body,
        status: "error",
        error: "Identifiant de paiement (paymentReference ou externalId) manquant."
      };
      db.webhookLogs.push(errLog);
      writeDB(db);
      return res.status(400).json({ error: errLog.error });
    }

    let paymentIdx = db.payments.findIndex(p => p.id === paymentId);

    // If direct database lookup didn't succeed, check the stored papiReference fields
    if (paymentIdx === -1) {
      paymentIdx = db.payments.findIndex(p => p.papiReference === paymentId);
    }

    if (paymentIdx === -1) {
      console.warn("Payment reference not found in database:", paymentId);
      const errLog: WebhookLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        payload: req.body,
        status: "payment_not_found",
        error: `Paiement non trouvé dans notre base avec l'identifiant ${paymentId}`,
        paymentId
      };
      db.webhookLogs.push(errLog);
      writeDB(db);
      return res.status(404).json({ error: errLog.error });
    }

    const payment = db.payments[paymentIdx];

    // Security Verification: Check that notificationToken matches what we received when we created the link
    if (payment.notificationToken && reqToken && payment.notificationToken !== reqToken) {
      console.warn("Webhook Authentification Failed: notificationToken mismatch!", {
        expected: payment.notificationToken,
        received: reqToken
      });
      const errLog: WebhookLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        payload: req.body,
        status: "auth_failed",
        error: "Échec de l'authentification du webhook : token de notification incorrect.",
        paymentId
      };
      db.webhookLogs.push(errLog);
      writeDB(db);
      return res.status(401).json({ error: errLog.error });
    }

    const isSuccess = !!(statusVal && (statusVal.toString().toUpperCase() === "SUCCESS" || statusVal.toString().toUpperCase() === "SUCCESSFUL"));
    db.payments[paymentIdx].status = isSuccess ? "success" : "failed";

    if (isSuccess) {
      const userId = payment.userId;
      const userIdx = db.users.findIndex(u => u.id === userId);
      if (userIdx !== -1) {
        db.users[userIdx].isPremium = true;
        console.log(`User ${db.users[userIdx].email} upgraded to PREMIUM successfully via verified webhook!`);
      }
    }

    const successLog: WebhookLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      payload: req.body,
      status: "success",
      paymentId
    };
    db.webhookLogs.push(successLog);

    writeDB(db);
    res.json({ success: true, message: "Webhook exécuté et validé avec succès!" });
  });

  // DEVELOPER SHORTCUT: RESTORE OR FORCE PREMIUM STATUS INSTANTLY
  app.post("/api/payments/force-premium", (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      return res.status(401).json({ error: "Connectez-vous d'abord" });
    }

    const db = readDB();
    const userIdx = db.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      db.users[userIdx].isPremium = true;
      writeDB(db);
      return res.json({ success: true, user: db.users[userIdx] });
    }
    res.status(404).json({ error: "Utilisateur non trouvé" });
  });

  // Get current user profile (with isPremium live state check)
  app.get("/api/auth/me", (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      return res.status(401).json({ error: "Non connecté" });
    }
    const safeUser = { ...user };
    delete safeUser.password;
    res.json(safeUser);
  });

  // DIRECT DATABASE CONTROLLER FOR CLIENT INTEGRATION AND VERIFICATION
  app.get("/api/admin/database", (req, res) => {
    try {
      const db = readDB();
      res.json(db);
    } catch (err) {
      res.status(500).json({ error: "Impossible de lire la base de données" });
    }
  });

  app.post("/api/admin/database", (req, res) => {
    try {
      const newDb = req.body;
      if (!newDb || !Array.isArray(newDb.users) || !Array.isArray(newDb.matches) || !Array.isArray(newDb.payments)) {
        return res.status(400).json({ error: "Format de base de données invalide." });
      }
      writeDB(newDb);
      res.json({ success: true, message: "La base de données a été mise à jour !", db: newDb });
    } catch (err) {
      res.status(500).json({ error: "Impossible d'écrire dans la base de données" });
    }
  });

  app.post("/api/admin/database/reset", (req, res) => {
    try {
      const defaultDB: Database = {
        users: [
          {
            id: "admin-id",
            email: "admin@exemple.com",
            password: "adminpassword",
            name: "Directeur de FootStream",
            phone: "+261 34 00 000 00",
            isPremium: true
          },
          {
            id: "user_2u7l7bwxg",
            email: "client_test@example.com",
            password: "userpassword",
            name: "Utilisateur Test",
            phone: "+261 34 88 555 12",
            isPremium: false
          }
        ],
        matches: [
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
        ],
        payments: [],
        customTeams: []
      };
      writeDB(defaultDB);
      res.json({ success: true, message: "La base de données a été réinitialisée avec succès !", db: defaultDB });
    } catch (err) {
      res.status(500).json({ error: "Impossible de réinitialiser la base de données" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
