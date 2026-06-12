# Photo Studio - 雲端圖片分享與留言平台架設指南

本專案是一個**明亮、現代、響應式**的前端網頁，可以直接在瀏覽器執行（或部署至 GitHub Pages 靜態代管），並連接到 **Google Drive**（儲存圖片）和 **Google Apps Script** + **Google Sheets**（作為資料庫與後端 API 伺服器）。

為了讓您能立即開始體驗與測試，網頁內建了 **Demo 演示模式 (LocalStorage)**，不需任何設定即可在瀏覽器上操作。如果您想連接自己的 Google 雲端帳戶，請依照以下步驟進行設定。

---

## Google Drive 雲端資料夾結構

本專案的 Google Apps Script 後端會自動在您的雲端硬碟建立並管理以下目錄結構：

```text
[我的雲端硬碟]
  └─ Photo Studio (主資料夾)
       ├─ Photo Studio Database (存放上傳的圖片檔案)
       ├─ Photo Studio Messenger (存放留言內容與文章列表的 Messenger Database 試算表)
       └─ Account (存放已註冊的 Email、密碼以及匿名/暱稱的 Account Database 試算表)
```

這樣的分離設計能夠讓您清楚分類資料，並獨立管理使用者帳戶與公開留言訊息。

---

## 完整架設步驟

### 第一步：部署 Google Apps Script 後端
1. 前往 [Google Apps Script 官網](https://script.google.com/)，點擊「新專案」。
2. 將本專案中的 [Code.gs](Code.gs) 檔案內容全部複製並覆蓋到專案編輯器中。
3. 點擊編輯器上方的「儲存」按鈕 (磁碟圖示)。
4. 點擊右上角的**「部署」** -> **「新增部署」**：
   - **選取類型**：選擇「網頁應用程式」(Web App)。
   - **說明**：輸入一個版本描述 (例如: `v1.0`)。
   - **執行身分**：選擇 **「我」 (Me)**。
   - **誰有權限存取**：選擇 **「任何人」 (Anyone)**。
   - 點擊「部署」。
5. 首次部署時，Google 會要求您「授予存取權」：
   - 選擇您的 Google 帳號。
   - 點擊「進階」(Advanced) -> 前往「未命名的專案（不安全）」(Go to Untitled project)。
   - 點擊「允許」(Allow)。
6. 部署完成後，複製產生的**「網頁應用程式網址」** (URL)。它通常長這樣：
   `https://script.google.com/macros/s/AKfycb.../exec`

> 💡 **自動化初始化**：當您在網頁上送出第一個請求時，後端腳本會自動在您的雲端硬碟根目錄建立 `Photo Studio` 主資料夾及其子資料夾，並在 `Account` 與 `Photo Studio Messenger` 中建立好各自的資料庫試算表，完全不需要您手動建立！

---

### 第二步：連接您的前端網頁與 GAS
1. 在瀏覽器中開啟 `index.html`。
2. 點擊網頁上方的 **「系統設定 (Google Apps Script 與 Drive 連接)」** 區塊展開面板。
3. 將連線模式切換至 **「GAS 實時模式」**。
4. 在輸入框中貼上您在第一步複製的 **Web App URL**。
5. 點擊 **「儲存並應用設定」**。
6. 設定完成！現在您的網頁已成功與 Google 雲端連接，您可以嘗試註冊帳號、發文上傳圖片，這些數據會自動歸類儲存。

---

### 第三步：將網頁部署至 GitHub Pages
1. 在 GitHub 上建立一個新的公開存放庫 (Repository)。
2. 將專案中的檔案 (`index.html`, `style.css`, `app.js`, `Code.gs`) 上傳/推送到該存放庫。
3. 進入該存放庫的 **Settings** -> **Pages**。
4. 在 **Build and deployment** 下的 **Branch** 選擇 `main` (或 `master`) 分支的 `/ (root)` 資料夾。
5. 點擊 **Save**。
6. 約等候 1-2 分鐘，GitHub 將為您產生一個公開的網址（例如：`https://yourusername.github.io/repository-name/`）。
7. 開啟該網址，重複第二步的設定（將 GAS Web App URL 儲存在該網頁），即可與您的親朋好友分享，讓他們一起體驗圖片上傳與留言功能！

---

## 常見問題與排除 (FAQ)

### Q1：上傳圖片後，其他使用者看不到圖片？
後端腳本在建立 `Photo Studio` 以及子資料夾和上傳圖片時，會**自動**將資料夾與圖片的權限設為「知道連結的任何人皆可檢視」。如果您發現他人無法查看，請前往您的 Google Drive 手動檢查 `Photo Studio` 資料夾的共用權限，確保其設為「知道連結的任何人皆可檢視」。

### Q2：如何將我的 GAS Web App URL 設為網頁預設，不用每次手動貼上？
您可以修改 `app.js` 的最上方：
```javascript
// 修改 app.js 第 5 行左右：
let state = {
  currentUser: null,
  currentTab: 'feed',
  apiMode: 'gas', // 將預設模式改為 'gas'
  gasUrl: '您的GAS網頁應用程式網址', // 在這裡直接寫入您的 Web App URL
  posts: []
};
```
修改完成後推送到 GitHub，所有造訪該網站的使用者將會預設直接使用您的 Google 雲端作為後端，不需手動填寫設定！
