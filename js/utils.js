/* ============================================================
   Utilities — Shared helper functions
   ============================================================ */

const Utils = {
  // ── UUID Generator ──
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // ── Generate unique booking token ──
  generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const timestamp = Date.now().toString(36);
    let random = '';
    for (let i = 0; i < 24; i++) {
      random += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${timestamp}_${random}`;
  },

  // ── HMAC-like signature for QR tokens ──
  signToken(token, secret = 'IU_BOOKING_2025_SECRET') {
    let hash = 0;
    const combined = token + secret;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  // ── Date Formatting ──
  formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  formatDateISO(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },

  formatTime(time24) {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  },

  // ── Get today's date string ──
  today() {
    return new Date().toISOString().split('T')[0];
  },

  // ── Check if date is in the past ──
  isPast(dateStr, timeStr) {
    const dt = new Date(`${dateStr}T${timeStr}:00`);
    return dt < new Date();
  },

  // ── Hours between now and booking ──
  hoursUntil(dateStr, timeStr) {
    const dt = new Date(`${dateStr}T${timeStr}:00`);
    const now = new Date();
    return (dt - now) / (1000 * 60 * 60);
  },

  // ── Toast Notifications ──
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ── Show Loading ──
  showLoading(text = 'جاري التحميل...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      const p = overlay.querySelector('p');
      if (p) p.textContent = text;
      overlay.classList.add('active');
    }
  },

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
  },

  // ── Local Storage helpers ──
  saveLocal(key, data) {
    localStorage.setItem(`iu_${key}`, JSON.stringify(data));
  },

  getLocal(key) {
    const data = localStorage.getItem(`iu_${key}`);
    return data ? JSON.parse(data) : null;
  },

  removeLocal(key) {
    localStorage.removeItem(`iu_${key}`);
  },

  // ── Debounce ──
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  // ── Deep copy ──
  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // ── Escape HTML ──
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // ── Arabic number formatting ──
  formatArabicNumber(num) {
    return num.toLocaleString('ar-JO');
  },

  // ── Currency formatting ──
  formatCurrency(amount) {
    return `${amount.toFixed(2)} د.أ`;
  },

  // ── Get URL parameter ──
  getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  // ── Password hashing (simple for demo - use bcrypt in production) ──
  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'h_' + Math.abs(hash).toString(36) + '_' + password.length;
  },

  // ── Validate student ID format ──
  isValidStudentId(id) {
    return /^[a-zA-Z]{1,3}\d{3,5}$/i.test(id);
  },

  // ── Get day name in Arabic ──
  getDayName(date) {
    return new Date(date).toLocaleDateString('ar-JO', { weekday: 'long' });
  },

  // ── Generate time slots ──
  generateTimeSlots(openTime = '08:00', closeTime = '16:00', intervalMinutes = 60) {
    const slots = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    let currentMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;
    
    const allowedHours = [8, 9, 10, 11, 12, 14, 15];
    
    while (currentMinutes < endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      
      if (allowedHours.includes(h)) {
        const startTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        const nextMinutes = currentMinutes + intervalMinutes;
        const nh = Math.floor(nextMinutes / 60);
        const nm = nextMinutes % 60;
        const endTime = `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
        
        slots.push({ startTime, endTime, display: `${Utils.formatTime(startTime)} - ${Utils.formatTime(endTime)}` });
      }
      currentMinutes += intervalMinutes;
    }
    
    return slots;
  }
};

// Make globally available
window.Utils = Utils;
