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

  function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }

  function render(text, interim = "") {
    const finalPart = text.trim();
    const interimPart = interim.trim();
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
    await channel.send({
      type: "broadcast",
      event: "caption",
      payload: {
        source: "guide",
        type,
        text,
        interimText,
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
        finalText = `${finalText} ${newlyFinal}`.trim();
        lastInterimText = "";
        render(finalText, "");
        broadcastCaption("final", finalText, "");
      } else if (interim) {
        lastInterimText = interim;
        render(finalText, lastInterimText);
        broadcastCaption("interim", finalText, lastInterimText);
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
    render("", "");
    broadcastCaption("clear", "", "");
  }

  connectBtn.addEventListener("click", connectRoom);
  startBtn.addEventListener("click", startRecognition);
  stopBtn.addEventListener("click", stopRecognition);
  clearBtn.addEventListener("click", clearCaption);
})();
