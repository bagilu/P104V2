# README_SYSTEM｜P104 Subtitle Experiment v1

## 專案定位

本版本是 P104 WhisperTour 的「字幕實驗版」，只驗證即時字幕流程，不處理正式身分驗證、不儲存逐字稿、不串接付費 STT API。

## 設計原則

1. 不破壞既有 P104 輕聲導覽主系統
2. 保持 GitHub Pages + Supabase 的輕量架構
3. 先以最低成本驗證可行性
4. 將正式 STT API、LiveKit Agent、翻譯、逐字稿儲存留到下一階段

## 目前資料流

Guide browser microphone  
→ Web Speech API SpeechRecognition  
→ Supabase Realtime Broadcast channel  
→ Visitor browser subtitle panel

## 房間規則

房間代碼會轉成大寫，並移除非英數、連字號、底線字元。

Realtime channel 名稱格式：

```text
p104-subtitle-{ROOM_CODE}
```

## 安全性說明

此版為實驗原型。Supabase anon key 可放在前端，但正式部署時應加入：

- 房間建立與加入權限
- 短期 token
- P104 前綴 Edge Function
- 導遊端與遊客端角色區分
- Realtime channel access control

## 不使用資料表的原因

本版本需求明確為「暫時不儲存逐字稿，或只做本機顯示」。因此不建立字幕資料表，避免資料保護、RLS、保存期限與刪除機制的額外問題。

## 未來正式版可擴充資料表

若未來要保存字幕，可新增：

- P104_caption_sessions
- P104_caption_segments
- P104_caption_access_logs

但正式版應先討論隱私告知、保存期限、刪除規則與使用同意。
