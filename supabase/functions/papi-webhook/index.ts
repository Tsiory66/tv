// ====================================================================
// SUPABASE EDGE FUNCTION: papi-webhook
// Handles both Secure CORS-bypassing Checkout API and Webhook updates
// Deploy using: "supabase functions deploy papi-webhook"
// ====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // Handle CORS Preflight Options Request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-action",
      },
      status: 200,
    })
  }

  // Only permit POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 405
    })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    // Load your Papi.mg key securely from the Supabase environment
    const papiApiKey = Deno.env.get("PAPI_API_KEY") || "$2a$12$abjdxfghijtlmnopqrutwuOyqH.buBhlF.Yim.XsHy4xJYw1.pvM2"
    
    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error("Missing database secrets on deployment environment variables.")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole)
    const payload = await req.json()

    console.log("Received raw payload:", JSON.stringify(payload))

    // Determine the route: is it a Client request to create a checkout link or an incoming webhook from Papi.mg?
    const action = payload.action ?? req.headers.get("x-action") ?? ""

    if (action === "checkout") {
      // --------------------------------------------------------------------
      // ACTION: Create Secure Papi Payment Link on Server side (Bypasses browser CORS)
      // --------------------------------------------------------------------
      console.log("Processing secure checkout link generation (CORS proxy)...")
      
      const { 
        amount = 10000, 
        clientName = "Client FootStream", 
        reference, 
        description = "Abonnement Premium FootStream (MVOLA/Airtel/Orange/BRED)",
        successUrl,
        failureUrl,
        provider = "MVOLA",
        payerEmail = "anon@stream.mg",
        payerPhone = "+261340000000"
      } = payload;

      if (!reference) {
        return new Response(JSON.stringify({ error: "Missing checkout reference (reference tag)." }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          status: 400
        })
      }

      // Self-pointing URL for webhook updates
      const selfWebhookUrl = "https://egfpginsadncgkxrvmdu.supabase.co/functions/v1/papi-webhook"

      console.log(`Forwarding payload to Papi.mg for reference ${reference}...`)

      const papiRes = await fetch("https://app.papi.mg/dashboard/api/payment-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Token": papiApiKey
        },
        body: JSON.stringify({
          amount,
          clientName,
          reference,
          description,
          successUrl,
          failureUrl,
          notificationUrl: selfWebhookUrl,
          provider,
          payerEmail,
          payerPhone,
          isTestMode: false
        })
      })

      if (papiRes.ok) {
        const papiJson = await papiRes.json()
        console.log("Papi.mg successfully returned checkout link payload:", JSON.stringify(papiJson))
        
        return new Response(JSON.stringify({
          success: true,
          data: papiJson?.data ?? {}
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          status: 200
        })
      } else {
        const errJson = await papiRes.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || errJson?.message || `Papi.mg error (Code ${papiRes.status})`;
        console.error("Papi.mg API validation failed with payload:", JSON.stringify(errJson))
        return new Response(JSON.stringify({ 
          error: errMsg, 
          details: errJson 
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          status: papiRes.status
        })
      }
    } else {
      // --------------------------------------------------------------------
      // ACTION: Webhook receiver triggered from Papi.mg on status change
      // --------------------------------------------------------------------
      console.log("Processing incoming Papi.mg webhook notification...")
      const data = payload.data || {}
      
      const paymentId = payload.paymentReference 
        || payload.merchantPaymentReference 
        || payload.externalId 
        || payload.id 
        || data.paymentReference 
        || data.merchantPaymentReference 
        || data.externalId 
        || data.id;

      const statusVal = payload.paymentStatus 
        || payload.status 
        || data.paymentStatus 
        || data.status;

      if (!paymentId) {
        console.error("Missing identification reference in incoming webhook.")
        return new Response(JSON.stringify({ error: "Missing external identification reference." }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          status: 400
        })
      }

      // Find matching payment record using multiple fallback hooks
      let { data: payment, error: fetchErr } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .maybeSingle();

      if (fetchErr || !payment) {
        // Fallback by papi_reference
        const { data: altPayment } = await supabase
          .from("payments")
          .select("*")
          .eq("papi_reference", paymentId)
          .maybeSingle();
        payment = altPayment;
      }

      if (!payment) {
        console.warn(`No active payment records found matches: ${paymentId}`)
        return new Response(JSON.stringify({ error: `Transaction record ${paymentId} could not be resolved inside Supabase.` }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          status: 404
        })
      }

      // Update status
      const isSuccess = statusVal && ["SUCCESS", "SUCCESSFUL", "COMPLETED", "success"].includes(statusVal.toString().trim().toUpperCase());
      const finalStatus = isSuccess ? "success" : "failed"

      console.log(`Setting payment status to ${finalStatus} for profile ${payment.user_id}, internal ID: ${payment.id}`)
      const { error: updateErr } = await supabase
         .from("payments")
         .update({ status: finalStatus })
         .eq("id", payment.id)

      if (updateErr) {
        console.error("Database update error:", updateErr.message)
        throw updateErr
      }

      // Activate premium status
      if (isSuccess) {
         console.log(`Activating profile Premium tier: user ID: ${payment.user_id}`)
         const { error: profileErr } = await supabase
           .from("profiles")
           .update({ is_premium: true })
           .eq("id", payment.user_id)

         if (profileErr) {
           console.error("Failed to upgrade profiles Premium privilege:", profileErr.message)
         } else {
           console.log(`Success! Premium upgrade successfully granted for UUID ${payment.user_id}`)
         }
      }

      return new Response(
        JSON.stringify({ success: true, message: `Status updated successfully to ${finalStatus}.` }),
        {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          },
          status: 200,
        }
      )
    }

  } catch (err: any) {
    console.error("Runtime exception happening in webhook:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    })
  }
})
