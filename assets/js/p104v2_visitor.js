import { Room, RoomEvent, Track } from 'https://cdn.jsdelivr.net/npm/livekit-client@2.19.1/dist/livekit-client.esm.mjs';
import {
  getConfig, getSupabase, normalizeRoomCode, getRoomFromURL,
  makeVisitorURL, makeChannelName, renderQR, setStatus, appendCaption,
  clearCaptions, requestLiveKitToken
} from './p104v2_common.js';

const cfg = getConfig();
const supabase = getSupabase();

const els = {
  roomCode: document.getElementById('roomCode'),
  qrCode: document.getElementById('qrCode'),
  listenBtn: document.getElementById('listenBtn'),
  toggleCaptionBtn: document.getElementById('toggleCaptionBtn'),
  voiceStatus: document.getElementById('voiceStatus'),
  captionStatus: document.getElementById('captionStatus'),
  captionFeed: document.getElementById('captionFeed'),
  audioContainer: document.getElementById('audioContainer'),
  overallDot: document.getElementById('overallDot'),
  overallStatus: document.getElementById('overallStatus'),
};

const roomCode = normalizeRoomCode(getRoomFromURL() || 'DEMO');
let subtitleChannel = null;
let lkRoom = null;
let captionsVisible = true;
const seenCaptions = new Set();

function initUI() {
  els.roomCode.textContent = roomCode;
  renderQR(els.qrCode, makeVisitorURL(roomCode), 200);
  setStatus(els.overallDot, els.overallStatus, `字幕房間：${roomCode}`, 'warn');
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
      appendCaption(els.captionFeed, payload.text, payload.time);
      setStatus(els.overallDot, els.overallStatus, `接收字幕中：${roomCode}`, 'ok');
    })
    .on('broadcast', { event: 'clear' }, () => {
      seenCaptions.clear();
      clearCaptions(els.captionFeed);
    })
    .subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        els.captionStatus.textContent = `字幕狀態：已加入 ${roomCode}`;
        await subtitleChannel.send({ type: 'broadcast', event: 'hello', payload: { room: roomCode, ts: Date.now() } });
      } else if (status === 'CHANNEL_ERROR') {
        els.captionStatus.textContent = `字幕狀態：CHANNEL_ERROR ${err ? err.message || '' : ''}`;
        setStatus(els.overallDot, els.overallStatus, '字幕連線失敗', 'bad');
      } else {
        els.captionStatus.textContent = `字幕連線狀態：${status}`;
      }
    });
}

function attachAudioTrack(track) {
  const el = track.attach();
  el.autoplay = true;
  el.controls = true;
  el.playsInline = true;
  els.audioContainer.appendChild(el);
  const playPromise = el.play();
  if (playPromise && playPromise.catch) playPromise.catch(() => {
    els.voiceStatus.textContent = '語音狀態：瀏覽器需要再次點擊才能播放聲音';
  });
}

async function connectVoice() {
  try {
    if (lkRoom && lkRoom.state === 'connected') return;
    if (!cfg.LIVEKIT_URL || cfg.LIVEKIT_URL.includes('YOUR_LIVEKIT_HOST')) {
      throw new Error('LIVEKIT_URL 尚未設定。請在 config.js 填入 LiveKit websocket URL。');
    }
    els.voiceStatus.textContent = '語音狀態：連線中...';
    const identity = `visitor-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const token = await requestLiveKitToken({ room: roomCode, identity, role: 'visitor' });
    lkRoom = new Room({ adaptiveStream: true, dynacast: true });

    lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        attachAudioTrack(track);
        els.voiceStatus.textContent = '語音狀態：正在收聽導遊語音';
        setStatus(els.overallDot, els.overallStatus, `語音與字幕已連線：${roomCode}`, 'ok');
      }
    });

    lkRoom.on(RoomEvent.Disconnected, () => {
      els.voiceStatus.textContent = '語音狀態：已斷線';
    });

    await lkRoom.connect(cfg.LIVEKIT_URL, token);
    els.listenBtn.textContent = '已連線語音';
    els.listenBtn.disabled = true;
    els.voiceStatus.textContent = '語音狀態：已加入，等待導遊開始說話';
  } catch (err) {
    console.error(err);
    els.voiceStatus.textContent = `語音狀態：失敗：${err.message}`;
    setStatus(els.overallDot, els.overallStatus, '語音連線失敗', 'bad');
  }
}

function toggleCaptions() {
  captionsVisible = !captionsVisible;
  els.captionFeed.closest('.caption-panel').classList.toggle('hidden', !captionsVisible);
  els.toggleCaptionBtn.textContent = captionsVisible ? '隱藏字幕' : '顯示字幕';
}

els.listenBtn.addEventListener('click', connectVoice);
els.toggleCaptionBtn.addEventListener('click', toggleCaptions);

initUI();
connectSubtitleChannel();
