/* ============================================================
   紫色学习工作台 · PurpleWorkbench — 全功能应用逻辑
   ============================================================ */

(function () {
  'use strict';

  // ==================== 数据管理 ====================
  const STORAGE_KEY = 'purple_workbench_data';
  const SETTINGS_KEY = 'purple_workbench_settings';
  const ARCHIVE_KEY = 'purple_workbench_archive';
  const TAG_PRESETS_KEY = 'purple_workbench_tags';
  const AI_SUMMARY_KEY = 'purple_workbench_ai_summaries';
  const SKILLS_KEY = 'purple_workbench_skills';
  const SKILL_RESULTS_KEY = 'purple_workbench_skill_results';

  const DEFAULT_TAGS = ['TS', 'JS', '前端', '后端', '算法', '项目', '面试', '学习', '刷题', 'React', 'Vue', 'Node', 'Python', 'LeetCode', '设计模式', '数据库','learn-cc'];

  let appData = {
    tasks: [],
    tags: [...DEFAULT_TAGS]
  };

  let archivedTasks = [];
  let settings = {
    apiKey: '',
    model: 'deepseek-v4-flash'
  };
  let aiSummaries = [];
  let skills = [];
  let skillResults = [];

  let currentFilter = 'all';
  let currentTagFilter = null;
  let searchQuery = '';
  let editingTaskId = null;
  let currentTab = 'tasks';

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        appData.tasks = parsed.tasks || [];
        appData.tags = parsed.tags || [...DEFAULT_TAGS];
      }
    } catch (e) {
      appData.tasks = [];
      appData.tags = [...DEFAULT_TAGS];
    }

    try {
      const raw = localStorage.getItem(ARCHIVE_KEY);
      archivedTasks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      archivedTasks = [];
    }

    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = { ...settings, ...JSON.parse(raw) };
    } catch (e) { /* use defaults */ }

    try {
      const raw = localStorage.getItem(AI_SUMMARY_KEY);
      aiSummaries = raw ? JSON.parse(raw) : [];
    } catch (e) {
      aiSummaries = [];
    }

    try {
      const raw = localStorage.getItem(SKILLS_KEY);
      skills = raw ? JSON.parse(raw) : [];
    } catch (e) {
      skills = [];
    }

    try {
      const raw = localStorage.getItem(SKILL_RESULTS_KEY);
      skillResults = raw ? JSON.parse(raw) : [];
    } catch (e) {
      skillResults = [];
    }
    loadDreams();
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  }

  function saveAISummaries() {
    localStorage.setItem(AI_SUMMARY_KEY, JSON.stringify(aiSummaries));
  }

  function saveSkills() {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
  }

  function saveSkillResults() {
    localStorage.setItem(SKILL_RESULTS_KEY, JSON.stringify(skillResults));
  }

  function saveArchive() {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archivedTasks));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
  }

  function now() {
    return new Date().toISOString();
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    const dayMs = 86400000;

    if (diff < dayMs && d.getDate() === now.getDate()) return '今天';
    if (diff < dayMs * 2 && d.getDate() === now.getDate() - 1) return '昨天';

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    if (y === now.getFullYear()) return `${m}-${day}`;
    return `${y}-${m}-${day}`;
  }

  function formatDateFull(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ==================== 任务操作 ====================
  function createTask(data) {
    return {
      id: generateId(),
      title: data.title || '',
      overview: data.overview || '',
      description: data.description || '',
      links: data.links || [],
      tags: data.tags || [],
      priority: data.priority || 'medium',
      status: data.status || 'pending',
      createdAt: now(),
      plannedDate: data.plannedDate || '',
      actualDate: data.actualDate || '',
      timeSpent: data.timeSpent || 0,
      pinned: data.pinned || false,
      summaries: data.summaries || [],
      archived: false
    };
  }

  function addTask(data) {
    const task = createTask(data);
    appData.tasks.unshift(task);
    saveData();
    return task;
  }

  function updateTask(id, updates) {
    const idx = appData.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    // Update actual date when status changes to completed
    if (updates.status === 'completed' && appData.tasks[idx].status !== 'completed') {
      updates.actualDate = new Date().toISOString().split('T')[0];
    }
    if (updates.status && updates.status !== 'completed' && appData.tasks[idx].status === 'completed') {
      updates.actualDate = '';
    }
    appData.tasks[idx] = { ...appData.tasks[idx], ...updates };
    saveData();
    return appData.tasks[idx];
  }

  function deleteTask(id) {
    appData.tasks = appData.tasks.filter(t => t.id !== id);
    saveData();
  }

  function archiveTask(id) {
    const idx = appData.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const task = { ...appData.tasks[idx], archived: true, archivedAt: now() };
    archivedTasks.unshift(task);
    appData.tasks.splice(idx, 1);
    saveData();
    saveArchive();
  }

  function restoreTask(id) {
    const idx = archivedTasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const task = { ...archivedTasks[idx], archived: false, archivedAt: null };
    appData.tasks.unshift(task);
    archivedTasks.splice(idx, 1);
    saveData();
    saveArchive();
  }

  function getTask(id) {
    return appData.tasks.find(t => t.id === id);
  }

  function cycleStatus(id) {
    const task = getTask(id);
    if (!task) return;
    const statusOrder = ['pending', 'in-progress', 'completed', 'on-hold'];
    const idx = statusOrder.indexOf(task.status);
    const next = statusOrder[(idx + 1) % statusOrder.length];
    updateTask(id, { status: next });
  }

  function addSummary(taskId, content) {
    const task = getTask(taskId);
    if (!task) return;
    const summaries = [...(task.summaries || [])];
    const summary = {
      id: 'sum_' + Date.now(),
      content: content,
      createdAt: now()
    };
    // If we're editing an existing summary
    if (content._editId) {
      const editIdx = summaries.findIndex(s => s.id === content._editId);
      if (editIdx !== -1) {
        summaries[editIdx] = { ...summaries[editIdx], content: content._content || content.content, updatedAt: now() };
      }
    } else {
      summaries.push(summary);
    }
    updateTask(taskId, { summaries });
    return summary;
  }

  function updateSummary(taskId, summaryId, content) {
    const task = getTask(taskId);
    if (!task) return;
    const summaries = task.summaries.map(s =>
      s.id === summaryId ? { ...s, content, updatedAt: now() } : s
    );
    updateTask(taskId, { summaries });
  }

  function deleteSummary(taskId, summaryId) {
    const task = getTask(taskId);
    if (!task) return;
    const summaries = task.summaries.filter(s => s.id !== summaryId);
    updateTask(taskId, { summaries });
  }

  // ==================== 筛选与搜索 ====================
  function getFilteredTasks() {
    let tasks = [...appData.tasks];

    // Pin first
    tasks.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    // Status filter
    if (currentFilter === 'pinned') {
      tasks = tasks.filter(t => t.pinned);
    } else if (currentFilter === 'high') {
      tasks = tasks.filter(t => t.priority === 'high');
    } else if (currentFilter === 'medium') {
      tasks = tasks.filter(t => t.priority === 'medium');
    } else if (currentFilter === 'low') {
      tasks = tasks.filter(t => t.priority === 'low');
    } else if (currentFilter !== 'all') {
      tasks = tasks.filter(t => t.status === currentFilter);
    }

    // Tag filter
    if (currentTagFilter) {
      tasks = tasks.filter(t => t.tags && t.tags.includes(currentTagFilter));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      tasks = tasks.filter(t => {
        if (t.title.toLowerCase().includes(q)) return true;
        if ((t.overview || '').toLowerCase().includes(q)) return true;
        if ((t.description || '').toLowerCase().includes(q)) return true;
        if (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q))) return true;
        if (t.summaries && t.summaries.some(s => (s.content || '').toLowerCase().includes(q))) return true;
        if (t.links && t.links.some(l => (l.url || '').toLowerCase().includes(q) || (l.label || '').toLowerCase().includes(q))) return true;
        return false;
      });
    }

    return tasks;
  }

  // ==================== 统计 ====================
  function getStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = appData.tasks.filter(t => {
      if (t.status === 'completed' && t.actualDate === today) return true;
      return t.createdAt.split('T')[0] === today || (t.plannedDate === today);
    });

    const total = appData.tasks.length;
    const completed = appData.tasks.filter(t => t.status === 'completed').length;
    const pending = appData.tasks.filter(t => t.status !== 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, rate };
  }

  // ==================== AI 总结 ====================

  // 采集今日活跃任务：已完成 + 进行中 + 有小结的（不再只看"已完成"）
  function getTodayActiveTasks() {
    const today = new Date().toISOString().split('T')[0];
    return appData.tasks.filter(t => {
      // 今天完成
      if (t.status === 'completed' && t.actualDate === today) return true;
      // 进行中且今天创建/更新
      if (t.status === 'in-progress') return true;
      // 有待完成且今天创建
      if (t.status === 'pending' && t.createdAt.split('T')[0] === today) return true;
      // 有学习小结（不管什么状态，写了小结就说明有进展）
      if (t.summaries && t.summaries.length > 0) return true;
      return false;
    });
  }

  function getRecentActiveTasks() {
    return appData.tasks.filter(t =>
      t.status === 'completed' || t.status === 'in-progress' || (t.summaries && t.summaries.length > 0)
    ).slice(0, 20);
  }

  function buildLocalSummary(manualInput, tasks) {

    // 如果既没有任务也没有手动输入，返回 null
    if (tasks.length === 0 && (!manualInput || !manualInput.trim())) return null;

    const tagCounts = {};
    const titles = [];
    const summaries = [];
    const statusCounts = { completed: 0, 'in-progress': 0, pending: 0, 'on-hold': 0 };

    tasks.forEach(t => {
      titles.push(t.title);
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      (t.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      (t.summaries || []).forEach(s => {
        if (s.content) summaries.push(s.content);
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => `${tag}(${count})`);

    const totalTime = tasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);

    // Extract knowledge points from summaries
    const knowledgePoints = [];
    summaries.forEach(s => {
      const lines = s.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const clean = line.replace(/^[-\d.•\s]+/, '').trim();
        if (clean.length > 5 && clean.length < 120) {
          knowledgePoints.push(clean);
        }
      });
    });

    // Also extract from manual input
    if (manualInput && manualInput.trim()) {
      manualInput.split('\n').filter(l => l.trim()).forEach(line => {
        const clean = line.replace(/^[-\d.•\s]+/, '').trim();
        if (clean.length > 5 && clean.length < 120) {
          knowledgePoints.push(clean);
        }
      });
    }

    const uniquePoints = [...new Set(knowledgePoints)].slice(0, 12);

    // 深度知识点库（标签 → 详细解释）
    const deepKnowledgeDB = {
      'TS': [
        { title: 'TypeScript 类型系统', detail: 'TS 的核心是静态类型检查，理解 interface vs type、泛型约束、条件类型是进阶关键。面试常问：any/unknown/never 的区别。' },
        { title: '泛型与类型推断', detail: '泛型让代码复用性更强。extends 约束、keyof 索引类型、infer 条件推断是三个核心用法，面试中经常结合实际场景考察。' }
      ],
      'JS': [
        { title: '事件循环 (Event Loop)', detail: '宏任务（setTimeout/setInterval）和微任务（Promise.then/queueMicrotask）的执行顺序是 JS 异步的核心。面试必问：为什么 Promise 比 setTimeout 先执行？' },
        { title: '闭包与作用域链', detail: '闭包 = 函数 + 其词法环境的引用。常用于模块封装、防抖节流、柯里化。面试注意：闭包导致的内存泄漏问题及解决方案。' }
      ],
      '前端': [
        { title: '浏览器渲染流程', detail: 'DOM → CSSOM → Render Tree → Layout → Paint → Composite。理解回流(reflow)和重绘(repaint)的区别，以及 transform/opacity 为什么性能好。' },
        { title: 'HTTP 缓存策略', detail: '强缓存(Cache-Control/Expires) vs 协商缓存(ETag/Last-Modified)。面试常问：如何设计一个合理的缓存策略？' }
      ],
      '后端': [
        { title: 'RESTful API 设计', detail: '资源导向的 URL 设计、HTTP 方法的正确使用(GET/POST/PUT/DELETE)、状态码语义、版本管理策略。面试常问：如何设计一个幂等的 API？' },
        { title: '数据库索引优化', detail: 'B+树索引原理、最左前缀原则、覆盖索引、避免索引失效的场景。Explain 执行计划分析是面试中的高频话题。' }
      ],
      '算法': [
        { title: '时间复杂度分析', detail: '大O表示法的本质：描述算法随输入规模增长的趋势。常见复杂度：O(1) < O(logn) < O(n) < O(nlogn) < O(n²)。面试中要能分析代码的时间空间复杂度。' },
        { title: '动态规划核心思想', detail: '最优子结构 + 重叠子问题 + 状态转移方程。关键是找到 dp 数组的定义和递推关系，自顶向下（记忆化搜索）或自底向上（迭代）两种实现。' }
      ],
      'React': [
        { title: 'React 渲染机制', detail: '虚拟 DOM Diff 算法(O(n)复杂度)、Fiber 架构的可中断渲染、并发模式。面试重点：为什么用 key、useMemo/useCallback 的使用场景。' },
        { title: '状态管理方案选择', detail: 'useState/useReducer（组件级）→ Context（轻量共享）→ Zustand/Redux（全局状态）。关键是理解各方案的适用场景和取舍。' }
      ],
      'Vue': [
        { title: 'Vue 3 响应式原理', detail: '基于 Proxy 的响应式系统，对比 Vue 2 的 Object.defineProperty。ref vs reactive 的区别、computed 的缓存机制是常见面试题。' },
        { title: 'Composition API 设计思想', detail: '逻辑复用优于 Mixin、更清晰的代码组织、更好的 TS 支持。setup 语法糖下的生命周期和依赖注入。' }
      ],
      'Node': [
        { title: 'Node.js 事件循环', detail: 'libuv 的六阶段模型：timers → pending callbacks → idle/prepare → poll → check → close callbacks。理解 process.nextTick 和 setImmediate 的时机。' },
        { title: 'Stream 流处理', detail: '四种流类型(Readable/Writable/Duplex/Transform)、背压(backpressure)机制、pipe 的原理。面试场景：大文件处理为什么要用流？' }
      ],
      'Python': [
        { title: 'Python 装饰器原理', detail: '本质上是一个接受函数、返回函数的高阶函数。@语法糖、带参数的装饰器、functools.wraps 保留元信息。面试常见：如何实现一个计时装饰器？' },
        { title: 'async/await 异步编程', detail: '协程(coroutine)基于事件循环的协作式多任务。asyncio.gather vs asyncio.create_task 的区别，以及如何处理超时和取消。' }
      ],
      '数据库': [
        { title: 'MySQL 事务与锁', detail: 'ACID 特性、四种隔离级别(读未提交/读已提交/可重复读/串行化)的实现原理。行锁、间隙锁、临键锁的区别是面试难点。' },
        { title: 'Redis 数据结构应用', detail: 'String/Hash/List/Set/ZSet 五种基本类型的底层实现和应用场景。缓存穿透/击穿/雪崩的解决方案是必问内容。' }
      ],
      '设计模式': [
        { title: '常见设计模式', detail: '单例/工厂/观察者/策略/装饰器模式的核心思想和应用场景。面试不是背模式定义，而是能说出"在什么场景下用什么模式解决什么问题"。' },
        { title: 'SOLID 原则', detail: '单一职责/开闭原则/里氏替换/接口隔离/依赖倒置——这五个原则是写出可维护代码的基础，面试官很喜欢问"你的代码如何体现了这些原则"。' }
      ],
      '面试': [
        { title: 'STAR 法则回答行为问题', detail: 'Situation → Task → Action → Result。描述项目经验时用这个框架，像讲故事一样说清楚你做了什么、达到了什么效果。' },
        { title: '系统设计面试框架', detail: '需求澄清 → 容量估算 → API设计 → 数据模型 → 架构图 → 细节深入。不要一上来就画架构图，先问清楚需求和非功能性约束。' }
      ]
    };

    // 面试问题库
    const interviewDB = {
      'TS': 'TypeScript 中 type 和 interface 的区别是什么？什么场景用哪个？—— type 更适合联合类型、元组、映射类型；interface 可被合并声明，更适合定义对象形状。',
      'JS': '请解释 JavaScript 的事件循环机制，宏任务和微任务的区别。—— 微任务在当前宏任务执行完后立即执行，宏任务在下一轮事件循环执行。经典的 Promise + setTimeout 输出顺序题是必考。',
      '前端': '从输入 URL 到页面展示，经历了哪些步骤？—— DNS解析 → TCP连接 → TLS握手 → HTTP请求 → 服务器处理 → 浏览器解析渲染。每个环节都是一道面试题。',
      '后端': '如何设计一个高并发的 API 系统？—— 缓存(本地/分布式) → 限流(令牌桶/漏桶) → 异步处理(消息队列) → 数据库优化(索引/读写分离) → 水平扩展。',
      '算法': '请分析你最近写的一段代码的时间和空间复杂度。—— 这是面试中最常见的问题之一，养成每写一段代码就想一想的习惯。',
      'React': 'React 中 useMemo 和 useCallback 的区别和使用场景？—— useMemo 缓存计算结果，useCallback 缓存函数引用。都在避免子组件不必要的重渲染，但不要滥用。',
      'Vue': 'Vue 3 中 ref 和 reactive 的区别？—— ref 用于基本类型（内部用 .value 访问）、reactive 用于对象（Proxy 代理）。ref 可以绑定 DOM 元素，reactive 不能。',
      'Node': 'Node.js 如何处理高并发？—— 单线程事件循环 + 非阻塞 I/O + libuv 线程池处理密集计算。适合 I/O 密集型，不适合 CPU 密集型。',
      'Python': 'Python 的 GIL 是什么？对多线程有什么影响？—— 全局解释器锁确保同一时刻只有一个线程执行 Python 字节码，多线程在 CPU 密集型任务中无效，需要用多进程。',
      '数据库': 'MySQL 索引失效的常见场景有哪些？—— LIKE 前置通配符、隐式类型转换、OR 条件、对索引列使用函数、不满足最左前缀原则。每个都要能举例说明。',
      '设计模式': '你在项目中用过哪些设计模式？解决什么问题？—— 不要说"我用过单例模式"，要说"我在管理全局配置时用了单例，因为只需要一个实例来维护状态"。',
      '面试': '请用 STAR 法则描述一个你解决过的技术难题。—— 这是最经典的行为面试题，提前准备好 2-3 个真实项目案例，每个用 STAR 框架组织。'
    };

    // 构建深度数据
    const deepKnowledge = [];
    const interviewQuestions = [];
    const practicalTips = [];
    const deepSuggestions = [];
    const seenKnowledge = new Set();
    const seenSuggestions = new Set();

    // 从标签匹配深度知识点
    Object.entries(tagCounts).forEach(([tag]) => {
      const knowledge = deepKnowledgeDB[tag] || [];
      knowledge.forEach(k => {
        if (!seenKnowledge.has(k.title)) {
          seenKnowledge.add(k.title);
          deepKnowledge.push(k);
        }
      });

      const interview = interviewDB[tag];
      if (interview && !interviewQuestions.includes(interview)) {
        interviewQuestions.push(interview);
      }

      // 深度延伸建议
      const tagSuggestions = {
        'TS': [
          { title: '深入 TypeScript 类型体操', detail: '搜索 "type-challenges" GitHub 仓库，从 easy 到 extreme 逐步练习——这是面试中 TS 能力的硬通货。' },
          { title: '阅读 TS 官方 Handbook 的 Advanced Types 章节', detail: '重点理解 Conditional Types、Template Literal Types、Mapped Types 三个高级特性。' }
        ],
        'JS': [
          { title: '阅读 You Don\'t Know JS 系列', detail: '尤其是 Scope & Closures 和 Async & Performance 两本，是面试基础题的圣经。' },
          { title: '在浏览器 DevTools 中实操 Event Loop', detail: '用 Performance 面板录制一段异步代码的执行时序，可视化理解事件循环。' }
        ],
        '前端': [
          { title: '学习浏览器工作原理', detail: '搜索 "How Browsers Work" 这篇文章，理解渲染引擎的每一个阶段。' },
          { title: '了解 Web Vitals 性能指标', detail: 'LCP/FID/CLS 三大核心指标是面试和实际工作的共同话题。' }
        ],
        '后端': [
          { title: '设计一个完整的 RESTful API', detail: '从资源建模、URL 设计、状态码到错误处理，写一份完整的 API 设计文档。' },
          { title: '学习 Redis 实战场景', detail: '缓存策略、分布式锁、消息队列、限流——每个场景写一个 demo。' }
        ],
        '算法': [
          { title: '按专题刷 LeetCode', detail: '不要随机刷题，按"数组→链表→树→图→DP"的顺序系统刷，每个专题至少 10 道。' },
          { title: '学习算法可视化', detail: '搜索 "visualgo.net"，把常见算法的执行过程可视化理解。' }
        ],
        'React': [
          { title: '阅读 React 源码中的 Scheduler 部分', detail: '理解时间切片和优先级调度——这是 React 18 并发特性的底层基础。' },
          { title: '动手实现一个迷你 React', detail: '从 createElement 到 Fiber 渲染，200 行代码搞懂核心原理。' }
        ],
        'Vue': [
          { title: '阅读 Vue 3 响应式源码', detail: '从 reactive.ts 开始，理解 Proxy 拦截、track/trigger 依赖收集和触发更新的流程。' },
          { title: '对比不同状态管理方案', detail: 'Pinia vs Vuex vs 原生 provide/inject，对比 API 设计和适用场景。' }
        ],
        'Node': [
          { title: '深入理解 libuv 事件循环', detail: '阅读 Node.js 官方文档的 Event Loop 章节，了解六个阶段的具体职责。' },
          { title: '实践 Stream 处理大文件', detail: '用 fs.createReadStream + Transform 实现一个大文件的行级处理 pipeline。' }
        ],
        'Python': [
          { title: '深入 asyncio 事件循环', detail: '理解 Future/Task/Coroutine 的关系，用 asyncio 实现一个简易的并发下载器。' },
          { title: '学习 Python 内存管理', detail: '引用计数 + 垃圾回收(分代回收)的机制，理解循环引用和 weakref 的用法。' }
        ],
        '数据库': [
          { title: '手写常见 SQL 查询', detail: '多表 JOIN、分组聚合、窗口函数——面试中写不出 SQL 会很尴尬。' },
          { title: '学习 MySQL 执行计划分析', detail: '用 EXPLAIN 分析每条查询的 type/rows/Extra，理解索引是否生效。' }
        ],
        '设计模式': [
          { title: '重构现有项目应用设计模式', detail: '选一个自己的项目，找出可以应用策略模式/观察者模式的地方，动手重构。' },
          { title: '阅读 Head First 设计模式', detail: '这本书用场景化的方式讲解模式，比 GoF 原书更容易理解和记忆。' }
        ]
      };

      const suggestions = tagSuggestions[tag] || [];
      suggestions.forEach(s => {
        if (!seenSuggestions.has(s.title)) {
          seenSuggestions.add(s.title);
          deepSuggestions.push(s);
        }
      });
    });

    // 从小结中提取实操要点
    summaries.forEach(s => {
      const lines = s.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const clean = line.replace(/^[-\d.•\s]+/, '').trim();
        const lower = clean.toLowerCase();
        if ((lower.includes('报错') || lower.includes('错误') || lower.includes('error') ||
             lower.includes('坑') || lower.includes('注意') || lower.includes('记得') ||
             lower.includes('命令') || lower.includes('配置') || lower.includes('代码')) &&
            clean.length > 10 && clean.length < 200) {
          practicalTips.push(clean);
        }
      });
    });

    return {
      taskCount: tasks.length,
      completedCount: statusCounts.completed || 0,
      inProgressCount: statusCounts['in-progress'] || 0,
      titles: titles.slice(0, 10),
      topTags,
      totalTime,
      deepKnowledge: deepKnowledge.slice(0, 6),
      interviewQuestions: interviewQuestions.slice(0, 3),
      practicalTips: practicalTips.slice(0, 5),
      deepSuggestions: deepSuggestions.slice(0, 4),
      summaries,
      hasManual: !!(manualInput && manualInput.trim())
    };
  }

  function formatLocalSummary(data) {
    const timeStr = data.totalTime > 0 ? `${Math.floor(data.totalTime / 60)} 小时 ${data.totalTime % 60} 分钟` : '未记录';
    const taskCountDesc = data.taskCount > 0
      ? `${data.taskCount} 个任务（已完成 ${data.completedCount}，进行中 ${data.inProgressCount}）`
      : '暂无任务，以下基于你的手动输入生成';
    const hasContent = data.deepKnowledge.length > 0 || data.interviewQuestions.length > 0;

    let h = '';

    // ⚡ 今日技术复盘
    h += `<div class="ai-result-section"><h4>⚡ 今日技术复盘</h4>`;
    h += `<blockquote>今天参与${timeStr !== '未记录' ? '了 ' + timeStr + ' 的' : ''}学习，涉及 ${taskCountDesc}。`;
    h += !hasContent ? ` 但笔记太简略，AI 无法提炼深度内容。</blockquote></div>` : `</blockquote></div>`;

    // ❌ 容易踩坑
    h += `<div class="ai-result-section"><h4>❌ 容易踩坑 / 容易答错的地方</h4><ul>`;
    if (data.deepKnowledge.length > 0) {
      data.deepKnowledge.slice(0, 4).forEach(k => {
        h += `<li><strong>${escapeHtml(k.title)}</strong>：${escapeHtml(k.detail)}</li>`;
      });
    } else {
      h += `<li>今天的记录没有暴露明显踩坑点。常见面试坑：概念混淆、只背不写、不记踩坑经历。</li>`;
    }
    h += `</ul></div>`;

    // ✅ 今日掌握的知识点
    h += `<div class="ai-result-section"><h4>✅ 今日真正掌握的知识点</h4><ol>`;
    if (data.deepKnowledge.length > 0) {
      data.deepKnowledge.slice(0, 5).forEach(k => {
        h += `<li><strong>${escapeHtml(k.title)}</strong>：${escapeHtml(k.detail)}</li>`;
      });
    } else {
      h += `<li><strong>记录太简略</strong>——没具体的技术细节、踩坑经历或代码片段，AI 无法提炼。</li>`;
    }
    h += `</ol></div>`;

    // 🎤 面试官视角
    h += `<div class="ai-result-section"><h4>🎤 面试官视角：标准答案模板</h4>`;
    if (data.interviewQuestions.length > 0) {
      data.interviewQuestions.forEach((q, i) => {
        h += `<h5>Q${i + 1}: ${escapeHtml(q.split('？')[0] + '？')}</h5>`;
        h += `<p><strong>口诀</strong>：<code>核心原理一句话，背熟能挡 80% 追问</code></p>`;
        h += `<table><tr><th>维度</th><th>内容</th></tr>`;
        h += `<tr><td>定义</td><td>${escapeHtml(q.split('？')[0])}</td></tr>`;
        h += `<tr><td>原理</td><td>核心机制 + 数据结构</td></tr>`;
        h += `<tr><td>应用</td><td>实际场景</td></tr>`;
        h += `<tr><td>坑点</td><td>面试官最爱追问</td></tr></table>`;
        h += `<blockquote>${escapeHtml(q)}</blockquote>`;
      });
    } else {
      h += `<h5>Q1: 试试用费曼学习法复述今天学的内容</h5>`;
      h += `<p><strong>口诀</strong>：<code>会讲才真懂，讲不清就是没懂</code></p>`;
    }
    h += `</div>`;

    // 🛠️ 实操备忘录
    h += `<div class="ai-result-section"><h4>🛠️ 实操备忘录</h4><ul>`;
    if (data.practicalTips.length > 0) {
      data.practicalTips.forEach(t => { h += `<li>${escapeHtml(t)}</li>`; });
    } else {
      h += `<li>今天没有记录具体实操细节。下次遇到报错，记下：(1) 报错信息 (2) 复现步骤 (3) 你的猜测 (4) 实际原因。</li>`;
    }
    h += `</ul></div>`;

    // 📅 明日学习路线
    h += `<div class="ai-result-section"><h4>📅 明日学习路线</h4><ul>`;
    h += `<li>把今日的口诀抄一遍，背下来</li>`;
    if (data.deepSuggestions.length > 0) {
      h += `<li>进阶：${escapeHtml(data.deepSuggestions[0].title)}</li>`;
    }
    h += `<li><strong>口诀</strong>：<code>输入 → 输出 → 背口诀，三步闭环</code></li>`;
    h += `</ul></div>`;

    return h;
  }

  function getStudyTip() {
    const tips = [
      '今天的学习节奏很棒！建议花 10 分钟回顾一下今天遇到的关键问题，加深记忆 🌸',
      '开发者的小秘密：每天写学习小结的习惯，三个月后你会感谢自己 ✨',
      '编程学习重在理解而非记忆。如果今天有不懂的概念，明天再花 15 分钟巩固一下',
      '番茄工作法推荐：25 分钟专注 + 5 分钟休息，能大幅提升学习效率 🍅',
      '学完一个知识点后，试着用自己的话讲给别人听——费曼学习法的精髓就在这里',
      '不要追求完美，先让代码跑起来，然后再优化。Done is better than perfect 💪',
      '今天你比昨天又多懂了一点点，这就是最好的进步 🌱'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  async function generateAISummary(manualInput, selectedIds) {
    // 用选中的任务 ID 取任务，不再自动全部收集
    const tasks = selectedIds && selectedIds.length > 0
      ? appData.tasks.filter(t => selectedIds.includes(t.id))
      : [];

    // 如果既没有任务也没有手动输入
    if (tasks.length === 0 && (!manualInput || !manualInput.trim())) {
      return { type: 'empty' };
    }

    // Try AI API first if configured
    if (settings.apiKey && settings.apiKey.trim()) {
      try {
        const result = await callDeepSeekAPI(tasks, manualInput);
        if (result) return { type: 'ai', html: result };
      } catch (e) {
        return { type: 'error', message: e.message || 'API 请求失败' };
      }
    }

    // Local fallback (no API key configured)
    const data = buildLocalSummary(manualInput, tasks);
    if (!data) return { type: 'empty' };
    return { type: 'local', html: formatLocalSummary(data) };
  }

  async function callDeepSeekAPI(tasks, manualInput) {
    const taskSummaries = tasks.map(t => {
      const statusLabel = { 'pending': '待完成', 'in-progress': '进行中', 'completed': '已完成', 'on-hold': '搁置' };
      const parts = [`[${statusLabel[t.status] || t.status}] ${t.title}`];
      if (t.overview) parts.push(`概述: ${t.overview}`);
      if (t.tags && t.tags.length) parts.push(`标签: ${t.tags.join(', ')}`);
      if (t.timeSpent) parts.push(`耗时: ${t.timeSpent}分钟`);
      if (t.summaries && t.summaries.length) {
        parts.push(`学习小结: ${t.summaries.map(s => s.content).join('; ')}`);
      }
      return parts.join('\n');
    }).join('\n\n---\n\n');

    const manualSection = (manualInput && manualInput.trim())
      ? `\n\n---\n\n学生手动补充的今日学习记录：\n${manualInput.trim()}`
      : '';

    const prompt = `你是一位犀利直接的技术面试评审（风格参考 ClawBot），学生在面试准备中。你的任务：从学生今天的学习记录（流水账、踩坑记录、零散代码片段、面试题思考）中，像评审一样提炼出可背诵、可面试的硬核笔记。

【评审风格 — 必须遵守】
- 语气直接犀利，不堆砌"加油""真棒"等空话，但允许部分的鼓励
- **先指出容易踩坑/容易答错的地方**（如果学生笔记里没明显错误，就给出该领域高频踩坑点）
- 再给"✅ 真正掌握"的核心知识点
- 每个关键概念都要给出**一句口诀**（高度凝练，方便背诵）
- 用具体的数字、例子、代码说话，禁止"建议多练习"这种空话

【输出结构 — 使用 HTML】

<div class="ai-result-section"><h4>⚡ 今日技术复盘</h4>
<blockquote>1-2 句锐评：今天到底搞懂了什么，没搞懂什么</blockquote></div>

<div class="ai-result-section"><h4>❌ 容易踩坑 / 容易答错的地方</h4>
<ul>
<li><strong>坑点标题</strong>：具体说明坑在哪、正确做法是什么</li>
<li>（2-4 条）</li>
</ul></div>

<div class="ai-result-section"><h4>✅ 今日真正掌握的知识点</h4>
<ol>
<li><strong>知识点名</strong>：是什么 / 为什么重要 / 怎么用。配代码示例或具体数据。</li>
<li>...</li>
</ol></div>

<div class="ai-result-section"><h4>🎤 面试官视角：标准答案模板</h4>
<h5>Q1: 高频面试题</h5>
<p><strong>口诀</strong>：<code>一句高度凝练的话</code></p>
<table><tr><th>维度</th><th>内容</th></tr><tr><td>定义</td><td>...</td></tr><tr><td>原理</td><td>...</td></tr><tr><td>应用</td><td>...</td></tr><tr><td>坑点</td><td>...</td></tr></table>
（2-3 道题，每道都要配口诀）</div>

<div class="ai-result-section"><h4>🛠️ 实操备忘录</h4>
<ul>
<li>命令 / 配置 / 代码片段（可直接复制）</li>
<li>报错信息 + 解决方案</li>
</ul></div>

<div class="ai-result-section"><h4>📅 明日学习路线</h4>
<p>具体的下一步行动</p></div>

【HTML 格式规范 — 必须严格遵守】
1. 所有内容必须用上面指定的 <div class="ai-result-section"> 包裹
2. 章节标题用 <h4>，子标题用 <h5>
3. 表格用 <table>，代码用 <pre><code>
4. 加粗用 <strong>，行内代码用 <code>
5. **不要**输出 Markdown；**不要**用 ### 或 ---
6. **不要**用外层代码块标记

任务列表（含状态）：
${taskSummaries}${manualSection}`;

    const baseUrl = 'https://api.deepseek.com';
    const model = settings.model || 'deepseek-v4-flash';

    let response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: '你是一位犀利直接的技术面试评审（风格参考 ClawBot：先判断对错，再给结构化标准答案，最后给口诀）。语气严厉但不嘲讽，可以鼓励但不堆砌鼓励性空话，专门把学生的流水账笔记提炼成可背诵、可面试的硬核笔记。回复使用纯 HTML 片段（div/h3/h4/ul/li/p/table/tr/td/th/code/pre 标签），禁止用 Markdown 和代码块标记。' },
            { role: 'user', content: prompt }
          ],
          thinking: { type: 'disabled' },
          temperature: 0.7,
          max_tokens: 4000,
          stream: false
        })
      });
    } catch (fetchErr) {
      if (fetchErr.message === 'Failed to fetch' || fetchErr.name === 'TypeError') {
        throw new Error('CORS 跨域被浏览器拦截 —— 请关闭浏览器安全策略后重试（见下方解决方案）');
      }
      throw new Error('网络请求失败: ' + fetchErr.message);
    }

    if (!response.ok) {
      let errMsg = `API 返回错误 (HTTP ${response.status})`;
      try {
        const errData = await response.json();
        if (errData.error?.message) errMsg = errData.error.message;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';

    // Clean markdown code blocks
    content = content.replace(/```html?\n?/g, '').replace(/```\n?/g, '').trim();

    return content;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 极简 Markdown 渲染器（适配 ClawBot 风格：# ## ### --- - * ` 代码 | 表格）
  function renderMarkdown(md) {
    if (!md) return '';
    let text = md;

    // Step 1: 提取代码块（占位符避免内容被解析）
    const codeBlocks = [];
    text = text.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (m, lang, code) => {
      codeBlocks.push({ lang: lang || '', code: code.replace(/\n$/, '') });
      return `\n\n@@CB${codeBlocks.length - 1}@@\n\n`;
    });

    // Step 2: 提取表格（连续以 | 开头的行）
    const tables = [];
    text = text.replace(/(?:^\|.+\|\s*\n)+/gm, (match) => {
      const rows = match.trim().split('\n').map(row =>
        row.trim().replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
      );
      tables.push(rows);
      return `\n\n@@TB${tables.length - 1}@@\n\n`;
    });

    // Step 3: 行内格式转换（注意：代码 ` ` 加粗 ** ** 斜体 * *）
    function inline(s) {
      // 先保护代码片段，避免后续 * 处理误伤
      const codes = [];
      s = s.replace(/`([^`\n]+)`/g, (m, code) => {
        codes.push(code);
        return `\x01${codes.length - 1}\x01`;
      });
      s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
      // 还原代码片段
      s = s.replace(/\x01(\d+)\x01/g, (m, i) => `<code>${escapeHtml(codes[parseInt(i)])}</code>`);
      return s;
    }

    // Step 4: 逐行处理
    const lines = text.split('\n');
    let html = '';
    let listType = null; // 'ul' | 'ol' | null
    let inQuote = false;

    function closeList() {
      if (listType) { html += listType === 'ul' ? '</ul>' : '</ol>'; listType = null; }
    }
    function closeQuote() {
      if (inQuote) { html += '</blockquote>'; inQuote = false; }
    }
    function closeAll() { closeList(); closeQuote(); }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 占位符：代码块
      const cbMatch = trimmed.match(/^@@CB(\d+)@@$/);
      if (cbMatch) {
        closeAll();
        const cb = codeBlocks[parseInt(cbMatch[1])];
        html += `<pre><code${cb.lang ? ` class="lang-${escapeHtml(cb.lang)}"` : ''}>${escapeHtml(cb.code)}</code></pre>`;
        continue;
      }

      // 占位符：表格
      const tbMatch = trimmed.match(/^@@TB(\d+)@@$/);
      if (tbMatch) {
        closeAll();
        const rows = tables[parseInt(tbMatch[1])];
        if (rows.length >= 2) {
          html += '<div class="md-table-wrap"><table class="md-table">';
          html += '<thead><tr>';
          rows[0].forEach(c => html += `<th>${inline(c)}</th>`);
          html += '</tr></thead><tbody>';
          for (let r = 2; r < rows.length; r++) {
            html += '<tr>';
            rows[r].forEach(c => html += `<td>${inline(c)}</td>`);
            html += '</tr>';
          }
          html += '</tbody></table></div>';
        } else if (rows.length === 1) {
          // 只有一行没有分隔符时，也尝试按表格渲染
          html += '<div class="md-table-wrap"><table class="md-table"><tbody>';
          html += '<tr>';
          rows[0].forEach(c => html += `<td>${inline(c)}</td>`);
          html += '</tr></tbody></table></div>';
        }
        continue;
      }

      // 空行
      if (trimmed === '') {
        closeAll();
        continue;
      }

      // 分隔线
      if (/^[\s]*(-{3,}|={3,}|\*{3,})[\s]*$/.test(trimmed)) {
        closeAll();
        html += '<hr>';
        continue;
      }

      // 标题（允许前后空格）
      const hMatch = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (hMatch) {
        closeAll();
        const level = Math.min(hMatch[1].length, 4);
        html += `<h${level + 2} class="md-h${level}">${inline(hMatch[2])}</h${level + 2}>`;
        continue;
      }

      // 引用
      const qMatch = trimmed.match(/^>\s*(.*)$/);
      if (qMatch) {
        closeList();
        if (!inQuote) { html += '<blockquote>'; inQuote = true; }
        html += `<p>${inline(qMatch[1])}</p>`;
        continue;
      } else if (inQuote) {
        closeQuote();
      }

      // 无序列表（- * +）
      const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      if (ulMatch) {
        if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
        html += `<li>${inline(ulMatch[1])}</li>`;
        continue;
      }

      // 有序列表（1. 2. 等）
      const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (olMatch) {
        if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
        html += `<li>${inline(olMatch[1])}</li>`;
        continue;
      }

      // 普通段落
      closeList();
      html += `<p>${inline(trimmed)}</p>`;
    }

    closeAll();
    return html;
  }

  // 空状态图片随机（icon2 / icon3）
  const EMPTY_ICONS = ['./icons/welcome.jpg', './icons/welcome2.jpg'];
  function randomEmptyIcon() {
    return EMPTY_ICONS[Math.floor(Math.random() * EMPTY_ICONS.length)];
  }
  function getEmptyIconHTML() {
    return `<div class="empty-icon"><img src="${randomEmptyIcon()}" alt="empty"></div>`;
  }
  // 替换 HTML 里写死的空状态图标为随机图
  function refreshStaticEmptyIcons() {
    document.querySelectorAll('.empty-icon img').forEach(img => {
      img.src = randomEmptyIcon();
    });
  }

  // ==================== UI 渲染 ====================
  function renderStats() {
    const stats = getStats();
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statDone').textContent = stats.completed;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statRate').textContent = stats.rate + '%';
  }

  function renderHeaderDate() {
    const now = new Date();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const w = weekdays[now.getDay()];
    document.getElementById('headerDate').textContent = `${y}年${m}月${d}日 周${w}`;
  }

  function renderTaskList() {
    const tasks = getFilteredTasks();
    const container = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');

    // Clear existing task cards
    container.querySelectorAll('.task-card').forEach(el => el.remove());

    if (tasks.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    tasks.forEach(task => {
      const card = createTaskCard(task);
      container.appendChild(card);
    });
  }

  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card ${task.pinned ? 'pinned' : ''} priority-${task.priority} ${task.status === 'completed' ? 'completed' : ''}`;
    card.dataset.taskId = task.id;

    const statusClass = `status-${task.status}`;
    const statusLabels = { 'pending': '待完成', 'in-progress': '进行中', 'completed': '已完成', 'on-hold': '搁置' };
    const statusBadgeClass = `badge-${task.status}`;

    const tagHtml = (task.tags || []).slice(0, 4).map(t =>
      `<span class="task-tag">${escapeHtml(t)}</span>`
    ).join('');

    const priorityLabels = { high: '高', medium: '中', low: '低' };
    const priorityBadgeClass = `priority-badge-${task.priority}`;

    const dateHtml = [];
    if (task.plannedDate) dateHtml.push(`<span>📅 ${formatDate(task.plannedDate)}</span>`);
    if (task.actualDate) dateHtml.push(`<span>✅ ${formatDate(task.actualDate)}</span>`);

    const summaryCount = (task.summaries || []).length;

    card.innerHTML = `
      <div class="task-card-header">
        <div class="task-status-dot ${statusClass}"></div>
        <div class="task-title">${escapeHtml(task.title) || '未命名任务'}</div>
      </div>
      ${task.overview ? `<div class="task-overview">${escapeHtml(task.overview)}</div>` : ''}
      <div class="task-meta">
        <span class="task-status-badge ${statusBadgeClass}">${statusLabels[task.status]}</span>
        <span class="task-priority-badge ${priorityBadgeClass}">${priorityLabels[task.priority]}优先级</span>
        ${tagHtml}
      </div>
      ${dateHtml.length > 0 ? `<div class="task-dates">${dateHtml.join('')}</div>` : ''}
      ${task.timeSpent > 0 ? `<div class="task-time">⏱️ ${task.timeSpent} 分钟</div>` : ''}
      <div class="task-actions">
        <button class="task-action-btn btn-status-cycle" data-action="cycle">🔄 切换状态</button>
        <button class="task-action-btn btn-summary" data-action="summary">📝 小结${summaryCount > 0 ? ` (${summaryCount})` : ''}</button>
        <button class="task-action-btn btn-detail" data-action="detail">📋 详情</button>
        <button class="task-action-btn btn-archive-card" data-action="archive">📁 归档</button>
      </div>
    `;

    // Click handlers
    card.querySelector('[data-action="cycle"]').addEventListener('click', (e) => {
      e.stopPropagation();
      cycleStatus(task.id);
      refreshUI();
      showToast('状态已切换 ✅');
    });

    card.querySelector('[data-action="summary"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openSummaryModal(task.id);
    });

    card.querySelector('[data-action="detail"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailModal(task.id);
    });

    card.querySelector('[data-action="archive"]').addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirm('确定归档此任务？归档后可在"📁 归档"中查看和恢复。', () => {
        archiveTask(task.id);
        refreshUI();
        showToast('任务已归档 📁');
      });
    });

    // Card click opens detail
    card.addEventListener('click', () => {
      openDetailModal(task.id);
    });

    return card;
  }

  function refreshUI() {
    renderStats();
    renderTaskList();
    renderTagFilters();
  }

  function renderTagFilters() {
    const container = document.getElementById('tagFilterList');
    const allTags = new Set();
    appData.tasks.forEach(t => (t.tags || []).forEach(tag => allTags.add(tag)));
    appData.tags.forEach(tag => allTags.add(tag));

    container.innerHTML = '';
    allTags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = `tag-filter-item ${currentTagFilter === tag ? 'active' : ''}`;
      chip.textContent = tag;
      chip.addEventListener('click', () => {
        currentTagFilter = currentTagFilter === tag ? null : tag;
        document.getElementById('btnTagFilter').classList.toggle('active', !!currentTagFilter);
        renderTagFilters();
        refreshUI();
      });
      container.appendChild(chip);
    });
  }

  // ==================== 模态框管理 ====================
  function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.body.style.overflow = '';
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    document.body.style.overflow = '';
  }

  // ==================== 任务编辑模态框 ====================
  let taskLinks = [];
  let taskTags = [];

  function openTaskModal(taskId = null) {
    editingTaskId = taskId;
    taskLinks = [];
    taskTags = [];

    if (taskId) {
      const task = getTask(taskId);
      if (!task) return;
      document.getElementById('modalTaskTitle').textContent = '编辑任务';
      document.getElementById('taskTitle').value = task.title || '';
      document.getElementById('taskOverview').value = task.overview || '';
      document.getElementById('taskDesc').value = task.description || '';
      document.getElementById('taskPlannedDate').value = task.plannedDate || '';
      document.getElementById('taskActualDate').value = task.actualDate || '';
      document.getElementById('taskTimeSpent').value = task.timeSpent || '';
      document.getElementById('taskPinned').checked = task.pinned || false;
      taskLinks = (task.links || []).map(l => ({ ...l }));
      taskTags = [...(task.tags || [])];

      setPriority(task.priority);
      setStatus(task.status);
    } else {
      document.getElementById('modalTaskTitle').textContent = '新建任务';
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskOverview').value = '';
      document.getElementById('taskDesc').value = '';
      document.getElementById('taskPlannedDate').value = '';
      document.getElementById('taskActualDate').value = '';
      document.getElementById('taskTimeSpent').value = '';
      document.getElementById('taskPinned').checked = false;
      taskLinks = [];
      taskTags = [];

      setPriority('medium');
      setStatus('pending');
    }

    renderLinks();
    renderTaskTags();
    openModal('modalTask');
  }

  function setPriority(priority) {
    document.querySelectorAll('#prioritySelector .priority-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.priority === priority);
    });
  }

  function setStatus(status) {
    document.querySelectorAll('#statusSelector .status-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.status === status);
    });
  }

  function renderLinks() {
    const container = document.getElementById('taskLinks');
    container.innerHTML = taskLinks.map((link, idx) => `
      <div class="link-item">
        <input type="text" class="form-input link-label" value="${escapeHtml(link.label || '')}" placeholder="链接名称" data-idx="${idx}">
        <input type="url" class="form-input link-url" value="${escapeHtml(link.url || '')}" placeholder="https://..." data-idx="${idx}">
        <button class="btn-remove-link" data-idx="${idx}">✕</button>
      </div>
    `).join('');

    // Link change handlers
    container.querySelectorAll('.link-label, .link-url').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.idx);
        const isUrl = input.classList.contains('link-url');
        if (isUrl) taskLinks[idx].url = input.value;
        else taskLinks[idx].label = input.value;
      });
    });

    container.querySelectorAll('.btn-remove-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        taskLinks.splice(idx, 1);
        renderLinks();
      });
    });
  }

  function renderTaskTags() {
    const container = document.getElementById('taskTags');
    container.innerHTML = taskTags.map(tag => `
      <span class="tag-item">
        ${escapeHtml(tag)}
        <span class="tag-remove" data-tag="${escapeHtml(tag)}">✕</span>
      </span>
    `).join('');

    container.querySelectorAll('.tag-remove').forEach(el => {
      el.addEventListener('click', () => {
        taskTags = taskTags.filter(t => t !== el.dataset.tag);
        renderTaskTags();
      });
    });
  }

  function collectTaskFormData() {
    const links = taskLinks.filter(l => l.url && l.url.trim());

    // Collect tag counts for suggestions
    links.forEach(l => {
      if (l.label && !l.url.match(/^https?:\/\//i)) {
        l.url = 'https://' + l.url;
      }
    });

    return {
      title: document.getElementById('taskTitle').value.trim(),
      overview: document.getElementById('taskOverview').value.trim(),
      description: document.getElementById('taskDesc').value.trim(),
      links: links,
      tags: [...taskTags],
      priority: document.querySelector('#prioritySelector .priority-btn.active')?.dataset?.priority || 'medium',
      status: document.querySelector('#statusSelector .status-btn.active')?.dataset?.status || 'pending',
      plannedDate: document.getElementById('taskPlannedDate').value,
      actualDate: document.getElementById('taskActualDate').value,
      timeSpent: parseInt(document.getElementById('taskTimeSpent').value) || 0,
      pinned: document.getElementById('taskPinned').checked
    };
  }

  function saveTaskForm() {
    const data = collectTaskFormData();
    if (!data.title) {
      showToast('请输入任务标题 📝');
      return;
    }

    if (editingTaskId) {
      updateTask(editingTaskId, data);
      showToast('任务已更新 ✅');
    } else {
      const task = addTask(data);
      // Add new tags
      (data.tags || []).forEach(tag => {
        if (!appData.tags.includes(tag)) appData.tags.push(tag);
      });
      saveData();
      showToast('任务创建成功 🌸');
    }

    closeAllModals();
    refreshUI();
  }

  // ==================== 任务详情模态框 ====================
  function openDetailModal(taskId) {
    const task = getTask(taskId);
    if (!task) return;

    const statusLabels = { 'pending': '待完成', 'in-progress': '进行中', 'completed': '已完成', 'on-hold': '搁置' };
    const priorityLabels = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' };

    const body = document.getElementById('modalDetailBody');
    body.innerHTML = `
      <div class="detail-section">
        <h3>📋 任务信息</h3>
        <p class="detail-text" style="font-size:var(--font-lg);font-weight:600;color:var(--text-primary);">${escapeHtml(task.title)}</p>
      </div>

      ${task.overview ? `
      <div class="detail-section">
        <h3>📝 简短总览</h3>
        <p class="detail-text">${escapeHtml(task.overview)}</p>
      </div>` : ''}

      ${task.description ? `
      <div class="detail-section">
        <h3>📄 详细描述</h3>
        <p class="detail-text">${escapeHtml(task.description)}</p>
      </div>` : ''}

      <div class="detail-section">
        <h3>🏷️ 状态信息</h3>
        <p class="detail-text">
          状态：${statusLabels[task.status]} &nbsp;|&nbsp;
          优先级：${priorityLabels[task.priority]} &nbsp;|&nbsp;
          ${task.pinned ? '📌 已置顶' : ''}
        </p>
      </div>

      ${task.tags && task.tags.length > 0 ? `
      <div class="detail-section">
        <h3>🏷️ 标签</h3>
        <div class="task-meta">
          ${task.tags.map(t => `<span class="task-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>` : ''}

      <div class="detail-section">
        <h3>📅 时间信息</h3>
        <p class="detail-text">
          创建：${formatDateFull(task.createdAt)} &nbsp;|&nbsp;
          计划完成：${formatDateFull(task.plannedDate)} &nbsp;|&nbsp;
          实际完成：${formatDateFull(task.actualDate)}
          ${task.timeSpent > 0 ? `&nbsp;|&nbsp;耗时：${task.timeSpent} 分钟` : ''}
        </p>
      </div>

      ${task.links && task.links.length > 0 ? `
      <div class="detail-section">
        <h3>🔗 关联链接</h3>
        <div class="detail-links">
          ${task.links.map(l => `<a class="detail-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">🔗 ${escapeHtml(l.label || l.url)}</a>`).join('')}
        </div>
      </div>` : ''}

      ${task.summaries && task.summaries.length > 0 ? `
      <div class="detail-section">
        <h3>📝 学习小结 (${task.summaries.length})</h3>
        <div class="detail-summaries">
          ${task.summaries.map(s => `
            <div class="summary-item">
              <div class="summary-item-content">${escapeHtml(s.content)}</div>
              <div class="summary-item-time">${formatDateFull(s.createdAt)}</div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="task-action-btn btn-status-cycle" id="detailCycle" style="flex:1;padding:10px;">🔄 切换状态</button>
        <button class="task-action-btn btn-summary" id="detailSummary" style="flex:1;padding:10px;">📝 学习小结</button>
        ${task.pinned
          ? '<button class="task-action-btn btn-detail" id="detailUnpin" style="flex:1;padding:10px;">📌 取消置顶</button>'
          : '<button class="task-action-btn btn-detail" id="detailPin" style="flex:1;padding:10px;">📌 置顶</button>'
        }
        ${task.status === 'completed'
          ? '<button class="task-action-btn btn-delete" id="detailArchive" style="flex:1;padding:10px;">📁 归档</button>'
          : ''
        }
      </div>
    `;

    // Detail view buttons
    document.getElementById('detailCycle')?.addEventListener('click', () => {
      cycleStatus(taskId);
      closeAllModals();
      refreshUI();
    });

    document.getElementById('detailSummary')?.addEventListener('click', () => {
      closeAllModals();
      openSummaryModal(taskId);
    });

    document.getElementById('detailPin')?.addEventListener('click', () => {
      updateTask(taskId, { pinned: true });
      closeAllModals();
      refreshUI();
      showToast('已置顶 📌');
    });

    document.getElementById('detailUnpin')?.addEventListener('click', () => {
      updateTask(taskId, { pinned: false });
      closeAllModals();
      refreshUI();
      showToast('已取消置顶');
    });

    document.getElementById('detailArchive')?.addEventListener('click', () => {
      showConfirm('确定归档此任务？归档后可随时恢复。', () => {
        archiveTask(taskId);
        closeAllModals();
        refreshUI();
        showToast('任务已归档 📁');
      });
    });

    document.getElementById('modalDetailEdit').onclick = () => {
      closeModal('modalDetail');
      openTaskModal(taskId);
    };

    openModal('modalDetail');
  }

  // ==================== 学习小结模态框 ====================
  let summaryTaskId = null;
  let editingSummaryId = null;

  function openSummaryModal(taskId) {
    summaryTaskId = taskId;
    editingSummaryId = null;
    const task = getTask(taskId);
    if (!task) return;

    document.getElementById('summaryTaskInfo').textContent = `📋 ${task.title}`;
    document.getElementById('summaryContent').value = '';

    renderSummaryList(task);
    openModal('modalSummary');
  }

  function renderSummaryList(task) {
    const container = document.getElementById('summaryList');
    const summaries = task.summaries || [];

    if (summaries.length === 0) {
      container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px;">还没有学习小结，在上方添加第一条吧 🌸</p>';
      return;
    }

    container.innerHTML = summaries.map(s => `
      <div class="summary-item">
        <div class="summary-item-content">${escapeHtml(s.content)}</div>
        <div class="summary-item-time">${formatDateFull(s.updatedAt || s.createdAt)}</div>
        <div class="summary-item-actions">
          <button data-action="edit-summary" data-sid="${s.id}">✏️ 编辑</button>
          <button data-action="delete-summary" data-sid="${s.id}" style="color:#C56A6A;">🗑️ 删除</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-action="edit-summary"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.sid;
        const summary = summaries.find(s => s.id === sid);
        if (summary) {
          document.getElementById('summaryContent').value = summary.content;
          editingSummaryId = sid;
        }
      });
    });

    container.querySelectorAll('[data-action="delete-summary"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.sid;
        showConfirm('确定删除这条小结？', () => {
          deleteSummary(summaryTaskId, sid);
          const task = getTask(summaryTaskId);
          if (task) renderSummaryList(task);
          refreshUI();
          showToast('小结已删除');
        });
      });
    });
  }

  function saveSummary() {
    const content = document.getElementById('summaryContent').value.trim();
    if (!content) {
      showToast('请输入小结内容 📝');
      return;
    }

    if (editingSummaryId) {
      updateSummary(summaryTaskId, editingSummaryId, content);
      showToast('小结已更新 ✅');
    } else {
      addSummary(summaryTaskId, content);
      showToast('小结已保存 🌸');
    }

    editingSummaryId = null;
    document.getElementById('summaryContent').value = '';
    const task = getTask(summaryTaskId);
    if (task) renderSummaryList(task);
    refreshUI();
  }

  // ==================== AI 总结模态框 ====================
  function openAIModal() {
    // 重置界面
    document.getElementById('aiManualInput').value = '';
    document.getElementById('aiLoading').classList.add('hidden');
    document.getElementById('aiResult').classList.add('hidden');
    document.getElementById('aiEmpty').classList.add('hidden');
    document.getElementById('aiResult').innerHTML = '';
    document.getElementById('btnAIGenerate').classList.remove('hidden');
    renderAITaskPicker();
    renderAIHistory();
    openModal('modalAI');
  }

  function renderAITaskPicker() {
    const container = document.getElementById('aiTaskPicker');
    const today = new Date().toISOString().split('T')[0];

    // 收集所有有内容的任务（有小结的、进行中的、最近完成的）
    const candidates = appData.tasks.filter(t =>
      t.status !== 'on-hold' && (
        t.status === 'in-progress' ||
        t.status === 'completed' ||
        (t.summaries && t.summaries.length > 0) ||
        t.createdAt.split('T')[0] === today
      )
    );

    if (candidates.length === 0) {
      container.innerHTML = '<p class="ai-task-picker-empty">暂无任务可供选择，先去创建一些任务吧 🌸</p>';
      return;
    }

    const statusLabels = { 'pending': '待完成', 'in-progress': '进行中', 'completed': '已完成' };
    const statusColors = { 'pending': '#D4A06A', 'in-progress': '#6BA8D4', 'completed': '#6BA88A' };

    container.innerHTML = candidates.map(t => {
      const isToday = t.createdAt.split('T')[0] === today ||
                      t.actualDate === today ||
                      (t.summaries && t.summaries.length > 0);
      return `
        <label class="ai-task-picker-item">
          <input type="checkbox" value="${t.id}" ${isToday ? 'checked' : ''} class="ai-task-check">
          <div class="ai-task-picker-info">
            <div class="ai-task-picker-title">${escapeHtml(t.title)}</div>
            <div class="ai-task-picker-meta">${formatDateFull(t.createdAt)} · ${t.summaries ? t.summaries.length : 0}条小结</div>
          </div>
          <span class="ai-task-picker-badge" style="background:${statusColors[t.status] || '#C0A0C0'}20;color:${statusColors[t.status] || '#8A7A9A'}">${statusLabels[t.status] || t.status}</span>
        </label>
      `;
    }).join('');
  }

  function getSelectedTaskIds() {
    const checks = document.querySelectorAll('.ai-task-check:checked');
    return Array.from(checks).map(cb => cb.value);
  }

  function renderAIHistory() {
    const container = document.getElementById('aiHistory');
    if (!container) return;

    if (aiSummaries.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="ai-history-section">
        <h3>📚 历史总结 (${aiSummaries.length})</h3>
        ${aiSummaries.map((s, idx) => `
          <div class="ai-history-item" data-idx="${idx}">
            <div class="ai-history-header">
              <span class="ai-history-date">${formatDateFull(s.createdAt)}</span>
              <span class="ai-history-tag">${s.type === 'ai' ? '🤖 AI' : '📋 本地'}</span>
            </div>
            <div class="ai-history-preview" id="aiHistoryPreview${idx}"></div>
            <div class="ai-history-actions">
              <button class="ai-history-btn" data-action="view" data-idx="${idx}">👁️ 查看</button>
              <button class="ai-history-btn ai-history-delete" data-action="delete" data-idx="${idx}">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // 预览截取前100字纯文本
    aiSummaries.forEach((s, idx) => {
      const preview = document.getElementById('aiHistoryPreview' + idx);
      if (preview) {
        const text = s.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        preview.textContent = text.substring(0, 100) + (text.length > 100 ? '...' : '');
      }
    });

    // 事件绑定
    container.querySelectorAll('[data-action="view"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        document.getElementById('btnAIGenerate').classList.add('hidden');
        document.getElementById('aiResult').innerHTML = aiSummaries[idx].html;
        document.getElementById('aiResult').classList.remove('hidden');
        document.getElementById('aiEmpty').classList.add('hidden');
        document.getElementById('aiLoading').classList.add('hidden');
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        aiSummaries.splice(idx, 1);
        saveAISummaries();
        renderAIHistory();
        showToast('历史记录已删除');
      });
    });
  }

  async function doAISummary() {
    const manualInput = document.getElementById('aiManualInput').value.trim();
    const selectedIds = getSelectedTaskIds();

    // 隐藏生成按钮，显示加载状态
    document.getElementById('btnAIGenerate').classList.add('hidden');
    document.getElementById('aiLoading').classList.remove('hidden');
    document.getElementById('aiEmpty').classList.add('hidden');
    document.getElementById('aiResult').classList.add('hidden');

    const result = await generateAISummary(manualInput, selectedIds);

    document.getElementById('aiLoading').classList.add('hidden');

    if (result.type === 'empty') {
      document.getElementById('aiEmpty').classList.remove('hidden');
    } else if (result.type === 'error') {
      document.getElementById('aiResult').innerHTML = `
        <div class="ai-result-section" style="background:#FFF0F0;border:1px solid #F5D0D0;border-radius:var(--radius-md);padding:16px;">
          <h3 style="color:#C56A6A;">❌ API 请求失败</h3>
          <p style="font-size:var(--font-sm);color:#A06060;margin-top:8px;">${escapeHtml(result.message)}</p>
        </div>
        <div class="ai-result-section" style="margin-top:12px;">
          <h3>💡 可能的原因</h3>
          <ul style="font-size:var(--font-sm);color:var(--text-secondary);">
            <li>浏览器 CORS 跨域限制（最常见）—— DeepSeek API 不允许从 localhost 页面直接调用</li>
            <li>API Key 无效或已过期</li>
            <li>网络连接问题</li>
          </ul>
        </div>
        <div class="ai-result-section" style="margin-top:12px;">
          <h3>🔧 解决方案</h3>
          <p style="font-size:var(--font-sm);color:var(--text-primary);">浏览器因为安全策略阻止了跨域请求。如果你在用 Chrome 做本地开发，可以用以下命令启动一个允许跨域的浏览器：</p>
          <pre style="background:var(--bg-secondary);padding:12px;border-radius:var(--radius-sm);font-size:11px;overflow-x:auto;margin-top:8px;">chrome.exe --disable-web-security --user-data-dir="C:/chrome-dev"</pre>
          <p style="font-size:11px;color:var(--text-light);margin-top:6px;">⚠️ 仅用于本地开发，用完记得关掉这个窗口。</p>
        </div>
      `;
      document.getElementById('aiResult').classList.remove('hidden');
    } else {
      const renderedHtml = result.html;
      document.getElementById('aiResult').innerHTML = renderedHtml;
      document.getElementById('aiResult').classList.remove('hidden');

      // 持久化保存（保存渲染后的 HTML）
      const summaryRecord = {
        id: 'aisum_' + Date.now(),
        html: renderedHtml,
        md: result.html,
        type: result.type,
        createdAt: now(),
        manualInput: manualInput || ''
      };
      aiSummaries.unshift(summaryRecord);
      if (aiSummaries.length > 30) aiSummaries = aiSummaries.slice(0, 30);
      saveAISummaries();
      renderAIHistory();
    }
  }

  // ==================== 归档模态框 ====================
  let currentArchiveTab = 'archive-tasks';

  function openArchiveModal() {
    openModal('modalArchive');
    currentArchiveTab = 'archive-tasks';
    document.querySelectorAll('.archive-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === currentArchiveTab));
    renderArchiveViews();
  }

  function switchArchiveTab(tab) {
    currentArchiveTab = tab;
    document.querySelectorAll('.archive-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('archiveSearch').value = '';
    renderArchiveViews();
  }

  function renderArchiveViews(filter = '') {
    document.getElementById('archiveList').classList.add('hidden');
    document.getElementById('archiveAIList').classList.add('hidden');
    document.getElementById('archiveSkillList').classList.add('hidden');

    if (currentArchiveTab === 'archive-tasks') {
      document.getElementById('archiveList').classList.remove('hidden');
      renderTaskArchive(filter);
    } else if (currentArchiveTab === 'archive-ai') {
      document.getElementById('archiveAIList').classList.remove('hidden');
      renderAIArchive(filter);
    } else {
      document.getElementById('archiveSkillList').classList.remove('hidden');
      renderSkillArchive(filter);
    }
  }

  function renderTaskArchive(filter = '') {
    const container = document.getElementById('archiveList');
    let items = archivedTasks;

    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      items = items.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state">' + getEmptyIconHTML() + '<p>暂无任务归档</p></div>';
      return;
    }

    container.innerHTML = items.map(t => `
      <div class="archive-item">
        <div class="archive-info">
          <div class="archive-title">${escapeHtml(t.title)}</div>
          <div class="archive-meta">
            ${formatDateFull(t.archivedAt || t.createdAt)} &nbsp;·&nbsp;
            ${(t.tags || []).slice(0, 3).map(tag => escapeHtml(tag)).join(' · ')}
          </div>
        </div>
        <div class="archive-item-actions">
          <button class="btn-restore" data-id="${t.id}">🔄 恢复</button>
          <button class="btn-archive-delete" data-id="${t.id}">🗑️</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-restore').forEach(btn => {
      btn.addEventListener('click', () => {
        restoreTask(btn.dataset.id);
        renderArchiveViews(document.getElementById('archiveSearch').value);
        refreshUI();
        showToast('任务已恢复 🌸');
      });
    });

    container.querySelectorAll('.btn-archive-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        showConfirm('永久删除此归档任务？不可恢复。', () => {
          archivedTasks = archivedTasks.filter(t => t.id !== btn.dataset.id);
          saveArchive();
          renderArchiveViews(document.getElementById('archiveSearch').value);
          showToast('已永久删除');
        });
      });
    });
  }

  function renderAIArchive(filter = '') {
    const container = document.getElementById('archiveAIList');
    let items = [...aiSummaries];

    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      items = items.filter(s => {
        const text = s.html.replace(/<[^>]+>/g, ' ').toLowerCase();
        return text.includes(q) || (s.manualInput || '').toLowerCase().includes(q);
      });
    }

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state">' + getEmptyIconHTML() + '<p>暂无 AI 总结归档</p></div>';
      return;
    }

    container.innerHTML = items.map((s, idx) => {
      const text = s.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `
        <div class="archive-item">
          <div class="archive-info">
            <div class="archive-title">✨ ${formatDateFull(s.createdAt)} 学习总结</div>
            <div class="archive-meta">
              ${s.type === 'ai' ? '🤖 AI 生成' : '📋 本地智能'} &nbsp;·&nbsp;
              ${text.substring(0, 40)}...
            </div>
          </div>
          <div class="archive-item-actions">
            <button class="btn-restore" data-idx="${idx}">👁️ 查看</button>
            <button class="btn-archive-delete" data-idx="${idx}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-restore').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        closeAllModals();
        openModal('modalAI');
        document.getElementById('btnAIGenerate').classList.add('hidden');
        document.getElementById('aiResult').innerHTML = aiSummaries[idx].html;
        document.getElementById('aiResult').classList.remove('hidden');
        document.getElementById('aiEmpty').classList.add('hidden');
        document.getElementById('aiLoading').classList.add('hidden');
      });
    });

    container.querySelectorAll('.btn-archive-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        showConfirm('永久删除此 AI 总结？', () => {
          aiSummaries.splice(idx, 1);
          saveAISummaries();
          renderArchiveViews(document.getElementById('archiveSearch').value);
          showToast('已永久删除');
        });
      });
    });
  }

  // ==================== 设置模态框 ====================
  function openSettingsModal() {
    document.getElementById('settingApiKey').value = settings.apiKey || '';
    document.getElementById('settingModel').value = settings.model || 'deepseek-v4-flash';
    openModal('modalSettings');
  }

  function saveSettingsFromForm() {
    settings.apiKey = document.getElementById('settingApiKey').value.trim();
    settings.model = document.getElementById('settingModel').value;
    saveSettings();
    showToast('设置已保存 ✅');
    closeAllModals();
  }

  function exportData() {
    const data = {
      tasks: appData.tasks,
      archive: archivedTasks,
      aiSummaries: aiSummaries,
      skills: skills,
      skillResults: skillResults,
      dreams: dreams,
      tags: appData.tags,
      settings: settings,
      exportDate: now(),
      version: '1.1'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purple-workbench-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出 📤');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.tasks || !data.version) throw new Error('Invalid format');

        showConfirm('导入将覆盖当前所有数据，确定继续？', () => {
          appData.tasks = data.tasks || [];
          appData.tags = data.tags || [...DEFAULT_TAGS];
          archivedTasks = data.archive || [];
          aiSummaries = data.aiSummaries || [];
          skills = data.skills || [];
          skillResults = data.skillResults || [];
          dreams = data.dreams || [];
          settings = { ...settings, ...(data.settings || {}) };
          saveData();
          saveArchive();
          saveAISummaries();
          saveSkills();
          saveSkillResults();
          saveDreams();
          saveSettings();
          refreshUI();
          showToast('数据导入成功 🌸');
        });
      } catch (err) {
        showToast('文件格式无效 ❌');
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    showConfirm('⚠️ 此操作将永久删除所有任务、小结、归档、AI总结和Skill数据，不可恢复！确定继续？', () => {
      appData.tasks = [];
      appData.tags = [...DEFAULT_TAGS];
      archivedTasks = [];
      aiSummaries = [];
      skills = [];
      skillResults = [];
      dreams = [];
      saveData();
      saveArchive();
      saveAISummaries();
      saveSkills();
      saveSkillResults();
      saveDreams();
      refreshUI();
      showToast('所有数据已清除');
    });
  }

  // ==================== Skill 矩阵 ====================
  const SKILL_EMOJI_OPTIONS = ['🔍','💻','📐','🎨','🐛','🚀','📊','🔧','📝','🧪','📚','⚙️','🗂️','🔐','🤖','📡'];
  let editingSkillId = null;
  let runningSkill = null;

  function showSkillsPage() {
    // 隐藏任务相关UI，显示Skill页面
    document.getElementById('statsPanel').classList.add('hidden');
    document.querySelector('.search-bar').classList.add('hidden');
    document.getElementById('filterBar').classList.add('hidden');
    document.getElementById('taskList').classList.add('hidden');
    document.getElementById('fabAdd').classList.add('hidden');
    document.getElementById('btnAISummary').classList.add('hidden');
    document.getElementById('skillsPage').classList.remove('hidden');
    renderSkillsGrid();
  }

  function hideSkillsPage() {
    document.getElementById('statsPanel').classList.remove('hidden');
    document.querySelector('.search-bar').classList.remove('hidden');
    document.getElementById('filterBar').classList.remove('hidden');
    document.getElementById('taskList').classList.remove('hidden');
    document.getElementById('fabAdd').classList.remove('hidden');
    document.getElementById('btnAISummary').classList.remove('hidden');
    document.getElementById('skillsPage').classList.add('hidden');
  }

  function renderSkillsGrid() {
    const container = document.getElementById('skillsGrid');
    if (skills.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon"><img src="./icons/welcome.jpg" alt="empty"></div>
        <p>还没有 Skill，点击右上角创建你的第一个技能吧 🌸</p>
      </div>`;
      return;
    }

    container.innerHTML = skills.map(s => `
      <div class="skill-card" data-id="${s.id}">
        <div class="skill-card-header">
          <span class="skill-card-icon">${escapeHtml(s.icon)}</span>
          <div class="skill-card-actions">
            <button class="skill-card-btn" data-action="edit" data-id="${s.id}">✏️</button>
            <button class="skill-card-btn skill-card-btn-del" data-action="delete" data-id="${s.id}">🗑️</button>
          </div>
        </div>
        <div class="skill-card-name">${escapeHtml(s.name)}</div>
        <div class="skill-card-desc">${escapeHtml(s.desc || '暂无描述')}</div>
        <div class="skill-card-footer">
          <span class="skill-card-count">${(skillResults || []).filter(r => r.skillId === s.id).length} 次执行</span>
          <button class="skill-card-run" data-action="run" data-id="${s.id}">⚡ 执行</button>
        </div>
      </div>
    `).join('');

    // 事件绑定
    container.querySelectorAll('[data-action="run"]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openSkillRun(btn.dataset.id); });
    });
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openSkillForm(btn.dataset.id); });
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirm('确定删除此 Skill？相关执行结果保留在归档中。', () => {
          skills = skills.filter(s => s.id !== btn.dataset.id);
          saveSkills();
          renderSkillsGrid();
          showToast('Skill 已删除');
        });
      });
    });
    container.querySelectorAll('.skill-card').forEach(card => {
      card.addEventListener('click', () => openSkillRun(card.dataset.id));
    });
  }

  function openSkillForm(id) {
    editingSkillId = id || null;
    document.getElementById('modalSkillFormTitle').textContent = id ? '编辑 Skill' : '新建 Skill';

    if (id) {
      const s = skills.find(s => s.id === id);
      if (!s) return;
      document.getElementById('skillName').value = s.name;
      document.getElementById('skillDesc').value = s.desc || '';
      document.getElementById('skillPrompt').value = s.prompt || '';
      document.getElementById('skillContent').value = s.content || '';
      document.getElementById('skillUploadName').textContent = s.contentFile || '';
      document.querySelectorAll('.emoji-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.emoji === s.icon);
      });
    } else {
      document.getElementById('skillName').value = '';
      document.getElementById('skillDesc').value = '';
      document.getElementById('skillPrompt').value = '';
      document.getElementById('skillContent').value = '';
      document.getElementById('skillUploadName').textContent = '';
      document.querySelectorAll('.emoji-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.emoji === '🔍');
      });
    }
    openModal('modalSkillForm');
  }

  function saveSkillForm() {
    const name = document.getElementById('skillName').value.trim();
    if (!name) { showToast('请输入 Skill 名称'); return; }
    const icon = document.querySelector('.emoji-option.selected')?.dataset.emoji || '🔍';
    const desc = document.getElementById('skillDesc').value.trim();
    const prompt = document.getElementById('skillPrompt').value.trim();
    const content = document.getElementById('skillContent').value.trim();

    if (editingSkillId) {
      const s = skills.find(s => s.id === editingSkillId);
      if (s) {
        s.name = name; s.icon = icon; s.desc = desc; s.prompt = prompt;
        s.content = content; s.contentFile = document.getElementById('skillUploadName').textContent;
      }
    } else {
      skills.push({ id: 'skill_' + Date.now(), name, icon, desc, prompt, content,
        contentFile: document.getElementById('skillUploadName').textContent, createdAt: now() });
    }
    saveSkills();
    closeAllModals();
    renderSkillsGrid();
    showToast(editingSkillId ? 'Skill 已更新' : 'Skill 已创建 🎯');
    editingSkillId = null;
  }

  function openSkillRun(id) {
    const s = skills.find(s => s.id === id);
    if (!s) return;
    runningSkill = s;

    document.getElementById('modalSkillRunTitle').textContent = s.icon + ' ' + s.name;
    document.getElementById('skillRunInfo').innerHTML = `
      <div class="skill-run-header">
        <span class="skill-run-icon">${escapeHtml(s.icon)}</span>
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <p style="font-size:var(--font-xs);color:var(--text-light)">${escapeHtml(s.desc || '')}</p>
        </div>
      </div>
      ${s.prompt ? `<blockquote>📋 ${escapeHtml(s.prompt)}</blockquote>` : ''}
    `;

    // 展示 Skill 内容
    const contentEl = document.getElementById('skillRunContent');
    if (s.content) {
      contentEl.innerHTML = `
        <div class="skill-run-section">
          <h4>📖 Skill 知识库</h4>
          ${s.contentFile ? `<p style="font-size:10px;color:var(--text-light);display:flex;align-items:center;gap:4px;">📎 来源：${escapeHtml(s.contentFile)}</p>` : ''}
          <div class="skill-run-body">${renderMarkdown(s.content)}</div>
        </div>
      `;
      contentEl.classList.remove('hidden');
    } else {
      contentEl.classList.add('hidden');
    }

    document.getElementById('skillRunInput').value = '';
    document.getElementById('skillRunResult').classList.add('hidden');
    document.getElementById('skillRunLoading').classList.add('hidden');
    document.getElementById('btnSkillExecute').classList.remove('hidden');
    openModal('modalSkillRun');
  }

  async function executeSkill() {
    if (!runningSkill) return;
    const input = document.getElementById('skillRunInput').value.trim();

    // 显示 loading
    document.getElementById('btnSkillExecute').classList.add('hidden');
    document.getElementById('skillRunLoading').classList.remove('hidden');
    document.getElementById('skillRunResult').classList.add('hidden');

    // 构建 prompt
    const skillContent = runningSkill.content || '';
    const prompt = `你是一个专业工具的执行者。请严格按照以下 Skill 的定义来**执行这个 Skill**，将用户提交的资料作为输入，输出该 Skill 定义的结果。

【你要执行的 Skill】
名称：${runningSkill.name}
描述：${runningSkill.desc || '无'}
执行规则/知识库：
${skillContent || '（无）'}

【用户提交的输入】
${input || '（用户未提供额外资料）'}

重要：你不是在评审这个 Skill 本身，你是这个 Skill 的执行引擎。请按照 Skill 定义的规则处理用户输入，输出 Skill 最终结果。使用 HTML 格式（div/h4/h5/ul/li/pre/code/blockquote/table），不要用 Markdown。`;

    let resultHtml;
    try {
      resultHtml = await callSkillAPI(prompt);
    } catch (e) {
      resultHtml = `<div class="ai-result-section" style="background:#FFF0F0;border:1px solid #F5D0D0;border-radius:var(--radius-md);padding:16px;">
        <h4 style="color:#C56A6A;">❌ skill执行失败</h4>
        <p style="font-size:var(--font-xs);color:#A06060;">${escapeHtml(e.message)}</p>
        <p style="font-size:10px;color:var(--text-light);margin-top:8px;">💡 请检查 API Key 是否已配置、网络是否正常</p>
      </div>`;
    }

    document.getElementById('skillRunLoading').classList.add('hidden');
    document.getElementById('skillRunResult').innerHTML = resultHtml;
    document.getElementById('skillRunResult').classList.remove('hidden');

    // 保存结果
    const resultRecord = {
      id: 'skres_' + Date.now(),
      skillId: runningSkill.id,
      skillName: runningSkill.name,
      skillIcon: runningSkill.icon,
      input: input,
      result: resultHtml,
      createdAt: now(),
      archived: false
    };
    skillResults.unshift(resultRecord);
    if (skillResults.length > 50) skillResults = skillResults.slice(0, 50);
    saveSkillResults();

    // 加归档按钮
    const archiveBtn = document.createElement('div');
    archiveBtn.style.cssText = 'margin-top:12px;';
    archiveBtn.innerHTML = `<button class="btn-archive-skill" onclick="this.style.display='none';event.stopPropagation();">📁 已自动保存，点击归档</button>`;
    archiveBtn.querySelector('button').addEventListener('click', () => {
      const res = skillResults.find(r => r.id === resultRecord.id);
      if (res) { res.archived = true; saveSkillResults(); showToast('结果已归档 📁'); }
      archiveBtn.querySelector('button').textContent = '✅ 已归档';
    });
    document.getElementById('skillRunResult').appendChild(archiveBtn);
  }

  async function callSkillAPI(prompt) {
    const apiKey = settings.apiKey;
    if (!apiKey || !apiKey.trim()) {
      // 本地 fallback
      return `<div class="ai-result-section"><h4>⚡ 本地分析结果</h4>
        <blockquote>未配置 API Key，使用本地智能模式。</blockquote>
        <p>Skill 已记录。如需 AI 深度分析，请在 设置 → DeepSeek API Key 中填入密钥后重试。</p>
        <p style="font-size:10px;color:var(--text-light);">💡 提示：Skill 内容和参数已保存到归档，配好 API Key 后可随时重新执行。</p>
      </div>`;
    }

    const baseUrl = 'https://api.deepseek.com';
    const model = settings.model || 'deepseek-v4-flash';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: '你是一个 Skill 执行引擎。你不是在评审 Skill 本身，而是根据 Skill 定义的规则处理用户输入，输出该 Skill 的执行结果。回复使用纯 HTML（div/h4/h5/ul/li/pre/code/blockquote/table），禁止 Markdown 和代码块标记。' },
          { role: 'user', content: prompt }
        ],
        thinking: { type: 'disabled' },
        temperature: 0.7,
        max_tokens: 2500,
        stream: false
      })
    });

    if (!response.ok) {
      let errMsg = `API 返回错误 (HTTP ${response.status})`;
      try {
        const errData = await response.json();
        if (errData.error?.message) errMsg = errData.error.message;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '（API 返回了空结果）';
  }

  function renderSkillArchive(filter = '') {
    const container = document.getElementById('archiveSkillList');
    let items = [...skillResults];

    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      items = items.filter(r => r.skillName.toLowerCase().includes(q) || (r.input || '').toLowerCase().includes(q));
    }

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon"><img src="./icons/welcome.jpg" alt="empty"></div>
        <p>暂无 Skill 结果归档</p>
      </div>`;
      return;
    }

    container.innerHTML = items.map(r => `
      <div class="archive-item">
        <div class="archive-info">
          <div class="archive-title">${escapeHtml(r.skillIcon)} ${escapeHtml(r.skillName)}</div>
          <div class="archive-meta">${formatDateFull(r.createdAt)} · ${r.input ? r.input.substring(0, 40) + '...' : '无输入'}</div>
        </div>
        <div class="archive-item-actions">
          <button class="btn-restore" data-id="${r.id}">👁️ 查看</button>
          <button class="btn-archive-delete" data-id="${r.id}">🗑️</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-restore').forEach(btn => {
      btn.addEventListener('click', () => {
        const res = skillResults.find(r => r.id === btn.dataset.id);
        if (res) { alert(`Skill: ${res.skillName}\n\n输入: ${res.input || '无'}\n\n结果: ${res.result}`); }
      });
    });
    container.querySelectorAll('.btn-archive-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        showConfirm('永久删除此 Skill 结果？', () => {
          skillResults = skillResults.filter(r => r.id !== btn.dataset.id);
          saveSkillResults();
          renderArchiveViews(document.getElementById('archiveSearch').value);
          showToast('已永久删除');
        });
      });
    });
  }

  // ==================== 梦境模块 ====================
  const DREAMS_KEY = 'purple_workbench_dreams';
  let dreams = [];
  let editingDreamId = null;
  let weavingDream = null;

  function loadDreams() {
    try { dreams = JSON.parse(localStorage.getItem(DREAMS_KEY)) || []; }
    catch (e) { dreams = []; }
  }

  function saveDreams() { localStorage.setItem(DREAMS_KEY, JSON.stringify(dreams)); }

  function showDreamsPage() {
    document.getElementById('statsPanel').classList.add('hidden');
    document.querySelector('.search-bar').classList.add('hidden');
    document.getElementById('filterBar').classList.add('hidden');
    document.getElementById('taskList').classList.add('hidden');
    document.getElementById('fabAdd').classList.add('hidden');
    document.getElementById('skillsPage').classList.add('hidden');
    document.getElementById('dreamsPage').classList.remove('hidden');
    document.getElementById('btnAISummary').classList.add('hidden');
    renderDreamsGrid();
  }

  function hideDreamsPage() {
    document.getElementById('dreamsPage').classList.add('hidden');
  }

  function renderDreamsGrid() {
    const container = document.getElementById('dreamsGrid');
    if (dreams.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon"><img src="./icons/welcome.jpg" alt="empty"></div>
        <p>还没有梦境记录，写下你的第一个梦境吧 🌙</p>
      </div>`;
      return;
    }
    container.innerHTML = dreams.map(d => `
      <div class="dream-card" data-id="${d.id}">
        <div class="dream-card-header">
          <div class="dream-card-title">${escapeHtml(d.title || '无标题')}</div>
          <div class="dream-card-date">${formatDateFull(d.createdAt)}</div>
        </div>
        <div class="dream-card-preview">${escapeHtml(d.content.substring(0, 200))}${d.content.length > 200 ? '...' : ''}</div>
        <div class="dream-card-footer">
          <span class="dream-card-badge${d.wovenVersion ? ' woven' : ''}">${d.wovenVersion ? '✨ 已织梦' : '📝 草稿'}</span>
          <div class="dream-card-actions">
            <button class="dream-card-btn" data-action="edit" data-id="${d.id}">✏️</button>
            <button class="dream-card-btn" data-action="weave" data-id="${d.id}">🧵 织梦</button>
            <button class="dream-card-btn" data-action="delete" data-id="${d.id}">🗑️</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openDreamForm(btn.dataset.id); });
    });
    container.querySelectorAll('[data-action="weave"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openDreamWeave(btn.dataset.id); });
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showConfirm('永久删除此梦境记录？', () => {
          dreams = dreams.filter(d => d.id !== btn.dataset.id);
          saveDreams(); renderDreamsGrid();
          showToast('梦境已删除');
        });
      });
    });
    container.querySelectorAll('.dream-card').forEach(card => {
      card.addEventListener('click', () => openDreamForm(card.dataset.id));
    });
  }

  function openDreamForm(id) {
    editingDreamId = id || null;
    document.getElementById('modalDreamFormTitle').textContent = id ? '编辑梦境' : '记录梦境';
    if (id) {
      const d = dreams.find(d => d.id === id);
      if (!d) return;
      document.getElementById('dreamTitle').value = d.title || '';
      document.getElementById('dreamContent').value = d.content || '';
    } else {
      document.getElementById('dreamTitle').value = '';
      document.getElementById('dreamContent').value = '';
    }
    openModal('modalDreamForm');
  }

  function saveDreamForm() {
    const content = document.getElementById('dreamContent').value.trim();
    if (!content) { showToast('请写入内容'); return; }
    const title = document.getElementById('dreamTitle').value.trim() || '无标题';

    if (editingDreamId) {
      const d = dreams.find(d => d.id === editingDreamId);
      if (d) { d.title = title; d.content = content; }
    } else {
      dreams.unshift({ id: 'dream_' + Date.now(), title, content, wovenVersion: null, createdAt: now() });
    }
    if (dreams.length > 100) dreams = dreams.slice(0, 100);
    saveDreams(); closeAllModals(); renderDreamsGrid();
    showToast(editingDreamId ? '梦境已更新' : '梦境已保存 🌙');
    editingDreamId = null;
  }

  function openDreamWeave(id) {
    const d = dreams.find(d => d.id === id);
    if (!d) return;
    weavingDream = d;
    document.getElementById('dreamWeaveOriginal').textContent = d.content;
    document.getElementById('dreamWeaveResult').classList.add('hidden');
    document.getElementById('dreamWeaveLoading').classList.add('hidden');
    document.getElementById('btnDreamWeave').classList.remove('hidden');
    document.getElementById('btnDreamWeaveSave').classList.add('hidden');
    openModal('modalDreamWeave');
  }

  async function doDreamWeave() {
    if (!weavingDream) return;
    document.getElementById('btnDreamWeave').classList.add('hidden');
    document.getElementById('dreamWeaveLoading').classList.remove('hidden');

    const apiKey = settings.apiKey;
    if (!apiKey || !apiKey.trim()) {
      document.getElementById('dreamWeaveLoading').classList.add('hidden');
      document.getElementById('dreamWeaveResult').textContent = '💡 未配置 API Key，请先在设置中填入 DeepSeek API Key。';
      document.getElementById('dreamWeaveResult').classList.remove('hidden');
      return;
    }

    try {
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: settings.model || 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: '你是一位文学编辑，擅长将碎片化文字梳理成通顺段落。严格保留原文的核心想法、人物、情节设定，仅理顺语句逻辑、补充自然细节，文风贴合用户原本语感。不浮夸改写、不篡改原创思路。只返回润色后的纯文本，不要解释。' },
            { role: 'user', content: `请将以下碎片化文字整理为通顺完整的段落。保留原文核心想法、人物、情节，只理顺语句、补充自然细节，文风要贴合原作者的语感：\n\n${weavingDream.content}` }
          ],
          thinking: { type: 'disabled' },
          temperature: 0.7, max_tokens: 2000, stream: false
        })
      });
      const data = await resp.json();
      const result = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '（织梦失败）';
      document.getElementById('dreamWeaveLoading').classList.add('hidden');
      document.getElementById('dreamWeaveResult').textContent = result;
      document.getElementById('dreamWeaveResult').classList.remove('hidden');
      document.getElementById('btnDreamWeaveSave').classList.remove('hidden');

      // 临时存结果
      document.getElementById('btnDreamWeaveSave')._wovenText = result;
    } catch (e) {
      document.getElementById('dreamWeaveLoading').classList.add('hidden');
      document.getElementById('dreamWeaveResult').textContent = '织梦失败: ' + e.message;
      document.getElementById('dreamWeaveResult').classList.remove('hidden');
    }
  }

  function saveWovenVersion() {
    const wovenText = document.getElementById('btnDreamWeaveSave')._wovenText;
    if (!wovenText || !weavingDream) return;
    const d = dreams.find(d => d.id === weavingDream.id);
    if (d) { d.wovenVersion = wovenText; saveDreams(); }
    closeAllModals(); renderDreamsGrid();
    showToast('织梦版本已保存 ✨');
    weavingDream = null;
  }

  // ==================== Toast ====================
  let toastTimer;

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2000);
  }

  // ==================== 确认对话框 ====================
  let confirmCallback = null;

  function showConfirm(message, callback) {
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    openModal('modalConfirm');
  }

  // ==================== 事件绑定 ====================
  function bindEvents() {
    // FAB
    document.getElementById('fabAdd').addEventListener('click', () => openTaskModal(null));

    // Search
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    let searchDebounce;

    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      searchClear.classList.toggle('hidden', !searchQuery);
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(refreshUI, 200);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      searchClear.classList.add('hidden');
      refreshUI();
    });

    // AI Summary button
    document.getElementById('btnAISummary').addEventListener('click', openAIModal);
    document.getElementById('btnAIGenerate').addEventListener('click', doAISummary);

    // Filter chips
    document.querySelectorAll('#filterBar .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#filterBar .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        refreshUI();
      });
    });

    // Tag filter toggle
    document.getElementById('btnTagFilter').addEventListener('click', () => {
      document.getElementById('tagFilterPanel').classList.toggle('hidden');
    });

    // Bottom nav
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        currentTab = item.dataset.tab;

        if (currentTab === 'archive') { openArchiveModal(); }
        else if (currentTab === 'skills') { showSkillsPage(); }
        else if (currentTab === 'dreams') { showDreamsPage(); }
        else if (currentTab === 'settings') { openSettingsModal(); }
        else { hideSkillsPage(); hideDreamsPage(); }
        // tasks tab restores default view
      });
    });

    // Task modal
    document.getElementById('modalTaskBack').addEventListener('click', () => closeAllModals());
    document.getElementById('modalTaskSave').addEventListener('click', saveTaskForm);
    document.getElementById('btnAddLink').addEventListener('click', () => {
      taskLinks.push({ label: '', url: '' });
      renderLinks();
    });

    // Tag input
    const tagInput = document.getElementById('tagInput');
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = tagInput.value.trim();
        if (value && !taskTags.includes(value)) {
          taskTags.push(value);
          if (!appData.tags.includes(value)) appData.tags.push(value);
          renderTaskTags();
        }
        tagInput.value = '';
      }
    });

    // Priority buttons
    document.querySelectorAll('#prioritySelector .priority-btn').forEach(btn => {
      btn.addEventListener('click', () => setPriority(btn.dataset.priority));
    });

    // Status buttons
    document.querySelectorAll('#statusSelector .status-btn').forEach(btn => {
      btn.addEventListener('click', () => setStatus(btn.dataset.status));
    });

    // Detail modal
    document.getElementById('modalDetailBack').addEventListener('click', () => closeAllModals());

    // Summary modal
    document.getElementById('modalSummaryBack').addEventListener('click', () => closeAllModals());
    document.getElementById('modalSummarySave').addEventListener('click', saveSummary);

    // AI modal
    document.getElementById('modalAIBack').addEventListener('click', () => closeAllModals());

    // Archive modal
    document.getElementById('modalArchiveBack').addEventListener('click', () => closeAllModals());
    document.getElementById('archiveSearch').addEventListener('input', (e) => {
      renderArchiveViews(e.target.value);
    });

    // Archive tab switching
    document.querySelectorAll('.archive-tab').forEach(tab => {
      tab.addEventListener('click', () => switchArchiveTab(tab.dataset.tab));
    });

    // Settings modal
    document.getElementById('modalSettingsBack').addEventListener('click', () => {
      saveSettingsFromForm();
    });
    document.getElementById('btnExportData').addEventListener('click', exportData);
    document.getElementById('btnImportData').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', (e) => {
      if (e.target.files[0]) importData(e.target.files[0]);
      e.target.value = '';
    });
    document.getElementById('btnClearData').addEventListener('click', clearAllData);

    // Skill bindings
    document.getElementById('btnAddSkill').addEventListener('click', () => openSkillForm(null));
    document.getElementById('modalSkillFormBack').addEventListener('click', closeAllModals);
    document.getElementById('modalSkillFormSave').addEventListener('click', saveSkillForm);
    document.getElementById('modalSkillRunBack').addEventListener('click', closeAllModals);
    document.getElementById('btnSkillExecute').addEventListener('click', executeSkill);

    // Dream bindings
    document.getElementById('btnNewDream').addEventListener('click', () => openDreamForm(null));
    document.getElementById('modalDreamFormBack').addEventListener('click', closeAllModals);
    document.getElementById('modalDreamFormSave').addEventListener('click', saveDreamForm);
    document.getElementById('modalDreamWeaveBack').addEventListener('click', closeAllModals);
    document.getElementById('btnDreamWeave').addEventListener('click', doDreamWeave);
    document.getElementById('btnDreamWeaveSave').addEventListener('click', saveWovenVersion);
    document.getElementById('btnUploadMd').addEventListener('click', () => {
      document.getElementById('skillMdFile').click();
    });
    document.getElementById('skillMdFile').addEventListener('change', () => {
      const file = document.getElementById('skillMdFile').files[0];
      if (!file) return;
      document.getElementById('skillUploadName').textContent = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        document.getElementById('skillContent').value = reader.result;
        showToast('已加载：' + file.name);
      };
      reader.readAsText(file);
    });
    document.querySelectorAll('.emoji-option').forEach(opt => {
      opt.addEventListener('click', () => {
        opt.parentElement.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    // Confirm dialog
    document.getElementById('confirmCancel').addEventListener('click', () => {
      confirmCallback = null;
      closeAllModals();
    });
    document.getElementById('confirmOk').addEventListener('click', () => {
      if (confirmCallback) confirmCallback();
      confirmCallback = null;
      closeAllModals();
    });

    // Modal overlay click to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAllModals();
      });
    });
  }

  // ==================== PWA 注册 ====================
  function registerPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    }
  }

  // ==================== 初始化 ====================
  function init() {
    loadData();
    renderHeaderDate();
    renderStats();
    renderTaskList();
    renderTagFilters();
    bindEvents();
    registerPWA();
    refreshStaticEmptyIcons();
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
