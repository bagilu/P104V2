# P104 WhisperTour Subtitle Experiment v1

本 ZIP 是 P104「輕聲導覽」的第一階段字幕實驗版。目的不是取代正式語音辨識服務，而是先驗證：

- 導遊端可以開啟即時字幕
- 導遊端可以選擇中文或英文
- 遊客端可以看到即時字幕
- 遊客端可以顯示或隱藏字幕
- 不儲存逐字稿

## 技術設計

本版本採用最低成本原型：

導遊端瀏覽器 SpeechRecognition 產生字幕  
→ Supabase Realtime Broadcast 傳送字幕  
→ 遊客端訂閱同一房間並顯示字幕

## 費用

本版本沒有串接 OpenAI、Google、Azure、Deepgram 等付費 STT API，因此不會產生這些 AI API 費用。

但仍可能有：

1. Supabase Realtime 使用量
2. GitHub Pages 或網站託管成本，若超出免費額度
3. 瀏覽器語音辨識本身的限制

## 重要限制

此版本使用瀏覽器內建 SpeechRecognition / webkitSpeechRecognition。它適合原型測試，但不適合作為正式穩定服務的唯一依據。

常見限制：

- 不同瀏覽器支援程度不同
- 手機瀏覽器可能有限制
- 長時間辨識可能中斷
- 麥克風權限被拒絕時無法啟動
- 中文專有名詞、人名、地名可能辨識錯誤

建議優先使用 Chrome 或 Edge 測試。

## 檔案說明

```text
P104_Subtitle_Experiment_v1/
├─ guide.html                         導遊端頁面
├─ visitor.html                       遊客端頁面
├─ config.sample.js                   Supabase 設定範例
├─ assets/
│  ├─ css/style.css                   介面樣式
│  └─ js/
│     ├─ p104_common.js               共用工具
│     ├─ p104_guide.js                導遊端邏輯
│     └─ p104_visitor.js              遊客端邏輯
└─ sql/
   └─ P104_subtitle_experiment_notes.sql
```

## 安裝步驟

### 1. 複製 config.sample.js

將：

```text
config.sample.js
```

複製成：

```text
config.js
```

### 2. 填入 Supabase 設定

在 `config.js` 中填入：

```js
window.P104_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_ID.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY"
};
```

### 3. 放到 GitHub Pages 或本機測試

若用 GitHub Pages，請把整個資料夾上傳到 repository。

若本機測試，建議用簡單伺服器，不要直接雙擊 HTML：

```bash
python -m http.server 8000
```

然後開啟：

```text
http://localhost:8000/guide.html
http://localhost:8000/visitor.html
```

## 使用方式

### 導遊端

1. 開啟 `guide.html`
2. 輸入房間代碼，例如 `P104-DEMO`
3. 選擇字幕語言：中文 Mandarin 或 English
4. 按「連線字幕房間」
5. 按「開啟即時字幕」
6. 允許麥克風權限
7. 開始說話

### 遊客端

1. 開啟 `visitor.html`
2. 輸入同一個房間代碼
3. 按「加入字幕房間」
4. 等待字幕出現
5. 可按「隱藏字幕」或「顯示字幕」

## 建議測試情境

### 中文測試

語言選擇 `zh-TW`，導遊朗讀：

> 各位來賓您好，歡迎使用 P104 WhisperTour 輕聲導覽系統。現在您可以在手機上聽到導覽，也可以看到即時字幕。

### 英文測試

語言選擇 `en-US`，導遊朗讀：

> Welcome to the P104 WhisperTour system. You can listen to the guide and read live captions on your phone.

## 下一階段建議

若第一階段測試成功，第二階段可以升級為正式 STT 架構：

- LiveKit audio stream
- LiveKit Agent 或後端 worker
- OpenAI / Google / Azure / Deepgram STT
- 可選擇是否儲存逐字稿
- 可加入即時翻譯
- 可加入導覽摘要

