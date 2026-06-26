/* ════════════════════════════════════════════════════════
   USABO PWA — Auth Module
   登录验证 + 题库解密
   ════════════════════════════════════════════════════════ */

'use strict';

const Auth = {
  SESSION_KEY: 'usabo_auth_session',
  MAX_ATTEMPTS: 5,
  LOCK_TIME: 30000, // 30秒锁定

  /**
   * 初始化：检查是否已登录，未登录则显示登录界面
   */
  init() {
    // 检查是否已有会话
    const session = this.getSession();
    if (session) {
      // 已有会话，尝试解密
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
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.handleLogin();
        });
      }
      const btn = document.getElementById('login-btn');
      if (btn) {
        btn.addEventListener('click', () => this.handleLogin());
      }
    }
  },

  /**
   * 隐藏登录界面
   */
  hideLogin() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.remove('active');
  },

  /**
   * 处理登录
   */
  async handleLogin() {
    const input = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (!input) return;

    // 检查锁定
    const lockUntil = parseInt(sessionStorage.getItem('usabo_lock_until') || '0');
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

    // 按钮状态
    if (btn) {
      btn.disabled = true;
      btn.textContent = '验证中...';
    }

    // 尝试解密
    const success = await this.tryDecrypt(password);

    if (success) {
      // 保存会话（sessionStorage：关闭浏览器后失效）
      this.saveSession(password);
      this.hideLogin();
      this.unlockApp();
      this.setupAntiCopy();
    } else {
      // 失败计数
      const attempts = parseInt(sessionStorage.getItem('usabo_attempts') || '0') + 1;
      sessionStorage.setItem('usabo_attempts', attempts.toString());

      if (attempts >= this.MAX_ATTEMPTS) {
        sessionStorage.setItem('usabo_lock_until', (Date.now() + this.LOCK_TIME).toString());
        sessionStorage.setItem('usabo_attempts', '0');
        if (errorEl) errorEl.textContent = `密码错误次数过多，请 30 秒后再试`;
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
   * 尝试用密码解密题库
   */
  async tryDecrypt(password) {
    if (!window.__USABO_ENC__ || !Array.isArray(window.__USABO_ENC__)) {
      console.error('加密题库未加载');
      return false;
    }

    for (const blob of window.__USABO_ENC__) {
      try {
        const decrypted = await this.decryptData(blob, password);
        if (decrypted) {
          const data = JSON.parse(decrypted);
          if (data.topics && data.questions) {
            window.TOPICS = data.topics;
            window.QUESTIONS = data.questions;
            return true;
          }
        }
      } catch (e) {
        // 解密失败，继续尝试下一个 blob
      }
    }
    return false;
  },

  /**
   * 解密数据（与 Python 端 encrypt_data 对应）
   */
  async decryptData(encryptedB64, password) {
    // SHA-256(password) -> key
    const keyData = new TextEncoder().encode(password);
    const keyHash = new Uint8Array(await crypto.subtle.digest('SHA-256', keyData));

    // Base64 -> bytes
    const encrypted = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));

    // 生成密钥流（SHA-256 计数器模式，与 Python 端一致）
    const keystream = await this.generateKeystream(keyHash, encrypted.length);

    // XOR 解密
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
      // SHA-256(key || counter_bytes)
      const counterBuf = new Uint8Array(4);
      new DataView(counterBuf.buffer).setUint32(0, counter, false); // big-endian

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
    // 显示主应用
    const app = document.getElementById('app');
    if (app) app.style.display = '';

    // 触发 app.js 初始化
    window.dispatchEvent(new CustomEvent('auth:ready'));
  },

  /**
   * 会话管理
   */
  getSession() {
    try {
      const s = sessionStorage.getItem(this.SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  },

  saveSession(password) {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
      password: password,
      time: Date.now(),
    }));
  },

  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  /**
   * 登出
   */
  logout() {
    this.clearSession();
    location.reload();
  },

  /**
   * 反复制措施
   */
  setupAntiCopy() {
    // 禁用右键菜单
    document.addEventListener('contextmenu', (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (['input', 'textarea'].includes(tag)) return;
      e.preventDefault();
    });

    // 禁用文字选择（题干和选项区域）
    document.addEventListener('selectstart', (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (['input', 'textarea'].includes(tag)) return;
      e.preventDefault();
    });

    // 禁用常见开发者工具快捷键
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') { e.preventDefault(); return; }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j')) {
        e.preventDefault(); return;
      }
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault(); return;
      }
    });

    // 检测开发者工具打开（通过窗口尺寸变化）
    let devtoolsOpen = false;
    const threshold = 160;
    setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          // 清空页面内容
          document.body.style.filter = 'blur(10px)';
        }
      } else {
        if (devtoolsOpen) {
          devtoolsOpen = false;
          document.body.style.filter = '';
        }
      }
    }, 1000);
  },
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
