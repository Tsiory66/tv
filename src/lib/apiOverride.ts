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
  DEFAULT_TEAMS,
  mapMatchFromDb,
  mapMatchToDb
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
    try {
      const teams = await fetchTeamsAdapter();
      return makeResponse(200, teams);
    } catch (e: any) {
      return makeResponse(500, { error: e.message || "Impossible de charger les équipes." });
    }
  }

  // --------------------------------------------------------
  // 2. POST /api/teams
  // --------------------------------------------------------
  if (url === "/api/teams" && method === "POST") {
    const { name, flag } = body || {};
    if (!name) return makeResponse(400, { error: "Nom d'équipe manquant." });
    try {
      const success = await insertTeamAdapter(name, flag || "🏳️");
      if (!success) return makeResponse(400, { error: "Cette équipe existe déjà." });
      return makeResponse(200, { success: true, team: { name, flag } });
    } catch (e: any) {
      return makeResponse(500, { error: e.message || "Erreur de création d'équipe." });
    }
  }

  // --------------------------------------------------------
  // 3. GET /api/matches
  // --------------------------------------------------------
  if (url === "/api/matches" && method === "GET") {
    try {
      const matches = await fetchMatchesAdapter();
      return makeResponse(200, matches || []);
    } catch (e: any) {
      return makeResponse(500, { error: e.message || "Erreur de lecture de la liste des matchs." });
    }
  }

  // --------------------------------------------------------
  // 4. POST /api/matches
  // --------------------------------------------------------
  if (url === "/api/matches" && method === "POST") {
    try {
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
    } catch (e: any) {
      return makeResponse(500, { error: e.message || "Exception de création du match." });
    }
  }

  // --------------------------------------------------------
  // 5. PUT /api/matches/:id
  // --------------------------------------------------------
  if (url.startsWith("/api/matches/") && method === "PUT") {
    const parts = url.split("/api/matches/");
    const matchId = parts[1];
    try {
      const success = await updateMatchAdapter(matchId, body);
      if (!success) return makeResponse(404, { error: "Match non trouvé." });
      return makeResponse(200, { success: true });
    } catch (e: any) {
      return makeResponse(500, { error: e.message || "Erreur lors de la modification du match." });
    }
  }

  // --------------------------------------------------------
  // 6. DELETE /api/matches/:id
  // --------------------------------------------------------
  if (url.startsWith("/api/matches/") && method === "DELETE") {
    const parts = url.split("/api/matches/");
    const matchId = parts[1];
    try {
      const success = await deleteMatchAdapter(matchId);
      if (!success) return makeResponse(404, { error: "Match non trouvé." });
      return makeResponse(200, { success: true });
    } catch (e: any) {
      return makeResponse(500, { error: e.message || "Erreur lors de la suppression du match." });
    }
  }

  // --------------------------------------------------------
  // 7. GET /api/matches/:id
  // --------------------------------------------------------
  if (url.startsWith("/api/matches/") && method === "GET") {
    const parts = url.split("/api/matches/");
    const matchId = parts[1];
    try {
      if (supabase) {
        const { data, error } = await supabase.from("matches").select("*").eq("id", matchId).single();
        if (error || !data) return makeResponse(404, { error: "Match non trouvé." });
        return makeResponse(200, mapMatchFromDb(data));
      } else {
        const db = getLocalDB();
        const m = db.matches.find(item => item.id === matchId);
        if (!m) return makeResponse(404, { error: "Match non trouvé." });
        return makeResponse(200, m);
      }
    } catch (e: any) {
      return makeResponse(500, { error: e.message || "Erreur lors du chargement du match." });
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
          let errMsg = error.message;
          if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("rate_limit")) {
            errMsg = "Limite d'inscription par e-mail atteinte (Supabase Security Rate Limit).\n\nPour débloquer cela dans votre projet Supabase :\n1. Allez sur votre Tableau de bord Supabase -> Authentication -> Providers -> Email et désactivez 'Confirm Email' (OFF).\n2. Ou bien augmentez la limite d'adresses d'envoi de mails dans Authentication -> Rate Limits.\n\nEn attendant, vous pouvez utiliser le bouton 'Connexion Directe' ou vous connecter avec 'client_test@example.com' (mot de passe: 'userpassword') pour tester l'application sans interruption !";
          } else if (errMsg.toLowerCase().includes("already registered") || errMsg.toLowerCase().includes("already_registered") || errMsg.toLowerCase().includes("already exists") || errMsg.toLowerCase().includes("existe déjà")) {
            errMsg = "Cet adresse e-mail est déjà inscrite ! Veuillez vous connecter avec le formulaire de Connexion à la place. Vous pouvez également utiliser le bouton de 'Connexion Directe / Démo' ou renseigner un autre e-mail pour créer un nouveau compte.";
          }
          return makeResponse(400, { error: errMsg });
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
        let { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
        if (!profile) {
          const isPremiumUser = email.toLowerCase() === "admin@exemple.com";
          const { error: insertErr } = await supabase.from("profiles").insert([{
            id: data.user.id,
            email: email.toLowerCase(),
            name: data.user.user_metadata?.name || "Client FootStream",
            phone: data.user.user_metadata?.phone || "",
            is_premium: isPremiumUser
          }]);
          if (!insertErr) {
            const { data: repr } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
            profile = repr;
          }
        }
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
        let { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", rawToken)
          .single();

        if (error || !profile) {
          // Fallback verify with supabase auth user if exists
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const isPremiumUser = user.email?.toLowerCase() === "admin@exemple.com";
            const { error: insertErr } = await supabase.from("profiles").upsert({
              id: user.id,
              email: user.email?.toLowerCase() || "",
              name: user.user_metadata?.name || "Client FootStream",
              phone: user.user_metadata?.phone || "",
              is_premium: isPremiumUser
            });
            if (!insertErr) {
              const { data: repr } = await supabase.from("profiles").select("*").eq("id", user.id).single();
              profile = repr;
            }
          }
        }

        const finalProfile = profile || {
          id: rawToken,
          email: "anon@stream.mg",
          name: "Client FootStream",
          phone: "",
          is_premium: false
        };

        return makeResponse(200, {
          id: finalProfile.id,
          email: finalProfile.email,
          name: finalProfile.name,
          phone: finalProfile.phone,
          isPremium: finalProfile.is_premium || finalProfile.email?.toLowerCase() === "admin@exemple.com"
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
    const appOrigin = body?.origin || window.location.origin;

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

      // 3. Request actual external redirect URL from secure Supabase Edge Function to bypass browser CORS
      let checkoutUrl = "";
      try {
        const edgeWebhookUrl = "https://egfpginsadncgkxrvmdu.supabase.co/functions/v1/papi-webhook";
        console.log("Contacting secure Supabase Edge Function CORS proxy for checkout link...");
        
        const tokenAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
        const edgeRes = await originalFetch(edgeWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": tokenAnon,
            "Authorization": `Bearer ${tokenAnon}`
          },
          body: JSON.stringify({
            action: "checkout",
            amount: 10000,
            clientName: userName,
            reference: paymentId,
            description: "Abonnement Premium FootStream (MVOLA/Airtel/Orange/BRED)",
            successUrl: `${appOrigin}/?status=success&payment_id=${paymentId}`,
            failureUrl: `${appOrigin}/?status=failed&payment_id=${paymentId}`,
            provider: provider,
            payerEmail: userEmail,
            payerPhone: userPhone
          })
        });

        if (edgeRes.ok) {
          const edgeJson = await edgeRes.json();
          checkoutUrl = edgeJson?.data?.paymentLink;
          if (!checkoutUrl) {
            throw new Error("L'Edge fonction Supabase n'a pas retourné de lien de redirection valide.");
          }
        } else {
          const errJson = await edgeRes.json().catch(() => ({}));
          const errMsg = errJson?.error || errJson?.message || `Erreur Proxy (Code ${edgeRes.status})`;
          return makeResponse(edgeRes.status, { error: errMsg });
        }
      } catch (err: any) {
        console.error("Critical error while communicating with Supabase Edge Function proxy:", err);
        return makeResponse(500, { error: `La liaison sécurisée avec l'Edge fonction Supabase a échoué : ${err.message || err}` });
      }
      
      return makeResponse(200, {
        checkoutUrl,
        paymentId
      });
    } else {
      const db = getLocalDB();
      const user = db.users.find(u => u.id === rawToken);
      if (!user) return makeResponse(401, { error: "Utilisateur introuvable." });

      const userEmail = user.email || "anon@stream.mg";
      const userName = user.name || "Client FootStream";
      const userPhone = user.phone || "+261340000000";

      // Request actual external redirect URL from secure Supabase Edge Function (Local fallback mode)
      let checkoutUrl = "";
      try {
        const edgeWebhookUrl = "https://egfpginsadncgkxrvmdu.supabase.co/functions/v1/papi-webhook";
        console.log("Contacting secure Supabase Edge Function CORS proxy for local checkout link...");
        
        const tokenAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
        const edgeRes = await originalFetch(edgeWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": tokenAnon,
            "Authorization": `Bearer ${tokenAnon}`
          },
          body: JSON.stringify({
            action: "checkout",
            amount: 10000,
            clientName: userName,
            reference: paymentId,
            description: "Abonnement Premium FootStream (MVOLA/Airtel/Orange/BRED)",
            successUrl: `${appOrigin}/?status=success&payment_id=${paymentId}`,
            failureUrl: `${appOrigin}/?status=failed&payment_id=${paymentId}`,
            provider: provider,
            payerEmail: userEmail,
            payerPhone: userPhone
          })
        });

        if (edgeRes.ok) {
          const edgeJson = await edgeRes.json();
          checkoutUrl = edgeJson?.data?.paymentLink;
          if (!checkoutUrl) {
            throw new Error("L'Edge fonction Supabase n'a pas retourné de lien de redirection valide.");
          }
        } else {
          const errJson = await edgeRes.json().catch(() => ({}));
          const errMsg = errJson?.error || errJson?.message || `Erreur Proxy (Code ${edgeRes.status})`;
          return makeResponse(edgeRes.status, { error: errMsg });
        }
      } catch (err: any) {
        console.error("Critical error while communicating with Supabase Edge Function proxy (Local DB):", err);
        return makeResponse(500, { error: `La liaison sécurisée avec l'Edge fonction Supabase a échoué : ${err.message || err}` });
      }

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

      return makeResponse(200, {
        checkoutUrl,
        paymentId
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
    // Correct Papi.mg webhook payload field names support
    const pId = body?.paymentReference || body?.merchantPaymentReference || body?.externalId || body?.id;
    const isSuccess = body?.paymentStatus === "SUCCESS" || body?.paymentStatus === "success" || body?.status === "success" || body?.status === "SUCCESS";
    
    if (supabase) {
      // 1. Update Payment status
      let { data: payment, error: fetchErr } = await supabase.from("payments").select("*").eq("id", pId).single();
      if (fetchErr || !payment) {
        // Fallback finder by papi_reference
        const { data: altPay } = await supabase.from("payments").select("*").eq("papi_reference", pId).limit(1);
        payment = altPay && altPay[0] ? altPay[0] : null;
      }

      if (!payment) {
        console.error("Webhook update failed: Payment not found for reference", pId);
        return makeResponse(404, { error: "Paiement introuvable." });
      }

      const exactPaymentId = payment.id;
      const { error: updateErr } = await supabase.from("payments").update({
        status: isSuccess ? "success" : "failed"
      }).eq("id", exactPaymentId);

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
      const pIdx = db.payments.findIndex(p => p.id === pId || p.papiReference === pId);
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
      
      const mappedUsers = (users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        isPremium: u.is_premium
      }));
      
      const mappedMatches = (matches || []).map(mapMatchFromDb);
      
      const mappedPayments = (payments || []).map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        amount: Number(p.amount),
        status: p.status,
        papiReference: p.papi_reference,
        createdAt: p.created_at
      }));

      return makeResponse(200, { users: mappedUsers, matches: mappedMatches, payments: mappedPayments });
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
      try {
        // First, guarantee the authenticated admin has a profile so RLS does not block insertions/seeding!
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isPremiumUser = user.email?.toLowerCase() === "admin@exemple.com";
          await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email?.toLowerCase() || "",
            name: user.user_metadata?.name || "Directeur de FootStream",
            phone: user.user_metadata?.phone || "",
            is_premium: isPremiumUser
          });
        }
      } catch (errProfile) {
        console.warn("Could not insert admin profile on reset:", errProfile);
      }

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

