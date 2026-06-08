import { Room, RoomEvent, Track } from 'https://cdn.jsdelivr.net/npm/livekit-client@2.19.1/dist/livekit-client.esm.mjs';
import {
  getConfig, getSupabase, normalizeRoomCode, getRoomFromURL,
  makeVisitorURL, makeChannelName, renderQR, setStatus, prependCaption,
  clearCaptions, requestLiveKitToken
} from './p104v2_common.js?v=2.4';

const cfg = getConfig();
const supabase = getSupabase();

const els = {
  roomCode: document.getElementById('roomCode'),
  qrCode: document.getElementById('qrCode'),
  listenBtn: document.getElementById('listenBtn'),
  toggleCaptionBtn: document.getElementById('toggleCaptionBtn'),
  fontBtn: document.getElementById('fontBtn'),
  voiceStatus: document.getElementById('voiceStatus'),
  captionStatus: document.getElementById('captionStatus'),
  captionFeed: document.getElementById('captionFeed'),
  audioContainer: document.getElementById('audioContainer'),
  overallDot: document.getElementById('overallDot'),
  overallStatus: document.getElementById('overallStatus'),
  visitorState: document.getElementById('visitorState'),
};

const roomCode = normalizeRoomCode(getRoomFromURL() || 'DEMO');
let subtitleChannel = null;
let lkRoom = null;
let captionsVisible = true;
let fontLarge = false;
let audioUnlocked = false;
const seenCaptions = new Set();

function initUI() {
  els.roomCode.textContent = roomCode;
  renderQR(els.qrCode, makeVisitorURL(roomCode), 180);
  setStatus(els.overallDot, els.overallStatus, '已加入導覽群組', 'warn');
  els.visitorState.textContent = '等待導覽開始';
}

async function connectSubtitleChannel() {
  subtitleChannel = supabase.channel(makeChannelName(roomCode), {
    config: { broadcast: { self: false } }
  });
  subtitleChannel
    .on('broadcast', { event: 'caption' }, ({ payload }) => {
      if (!payload || !payload.text) return;
      if (seenCaptions.has(payload.id)) return;
      seenCaptions.add(payload.id);
      const maxItems = Math.max(3, Math.min(cfg.VISITOR_MAX_CAPTION_PARAGRAPHS || 5, 8));
      prependCaption(els.captionFeed, payload.text, maxItems);
      els.visitorState.textContent = '正在導覽中';
      setStatus(els.overallDot, els.overallStatus, '正在接收導覽', 'ok');
    })
    .on('broadcast', { event: 'clear' }, () => {
      seenCaptions.clear();
      clearCaptions(els.captionFeed);
      els.captionFeed.innerHTML = '<div class="empty-caption">字幕已清除，等待下一段說明……</div>';
    })
    .subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        els.captionStatus.textContent = '字幕狀態：已自動加入';
        await subtitleChannel.send({ type: 'broadcast', event: 'hello', payload: { room: roomCode, ts: Date.now() } });
      } else if (status === 'CHANNEL_ERROR') {
        els.captionStatus.textContent = `字幕狀態：連線失敗 ${err ? err.message || '' : ''}`;
        setStatus(els.overallDot, els.overallStatus, '字幕連線失敗', 'bad');
      } else {
        els.captionStatus.textContent = `字幕連線狀態：${status}`;
      }
    });
}

function updateListenButton(text, disabled = false) {
  els.listenBtn.textContent = text;
  els.listenBtn.disabled = disabled;
}

async function tryPlayAudioElements() {
  const audioEls = [...els.audioContainer.querySelectorAll('audio')];
  if (!audioEls.length) return false;
  let ok = false;
  for (const audio of audioEls) {
    try {
      audio.muted = false;
      audio.volume = 1;
      await audio.play();
      ok = true;
    } catch (_) {
      // Some browsers require another user gesture.
    }
  }
  if (ok) {
    audioUnlocked = true;
    els.voiceStatus.textContent = '語音狀態：正在收聽導遊語音';
    updateListenButton('正在收聽語音', true);
    setStatus(els.overallDot, els.overallStatus, '語音與字幕已連線', 'ok');
  }
  return ok;
}

function attachAudioTrack(track) {
  const el = track.attach();
  el.autoplay = true;
  el.controls = false;
  el.playsInline = true;
  els.audioContainer.appendChild(el);
  tryPlayAudioElements().then((ok) => {
    if (!ok) {
      els.voiceStatus.textContent = '語音狀態：請點一下「開始收聽語音」';
      updateListenButton('開始收聽語音', false);
    }
  });
}

async function connectVoice({ userGesture = false } = {}) {
  try {
    if (lkRoom && lkRoom.state === 'connected') {
      const ok = await tryPlayAudioElements();
      if (!ok) {
        els.voiceStatus.textContent = '語音狀態：已連線，等待導遊開始導覽或請再次點擊';
      }
      return;
    }
    if (!cfg.LIVEKIT_URL || cfg.LIVEKIT_URL.includes('YOUR_LIVEKIT_HOST')) {
      throw new Error('LIVEKIT_URL 尚未設定。請在 config.js 填入 LiveKit websocket URL。');
    }
    els.voiceStatus.textContent = userGesture ? '語音狀態：連線中...' : '語音狀態：正在自動嘗試連線...';
    updateListenButton('語音連線中...', true);

    const identity = `visitor-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const token = await requestLiveKitToken({ room: roomCode, identity, role: 'visitor' });
    lkRoom = new Room({ adaptiveStream: true, dynacast: true });

    lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        attachAudioTrack(track);
      }
    });

    lkRoom.on(RoomEvent.Disconnected, () => {
      els.voiceStatus.textContent = '語音狀態：已斷線，請重新整理或重新加入';
      updateListenButton('重新收聽語音', false);
    });

    await lkRoom.connect(cfg.LIVEKIT_URL, token);
    els.voiceStatus.textContent = '語音狀態：已加入，等待導遊開始導覽';
    updateListenButton('開始收聽語音', false);

    // If the guide is already speaking, existing subscribed tracks may be available shortly.
    setTimeout(() => tryPlayAudioElements(), 300);
  } catch (err) {
    console.error(err);
    els.voiceStatus.textContent = `語音狀態：失敗：${err.message}`;
    updateListenButton('開始收聽語音', false);
    setStatus(els.overallDot, els.overallStatus, '語音連線失敗', 'bad');
  }
}

function toggleCaptions() {
  captionsVisible = !captionsVisible;
  els.captionFeed.closest('.caption-panel').classList.toggle('hidden', !captionsVisible);
  els.toggleCaptionBtn.textContent = captionsVisible ? '隱藏字幕' : '顯示字幕';
}

function toggleFont() {
  fontLarge = !fontLarge;
  document.body.classList.toggle('visitor-font-large', fontLarge);
  els.fontBtn.textContent = fontLarge ? '標準字幕' : '放大字幕';
}

els.listenBtn.addEventListener('click', () => connectVoice({ userGesture: true }));
els.toggleCaptionBtn.addEventListener('click', toggleCaptions);
els.fontBtn.addEventListener('click', toggleFont);

initUI();
connectSubtitleChannel();
// 自動嘗試連線。若手機瀏覽器限制自動播放，遊客只需再點一次「開始收聽語音」。
connectVoice({ userGesture: false });
