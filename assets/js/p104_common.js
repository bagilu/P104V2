(function () {
  function requireConfig() {
    if (!window.P104_CONFIG) {
      throw new Error("找不到 config.js。請先將 config.sample.js 複製為 config.js，並填入 Supabase URL 與 anon key。");
    }
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.P104_CONFIG;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("YOUR_PROJECT_ID")) {
      throw new Error("config.js 尚未設定 Supabase URL 或 anon key。");
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function normalizeRoomCode(code) {
    return String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-_]/g, "")
      .slice(0, 40);
  }

  function makeChannelName(roomCode) {
    return `p104-subtitle-${roomCode}`;
  }

  function nowString() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function setStatus(el, msg) {
    el.textContent = msg;
  }

  function setLiveTag(el, text, isOn) {
    el.textContent = text;
    el.classList.toggle("on", Boolean(isOn));
    el.classList.toggle("off", !isOn);
  }

  window.P104 = {
    requireConfig,
    normalizeRoomCode,
    makeChannelName,
    nowString,
    setStatus,
    setLiveTag
  };
})();
