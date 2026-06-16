# 筆記管理系統本地端成品

這是 JavaScript 期末專題的本地端展示版。直接開啟 `index.html` 就可以操作，不需要登入、安裝後端、資料庫或套件。

## 已完成功能

- 筆記列表：顯示所有筆記，置頂筆記會排在前面
- 新增筆記：標題必填，分類預設為「未分類」
- 編輯筆記：選取列表中的筆記後可修改內容
- 刪除筆記：刪除後列表會立即刷新
- 搜尋筆記：支援搜尋標題與內容
- 分類篩選：依單一分類篩選筆記
- 收藏與置頂：可用於展示加分功能
- 本地端保存：資料會儲存在瀏覽器的 `localStorage`
- 展示資料：可一鍵重置示範筆記
- 主題切換：可用太陽/月亮按鈕在石墨灰與深灰夜色之間切換並保留偏好
- 匯出筆記：可將目前篩選結果匯出成文字檔
- 真正自動儲存：輸入後會自動寫入本地端
- 上一步 / 下一步：支援編輯歷史還原與重做
- 彩色標籤：重要、完成、學習等標籤會自動套用顏色
- 螢光筆：可在筆記內容中標示重點句子
- 文字顏色：可替選取文字套用紅、橘、黃、綠、青、藍、紫、粉、灰、黑、白等字色
- 文字格式：可替選取文字套用粗體、斜體、刪除線
- 全螢幕編輯：可將編輯器放大到整個畫面，按 Esc 可離開
- AI 摘要：可選擇目前筆記或多篇筆記，透過 Vercel API 產生摘要

## 展示流程

1. 開啟 `index.html`
2. 新增一筆筆記
3. 編輯剛剛新增的筆記
4. 使用搜尋欄找筆記
5. 使用分類篩選
6. 用螢光筆標示一段重點文字
7. 勾選收藏或置頂
8. 測試上一步 / 下一步
9. 刪除一筆筆記
10. 重整頁面，確認資料仍保留
11. 切換主題顏色，或匯出目前筆記

## AI 摘要設定

AI 摘要需要部署到 Vercel，並在 Vercel 專案環境變數加入：

```text
GEMINI_API_KEY=你的 Gemini API Key
```

可選填模型名稱：

```text
GEMINI_MODEL=gemini-3.5-flash
```

如果 Google AI Studio 顯示的模型 ID 不同，請以 Google 後台提供的 ID 為準，更新 `GEMINI_MODEL` 即可。
目前預設使用 `gemini-3.5-flash`，適合免費 API 額度測試。

API Key 只放在 Vercel 環境變數中，不要寫在前端 JavaScript。沒有設定 `GEMINI_API_KEY` 時，按下 AI 摘要會顯示設定提示。

### 本地測試 AI 摘要

本地測試時，請在 `note-system` 資料夾建立 `.env.local`：

```text
GEMINI_API_KEY=你的 Gemini API Key
GEMINI_MODEL=gemini-3.5-flash
```

`.env.local` 已經被 `.gitignore` 忽略，不會上傳到 GitHub。請不要把真正的 API Key 寫進 `app.js` 或 `index.html`。

也可以直接雙擊：

```text
setup-gemini-env.bat
```

貼上 Gemini API Key 後，它會自動建立 `.env.local`。模型名稱可以直接按 Enter 使用預設值。

本地測試可以直接雙擊：

```text
start-local.bat
```

它會開啟：

```text
http://localhost:3000
```

如果想用 Vercel CLI，也可以執行：

```powershell
cd C:\Users\uwu\Documents\note\note-system
vercel dev
```

本地 AI 摘要需要透過 `start-local.bat` 或 `vercel dev` 啟動，不能直接雙擊 `index.html`。

## 必測情境

- 空標題不能送出
- 新增筆記後列表立即出現
- 編輯筆記後內容立即更新
- 刪除筆記後列表同步消失
- 搜尋標題或內容都找得到
- 分類篩選可以正常切換
- 沒有符合資料時會出現空狀態
- 開啟頁面後可直接使用系統
- 重整頁面後資料仍存在
