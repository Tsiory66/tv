import { 
  supabase, 
  getLocalDB, 
  saveLocalDB, 
  fetchTeamsAdapter, 
  insertTeamAdapter,
  fetchMatchesAdapter,
  insertMatchAdapter,
  updateMatchAdapter,
  deleteMatchAdapter,
  INITIAL_MATCHES,
  DEFAULT_USERS,
  DEFAULT_TEAMS
} from "./supabase";
import { Payment } from "../types";

// Save the original fetch
const originalFetch = globalThis.fetch;

// Delay simulation for natural loading UI
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to make mock response objects
function makeResponse(status: number, data: any) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => data,
    text: async () => JSON.stringify(data)
  } as Response;
}

// Intercept global fetch safely using Object.defineProperty to bypass read-only/getter constraints
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  
  // Only intercept /api/ routes
  if (!url.startsWith("/api/")) {
    return originalFetch(input, init);
  }

  await sleep(150); // Fluid artificial latency for nice loading states
  const method = (init?.method || "GET").toUpperCase();
  const headers = (init?.headers || {}) as Record<string, string>;
  const rawToken = headers["Authorization"] || headers["authorization"] || "";
  
  let body: any = null;
  if (init?.body) {
    try {
      body = JSON.parse(init.body as string);
    } catch {
      // Not JSON or empty
    }
  }

  console.log(`[API Proxy] ${method} ${url}`, { body, token: rawToken });

  // --------------------------------------------------------
  // 1. GET /api/teams
  // --------------------------------------------------------
  if (url === "/api/teams" && method === "GET") {
    const teams = await fetchTeamsAdapter();
    return makeResponse(200, teams);
  }

  // --------------------------------------------------------
  // 2. POST /api/teams
  // --------------------------------------------------------
  if (url === "/api/teams" && method === "POST") {
    const { name, flag } = body || {};
    if (!name) return makeResponse(400, { error: "Nom d'équipe manquant." });
    const success = await insertTeamAdapter(name, flag || "🏳️");
    if (!success) return makeResponse(400, { error: "Cette équipe existe déjà." });
    return makeResponse(200, { success: true, team: { name, flag } });
  }

  // --------------------------------------------------------
  // 3. GET /api/matches
  // --------------------------------------------------------
  if (url === "/api/matches" && method === "GET") {
    const matches = await fetchMatchesAdapter();
    return makeResponse(200, matches || []);
  }

  // --------------------------------------------------------
  // 4. POST /api/matches
  // --------------------------------------------------------
  if (url === "/api/matches" && method === "POST") {
    const freshMatch = await insertMatchAdapter({
      date: body?.date || new Date().toISOString(),
      homeTeam: body?.homeTeam || "",
      homeFlag: body?.homeFlag || "🏳️",
      awayTeam: body?.awayTeam || "",
      awayFlag: body?.awayFlag || "🏳️",
      competition: body?.competition || "",
      status: body?.status || "upcoming",
      videoUrl: body?.videoUrl || ""
    });
    if (!freshMatch) return makeResponse(500, { error: "Erreur lors de la création du match." });
    return makeResponse(200, { success: true, match: freshMatch });
  }

  // --------------------------------------------------------
  // 5. PUT /api/matches/:id
  // --------------------------------------------------------
  if (url.startsWith("/api/matches/") && method === "PUT") {
    const parts = url.split("/api/matches/");
    const matchId = parts[1];
    const success = await updateMatchAdapter(matchId, body);
    if (!success) return makeResponse(404, { error: "Match non trouvé." });
    return makeResponse(200, { success: true });
  }

  // --------------------------------------------------------
  // 6. DELETE /api/matches/:id
  // --------------------------------------------------------
  if (url.startsWith("/api/matches/") && method === "DELETE") {
    const parts = url.split("/api/matches/");
    const matchId = parts[1];
    const success = await deleteMatchAdapter(matchId);
    if (!success) return makeResponse(404, { error: "Match non trouvé." });
    return makeResponse(200, { success: true });
  }

  // --------------------------------------------------------
  // 7. GET /api/matches/:id
  // --------------------------------------------------------
  if (url.startsWith("/api/matches/") && method === "GET") {
    const parts = url.split("/api/matches/");
    const matchId = parts[1];
    if (supabase) {
      const { data, error } = await supabase.from("matches").select("*").eq("id", matchId).single();
      if (error || !data) return makeResponse(404, { error: "Match non trouvé." });
      return makeResponse(200, data);
    } else {
      const db = getLocalDB();
      const m = db.matches.find(item => item.id === matchId);
      if (!m) return makeResponse(404, { error: "Match non trouvé." });
      return makeResponse(200, m);
    }
  }

  // --------------------------------------------------------
  // 8. POST /api/auth/register
  // --------------------------------------------------------
  if (url === "/api/auth/register" && method === "POST") {
    const { email, password, name, phone } = body || {};
    if (!email || !password || !name) {
      return makeResponse(400, { error: "Toutes les informations obligatoires ne sont pas renseignées." });
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, phone }
          }
        });
        if (error) {
          console.error("Supabase signUp error:", error);
          return makeResponse(400, { error: error.message });
        }
        if (!data.user) {
          return makeResponse(400, { error: "Inscription échouée." });
        }

        // Insert or Upsert custom profiles table
        const isPremiumUser = email.toLowerCase() === "admin@exemple.com";
        const { error: profileErr } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email: email.toLowerCase(),
          name,
          phone: phone || "",
          is_premium: isPremiumUser
        });

        if (profileErr) {
          console.warn("Could not insert profile into profiles table:", profileErr.message);
        }

        return makeResponse(200, {
          token: data.user.id,
          user: {
            id: data.user.id,
            email: email.toLowerCase(),
            name,
            phone: phone || "",
            isPremium: isPremiumUser
          }
        });
      } catch (err: any) {
        return makeResponse(550, { error: err.message });
      }
    } else {
      const db = getLocalDB();
      if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return makeResponse(400, { error: "Cet email est déjà pris." });
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
      saveLocalDB(db);
      return makeResponse(200, {
        token: newUser.id,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          isPremium: newUser.isPremium
        }
      });
    }
  }

  // --------------------------------------------------------
  // 9. POST /api/auth/login
  // --------------------------------------------------------
  if (url === "/api/auth/login" && method === "POST") {
    const { email, password } = body || {};
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          return makeResponse(400, { error: "Adresse email ou mot de passe incorrect." });
        }
        if (!data.user) {
          return makeResponse(400, { error: "Authentification échouée." });
        }

        // Get profiles info
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
        const finalName = profile?.name || data.user.user_metadata?.name || "Client FootStream";
        const finalPhone = profile?.phone || data.user.user_metadata?.phone || "";
        const finalIsPremium = profile?.is_premium || email.toLowerCase() === "admin@exemple.com";

        return makeResponse(200, {
          token: data.user.id,
          user: {
            id: data.user.id,
            email: data.user.email!,
            name: finalName,
            phone: finalPhone,
            isPremium: finalIsPremium
          }
        });
      } catch (err: any) {
        return makeResponse(400, { error: err.message });
      }
    } else {
      const db = getLocalDB();
      const u = db.users.find(item => item.email.toLowerCase() === email.toLowerCase());
      if (!u || u.password !== password) {
        return makeResponse(400, { error: "Adresse email ou mot de passe incorrect." });
      }
      return makeResponse(200, {
        token: u.id,
        user: {
          id: u.id,
          email: u.email,
          name: u.name,
          phone: u.phone,
          isPremium: u.isPremium
        }
      });
    }
  }

  // --------------------------------------------------------
  // 10. GET /api/auth/me
  // --------------------------------------------------------
  if (url === "/api/auth/me" && method === "GET") {
    if (!rawToken) return makeResponse(401, { error: "Non connecté." });
    if (supabase) {
      try {
        // Since token is the user ID in client sessions, fetch user profile directly
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", rawToken)
          .single();

        if (error || !profile) {
          // Fallback verify with supabase auth user if exists
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const isPremiumUser = user.email?.toLowerCase() === "admin@exemple.com";
            return makeResponse(200, {
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.name || "Client FootStream",
              phone: user.user_metadata?.phone || "",
              isPremium: isPremiumUser
            });
          }
          return makeResponse(401, { error: "Session invalide." });
        }

        return makeResponse(200, {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          phone: profile.phone,
          isPremium: profile.is_premium
        });
      } catch (err) {
        return makeResponse(401, { error: "Erreur de connexion de session." });
      }
    } else {
      const db = getLocalDB();
      const u = db.users.find(item => item.id === rawToken);
      if (!u) return makeResponse(401, { error: "Session introuvable." });
      return makeResponse(200, {
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        isPremium: u.isPremium
      });
    }
  }

  // --------------------------------------------------------
  // 11. POST /api/payments/checkout
  // --------------------------------------------------------
  if (url === "/api/payments/checkout" && method === "POST") {
    if (!rawToken) return makeResponse(401, { error: "Authentification requise." });
    const provider = body?.provider || "MVOLA";
    const paymentId = "pay_" + Math.random().toString(36).substr(2, 9);
    
    if (supabase) {
      // 1. Fetch user to confirm
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", rawToken).single();
      const userEmail = profile?.email || "anon@stream.mg";
      const userName = profile?.name || "Client FootStream";
      const userPhone = profile?.phone || "+261340000000";

      // 2. Insert into Supabase payments table
      const { error: payErr } = await supabase.from("payments").insert([{
        id: paymentId,
        user_id: rawToken,
        amount: 10000,
        status: "pending",
        papi_reference: paymentId,
        provider: provider
      }]);

      if (payErr) {
        console.error("Error creating payment record in Supabase:", payErr);
        return makeResponse(500, { error: "Erreur lors de la création de la transaction." });
      }

      // Check if user has deployed the Supabase Edge Function checkout URL
      // If VITE_SUPABASE_URL and Papi Key are configured, they can make real queries
      // We return the local simulate link but log standard information.
      // This allows both real connection and instant preview.
      const appOrigin = body?.origin || window.location.origin;
      const checkoutUrl = `${appOrigin}/payment/simulate/${paymentId}`;
      
      return makeResponse(200, {
        checkoutUrl,
        paymentId,
        simulated: true
      });
    } else {
      const db = getLocalDB();
      const user = db.users.find(u => u.id === rawToken);
      if (!user) return makeResponse(401, { error: "Utilisateur introuvable." });

      const newPayment: Payment = {
        id: paymentId,
        userId: user.id,
        amount: 10000,
        status: "pending",
        papiReference: paymentId,
        createdAt: new Date().toISOString()
      };
      db.payments.push(newPayment);
      saveLocalDB(db);

      const appOrigin = body?.origin || window.location.origin;
      const checkoutUrl = `${appOrigin}/payment/simulate/${paymentId}`;

      return makeResponse(200, {
        checkoutUrl,
        paymentId,
        simulated: true
      });
    }
  }

  // --------------------------------------------------------
  // 12. GET /api/payments/status/:id
  // --------------------------------------------------------
  if (url.startsWith("/api/payments/status/") && method === "GET") {
    const parts = url.split("/api/payments/status/");
    const paymentId = parts[1];
    
    if (supabase) {
      const { data, error } = await supabase.from("payments").select("*").eq("id", paymentId).single();
      if (error || !data) {
        // Fallback check papi_reference
        const { data: dataRef, error: errRef } = await supabase.from("payments").select("*").eq("papi_reference", paymentId).single();
        if (errRef || !dataRef) {
          return makeResponse(404, { error: "Transaction non trouvée." });
        }
        return makeResponse(200, {
          id: dataRef.id,
          status: dataRef.status,
          userId: dataRef.user_id
        });
      }
      return makeResponse(200, {
        id: data.id,
        status: data.status,
        userId: data.user_id
      });
    } else {
      const db = getLocalDB();
      const p = db.payments.find(item => item.id === paymentId || item.papiReference === paymentId);
      if (!p) return makeResponse(404, { error: "Transaction non trouvée." });
      return makeResponse(200, {
        id: p.id,
        status: p.status,
        userId: p.userId
      });
    }
  }

  // --------------------------------------------------------
  // 13. POST /api/payments/webhook
  // --------------------------------------------------------
  if (url === "/api/payments/webhook" && method === "POST") {
    const pId = body?.externalId;
    const isSuccess = body?.status === "success" || body?.status === "SUCCESS";
    
    if (supabase) {
      // 1. Update Payment
      const { data: payment, error: fetchErr } = await supabase.from("payments").select("*").eq("id", pId).single();
      if (fetchErr || !payment) {
        console.error("Webhook update failed: Payment not found", pId);
        return makeResponse(404, { error: "Paiement introuvable." });
      }

      const { error: updateErr } = await supabase.from("payments").update({
        status: isSuccess ? "success" : "failed"
      }).eq("id", pId);

      if (updateErr) {
        console.error("Error updating payment status in Supabase:", updateErr);
        return makeResponse(500, { error: "Erreur de mise à jour." });
      }

      // 2. Set user standard is_premium to true
      if (isSuccess) {
        const { error: profileErr } = await supabase.from("profiles").update({
          is_premium: true
        }).eq("id", payment.user_id);

        if (profileErr) {
          console.error("Error upgrading user to Premium in Supabase:", profileErr);
        }
      }

      return makeResponse(200, { success: true });
    } else {
      const db = getLocalDB();
      const pIdx = db.payments.findIndex(p => p.id === pId);
      if (pIdx === -1) return makeResponse(404, { error: "Paiement introuvable." });

      db.payments[pIdx].status = isSuccess ? "success" : "failed";
      if (isSuccess) {
        const uIdx = db.users.findIndex(u => u.id === db.payments[pIdx].userId);
        if (uIdx !== -1) {
          db.users[uIdx].isPremium = true;
        }
      }
      saveLocalDB(db);
      return makeResponse(200, { success: true });
    }
  }

  // --------------------------------------------------------
  // 14. POST /api/payments/force-premium
  // --------------------------------------------------------
  if (url === "/api/payments/force-premium" && method === "POST") {
    if (!rawToken) return makeResponse(401, { error: "Non connecté." });
    if (supabase) {
      const { error } = await supabase.from("profiles").update({ is_premium: true }).eq("id", rawToken);
      if (error) return makeResponse(500, { error: error.message });
      
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", rawToken).single();
      return makeResponse(200, {
        user: {
          id: profile?.id,
          email: profile?.email,
          name: profile?.name,
          phone: profile?.phone,
          isPremium: true
        }
      });
    } else {
      const db = getLocalDB();
      const uIdx = db.users.findIndex(item => item.id === rawToken);
      if (uIdx === -1) return makeResponse(404, { error: "Utilisateur non trouvé." });
      db.users[uIdx].isPremium = true;
      saveLocalDB(db);
      const safe = db.users[uIdx];
      return makeResponse(200, {
        user: {
          id: safe.id,
          email: safe.email,
          name: safe.name,
          phone: safe.phone,
          isPremium: true
        }
      });
    }
  }

  // --------------------------------------------------------
  // 15. ADMIN INTERFACE SYNC / DATABASE / RE-INIT MOCKS
  // --------------------------------------------------------
  if (url === "/api/admin/database" && method === "GET") {
    if (supabase) {
      // In Supabase mode, fetch tables directly
      const { data: users } = await supabase.from("profiles").select("*");
      const { data: matches } = await supabase.from("matches").select("*");
      const { data: payments } = await supabase.from("payments").select("*");
      return makeResponse(200, { users: users || [], matches: matches || [], payments: payments || [] });
    } else {
      const db = getLocalDB();
      return makeResponse(200, db);
    }
  }

  if (url === "/api/admin/database" && method === "POST") {
    if (!supabase) {
      saveLocalDB(body);
    }
    return makeResponse(200, { success: true });
  }

  if (url === "/api/admin/database/reset" && method === "POST") {
    if (supabase) {
      // Clear data inside matches table and reinsert INITIAL_MATCHES
      await supabase.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      for (const m of INITIAL_MATCHES) {
        await supabase.from("matches").insert([{
          date: m.date,
          home_team: m.homeTeam,
          away_team: m.awayTeam,
          home_flag: m.homeFlag,
          away_flag: m.awayFlag,
          competition: m.competition,
          status: m.status,
          video_url: m.videoUrl
        }]);
      }
      return makeResponse(200, { success: true });
    } else {
      const fresh = {
        users: DEFAULT_USERS,
        matches: INITIAL_MATCHES,
        payments: [],
        customTeams: [],
        webhookLogs: []
      };
      saveLocalDB(fresh);
      return makeResponse(200, { success: true, db: fresh });
    }
  }

  // Fallback default
  return originalFetch(input, init);
};

// Install the custom fetch using Object.defineProperty to bypass read-only/getter constraints
try {
  Object.defineProperty(globalThis, "fetch", {
    value: customFetch,
    writable: true,
    configurable: true,
    enumerable: true,
  });
} catch (e) {
  console.assert(true, "First assign catch expected");
}

try {
  Object.defineProperty(window, "fetch", {
    value: customFetch,
    writable: true,
    configurable: true,
    enumerable: true,
  });
} catch (e) {
  console.assert(true, "Second assign catch expected");
}

