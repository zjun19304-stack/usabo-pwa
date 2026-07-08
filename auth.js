/* ════════════════════════════════════════════════════════
   USABO PWA — Auth Module (Hardened)
   登录验证 + 题库解密 + 多学生支持 + 安全加固
   ════════════════════════════════════════════════════════ */

'use strict';

const Auth = {
  SESSION_KEY: 'usabo_auth_session',
  SESSION_MAX_AGE: 2 * 60 * 60 * 1000,  // 2 hours
  MAX_ATTEMPTS: 5,
  LOCK_TIME: 30000,                     // 30s initial lock
  LOCK_MAX_TIME: 5 * 60 * 1000,         // 5min max lock
  currentStudent: '',

  /**
   * 初始化：检查是否已登录，未登录则显示登录界面
   */
  init() {
    // ── Frame-busting: prevent clickjacking ──
    if (window.top !== window.self) {
      window.top.location = window.self.location;
      return;
    }

    const session = this.getSession();
    if (session) {
      // Check session expiry
      if (Date.now() - session.time > this.SESSION_MAX_AGE) {
        this.clearSession();
        this.showLogin();
        return;
      }
      this.tryDecrypt(session.password).then(success => {
        if (success) {
          this.unlockApp();
        } else {
          this.clearSession();
          this.showLogin();
        }
      });
    } else {
      this.showLogin();
    }
  },

  /**
   * 显示登录界面
   */
  showLogin() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
      loginScreen.classList.add('active');
      const input = document.getElementById('login-password');
      if (input) {
        input.focus();
        // Remove any old listeners by cloning
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.handleLogin();
        });
      }
      const btn = document.getElementById('login-btn');
      if (btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => this.handleLogin());
      }
    }
  },

  hideLogin() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.remove('active');
  },

  /**
   * 处理登录 — with cross-tab rate limiting via localStorage
   */
  async handleLogin() {
    const input = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (!input) return;

    // ── Check rate limit (localStorage for cross-tab) ──
    const lockUntil = parseInt(localStorage.getItem('usabo_lock_until') || '0');
    if (Date.now() < lockUntil) {
      const wait = Math.ceil((lockUntil - Date.now()) / 1000);
      if (errorEl) errorEl.textContent = `尝试过多，请 ${wait} 秒后再试`;
      return;
    }

    const password = input.value.trim();
    if (!password) {
      if (errorEl) errorEl.textContent = '请输入密码';
      return;
    }

    // Rate limit by password hash to prevent enumeration
    const pwdHash = await this.sha256Hex(password);

    if (btn) {
      btn.disabled = true;
      btn.textContent = '验证中...';
    }

    const success = await this.tryDecrypt(password);

    if (success) {
      this.saveSession(password);
      this.hideLogin();
      this.unlockApp();
      this.setupAntiCopy();
      // Clear rate limit on success
      localStorage.removeItem('usabo_lock_until');
      localStorage.removeItem('usabo_attempts');
      sessionStorage.removeItem('usabo_attempts');
    } else {
      // Use sessionStorage for same-tab attempt counting
      const attempts = parseInt(sessionStorage.getItem('usabo_attempts') || '0') + 1;
      sessionStorage.setItem('usabo_attempts', attempts.toString());

      if (attempts >= this.MAX_ATTEMPTS) {
        // Exponential backoff: 30s, 60s, 120s, 300s
        const lockCount = parseInt(localStorage.getItem('usabo_lock_count') || '0') + 1;
        localStorage.setItem('usabo_lock_count', lockCount.toString());
        const lockTime = Math.min(this.LOCK_TIME * Math.pow(2, lockCount - 1), this.LOCK_MAX_TIME);
        localStorage.setItem('usabo_lock_until', (Date.now() + lockTime).toString());
        sessionStorage.setItem('usabo_attempts', '0');
        const waitSec = Math.ceil(lockTime / 1000);
        if (errorEl) errorEl.textContent = `密码错误次数过多，请 ${waitSec} 秒后再试`;
      } else {
        const remaining = this.MAX_ATTEMPTS - attempts;
        if (errorEl) errorEl.textContent = `密码错误，还剩 ${remaining} 次尝试机会`;
      }

      input.value = '';
      input.focus();
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = '进入';
    }
  },

  /**
   * SHA-256 hash to hex string (for rate limiting, not crypto)
   */
  async sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * 尝试用密码解密题库
   */
  async tryDecrypt(password) {
    if (!window.__USABO_ENC__ || !Array.isArray(window.__USABO_ENC__)) {
      console.error('加密题库未加载');
      return false;
    }

    // Rate-limit decryption attempts to prevent brute force
    const totalBlobs = window.__USABO_ENC__.length;
    for (let i = 0; i < totalBlobs; i++) {
      try {
        const decrypted = await this.decryptData(window.__USABO_ENC__[i], password);
        if (decrypted) {
          const data = JSON.parse(decrypted);
          if (data.topics && data.questions && data.student) {
            // Validate data structure
            if (!Array.isArray(data.topics) || !Array.isArray(data.questions)) {
              continue;
            }
            window.TOPICS = data.topics;
            window.QUESTIONS = data.questions;
            this.currentStudent = data.student || '同学';
            return true;
          }
        }
      } catch (e) {
        // Decryption failed — wrong password or corrupted data
      }
    }
    return false;
  },

  /**
   * 解密数据（与 Python 端 encrypt_data 对应）
   * XOR stream cipher with SHA-256 counter mode keystream
   */
  async decryptData(encryptedB64, password) {
    const keyData = new TextEncoder().encode(password);
    const keyHash = new Uint8Array(await crypto.subtle.digest('SHA-256', keyData));

    const encrypted = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
    const keystream = await this.generateKeystream(keyHash, encrypted.length);

    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keystream[i];
    }

    return new TextDecoder().decode(decrypted);
  },

  /**
   * 生成密钥流（与 Python generate_keystream 一致）
   */
  async generateKeystream(keyBytes, length) {
    const stream = new Uint8Array(length);
    let offset = 0;
    let counter = 0;

    while (offset < length) {
      const counterBuf = new Uint8Array(4);
      new DataView(counterBuf.buffer).setUint32(0, counter, false);

      const input = new Uint8Array(keyBytes.length + 4);
      input.set(keyBytes);
      input.set(counterBuf, keyBytes.length);

      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
      const chunkLen = Math.min(32, length - offset);
      stream.set(hash.subarray(0, chunkLen), offset);
      offset += chunkLen;
      counter++;
    }

    return stream;
  },

  /**
   * 解锁应用
   */
  unlockApp() {
    const app = document.getElementById('app');
    if (app) app.style.display = '';
    this.updateStudentDisplay();
    window.dispatchEvent(new CustomEvent('auth:ready'));
  },

  /**
   * 更新界面上的学生姓名显示
   */
  updateStudentDisplay() {
    const subtitle = document.querySelector('.app-header .subtitle');
    if (subtitle) {
      subtitle.textContent = `${this.currentStudent} · 课后自主刷题`;
    }
    document.title = `USABO 专题训练 · ${this.currentStudent}`;
    const studentBar = document.getElementById('student-bar');
    if (studentBar) {
      studentBar.textContent = this.currentStudent;
    }
  },

  /**
   * 会话管理 — store password with expiry timestamp
   * Note: password must be retained to re-decrypt on refresh.
   * Session expires after SESSION_MAX_AGE.
   */
  getSession() {
    try {
      const s = sessionStorage.getItem(this.SESSION_KEY);
      if (!s) return null;
      const parsed = JSON.parse(s);
      // Check expiry
      if (Date.now() - parsed.time > this.SESSION_MAX_AGE) {
        sessionStorage.removeItem(this.SESSION_KEY);
        return null;
      }
      return parsed;
    } catch { return null; }
  },

  saveSession(password) {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
      password: password,
      student: this.currentStudent,
      time: Date.now(),
    }));
  },

  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
    // Also clear app data
    sessionStorage.removeItem('usabo_attempts');
    // Clear in-memory question data
    if (window.QUESTIONS) window.QUESTIONS = null;
    if (window.TOPICS) window.TOPICS = null;
  },

  /**
   * 登出 — clear all sensitive data
   */
  logout() {
    this.clearSession();
    // 只清除当前学生的本地数据，不影响其他学生
    try {
      const s = (this.currentStudent || 'unknown').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      localStorage.removeItem(`usabo_wrong_answers_${s}`);
      localStorage.removeItem(`usabo_practice_history_${s}`);
      localStorage.removeItem(`usabo_current_session_${s}`);
      localStorage.removeItem(`usabo_settings_${s}`);
    } catch {}
    location.reload();
  },

  /**
   * 反复制措施 — raises the bar, not absolute
   */
  setupAntiCopy() {
    // Disable right-click context menu (except in input fields)
    document.addEventListener('contextmenu', (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (['input', 'textarea'].includes(tag)) return;
      e.preventDefault();
    });

    // Disable text selection (except in input fields)
    document.addEventListener('selectstart', (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (['input', 'textarea'].includes(tag)) return;
      e.preventDefault();
    });

    // Block common devtools shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12') { e.preventDefault(); return; }
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j')) {
        e.preventDefault(); return;
      }
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault(); return;
      }
      // Block Ctrl+Shift+C (element inspector)
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault(); return;
      }
    });

    // Devtools detection via viewport size differential
    let devtoolsOpen = false;
    const threshold = 160;
    const checkDevtools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          // Blur content to deter screenshot inspection
          document.body.style.filter = 'blur(10px)';
        }
      } else {
        if (devtoolsOpen) {
          devtoolsOpen = false;
          document.body.style.filter = '';
        }
      }
    };
    setInterval(checkDevtools, 1000);

    // Clear in-memory data on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Don't clear data, but blur to prevent screenshot inspection
        document.body.style.filter = 'blur(10px)';
      } else {
        if (!devtoolsOpen) {
          document.body.style.filter = '';
        }
      }
    });
  },
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
