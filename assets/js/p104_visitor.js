(function () {
  const roomInput = document.getElementById("roomCode");
  const connectBtn = document.getElementById("connectBtn");
  const toggleCaptionBtn = document.getElementById("toggleCaptionBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusEl = document.getElementById("status");
  const subtitlePanel = document.getElementById("subtitlePanel");
  const subtitleBox = document.getElementById("subtitleBox");
  const liveTag = document.getElementById("liveTag");

  let supabaseClient = null;
  let channel = null;
  let captionsVisible = true;

  function render(payload) {
    if (payload.type === "clear") {
      subtitleBox.textContent = "字幕已清除，等待新的字幕……";
      P104.setLiveTag(liveTag, "WAITING", false);
      return;
    }

    if (payload.type === "system") {
      P104.setStatus(statusEl, payload.text || "系統訊息");
      return;
    }

    subtitleBox.innerHTML = "";

    const time = document.createElement("div");
    time.className = "caption-time";
    time.textContent = `${payload.displayTime || P104.nowString()}｜${payload.language || ""}`;
    subtitleBox.appendChild(time);

    const finalDiv = document.createElement("div");
    finalDiv.textContent = (payload.text || "").trim() || "正在辨識……";
    subtitleBox.appendChild(finalDiv);

    if (payload.interimText) {
      const interimDiv = document.createElement("div");
      interimDiv.className = "interim";
      interimDiv.textContent = payload.interimText;
      subtitleBox.appendChild(interimDiv);
    }

    P104.setLiveTag(liveTag, payload.type === "interim" ? "LIVE" : "UPDATED", true);
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

      channel.on("broadcast", { event: "caption" }, ({ payload }) => {
        render(payload);
      });

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          P104.setStatus(statusEl, `已加入字幕房間：${roomCode}`);
          connectBtn.textContent = "重新加入";
          toggleCaptionBtn.disabled = false;
          clearBtn.disabled = false;
          P104.setLiveTag(liveTag, "WAITING", false);
        } else {
          P104.setStatus(statusEl, `連線狀態：${status}`);
        }
      });
    } catch (err) {
      P104.setStatus(statusEl, err.message || String(err));
    }
  }

  function toggleCaptions() {
    captionsVisible = !captionsVisible;
    subtitlePanel.classList.toggle("hidden", !captionsVisible);
    toggleCaptionBtn.textContent = captionsVisible ? "隱藏字幕" : "顯示字幕";
  }

  function clearLocal() {
    subtitleBox.textContent = "本機畫面已清除，等待新的字幕……";
    P104.setLiveTag(liveTag, "WAITING", false);
  }

  connectBtn.addEventListener("click", connectRoom);
  toggleCaptionBtn.addEventListener("click", toggleCaptions);
  clearBtn.addEventListener("click", clearLocal);
})();
