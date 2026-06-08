# README_SYSTEM｜P104 V2 WhisperTour

## 專案定位

P104 V2 WhisperTour 是一套以「輕聲導覽」為核心的網頁式導覽系統。導遊可透過手機或筆電麥克風將語音傳送給遊客，遊客使用自己的手機與耳機收聽。此版本進一步加入即時字幕與 QR Code 群組加入機制。

## 系統架構

```text
導遊端 index.html
  ├─ 產生 room code
  ├─ 產生 visitor QR Code
  ├─ LiveKit 發送語音
  └─ Web Speech API 產生字幕
       ↓
Supabase Realtime Broadcast
       ↓
遊客端 visitor.html
  ├─ LiveKit 接收語音
  ├─ Supabase Realtime 接收字幕
  ├─ 顯示／隱藏字幕
  └─ Chrome 翻譯提示
```

## 技術分工

### LiveKit

用途：即時語音傳輸。

- 導遊端：canPublish = true
- 遊客端：canPublish = false, canSubscribe = true
- Token 由 `P104_V2_livekit_token` Edge Function 產生。

### Supabase Realtime Broadcast

用途：即時字幕與清除字幕訊息。

- 不建立資料表。
- 不儲存逐字稿。
- 使用 public broadcast channel。
- Channel name: `p104v2-subtitle-${roomCode.toLowerCase()}`

### Web Speech API

用途：導遊端瀏覽器語音辨識。

- 中文：zh-TW
- 英文：en-US
- 僅 final result 廣播給遊客。
- interim result 只在導遊端作為暫時預覽。

### QR Code

用途：快速加入導覽群組。

- 導遊端 QR Code 指向 `visitor.html?room=P104V2-XXXX`。
- 遊客端也顯示同一 QR Code。

## 命名規則

- 專案編號：P104 V2
- Edge Function：`P104_V2_livekit_token`
- SQL notes：`P104_V2_realtime_notes.sql`
- 不使用資料表，因此沒有 table schema。

## 安全設計

LiveKit API secret 不可放在前端。因此使用 Supabase Edge Function 產生 token。

建議正式展示時設定：

```text
P104_V2_ALLOWED_ORIGINS=https://yourname.github.io
```

測試階段可暫時不設定，Function 會允許所有 origin。

## 後續擴充方向

1. 正式翻譯 API：新增 `P104_V2_translate` Edge Function。
2. 地端 LLM 翻譯：新增 local translation server。
3. 字幕逐字稿儲存：新增 `P104_V2_CaptionLogs` 資料表。
4. 多導遊與多展區：新增群組管理與導覽場次設定。
5. 管理後台：查看目前群組、連線人數與導覽狀態。

### 401 Token request failed 修正說明

本版前端呼叫 `P104_V2_livekit_token` 時，會自動附上 Supabase anon key：

```text
apikey: SUPABASE_ANON_KEY
Authorization: Bearer SUPABASE_ANON_KEY
```

因此 Supabase Edge Function 即使維持 JWT Verification，也可以接受匿名使用者請求。若仍出現 401，請確認 `config.js` 的 `SUPABASE_ANON_KEY` 是否正確，且 `LIVEKIT_TOKEN_ENDPOINT` 是否指向 `P104_V2_livekit_token`。


## v2.3 修正
- 修正遊客端可能因瀏覽器快取而沿用舊 token request 程式，導致 `Token request failed: 401`。
- index.html 與 visitor.html 的 module script 加入 `?v=2.4` cache busting。
- guide / visitor 對 common module 的 import 也加入 `?v=2.4`。
- token request 仍會帶 `apikey` 與 `Authorization: Bearer <anon key>`，可維持 Edge Function JWT Verification。


## v2.4 遊客端極簡版修正

- 遊客端掃描 QR Code 後自動加入導覽群組。
- 字幕預設顯示，最新一句固定在最上方，舊字幕往下排列。
- 遊客端字幕不需滑動，預設保留最近 5 段。可在 `config.js` 增加 `VISITOR_MAX_CAPTION_PARAGRAPHS` 調整。
- 遊客端自動嘗試連線語音；若手機瀏覽器限制自動播放，畫面只保留一個大型「開始收聽語音」按鈕。
- 遊客端 QR Code 移到頁面最下方的「分享本導覽群組給其他遊客」區塊。
- Chrome 翻譯提示改為可展開說明，減少主畫面干擾。
