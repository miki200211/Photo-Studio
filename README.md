# Photo Studio - 雲端相簿與社群平台架設指南

本專案是一個**明亮、現代、響應式**的前端網頁，可以直接在瀏覽器執行或部署至 GitHub Pages，後端完全連接至您的 **Google Drive**（儲存圖片）與 **Google Sheets**（儲存留言與會員帳號）。

目前網頁程式碼中已預設為您設定好您的後端 API 連接網址，只要完成 Google Apps Script 的部署，網站便能立刻正式運作！

---

## 雲端資料夾結構

當使用者在網頁上進行註冊、上傳圖片或發表留言時，您的 Google Apps Script 後端會自動在您的 Google Drive 中建立並管理以下目錄結構：

```text
[我的雲端硬碟]
  └─ Photo Studio (主資料夾)
       ├─ Photo Studio Database (存放上傳的實體圖片，自動設為公開網址檢視)
       ├─ Photo Studio Messenger (存放留言內容與文章列表的 Messenger Database 試算表)
       └─ Account (存放已註冊會員的 Email 和匿名的 Account Database 試算表)
```

---

## 完整架設與啟用步驟

### 第一步：部署 Google Apps Script 後端 API
1. 前往 [Google Apps Script 官網](https://script.google.com/)，點擊「新專案」。
2. 將本專案中的 [Code.gs](Code.gs) 檔案內容全部複製，覆蓋到專案編輯器中。
3. 點擊編輯器上方的「儲存」按鈕 (磁碟圖示)。
4. 點擊右上角的**「部署」** -> **「新增部署」**：
   - **選取類型**：點擊齒輪圖示，選擇「網頁應用程式」(Web App)。
   - **說明**：輸入版本描述 (例如: `Production v1.0`)。
   - **執行身分**：選擇 **「我」 (Me)**。
   - **誰有權限存取**：選擇 **「任何人」 (Anyone)**。（*極重要：必須選擇任何人，否則外部瀏覽器無法存取 API*）。
   - 點擊「部署」。
5. 首次部署時，Google 會要求您授權：
   - 選擇您的 Google 帳號。
   - 點擊「進階」(Advanced) -> 前往「未命名的專案（不安全）」(Go to Untitled project)。
   - 點擊「允許」(Allow)。
6. 部署完成後即可，您的 API 已在雲端待命！（網址已經由我們預先綁定於前端程式碼 `app.js` 中，您不需要手動更改它）。

---

### 第二步：將網頁發布至 GitHub Pages
1. 將專案中的檔案 (`index.html`, `style.css`, `app.js`, `Code.gs`, `README.md`) 推送更新至您的 GitHub 存放庫。
2. 進入該存放庫的 **Settings** -> **Pages**。
3. 在 **Build and deployment** 下的 **Branch** 選擇 `main` (或 `master`) 分支的 `/ (root)` 資料夾。
4. 點擊 **Save**。
5. 等候約 1 分鐘，GitHub 會顯示您的專屬網站網址（如：`https://miki200211.github.io/Photo-Studio/`）。
6. 開啟該網址，即可與您的好友分享這個明亮美觀的圖片分享與留言平台！

---

## 常見問題與排除 (FAQ)

### Q1：上傳圖片後，其他使用者看不到圖片？
後端腳本在建立資料夾和儲存圖片時，會自動將其權限設為「知道連結的任何人皆可檢視」。如果您發現他人無法查看，請前往您的 Google Drive 檢查 `Photo Studio` 資料夾的共用權限，確保其設為**「知道連結的任何人皆可檢視」**。

### Q2：未來如果要更新後端程式碼，該怎麼做？
如果您修改了 `Code.gs`，請在 Google Apps Script 頁面點擊 **「部署」** -> **「管理部署」**，編輯目前的部署，將版本切換為**「新版本」**，然後點擊儲存，API 網址即會保持不變並套用新程式碼。
