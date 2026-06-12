// Application state
let state = {
  currentUser: null,
  currentTab: 'feed',
  apiMode: 'gas', // 'demo' or 'gas'
  gasUrl: 'https://script.google.com/macros/s/AKfycbzBbDpiPkQj58vqJjgDZ00VJcGtBudnq8KFwvCZKVXTHRXlMGi7Lvz8hYZkY0OhBRjB/exec',
  posts: []
};

// Default Mock Data for Demo Mode
const DEFAULT_MOCK_POSTS = [
  {
    id: "post_mock_1",
    email: "emma@example.com",
    name: "林艾瑪 Emma",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    description: "迎接夏天的第一天！☀️ 湛藍的海水跟溫暖的沙灘，真的太療癒了！大家最近有去哪裡爬山或玩水嗎？🏖️✨",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    comments: [
      {
        id: "comment_mock_1_1",
        postId: "post_mock_1",
        email: "alex@example.com",
        name: "王小明 Alex",
        comment: "太美了吧！照片拍得超讚，這是哪裡呀？😍",
        createdAt: new Date(Date.now() - 22 * 3600000).toISOString()
      },
      {
        id: "comment_mock_1_2",
        postId: "post_mock_1",
        email: "emma@example.com",
        name: "林艾瑪 Emma",
        comment: "是在墾丁的秘境小灣喔！這時候去人剛剛好，推薦你去！🏖️",
        createdAt: new Date(Date.now() - 20 * 3600000).toISOString()
      }
    ]
  },
  {
    id: "post_mock_2",
    email: "james@example.com",
    name: "陳建國 James",
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    description: "早起爬山果然是值得的！看著雲海慢慢散開，那一刻的感動無法言語。這就是大自然的魅力吧！⛰️🌤️ #晨曦 #百岳 #挑戰自我",
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    comments: [
      {
        id: "comment_mock_2_1",
        postId: "post_mock_2",
        email: "sophialee@example.com",
        name: "李詩雅 Sophia",
        comment: "天啊！這雲海跟仙境一樣，好想知道是哪一座山！🏔️",
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
      }
    ]
  },
  {
    id: "post_mock_3",
    email: "yuki@example.com",
    name: "佐藤雪 Yuki",
    imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80",
    description: "今天帶這隻小調皮去公園散步，跑得比我還快！🐾 累癱在草地上不肯走，最後只能抱著回家，真是甜蜜的負擔 🐶❤️",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    comments: []
  }
];

// Document Elements
const el = {
  navTabs: document.querySelectorAll('.nav-tab'),
  viewSections: document.querySelectorAll('.view-section'),
  
  // Auth Controls
  loginBtn: document.getElementById('login-btn'),
  registerBtn: document.getElementById('register-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  userBadge: document.getElementById('user-badge'),
  userNameSpan: document.getElementById('user-name-span'),
  
  // Settings Panel
  settingsHeader: document.getElementById('settings-header'),
  settingsBody: document.getElementById('settings-body'),
  settingsCaret: document.getElementById('settings-caret'),
  gasUrlInput: document.getElementById('gas-url-input'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  modeRadios: document.getElementsByName('apiMode'),
  
  // Feed View
  feedGrid: document.getElementById('feed-grid'),
  refreshFeedBtn: document.getElementById('refresh-feed-btn'),
  
  // Upload View
  uploadForm: document.getElementById('upload-form'),
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  previewContainer: document.getElementById('preview-container'),
  previewImage: document.getElementById('preview-image'),
  removePreviewBtn: document.getElementById('remove-preview-btn'),
  uploadBtn: document.getElementById('upload-btn'),
  uploadPlaceholder: document.getElementById('upload-placeholder'),
  uploadProgress: document.getElementById('upload-progress'),
  
  // Modals
  authModal: document.getElementById('auth-modal'),
  authModalTitle: document.getElementById('auth-modal-title'),
  authForm: document.getElementById('auth-form'),
  authNameGroup: document.getElementById('auth-name-group'),
  authSubmitBtn: document.getElementById('auth-submit-btn'),
  modalClose: document.getElementById('modal-close'),
  modalSwitchMode: document.getElementById('modal-switch-mode'),
  modalFooterText: document.getElementById('modal-footer-text')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initAppState();
  registerEventListeners();
  loadFeed();
});

// 1. Initialize State
function initAppState() {
  // Load Session User
  const cachedUser = localStorage.getItem('user_session');
  if (cachedUser) {
    state.currentUser = JSON.parse(cachedUser);
  }
  
  // Load Settings
  state.gasUrl = localStorage.getItem('gas_url') || state.gasUrl || '';
  state.apiMode = localStorage.getItem('api_mode') || state.apiMode || 'demo';
  
  el.gasUrlInput.value = state.gasUrl;
  
  // Select radio mode
  for (let radio of el.modeRadios) {
    if (radio.value === state.apiMode) {
      radio.checked = true;
    }
  }
  
  updateAuthUI();
  updateModeUI();
}

// 2. Event Listeners
function registerEventListeners() {
  // Navigation Tabs
  el.navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const view = tab.getAttribute('data-view');
      switchTab(view);
    });
  });

  // Settings Panel Toggle
  el.settingsHeader.addEventListener('click', () => {
    el.settingsBody.classList.toggle('collapsed');
    el.settingsCaret.classList.toggle('fa-chevron-down');
    el.settingsCaret.classList.toggle('fa-chevron-up');
  });

  // Settings Save
  el.saveSettingsBtn.addEventListener('click', saveSettings);

  // Authentication Modals
  el.loginBtn.addEventListener('click', () => openAuthModal('login'));
  el.registerBtn.addEventListener('click', () => openAuthModal('register'));
  el.logoutBtn.addEventListener('click', handleLogout);
  el.modalClose.addEventListener('click', closeAuthModal);
  el.authForm.addEventListener('submit', handleAuthSubmit);
  
  // Modal Switch between Login / Register
  el.modalSwitchMode.addEventListener('click', () => {
    const isLogin = el.authModalTitle.innerText === '會員登入';
    openAuthModal(isLogin ? 'register' : 'login');
  });

  // Upload Actions
  el.dropzone.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', handleFileSelect);
  
  // Drag and Drop Events
  ['dragenter', 'dragover'].forEach(eventName => {
    el.dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      el.dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    el.dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      el.dropzone.classList.remove('dragover');
    }, false);
  });

  el.dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      el.fileInput.files = files;
      handleFileSelect();
    }
  });

  el.removePreviewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearUploadPreview();
  });

  el.uploadForm.addEventListener('submit', handleUploadSubmit);
  el.refreshFeedBtn.addEventListener('click', () => loadFeed(true));
}

// 3. UI Helpers
function switchTab(view) {
  state.currentTab = view;
  
  // Update nav UI
  el.navTabs.forEach(tab => {
    if (tab.getAttribute('data-view') === view) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Switch view section
  el.viewSections.forEach(section => {
    if (section.id === `${view}-view`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  // Extra triggers on tab change
  if (view === 'feed') {
    loadFeed();
  } else if (view === 'upload') {
    checkUploadAccess();
  }
}

function updateAuthUI() {
  if (state.currentUser) {
    el.loginBtn.style.display = 'none';
    el.registerBtn.style.display = 'none';
    el.logoutBtn.style.display = 'inline-flex';
    el.userBadge.style.display = 'inline-flex';
    el.userNameSpan.innerText = state.currentUser.name;
    document.getElementById('upload-form-wrapper').style.display = 'block';
    document.getElementById('upload-login-wrapper').style.display = 'none';
  } else {
    el.loginBtn.style.display = 'inline-flex';
    el.registerBtn.style.display = 'inline-flex';
    el.logoutBtn.style.display = 'none';
    el.userBadge.style.display = 'none';
    document.getElementById('upload-form-wrapper').style.display = 'none';
    document.getElementById('upload-login-wrapper').style.display = 'flex';
  }
  
  // Refresh comment input states
  document.querySelectorAll('.add-comment-input').forEach(input => {
    if (state.currentUser) {
      input.placeholder = "寫下你的留言...";
      input.disabled = false;
    } else {
      input.placeholder = "請登入會員後進行留言";
      input.disabled = true;
    }
  });
  
  document.querySelectorAll('.comment-login-tip').forEach(tip => {
    tip.style.display = state.currentUser ? 'none' : 'block';
  });
}

function updateModeUI() {
  const isGAS = state.apiMode === 'gas';
  document.getElementById('gas-url-group').style.display = isGAS ? 'flex' : 'none';
}

function saveSettings() {
  let selectedMode = 'demo';
  for (let radio of el.modeRadios) {
    if (radio.checked) {
      selectedMode = radio.value;
    }
  }

  const inputUrl = el.gasUrlInput.value.trim();
  if (selectedMode === 'gas' && !inputUrl) {
    showToast("請輸入 Google Apps Script 部署的 Web App URL！", "warning");
    return;
  }

  state.apiMode = selectedMode;
  state.gasUrl = inputUrl;
  
  localStorage.setItem('api_mode', state.apiMode);
  localStorage.setItem('gas_url', state.gasUrl);
  
  updateModeUI();
  showToast(`設定已儲存！目前模式：${selectedMode === 'gas' ? '實時 API' : '展示 Demo'}`, "success");
  
  // Collapse panel and refresh feed
  el.settingsBody.classList.add('collapsed');
  el.settingsCaret.className = 'fas fa-chevron-down';
  loadFeed(true);
}

function checkUploadAccess() {
  if (!state.currentUser) {
    document.getElementById('upload-form-wrapper').style.display = 'none';
    document.getElementById('upload-login-wrapper').style.display = 'flex';
  } else {
    document.getElementById('upload-form-wrapper').style.display = 'block';
    document.getElementById('upload-login-wrapper').style.display = 'none';
  }
}

// Toast Notification System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-check-circle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';
  if (type === 'warning') iconClass = 'fa-exclamation-triangle';
  
  toast.innerHTML = `
    <i class="fas ${iconClass}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// 4. Authentication Logic
function openAuthModal(mode) {
  el.authModal.classList.add('active');
  el.authForm.reset();
  
  if (mode === 'login') {
    el.authModalTitle.innerText = '會員登入';
    el.authNameGroup.style.display = 'none';
    document.getElementById('auth-name').required = false;
    el.authSubmitBtn.innerText = '登入';
    el.modalFooterText.innerText = '還沒有帳號嗎？ ';
    el.modalSwitchMode.innerText = '立即註冊';
  } else {
    el.authModalTitle.innerText = '註冊會員';
    el.authNameGroup.style.display = 'flex';
    document.getElementById('auth-name').required = true;
    el.authSubmitBtn.innerText = '註冊';
    el.modalFooterText.innerText = '已經有帳號了？ ';
    el.modalSwitchMode.innerText = '登入帳號';
  }
}

function closeAuthModal() {
  el.authModal.classList.remove('active');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();
  const isRegister = el.authModalTitle.innerText === '註冊會員';
  
  el.authSubmitBtn.disabled = true;
  el.authSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';

  try {
    let result;
    if (state.apiMode === 'gas') {
      // Live Google Apps Script Mode
      const payload = {
        action: isRegister ? 'register' : 'login',
        email,
        password,
        name
      };
      
      const response = await fetch(state.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Avoid CORS Preflight
        body: JSON.stringify(payload)
      });
      
      result = await response.json();
    } else {
      // Mock Demo Mode
      result = isRegister ? mockRegister(email, password, name) : mockLogin(email, password);
    }
    
    if (result.success) {
      state.currentUser = result.user;
      localStorage.setItem('user_session', JSON.stringify(result.user));
      showToast(result.message, "success");
      closeAuthModal();
      updateAuthUI();
    } else {
      showToast(result.message, "error");
    }
  } catch (error) {
    console.error("Auth error:", error);
    showToast(`網路連線或伺服器錯誤: ${error.message}`, "error");
  } finally {
    el.authSubmitBtn.disabled = false;
    el.authSubmitBtn.innerText = isRegister ? '註冊' : '登入';
  }
}

function handleLogout() {
  state.currentUser = null;
  localStorage.removeItem('user_session');
  updateAuthUI();
  showToast("已成功登出會員", "success");
  if (state.currentTab === 'upload') {
    switchTab('feed');
  }
}

// 5. Image Compression & Selection
function handleFileSelect() {
  const file = el.fileInput.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast("請選擇圖片檔案！", "warning");
    el.fileInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    // Show image preview
    el.previewImage.src = e.target.result;
    el.previewContainer.style.display = 'block';
    el.uploadPlaceholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function clearUploadPreview() {
  el.fileInput.value = '';
  el.previewImage.src = '';
  el.previewContainer.style.display = 'none';
  el.uploadPlaceholder.style.display = 'block';
}

/**
 * Resizes and compresses image to reduce base64 footprint
 */
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Get compressed base64
        const compressedBase64 = canvas.toDataURL(file.type || 'image/jpeg', quality);
        resolve({
          base64: compressedBase64,
          width,
          height,
          mimeType: file.type || 'image/jpeg'
        });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// 6. Upload Handlers
async function handleUploadSubmit(e) {
  e.preventDefault();
  
  const file = el.fileInput.files[0];
  const description = document.getElementById('upload-description').value.trim();
  
  if (!state.currentUser) {
    showToast("請先登入會員再上傳圖片！", "warning");
    return;
  }
  if (!file) {
    showToast("請選擇要上傳的圖片！", "warning");
    return;
  }

  el.uploadBtn.disabled = true;
  el.uploadProgress.style.display = 'block';
  el.uploadProgress.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 壓縮圖片中...';

  try {
    // Compress image to save bandwidth and storage space
    const compressed = await compressImage(file);
    
    el.uploadProgress.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> 正在傳送至 Google Drive...';
    
    let result;
    if (state.apiMode === 'gas') {
      const payload = {
        action: 'uploadPost',
        email: state.currentUser.email,
        name: state.currentUser.name,
        description: description,
        imageBase64: compressed.base64,
        mimeType: compressed.mimeType,
        fileName: `${Date.now()}_${file.name}`
      };

      const response = await fetch(state.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      result = await response.json();
    } else {
      // Mock Demo mode saving to LocalStorage
      result = mockUploadPost(state.currentUser.email, state.currentUser.name, compressed.base64, description);
    }

    if (result.success) {
      showToast("圖片上傳成功！已同步至儲存庫", "success");
      el.uploadForm.reset();
      clearUploadPreview();
      switchTab('feed');
    } else {
      showToast(`上傳失敗: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Upload error:", error);
    showToast(`上傳出錯: ${error.message}`, "error");
  } finally {
    el.uploadBtn.disabled = false;
    el.uploadProgress.style.display = 'none';
  }
}

// 7. Feed Loading & Rendering
async function loadFeed(forceRefresh = false) {
  // Show skeleton loading animations
  renderSkeletons();
  
  try {
    if (state.apiMode === 'gas') {
      if (!state.gasUrl) {
        // Fallback to demo automatically if no URL
        showToast("尚未設定 Google Web App URL，已為您載入 Demo 演示資料", "warning");
        state.apiMode = 'demo';
        for (let radio of el.modeRadios) {
          if (radio.value === 'demo') radio.checked = true;
        }
        updateModeUI();
        localStorage.setItem('api_mode', 'demo');
        loadFeed();
        return;
      }
      
      const response = await fetch(state.gasUrl);
      const resData = await response.json();
      
      if (resData.success) {
        state.posts = resData.data;
      } else {
        throw new Error(resData.message);
      }
    } else {
      state.posts = mockGetPosts();
    }
    
    renderFeed();
  } catch (error) {
    console.error("Feed error:", error);
    showToast(`無法讀取資料: ${error.message}，已展示 Demo 範例`, "error");
    // Auto fallback to demo content on connection error
    state.posts = mockGetPosts();
    renderFeed();
  }
}

function renderSkeletons() {
  el.feedGrid.innerHTML = Array(3).fill(0).map(() => `
    <div class="skeleton-card">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div class="skeleton-avatar skeleton-shimmer"></div>
        <div style="display: flex; flex-direction: column; gap: 0.4rem; width: 60%;">
          <div class="skeleton-text-sm skeleton-shimmer" style="width: 50%;"></div>
          <div class="skeleton-text-sm skeleton-shimmer" style="width: 30%;"></div>
        </div>
      </div>
      <div class="skeleton-image skeleton-shimmer"></div>
      <div class="skeleton-text-lg skeleton-shimmer" style="margin-top: 0.5rem;"></div>
      <div class="skeleton-text-sm skeleton-shimmer" style="width: 80%;"></div>
    </div>
  `).join('');
}

function renderFeed() {
  if (state.posts.length === 0) {
    el.feedGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
        <i class="far fa-images" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1.5rem;"></i>
        <h3 style="font-family: var(--font-title); font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">目前沒有任何動態</h3>
        <p style="font-size: 0.9rem;">成為第一個上傳圖片並與大家分享的人吧！</p>
        <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="switchTab('upload')">
          <i class="fas fa-plus"></i> 發布新動態
        </button>
      </div>
    `;
    return;
  }

  el.feedGrid.innerHTML = state.posts.map(post => {
    const timeFormatted = formatTime(post.createdAt);
    const commentsList = post.comments || [];
    const isCommentsVisible = localStorage.getItem(`comments_visible_${post.id}`) === 'true';
    
    const initials = (post.name || "?").substring(0, 2);
    
    // Check if user is logged in to construct action form
    const commentFormHtml = state.currentUser 
      ? `
        <form class="add-comment-form" onsubmit="submitComment(event, '${post.id}')">
          <input type="text" class="input-control add-comment-input" placeholder="寫下你的留言..." required>
          <button type="submit" class="btn btn-primary btn-icon" title="送出留言">
            <i class="fas fa-paper-plane"></i>
          </button>
        </form>
      `
      : `
        <div class="comment-login-tip">
          請先 <span onclick="openAuthModal('login')">會員登入</span> 以進行留言互動
        </div>
      `;

    const commentsContainerHtml = `
      <div class="comments-container" id="comments-container-${post.id}" style="display: ${isCommentsVisible ? 'flex' : 'none'};">
        ${commentsList.length === 0 
          ? `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;">目前還沒有留言，快來搶沙發！</p>` 
          : commentsList.map(c => `
              <div class="comment-item">
                <div class="user-avatar comment-avatar">${(c.name || "?").substring(0, 1)}</div>
                <div class="comment-bubble">
                  <div>
                    <span class="comment-author">${escapeHtml(c.name)}</span>
                    <span class="comment-text">${escapeHtml(c.comment)}</span>
                  </div>
                  <span class="comment-time">${formatTime(c.createdAt)}</span>
                </div>
              </div>
            `).join('')
        }
        ${commentFormHtml}
      </div>
    `;

    return `
      <article class="post-card">
        <div class="post-user">
          <div class="user-avatar">${initials}</div>
          <div class="post-meta">
            <span class="post-author-name">${escapeHtml(post.name)}</span>
            <span class="post-time">${timeFormatted}</span>
          </div>
        </div>
        
        <div class="post-image-container">
          <img class="post-image" src="${post.imageUrl}" alt="Uploaded image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&w=800&q=80'">
        </div>
        
        <div class="post-content">
          <p class="post-description">${escapeHtml(post.description)}</p>
        </div>
        
        <div class="post-comments-section">
          <button class="comments-toggle" onclick="toggleComments('${post.id}')">
            <i class="far fa-comment-alt"></i>
            <span id="comment-count-${post.id}">${commentsList.length} 則留言</span>
            <i class="fas fa-chevron-${isCommentsVisible ? 'up' : 'down'}" style="margin-left: auto;" id="comment-chevron-${post.id}"></i>
          </button>
          ${commentsContainerHtml}
        </div>
      </article>
    `;
  }).join('');
}

// Comments Toggle Visibility
window.toggleComments = function(postId) {
  const container = document.getElementById(`comments-container-${postId}`);
  const chevron = document.getElementById(`comment-chevron-${postId}`);
  const isHidden = container.style.display === 'none';
  
  if (isHidden) {
    container.style.display = 'flex';
    chevron.className = 'fas fa-chevron-up';
    localStorage.setItem(`comments_visible_${postId}`, 'true');
  } else {
    container.style.display = 'none';
    chevron.className = 'fas fa-chevron-down';
    localStorage.setItem(`comments_visible_${postId}`, 'false');
  }
};

async function submitComment(event, postId) {
  event.preventDefault();
  
  const form = event.target;
  const input = form.querySelector('.add-comment-input');
  const commentText = input.value.trim();
  const submitBtn = form.querySelector('button');
  
  if (!commentText || !state.currentUser) return;
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  try {
    let result;
    if (state.apiMode === 'gas') {
      const payload = {
        action: 'addComment',
        postId: postId,
        email: state.currentUser.email,
        name: state.currentUser.name,
        comment: commentText
      };
      
      const response = await fetch(state.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      result = await response.json();
    } else {
      // Mock Demo mode saving to LocalStorage
      result = mockAddComment(postId, state.currentUser.email, state.currentUser.name, commentText);
    }
    
    if (result.success) {
      showToast("留言發表成功！", "success");
      input.value = '';
      
      // Update local state dynamically to avoid full feed reload
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(result.comment);
      }
      
      // Keep visible
      localStorage.setItem(`comments_visible_${postId}`, 'true');
      renderFeed();
    } else {
      showToast(`留言失敗: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Comment submission error:", error);
    showToast(`留言失敗: ${error.message}`, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
  }
}

// 8. Utility Functions
function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    
    // Normal date output
    return date.toLocaleDateString('zh-TW', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch(e) {
    return '未知時間';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}


// ==========================================
// LOCAL STORAGE MOCK DATABASE (For Demo Mode)
// ==========================================

function mockRegister(email, password, name) {
  const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
  
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: "該電子郵件已註冊過會員" };
  }
  
  const newUser = { email, password, name, createdAt: new Date().toISOString() };
  users.push(newUser);
  localStorage.setItem('mock_users', JSON.stringify(users));
  
  return { 
    success: true, 
    message: "註冊成功！", 
    user: { email: newUser.email, name: newUser.name } 
  };
}

function mockLogin(email, password) {
  const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
  const matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  
  if (matchedUser) {
    return { 
      success: true, 
      message: "登入成功！歡迎回來", 
      user: { email: matchedUser.email, name: matchedUser.name } 
    };
  } else {
    // Check if it's default admin for ease of testing
    if (email === "demo@example.com" && password === "demo123") {
      return {
        success: true,
        message: "登入成功！這是您的測試帳號",
        user: { email: "demo@example.com", name: "體驗官 Demo" }
      };
    }
    return { success: false, message: "電子郵件或密碼錯誤" };
  }
}

function mockGetPosts() {
  const postsStr = localStorage.getItem('mock_posts');
  if (!postsStr) {
    // Initialize mock database with sample data
    localStorage.setItem('mock_posts', JSON.stringify(DEFAULT_MOCK_POSTS));
    return DEFAULT_MOCK_POSTS;
  }
  
  const posts = JSON.parse(postsStr);
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return posts;
}

function mockUploadPost(email, name, imageBase64, description) {
  const posts = mockGetPosts();
  const postId = "post_mock_" + Date.now();
  
  const newPost = {
    id: postId,
    email,
    name,
    imageUrl: imageBase64, // local base64 storage
    description,
    createdAt: new Date().toISOString(),
    comments: []
  };
  
  posts.unshift(newPost);
  
  try {
    localStorage.setItem('mock_posts', JSON.stringify(posts));
  } catch(e) {
    console.error("Localstorage storage quota exceeded. Purging old user uploads...");
    // If quota exceeded, clean up oldest non-default posts
    const keptPosts = posts.filter(p => p.id.startsWith('post_mock_1') || p.id.startsWith('post_mock_2') || p.id.startsWith('post_mock_3') || posts.indexOf(p) < 4);
    localStorage.setItem('mock_posts', JSON.stringify(keptPosts));
    showToast("瀏覽器快取儲存空間限制，已為您自動清理部分舊圖片資料", "warning");
  }
  
  return { success: true, post: newPost };
}

function mockAddComment(postId, email, name, comment) {
  const posts = mockGetPosts();
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return { success: false, message: "找不到該貼文" };
  }
  
  const commentId = "comment_mock_" + Date.now();
  const newComment = {
    id: commentId,
    postId,
    email,
    name,
    comment,
    createdAt: new Date().toISOString()
  };
  
  if (!post.comments) post.comments = [];
  post.comments.push(newComment);
  
  localStorage.setItem('mock_posts', JSON.stringify(posts));
  
  return { success: true, comment: newComment };
}

// Make globally accessible for HTML inline triggers
window.switchTab = switchTab;
window.submitComment = submitComment;
window.openAuthModal = openAuthModal;
