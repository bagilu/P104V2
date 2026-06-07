# README_SYSTEM｜P104 V2 WhisperTour

## 專案定位

P104 V2 WhisperTour 是一套以「輕聲導覽」為核心的網頁式導覽系統。導遊可透過手機或筆電麥克風將語音傳送給遊客，遊客使用自己的手機與耳機收聽。此版本進一步加入即時字幕與 QR Code 房間加入機制。

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

用途：快速加入房間。

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
4. 多導遊與多展區：新增房間管理與導覽場次設定。
5. 管理後台：查看目前房間、連線人數與導覽狀態。
