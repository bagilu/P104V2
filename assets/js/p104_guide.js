(function () {
  const roomInput = document.getElementById("roomCode");
  const languageSelect = document.getElementById("languageSelect");
  const connectBtn = document.getElementById("connectBtn");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusEl = document.getElementById("status");
  const subtitleBox = document.getElementById("subtitleBox");
  const liveTag = document.getElementById("liveTag");

  let supabaseClient = null;
  let channel = null;
  let recognition = null;
  let isRecognizing = false;
  let finalText = "";
  let lastInterimText = "";
  let lastFinalSegment = "";
  let lastBroadcastText = "";
  let lastBroadcastInterim = "";

  function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }

  function compactText(text) {
    return String(text || "").replace(/\s+/g, "").trim();
  }

  function normalizeSegment(text) {
    let value = String(text || "").replace(/\s+/g, " ").trim();
    value = removeExactDouble(value);
    return value;
  }

  // 修正瀏覽器語音辨識偶爾輸出「禮義廉恥禮義廉恥」這種完全重複片段。
  function removeExactDouble(text) {
    const raw = String(text || "").trim();
    const compact = compactText(raw);
    if (compact.length >= 4 && compact.length % 2 === 0) {
      const half = compact.length / 2;
      if (compact.slice(0, half) === compact.slice(half)) {
        return compact.slice(0, half);
      }
    }
    return raw;
  }

  function isSameText(a, b) {
    return compactText(a) === compactText(b);
  }

  function isAlreadyAtEnd(fullText, segment) {
    const full = compactText(fullText);
    const seg = compactText(segment);
    return Boolean(seg && full.endsWith(seg));
  }

  function appendFinalSegment(segment) {
    const clean = normalizeSegment(segment);
    if (!clean) return false;

    // 避免同一個 final result 被 Chrome/Edge 重送。
    if (isSameText(clean, lastFinalSegment)) return false;
    if (isAlreadyAtEnd(finalText, clean)) return false;

    finalText = `${finalText} ${clean}`.trim();
    lastFinalSegment = clean;
    return true;
  }

  function shouldShowInterim(interim) {
    const clean = normalizeSegment(interim);
    if (!clean) return "";

    // 若 interim 只是剛剛 final 的重複，不顯示、不廣播。
    if (isSameText(clean, lastFinalSegment)) return "";
    if (isAlreadyAtEnd(finalText, clean)) return "";

    return clean;
  }

  function render(text, interim = "") {
    const finalPart = String(text || "").trim();
    const interimPart = shouldShowInterim(interim);
    subtitleBox.innerHTML = "";

    const finalDiv = document.createElement("div");
    finalDiv.textContent = finalPart || "正在等待語音……";
    subtitleBox.appendChild(finalDiv);

    if (interimPart) {
      const interimDiv = document.createElement("div");
      interimDiv.className = "interim";
      interimDiv.textContent = interimPart;
      subtitleBox.appendChild(interimDiv);
    }
  }

  async function broadcastCaption(type, text, interimText = "") {
    if (!channel) return;

    const cleanInterim = type === "interim" ? shouldShowInterim(interimText) : "";
    const cleanText = String(text || "").trim();

    // 避免同一畫面內容因 onresult 高頻觸發而重複廣播。
    if (type !== "system" && type !== "clear") {
      if (isSameText(cleanText, lastBroadcastText) && isSameText(cleanInterim, lastBroadcastInterim)) return;
      lastBroadcastText = cleanText;
      lastBroadcastInterim = cleanInterim;
    }

    await channel.send({
      type: "broadcast",
      event: "caption",
      payload: {
        source: "guide",
        type,
        text: cleanText,
        interimText: cleanInterim,
        language: languageSelect.value,
        sentAt: new Date().toISOString(),
        displayTime: P104.nowString()
      }
    });
  }

  async function connectRoom() {
    try {
      const roomCode = P104.normalizeRoomCode(roomInput.value);
      if (!roomCode) {
        P104.setStatus(statusEl, "請輸入房間代碼。");
        return;
      }
      roomInput.value = roomCode;

      if (!supabaseClient) supabaseClient = P104.requireConfig();
      if (channel) await supabaseClient.removeChannel(channel);

      channel = supabaseClient.channel(P104.makeChannelName(roomCode), {
        config: { broadcast: { self: false } }
      });

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          P104.setStatus(statusEl, `已連線字幕房間：${roomCode}`);
          startBtn.disabled = false;
          clearBtn.disabled = false;
          connectBtn.textContent = "重新連線";
          broadcastCaption("system", "導遊端已準備好字幕。", "");
        } else {
          P104.setStatus(statusEl, `連線狀態：${status}`);
        }
      });
    } catch (err) {
      P104.setStatus(statusEl, err.message || String(err));
    }
  }

  function startRecognition() {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      P104.setStatus(statusEl, "此瀏覽器不支援 SpeechRecognition。請改用 Chrome 或 Edge 測試。");
      return;
    }
    if (!channel) {
      P104.setStatus(statusEl, "請先連線字幕房間。");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = languageSelect.value;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRecognizing = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      languageSelect.disabled = true;
      P104.setLiveTag(liveTag, "LIVE", true);
      P104.setStatus(statusEl, `即時字幕已開啟：${languageSelect.value}`);
      broadcastCaption("system", "導遊已開啟即時字幕。", "");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let newlyFinal = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newlyFinal += transcript;
        } else {
          interim += transcript;
        }
      }

      if (newlyFinal) {
        const appended = appendFinalSegment(newlyFinal);
        lastInterimText = "";
        render(finalText, "");
        if (appended) broadcastCaption("final", finalText, "");
      } else if (interim) {
        lastInterimText = shouldShowInterim(interim);
        render(finalText, lastInterimText);
        if (lastInterimText) broadcastCaption("interim", finalText, lastInterimText);
      }
    };

    recognition.onerror = (event) => {
      P104.setStatus(statusEl, `語音辨識錯誤：${event.error}`);
    };

    recognition.onend = () => {
      const shouldRestart = isRecognizing;
      if (shouldRestart) {
        try {
          recognition.start();
        } catch (err) {
          isRecognizing = false;
          startBtn.disabled = false;
          stopBtn.disabled = true;
          languageSelect.disabled = false;
          P104.setLiveTag(liveTag, "OFF", false);
          P104.setStatus(statusEl, "語音辨識已中斷，請重新開啟字幕。");
        }
      }
    };

    try {
      recognition.start();
    } catch (err) {
      P104.setStatus(statusEl, `無法啟動語音辨識：${err.message || err}`);
    }
  }

  function stopRecognition() {
    isRecognizing = false;
    if (recognition) recognition.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    languageSelect.disabled = false;
    P104.setLiveTag(liveTag, "OFF", false);
    P104.setStatus(statusEl, "即時字幕已停止。");
    broadcastCaption("system", "導遊已停止即時字幕。", "");
  }

  function clearCaption() {
    finalText = "";
    lastInterimText = "";
    lastFinalSegment = "";
    lastBroadcastText = "";
    lastBroadcastInterim = "";
    render("", "");
    broadcastCaption("clear", "", "");
  }

  connectBtn.addEventListener("click", connectRoom);
  startBtn.addEventListener("click", startRecognition);
  stopBtn.addEventListener("click", stopRecognition);
  clearBtn.addEventListener("click", clearCaption);
})();
