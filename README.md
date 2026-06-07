# P104 V2 WhisperTour｜QR 房間 + 語音 + 即時字幕版

本版本把 P104 V2 的核心語音功能放回系統中，並整合前一版成功的即時字幕功能。

## 主要功能

1. `index.html` 作為導遊端首頁，適合 GitHub Pages 自動開啟。
2. 導遊端自動產生隨機房間代碼，例如 `P104V2-7K3D`。
3. 導遊端自動產生遊客 QR Code。
4. 遊客掃描後進入 `visitor.html?room=P104V2-XXXX`。
5. 遊客端也顯示同一個 QR Code，方便下一位遊客掃描加入。
6. LiveKit 負責語音傳輸。
7. Supabase Realtime Broadcast 負責字幕同步。
8. 導遊端可控制：
   - 開始說話
   - 暫停收音
   - 開啟即時字幕
   - 停止字幕
   - 清除字幕
9. 遊客端可控制：
   - 開始收聽語音
   - 顯示／隱藏字幕
10. 字幕採逐段顯示，每一段分開成段落，較適合 Chrome 網頁翻譯。
11. 不串接 OpenAI、Google Cloud Translation 或其他付費 AI API。

## 檔案結構

```text
P104_V2_WhisperTour_VoiceCaption/
├─ index.html
├─ visitor.html
├─ config.sample.js
├─ assets/
│  ├─ css/style.css
│  └─ js/
│     ├─ p104v2_common.js
│     ├─ p104v2_guide.js
│     └─ p104v2_visitor.js
├─ edge-functions/
│  └─ P104_V2_livekit_token/index.ts
├─ sql/P104_V2_realtime_notes.sql
├─ README.md
└─ README_SYSTEM.md
```

## 設定步驟

### 1. 建立 config.js

複製：

```text
config.sample.js
```

成為：

```text
config.js
```

填入：

```js
window.P104_V2_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_PUBLIC_KEY",
  LIVEKIT_URL: "wss://YOUR_LIVEKIT_HOST.livekit.cloud",
  LIVEKIT_TOKEN_ENDPOINT: "https://YOUR_PROJECT_REF.functions.supabase.co/P104_V2_livekit_token",
  DEFAULT_CAPTION_LANGUAGE: "zh-TW",
  ROOM_PREFIX: "P104V2",
  MAX_CAPTION_PARAGRAPHS: 30
};
```

注意：`SUPABASE_URL` 不可以加 `/rest/v1/`。

### 2. 建立 Supabase Edge Function

在 Supabase Dashboard 建立 Edge Function：

```text
P104_V2_livekit_token
```

把以下檔案內容貼上：

```text
edge-functions/P104_V2_livekit_token/index.ts
```

設定 secrets：

```text
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
```

建議再設定：

```text
P104_V2_ALLOWED_ORIGINS
```

例如：

```text
https://yourname.github.io,http://localhost:5500
```

若不設定 `P104_V2_ALLOWED_ORIGINS`，Function 會用 `Access-Control-Allow-Origin: *`，方便測試，但正式展示建議限制來源。

### 3. Supabase Realtime

本版本不需要建立資料表。字幕使用 Realtime Broadcast。

請確認：

```text
Realtime service：ON
Public channels：Allowed
```

### 4. GitHub Pages

把整個資料夾內容上傳到 GitHub Pages 專案。

導遊端首頁：

```text
https://yourname.github.io/P104V2/
```

遊客端由 QR Code 自動導向：

```text
https://yourname.github.io/P104V2/visitor.html?room=P104V2-XXXX
```

## 操作方式

### 導遊端

1. 開啟 `index.html`。
2. 系統自動產生房間代碼與 QR Code。
3. 請遊客掃描 QR Code。
4. 按「開始說話」開始傳送語音。
5. 按「開啟即時字幕」開始送出逐段字幕。
6. 暫停時可按「暫停收音」。
7. 不需要字幕時可按「停止字幕」。
8. 換展區或重新開始時可按「清除字幕」。

### 遊客端

1. 掃描 QR Code。
2. 進入遊客端頁面後，字幕會自動加入房間。
3. 按「開始收聽語音」後即可收聽導遊聲音。
4. 可按「隱藏字幕」或「顯示字幕」。
5. 若需要外語，可使用 Google Chrome 內建翻譯功能。

## 重要限制

1. 手機瀏覽器通常不允許自動播放聲音，所以遊客端需要點一次「開始收聽語音」。
2. 瀏覽器語音辨識以 Chrome 支援較佳。
3. Web Speech API 的字幕品質取決於現場收音、網路與瀏覽器。
4. Chrome 網頁翻譯不是本系統內建 AI 翻譯，而是瀏覽器輔助翻譯。
5. 此版本不儲存逐字稿。

## 疑難排解

### Supabase 字幕出現 CHANNEL_ERROR

1. 確認 `SUPABASE_URL` 沒有 `/rest/v1/`。
2. 確認 `config.js` 不是舊快取，請按 Ctrl + F5。
3. 確認 Realtime public channel 可用。
4. 確認 `SUPABASE_ANON_KEY` 正確。

### 語音無法連線

1. 確認 `LIVEKIT_URL` 是 `wss://...`。
2. 確認 Edge Function `P104_V2_livekit_token` 已部署。
3. 確認 Function secrets 已設定 `LIVEKIT_API_KEY` 與 `LIVEKIT_API_SECRET`。
4. 查看瀏覽器 Console 是否有 CORS 錯誤。
5. 若有 CORS 錯誤，檢查 `P104_V2_ALLOWED_ORIGINS` 是否包含 GitHub Pages 網址。

### 字幕重複

此版本已加入基本去重處理。若仍出現重複，可能是 Chrome Web Speech API 將同一句多次回傳 final。可以先放慢說話速度，並避免每句太短。
