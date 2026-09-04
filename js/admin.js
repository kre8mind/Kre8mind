/**
 * KRE8MIND STUDIO CONTROL CENTER
 * Client Management, Case Studies, Journal, Testimonials, Analytics & Security
 */

// Global State
let inquiriesData = [];
let projectsData = [];
let journalData = [];
let testimonialsData = [];
let currentCaseStudySlices = [];
let pendingConfirmResolve = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initCustomDialogs();
  initNavigation();
  initProjectsCMS();
  initJournalCMS();
  initTestimonialsCMS();
  initAnalytics();
  initSecurity();
});

/* --------------------------------------------------------------------------
   1. Custom Dialog & Toast Notification System (Zero Browser Alert/Confirm)
   -------------------------------------------------------------------------- */
function initCustomDialogs() {
  const confirmModal = document.getElementById('studio-confirm-modal');
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  const okBtn = document.getElementById('confirm-ok-btn');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      confirmModal.classList.remove('open');
      if (pendingConfirmResolve) {
        pendingConfirmResolve(false);
        pendingConfirmResolve = null;
      }
    });
  }

  if (okBtn) {
    okBtn.addEventListener('click', () => {
      confirmModal.classList.remove('open');
      if (pendingConfirmResolve) {
        pendingConfirmResolve(true);
        pendingConfirmResolve = null;
      }
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
      confirmModal.classList.remove('open');
      if (pendingConfirmResolve) {
        pendingConfirmResolve(false);
        pendingConfirmResolve = null;
      }
    }
  });
}

function showCustomConfirm(title, message, okText = 'Confirm', isDanger = true) {
  return new Promise((resolve) => {
    pendingConfirmResolve = resolve;
    const confirmModal = document.getElementById('studio-confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok-btn');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (okBtn) {
      okBtn.textContent = okText;
      okBtn.className = isDanger ? 'btn-studio danger' : 'btn-studio';
    }

    if (confirmModal) confirmModal.classList.add('open');
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('studio-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `studio-toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* --------------------------------------------------------------------------
   2. Authentication Gate & Token Management
   -------------------------------------------------------------------------- */
function initAuth() {
  const authScreen = document.getElementById('auth-screen');
  const authForm = document.getElementById('auth-form');
  const authError = document.getElementById('auth-error');
  const logoutBtn = document.getElementById('logout-btn');

  const token = localStorage.getItem('kre8_token');
  if (token) {
    fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      if (data.authenticated) {
        authScreen.style.display = 'none';
        loadDashboardData();
      } else {
        localStorage.removeItem('kre8_token');
        authScreen.style.display = 'flex';
      }
    })
    .catch(() => {
      authScreen.style.display = 'none';
      loadDashboardData();
    });
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.style.display = 'none';
    const password = document.getElementById('admin-pass').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('kre8_token', data.token);
        authScreen.style.display = 'none';
        showToast('Logged into Studio Control Center', 'success');
        loadDashboardData();
      } else {
        authError.textContent = data.error || 'Access denied';
        authError.style.display = 'block';
      }
    } catch {
      authError.textContent = 'Server connection error';
      authError.style.display = 'block';
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const confirmed = await showCustomConfirm('Log Out', 'Are you sure you want to end your studio session?', 'Log Out', false);
      if (confirmed) {
        localStorage.removeItem('kre8_token');
        window.location.reload();
      }
    });
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('kre8_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/* --------------------------------------------------------------------------
   3. Tab Navigation
   -------------------------------------------------------------------------- */
function initNavigation() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.view-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');

      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const activePane = document.getElementById(`view-${target}`);
      if (activePane) activePane.classList.add('active');

      if (target === 'analytics') {
        fetchAnalyticsOverview();
      }
    });
  });

  document.getElementById('refresh-inquiries-btn')?.addEventListener('click', () => {
    fetchInquiries();
    showToast('Inquiries refreshed', 'info');
  });

  document.getElementById('refresh-analytics-btn')?.addEventListener('click', () => {
    fetchAnalyticsOverview();
    showToast('Traffic metrics refreshed', 'info');
  });
}

function loadDashboardData() {
  fetchInquiries();
  fetchProjects();
  fetchJournal();
  fetchTestimonials();
  fetchAnalyticsOverview();
}

/* --------------------------------------------------------------------------
   4. Inquiries & Cal.com Booked Calls
   -------------------------------------------------------------------------- */
async function fetchInquiries() {
  const tbody = document.getElementById('inquiries-tbody');
  try {
    const res = await fetch('/api/requests');
    const json = await res.json();

    if (json.success) {
      inquiriesData = json.data || json.inquiries || [];
      renderInquiries();
      updateMetricCounts();
    }
  } catch {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">Error loading inquiries.</td></tr>`;
  }
}

function renderInquiries() {
  const tbody = document.getElementById('inquiries-tbody');
  if (!tbody) return;

  if (!inquiriesData.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px;">No inquiries or bookings received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = inquiriesData.map(item => {
    const date = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const currentStatus = item.status || 'NEW';

    return `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${date}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(item.name)}</div>
          <a href="mailto:${escapeHtml(item.email)}" style="font-size: 12px; color: var(--text-muted); text-decoration: none;">${escapeHtml(item.email)}</a>
        </td>
        <td><span style="font-family: var(--font-sans); font-size: 12px; font-weight: 600;">${escapeHtml(item.serviceTier || 'General Inquiry')}</span></td>
        <td style="font-family: var(--font-mono); font-size: 11.5px;">${escapeHtml(item.budget || '—')}</td>
        <td>
          <select class="form-select" onchange="changeInquiryStatus('${item.id}', this.value)" style="padding: 4px 8px; font-size: 11px; font-family: var(--font-mono); width: auto; background:#fff; cursor: pointer;">
            <option value="NEW" ${currentStatus === 'NEW' ? 'selected' : ''}>New Inquiry</option>
            <option value="ONGOING" ${currentStatus === 'ONGOING' ? 'selected' : ''}>Ongoing Project</option>
            <option value="COMPLETED" ${currentStatus === 'COMPLETED' ? 'selected' : ''}>Project Done</option>
            <option value="REJECTED" ${currentStatus === 'REJECTED' ? 'selected' : ''}>Not Work Out</option>
            <option value="BOOKED_CALL" ${currentStatus === 'BOOKED_CALL' ? 'selected' : ''}>Booked Call (Cal.com)</option>
          </select>
        </td>
        <td>
          <button class="site-link" onclick="deleteInquiry('${item.id}')" style="color: #ef4444; font-size: 11px; cursor: pointer;">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.changeInquiryStatus = async function(id, newStatus) {
  try {
    const res = await fetch(`/api/requests/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Inquiry status updated', 'success');
      fetchInquiries();
    } else {
      showToast(data.error || 'Failed to update status', 'error');
    }
  } catch {
    showToast('Failed to update status', 'error');
  }
};

window.deleteInquiry = async function(id) {
  const confirmed = await showCustomConfirm('Delete Inquiry', 'Are you sure you want to delete this client request?');
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      showToast('Inquiry deleted', 'info');
      fetchInquiries();
    } else {
      showToast(data.error || 'Failed to delete inquiry', 'error');
    }
  } catch {
    showToast('Failed to delete inquiry', 'error');
  }
};

/* --------------------------------------------------------------------------
   5. Projects & Behance-Style Case Study Manager
   -------------------------------------------------------------------------- */
function initProjectsCMS() {
  const modal = document.getElementById('project-modal');
  const openBtn = document.getElementById('btn-open-project-modal');
  const cancelBtn = document.getElementById('btn-cancel-project');
  const form = document.getElementById('project-form');
  const coverFileInput = document.getElementById('proj-cover-file');
  const slicesFileInput = document.getElementById('proj-slices-file');
  const hasCaseStudyCheckbox = document.getElementById('proj-has-casestudy');
  const caseStudyArea = document.getElementById('case-study-fields');
  
  openBtn?.addEventListener('click', () => {
    form.reset();
    document.getElementById('proj-id').value = '';
    document.getElementById('modal-project-title').textContent = 'Add Project Showcase';
    document.getElementById('proj-featured').checked = true;
    currentCaseStudySlices = [];
    renderSlicesList();
    renderCoverPreview('');
    caseStudyArea.classList.remove('show');
    modal.classList.add('open');
  });

  cancelBtn?.addEventListener('click', () => modal.classList.remove('open'));

  hasCaseStudyCheckbox?.addEventListener('change', () => {
    if (hasCaseStudyCheckbox.checked) {
      caseStudyArea.classList.add('show');
    } else {
      caseStudyArea.classList.remove('show');
    }
  });

  coverFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast('Uploading cover media...', 'info');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('proj-media').value = data.filePath;
        renderCoverPreview(data.filePath);
        showToast('Cover media uploaded', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Error uploading file', 'error');
    }
  });

  slicesFileInput?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      showToast(`Uploading ${files.length} slices...`, 'info');
      const res = await fetch('/api/upload-multiple', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        data.filePaths.forEach((path) => {
          const isVideo = /\.(mp4|webm|mov)$/i.test(path);
          currentCaseStudySlices.push({
            type: isVideo ? 'video' : 'image',
            url: path,
            caption: `Slide ${currentCaseStudySlices.length + 1}`
          });
        });
        renderSlicesList();
        showToast(`${files.length} slices added`, 'success');
      } else {
        showToast(data.error || 'Batch upload failed', 'error');
      }
    } catch {
      showToast('Error during batch upload', 'error');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('proj-id').value;
    const title = document.getElementById('proj-name').value.trim();
    const category = document.getElementById('proj-category').value.trim();
    const year = document.getElementById('proj-date').value.trim();
    const layout = document.getElementById('proj-layout').value;
    const image = document.getElementById('proj-media').value.trim() || 'assets/showcase/journal-1.jpg';
    const summary = document.getElementById('proj-summary').value.trim();
    const featured = document.getElementById('proj-featured').checked;
    const hasCaseStudy = document.getElementById('proj-has-casestudy').checked;

    if (!title || !category) {
      showToast('Please fill in required fields (*)', 'error');
      return;
    }

    const payload = {
      title,
      category,
      year,
      layout,
      image,
      summary,
      featured,
      hasCaseStudy,
      caseStudySlices: hasCaseStudy ? currentCaseStudySlices : []
    };

    try {
      const url = id ? `/api/projects/${id}` : '/api/projects';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        modal.classList.remove('open');
        showToast(id ? 'Project updated successfully' : 'New project published', 'success');
        fetchProjects();
      } else {
        showToast(data.error || 'Failed to save project', 'error');
      }
    } catch {
      showToast('Error saving project', 'error');
    }
  });
}

function renderCoverPreview(url) {
  const previewBox = document.getElementById('proj-cover-preview');
  if (!previewBox) return;
  if (!url) {
    previewBox.style.display = 'none';
    previewBox.innerHTML = '';
    return;
  }

  const isVideo = /\.(mp4|webm|mov)$/i.test(url);
  previewBox.style.display = 'block';
  if (isVideo) {
    previewBox.innerHTML = `<video src="${url}" controls autoplay muted loop class="live-media-preview" style="display:block; max-height:160px;"></video>`;
  } else {
    previewBox.innerHTML = `<img src="${url}" class="live-media-preview" style="display:block; max-height:160px;">`;
  }
}

function renderSlicesList() {
  const container = document.getElementById('slices-container');
  if (!container) return;

  if (!currentCaseStudySlices.length) {
    container.innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); padding: 8px 0;">No media slices attached. Click above to add presentation slides or video demos.</div>`;
    return;
  }

  container.innerHTML = currentCaseStudySlices.map((slice, idx) => `
    <div class="slice-item-row">
      <span class="slice-item-type">${slice.type === 'video' ? '🎬 VIDEO' : '🖼 IMAGE'}</span>
      <span class="slice-item-url">${escapeHtml(slice.url)}</span>
      <div style="margin-left: auto; display: flex; gap: 6px;">
        <button type="button" class="site-link" onclick="removeSlice(${idx})" style="color: #ef4444; font-size: 11px;">Remove</button>
      </div>
    </div>
  `).join('');
}

window.removeSlice = function(idx) {
  currentCaseStudySlices.splice(idx, 1);
  renderSlicesList();
};

async function fetchProjects() {
  const tbody = document.getElementById('projects-tbody');
  try {
    const res = await fetch('/api/projects');
    const json = await res.json();
    if (json.success) {
      projectsData = json.data || json.projects || [];
      renderProjectsTable();
      updateMetricCounts();
    }
  } catch {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Error loading projects.</td></tr>`;
  }
}

function renderProjectsTable() {
  const tbody = document.getElementById('projects-tbody');
  if (!tbody) return;

  if (!projectsData.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px;">No projects published yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = projectsData.map((p, idx) => {
    const sliceCount = (p.caseStudySlices || []).length;
    const isVideo = /\.(mp4|webm|mov)$/i.test(p.image || '');
    const isFeatured = p.featured !== false;

    return `
      <tr>
        <td style="width: 80px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; width: 16px;">${idx + 1}</span>
            <div style="display: flex; flex-direction: column; gap: 1px;">
              <button type="button" class="site-link" onclick="moveProjectUp('${p.id}')" title="Move Up" style="padding: 0 4px; font-size: 10px; line-height: 1; cursor: pointer;" ${idx === 0 ? 'disabled style="opacity:0.2;"' : ''}>▲</button>
              <button type="button" class="site-link" onclick="moveProjectDown('${p.id}')" title="Move Down" style="padding: 0 4px; font-size: 10px; line-height: 1; cursor: pointer;" ${idx === projectsData.length - 1 ? 'disabled style="opacity:0.2;"' : ''}>▼</button>
            </div>
          </div>
        </td>
        <td style="width: 70px;">
          ${isVideo 
            ? `<video src="${p.image}" style="width: 54px; height: 36px; object-fit: cover; background: #000;"></video>`
            : `<img src="${p.image || 'assets/showcase/journal-1.jpg'}" style="width: 54px; height: 36px; object-fit: cover;">`
          }
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(p.title)}</div>
          <div style="font-size: 11.5px; color: var(--text-muted); max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.summary || '')}</div>
        </td>
        <td><span class="brand-pill">${escapeHtml(p.category)}</span></td>
        <td>
          <button type="button" class="btn-studio secondary" onclick="toggleProjectFeatured('${p.id}')" style="padding: 4px 10px; font-size: 11px; font-family: var(--font-mono); cursor: pointer; border-color: ${isFeatured ? '#09090b' : 'var(--border-light)'}; background: ${isFeatured ? 'rgba(9,9,11,0.06)' : '#fff'};">
            ${isFeatured ? '★ Featured on Home' : '○ Archive Only'}
          </button>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 10.5px;">
            ${sliceCount > 0 ? `✓ ${sliceCount} Slices` : '—'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="site-link" onclick="editProject('${p.id}')" style="cursor: pointer;">Edit</button>
            <button class="site-link" onclick="deleteProject('${p.id}')" style="color: #ef4444; font-size: 11px; cursor: pointer;">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleProjectFeatured = async function(id) {
  const p = projectsData.find(item => item.id === id);
  if (!p) return;

  const newFeatured = !(p.featured !== false);
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ featured: newFeatured })
    });
    const json = await res.json();
    if (json.success) {
      showToast(newFeatured ? `★ "${p.title}" is now featured on the Home screen` : `"${p.title}" moved to Archive only`, 'success');
      fetchProjects();
    } else {
      showToast(json.error || 'Failed to update featured status', 'error');
    }
  } catch {
    showToast('Error updating status', 'error');
  }
};

window.moveProjectUp = async function(id) {
  const idx = projectsData.findIndex(item => item.id === id);
  if (idx <= 0) return;

  const newOrder = [...projectsData];
  const temp = newOrder[idx - 1];
  newOrder[idx - 1] = newOrder[idx];
  newOrder[idx] = temp;

  await saveProjectsReorder(newOrder.map(p => p.id));
};

window.moveProjectDown = async function(id) {
  const idx = projectsData.findIndex(item => item.id === id);
  if (idx === -1 || idx >= projectsData.length - 1) return;

  const newOrder = [...projectsData];
  const temp = newOrder[idx + 1];
  newOrder[idx + 1] = newOrder[idx];
  newOrder[idx] = temp;

  await saveProjectsReorder(newOrder.map(p => p.id));
};

async function saveProjectsReorder(projectIds) {
  try {
    const res = await fetch('/api/projects/reorder', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectIds })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Project display order updated', 'success');
      fetchProjects();
    } else {
      showToast(json.error || 'Failed to reorder', 'error');
    }
  } catch {
    showToast('Error reordering projects', 'error');
  }
}

window.editProject = function(id) {
  const p = projectsData.find(item => item.id === id);
  if (!p) return;

  document.getElementById('proj-id').value = p.id;
  document.getElementById('modal-project-title').textContent = 'Edit Project Showcase';
  document.getElementById('proj-name').value = p.title || '';
  document.getElementById('proj-category').value = p.category || '';
  document.getElementById('proj-date').value = p.year || '2026';
  document.getElementById('proj-layout').value = p.layout || '16:9 Standard';
  document.getElementById('proj-media').value = p.image || '';
  document.getElementById('proj-summary').value = p.summary || '';
  document.getElementById('proj-featured').checked = (p.featured !== false);

  const hasCase = !!(p.hasCaseStudy || (p.caseStudySlices && p.caseStudySlices.length));
  document.getElementById('proj-has-casestudy').checked = hasCase;
  const caseStudyArea = document.getElementById('case-study-fields');
  if (hasCase) caseStudyArea.classList.add('show');
  else caseStudyArea.classList.remove('show');

  currentCaseStudySlices = p.caseStudySlices || [];
  renderSlicesList();
  renderCoverPreview(p.image);

  document.getElementById('project-modal').classList.add('open');
};

window.deleteProject = async function(id) {
  const confirmed = await showCustomConfirm('Delete Project', 'Are you sure you want to delete this project from the showcase?');
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      showToast('Project removed', 'info');
      fetchProjects();
    } else {
      showToast(data.error || 'Failed to delete project', 'error');
    }
  } catch {
    showToast('Failed to delete project', 'error');
  }
};

/* --------------------------------------------------------------------------
   6. Journal CMS
   -------------------------------------------------------------------------- */
function initJournalCMS() {
  const modal = document.getElementById('journal-modal');
  const openBtn = document.getElementById('btn-open-journal-modal');
  const cancelBtn = document.getElementById('btn-cancel-journal');
  const form = document.getElementById('journal-form');
  const coverFileInput = document.getElementById('art-cover-file');

  openBtn?.addEventListener('click', () => {
    form.reset();
    document.getElementById('art-id').value = '';
    document.getElementById('modal-journal-title').textContent = 'Write Journal Article';
    renderJournalCoverPreview('');
    modal.classList.add('open');
  });

  cancelBtn?.addEventListener('click', () => modal.classList.remove('open'));

  coverFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast('Uploading article cover image...', 'info');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('art-image').value = data.filePath;
        renderJournalCoverPreview(data.filePath);
        showToast('Cover uploaded', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Error uploading image', 'error');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('art-id').value;
    const title = document.getElementById('art-title').value.trim();
    const category = document.getElementById('art-category').value.trim();
    const readTime = document.getElementById('art-readtime').value.trim();
    const image = document.getElementById('art-image').value.trim() || 'assets/showcase/journal-1.jpg';
    const content = document.getElementById('art-content').value.trim();

    if (!title || !content) {
      showToast('Please provide a title and article body', 'error');
      return;
    }

    const payload = {
      title,
      category,
      readTime,
      image,
      content,
      snippet: content.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...'
    };

    try {
      const url = id ? `/api/journal/${id}` : '/api/journal';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        modal.classList.remove('open');
        showToast(id ? 'Article updated' : 'Article published', 'success');
        fetchJournal();
      } else {
        showToast(data.error || 'Failed to save article', 'error');
      }
    } catch {
      showToast('Error saving article', 'error');
    }
  });
}

function renderJournalCoverPreview(url) {
  const box = document.getElementById('art-cover-preview');
  if (!box) return;
  if (!url) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.style.display = 'block';
  box.innerHTML = `<img src="${url}" class="live-media-preview" style="display:block; max-height:160px;">`;
}

window.insertFormat = function(type) {
  const textarea = document.getElementById('art-content');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const sel = textarea.value.substring(start, end);
  let replacement = '';

  switch (type) {
    case 'bold': replacement = `<b>${sel || 'Bold Text'}</b>`; break;
    case 'italic': replacement = `<i>${sel || 'Italic Text'}</i>`; break;
    case 'heading': replacement = `\n<h2>${sel || 'Section Heading'}</h2>\n`; break;
    case 'quote': replacement = `\n<blockquote>${sel || 'Quote'}</blockquote>\n`; break;
    case 'break': replacement = `\n<hr>\n`; break;
  }

  textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
  textarea.focus();
};

async function fetchJournal() {
  const tbody = document.getElementById('journal-tbody');
  try {
    const res = await fetch('/api/journal');
    const json = await res.json();
    if (json.success) {
      journalData = json.data || json.articles || [];
      renderJournalTable();
      updateMetricCounts();
    }
  } catch {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">Error loading journal.</td></tr>`;
  }
}

function renderJournalTable() {
  const tbody = document.getElementById('journal-tbody');
  if (!tbody) return;

  if (!journalData.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">No articles published yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = journalData.map(art => `
    <tr>
      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(art.date)}</td>
      <td>
        <div style="font-weight: 600;">${escapeHtml(art.title)}</div>
      </td>
      <td><span class="brand-pill">${escapeHtml(art.category)}</span></td>
      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(art.readTime)}</td>
      <td>
        <button class="site-link" onclick="deleteArticle('${art.id}')" style="color: #ef4444; font-size: 11px; cursor: pointer;">✕</button>
      </td>
    </tr>
  `).join('');
}

window.deleteArticle = async function(id) {
  const confirmed = await showCustomConfirm('Delete Article', 'Are you sure you want to delete this journal article?');
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/journal/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      showToast('Article deleted', 'info');
      fetchJournal();
    } else {
      showToast(data.error || 'Failed to delete article', 'error');
    }
  } catch {
    showToast('Failed to delete article', 'error');
  }
};

/* --------------------------------------------------------------------------
   7. Testimonials & Client Stories CMS
   -------------------------------------------------------------------------- */
function initTestimonialsCMS() {
  const modal = document.getElementById('testimonial-modal');
  const openBtn = document.getElementById('btn-open-testimonial-modal');
  const cancelBtn = document.getElementById('btn-cancel-testimonial');
  const form = document.getElementById('testimonial-form');
  const avatarFileInput = document.getElementById('testi-avatar-file');

  openBtn?.addEventListener('click', () => {
    form.reset();
    document.getElementById('testi-id').value = '';
    document.getElementById('modal-testimonial-title').textContent = 'Add Client Story';
    renderTestimonialAvatarPreview('');
    modal.classList.add('open');
  });

  cancelBtn?.addEventListener('click', () => modal.classList.remove('open'));

  avatarFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast('Uploading client avatar/logo...', 'info');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('testi-avatar').value = data.filePath;
        renderTestimonialAvatarPreview(data.filePath);
        showToast('Logo/Avatar uploaded', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Error uploading avatar', 'error');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('testi-id').value;
    const name = document.getElementById('testi-name').value.trim();
    const role = document.getElementById('testi-role').value.trim();
    const company = document.getElementById('testi-company').value.trim();
    const avatar = document.getElementById('testi-avatar').value.trim() || 'assets/clients/Tife Ojo Consults.png';
    const quote = document.getElementById('testi-quote').value.trim();

    if (!name || !quote) {
      showToast('Please provide client name and testimonial quote', 'error');
      return;
    }

    const payload = { name, role, company, avatar, quote };

    try {
      const url = id ? `/api/testimonials/${id}` : '/api/testimonials';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        modal.classList.remove('open');
        showToast(id ? 'Client story updated' : 'Client story added', 'success');
        fetchTestimonials();
      } else {
        showToast(data.error || 'Failed to save testimonial', 'error');
      }
    } catch {
      showToast('Error saving testimonial', 'error');
    }
  });
}

function renderTestimonialAvatarPreview(url) {
  const box = document.getElementById('testi-avatar-preview');
  if (!box) return;
  if (!url) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.style.display = 'block';
  box.innerHTML = `<img src="${url}" class="live-media-preview" style="display:block; max-height:80px; width: auto; object-fit: contain;">`;
}

async function fetchTestimonials() {
  const tbody = document.getElementById('testimonials-tbody');
  try {
    const res = await fetch('/api/testimonials');
    const json = await res.json();
    if (json.success) {
      testimonialsData = json.data || json.testimonials || [];
      renderTestimonialsTable();
      updateMetricCounts();
    }
  } catch {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">Error loading testimonials.</td></tr>`;
  }
}

function renderTestimonialsTable() {
  const tbody = document.getElementById('testimonials-tbody');
  if (!tbody) return;

  if (!testimonialsData.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">No client stories added yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = testimonialsData.map(t => `
    <tr>
      <td style="width: 80px;">
        <img src="${t.avatar || 'assets/clients/Tife Ojo Consults.png'}" style="height: 32px; max-width: 64px; object-fit: contain;">
      </td>
      <td>
        <div style="font-weight: 600;">${escapeHtml(t.name)}</div>
        <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(t.role || '')}</div>
      </td>
      <td><span class="brand-pill">${escapeHtml(t.company || 'Client')}</span></td>
      <td>
        <div style="font-size: 12.5px; color: var(--text-secondary); max-width: 340px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          "${escapeHtml(t.quote)}"
        </div>
      </td>
      <td>
        <button class="site-link" onclick="editTestimonial('${t.id}')" style="margin-right: 4px; cursor: pointer;">Edit</button>
        <button class="site-link" onclick="deleteTestimonial('${t.id}')" style="color: #ef4444; font-size: 11px; cursor: pointer;">✕</button>
      </td>
    </tr>
  `).join('');
}

window.editTestimonial = function(id) {
  const t = testimonialsData.find(item => item.id === id);
  if (!t) return;

  document.getElementById('testi-id').value = t.id;
  document.getElementById('modal-testimonial-title').textContent = 'Edit Client Story';
  document.getElementById('testi-name').value = t.name || '';
  document.getElementById('testi-role').value = t.role || '';
  document.getElementById('testi-company').value = t.company || '';
  document.getElementById('testi-avatar').value = t.avatar || '';
  document.getElementById('testi-quote').value = t.quote || '';

  renderTestimonialAvatarPreview(t.avatar);
  document.getElementById('testimonial-modal').classList.add('open');
};

window.deleteTestimonial = async function(id) {
  const confirmed = await showCustomConfirm('Delete Client Story', 'Are you sure you want to delete this testimonial?');
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/testimonials/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      showToast('Client story deleted', 'info');
      fetchTestimonials();
    } else {
      showToast(data.error || 'Failed to delete story', 'error');
    }
  } catch {
    showToast('Failed to delete testimonial', 'error');
  }
};

/* --------------------------------------------------------------------------
   8. Live Analytics Engine & Traffic Charts
   -------------------------------------------------------------------------- */
function initAnalytics() {}

async function fetchAnalyticsOverview() {
  try {
    const res = await fetch('/api/analytics/overview');
    const json = await res.json();
    if (json.success && json.data) {
      renderAnalyticsDashboard(json.data);
    }
  } catch (err) {
    console.error('Analytics load error:', err);
  }
}

function renderAnalyticsDashboard(data) {
  const convEl = document.getElementById('analytics-conv-rate');
  if (convEl) convEl.textContent = data.conversionRate || '0.0%';

  const totalDev = (data.deviceCounts.Desktop || 0) + (data.deviceCounts.Mobile || 0) + (data.deviceCounts.Tablet || 0) || 1;
  const pctDesktop = Math.round(((data.deviceCounts.Desktop || 0) / totalDev) * 100);
  const pctMobile = Math.round(((data.deviceCounts.Mobile || 0) / totalDev) * 100);
  const pctTablet = Math.round(((data.deviceCounts.Tablet || 0) / totalDev) * 100);

  setDeviceBar('desktop', pctDesktop);
  setDeviceBar('mobile', pctMobile);
  setDeviceBar('tablet', pctTablet);

  renderSvgTrafficChart(data.timeline || []);

  const topPagesTbody = document.getElementById('top-pages-tbody');
  if (topPagesTbody) {
    if (!data.topPages || !data.topPages.length) {
      topPagesTbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 20px;">No visits recorded yet.</td></tr>`;
    } else {
      topPagesTbody.innerHTML = data.topPages.map(tp => `
        <tr>
          <td><span style="font-family: var(--font-mono); font-size: 11.5px;">/${escapeHtml(tp.path)}</span></td>
          <td style="text-align: right; font-weight: 600; font-family: var(--font-mono); font-size: 11.5px;">${tp.count}</td>
        </tr>
      `).join('');
    }
  }

  const streamList = document.getElementById('recent-stream-list');
  if (streamList) {
    if (!data.recentStream || !data.recentStream.length) {
      streamList.innerHTML = `<div style="color: var(--text-muted); font-size: 12.5px; padding: 10px 0;">No recent traffic.</div>`;
    } else {
      streamList.innerHTML = data.recentStream.map(v => {
        const timeAgo = formatTimeAgo(new Date(v.time));
        return `
          <div class="stream-item">
            <div>
              <div class="stream-path">/${escapeHtml(v.path)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(v.device)} • via ${escapeHtml(v.referrer)}</div>
            </div>
            <div style="font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted);">${timeAgo}</div>
          </div>
        `;
      }).join('');
    }
  }
}

function setDeviceBar(id, pct) {
  const pctEl = document.getElementById(`device-pct-${id}`);
  const barEl = document.getElementById(`device-bar-${id}`);
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (barEl) barEl.style.width = `${pct}%`;
}

function renderSvgTrafficChart(timeline) {
  const svg = document.getElementById('traffic-chart-svg');
  if (!svg || !timeline.length) return;

  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(10, ...timeline.map(t => Math.max(t.visits || 0, (t.inquiries || 0) * 2)));
  const stepX = (width - paddingX * 2) / (timeline.length - 1 || 1);

  const points = timeline.map((d, idx) => {
    const x = paddingX + idx * stepX;
    const y = height - paddingY - ((d.visits || 0) / maxVal) * (height - paddingY * 2);
    return { x, y, d };
  });

  const inqPoints = timeline.map((d, idx) => {
    const x = paddingX + idx * stepX;
    const y = height - paddingY - (((d.inquiries || 0) * 3) / maxVal) * (height - paddingY * 2);
    return { x, y, d };
  });

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const inqPolylineStr = inqPoints.map(p => `${p.x},${p.y}`).join(' ');

  let gridLines = '';
  for (let g = 0; g <= 3; g++) {
    const gy = paddingY + (g / 3) * (height - paddingY * 2);
    gridLines += `<line x1="${paddingX}" y1="${gy}" x2="${width - paddingX}" y2="${gy}" stroke="#f0f0f3" stroke-width="1" />`;
  }

  const dateLabels = timeline.map((d, idx) => {
    const x = paddingX + idx * stepX;
    return `<text x="${x}" y="${height - 2}" text-anchor="middle" font-size="10" font-family="'Geist Mono', monospace" fill="#71717a">${d.label.split(',')[0]}</text>`;
  }).join('');

  const dataDots = points.map(p => `
    <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#0a0a0a" stroke="#ffffff" stroke-width="1.5">
      <title>${p.d.label}: ${p.d.visits} visits</title>
    </circle>
  `).join('');

  const inqDots = inqPoints.map(p => `
    <circle cx="${p.x}" cy="${p.y}" r="3" fill="#6C3BFF" stroke="#ffffff" stroke-width="1">
      <title>${p.d.label}: ${p.d.inquiries} inquiries</title>
    </circle>
  `).join('');

  svg.innerHTML = `
    ${gridLines}
    <polyline fill="none" stroke="#0a0a0a" stroke-width="2" points="${polylineStr}" />
    <polyline fill="none" stroke="#6C3BFF" stroke-width="1.5" stroke-dasharray="3,3" points="${inqPolylineStr}" />
    ${dataDots}
    ${inqDots}
    ${dateLabels}
  `;
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/* --------------------------------------------------------------------------
   9. Security & Password Change
   -------------------------------------------------------------------------- */
function initSecurity() {
  const form = document.getElementById('change-password-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('current-pwd').value;
    const newPassword = document.getElementById('new-pwd').value;
    const confirmNewPassword = document.getElementById('confirm-new-pwd').value;

    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Studio password updated successfully', 'success');
        form.reset();
      } else {
        showToast(data.error || 'Failed to update password', 'error');
      }
    } catch {
      showToast('Server error while updating password', 'error');
    }
  });
}

/* --------------------------------------------------------------------------
   10. Metrics Aggregation
   -------------------------------------------------------------------------- */
function updateMetricCounts() {
  const totalInquiriesEl = document.getElementById('stat-total-inquiries');
  const pendingInquiriesEl = document.getElementById('stat-pending-inquiries');
  const calCallsEl = document.getElementById('stat-cal-calls');
  const totalProjectsEl = document.getElementById('stat-total-projects');
  const totalTestimonialsEl = document.getElementById('stat-total-testimonials');

  if (totalInquiriesEl) totalInquiriesEl.textContent = inquiriesData.length;
  if (pendingInquiriesEl) {
    const pending = inquiriesData.filter(i => (i.status || 'NEW') === 'NEW').length;
    pendingInquiriesEl.textContent = pending;
  }
  if (calCallsEl) {
    const calls = inquiriesData.filter(i => (i.status || '').toUpperCase().includes('CALL')).length;
    calCallsEl.textContent = calls;
  }
  if (totalProjectsEl) totalProjectsEl.textContent = projectsData.length;
  if (totalTestimonialsEl) totalTestimonialsEl.textContent = testimonialsData.length;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
