/* ════════════════════════════════════════════════════════
   USABO PWA — Application Logic
   ════════════════════════════════════════════════════════ */

'use strict';

// ════════════════════════════════════════════════════════
//  1. 题库数据来自 questions.js（独立文件，方便编辑）
//     TOPICS 和 QUESTIONS 已在该文件中定义为全局变量
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
//  2. 工具函数
// ════════════════════════════════════════════════════════

/**
 * Escape HTML special characters to prevent XSS.
 * Use this whenever inserting dynamic content into innerHTML.
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate that a URL is safe for use in img src.
 * Blocks javascript:, data: (except image/), and other dangerous schemes.
 */
function safeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:')) return '';
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/')) return '';
  return url;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getTopicInfo(key) {
  return TOPICS.find(t => t.key === key) || { en: key, zh: key };
}

function getQuestionsByTopics(topicKeys) {
  return QUESTIONS.filter(q => topicKeys.includes(q.topic));
}

// ════════════════════════════════════════════════════════
//  3. 存储层 (localStorage)
// ════════════════════════════════════════════════════════

const Storage = {
  KEYS: {
    wrong: 'usabo_wrong_answers',
    history: 'usabo_practice_history',
    session: 'usabo_current_session',
    settings: 'usabo_settings',
  },

  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },

  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },

  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },

  // ── 错题本 ──
  getWrong() { return this.get(this.KEYS.wrong, []); },
  saveWrong(arr) { this.set(this.KEYS.wrong, arr); },
  addWrong(question, selected) {
    const wrong = this.getWrong();
    if (!wrong.find(w => w.id === question.id)) {
      wrong.push({
        id: question.id,
        topic: question.topic,
        type: question.type,
        stem: question.stem,
        image: question.image || null,
        options: question.options,
        answer: question.answer,
        explain: question.explain,
        source: question.source,
        yourAnswer: selected,
        addedAt: Date.now(),
      });
      this.saveWrong(wrong);
    }
  },
  removeWrong(id) {
    const wrong = this.getWrong().filter(w => w.id !== id);
    this.saveWrong(wrong);
  },

  // ── 历史记录 ──
  getHistory() { return this.get(this.KEYS.history, []); },
  addHistory(record) {
    const h = this.getHistory();
    h.unshift(record);
    if (h.length > 100) h.length = 100;
    this.set(this.KEYS.history, h);
  },

  // ── 会话进度 ──
  getSession() { return this.get(this.KEYS.session, null); },
  saveSession(s) { this.set(this.KEYS.session, s); },
  clearSession() { this.remove(this.KEYS.session); },
};

// ════════════════════════════════════════════════════════
//  4. 应用状态
// ════════════════════════════════════════════════════════

const State = {
  selectedTopics: [],
  questionCount: 20,
  useTimer: false,

  // 练习中
  practiceQuestions: [],
  currentIndex: 0,
  selectedOptions: [],
  confirmed: false,
  answers: [],          // [{ questionId, selected, correct }]
  timerInterval: null,
  timeLeft: 60,
  startTime: 0,

  // 错题重练
  isWrongRetry: false,
  wrongFilter: 'all',
};

// ════════════════════════════════════════════════════════
//  5. 路由
// ════════════════════════════════════════════════════════

const Router = {
  routes: {
    '': 'view-home',
    '#/': 'view-home',
    '#/practice': 'view-practice',
    '#/result': 'view-result',
    '#/wrong': 'view-wrong',
  },

  navigate(hash) {
    if (location.hash !== hash) {
      location.hash = hash;
    } else {
      this.render(hash);
    }
  },

  render(hash) {
    hash = hash || location.hash || '';
    const viewId = this.routes[hash] || 'view-home';

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');

    window.scrollTo(0, 0);

    // 页面特定初始化
    if (viewId === 'view-home') HomeView.render();
    else if (viewId === 'view-practice') PracticeView.render();
    else if (viewId === 'view-result') ResultView.render();
    else if (viewId === 'view-wrong') WrongView.render();
  },

  init() {
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }
};

// ════════════════════════════════════════════════════════
//  6. 首页视图
// ════════════════════════════════════════════════════════

const HomeView = {
  render() {
    this.renderTopics();
    this.renderStats();
    this.bindEvents();
  },

  renderTopics() {
    const grid = document.getElementById('topic-grid');
    grid.innerHTML = '';

    TOPICS.forEach(topic => {
      const count = QUESTIONS.filter(q => q.topic === topic.key).length;
      const isSelected = State.selectedTopics.includes(topic.key);

      const card = document.createElement('div');
      card.className = 'topic-card' + (isSelected ? ' selected' : '');
      card.dataset.topic = topic.key;
      card.innerHTML = `
        <div class="topic-en">${escapeHtml(topic.en)}</div>
        <div class="topic-zh">${escapeHtml(topic.zh)}</div>
        <div class="topic-count">${escapeHtml(count)} 题</div>
      `;
      card.addEventListener('click', () => this.toggleTopic(topic.key));
      grid.appendChild(card);
    });
  },

  toggleTopic(key) {
    const idx = State.selectedTopics.indexOf(key);
    if (idx > -1) {
      State.selectedTopics.splice(idx, 1);
    } else {
      State.selectedTopics.push(key);
    }
    this.renderTopics();
  },

  renderStats() {
    const history = Storage.getHistory();
    const wrong = Storage.getWrong();

    const totalPracticed = history.reduce((s, h) => s + h.total, 0);
    const totalCorrect = history.reduce((s, h) => s + h.correct, 0);
    const avgAccuracy = totalPracticed > 0
      ? Math.round((totalCorrect / totalPracticed) * 100) : 0;

    document.getElementById('stat-total').textContent = totalPracticed;
    document.getElementById('stat-accuracy').textContent = avgAccuracy + '%';
    document.getElementById('stat-wrong').textContent = wrong.length;
  },

  bindEvents() {
    // 全选
    document.getElementById('btn-select-all').onclick = () => {
      if (State.selectedTopics.length === TOPICS.length) {
        State.selectedTopics = [];
        document.getElementById('btn-select-all').textContent = '全选';
      } else {
        State.selectedTopics = TOPICS.map(t => t.key);
        document.getElementById('btn-select-all').textContent = '取消全选';
      }
      this.renderTopics();
    };

    // 题量
    document.querySelectorAll('.count-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.questionCount = parseInt(btn.dataset.count);
      };
    });

    // 倒计时开关
    document.getElementById('toggle-timer').onchange = (e) => {
      State.useTimer = e.target.checked;
    };

    // 开始练习
    document.getElementById('btn-start').onclick = () => this.startPractice();

    // 错题本
    document.getElementById('btn-wrong-book').onclick = () => {
      Router.navigate('#/wrong');
    };
  },

  startPractice() {
    if (State.selectedTopics.length === 0) {
      this.toast('请至少选择一个板块');
      return;
    }

    const pool = getQuestionsByTopics(State.selectedTopics);
    if (pool.length === 0) {
      this.toast('所选板块暂无题目');
      return;
    }

    // 随机抽题
    const shuffled = shuffle(pool);
    const count = Math.min(State.questionCount, shuffled.length);
    State.practiceQuestions = shuffled.slice(0, count);
    State.currentIndex = 0;
    State.selectedOptions = [];
    State.confirmed = false;
    State.answers = [];
    State.isWrongRetry = false;
    State.startTime = Date.now();

    Router.navigate('#/practice');
  },

  toast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;z-index:9999;pointer-events:none;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }
};

// ════════════════════════════════════════════════════════
//  7. 练习页视图
// ════════════════════════════════════════════════════════

const PracticeView = {
  render() {
    // 恢复会话
    const saved = Storage.getSession();
    if (saved && saved.practiceQuestions && saved.practiceQuestions.length > 0) {
      State.practiceQuestions = saved.practiceQuestions;
      State.currentIndex = saved.currentIndex || 0;
      State.answers = saved.answers || [];
      State.isWrongRetry = saved.isWrongRetry || false;
      State.startTime = saved.startTime || Date.now();
    }

    if (State.practiceQuestions.length === 0) {
      Router.navigate('#/');
      return;
    }

    State.selectedOptions = [];
    State.confirmed = false;
    this.showQuestion();
    this.bindEvents();
  },

  showQuestion() {
    const q = State.practiceQuestions[State.currentIndex];
    if (!q) { this.finishPractice(); return; }

    const topic = getTopicInfo(q.topic);
    const total = State.practiceQuestions.length;
    const idx = State.currentIndex + 1;

    // 进度
    document.getElementById('progress-text').textContent = `第 ${idx}/${total} 题`;
    document.getElementById('progress-fill').style.width = `${(idx / total) * 100}%`;

    // 标签
    document.getElementById('q-topic-tag').textContent = topic.en;
    const typeTag = document.getElementById('q-type-tag');
    typeTag.textContent = q.type === 'multiple' ? '多选' : '单选';
    typeTag.className = 'type-tag ' + (q.type === 'multiple' ? '' : 'single');

    // 题干
    document.getElementById('q-stem').textContent = q.stem;

    // 图片（如果题目有配图）
    const imgWrap = document.getElementById('q-image-wrap');
    const imgEl = document.getElementById('q-image');
    if (q.image) {
      const safe = safeUrl(q.image);
      imgEl.src = safe;
      imgEl.alt = q.stem;
      imgWrap.style.display = 'block';
    } else {
      imgWrap.style.display = 'none';
      imgEl.src = '';
    }

    // 选项
    const optionsList = document.getElementById('q-options');
    optionsList.innerHTML = '';
    q.options.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'option-item';
      item.dataset.key = opt.key;
      item.innerHTML = `
        <div class="option-key">${escapeHtml(opt.key)}</div>
        <div class="option-text">${escapeHtml(opt.text)}</div>
        <div class="option-icon"></div>
      `;
      item.addEventListener('click', () => this.selectOption(opt.key));
      optionsList.appendChild(item);
    });

    // 重置按钮与解析
    document.getElementById('explanation-box').style.display = 'none';
    document.getElementById('btn-confirm').classList.remove('hidden');
    document.getElementById('btn-confirm').disabled = true;
    document.getElementById('btn-next').classList.add('hidden');

    // 倒计时
    if (State.useTimer) {
      this.startTimer();
    } else {
      document.getElementById('timer-display').style.display = 'none';
    }

    // 保存会话
    this.saveSession();
  },

  selectOption(key) {
    if (State.confirmed) return;

    const q = State.practiceQuestions[State.currentIndex];
    if (q.type === 'single') {
      State.selectedOptions = [key];
    } else {
      const idx = State.selectedOptions.indexOf(key);
      if (idx > -1) {
        State.selectedOptions.splice(idx, 1);
      } else {
        State.selectedOptions.push(key);
      }
    }

    // 更新 UI
    document.querySelectorAll('.option-item').forEach(item => {
      if (State.selectedOptions.includes(item.dataset.key)) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });

    document.getElementById('btn-confirm').disabled = State.selectedOptions.length === 0;
  },

  confirmAnswer() {
    if (State.selectedOptions.length === 0) return;

    State.confirmed = true;
    this.stopTimer();

    const q = State.practiceQuestions[State.currentIndex];
    const correctSet = new Set(q.answer);
    const selectedSet = new Set(State.selectedOptions);
    const isCorrect = q.answer.length === selectedSet.size &&
      [...selectedSet].every(k => correctSet.has(k));

    // 锁定选项并高亮
    document.querySelectorAll('.option-item').forEach(item => {
      const key = item.dataset.key;
      item.classList.add('locked');
      item.classList.remove('selected');

      const iconEl = item.querySelector('.option-icon');
      if (correctSet.has(key) && selectedSet.has(key)) {
        item.classList.add('correct');
        iconEl.textContent = '✓';
      } else if (selectedSet.has(key) && !correctSet.has(key)) {
        item.classList.add('wrong');
        iconEl.textContent = '✗';
      } else if (correctSet.has(key) && !selectedSet.has(key)) {
        item.classList.add('missed');
        iconEl.textContent = '✓';
      }
    });

    // 显示解析
    const expBox = document.getElementById('explanation-box');
    expBox.style.display = 'block';
    const header = document.getElementById('exp-header');
    const icon = document.getElementById('exp-icon');
    const title = document.getElementById('exp-title');
    header.className = 'explanation-header ' + (isCorrect ? 'correct-header' : 'wrong-header');
    icon.textContent = isCorrect ? '✓ ' : '✗ ';
    title.textContent = isCorrect ? '回答正确！' : '回答错误';
    document.getElementById('exp-correct').textContent = '正确答案：' + q.answer.join('、');
    document.getElementById('exp-text').textContent = q.explain;
    document.getElementById('exp-source').textContent = q.source || '';

    // 记录答案
    State.answers.push({
      questionId: q.id,
      topic: q.topic,
      stem: q.stem,
      image: q.image || null,
      options: q.options,
      answer: q.answer,
      explain: q.explain,
      source: q.source,
      type: q.type,
      selected: [...State.selectedOptions],
      correct: isCorrect,
    });

    // 错题加入错题本
    if (!isCorrect) {
      Storage.addWrong(q, [...State.selectedOptions]);
    }

    // 切换按钮
    document.getElementById('btn-confirm').classList.add('hidden');
    const nextBtn = document.getElementById('btn-next');
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = State.currentIndex === State.practiceQuestions.length - 1
      ? '查看结果' : '下一题';

    this.saveSession();
  },

  nextQuestion() {
    State.currentIndex++;
    State.selectedOptions = [];
    State.confirmed = false;

    if (State.currentIndex >= State.practiceQuestions.length) {
      this.finishPractice();
    } else {
      this.showQuestion();
    }
  },

  finishPractice() {
    this.stopTimer();
    const correct = State.answers.filter(a => a.correct).length;
    const total = State.answers.length;
    const timeUsed = Math.round((Date.now() - State.startTime) / 1000);

    Storage.addHistory({
      date: Date.now(),
      correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      timeUsed,
      topics: [...new Set(State.practiceQuestions.map(q => q.topic))],
      isWrongRetry: State.isWrongRetry,
    });

    Storage.clearSession();
    Router.navigate('#/result');
  },

  startTimer() {
    State.timeLeft = 60;
    const display = document.getElementById('timer-display');
    display.style.display = 'inline';
    display.textContent = State.timeLeft + 's';

    this.stopTimer();
    State.timerInterval = setInterval(() => {
      State.timeLeft--;
      display.textContent = State.timeLeft + 's';
      if (State.timeLeft <= 10) {
        display.style.color = '#dc2626';
      }
      if (State.timeLeft <= 0) {
        this.stopTimer();
        if (!State.confirmed) {
          this.confirmAnswer();
        }
      }
    }, 1000);
  },

  stopTimer() {
    if (State.timerInterval) {
      clearInterval(State.timerInterval);
      State.timerInterval = null;
    }
    const display = document.getElementById('timer-display');
    if (display) display.style.color = '';
  },

  saveSession() {
    Storage.saveSession({
      practiceQuestions: State.practiceQuestions,
      currentIndex: State.currentIndex,
      answers: State.answers,
      isWrongRetry: State.isWrongRetry,
      startTime: State.startTime,
    });
  },

  bindEvents() {
    document.getElementById('btn-confirm').onclick = () => this.confirmAnswer();
    document.getElementById('btn-next').onclick = () => this.nextQuestion();

    document.getElementById('practice-back').onclick = () => {
      if (confirm('退出练习？当前进度已保存，下次进入可继续。')) {
        this.stopTimer();
        Router.navigate('#/');
      }
    };
  },
};

// ════════════════════════════════════════════════════════
//  8. 结果页视图
// ════════════════════════════════════════════════════════

const ResultView = {
  render() {
    const answers = State.answers;
    if (answers.length === 0) {
      Router.navigate('#/');
      return;
    }

    const correct = answers.filter(a => a.correct).length;
    const total = answers.length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    // 圆环动画
    const ring = document.getElementById('ring-fill');
    const circumference = 2 * Math.PI * 85;
    const offset = circumference * (1 - percent / 100);
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference;
    setTimeout(() => {
      ring.style.strokeDashoffset = offset;
    }, 100);

    document.getElementById('result-percent').textContent = percent + '%';
    document.getElementById('result-score').textContent = `${correct}/${total}`;

    // 评语
    let comment;
    if (percent >= 90) comment = '🏆 出色！你已具备 USABO 冲奖实力！';
    else if (percent >= 75) comment = '👏 优秀！继续保持，冲击半决赛！';
    else if (percent >= 60) comment = '💪 不错的成绩，错题再练一定会更好！';
    else if (percent >= 40) comment = '📚 继续加油，多刷错题是关键！';
    else comment = '🦾 别灰心，反复练习就是进步的开始！';
    document.getElementById('result-comment').textContent = comment;

    // 汇总
    document.getElementById('summary-correct').textContent = `${correct} 题正确`;
    document.getElementById('summary-wrong').textContent = `${total - correct} 题错误`;

    // 时间
    const timeUsed = Math.round((Date.now() - State.startTime) / 1000);
    const min = Math.floor(timeUsed / 60);
    const sec = timeUsed % 60;
    document.getElementById('summary-time').textContent = `用时 ${min}分${sec}秒`;
    document.getElementById('summary-time-wrap').style.display = 'flex';

    // 回顾列表
    this.renderReview(answers);
    this.bindEvents();
  },

  renderReview(answers) {
    const list = document.getElementById('review-list');
    list.innerHTML = '';

    answers.forEach((a, i) => {
      const topic = getTopicInfo(a.topic);
      const item = document.createElement('div');
      item.className = 'review-item ' + (a.correct ? 'correct-item' : 'wrong-item');
      item.innerHTML = `
        <div class="review-header">
          <span class="review-status ${a.correct ? 'correct' : 'wrong'}">${a.correct ? '✓' : '✗'}</span>
          <span class="review-topic">${escapeHtml(topic.en)}</span>
        </div>
        <div class="review-stem">${escapeHtml(i + 1)}. ${escapeHtml(a.stem)}</div>
        ${a.image ? `<img class="review-img" src="${escapeHtml(a.image)}" alt="${escapeHtml(a.stem)}" loading="lazy">` : ''}
        <div class="review-answers">
          <span class="your-answer ${a.correct ? '' : 'wrong'}">你的答案：${escapeHtml(a.selected.join('、')) || '未作答'}</span>
          <span class="right-answer">正确答案：${escapeHtml(a.answer.join('、'))}</span>
        </div>
        <div class="review-explain">${escapeHtml(a.explain)}</div>
        <button class="review-toggle">查看解析</button>
      `;
      item.querySelector('.review-toggle').onclick = () => {
        item.classList.toggle('expanded');
        item.querySelector('.review-toggle').textContent =
          item.classList.contains('expanded') ? '收起解析' : '查看解析';
      };
      list.appendChild(item);
    });
  },

  bindEvents() {
    document.getElementById('btn-back-home').onclick = () => Router.navigate('#/');

    document.getElementById('btn-retry-wrong').onclick = () => {
      const wrongAnswers = State.answers.filter(a => !a.correct);
      if (wrongAnswers.length === 0) {
        HomeView.toast('本次没有错题，无需重练！');
        return;
      }
      // 从错题中构建练习
      State.practiceQuestions = wrongAnswers.map(a => ({
        id: a.questionId,
        topic: a.topic,
        type: a.type,
        stem: a.stem,
        image: a.image || null,
        options: a.options,
        answer: a.answer,
        explain: a.explain,
        source: a.source,
      }));
      State.currentIndex = 0;
      State.selectedOptions = [];
      State.confirmed = false;
      State.answers = [];
      State.isWrongRetry = true;
      State.startTime = Date.now();
      Router.navigate('#/practice');
    };
  },
};

// ════════════════════════════════════════════════════════
//  9. 错题本视图
// ════════════════════════════════════════════════════════

const WrongView = {
  render() {
    this.renderFilterBar();
    this.renderList();
    this.bindEvents();
  },

  renderFilterBar() {
    const bar = document.getElementById('wrong-filter-bar');
    const wrong = Storage.getWrong();
    const topicsInWrong = [...new Set(wrong.map(w => w.topic))];

    bar.innerHTML = `<button class="filter-chip ${State.wrongFilter === 'all' ? 'active' : ''}" data-filter="all">全部 (${wrong.length})</button>`;

    TOPICS.filter(t => topicsInWrong.includes(t.key)).forEach(t => {
      const count = wrong.filter(w => w.topic === t.key).length;
      const chip = document.createElement('button');
      chip.className = 'filter-chip' + (State.wrongFilter === t.key ? ' active' : '');
      chip.dataset.filter = t.key;
      chip.textContent = `${t.en} (${count})`;
      bar.appendChild(chip);
    });
  },

  renderList() {
    const wrong = Storage.getWrong();
    const filtered = State.wrongFilter === 'all'
      ? wrong : wrong.filter(w => w.topic === State.wrongFilter);

    const list = document.getElementById('wrong-list');
    const empty = document.getElementById('wrong-empty');
    const actions = document.getElementById('wrong-actions');

    if (filtered.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      actions.style.display = 'none';
      return;
    }

    empty.classList.add('hidden');
    actions.style.display = 'flex';

    list.innerHTML = '';
    filtered.forEach((w, i) => {
      const topic = getTopicInfo(w.topic);
      const card = document.createElement('div');
      card.className = 'wrong-card';
      card.innerHTML = `
        <div class="wrong-card-header">
          <div class="wrong-card-tags">
            <span class="topic-tag">${escapeHtml(topic.en)}</span>
            <span class="type-tag ${w.type === 'multiple' ? '' : 'single'}">${w.type === 'multiple' ? '多选' : '单选'}</span>
          </div>
          <span class="wrong-card-meta">${escapeHtml(new Date(w.addedAt).toLocaleDateString('zh-CN'))}</span>
        </div>
        <div class="wrong-stem">${escapeHtml(i + 1)}. ${escapeHtml(w.stem)}</div>
        ${w.image ? `<img class="wrong-img" src="${escapeHtml(w.image)}" alt="${escapeHtml(w.stem)}" loading="lazy">` : ''}
        <div class="wrong-answers">
          <span class="your-answer">你的答案：${escapeHtml((w.yourAnswer || []).join('、')) || '未作答'}</span>
          <span class="right-answer">正确答案：${escapeHtml(w.answer.join('、'))}</span>
        </div>
        <div class="wrong-explain">${escapeHtml(w.explain)}</div>
        <div class="wrong-card-actions">
          <button class="btn-mini danger" data-action="remove" data-id="${escapeHtml(w.id)}">已掌握，移除</button>
        </div>
      `;

      // 点击题干展开/收起
      card.querySelector('.wrong-stem').onclick = () => {
        card.classList.toggle('expanded');
      };

      // 移除按钮
      card.querySelector('[data-action="remove"]').onclick = (e) => {
        e.stopPropagation();
        Storage.removeWrong(w.id);
        this.renderFilterBar();
        this.renderList();
      };

      list.appendChild(card);
    });
  },

  bindEvents() {
    document.getElementById('wrong-back').onclick = () => Router.navigate('#/');

    document.getElementById('wrong-filter-bar').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      State.wrongFilter = chip.dataset.filter;
      this.renderFilterBar();
      this.renderList();
    });

    document.getElementById('btn-practice-wrong').onclick = () => {
      const wrong = Storage.getWrong();
      const filtered = State.wrongFilter === 'all'
        ? wrong : wrong.filter(w => w.topic === State.wrongFilter);

      if (filtered.length === 0) {
        HomeView.toast('没有可练习的错题');
        return;
      }

      State.practiceQuestions = filtered.map(w => ({
        id: w.id,
        topic: w.topic,
        type: w.type,
        stem: w.stem,
        image: w.image || null,
        options: w.options,
        answer: w.answer,
        explain: w.explain,
        source: w.source,
      }));
      State.currentIndex = 0;
      State.selectedOptions = [];
      State.confirmed = false;
      State.answers = [];
      State.isWrongRetry = true;
      State.startTime = Date.now();
      Router.navigate('#/practice');
    };
  },
};

// ════════════════════════════════════════════════════════
//  10. PWA 安装
// ════════════════════════════════════════════════════════

const PWA = {
  deferredPrompt: null,

  init() {
    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('SW registration failed:', err);
      });
    }

    // 监听安装提示
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBanner();
    });

    // 安装按钮
    const installBtn = document.getElementById('btn-install');
    if (installBtn) {
      installBtn.onclick = () => this.promptInstall();
    }

    const dismissBtn = document.getElementById('btn-dismiss');
    if (dismissBtn) {
      dismissBtn.onclick = () => this.hideInstallBanner();
    }

    // 已安装
    window.addEventListener('appinstalled', () => {
      this.hideInstallBanner();
    });
  },

  showInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('hidden');
  },

  hideInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
  },

  async promptInstall() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.hideInstallBanner();
  },
};

// ════════════════════════════════════════════════════════
//  11. 初始化 — 等待认证完成后启动
// ════════════════════════════════════════════════════════

window.addEventListener('auth:ready', () => {
  PWA.init();
  Router.init();

  // 退出登录按钮
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm('确定退出登录？')) {
        Auth.logout();
      }
    };
  }
});
