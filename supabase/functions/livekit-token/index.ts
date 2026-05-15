// Mints a LiveKit access token for the authenticated user.
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.15.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { room, identity, name } = await req.json();
    if (!room || !identity) return new Response("missing fields", { status: 400, headers: cors });
    const apiKey = Deno.env.get("LIVEKIT_API_KEY")!;
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET")!;
    const url = Deno.env.get("LIVEKIT_URL")!;
    const at = new AccessToken(apiKey, apiSecret, { identity, name: name ?? identity, ttl: "1h" });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    return new Response(JSON.stringify({ token, url }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
