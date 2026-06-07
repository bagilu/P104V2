export const P104_V2_BUILD = "2.2";

export function getConfig() {
  const cfg = window.P104_V2_CONFIG || window.P104_CONFIG;
  if (!cfg) {
    throw new Error("Missing config.js. Please copy config.sample.js to config.js and fill in your settings.");
  }
  return cfg;
}

export function getSupabase() {
  const cfg = getConfig();
  if (!window.supabase) throw new Error("Supabase JS SDK not loaded.");
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('/rest/v1')) {
    throw new Error("SUPABASE_URL must be the project root URL, e.g. https://xxxxx.supabase.co");
  }
  return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
}

export function generateRoomCode() {
  const cfg = getConfig();
  const prefix = cfg.ROOM_PREFIX || "P104V2";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}-${suffix}`;
}

export function normalizeRoomCode(room) {
  const cfg = getConfig();
  const prefix = cfg.ROOM_PREFIX || "P104V2";
  let code = (room || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!code) return generateRoomCode();
  if (!code.startsWith(prefix + "-")) code = `${prefix}-${code}`;
  return code;
}

export function getRoomFromURL() {
  const params = new URLSearchParams(location.search);
  return params.get("room");
}

export function makeVisitorURL(roomCode) {
  const url = new URL("visitor.html", location.href);
  url.searchParams.set("room", roomCode);
  return url.href;
}

export function makeChannelName(roomCode) {
  return `p104v2-subtitle-${roomCode.toLowerCase()}`;
}

export function renderQR(container, text, size = 220) {
  container.innerHTML = "";
  if (!window.QRCode) {
    container.textContent = text;
    return;
  }
  new window.QRCode(container, {
    text,
    width: size,
    height: size,
    correctLevel: window.QRCode.CorrectLevel.M
  });
}

export function setStatus(dotEl, textEl, message, state = "warn") {
  if (textEl) textEl.textContent = message;
  if (dotEl) {
    dotEl.classList.remove("ok", "warn", "bad");
    dotEl.classList.add(state);
  }
}

export function nowTime() {
  return new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function appendCaption(feed, text, time = nowTime()) {
  const cfg = getConfig();
  const max = cfg.MAX_CAPTION_PARAGRAPHS || 30;
  const div = document.createElement("div");
  div.className = "caption-item";
  const t = document.createElement("span");
  t.className = "time";
  t.textContent = time;
  const body = document.createElement("div");
  body.textContent = text;
  div.appendChild(t);
  div.appendChild(body);
  feed.appendChild(div);
  while (feed.children.length > max) feed.removeChild(feed.firstElementChild);
  feed.scrollTop = feed.scrollHeight;
}

export function clearCaptions(feed) {
  if (feed) feed.innerHTML = "";
}

export function compressRepeatedText(text) {
  let s = (text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  // Handles exact doubled strings, e.g. 禮義廉恥禮義廉恥 or hello world hello world.
  for (let len = Math.floor(s.length / 2); len >= 2; len--) {
    if (s.length === len * 2 && s.slice(0, len) === s.slice(len)) return s.slice(0, len).trim();
  }
  return s;
}

export async function requestLiveKitToken({ room, identity, role }) {
  const cfg = getConfig();
  const endpoint = cfg.LIVEKIT_TOKEN_ENDPOINT;
  if (!endpoint || endpoint.includes("YOUR_PROJECT_REF")) throw new Error("LIVEKIT_TOKEN_ENDPOINT is not configured.");
  const anonKey = cfg.SUPABASE_ANON_KEY;
  if (!anonKey || anonKey.includes("YOUR_SUPABASE_ANON")) {
    throw new Error("SUPABASE_ANON_KEY is not configured.");
  }
  console.info("P104 V2 token request", { endpoint, room, identity, role, build: P104_V2_BUILD });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`
    },
    body: JSON.stringify({ room, identity, role })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.token) {
    throw new Error(json.error || `Token request failed: ${res.status}. Please check config.js endpoint and clear browser cache.`);
  }
  return json.token;
}
