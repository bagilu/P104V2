// Copy this file to config.js and fill in your real values.
// Do NOT commit config.js if it contains private or project-specific keys.
window.P104_V2_CONFIG = {
  // Supabase project root URL. Do not include /rest/v1/.
  SUPABASE_URL: "https://mfljkyvdadxlrbxlboce.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGpreXZkYWR4bHJieGxib2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTQwMDUsImV4cCI6MjA4MDM5MDAwNX0.Z4OeacVpO8yM1d1uOWZ6jU2Gl7wgEbhXvAFSqF5pBRs",

  // LiveKit websocket URL, for example: wss://your-project.livekit.cloud
  LIVEKIT_URL: "wss://test-r0pww5a8.livekit.cloud",

  // Supabase Edge Function URL for generating LiveKit access tokens.
  // Example: https://YOUR_PROJECT_REF.functions.supabase.co/P104_V2_livekit_token
  LIVEKIT_TOKEN_ENDPOINT: "https://mfljkyvdadxlrbxlboce.supabase.co/functions/v1/P104_V2_livekit_token",

  DEFAULT_CAPTION_LANGUAGE: "zh-TW",
  ROOM_PREFIX: "P104V2",
  MAX_CAPTION_PARAGRAPHS: 30
};
