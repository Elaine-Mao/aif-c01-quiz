/* AIF-C01 刷题 - mobile study app
 * Based on ercsion/aws-ai-practitioner-app, customized for AIF-C01 only.
 * Pure vanilla JS, no build step, works fully offline as PWA.
 */
(function () {
  "use strict";

  var ALL_QUESTIONS = window.QUESTIONS || [];
  var STORAGE_KEY = "aif_app_state_v2";
  var QUESTIONS = ALL_QUESTIONS;
  var TOTAL = QUESTIONS.length;

  var FONT_SCALES = [0.85, 1, 1.15, 1.3, 1.45];
  var FONT_LABELS = ["小", "标准", "大", "较大", "特大"];
  var DEFAULT_FONT_INDEX = 1;

  // ---------- Topic categories ----------
  var TOPICS = [
    { name: "Bedrock 基础模型平台", icon: "🏗️", re: /Bedrock|基础模型|foundation model|FM[^S]|模型市场|model garden|playgrounds/i, excludeRe: /Agent|Guardrails|护栏|Knowledge Base|知识库/i },
    { name: "Guardrails + RAG知识库", icon: "🛡️", re: /Guardrails|护栏|RAG|知识库|Knowledge Base|检索增强|向量数据库|embedding.*search/i },
    { name: "Bedrock Agents 代理", icon: "🤖", re: /Bedrock.*Agent|Agent.*Bedrock|代理.*Bedrock|Bedrock.*代理/i },
    { name: "SageMaker Clarify", icon: "🔍", re: /Clarify|SageMaker.*偏差|SageMaker.*bias|SageMaker.*explain|SHAP/i },
    { name: "SageMaker 推理部署", icon: "🚀", re: /SageMaker.*(endpoint|推理|inference|部署|deploy|实时|real.?time|serverless|provisioned)/i },
    { name: "SageMaker 综合", icon: "🧪", re: /SageMaker|Ground Truth|Feature Store|Model Monitor|SageMaker Studio|Canvas|Autopilot|JumpStart/i, excludeRe: /Clarify|SHAP|endpoint|推理部署/i },
    { name: "AI应用服务", icon: "🎯", re: /Rekognition|Textract|Comprehend|Translate|Polly|Transcribe|Lex|Kendra|Personalize|Forecast|A2I|Augmented AI|CodeWhisperer|CodeGuru|DevOps Guru|HealthLake|Titan/i },
    { name: "安全合规", icon: "🔒", re: /IAM|KMS|加密|encrypt|CloudTrail|CloudWatch|Macie|VPC|安全|security|compliance|合规|审计|audit|权限|permission|S3.*policy/i },
    { name: "微调 vs RAG vs Prompt", icon: "⚖️", re: /微调|fine.?tun|RAG|检索增强|prompt engineer|提示工程|少样本|few.?shot|零样本|zero.?shot|思维链|chain of thought/i, excludeRe: /Guardrails|护栏|Knowledge Base|知识库/i },
    { name: "Prompt工程 + LLM参数", icon: "🎛️", re: /temperature|温度|top.?k|top.?p|token|max.*length|stop.*sequence|推理参数|inference param|prompt.*template|提示词/i },
    { name: "模型评估指标", icon: "📏", re: /准确率|accuracy|精确率|precision|召回率|recall|F1|AUC|ROC|RMSE|R²|MAE|BLEU|ROUGE|BERTScore|perplexity|困惑度|混淆矩阵|confusion matrix/i },
    { name: "偏差·公平·负责任AI", icon: "⚖️", re: /偏差|bias|公平|fairness|responsible|负责任|伦理|ethic|歧视|discriminat|有害|toxic|幻觉|hallucin|透明|transparen|可解释|explainab|可审计/i, excludeRe: /Clarify|SHAP/i },
    { name: "ML基础·算法·数据处理", icon: "📐", re: /监督学习|无监督|强化学习|supervised|unsupervised|reinforcement|回归|regression|分类.*算法|classification|聚类|cluster|神经网络|neural|CNN|RNN|LSTM|transformer|过拟合|overfit|欠拟合|underfit|正则化|regulariz|交叉验证|cross.*valid|特征工程|feature.*engineer|数据清洗|data.*clean|标准化|normaliz|降维|dimension.*reduc|PCA|训练集|测试集|验证集|train.*set|test.*set/i }
  ];

  // Classify all questions into topics
  var topicQuestionIds = [];
  var assignedIds = {};
  function classifyQuestions() {
    topicQuestionIds = TOPICS.map(function () { return []; });
    topicQuestionIds.push([]); // "其他综合题"
    assignedIds = {};
    QUESTIONS.forEach(function (q) {
      var text = (q.stem.zh || "") + " ";
      if (q.options && q.options.zh) {
        q.options.zh.forEach(function (o) { text += (o.text || "") + " "; });
      }
      text += (q.explanation.zh || "");
      var matched = false;
      for (var i = 0; i < TOPICS.length; i++) {
        var t = TOPICS[i];
        if (t.re.test(text)) {
          if (t.excludeRe && t.excludeRe.test(text)) continue;
          topicQuestionIds[i].push(q.id);
          assignedIds[q.id] = true;
          matched = true;
          break;
        }
      }
      if (!matched) {
        topicQuestionIds[TOPICS.length].push(q.id);
      }
    });
  }
  classifyQuestions();

  // ---------- Persistent state ----------
  var state = loadState();

  function loadState() {
    var defaults = {
      fontIndex: DEFAULT_FONT_INDEX,
      wrongIds: [],
      progress: {},
      studyProgress: null,
      quizSeqCursor: 1,
      seqProgress: { index: 0 },
      topicProgress: {}
    };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      var parsed = JSON.parse(raw);
      return Object.assign(defaults, parsed);
    } catch (e) {
      return defaults;
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function markWrong(id) {
    if (state.wrongIds.indexOf(id) === -1) state.wrongIds.push(id);
    state.progress[id] = { attempted: true, correct: false };
    saveState();
  }
  function markCorrect(id) {
    var idx = state.wrongIds.indexOf(id);
    if (idx !== -1) state.wrongIds.splice(idx, 1);
    state.progress[id] = { attempted: true, correct: true };
    saveState();
  }
  function removeFromWrongBook(id) {
    var idx = state.wrongIds.indexOf(id);
    if (idx !== -1) state.wrongIds.splice(idx, 1);
    saveState();
  }
  function isInWrongBook(id) {
    return state.wrongIds.indexOf(id) !== -1;
  }
  function toggleWrongBook(id) {
    var idx = state.wrongIds.indexOf(id);
    if (idx !== -1) { state.wrongIds.splice(idx, 1); saveState(); return false; }
    state.wrongIds.push(id); saveState(); return true;
  }
  function saveStudyProgress(ids, index) {
    state.studyProgress = { ids: ids, index: index };
    saveState();
  }
  function tryResumeStudy() {
    var sp = state.studyProgress;
    if (!sp || !Array.isArray(sp.ids) || sp.ids.length === 0) return null;
    var validIds = sp.ids.filter(function (id) { return !!questionById(id); });
    if (validIds.length === 0) return null;
    var idx = Math.min(sp.index || 0, validIds.length - 1);
    return { ids: validIds, index: idx };
  }

  // ---------- DOM refs ----------
  var elApp = document.getElementById("app");
  var elTopTitle = document.getElementById("top-title");
  var elBtnBack = document.getElementById("btn-back");
  var elBtnFontSize = document.getElementById("btn-font-size");
  var elBottomNav = document.getElementById("bottom-nav");
  var elOverlayRoot = document.getElementById("overlay-root");

  // ---------- Font size control ----------
  function applyFontScale() {
    var idx = clampFontIndex(state.fontIndex);
    document.documentElement.style.setProperty("--font-scale", String(FONT_SCALES[idx]));
  }
  function clampFontIndex(idx) { return Math.min(Math.max(idx, 0), FONT_SCALES.length - 1); }
  function setFontIndex(idx) {
    state.fontIndex = clampFontIndex(idx);
    saveState();
    applyFontScale();
    renderFontSizePanel();
  }
  function openFontSizePanel() {
    if (elOverlayRoot.querySelector(".font-size-panel")) return;
    var backdrop = document.createElement("div");
    backdrop.className = "overlay-backdrop";
    backdrop.addEventListener("click", closeFontSizePanel);
    var panel = document.createElement("div");
    panel.className = "font-size-panel";
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    elOverlayRoot.appendChild(backdrop);
    elOverlayRoot.appendChild(panel);
    renderFontSizePanel();
  }
  function closeFontSizePanel() {
    elOverlayRoot.innerHTML = "";
  }
  function renderFontSizePanel() {
    var panel = elOverlayRoot.querySelector(".font-size-panel");
    if (!panel) return;
    var idx = clampFontIndex(state.fontIndex);
    var html = '<div class="fsp-title">字体大小</div>';
    html += '<div class="fsp-row">';
    FONT_LABELS.forEach(function (label, i) {
      html += '<button class="fsp-btn' + (i === idx ? " active" : "") + '" data-idx="' + i + '">' + label + "</button>";
    });
    html += '</div>';
    html += '<div class="fsp-preview" style="font-size:' + (15 * FONT_SCALES[idx]) + 'px">预览文字 Preview</div>';
    panel.innerHTML = html;
    panel.querySelectorAll(".fsp-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { setFontIndex(parseInt(btn.dataset.idx, 10)); });
    });
  }

  elBtnFontSize.addEventListener("click", openFontSizePanel);

  // ---------- Jump panel ----------
  function openJumpPanel(onJump) {
    if (elOverlayRoot.querySelector(".jump-panel")) return;
    var backdrop = document.createElement("div");
    backdrop.className = "overlay-backdrop";
    backdrop.addEventListener("click", closeJumpPanel);
    var panel = document.createElement("div");
    panel.className = "font-size-panel jump-panel";
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    panel.innerHTML = '<div class="fsp-title">跳转到题号</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<input type="number" id="jump-input" class="num-input" min="1" max="' + TOTAL + '" style="flex:1" placeholder="输入题号" />' +
      '<button class="btn-primary" id="btn-do-jump" style="width:auto;padding:10px 18px;margin:0">跳转</button></div>';
    elOverlayRoot.appendChild(backdrop);
    elOverlayRoot.appendChild(panel);
    var jumpInput = panel.querySelector("#jump-input");
    jumpInput.focus();
    panel.querySelector("#btn-do-jump").addEventListener("click", function () {
      var num = parseInt(jumpInput.value, 10);
      if (!num || num < 1 || num > TOTAL) { toast("请输入 1-" + TOTAL + " 之间的题号"); return; }
      closeJumpPanel();
      if (onJump) onJump(num);
    });
    jumpInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") panel.querySelector("#btn-do-jump").click();
    });
  }
  function closeJumpPanel() { elOverlayRoot.innerHTML = ""; }

  // ---------- Navigation ----------
  var viewStack = [];
  function navigate(view, opts) { viewStack.push({ view: view, opts: opts || {} }); render(); }
  function replaceView(view, opts) { viewStack[viewStack.length - 1] = { view: view, opts: opts || {} }; render(); }
  function goBack() { if (viewStack.length > 1) viewStack.pop(); render(); }
  function goHome() { viewStack = [{ view: "home", opts: {} }]; render(); }

  // ---------- Utilities ----------
  function escapeHtml(s) {
    if (!s) return "";
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function shuffle(arr) {
    arr = arr.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () { el.classList.remove("show"); setTimeout(function () { el.remove(); }, 300); }, 1800);
  }
  function questionById(id) {
    return QUESTIONS.find(function (q) { return q.id === id; });
  }
  function displayQNum(q) { return (q && q.num != null) ? q.num : q.id; }

  // ---------- Question type helpers ----------
  function isMatchingType(q) { return q.qtype === "matching"; }
  function isOrderingType(q) { return q.qtype === "ordering"; }
  function isChoiceType(q) { return !q.qtype || q.qtype === "single" || q.qtype === "multiple"; }
  function matchingAnswerChoices(q) {
    var seen = {};
    var arr = [];
    q.pairs.forEach(function (p) {
      var key = p.answer.zh;
      if (!seen[key]) { seen[key] = true; arr.push({ zh: key }); }
    });
    return shuffle(arr);
  }
  function arraysEqualInOrder(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; }
    return true;
  }
  function arraysEqualAsSets(a, b) {
    if (a.length !== b.length) return false;
    var sa = a.slice().sort();
    var sb = b.slice().sort();
    return arraysEqualInOrder(sa, sb);
  }
  function isAnswerCorrect(q, userAnswer) {
    if (isMatchingType(q)) {
      var correctOrder = q.pairs.map(function (p) { return p.answer.zh; });
      return arraysEqualInOrder(userAnswer || [], correctOrder);
    }
    if (isOrderingType(q)) {
      var correctOrder2 = q.items.map(function (it) { return it.zh; });
      return arraysEqualInOrder(userAnswer || [], correctOrder2);
    }
    return arraysEqualAsSets(userAnswer || [], q.correct.split(""));
  }
  function questionTypeBadge(q) {
    if (isMatchingType(q)) return '<span class="q-multi-badge">匹配题</span>';
    if (isOrderingType(q)) return '<span class="q-multi-badge">排序题</span>';
    if (q.correct && q.correct.length > 1) return '<span class="q-multi-badge">多选</span>';
    return "";
  }
  function isAnswerComplete(q, userAnswer) {
    if (isMatchingType(q)) {
      return userAnswer && userAnswer.length === q.pairs.length && userAnswer.every(function (a) { return a !== null; });
    }
    if (isOrderingType(q)) {
      return userAnswer && userAnswer.length === q.items.length;
    }
    return userAnswer && userAnswer.length > 0;
  }
  function allSubmitted(qs) {
    return qs.every(function (s) { return s.submitted; });
  }

  // ---------- Answer rendering (study mode - reveal all) ----------
  function renderAnswerReveal(q) {
    if (isMatchingType(q)) {
      var html = '<div class="match-list">';
      q.pairs.forEach(function (p) {
        html += '<div class="match-row">' +
          '<div class="match-statement">' + escapeHtml(p.statement.zh) + '</div>' +
          '<div class="match-arrow">&#8594;</div>' +
          '<div class="match-answer correct">' + escapeHtml(p.answer.zh) + '</div></div>';
      });
      return html + '</div>';
    }
    if (isOrderingType(q)) {
      var html2 = '<div class="order-list">';
      q.items.forEach(function (it, i) {
        html2 += '<div class="order-row correct"><div class="order-num">' + (i+1) + '</div>' +
          '<div class="order-text">' + escapeHtml(it.zh) + '</div></div>';
      });
      return html2 + '</div>';
    }
    var html3 = '<div class="opt-list">';
    q.options.zh.forEach(function (opt) {
      var isCorrect = q.correct.indexOf(opt.label) !== -1;
      html3 += '<div class="opt-item' + (isCorrect ? " correct" : "") + '">' +
        '<div class="opt-mark">' + opt.label + '</div>' +
        '<div class="opt-text">' + escapeHtml(opt.text) + '</div></div>';
    });
    return html3 + '</div>';
  }

  // ---------- Interactive answer areas (quiz mode) ----------
  function renderChoiceAnswerArea(q, userAnswer, isSubmitted) {
    var sel = userAnswer || [];
    var isMulti = q.correct.length > 1;
    var html = '<div class="opt-list">';
    q.options.zh.forEach(function (opt) {
      var picked = sel.indexOf(opt.label) !== -1;
      var classes = ["opt-item"];
      if (!isSubmitted) { if (picked) classes.push("selected"); }
      else {
        var isCorrectOpt = q.correct.indexOf(opt.label) !== -1;
        if (isCorrectOpt) classes.push("correct");
        else if (picked) classes.push("incorrect");
      }
      html += '<button class="' + classes.join(" ") + '" data-label="' + opt.label + '"' + (isSubmitted ? " disabled" : "") + '>' +
        '<div class="opt-mark">' + opt.label + '</div>' +
        '<div class="opt-text">' + escapeHtml(opt.text) + '</div></button>';
    });
    return html + '</div>';
  }

  function bindChoiceEvents(container, q, getAnswer, setAnswer) {
    var isMulti = q.correct.length > 1;
    container.querySelectorAll(".opt-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var label = btn.dataset.label;
        var cur = getAnswer() || [];
        if (isMulti) {
          var idx = cur.indexOf(label);
          if (idx !== -1) cur.splice(idx, 1); else cur.push(label);
        } else { cur = [label]; }
        setAnswer(cur);
      });
    });
  }

  function renderMatchingAnswerArea(q, userAnswer, isSubmitted) {
    var choices = matchingAnswerChoices(q);
    var sel = userAnswer || q.pairs.map(function () { return null; });
    var html = '<div class="match-list">';
    q.pairs.forEach(function (p, i) {
      var picked = sel[i];
      html += '<div class="match-qrow"><div class="match-statement">' + escapeHtml(p.statement.zh) + '</div>';
      html += '<div class="match-choice-list">';
      choices.forEach(function (choice) {
        var isPicked = picked === choice.zh;
        var classes = ["match-choice"];
        if (!isSubmitted) { if (isPicked) classes.push("selected"); }
        else {
          var isCorrectChoice = choice.zh === p.answer.zh;
          if (isCorrectChoice) classes.push("correct");
          else if (isPicked) classes.push("incorrect");
        }
        html += '<button class="' + classes.join(" ") + '"' + (isSubmitted ? " disabled" : "") +
          ' data-row="' + i + '" data-choice="' + escapeHtml(choice.zh) + '">' + escapeHtml(choice.zh) + '</button>';
      });
      html += '</div>';
      if (isSubmitted && picked !== p.answer.zh) {
        html += '<div class="match-correct-hint">正确答案: ' + escapeHtml(p.answer.zh) + '</div>';
      }
      html += '</div>';
    });
    return html + '</div>';
  }

  function bindMatchingEvents(container, q, getAnswer, setAnswer) {
    container.querySelectorAll(".match-choice").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = parseInt(btn.dataset.row, 10);
        var choice = btn.dataset.choice;
        var cur = getAnswer() || q.pairs.map(function () { return null; });
        cur[row] = (cur[row] === choice) ? null : choice;
        setAnswer(cur);
      });
    });
  }

  function renderOrderingAnswerArea(q, userAnswer, isSubmitted) {
    var correctOrder = q.items.map(function (it) { return it.zh; });
    var placed = userAnswer || [];
    var bankItems = correctOrder.filter(function (it) { return placed.indexOf(it) === -1; });
    bankItems = shuffle(bankItems);
    var html = '<div class="order-progress-list">';
    if (placed.length === 0) {
      html += '<div class="order-placeholder">点击下方选项，按正确顺序添加</div>';
    }
    placed.forEach(function (it, i) {
      var classes = ["order-row", "selected"];
      if (isSubmitted) { classes.push(it === correctOrder[i] ? "correct" : "incorrect"); }
      html += '<div class="' + classes.join(" ") + '" data-placed="' + i + '">' +
        '<div class="order-num">' + (i+1) + '</div>' +
        '<div class="order-text">' + escapeHtml(it) + '</div>' +
        (!isSubmitted ? '<div class="order-remove">&#10005;</div>' : '') + '</div>';
    });
    html += '</div>';
    if (isSubmitted) {
      html += '<div class="order-correct-hint"><div class="explain-title">正确顺序</div>';
      correctOrder.forEach(function (it, i) {
        html += '<div class="order-row correct"><div class="order-num">' + (i+1) + '</div><div class="order-text">' + escapeHtml(it) + '</div></div>';
      });
      html += '</div>';
    }
    if (!isSubmitted && bankItems.length > 0) {
      html += '<div class="order-bank">';
      bankItems.forEach(function (it) {
        html += '<button class="order-bank-item" data-item="' + escapeHtml(it) + '">' + escapeHtml(it) + '</button>';
      });
      html += '</div>';
    }
    return html;
  }

  function bindOrderingEvents(container, q, getAnswer, setAnswer) {
    container.querySelectorAll(".order-bank-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cur = getAnswer() || [];
        cur.push(btn.dataset.item);
        setAnswer(cur);
      });
    });
    container.querySelectorAll(".order-remove").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.parentElement.dataset.placed, 10);
        var cur = getAnswer() || [];
        cur.splice(idx, 1);
        setAnswer(cur);
      });
    });
  }

  // ---------- Views ----------
  var VIEW_TITLES = {
    home: "AIF-C01 刷题",
    "study-setup": "背题模式",
    study: "背题模式",
    "seq-study": "按顺序刷题",
    "topic-list": "按知识点刷题",
    "topic-study": "知识点刷题",
    "quiz-setup": "测试模式",
    quiz: "测试模式",
    "quiz-result": "测试结果",
    wrongbook: "错题本",
    "wrongbook-review": "错题回顾"
  };

  function render() {
    var top = viewStack[viewStack.length - 1];
    elTopTitle.textContent = VIEW_TITLES[top.view] || "AIF-C01 刷题";
    elBtnBack.hidden = viewStack.length <= 1;
    // Update bottom nav active state
    var navMap = { home:"home", "study-setup":"home", study:"home", "seq-study":"home",
      "topic-list":"topic", "topic-study":"topic", "seq-study":"home",
      "quiz-setup":"quiz", quiz:"quiz",
      "quiz-result":"quiz", wrongbook:"wrongbook", "wrongbook-review":"wrongbook" };
    var activeNav = navMap[top.view] || "home";
    elBottomNav.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.view === activeNav);
    });

    switch (top.view) {
      case "home": renderHome(); break;
      case "study-setup": renderStudySetup(); break;
      case "study": renderStudy(top.opts); break;
      case "seq-study": renderSeqStudy(top.opts); break;
      case "topic-list": renderTopicList(); break;
      case "topic-study": renderTopicStudy(top.opts); break;
      case "quiz-setup": renderQuizSetup(); break;
      case "quiz": renderQuiz(top.opts); break;
      case "quiz-result": renderQuizResult(top.opts); break;
      case "wrongbook": renderWrongbook(); break;
      case "wrongbook-review": renderWrongbookReview(top.opts); break;
      default: renderHome();
    }
  }

  // ---- Home ----
  function renderHome() {
    var attemptedIds = Object.keys(state.progress);
    var correctCount = attemptedIds.filter(function (id) { return state.progress[id].correct; }).length;
    var wrongCount = state.wrongIds.length;
    var seqIdx = state.seqProgress ? state.seqProgress.index : 0;
    var seqPct = Math.round(seqIdx / TOTAL * 100);

    var html = "";
    html += '<div class="home-hero"><h2>AWS AI Practitioner (AIF-C01)</h2>' +
      '<p>共 ' + TOTAL + ' 题 · 支持多种刷题模式</p></div>';

    html += '<div class="stat-row">' +
      statBox(TOTAL, "题库总数") +
      statBox(attemptedIds.length, "已作答") +
      statBox(correctCount, "答对") +
      '</div>';

    // Sequential progress banner
    html += '<div class="section-title">刷题进度</div>';
    html += '<div class="seq-banner" data-action="go-seq">' +
      '<div class="seq-icon">📋</div>' +
      '<div class="seq-body"><div class="seq-title">按顺序刷题</div>' +
      '<div class="seq-desc">Q1→Q' + TOTAL + ' · 已到第 ' + (seqIdx + 1) + ' 题 (' + seqPct + '%)</div>' +
      '<div class="seq-progress-bar"><div class="seq-progress-fill" style="width:' + seqPct + '%"></div></div>' +
      '</div></div>';

    html += '<div class="section-title">学习模式</div>';
    html += actionCard("orange", "&#127991;&#65039;", "按知识点刷题", "13 个分类，针对性练习", "go-topic");
    html += actionCard("navy", "&#9998;", "测试模式", "互动答题，即时反馈", "go-quiz");
    html += actionCard("red", "&#9888;", "错题本", wrongCount + " 道错题待复习", "go-wrongbook");

    html += '<div class="section-title">学习资料</div>';
    html += actionCard("orange", "&#128214;", "备考指南", "44个AWS工具 + 核心概念速查", "go-guide");
    html += actionCard("orange", "&#128161;", "实战备考", "真题解析 + 解题套路 + 考前速记", "go-practice");

    html += '<div class="section-title">数据管理</div>';
    html += actionCard("navy", "&#128190;", "导出进度", "保存错题本和答题记录到文件", "go-export");
    html += actionCard("navy", "&#128229;", "导入进度", "从文件恢复学习进度（跨设备同步）", "go-import");

    elApp.innerHTML = html;

    elApp.querySelector('[data-action="go-seq"]').addEventListener("click", function () {
      navigate("seq-study", { index: seqIdx });
    });
    elApp.querySelector('[data-action="go-topic"]').addEventListener("click", function () {
      navigate("topic-list");
    });
    elApp.querySelector('[data-action="go-quiz"]').addEventListener("click", function () {
      navigate("quiz-setup");
    });
    elApp.querySelector('[data-action="go-wrongbook"]').addEventListener("click", function () {
      navigate("wrongbook");
    });
    elApp.querySelector('[data-action="go-guide"]').addEventListener("click", function () {
      window.open("guide.html", "_self");
    });
    elApp.querySelector('[data-action="go-practice"]').addEventListener("click", function () {
      window.open("practice.html", "_self");
    });
    elApp.querySelector('[data-action="go-export"]').addEventListener("click", exportProgress);
    elApp.querySelector('[data-action="go-import"]').addEventListener("click", importProgress);
  }

  function statBox(num, label) {
    return '<div class="stat-box"><div class="num">' + num + '</div><div class="lbl">' + escapeHtml(label) + '</div></div>';
  }
  function actionCard(color, icon, title, desc, action) {
    return '<div class="action-card" data-action="' + action + '">' +
      '<div class="ic ' + color + '">' + icon + '</div>' +
      '<div class="body"><div class="title">' + escapeHtml(title) + '</div>' +
      '<div class="desc">' + escapeHtml(desc) + '</div></div>' +
      '<div class="chev">&#8250;</div></div>';
  }

  // ---- Sequential study (Q1→Q504) ----
  function renderSeqStudy(opts) {
    var index = opts.index || 0;
    if (index >= TOTAL) index = TOTAL - 1;
    var q = QUESTIONS[index];
    state.seqProgress = { index: index };
    saveState();

    // Per-question state: track userAnswer and submitted
    if (!opts._qs) opts._qs = {};
    if (!opts._qs[q.id]) opts._qs[q.id] = { userAnswer: null, submitted: false };
    var qs = opts._qs[q.id];

    var pct = Math.round((index + 1) / TOTAL * 100);
    var inWrongBook = isInWrongBook(q.id);
    var html = "";
    html += '<div class="q-progress"><button class="q-progress-jump" id="btn-jump-progress">第 ' + (index + 1) + ' / ' + TOTAL + ' 题 (' + pct + '%) &#9998;</button>' +
      '<span>Q' + displayQNum(q) + '</span></div>';

    html += '<div class="q-card">';
    html += '<span class="q-num-badge">Q' + displayQNum(q) + '</span>';
    html += questionTypeBadge(q);
    html += '<div class="q-stem">' + escapeHtml(q.stem.zh) + '</div>';

    // Interactive answer area
    var answerHtml = "";
    if (isMatchingType(q)) {
      answerHtml = renderMatchingAnswerArea(q, qs.userAnswer, qs.submitted);
    } else if (isOrderingType(q)) {
      answerHtml = renderOrderingAnswerArea(q, qs.userAnswer, qs.submitted);
    } else {
      answerHtml = renderChoiceAnswerArea(q, qs.userAnswer, qs.submitted);
    }
    html += '<div id="answer-area">' + answerHtml + '</div>';

    if (qs.submitted) {
      html += '<div class="explain-box"><div class="explain-title">解析</div>';
      html += '<div class="explain-text">' + escapeHtml(q.explanation.zh || "（无）") + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // Submit button (before answer)
    if (!qs.submitted) {
      html += '<button class="btn-primary" id="btn-submit"' +
        (!isAnswerComplete(q, qs.userAnswer) ? " disabled" : "") + '>提交答案</button>';
    } else {
      html += '<button class="btn-secondary mark-wrong-btn' + (inWrongBook ? " active" : "") + '" id="btn-toggle-wrong">' +
        (inWrongBook ? "&#10003; 已加入错题本" : "&#9888; 标记为错题") + '</button>';
    }

    html += '<div class="nav-row">' +
      '<button class="btn-secondary" id="btn-prev" ' + (index === 0 ? "disabled" : "") + '>&#8592; 上一题</button>' +
      '<button class="btn-primary" id="btn-next" ' + (index >= TOTAL - 1 ? "disabled" : "") + '>下一题 &#8594;</button></div>';

    elApp.innerHTML = html;

    // Bind answer interactions
    function getAnswer() { return qs.userAnswer; }
    function setAnswer(ans) {
      qs.userAnswer = ans;
      rerenderArea();
    }
    function rerenderArea() {
      var area = elApp.querySelector("#answer-area");
      if (isMatchingType(q)) {
        area.innerHTML = renderMatchingAnswerArea(q, qs.userAnswer, qs.submitted);
        bindMatchingEvents(area, q, getAnswer, setAnswer);
      } else if (isOrderingType(q)) {
        area.innerHTML = renderOrderingAnswerArea(q, qs.userAnswer, qs.submitted);
        bindOrderingEvents(area, q, getAnswer, setAnswer);
      } else {
        area.innerHTML = renderChoiceAnswerArea(q, qs.userAnswer, qs.submitted);
        bindChoiceEvents(area, q, getAnswer, setAnswer);
      }
      var submitBtn = elApp.querySelector("#btn-submit");
      if (submitBtn) submitBtn.disabled = !isAnswerComplete(q, qs.userAnswer);
    }

    // Initial bind
    var area = elApp.querySelector("#answer-area");
    if (isMatchingType(q)) bindMatchingEvents(area, q, getAnswer, setAnswer);
    else if (isOrderingType(q)) bindOrderingEvents(area, q, getAnswer, setAnswer);
    else bindChoiceEvents(area, q, getAnswer, setAnswer);

    // Submit
    var submitBtn = elApp.querySelector("#btn-submit");
    if (submitBtn) submitBtn.addEventListener("click", function () {
      qs.submitted = true;
      var correct = isAnswerCorrect(q, qs.userAnswer);
      if (correct) markCorrect(q.id); else markWrong(q.id);
      replaceView("seq-study", opts);
    });

    // Toggle wrong book
    var wrongBtn = elApp.querySelector("#btn-toggle-wrong");
    if (wrongBtn) wrongBtn.addEventListener("click", function () {
      var added = toggleWrongBook(q.id);
      toast(added ? "已加入错题本" : "已从错题本移除");
      replaceView("seq-study", opts);
    });

    elApp.querySelector("#btn-prev").addEventListener("click", function () {
      if (index > 0) { opts.index = index - 1; replaceView("seq-study", opts); }
    });
    elApp.querySelector("#btn-next").addEventListener("click", function () {
      if (index < TOTAL - 1) { opts.index = index + 1; replaceView("seq-study", opts); }
    });
    elApp.querySelector("#btn-jump-progress").addEventListener("click", function () {
      openJumpPanel(function (num) {
        var newIndex = num - 1;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= TOTAL) newIndex = TOTAL - 1;
        opts.index = newIndex;
        replaceView("seq-study", opts);
      });
    });
  }
  // ---- Topic list ----
  function renderTopicList() {
    var html = '<div class="section-title">选择知识点</div><div class="topic-list">';
    var allTopicNames = TOPICS.map(function (t) { return t.name; });
    allTopicNames.push("其他综合题");
    var allTopicIcons = TOPICS.map(function (t) { return t.icon; });
    allTopicIcons.push("📦");

    for (var i = 0; i < allTopicNames.length; i++) {
      var ids = topicQuestionIds[i];
      var count = ids.length;
      var tpKey = "tp_" + i;
      var tpProgress = state.topicProgress[tpKey] || 0;
      var pct = count > 0 ? Math.round(tpProgress / count * 100) : 0;
      // Calculate accuracy for this topic
      var attempted = 0, correct = 0;
      ids.forEach(function (id) {
        var p = state.progress[id];
        if (p && p.attempted) { attempted++; if (p.correct) correct++; }
      });
      var accPct = attempted > 0 ? Math.round(correct / attempted * 100) : 0;
      var accText = attempted > 0 ? " · 正确率 " + accPct + "%" : "";
      html += '<div class="topic-card" data-topic="' + i + '">' +
        '<div class="topic-icon">' + allTopicIcons[i] + '</div>' +
        '<div class="topic-body">' +
        '<div class="topic-name">' + escapeHtml(allTopicNames[i]) + '</div>' +
        '<div class="topic-count">' + count + ' 题 · 已答 ' + attempted + '/' + count + accText + '</div>' +
        '<div class="topic-progress-bar"><div class="topic-progress-fill' + (pct >= 100 ? " done" : "") + '" style="width:' + Math.min(pct, 100) + '%"></div></div>' +
        '</div><div class="chev">&#8250;</div></div>';
    }
    html += '</div>';
    html += '<button class="btn-secondary" id="btn-reset-topic" style="margin-top:16px;color:var(--red)">重置所有知识点进度</button>';

    elApp.innerHTML = html;

    elApp.querySelectorAll(".topic-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var ti = parseInt(card.dataset.topic, 10);
        var ids = topicQuestionIds[ti];
        if (ids.length === 0) { toast("该分类暂无题目"); return; }
        var tpKey = "tp_" + ti;
        var startIdx = Math.min(state.topicProgress[tpKey] || 0, ids.length - 1);
        navigate("topic-study", { topicIndex: ti, ids: ids, index: startIdx });
      });
    });

    elApp.querySelector("#btn-reset-topic").addEventListener("click", function () {
      if (confirm("确定要重置所有知识点进度吗？")) {
        state.topicProgress = {};
        saveState();
        renderTopicList();
        toast("已重置所有进度");
      }
    });
  }

  // ---- Topic study (study mode within a topic) ----
  function renderTopicStudy(opts) {
    var ti = opts.topicIndex;
    var ids = opts.ids;
    var index = opts.index || 0;
    if (index >= ids.length) index = ids.length - 1;
    var q = questionById(ids[index]);

    // Save progress
    var tpKey = "tp_" + ti;
    state.topicProgress[tpKey] = Math.max(state.topicProgress[tpKey] || 0, index + 1);
    saveState();

    // Per-question state
    if (!opts._qs) opts._qs = {};
    if (!opts._qs[q.id]) opts._qs[q.id] = { userAnswer: null, submitted: false };
    var qs = opts._qs[q.id];

    var allTopicNames = TOPICS.map(function (t) { return t.name; });
    allTopicNames.push("其他综合题");
    var topicName = allTopicNames[ti];
    var inWrongBook = isInWrongBook(q.id);

    var html = "";
    // Calculate real-time accuracy for this topic
    var tAttempted = 0, tCorrect = 0;
    ids.forEach(function (tid) {
      var p = state.progress[tid];
      if (p && p.attempted) { tAttempted++; if (p.correct) tCorrect++; }
    });
    var tAccPct = tAttempted > 0 ? Math.round(tCorrect / tAttempted * 100) : 0;
    var tAccText = tAttempted > 0 ? " · 正确率 " + tAccPct + "%" : "";
    html += '<div class="q-progress"><span>' + escapeHtml(topicName) + ' · 第 ' + (index + 1) + ' / ' + ids.length + ' 题' + tAccText + '</span>' +
      '<span>Q' + displayQNum(q) + '</span></div>';

    html += '<div class="q-card">';
    html += '<span class="q-num-badge">Q' + displayQNum(q) + '</span>';
    html += questionTypeBadge(q);
    html += '<div class="q-stem">' + escapeHtml(q.stem.zh) + '</div>';

    // Interactive answer area
    var answerHtml = "";
    if (isMatchingType(q)) {
      answerHtml = renderMatchingAnswerArea(q, qs.userAnswer, qs.submitted);
    } else if (isOrderingType(q)) {
      answerHtml = renderOrderingAnswerArea(q, qs.userAnswer, qs.submitted);
    } else {
      answerHtml = renderChoiceAnswerArea(q, qs.userAnswer, qs.submitted);
    }
    html += '<div id="answer-area">' + answerHtml + '</div>';

    if (qs.submitted) {
      html += '<div class="explain-box"><div class="explain-title">解析</div>';
      html += '<div class="explain-text">' + escapeHtml(q.explanation.zh || "（无）") + '</div>';
      html += '</div>';
    }
    html += '</div>';

    if (!qs.submitted) {
      html += '<button class="btn-primary" id="btn-submit"' +
        (!isAnswerComplete(q, qs.userAnswer) ? " disabled" : "") + '>提交答案</button>';
    } else {
      html += '<button class="btn-secondary mark-wrong-btn' + (inWrongBook ? " active" : "") + '" id="btn-toggle-wrong">' +
        (inWrongBook ? "&#10003; 已加入错题本" : "&#9888; 标记为错题") + '</button>';
    }

    html += '<div class="nav-row">' +
      '<button class="btn-secondary" id="btn-prev" ' + (index === 0 ? "disabled" : "") + '>&#8592; 上一题</button>' +
      '<button class="btn-primary" id="btn-next" ' + (index >= ids.length - 1 ? "disabled" : "") + '>下一题 &#8594;</button></div>';

    html += '<button class="btn-secondary" id="btn-back-topic">返回知识点列表</button>';

    elApp.innerHTML = html;

    // Bind answer interactions
    function getAnswer() { return qs.userAnswer; }
    function setAnswer(ans) {
      qs.userAnswer = ans;
      rerenderArea();
    }
    function rerenderArea() {
      var area = elApp.querySelector("#answer-area");
      if (isMatchingType(q)) {
        area.innerHTML = renderMatchingAnswerArea(q, qs.userAnswer, qs.submitted);
        bindMatchingEvents(area, q, getAnswer, setAnswer);
      } else if (isOrderingType(q)) {
        area.innerHTML = renderOrderingAnswerArea(q, qs.userAnswer, qs.submitted);
        bindOrderingEvents(area, q, getAnswer, setAnswer);
      } else {
        area.innerHTML = renderChoiceAnswerArea(q, qs.userAnswer, qs.submitted);
        bindChoiceEvents(area, q, getAnswer, setAnswer);
      }
      var submitBtn = elApp.querySelector("#btn-submit");
      if (submitBtn) submitBtn.disabled = !isAnswerComplete(q, qs.userAnswer);
    }

    // Initial bind
    var area = elApp.querySelector("#answer-area");
    if (isMatchingType(q)) bindMatchingEvents(area, q, getAnswer, setAnswer);
    else if (isOrderingType(q)) bindOrderingEvents(area, q, getAnswer, setAnswer);
    else bindChoiceEvents(area, q, getAnswer, setAnswer);

    // Submit
    var submitBtn = elApp.querySelector("#btn-submit");
    if (submitBtn) submitBtn.addEventListener("click", function () {
      qs.submitted = true;
      var correct = isAnswerCorrect(q, qs.userAnswer);
      if (correct) markCorrect(q.id); else markWrong(q.id);
      replaceView("topic-study", opts);
    });

    var wrongBtn = elApp.querySelector("#btn-toggle-wrong");
    if (wrongBtn) wrongBtn.addEventListener("click", function () {
      var added = toggleWrongBook(q.id);
      toast(added ? "已加入错题本" : "已从错题本移除");
      replaceView("topic-study", opts);
    });

    elApp.querySelector("#btn-prev").addEventListener("click", function () {
      if (index > 0) { opts.index = index - 1; replaceView("topic-study", opts); }
    });
    elApp.querySelector("#btn-next").addEventListener("click", function () {
      if (index < ids.length - 1) { opts.index = index + 1; replaceView("topic-study", opts); }
    });
    elApp.querySelector("#btn-back-topic").addEventListener("click", function () {
      goBack();
    });
  }
  // ---- Study setup ----
  function renderStudySetup() {
    var resume = tryResumeStudy();
    var html = "";
    if (resume) {
      var resumeQ = questionById(resume.ids[resume.index]);
      html += '<div class="section-title">继续上次学习</div>';
      html += '<div class="setup-group">' +
        setupRow("上次进度", "第 " + (resume.index + 1) + " / " + resume.ids.length + " 题 · Q" + displayQNum(resumeQ), "") +
        '</div>';
      html += '<button class="btn-primary" id="btn-resume-study">继续背题</button>';
    }
    html += '<div class="section-title">重新开始</div>';
    html += '<div class="setup-group">' +
      setupRow("从第几题开始", "题号范围 1-" + TOTAL, '<input type="number" id="study-start" class="num-input" min="1" max="' + TOTAL + '" value="1" />') +
      setupRow("顺序", "", chipGroup("study-order", [["seq", "顺序"], ["random", "随机"]], "seq")) +
      '</div>';
    html += '<button class="' + (resume ? "btn-secondary" : "btn-primary") + '" id="btn-start-study">开始背题</button>';

    elApp.innerHTML = html;
    bindChipGroups(elApp);

    if (resume) {
      elApp.querySelector("#btn-resume-study").addEventListener("click", function () {
        replaceView("study", { ids: resume.ids, index: resume.index });
      });
    }
    elApp.querySelector("#btn-start-study").addEventListener("click", function () {
      var startNum = parseInt(elApp.querySelector("#study-start").value, 10) || 1;
      startNum = Math.min(Math.max(startNum, 1), TOTAL);
      var order = getChipValue(elApp, "study-order");
      var ids = QUESTIONS.map(function (q) { return q.id; });
      if (order === "random") { ids = shuffle(ids); }
      else {
        var startId = startNum;
        ids = ids.filter(function (id) { return id >= startId; }).concat(ids.filter(function (id) { return id < startId; }));
      }
      replaceView("study", { ids: ids, index: 0 });
    });
  }

  function setupRow(label, sub, rightHtml) {
    return '<div class="setup-row"><div><div class="lbl">' + escapeHtml(label) + '</div>' +
      (sub ? '<div class="sub">' + escapeHtml(sub) + '</div>' : '') +
      '</div>' + rightHtml + '</div>';
  }
  function chipGroup(name, options, defaultVal) {
    var html = '<div class="chip-group" data-chip-group="' + name + '">';
    options.forEach(function (o) {
      html += '<button class="chip' + (o[0] === defaultVal ? " active" : "") + '" data-value="' + o[0] + '">' + o[1] + '</button>';
    });
    return html + '</div>';
  }
  function bindChipGroups(container) {
    container.querySelectorAll(".chip-group").forEach(function (group) {
      group.addEventListener("click", function (e) {
        var chip = e.target.closest(".chip");
        if (!chip) return;
        group.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
      });
    });
  }
  function getChipValue(container, name) {
    var group = container.querySelector('[data-chip-group="' + name + '"]');
    if (!group) return null;
    var active = group.querySelector(".chip.active");
    return active ? active.dataset.value : null;
  }

  // ---- Study (background study mode) ----
  function renderStudy(opts) {
    var ids = opts.ids;
    var index = opts.index;
    var q = questionById(ids[index]);
    saveStudyProgress(ids, index);
    var inWrongBook = isInWrongBook(q.id);

    var html = "";
    html += '<div class="q-progress"><button class="q-progress-jump" id="btn-jump-progress">第 ' + (index + 1) + ' / ' + ids.length + ' 题 &#9998;</button>' +
      '<span>Q' + displayQNum(q) + '</span></div>';

    html += '<div class="q-card">';
    html += '<span class="q-num-badge">Q' + displayQNum(q) + '</span>';
    html += questionTypeBadge(q);
    html += '<div class="q-stem">' + escapeHtml(q.stem.zh) + '</div>';
    html += renderAnswerReveal(q);
    html += '<div class="explain-box"><div class="explain-title">解析</div>';
    html += '<div class="explain-text">' + escapeHtml(q.explanation.zh || "（无）") + '</div>';
    html += '</div></div>';

    html += '<button class="btn-secondary mark-wrong-btn' + (inWrongBook ? " active" : "") + '" id="btn-toggle-wrong">' +
      (inWrongBook ? "&#10003; 已加入错题本" : "&#9888; 标记为错题") + '</button>';

    html += '<div class="nav-row">' +
      '<button class="btn-secondary" id="btn-prev" ' + (index === 0 ? "disabled" : "") + '>&#8592; 上一题</button>' +
      '<button class="btn-primary" id="btn-next" ' + (index === ids.length - 1 ? "disabled" : "") + '>下一题 &#8594;</button></div>';

    html += '<button class="btn-secondary" id="btn-restart-study">重新设置背题范围</button>';

    elApp.innerHTML = html;
    elApp.querySelector("#btn-prev").addEventListener("click", function () {
      if (index > 0) replaceView("study", { ids: ids, index: index - 1 });
    });
    elApp.querySelector("#btn-next").addEventListener("click", function () {
      if (index < ids.length - 1) replaceView("study", { ids: ids, index: index + 1 });
    });
    elApp.querySelector("#btn-restart-study").addEventListener("click", function () { navigate("study-setup"); });
    elApp.querySelector("#btn-jump-progress").addEventListener("click", function () {
      openJumpPanel(function (num) {
        var newIndex = ids.indexOf(num);
        if (newIndex === -1) { toast("当前列表中没有第 " + num + " 题"); return; }
        replaceView("study", { ids: ids, index: newIndex });
      });
    });
    elApp.querySelector("#btn-toggle-wrong").addEventListener("click", function () {
      var added = toggleWrongBook(q.id);
      toast(added ? "已加入错题本" : "已从错题本移除");
      replaceView("study", { ids: ids, index: index });
    });
  }

  // ---- Quiz setup ----
  function renderQuizSetup() {
    var resumeNum = state.quizSeqCursor || 1;
    var html = "";

    // 真题模拟考试 banner (like v4)
    html += '<div class="section-title">模拟考试</div>';
    html += '<div class="action-card" data-action="go-mock">' +
      '<div class="ic navy" style="font-size:16px">📝</div>' +
      '<div class="body"><div class="title" style="font-weight:700">真题模拟考试</div>' +
      '<div class="desc">随机65题模拟真实考试 · 58单选+5多选+2其他 · 及格线70%</div></div>' +
      '<div class="chev">&#8250;</div></div>';

    html += '<div class="section-title">自定义测试</div>';
    html += '<div class="setup-group">' +
      setupRow("题目范围", "", chipGroup("quiz-scope", [["all", "全部题库"], ["custom", "自定义数量"]], "all")) +
      setupRow("题目数量", "范围: 5-" + TOTAL, '<input type="number" id="quiz-count" class="num-input" min="5" max="' + TOTAL + '" value="20" />') +
      setupRow("题目顺序", "", chipGroup("quiz-order", [["random", "随机"], ["seq", "顺序"]], "random")) +
      '<div class="setup-row" id="quiz-seq-start-row"><div><div class="lbl">顺序起始题号</div>' +
      '<div class="sub">顺序模式将从此题号接续开始</div></div>' +
      '<input type="number" id="quiz-seq-start" class="num-input" min="1" max="' + TOTAL + '" value="' + resumeNum + '" /></div>' +
      '</div>';
    html += '<button class="btn-primary" id="btn-start-quiz">开始自定义测试</button>';

    elApp.innerHTML = html;
    bindChipGroups(elApp);

    var countInput = elApp.querySelector("#quiz-count");
    var scopeGroup = elApp.querySelector('[data-chip-group="quiz-scope"]');
    scopeGroup.addEventListener("click", function () {
      countInput.disabled = getChipValue(elApp, "quiz-scope") === "all";
    });
    countInput.disabled = true;

    var seqStartRow = elApp.querySelector("#quiz-seq-start-row");
    var orderGroup = elApp.querySelector('[data-chip-group="quiz-order"]');
    orderGroup.addEventListener("click", function () {
      seqStartRow.style.display = getChipValue(elApp, "quiz-order") === "seq" ? "" : "none";
    });
    seqStartRow.style.display = "none";

    // Mock exam button
    elApp.querySelector('[data-action="go-mock"]').addEventListener("click", function () {
      // Pick 58 single + 5 multiple + 2 other (matching/ordering/hotspot)
      var singles = shuffle(QUESTIONS.filter(function (q) { return isChoiceType(q) && q.correct.length <= 1; })).slice(0, 58);
      var multis = shuffle(QUESTIONS.filter(function (q) { return isChoiceType(q) && q.correct.length > 1; })).slice(0, 5);
      var others = shuffle(QUESTIONS.filter(function (q) { return isMatchingType(q) || isOrderingType(q); })).slice(0, 2);
      var mockIds = shuffle(singles.concat(multis).concat(others)).map(function (q) { return q.id; });
      var quizState = mockIds.map(function (id) { return { id: id, userAnswer: null, submitted: false }; });
      navigate("quiz", { quizState: quizState, index: 0, isMock: true });
    });

    // Custom quiz button
    elApp.querySelector("#btn-start-quiz").addEventListener("click", function () {
      var scope = getChipValue(elApp, "quiz-scope");
      var order = getChipValue(elApp, "quiz-order");
      var ids = QUESTIONS.map(function (q) { return q.id; });
      var isSeq = order === "seq";

      if (isSeq) {
        var startNum = parseInt(elApp.querySelector("#quiz-seq-start").value, 10) || 1;
        startNum = Math.min(Math.max(startNum, 1), TOTAL);
        ids = ids.filter(function (id) { return id >= startNum; }).concat(ids.filter(function (id) { return id < startNum; }));
      } else {
        ids = shuffle(ids);
      }

      var count = TOTAL;
      if (scope === "custom") {
        count = parseInt(countInput.value, 10) || 20;
        count = Math.min(Math.max(count, 5), TOTAL);
      }
      ids = ids.slice(0, count);

      var quizState = ids.map(function (id) {
        return { id: id, userAnswer: null, submitted: false };
      });

      if (isSeq && ids.length > 0) {
        var lastId = ids[ids.length - 1];
        state.quizSeqCursor = Math.min(lastId + 1, TOTAL);
        saveState();
      }

      navigate("quiz", { quizState: quizState, index: 0 });
    });
  }
  // ---- Quiz ----
  function renderQuiz(opts) {
    var quizState = opts.quizState;
    var index = opts.index;
    var qs = quizState[index];
    var q = questionById(qs.id);
    var total = quizState.length;

    // Calculate real-time stats
    var submittedCount = 0, correctCount = 0;
    quizState.forEach(function (s) {
      if (s.submitted) {
        submittedCount++;
        var sq = questionById(s.id);
        if (isAnswerCorrect(sq, s.userAnswer)) correctCount++;
      }
    });
    var pct = submittedCount > 0 ? Math.round(correctCount / submittedCount * 100) : 0;
    var progressPct = Math.round(submittedCount / total * 100);

    var html = "";
    // Progress bar with accuracy (like v4)
    html += '<div class="quiz-progress-bar">';
    html += '<div class="quiz-progress-info"><span>第 ' + (index + 1) + '/' + total + ' 题</span><span>正确率 ' + pct + '%</span></div>';
    html += '<div class="quiz-bar-track"><div class="quiz-bar-fill" style="width:' + progressPct + '%"></div></div>';
    html += '</div>';

    html += '<div class="q-card">';
    html += '<span class="q-num-badge">Q' + displayQNum(q) + '</span>';
    html += questionTypeBadge(q);
    html += '<div class="q-stem">' + escapeHtml(q.stem.zh) + '</div>';

    // Interactive answer area
    var answerHtml = "";
    if (isMatchingType(q)) {
      answerHtml = renderMatchingAnswerArea(q, qs.userAnswer, qs.submitted);
    } else if (isOrderingType(q)) {
      answerHtml = renderOrderingAnswerArea(q, qs.userAnswer, qs.submitted);
    } else {
      answerHtml = renderChoiceAnswerArea(q, qs.userAnswer, qs.submitted);
    }
    html += '<div id="answer-area">' + answerHtml + '</div>';

    if (qs.submitted) {
      html += '<div class="explain-box"><div class="explain-title">解析</div>';
      html += '<div class="explain-text">' + escapeHtml(q.explanation.zh || "（无）") + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // Submit / nav buttons
    if (!qs.submitted) {
      html += '<button class="btn-primary" id="btn-submit"' +
        (!isAnswerComplete(q, qs.userAnswer) ? " disabled" : "") + '>提交答案</button>';
    }

    html += '<div class="nav-row">' +
      '<button class="btn-secondary" id="btn-prev" ' + (index === 0 ? "disabled" : "") + '>&#8592; 上一题</button>';
    if (index === total - 1 && allSubmitted(quizState)) {
      html += '<button class="btn-primary" id="btn-finish">查看结果 &#8594;</button>';
    } else {
      html += '<button class="btn-primary" id="btn-next" ' + (index === total - 1 ? "disabled" : "") + '>下一题 &#8594;</button>';
    }
    html += '</div>';

    elApp.innerHTML = html;

    // Bind answer interactions
    function getAnswer() { return qs.userAnswer; }
    function setAnswer(ans) {
      qs.userAnswer = ans;
      rerender();
    }
    function rerender() {
      var area = elApp.querySelector("#answer-area");
      if (isMatchingType(q)) {
        area.innerHTML = renderMatchingAnswerArea(q, qs.userAnswer, qs.submitted);
        bindMatchingEvents(area, q, getAnswer, setAnswer);
      } else if (isOrderingType(q)) {
        area.innerHTML = renderOrderingAnswerArea(q, qs.userAnswer, qs.submitted);
        bindOrderingEvents(area, q, getAnswer, setAnswer);
      } else {
        area.innerHTML = renderChoiceAnswerArea(q, qs.userAnswer, qs.submitted);
        bindChoiceEvents(area, q, getAnswer, setAnswer);
      }
      var submitBtn = elApp.querySelector("#btn-submit");
      if (submitBtn) submitBtn.disabled = !isAnswerComplete(q, qs.userAnswer);
    }

    // Initial bind
    var area = elApp.querySelector("#answer-area");
    if (isMatchingType(q)) bindMatchingEvents(area, q, getAnswer, setAnswer);
    else if (isOrderingType(q)) bindOrderingEvents(area, q, getAnswer, setAnswer);
    else bindChoiceEvents(area, q, getAnswer, setAnswer);

    // Submit
    var submitBtn = elApp.querySelector("#btn-submit");
    if (submitBtn) submitBtn.addEventListener("click", function () {
      qs.submitted = true;
      var correct = isAnswerCorrect(q, qs.userAnswer);
      if (correct) markCorrect(q.id); else markWrong(q.id);
      replaceView("quiz", { quizState: quizState, index: index, isMock: opts.isMock });
    });

    // Nav
    elApp.querySelector("#btn-prev").addEventListener("click", function () {
      if (index > 0) replaceView("quiz", { quizState: quizState, index: index - 1, isMock: opts.isMock });
    });
    var nextBtn = elApp.querySelector("#btn-next");
    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (index < total - 1) replaceView("quiz", { quizState: quizState, index: index + 1, isMock: opts.isMock });
    });
    var finishBtn = elApp.querySelector("#btn-finish");
    if (finishBtn) finishBtn.addEventListener("click", function () {
      replaceView("quiz-result", { quizState: quizState, isMock: opts.isMock });
    });

    // Jump
    elApp.querySelector(".quiz-progress-bar").addEventListener("click", function () {
      openJumpPanel(function (num) {
        var newIndex = -1;
        for (var i = 0; i < quizState.length; i++) {
          if (quizState[i].id === num) { newIndex = i; break; }
        }
        if (newIndex === -1) { toast("当前测试中没有 Q" + num); return; }
        replaceView("quiz", { quizState: quizState, index: newIndex, isMock: opts.isMock });
      });
    });
  }
  // ---- Quiz result ----
  function renderQuizResult(opts) {
    var quizState = opts.quizState;
    var total = quizState.length;
    var correctCount = 0;
    quizState.forEach(function (qs) {
      var q = questionById(qs.id);
      if (isAnswerCorrect(q, qs.userAnswer)) correctCount++;
    });
    var pct = Math.round(correctCount / total * 100);
    var passed = pct >= 70;

    var html = '<div class="q-card" style="text-align:center">';
    html += '<div style="font-size:calc(48px * var(--font-scale));margin:16px 0">' + (passed ? "🎉" : "💪") + '</div>';
    html += '<div style="font-size:calc(24px * var(--font-scale));font-weight:700">' + pct + '%</div>';
    html += '<div style="color:var(--text-muted);margin:4px 0 16px">' + correctCount + ' / ' + total + ' 题正确' +
      (passed ? ' · 通过！' : ' · 及格线 70%') + '</div>';
    html += '</div>';

    // Question list with status
    html += '<div class="section-title">题目详情</div>';
    quizState.forEach(function (qs, i) {
      var q = questionById(qs.id);
      var correct = isAnswerCorrect(q, qs.userAnswer);
      html += '<div class="action-card quiz-result-item" data-idx="' + i + '">' +
        '<div class="ic ' + (correct ? "green" : "red") + '" style="width:32px;height:32px;font-size:14px;border-radius:8px;background:' +
        (correct ? 'var(--green)' : 'var(--red)') + '">' + (correct ? '✓' : '✗') + '</div>' +
        '<div class="body"><div class="title">Q' + displayQNum(q) + '</div>' +
        '<div class="desc">' + escapeHtml(q.stem.zh.substring(0, 40)) + '...</div></div>' +
        '<div class="chev">&#8250;</div></div>';
    });

    html += '<button class="btn-primary" id="btn-back-home" style="margin-top:16px">返回首页</button>';
    html += '<button class="btn-secondary" id="btn-retry">重新测试</button>';

    elApp.innerHTML = html;

    elApp.querySelectorAll(".quiz-result-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var idx = parseInt(item.dataset.idx, 10);
        navigate("quiz", { quizState: quizState, index: idx });
      });
    });
    elApp.querySelector("#btn-back-home").addEventListener("click", goHome);
    elApp.querySelector("#btn-retry").addEventListener("click", function () {
      replaceView("quiz-setup");
    });
  }

  // ---- Wrong book ----
  function renderWrongbook() {
    var wrongIds = state.wrongIds.slice();
    var html = "";
    if (wrongIds.length === 0) {
      html += '<div class="q-card" style="text-align:center;padding:32px">' +
        '<div style="font-size:48px;margin-bottom:12px">🎉</div>' +
        '<div style="font-size:calc(16px * var(--font-scale));font-weight:600">错题本为空</div>' +
        '<div style="color:var(--text-muted);margin-top:4px">继续刷题，错题会自动收录</div></div>';
    } else {
      html += '<div class="section-title">' + wrongIds.length + ' 道错题</div>';
      wrongIds.forEach(function (id) {
        var q = questionById(id);
        if (!q) return;
        html += '<div class="action-card wrong-item" data-id="' + id + '">' +
          '<div class="ic red" style="width:32px;height:32px;font-size:14px;border-radius:8px">Q' + displayQNum(q) + '</div>' +
          '<div class="body"><div class="desc">' + escapeHtml(q.stem.zh.substring(0, 50)) + '...</div></div>' +
          '<div class="chev">&#8250;</div></div>';
      });

      html += '<button class="btn-primary" id="btn-review-all" style="margin-top:12px">逐题复习</button>';
      html += '<button class="btn-secondary" id="btn-test-wrong">错题测试</button>';
      html += '<button class="btn-secondary btn-danger-outline" id="btn-clear-wrong">清空错题本</button>';
    }

    elApp.innerHTML = html;

    elApp.querySelectorAll(".wrong-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var id = parseInt(item.dataset.id, 10);
        var idx = wrongIds.indexOf(id);
        navigate("wrongbook-review", { ids: wrongIds, index: idx >= 0 ? idx : 0 });
      });
    });

    var reviewBtn = elApp.querySelector("#btn-review-all");
    if (reviewBtn) reviewBtn.addEventListener("click", function () {
      navigate("wrongbook-review", { ids: wrongIds, index: 0 });
    });
    var testBtn = elApp.querySelector("#btn-test-wrong");
    if (testBtn) testBtn.addEventListener("click", function () {
      // Start a quiz with wrong book questions
      var ids = shuffle(wrongIds);
      var quizState = ids.map(function (id) {
        return { id: id, userAnswer: null, submitted: false };
      });
      navigate("quiz", { quizState: quizState, index: 0 });
    });
    var clearBtn = elApp.querySelector("#btn-clear-wrong");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      if (confirm("确定要清空错题本吗？")) {
        state.wrongIds = [];
        saveState();
        renderWrongbook();
        toast("已清空错题本");
      }
    });
  }

  // ---- Wrong book review ----
  function renderWrongbookReview(opts) {
    var ids = opts.ids;
    var index = opts.index;
    if (ids.length === 0) { replaceView("wrongbook"); return; }
    index = Math.min(index, ids.length - 1);
    var q = questionById(ids[index]);

    var html = "";
    html += '<div class="q-progress"><span>第 ' + (index + 1) + ' / ' + ids.length + ' 题</span>' +
      '<span>Q' + displayQNum(q) + '</span></div>';

    html += '<div class="q-card">';
    html += '<span class="q-num-badge">Q' + displayQNum(q) + '</span>';
    html += questionTypeBadge(q);
    html += '<div class="q-stem">' + escapeHtml(q.stem.zh) + '</div>';
    html += renderAnswerReveal(q);
    html += '<div class="explain-box"><div class="explain-title">解析</div>';
    html += '<div class="explain-text">' + escapeHtml(q.explanation.zh || "（无）") + '</div>';
    html += '</div></div>';

    html += '<button class="btn-secondary btn-danger-outline" id="btn-remove-wrong">从错题本移除</button>';

    html += '<div class="nav-row">' +
      '<button class="btn-secondary" id="btn-prev" ' + (index === 0 ? "disabled" : "") + '>&#8592; 上一题</button>' +
      '<button class="btn-primary" id="btn-next" ' + (index === ids.length - 1 ? "disabled" : "") + '>下一题 &#8594;</button></div>';

    elApp.innerHTML = html;

    elApp.querySelector("#btn-remove-wrong").addEventListener("click", function () {
      removeFromWrongBook(q.id);
      var newIds = ids.filter(function (id) { return id !== q.id; });
      toast("已从错题本移除");
      if (newIds.length === 0) { replaceView("wrongbook"); return; }
      var newIndex = Math.min(index, newIds.length - 1);
      replaceView("wrongbook-review", { ids: newIds, index: newIndex });
    });
    elApp.querySelector("#btn-prev").addEventListener("click", function () {
      if (index > 0) replaceView("wrongbook-review", { ids: ids, index: index - 1 });
    });
    elApp.querySelector("#btn-next").addEventListener("click", function () {
      if (index < ids.length - 1) replaceView("wrongbook-review", { ids: ids, index: index + 1 });
    });
  }

  // ---------- Event bindings ----------
  elBtnBack.addEventListener("click", goBack);

  elBottomNav.querySelectorAll(".nav-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var view = btn.dataset.view;
      if (view === "home") goHome();
      else if (view === "topic") {
        viewStack = [{ view: "home", opts: {} }]; navigate("topic-list");
      }
      else if (view === "quiz") { viewStack = [{ view: "home", opts: {} }]; navigate("quiz-setup"); }
      else if (view === "wrongbook") { viewStack = [{ view: "home", opts: {} }]; navigate("wrongbook"); }
    });
  });

  // Swipe support for mobile
  var touchStartX = 0;
  var touchStartY = 0;
  elApp.addEventListener("touchstart", function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  elApp.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // Left swipe = next, Right swipe = prev
      var top = viewStack[viewStack.length - 1];
      if (top.view === "seq-study" || top.view === "study" || top.view === "topic-study" || top.view === "wrongbook-review") {
        if (dx < 0) {
          var nextBtn = elApp.querySelector("#btn-next");
          if (nextBtn && !nextBtn.disabled) nextBtn.click();
        } else {
          var prevBtn = elApp.querySelector("#btn-prev");
          if (prevBtn && !prevBtn.disabled) prevBtn.click();
        }
      }
    }
  }, { passive: true });

  // Update available banner for PWA
  window.__showUpdateBanner = function (reg) {
    if (document.querySelector(".update-banner")) return;
    var banner = document.createElement("div");
    banner.className = "update-banner";
    banner.innerHTML = '<span class="update-banner-text">有新版本可用</span>' +
      '<button class="update-banner-btn">立即更新</button>';
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add("show"); });
    banner.querySelector(".update-banner-btn").addEventListener("click", function () {
      if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
    });
  };

  
  // ---------- Progress Export/Import ----------
  function exportProgress() {
    var data = {
      version: 1,
      exported: new Date().toISOString(),
      state: state
    };
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "aif-c01-progress-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
    toast("已导出学习进度");
  }

  function importProgress() {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var imported = data.state || data;
          // Merge imported state
          if (imported.wrongIds) state.wrongIds = imported.wrongIds;
          if (imported.progress) state.progress = imported.progress;
          if (imported.seqProgress) state.seqProgress = imported.seqProgress;
          if (imported.topicProgress) state.topicProgress = imported.topicProgress;
          if (imported.studyProgress) state.studyProgress = imported.studyProgress;
          if (imported.fontIndex != null) state.fontIndex = imported.fontIndex;
          saveState();
          toast("已导入学习进度（" + Object.keys(state.progress).length + " 条记录）");
          goHome();
        } catch (e) {
          toast("导入失败：文件格式不正确");
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

// ---------- Boot ----------
  applyFontScale();
  viewStack = [{ view: "home", opts: {} }];
  render();
})();
