// create-order/index.ts for Supabase Edge Functions (Deno) - FIXED VERSION

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ? Hardcoded config (replace with environment variables for production)
const RAZORPAY_KEY_ID = "rzp_live_ReluTQKCAnR5id";
const RAZORPAY_KEY_SECRET = "FAsdv8cHERuTXUTG5Ih81N0g";
const SUPABASE_URL = "https://crm-supabase.7za6uc.easypanel.host";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NDk4Mzk0MDAsImV4cCI6MTkwNzYwNTgwMH0.RUr6v34x5v9ZPaSSjIgqamSeOtPyVpfv20r7wQ4niK0";

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { headers, status: 405 });
    }

    let bodyText = await req.text();
    if (!bodyText.trim()) {
      return new Response(JSON.stringify({ error: "Empty request body" }), { headers, status: 400 });
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON", receivedBody: bodyText.slice(0, 100) }), {
        headers,
        status: 400,
      });
    }

    if (!body.amount || !body.currency) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { headers, status: 400 });
    }

    // ✅ FIX 1: Proper validation and conversion from rupees to paise
    const rupees = Number(body.amount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount value" }), { headers, status: 400 });
    }

    // ✅ Convert to paise (Razorpay expects integer paise)
    const amountPaise = Math.round(rupees * 100);

    console.log(`Converting ₹${rupees} to ${amountPaise} paise for Razorpay`);

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,             // ✅ Use paise here
        currency: (body.currency || "INR").toUpperCase(),
        receipt: body.receipt || `receipt_${Date.now()}`,
        notes: body.notes || {},
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay API error:", errorText);
      return new Response(JSON.stringify({ error: "Razorpay API error", details: errorText }), {
        headers,
        status: razorpayResponse.status,
      });
    }

    const orderData = await razorpayResponse.json();
    console.log("Razorpay order created:", orderData.id, "Amount:", orderData.amount, "paise");

    // Insert into Supabase (non-blocking)
    const { error } = await supabase.from("razorpay_orders").insert({
      order_id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      status: orderData.status,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase insert error:", error);
      // Don't block the response if database insert fails
    }

    // ✅ FIX 2: Return key_id to ensure client/server sync
    return new Response(JSON.stringify({
      id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      status: orderData.status,
      key_id: RAZORPAY_KEY_ID,   // ✅ Send to client to guarantee same account
    }), { headers, status: 200 });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      headers,
      status: 500,
    });
  }
});
