// ====================================================================
// SUPABASE EDGE FUNCTION: papi-webhook
// Secure real-time notification endpoint from Papi.mg.
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
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
      status: 200,
    })
  }

  // Only permit POST hooks
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      headers: { "Content-Type": "application/json" },
      status: 405
    })
  }

  try {
    // 1. Initialise Supabase Client with full system privilege to update premium markers safely
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    
    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error("Missing database secrets on deployment environment variables.")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole)

    // 2. Parse request payload
    const payload = await req.json()
    console.log("Papi.mg Webhook received notification:", JSON.stringify(payload))

    const data = payload.data || {}
    const paymentId = payload.paymentReference || payload.externalId || data.paymentReference || data.externalId
    const statusVal = payload.paymentStatus || payload.status || data.paymentStatus || data.status

    if (!paymentId) {
      return new Response(JSON.stringify({ error: "Missing external identification reference." }), {
        headers: { "Content-Type": "application/json" },
        status: 400
      })
    }

    // 3. Find matching payment record
    const { data: payment, error: fetchErr } = await supabase
      .from("payments")
      .select("*")
      .or(`id.eq.${paymentId},papi_reference.eq.${paymentId}`)
      .single()

    if (fetchErr || !payment) {
      console.warn(`No active payment matches: ${paymentId}`)
      return new Response(JSON.stringify({ error: `No active transaction records match ID ${paymentId}` }), {
        headers: { "Content-Type": "application/json" },
        status: 404
      })
    }

    // 4. Update status based on transaction success
    const isSuccess = statusVal && ["SUCCESS", "SUCCESSFUL", "COMPLETED"].includes(statusVal.toString().toUpperCase());
    const finalStatus = isSuccess ? "success" : "failed"

    console.log(`Setting payment status to ${finalStatus} for reference: ${payment.id}`)
    const { error: updateErr } = await supabase
      .from("payments")
      .update({ status: finalStatus })
      .eq("id", payment.id)

    if (updateErr) {
      throw updateErr
    }

    // 5. Activate premium access lifetime on successful settlement!
    if (isSuccess) {
      console.log(`Activating premium for User Profile UUID: ${payment.user_id}`)
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("id", payment.user_id)

      if (profileErr) {
        console.error("Failed to upgrade profile to Premium:", profileErr.message)
      } else {
        console.log(`Success! Life access upgraded for profile ID ${payment.user_id}`)
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

  } catch (err: any) {
    console.error("Runtime exception occurring in Edge Function:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    })
  }
})
