// Copy this file to config.js and fill in your real values.
// Do NOT commit config.js if it contains private or project-specific keys.
window.P104_V2_CONFIG = {
  // Supabase project root URL. Do not include /rest/v1/.
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  // Required for Supabase Realtime and for calling the P104_V2_livekit_token Edge Function.
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_PUBLIC_KEY",

  // LiveKit websocket URL, for example: wss://your-project.livekit.cloud
  LIVEKIT_URL: "wss://YOUR_LIVEKIT_HOST.livekit.cloud",

  // Supabase Edge Function URL for generating LiveKit access tokens.
  // Example: https://YOUR_PROJECT_REF.functions.supabase.co/P104_V2_livekit_token
  LIVEKIT_TOKEN_ENDPOINT: "https://YOUR_PROJECT_REF.functions.supabase.co/P104_V2_livekit_token",

  DEFAULT_CAPTION_LANGUAGE: "zh-TW",
  ROOM_PREFIX: "P104V2",
  MAX_CAPTION_PARAGRAPHS: 30
};
