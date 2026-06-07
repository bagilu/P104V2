// Supabase Edge Function: P104_V2_livekit_token
// Dashboard paste version. Create a new Edge Function named P104_V2_livekit_token and paste this file.
// Required secrets:
//   LIVEKIT_API_KEY
//   LIVEKIT_API_SECRET
// Optional secret:
//   P104_V2_ALLOWED_ORIGINS  e.g. https://yourname.github.io,http://localhost:5500

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { AccessToken } from "npm:livekit-server-sdk@2";

function getCorsHeaders(origin: string | null) {
  const allowed = (Deno.env.get("P104_V2_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowOrigin = allowed.length === 0
    ? "*"
    : (origin && allowed.includes(origin) ? origin : allowed[0]);

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function sanitizeRoom(room: unknown) {
  const value = String(room || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!value || value.length > 40) throw new Error("Invalid room");
  return value;
}

function sanitizeIdentity(identity: unknown) {
  const value = String(identity || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
  if (!value) return `guest-${crypto.randomUUID()}`;
  return value;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    if (!apiKey || !apiSecret) throw new Error("Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET");

    const body = await req.json().catch(() => ({}));
    const room = sanitizeRoom(body.room);
    const identity = sanitizeIdentity(body.identity);
    const role = body.role === "guide" ? "guide" : "visitor";

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: role === "guide" ? "導遊" : "遊客",
      ttl: "2h",
    });

    at.addGrant({
      roomJoin: true,
      room,
      canSubscribe: true,
      canPublish: role === "guide",
      canPublishData: false,
    });

    const token = await at.toJwt();

    return new Response(JSON.stringify({ token, room, identity, role }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
