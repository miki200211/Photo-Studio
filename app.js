// Production Application State
let state = {
  currentUser: null,
  currentTab: 'feed',
  gasUrl: 'https://script.google.com/macros/s/AKfycbzBbDpiPkQj58vqJjgDZ00VJcGtBudnq8KFwvCZKVXTHRXlMGi7Lvz8hYZkY0OhBRjB/exec',
  posts: [],
  searchQuery: '',
  layoutColumns: 2
};

// Emoji Definitions
const EMOJIS = {
  like: { emoji: '👍', label: '讚' },
  heart: { emoji: '❤️', label: '愛心' },
  laugh: { emoji: '😂', label: '哈' },
  wow: { emoji: '😮', label: '哇' },
  party: { emoji: '🎉', label: '慶祝' }
};

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
  
  // Feed View
  feedGrid: document.getElementById('feed-grid'),
  refreshFeedBtn: document.getElementById('refresh-feed-btn'),
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  
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
  const cachedUser = localStorage.getItem('user_session');
  if (cachedUser) {
    state.currentUser = JSON.parse(cachedUser);
  }
  updateAuthUI();
  
  // Load layout columns preference
  state.layoutColumns = parseInt(localStorage.getItem('layout_columns')) || 2;
  applyLayoutColumns(state.layoutColumns);
}

function applyLayoutColumns(cols) {
  const mainEl = document.querySelector('main');
  const gridEl = el.feedGrid;
  
  // Remove existing layout classes
  mainEl.classList.remove('layout-cols-2', 'layout-cols-4', 'layout-cols-6');
  gridEl.classList.remove('cols-2', 'cols-4', 'cols-6');
  
  // Add new layout classes
  mainEl.classList.add(`layout-cols-${cols}`);
  gridEl.classList.add(`cols-${cols}`);
  
  // Sync button active states
  document.querySelectorAll('.layout-btn').forEach(btn => {
    const buttonCols = parseInt(btn.getAttribute('data-cols')) || 2;
    btn.classList.toggle('active', buttonCols === cols);
  });
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

  // Search Bar
  el.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    el.clearSearchBtn.style.display = state.searchQuery ? 'flex' : 'none';
    filterAndRenderFeed();
  });

  el.clearSearchBtn.addEventListener('click', () => {
    el.searchInput.value = '';
    state.searchQuery = '';
    el.clearSearchBtn.style.display = 'none';
    filterAndRenderFeed();
  });

  // Layout Selector Click Listeners
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cols = parseInt(btn.getAttribute('data-cols')) || 2;
      state.layoutColumns = cols;
      localStorage.setItem('layout_columns', cols);
      applyLayoutColumns(cols);
    });
  });

  // Authentication Modals
  el.loginBtn.addEventListener('click', () => openAuthModal('login'));
  el.registerBtn.addEventListener('click', () => openAuthModal('register'));
  el.logoutBtn.addEventListener('click', handleLogout);
  el.modalClose.addEventListener('click', closeAuthModal);
  el.authForm.addEventListener('submit', handleAuthSubmit);
  
  el.modalSwitchMode.addEventListener('click', () => {
    const isLogin = el.authModalTitle.innerText === '會員登入';
    openAuthModal(isLogin ? 'register' : 'login');
  });

  // Upload Actions
  el.dropzone.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', handleFileSelect);
  
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
  el.refreshFeedBtn.addEventListener('click', () => loadFeed());
}

// 3. UI Helpers
function switchTab(view) {
  state.currentTab = view;
  
  el.navTabs.forEach(tab => {
    if (tab.getAttribute('data-view') === view) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  el.viewSections.forEach(section => {
    if (section.id === `${view}-view`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

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

function checkUploadAccess() {
  if (!state.currentUser) {
    document.getElementById('upload-form-wrapper').style.display = 'none';
    document.getElementById('upload-login-wrapper').style.display = 'flex';
  } else {
    document.getElementById('upload-form-wrapper').style.display = 'block';
    document.getElementById('upload-login-wrapper').style.display = 'none';
  }
}

// Toast Notification
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
    const payload = {
      action: isRegister ? 'register' : 'login',
      email,
      password,
      name
    };
    
    const response = await fetch(state.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
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
    const compressed = await compressImage(file);
    el.uploadProgress.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> 正在傳送至 Google Drive...';
    
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
    
    const result = await response.json();

    if (result.success) {
      showToast("圖片上傳成功！已同步至 Google Drive", "success");
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

// 7. Feed Loading, Filtering & Rendering
async function loadFeed() {
  renderSkeletons();
  
  try {
    const response = await fetch(state.gasUrl);
    const resData = await response.json();
    
    if (resData.success) {
      state.posts = resData.data;
      filterAndRenderFeed();
    } else {
      throw new Error(resData.message);
    }
  } catch (error) {
    console.error("Feed error:", error);
    el.feedGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
        <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--error); margin-bottom: 1.5rem;"></i>
        <h3 style="font-family: var(--font-title); font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">連線異常</h3>
        <p style="font-size: 0.9rem;">無法讀取雲端相簿資料，請確認您的 Google Apps Script 後端部署是否正常並已手動通過權限授權。</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); text-top: 0.5rem;">詳細錯誤：${error.message}</p>
      </div>
    `;
  }
}

function filterAndRenderFeed() {
  const query = state.searchQuery.trim().toLowerCase();
  
  if (!query) {
    renderFeed(state.posts);
    return;
  }
  
  const filtered = state.posts.filter(post => {
    const desc = (post.description || '').toLowerCase();
    const author = (post.name || '').toLowerCase();
    
    if (query.startsWith('@')) {
      const cleanName = query.substring(1);
      return desc.includes(query) || author.includes(cleanName);
    }
    
    if (query.startsWith('#')) {
      return desc.includes(query);
    }
    
    return desc.includes(query) || author.includes(query);
  });
  
  renderFeed(filtered);
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

// Highlights @names and #tags
function parseMentions(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);
  
  // Replace @name
  escaped = escaped.replace(/@([^\s#@,.;!?:()\[\]{}""'']+)/g, (match, name) => {
    return `<span class="tag-mention" onclick="setSearchFilter('@${name}', event)">@${name}</span>`;
  });
  
  // Replace #tag
  escaped = escaped.replace(/#([^\s#@,.;!?:()\[\]{}""'']+)/g, (match, tag) => {
    return `<span class="tag-hash" onclick="setSearchFilter('#${tag}', event)">#${tag}</span>`;
  });
  
  return escaped;
}

window.setSearchFilter = function(filterVal, event) {
  if (event) event.stopPropagation();
  el.searchInput.value = filterVal;
  state.searchQuery = filterVal;
  el.clearSearchBtn.style.display = 'flex';
  filterAndRenderFeed();
};

function renderFeed(postsToRender) {
  if (postsToRender.length === 0) {
    const isSearching = state.searchQuery.trim().length > 0;
    el.feedGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
        <i class="${isSearching ? 'fas fa-search-minus' : 'far fa-images'}" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1.5rem;"></i>
        <h3 style="font-family: var(--font-title); font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">
          ${isSearching ? '找不到符合搜尋的動態' : '目前沒有任何動態'}
        </h3>
        <p style="font-size: 0.9rem;">
          ${isSearching ? '請嘗試更換搜尋關鍵字或 @姓名、#標籤' : '成為第一個上傳圖片並與大家分享的人吧！'}
        </p>
        ${isSearching 
          ? `<button class="btn btn-secondary" style="margin-top: 1.5rem;" onclick="clearSearchFilter()">重設搜尋</button>`
          : `<button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="switchTab('upload')"><i class="fas fa-plus"></i> 發布新動態</button>`
        }
      </div>
    `;
    return;
  }

  el.feedGrid.innerHTML = postsToRender.map(post => {
    const timeFormatted = formatTime(post.createdAt);
    const commentsList = post.comments || [];
    const isCommentsVisible = localStorage.getItem(`comments_visible_${post.id}`) === 'true';
    const initials = (post.name || "?").substring(0, 2);
    
    // 1. Emoji Reactions HTML
    const reactions = post.reactions || {};
    const reactionsHtml = Object.keys(EMOJIS).map(key => {
      const info = EMOJIS[key];
      const count = reactions[key] || 0;
      const hasReacted = localStorage.getItem(`reacted_${post.id}_${key}`) === 'true';
      return `
        <button class="reaction-btn ${hasReacted ? 'reacted' : ''}" onclick="submitReaction('${post.id}', '${key}')" title="${info.label}">
          <span class="reaction-emoji">${info.emoji}</span>
          <span class="reaction-count" id="count-${post.id}-${key}">${count}</span>
        </button>
      `;
    }).join('');

    // 2. Comments form HTML
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

    // 3. Comments container HTML
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
          <p class="post-description">${parseMentions(post.description)}</p>
        </div>
        
        <!-- Emoji Reactions Panel -->
        <div class="reactions-panel">
          ${reactionsHtml}
        </div>
        
        <!-- Post Utility Action Buttons -->
        <div class="post-actions-row">
          <button class="action-btn-link" onclick="toggleComments('${post.id}')">
            <i class="far fa-comment-alt"></i>
            <span id="comment-count-${post.id}">${commentsList.length} 則留言</span>
            <i class="fas fa-chevron-${isCommentsVisible ? 'up' : 'down'}" style="margin-left: 0.25rem;" id="comment-chevron-${post.id}"></i>
          </button>
          
          <button class="action-btn-link" onclick="copyImageToClipboard('${post.imageUrl}', event)">
            <i class="far fa-copy"></i>
            <span>複製圖片</span>
          </button>
        </div>
        
        <div class="post-comments-section">
          ${commentsContainerHtml}
        </div>
      </article>
    `;
  }).join('');
}

window.clearSearchFilter = function() {
  el.searchInput.value = '';
  state.searchQuery = '';
  el.clearSearchBtn.style.display = 'none';
  filterAndRenderFeed();
};

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

// Emoji Reactions Registration
window.submitReaction = async function(postId, emojiKey) {
  const hasReacted = localStorage.getItem(`reacted_${postId}_${emojiKey}`) === 'true';
  
  // Limit to single reaction per browser session for neatness
  if (hasReacted) {
    showToast("您已經對此貼文表達過該心情囉！", "warning");
    return;
  }
  
  // UI Snappy Optimistic Update: Increment locally first
  const countSpan = document.getElementById(`count-${postId}-${emojiKey}`);
  if (countSpan) {
    const currentCount = parseInt(countSpan.innerText) || 0;
    countSpan.innerText = currentCount + 1;
    countSpan.closest('.reaction-btn').classList.add('reacted');
  }
  
  // Save locally
  localStorage.setItem(`reacted_${postId}_${emojiKey}`, 'true');
  
  // Find in memory to keep state updated
  const post = state.posts.find(p => p.id === postId);
  if (post) {
    if (!post.reactions) post.reactions = {};
    post.reactions[emojiKey] = (post.reactions[emojiKey] || 0) + 1;
  }

  try {
    const payload = {
      action: 'reactPost',
      postId: postId,
      emoji: emojiKey
    };
    
    // Async request in background
    const response = await fetch(state.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (!result.success) {
      console.warn("Server failed to register reaction:", result.message);
    }
  } catch(e) {
    console.warn("Reaction API call failed:", e);
    // Silent fail since it is already incremented in UI
  }
};

// Clipboard copy image helper
window.copyImageToClipboard = async function(imageUrl, event) {
  if (event) event.stopPropagation();
  showToast("正在處理圖片，請稍候...", "warning");
  
  try {
    const img = new Image();
    // Enable CORS loading
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Export to PNG blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            fallbackCopyUrl(imageUrl);
            return;
          }
          try {
            // Write binary to clipboard
            const item = new ClipboardItem({ [blob.type]: blob });
            await navigator.clipboard.write([item]);
            showToast("圖片已成功複製至剪貼簿！可以直接貼上傳送 (Ctrl+V)", "success");
          } catch (err) {
            console.warn("ClipboardItem write failed, copying URL instead:", err);
            fallbackCopyUrl(imageUrl);
          }
        }, 'image/png');
      } catch(e) {
        console.warn("Canvas drawing error, copying URL instead:", e);
        fallbackCopyUrl(imageUrl);
      }
    };
    
    img.onerror = function() {
      fallbackCopyUrl(imageUrl);
    };
  } catch(error) {
    fallbackCopyUrl(imageUrl);
  }
};

async function fallbackCopyUrl(imageUrl) {
  try {
    await navigator.clipboard.writeText(imageUrl);
    showToast("圖片檔案受瀏覽器安全限制，已複製圖片網址至剪貼簿！", "success");
  } catch (err) {
    console.error("Copy failed:", err);
    showToast("複製失敗，您的瀏覽器拒絕了剪貼簿存取", "error");
  }
}

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
    const result = await response.json();
    
    if (result.success) {
      showToast("留言發表成功！", "success");
      input.value = '';
      
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(result.comment);
      }
      
      localStorage.setItem(`comments_visible_${postId}`, 'true');
      filterAndRenderFeed();
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
    
    // Format absolute time like "6/12 11:58"
    const timeOptions = { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    const absoluteTime = date.toLocaleDateString('zh-TW', timeOptions);
    
    if (diffMins < 1) return `剛剛 (${absoluteTime})`;
    if (diffMins < 60) return `${diffMins} 分鐘前 (${absoluteTime})`;
    if (diffHours < 24) return `${diffHours} 小時前 (${absoluteTime})`;
    
    // If more than 24 hours, display full date and time: "2026年6月12日 11:58"
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
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

// Make globally accessible for HTML inline triggers
window.switchTab = switchTab;
window.submitComment = submitComment;
window.openAuthModal = openAuthModal;
