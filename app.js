// Production Application State
let state = {
  currentUser: null,
  currentTab: 'feed',
  gasUrl: 'https://script.google.com/macros/s/AKfycbzBbDpiPkQj58vqJjgDZ00VJcGtBudnq8KFwvCZKVXTHRXlMGi7Lvz8hYZkY0OhBRjB/exec',
  posts: []
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
  
  updateAuthUI();
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
  el.refreshFeedBtn.addEventListener('click', () => loadFeed());
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

// Close Auth Modal
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
    
    // Call Google Apps Script Web App
    const response = await fetch(state.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // Avoid CORS Preflight
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

// 7. Feed Loading & Rendering
async function loadFeed() {
  // Show skeleton loading animations
  renderSkeletons();
  
  try {
    const response = await fetch(state.gasUrl);
    const resData = await response.json();
    
    if (resData.success) {
      state.posts = resData.data;
      renderFeed();
    } else {
      throw new Error(resData.message);
    }
  } catch (error) {
    console.error("Feed error:", error);
    el.feedGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
        <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--error); margin-bottom: 1.5rem;"></i>
        <h3 style="font-family: var(--font-title); font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">連線異常</h3>
        <p style="font-size: 0.9rem;">無法讀取雲端相簿資料，請確認您的 Google Apps Script 後端部署是否正常。</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">詳細錯誤：${error.message}</p>
      </div>
    `;
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

// Make globally accessible for HTML inline triggers
window.switchTab = switchTab;
window.submitComment = submitComment;
window.openAuthModal = openAuthModal;
