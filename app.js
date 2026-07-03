// Production Application State
let state = {
  clientIp: 'unknown_ip',
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
  uploadProgress: document.getElementById('upload-progress')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  await fetchClientIp();
  initAppState();
  registerEventListeners();
  loadFeed();
});

async function fetchClientIp() {
  const services = [
    'https://api.ipify.org?format=json',
    'https://httpbin.org/ip',
    'https://ipinfo.io/json'
  ];
  for (let service of services) {
    try {
      const res = await fetch(service);
      const data = await res.json();
      const ip = data.ip || data.origin;
      if (ip) {
        state.clientIp = ip.split(',')[0].trim();
        console.log("Client IP successfully fetched:", state.clientIp);
        return;
      }
    } catch (e) {
      console.warn(`Failed to fetch IP from ${service}:`, e);
    }
  }
  state.clientIp = 'unknown_ip';
}

// 1. Initialize State
function initAppState() {
  // Clear legacy login session and visitor profile if they exist
  localStorage.removeItem('user_session');
  localStorage.removeItem('visitor_profile');
  
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

  // Clipboard Paste (Ctrl+V) support on Upload Tab
  document.addEventListener('paste', (e) => {
    if (state.currentTab !== 'upload') return;
    
    // Check if clipboard contains an image file
    const items = e.clipboardData.items || [];
    const files = e.clipboardData.files || [];
    const hasImage = Array.from(items).some(item => item.kind === 'file' && item.type.startsWith('image/')) 
                  || Array.from(files).some(file => file.type.startsWith('image/'));
                  
    if (!hasImage) return; // Ignore if not pasting an image
    
    let imageFile = null;
    
    // Method 1: Check files directly (compatible with copying files from file explorer)
    if (files.length > 0) {
      for (let file of files) {
        if (file.type.startsWith('image/')) {
          imageFile = file;
          break;
        }
      }
    }
    
    // Method 2: Check items (compatible with screenshots and browser images)
    if (!imageFile && items.length > 0) {
      for (let item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          imageFile = item.getAsFile();
          break;
        }
      }
    }
    
    if (imageFile) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);
      el.fileInput.files = dataTransfer.files;
      
      handleFileSelect();
      showToast("已成功貼上剪貼簿中的圖片！", "success");
      e.preventDefault();
    }
  });
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
      // Bypass canvas compression for GIF to preserve animations
      if (file.type === 'image/gif') {
        resolve({
          base64: event.target.result,
          width: null,
          height: null,
          mimeType: 'image/gif'
        });
        return;
      }

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
  const title = document.getElementById('upload-title').value.trim();
  const description = document.getElementById('upload-description').value.trim();
  
  if (!file) {
    showToast("請選擇要上傳的圖片！", "warning");
    return;
  }
  if (!title) {
    showToast("請輸入文章標題！", "warning");
    return;
  }

  el.uploadBtn.disabled = true;
  el.uploadProgress.style.display = 'block';
  el.uploadProgress.innerHTML = file.type === 'image/gif'
    ? '<i class="fas fa-spinner fa-spin"></i> 正在處理 GIF 圖片...'
    : '<i class="fas fa-spinner fa-spin"></i> 壓縮圖片中...';

  try {
    const compressed = await compressImage(file);
    el.uploadProgress.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> 正在傳送至 Google Drive...';
    
    const payload = {
      action: 'uploadPost',
      email: state.clientIp,
      name: title,
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
  
  escaped = escaped.replace(/@([^\s#@,.;!?:()\[\]{}""'']+)/g, (match, name) => {
    return `<span class="tag-mention" onclick="setSearchFilter('@${name}', event)">@${name}</span>`;
  });
  
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
    
    // Auth Check: Is current user the post author?
    const isPostAuthor = state.clientIp !== 'unknown_ip' && state.clientIp.toLowerCase() === post.email.toLowerCase();
    const postActionsHtml = isPostAuthor 
      ? `
        <div class="post-card-actions">
          <button class="post-action-icon-btn btn-edit-post" onclick="toggleEditPost('${post.id}')" title="編輯貼文">
            <i class="fas fa-edit"></i>
          </button>
          <button class="post-action-icon-btn btn-delete-post" onclick="deletePost('${post.id}')" title="刪除貼文">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `
      : '';

    // Emoji Reactions HTML
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

    // Comments Form
    const commentFormHtml = `
      <form class="add-comment-form" onsubmit="submitComment(event, '${post.id}')">
        <input type="text" class="input-control add-comment-input" placeholder="寫下你的留言..." required>
        <button type="submit" class="btn btn-primary btn-icon" title="送出留言">
          <i class="fas fa-paper-plane"></i>
        </button>
      </form>
    `;

    // Render Comments List
    const commentsHtml = commentsList.map(c => {
      const isCommentAuthor = state.clientIp !== 'unknown_ip' && state.clientIp.toLowerCase() === c.email.toLowerCase();
      const commentActionsHtml = isCommentAuthor
        ? `
          <div class="comment-item-actions">
            <span class="comment-action-link link-edit" onclick="toggleEditComment('${post.id}', '${c.id}')">編輯</span>
            <span class="comment-action-link link-delete" onclick="deleteComment('${post.id}', '${c.id}')">刪除</span>
          </div>
        `
        : '';
        
      return `
        <div class="comment-item">
          <div class="user-avatar comment-avatar"><i class="fas fa-comment-dots"></i></div>
          <div class="comment-bubble">
            <div>
              <span class="comment-author">${escapeHtml(c.name)}</span>
              <div id="comment-body-container-${c.id}" style="display: inline;">
                <span class="comment-text" id="comment-text-span-${c.id}">${escapeHtml(c.comment)}</span>
              </div>
            </div>
            <div class="comment-meta-row">
              <span class="comment-time">${formatTime(c.createdAt)}</span>
              ${commentActionsHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const commentsContainerHtml = `
      <div class="comments-container" id="comments-container-${post.id}" style="display: ${isCommentsVisible ? 'flex' : 'none'};">
        ${commentsList.length === 0 
          ? `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;" id="empty-comment-placeholder-${post.id}">目前還沒有留言，快來搶沙發！</p>` 
          : commentsHtml
        }
        ${commentFormHtml}
      </div>
    `;

    return `
      <article class="post-card" id="post-card-${post.id}">
        <div class="post-user">
          <div class="user-avatar"><i class="far fa-image"></i></div>
          <div class="post-meta">
            <span class="post-author-name">${escapeHtml(post.name)}</span>
            <span class="post-time">${timeFormatted} • IP 記錄已存檔</span>
          </div>
          ${postActionsHtml}
        </div>
        
        <div class="post-image-container">
          <img class="post-image" src="${post.imageUrl}" alt="Uploaded image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&w=800&q=80'">
        </div>
        
        <div class="post-content">
          <div class="post-description-container" id="post-desc-container-${post.id}">
            <p class="post-description" id="post-desc-text-${post.id}">${parseMentions(post.description)}</p>
          </div>
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

// Post Editing Methods
window.toggleEditPost = function(postId) {
  const container = document.getElementById(`post-desc-container-${postId}`);
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  
  container.innerHTML = `
    <div class="post-edit-container">
      <textarea class="input-control post-edit-textarea" id="edit-textarea-${postId}" required>${post.description}</textarea>
      <div class="post-edit-actions">
        <button class="btn btn-secondary btn-xs" onclick="cancelEditPost('${postId}')">取消</button>
        <button class="btn btn-primary btn-xs" onclick="saveEditPost('${postId}')">儲存</button>
      </div>
    </div>
  `;
  document.getElementById(`edit-textarea-${postId}`).focus();
};

window.cancelEditPost = function(postId) {
  const container = document.getElementById(`post-desc-container-${postId}`);
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  
  container.innerHTML = `<p class="post-description" id="post-desc-text-${postId}">${parseMentions(post.description)}</p>`;
};

window.saveEditPost = async function(postId) {
  const textarea = document.getElementById(`edit-textarea-${postId}`);
  const newDescription = textarea.value.trim();
  
  if (!newDescription) {
    showToast("貼文說明不可為空！", "warning");
    return;
  }
  
  showToast("正在更新貼文...", "warning");
  
  try {
    const payload = {
      action: 'editPost',
      postId: postId,
      email: state.clientIp,
      description: newDescription
    };
    
    const response = await fetch(state.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.success) {
      showToast("貼文已成功更新！", "success");
      
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        post.description = newDescription;
      }
      
      cancelEditPost(postId);
    } else {
      showToast(`更新失敗: ${result.message}`, "error");
    }
  } catch(e) {
    showToast(`網路錯誤，無法更新貼文: ${e.message}`, "error");
  }
};

window.deletePost = async function(postId) {
  if (!confirm("您確定要刪除這篇貼文嗎？\n（這將會連同刪除雲端硬碟的圖片與所有留言，且無法復原）")) {
    return;
  }
  
  showToast("正在刪除貼文與雲端檔案...", "warning");
  
  try {
    const payload = {
      action: 'deletePost',
      postId: postId,
      email: state.clientIp
    };
    
    const response = await fetch(state.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.success) {
      showToast("貼文與雲端檔案已成功刪除！", "success");
      state.posts = state.posts.filter(p => p.id !== postId);
      filterAndRenderFeed();
    } else {
      showToast(`刪除失敗: ${result.message}`, "error");
    }
  } catch(e) {
    showToast(`網路錯誤，無法刪除貼文: ${e.message}`, "error");
  }
};

// Comment Editing Methods
window.toggleEditComment = function(postId, commentId) {
  const container = document.getElementById(`comment-body-container-${commentId}`);
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  const comment = post.comments.find(c => c.id === commentId);
  if (!comment) return;
  
  container.innerHTML = `
    <div class="comment-edit-container">
      <input type="text" class="input-control comment-edit-input" id="edit-comment-input-${commentId}" value="${escapeHtml(comment.comment)}" required>
      <div class="comment-edit-actions">
        <button class="btn btn-secondary btn-xs" onclick="cancelEditComment('${postId}', '${commentId}')">取消</button>
        <button class="btn btn-primary btn-xs" onclick="saveEditComment('${postId}', '${commentId}')">儲存</button>
      </div>
    </div>
  `;
  document.getElementById(`edit-comment-input-${commentId}`).focus();
};

window.cancelEditComment = function(postId, commentId) {
  const container = document.getElementById(`comment-body-container-${commentId}`);
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  const comment = post.comments.find(c => c.id === commentId);
  if (!comment) return;
  
  container.innerHTML = `<span class="comment-text" id="comment-text-span-${commentId}">${escapeHtml(comment.comment)}</span>`;
};

window.saveEditComment = async function(postId, commentId) {
  const input = document.getElementById(`edit-comment-input-${commentId}`);
  const newCommentText = input.value.trim();
  
  if (!newCommentText) {
    showToast("留言內容不可為空！", "warning");
    return;
  }
  
  showToast("正在更新留言...", "warning");
  
  try {
    const payload = {
      action: 'editComment',
      commentId: commentId,
      email: state.clientIp,
      comment: newCommentText
    };
    
    const response = await fetch(state.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.success) {
      showToast("留言已更新！", "success");
      
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        const comment = post.comments.find(c => c.id === commentId);
        if (comment) {
          comment.comment = newCommentText;
        }
      }
      
      cancelEditComment(postId, commentId);
      filterAndRenderFeed();
    } else {
      showToast(`留言更新失敗: ${result.message}`, "error");
    }
  } catch(e) {
    showToast(`網路錯誤，無法更新留言: ${e.message}`, "error");
  }
};

window.deleteComment = async function(postId, commentId) {
  if (!confirm("您確定要刪除這則留言嗎？（這將無法復原）")) {
    return;
  }
  
  showToast("正在刪除留言...", "warning");
  
  try {
    const payload = {
      action: 'deleteComment',
      commentId: commentId,
      email: state.clientIp
    };
    
    const response = await fetch(state.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.success) {
      showToast("留言已成功刪除！", "success");
      
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        post.comments = post.comments.filter(c => c.id !== commentId);
      }
      
      filterAndRenderFeed();
    } else {
      showToast(`刪除失敗: ${result.message}`, "error");
    }
  } catch(e) {
    showToast(`網路錯誤，無法刪除留言: ${e.message}`, "error");
  }
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

// Emoji Reactions (Toggle Support)
window.submitReaction = async function(postId, emojiKey) {
  const hasReacted = localStorage.getItem(`reacted_${postId}_${emojiKey}`) === 'true';
  const isRemoving = hasReacted;
  
  // UI Snappy Optimistic Update
  const countSpan = document.getElementById(`count-${postId}-${emojiKey}`);
  if (countSpan) {
    const currentCount = parseInt(countSpan.innerText) || 0;
    if (isRemoving) {
      countSpan.innerText = Math.max(0, currentCount - 1);
      countSpan.closest('.reaction-btn').classList.remove('reacted');
    } else {
      countSpan.innerText = currentCount + 1;
      countSpan.closest('.reaction-btn').classList.add('reacted');
    }
  }
  
  // Save locally
  if (isRemoving) {
    localStorage.removeItem(`reacted_${postId}_${emojiKey}`);
  } else {
    localStorage.setItem(`reacted_${postId}_${emojiKey}`, 'true');
  }
  
  // Find in memory to keep state updated
  const post = state.posts.find(p => p.id === postId);
  if (post) {
    if (!post.reactions) post.reactions = {};
    if (isRemoving) {
      post.reactions[emojiKey] = Math.max(0, (post.reactions[emojiKey] || 1) - 1);
    } else {
      post.reactions[emojiKey] = (post.reactions[emojiKey] || 0) + 1;
    }
  }

  try {
    const payload = {
      action: 'reactPost',
      postId: postId,
      emoji: emojiKey,
      isRemoving: isRemoving
    };
    
    const response = await fetch(state.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (!result.success) {
      console.warn("Server failed to update reaction:", result.message);
    }
  } catch(e) {
    console.warn("Reaction API call failed:", e);
  }
};

// Clipboard copy image helper
window.copyImageToClipboard = async function(imageUrl, event) {
  if (event) event.stopPropagation();
  showToast("正在處理圖片，請稍候...", "warning");
  
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            fallbackCopyUrl(imageUrl);
            return;
          }
          try {
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
  
  if (!commentText) return;
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  try {
    const payload = {
      action: 'addComment',
      postId: postId,
      email: state.clientIp,
      name: '匿名訪客',
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
    
    const timeOptions = { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    const absoluteTime = date.toLocaleDateString('zh-TW', timeOptions);
    
    if (diffMins < 1) return `剛剛 (${absoluteTime})`;
    if (diffMins < 60) return `${diffMins} 分鐘前 (${absoluteTime})`;
    if (diffHours < 24) return `${diffHours} 小時前 (${absoluteTime})`;
    
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
