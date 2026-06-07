import { Room, createLocalAudioTrack } from 'https://cdn.jsdelivr.net/npm/livekit-client@2.19.1/dist/livekit-client.esm.mjs';
import {
  getConfig, getSupabase, generateRoomCode, normalizeRoomCode, getRoomFromURL,
  makeVisitorURL, makeChannelName, renderQR, setStatus, appendCaption,
  clearCaptions, compressRepeatedText, requestLiveKitToken, nowTime
} from './p104v2_common.js?v=2.3';

const cfg = getConfig();
const supabase = getSupabase();

const els = {
  roomCode: document.getElementById('roomCode'),
  qrCode: document.getElementById('qrCode'),
  visitorLink: document.getElementById('visitorLink'),
  copyLinkBtn: document.getElementById('copyLinkBtn'),
  newRoomBtn: document.getElementById('newRoomBtn'),
  speakBtn: document.getElementById('speakBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  voiceStatus: document.getElementById('voiceStatus'),
  startCaptionBtn: document.getElementById('startCaptionBtn'),
  stopCaptionBtn: document.getElementById('stopCaptionBtn'),
  clearCaptionBtn: document.getElementById('clearCaptionBtn'),
  captionLang: document.getElementById('captionLang'),
  captionStatus: document.getElementById('captionStatus'),
  interimText: document.getElementById('interimText'),
  captionFeed: document.getElementById('captionFeed'),
  overallDot: document.getElementById('overallDot'),
  overallStatus: document.getElementById('overallStatus'),
};

let roomCode = normalizeRoomCode(getRoomFromURL() || generateRoomCode());
let visitorURL = '';
let subtitleChannel = null;
let lkRoom = null;
let localAudioTrack = null;
let recognition = null;
let captionRunning = false;
let lastFinalText = '';
let lastFinalAt = 0;

function updateRoomUI() {
  visitorURL = makeVisitorURL(roomCode);
  els.roomCode.textContent = roomCode;
  els.visitorLink.textContent = visitorURL;
  renderQR(els.qrCode, visitorURL, 220);
  const url = new URL(location.href);
  url.searchParams.set('room', roomCode);
  history.replaceState(null, '', url.toString());
}

async function connectSubtitleChannel() {
  if (subtitleChannel) await supabase.removeChannel(subtitleChannel);
  subtitleChannel = supabase.channel(makeChannelName(roomCode), {
    config: { broadcast: { self: false } }
  });

  subtitleChannel
    .on('broadcast', { event: 'hello' }, ({ payload }) => {
      console.log('Visitor joined:', payload);
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        setStatus(els.overallDot, els.overallStatus, `導覽群組已建立：${roomCode}`, 'ok');
        els.captionStatus.textContent = `字幕群組已連線：${roomCode}`;
      } else if (status === 'CHANNEL_ERROR') {
        setStatus(els.overallDot, els.overallStatus, '字幕群組連線失敗', 'bad');
        els.captionStatus.textContent = `字幕狀態：CHANNEL_ERROR ${err ? err.message || '' : ''}`;
      } else {
        els.captionStatus.textContent = `字幕連線狀態：${status}`;
      }
    });
}

async function sendBroadcast(event, payload = {}) {
  if (!subtitleChannel) return;
  await subtitleChannel.send({ type: 'broadcast', event, payload });
}

async function connectVoiceIfNeeded() {
  if (lkRoom && lkRoom.state === 'connected') return;
  if (!cfg.LIVEKIT_URL || cfg.LIVEKIT_URL.includes('YOUR_LIVEKIT_HOST')) {
    throw new Error('LIVEKIT_URL 尚未設定。請在 config.js 填入 LiveKit websocket URL。');
  }
  const identity = `guide-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
  const token = await requestLiveKitToken({ room: roomCode, identity, role: 'guide' });
  lkRoom = new Room({ adaptiveStream: true, dynacast: true });
  await lkRoom.connect(cfg.LIVEKIT_URL, token);
}

async function startSpeaking() {
  try {
    els.voiceStatus.textContent = '語音狀態：連線中...';
    await connectVoiceIfNeeded();
    if (!localAudioTrack) {
      localAudioTrack = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      await lkRoom.localParticipant.publishTrack(localAudioTrack);
    }
    await localAudioTrack.unmute();
    els.voiceStatus.textContent = `語音狀態：正在傳送導遊麥克風（${roomCode}）`;
    els.speakBtn.textContent = '開始導覽';
    els.pauseBtn.disabled = false;
    setStatus(els.overallDot, els.overallStatus, `語音與字幕群組：${roomCode}`, 'ok');
  } catch (err) {
    console.error(err);
    els.voiceStatus.textContent = `語音狀態：失敗：${err.message}`;
    setStatus(els.overallDot, els.overallStatus, '語音連線失敗', 'bad');
  }
}

async function pauseSpeaking() {
  if (localAudioTrack) {
    await localAudioTrack.mute();
    els.voiceStatus.textContent = '語音狀態：已暫停收音';
  }
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) throw new Error('此瀏覽器不支援 Web Speech API。建議使用 Google Chrome。');
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = els.captionLang.value || cfg.DEFAULT_CAPTION_LANGUAGE || 'zh-TW';

  recognition.onstart = () => {
    captionRunning = true;
    els.captionStatus.textContent = `字幕狀態：辨識中（${recognition.lang}）`;
    els.startCaptionBtn.disabled = true;
    els.stopCaptionBtn.disabled = false;
  };

  recognition.onerror = (event) => {
    els.captionStatus.textContent = `字幕狀態：辨識錯誤：${event.error}`;
  };

  recognition.onend = () => {
    if (captionRunning) {
      // Chrome sometimes stops recognition automatically; restart while enabled.
      try { recognition.start(); } catch (_) {}
    } else {
      els.captionStatus.textContent = '字幕狀態：已停止';
      els.startCaptionBtn.disabled = false;
      els.stopCaptionBtn.disabled = true;
    }
  };

  recognition.onresult = async (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const raw = event.results[i][0].transcript || '';
      const text = compressRepeatedText(raw);
      if (!text) continue;
      if (event.results[i].isFinal) {
        const now = Date.now();
        // Basic de-duplication for repeated final callbacks.
        if (text === lastFinalText && now - lastFinalAt < 5000) continue;
        if (lastFinalText && text.includes(lastFinalText) && text.length <= lastFinalText.length + 2) continue;
        lastFinalText = text;
        lastFinalAt = now;
        const payload = {
          id: crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random()}`,
          text,
          lang: recognition.lang,
          time: nowTime(),
          ts: now
        };
        appendCaption(els.captionFeed, text, payload.time);
        els.interimText.textContent = '等待下一段字幕...';
        await sendBroadcast('caption', payload);
      } else {
        interim += text + ' ';
      }
    }
    if (interim.trim()) els.interimText.textContent = interim.trim();
  };
}

function startCaptions() {
  try {
    if (!recognition) setupSpeechRecognition();
    recognition.lang = els.captionLang.value;
    lastFinalText = '';
    lastFinalAt = 0;
    captionRunning = true;
    recognition.start();
  } catch (err) {
    console.error(err);
    els.captionStatus.textContent = `字幕狀態：無法開啟：${err.message}`;
  }
}

function stopCaptions() {
  captionRunning = false;
  if (recognition) recognition.stop();
  els.interimText.textContent = '字幕已停止。';
}

async function clearAllCaptions() {
  clearCaptions(els.captionFeed);
  els.interimText.textContent = '字幕已清除。';
  lastFinalText = '';
  lastFinalAt = 0;
  await sendBroadcast('clear', { time: nowTime(), ts: Date.now() });
}

async function resetRoom() {
  roomCode = generateRoomCode();
  updateRoomUI();
  clearCaptions(els.captionFeed);
  if (lkRoom) {
    try { await lkRoom.disconnect(); } catch (_) {}
    lkRoom = null;
    localAudioTrack = null;
  }
  els.voiceStatus.textContent = '語音狀態：尚未連線';
  els.pauseBtn.disabled = true;
  await connectSubtitleChannel();
}

els.copyLinkBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(visitorURL);
  els.copyLinkBtn.textContent = '已複製';
  setTimeout(() => els.copyLinkBtn.textContent = '複製遊客連結', 1200);
});
els.newRoomBtn.addEventListener('click', resetRoom);
els.speakBtn.addEventListener('click', startSpeaking);
els.pauseBtn.addEventListener('click', pauseSpeaking);
els.startCaptionBtn.addEventListener('click', startCaptions);
els.stopCaptionBtn.addEventListener('click', stopCaptions);
els.clearCaptionBtn.addEventListener('click', clearAllCaptions);

updateRoomUI();
connectSubtitleChannel();
