(function () {
  'use strict';

  const DATA = window.MARUGOTO;
  const KI = window.KANJI_INFO || {};
  const STORE_KEY = 'marugoto-a2-v1';
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal-root');

  /* ---------- Utilidades ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = w => String(w).replace(/\[[^\]]*\]/g, '');
  const RUBY_RE = /([㐀-鿿々〆ヶ]+)\[([^\]]+)\]/g;
  const KANJI_RE = /[㐀-鿿々]/;
  function ruby(w, show) {
    const e = esc(w);
    return show ? e.replace(RUBY_RE, '<ruby>$1<rt>$2</rt></ruby>') : e.replace(/\[[^\]]*\]/g, '');
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function dayKey(ts) {
    const d = new Date(ts == null ? Date.now() : ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtWhen(ms) {
    const m = Math.round(ms / 60000);
    if (m < 1) return 'menos de 1 min';
    if (m < 60) return m + ' min';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' h';
    const d = Math.round(h / 24);
    return d + (d === 1 ? ' dia' : ' dias');
  }

  const ICON = {
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>'
  };

  /* ---------- Índice de itens ---------- */
  const ITEMS = [];
  const BY_ID = {};
  const LESSON = {};
  const TOPIC = {};
  DATA.topics.forEach(t => { TOPIC[t.id] = t; });
  DATA.lessons.forEach(L => {
    LESSON[L.id] = L;
    [['vocab', 'v'], ['kanji', 'k']].forEach(([kind, p]) => (L[kind] || []).forEach((it, idx) => {
      const id = 'L' + L.id + ':' + p + ':' + plain(it.w);
      if (BY_ID[id]) { console.warn('ID duplicado:', id); return; }
      const item = Object.assign({}, it, { id, kind, lesson: L.id, order: idx });
      ITEMS.push(item);
      BY_ID[id] = item;
    }));
  });
  const lessonHasData = L => (L.vocab && L.vocab.length) || (L.kanji && L.kanji.length);

  /* ---------- Persistência ---------- */
  const DEFAULT_SETTINGS = { furigana: true, autoAudio: true, batch: 10, reviewLimit: 100 };
  function normalizeDb(d) {
    d = d && typeof d === 'object' ? d : {};
    const sel = d.sel && typeof d.sel === 'object' ? d.sel : {};
    return {
      srs: d.srs && typeof d.srs === 'object' ? d.srs : {},
      stats: { days: (d.stats && d.stats.days && typeof d.stats.days === 'object') ? d.stats.days : {} },
      settings: Object.assign({}, DEFAULT_SETTINGS, d.settings || {}),
      sel: {
        lessons: Array.isArray(sel.lessons) ? sel.lessons.filter(id => LESSON[id]) : [1],
        kinds: ['vocab', 'kanji', 'both'].includes(sel.kinds) ? sel.kinds : 'both'
      }
    };
  }
  function load() {
    try { return normalizeDb(JSON.parse(localStorage.getItem(STORE_KEY))); } catch (e) { return normalizeDb(null); }
  }
  let db = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
    catch (e) { toast('Não foi possível salvar o progresso neste navegador.'); }
  }
  function bump(field, n) {
    const k = dayKey();
    const d = db.stats.days[k] || (db.stats.days[k] = { r: 0, c: 0, n: 0 });
    d[field] = (d[field] || 0) + (n == null ? 1 : n);
  }
  function streak() {
    const days = db.stats.days;
    const active = k => days[k] && (days[k].r || days[k].n);
    let t = Date.now();
    if (!active(dayKey(t))) t -= SRS.DAY;
    let n = 0;
    while (active(dayKey(t))) { n++; t -= SRS.DAY; }
    return n;
  }

  /* ---------- Seleção ---------- */
  const kindOk = i => db.sel.kinds === 'both' || db.sel.kinds === i.kind;
  const selItems = () => ITEMS.filter(i => db.sel.lessons.includes(i.lesson) && kindOk(i));
  const isDue = (i, now) => { const s = db.srs[i.id]; return !!s && s.due <= now; };
  function newItems() {
    const lenOf = i => (LESSON[i.lesson][i.kind] || []).length || 1;
    return selItems().filter(i => !db.srs[i.id]).sort((a, b) =>
      a.lesson - b.lesson || (a.order / lenOf(a)) - (b.order / lenOf(b)) || (a.kind === 'vocab' ? -1 : 1));
  }

  /* ---------- Áudio (síntese de voz do navegador) ---------- */
  let jaVoice = null;
  const hasTTS = 'speechSynthesis' in window;
  function loadVoices() {
    if (!hasTTS) return;
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find(v => /^ja[-_]JP/i.test(v.lang) && /google|natural|online/i.test(v.name))
      || vs.find(v => /^ja/i.test(v.lang)) || null;
  }
  if (hasTTS) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  const ttsOk = () => hasTTS && !!jaVoice;
  function speak(text) {
    if (!hasTTS) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[〜~()（）]/g, ''));
      u.lang = 'ja-JP';
      if (jaVoice) u.voice = jaVoice;
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* sem áudio */ }
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- Exercícios ---------- */
  const EX = {
    'v-mean': { label: 'O que significa?', key: i => i.pt },
    'v-word': { label: 'Como se diz em japonês?', key: i => plain(i.w) },
    'v-listen': { label: 'Ouça. O que significa?', key: i => i.pt },
    'v-type': { label: 'Escreva em japonês (kana)', typed: true },
    'k-mean': { label: 'O que significa?', key: i => i.pt },
    'k-read': { label: 'Qual é a leitura?', key: i => i.r },
    'k-pick': { label: 'Qual é a escrita em kanji?', key: i => i.w },
    'k-type': { label: 'Digite a leitura (kana)', typed: true }
  };
  const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];

  function pickEx(item) {
    const lv = SRS.level(db.srs[item.id]);
    const listen = ttsOk() ? 'v-listen' : 'v-word';
    if (item.kind === 'vocab') {
      if (lv === 'new' || lv === 'learning') return 'v-mean';
      if (lv === 'young') return pickOne(['v-mean', 'v-word', 'v-word', listen]);
      return pickOne(['v-type', 'v-type', listen]);
    }
    if (lv === 'new' || lv === 'learning') return pickOne(['k-mean', 'k-read']);
    if (lv === 'young') return pickOne(['k-read', 'k-read', 'k-pick']);
    return pickOne(['k-type', 'k-type', 'k-pick']);
  }
  const learnEx = item => (item.kind === 'vocab' ? 'v-mean' : 'k-read');

  function sharesKanji(a, b) {
    for (const ch of a) if (KANJI_RE.test(ch) && b.includes(ch)) return true;
    return false;
  }
  function distractors(item, ex, n) {
    const key = EX[ex].key;
    const ans = key(item);
    const seen = new Set([ans]);
    const scored = [];
    ITEMS.forEach(i => {
      if (i.kind !== item.kind || i.id === item.id) return;
      const k = key(i);
      if (seen.has(k)) return;
      seen.add(k);
      let s = Math.random() * 1.5;
      if (i.lesson === item.lesson) s += 1.5;
      else if (db.sel.lessons.includes(i.lesson)) s += 0.8;
      if (i.t && i.t === item.t) s += 1.2;
      if (ex === 'k-pick') {
        if (sharesKanji(i.w, item.w)) s += 2;
        if (i.w.length === item.w.length) s += 0.8;
      }
      if (ex === 'k-read' && Math.abs(i.r.length - item.r.length) <= 1) s += 0.8;
      scored.push([s, i]);
    });
    return scored.sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]);
  }

  function buildQuestion(item, ex) {
    const q = { item, ex, answered: false, correct: false, chosen: -1, typed: '' };
    if (!EX[ex].typed) q.options = shuffle([item].concat(distractors(item, ex, 3)));
    return q;
  }

  function checkTyped(item, val) {
    const v = Kana.normalize(val);
    if (!v) return null;
    const answers = [item.r].concat(item.alt || []);
    if (item.kind === 'vocab') { answers.push(plain(item.w)); if (item.k) answers.push(item.k); }
    return answers.map(Kana.normalize).includes(v);
  }

  /* ---------- Estado da sessão ---------- */
  let view = 'home';
  let S = null;
  let listState = { tab: 'vocab', q: '' };

  function startLearn() {
    const items = newItems().slice(0, db.settings.batch);
    if (!items.length) { toast('Não há palavras novas nas lições selecionadas.'); return; }
    S = { mode: 'learn', phase: 'present', items, pi: 0, queue: shuffle(items.slice()), done: 0, correct: 0, wrong: 0, q: null };
    view = 'study';
    render();
    if (db.settings.autoAudio) speak(items[0].r);
  }

  function startReview() {
    const now = Date.now();
    let due = selItems().filter(i => isDue(i, now));
    if (!due.length) { toast('Nenhuma revisão pendente agora.'); return; }
    due = shuffle(due).sort((a, b) => db.srs[a.id].due - db.srs[b.id].due);
    // embaralha dentro do lote para não seguir sempre a mesma ordem
    const limit = db.settings.reviewLimit > 0 ? db.settings.reviewLimit : due.length;
    S = { mode: 'review', phase: 'quiz', queue: shuffle(due.slice(0, limit)), done: 0, correct: 0, wrong: 0, q: null };
    view = 'study';
    nextQuestion();
  }

  function nextQuestion() {
    if (!S.queue.length) { finishSession(); return; }
    const item = S.queue.shift();
    S.q = buildQuestion(item, S.mode === 'learn' ? learnEx(item) : pickEx(item));
    render();
    if (S.q.ex === 'v-listen') setTimeout(() => speak(item.r), 150);
  }

  function finishSession() {
    if (S.mode === 'learn') {
      const now = Date.now();
      let n = 0;
      S.items.forEach(i => { if (!db.srs[i.id]) { db.srs[i.id] = SRS.newState(now); n++; } });
      bump('n', n);
      save();
    }
    S.phase = 'done';
    S.q = null;
    render();
  }

  function onAnswered() {
    const q = S.q;
    if (q.correct) S.correct++; else S.wrong++;
    if (S.mode === 'review') { bump('r'); if (q.correct) bump('c'); save(); }
    render();
    if (db.settings.autoAudio && q.ex !== 'v-listen') speak(q.item.r);
  }

  function answerOption(idx) {
    const q = S && S.q;
    if (!q || q.answered || !q.options || !q.options[idx]) return;
    const key = EX[q.ex].key;
    q.answered = true;
    q.chosen = idx;
    q.correct = key(q.options[idx]) === key(q.item);
    onAnswered();
  }

  function answerTyped(val) {
    const q = S && S.q;
    if (!q || q.answered) return;
    const ok = checkTyped(q.item, val);
    if (ok === null) return;
    q.answered = true;
    q.typed = Kana.toHiragana(val, true);
    q.correct = ok;
    onAnswered();
  }

  function rate(rating) {
    const q = S && S.q;
    if (!q || !q.answered || S.mode !== 'review') return;
    const now = Date.now();
    const st = db.srs[q.item.id] || SRS.newState(now);
    db.srs[q.item.id] = SRS.grade(st, rating, now);
    save();
    S.done++;
    if (rating === 'again') S.queue.splice(Math.min(S.queue.length, 4), 0, q.item);
    nextQuestion();
  }

  function continueLearn() {
    const q = S.q;
    if (q.correct) S.done++;
    else S.queue.splice(Math.min(S.queue.length, 3), 0, q.item);
    nextQuestion();
  }

  function acceptTypo() {
    const q = S.q;
    if (!q || q.correct) return;
    q.correct = true;
    S.wrong--; S.correct++;
    if (S.mode === 'review') { bump('c'); save(); rate('hard'); }
    else continueLearn();
  }

  function exitSession() {
    if (S && S.mode === 'learn' && S.phase !== 'done' &&
        !confirm('Sair agora? As palavras deste lote ainda não foram salvas como aprendidas.')) return;
    if (hasTTS) speechSynthesis.cancel();
    S = null;
    view = 'home';
    render();
  }

  /* ---------- Renderização: blocos ---------- */
  function fmtKun(k) {
    const [a, b] = k.split('.');
    return esc(a) + (b ? '<span class="oku">' + esc(b) + '</span>' : '');
  }
  function kanjiBreakdown(text) {
    const chars = [];
    for (const ch of plain(text)) if (KI[ch] && !chars.includes(ch)) chars.push(ch);
    if (!chars.length) return '';
    return '<div class="kbreak">' + chars.map(ch => {
      const k = KI[ch];
      return '<div class="kc"><span class="kc-char">' + ch + '</span><div class="kc-info"><b>' + esc(k.pt) + '</b><br>' +
        (k.on.length ? '<span class="rd">音 ' + k.on.map(esc).join('・') + '</span><br>' : '') +
        (k.kun.length ? '<span class="rd">訓 ' + k.kun.map(fmtKun).join('・') + '</span>' : '') +
        '</div></div>';
    }).join('') + '</div>';
  }

  function revealHTML(item) {
    const isK = item.kind === 'kanji';
    const word = isK ? esc(item.w) : ruby(item.w, true);
    const showReading = isK || Kana.normalize(plain(item.w)) !== Kana.normalize(item.r);
    const meta = [item.t, 'Lição ' + item.lesson];
    if (item.k) meta.push('kanji: <span class="jp">' + esc(item.k) + '</span>');
    return '<div class="reveal">' +
      '<div class="rv-head"><span class="rv-word">' + word + '</span>' +
      (hasTTS ? '<button class="audio-btn" data-action="speak" data-text="' + esc(item.r) + '" aria-label="Ouvir pronúncia">' + ICON.sound + '</button>' : '') +
      '</div>' +
      (showReading ? '<div class="rv-reading">' + esc(item.r) + '</div>' : '') +
      '<div class="rv-meaning">' + esc(item.pt) + '</div>' +
      '<div class="rv-meta">' + meta.filter(Boolean).join(' · ') + '</div>' +
      (item.n ? '<div class="rv-note jp">' + esc(item.n) + '</div>' : '') +
      kanjiBreakdown(item.w) +
      '</div>';
  }

  function barHTML(items) {
    const c = { new: 0, learning: 0, young: 0, mature: 0 };
    items.forEach(i => { c[SRS.level(db.srs[i.id])]++; });
    const tot = items.length || 1;
    const seg = (k, color) => c[k] ? '<i style="width:' + (c[k] / tot * 100) + '%;background:var(' + color + ')"></i>' : '';
    return '<div class="bar" title="' + c.learning + ' aprendendo · ' + c.young + ' em revisão · ' + c.mature + ' dominadas · ' + c.new + ' novas">' +
      seg('mature', '--lv-mature') + seg('young', '--lv-young') + seg('learning', '--lv-learning') + '</div>';
  }

  /* ---------- Tela inicial ---------- */
  function renderHome() {
    const now = Date.now();
    const sel = selItems();
    const due = sel.filter(i => isDue(i, now)).length;
    const nNew = sel.filter(i => !db.srs[i.id]).length;
    const learned = ITEMS.filter(i => db.srs[i.id]).length;
    const upcoming = sel.map(i => db.srs[i.id]).filter(s => s && s.due > now).map(s => s.due);
    const nextDue = upcoming.length ? Math.min.apply(null, upcoming) : null;
    const batch = Math.min(db.settings.batch, nNew);
    const kinds = db.sel.kinds;
    const kindsBtn = (v, label) => '<button data-action="kinds" data-v="' + v + '" aria-pressed="' + (kinds === v) + '">' + label + '</button>';

    let html = '<header class="top"><div class="brand"><h1>Marugoto A2 <span class="jp">語彙・漢字</span></h1>' +
      '<p>Vocabulário e kanji por lição, com repetição espaçada</p></div>' +
      '<button class="icon-btn" data-action="settings" aria-label="Configurações">' + ICON.gear + '</button></header>';

    html += '<section class="stats">' +
      '<div class="stat"><b>' + due + '</b><span>revisões pendentes</span></div>' +
      '<div class="stat"><b>' + nNew + '</b><span>novas para aprender</span></div>' +
      '<div class="stat"><b>' + learned + '</b><span>itens estudados</span></div>' +
      '<div class="stat"><b>' + streak() + '</b><span>dias seguidos</span></div></section>';

    html += '<div class="section-title"><h2>O que estudar</h2></div>' +
      '<div class="segmented" role="group" aria-label="Conteúdo">' + kindsBtn('both', 'Ambos') + kindsBtn('vocab', 'Vocabulário') + kindsBtn('kanji', 'Kanji') + '</div>';

    html += '<div class="section-title"><h2>Lições</h2><span>' +
      '<button class="linkish" data-action="sel-all">Todas</button> · <button class="linkish" data-action="sel-none">Nenhuma</button></span></div>' +
      '<div class="legend"><span><i style="background:var(--lv-learning)"></i>Aprendendo</span><span><i style="background:var(--lv-young)"></i>Em revisão</span>' +
      '<span><i style="background:var(--lv-mature)"></i>Dominadas (21+ dias)</span><span><i style="background:var(--lv-new)"></i>Novas</span></div>';

    DATA.topics.forEach(t => {
      const lessons = DATA.lessons.filter(L => L.topic === t.id);
      html += '<div class="topic" style="--tc:' + t.color + '"><div class="topic-head"><span class="tn">TÓPICO ' + t.id + '</span>' +
        '<div class="tt"><b>' + esc(t.jp) + '</b><span>' + esc(t.pt) + '</span></div>' +
        (lessons.some(lessonHasData) ? '<button class="linkish" data-action="sel-topic" data-id="' + t.id + '">selecionar</button>' : '') + '</div>';
      lessons.forEach(L => {
        const has = lessonHasData(L);
        const items = ITEMS.filter(i => i.lesson === L.id && kindOk(i));
        const ld = items.filter(i => isDue(i, now)).length;
        const nv = (L.vocab || []).length, nk = (L.kanji || []).length;
        html += '<label class="lesson' + (has ? '' : ' disabled') + '">' +
          '<input type="checkbox" data-action="toggle-lesson" data-id="' + L.id + '"' + (db.sel.lessons.includes(L.id) ? ' checked' : '') + (has ? '' : ' disabled') + '>' +
          '<div class="lesson-main"><div class="lesson-title"><span class="num">Lição ' + L.id + '</span><span class="jp">' + esc(L.jp) + '</span></div>' +
          '<div class="lesson-sub">' + esc(L.pt) + ' · ' + (has ? nv + ' palavras · ' + nk + ' kanji' : 'em preparação') + '</div>' +
          (has ? barHTML(items) : '') + '</div>' +
          (ld ? '<span class="due-badge" title="revisões pendentes">' + ld + '</span>' : '') +
          '</label>';
      });
      html += '</div>';
    });

    let hint = '';
    if (!db.sel.lessons.length) hint = 'Selecione uma ou mais lições.';
    else if (!due && nextDue) hint = 'Próxima revisão em ' + fmtWhen(nextDue - now) + '.';
    else if (!due && !nNew) hint = 'Tudo em dia nas lições selecionadas!';

    html += '<div class="actionbar"><div class="inner">' +
      '<button class="btn primary grow" data-action="learn"' + (batch ? '' : ' disabled') + '>Aprender <small>' + batch + ' novas</small></button>' +
      '<button class="btn primary grow" data-action="review"' + (due ? '' : ' disabled') + '>Revisar <small>' + due + '</small></button>' +
      '<button class="btn" data-action="list" aria-label="Lista de vocabulário">' + ICON.list + '<span class="sr-only">Lista</span></button>' +
      '</div>' + (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>';

    $app.innerHTML = html;
  }

  /* ---------- Tela de estudo ---------- */
  function studyTop(pct, counter) {
    return '<div class="study-top"><button class="icon-btn" data-action="exit" aria-label="Sair">' + ICON.close + '</button>' +
      '<div class="progress"><div style="width:' + Math.round(pct * 100) + '%"></div></div><span class="counter">' + counter + '</span></div>';
  }

  function renderPresent() {
    const item = S.items[S.pi];
    const last = S.pi === S.items.length - 1;
    $app.innerHTML = studyTop((S.pi + 1) / S.items.length, (S.pi + 1) + ' / ' + S.items.length) +
      '<div class="card"><div class="q-label"><span class="kind-tag">' + (item.kind === 'vocab' ? 'Vocabulário' : 'Kanji') + '</span>Nova palavra — memorize</div>' +
      revealHTML(item).replace('class="reveal"', 'class="reveal" style="border:0;margin:0;padding-top:4px"') +
      '<div class="actions">' +
      '<button class="btn" data-action="prev"' + (S.pi ? '' : ' disabled') + '>Anterior</button>' +
      '<button class="btn primary" data-action="next">' + (last ? 'Começar o teste' : 'Próxima') + '</button>' +
      '</div></div><p class="hint">Teclado: ← → para navegar</p>';
  }

  function promptHTML(q) {
    const i = q.item;
    const fur = db.settings.furigana;
    switch (q.ex) {
      case 'v-mean': return '<div class="prompt' + (plain(i.w).length > 7 ? ' small' : '') + '">' + ruby(i.w, fur) + '</div><div class="prompt-sub">' + esc(i.t || '') + '</div>';
      case 'k-mean':
      case 'k-read':
      case 'k-type': return '<div class="prompt">' + esc(i.w) + '</div><div class="prompt-sub">' + esc(i.t || '') + '</div>';
      case 'v-word':
      case 'v-type': return '<div class="prompt pt">' + esc(i.pt) + '</div><div class="prompt-sub">' + esc(i.t || '') + '</div>';
      case 'v-listen': return '<button class="listen-btn" data-action="speak" data-text="' + esc(i.r) + '" aria-label="Ouvir de novo">' + ICON.sound + '</button><div class="prompt-sub">toque para ouvir de novo</div>';
      case 'k-pick': return '<div class="prompt small">' + esc(i.r) + '</div><div class="prompt-sub">' + esc(i.pt) + '</div>';
    }
    return '';
  }

  function optionLabel(q, o) {
    switch (q.ex) {
      case 'v-word': return ruby(o.w, db.settings.furigana);
      case 'k-read': return esc(o.r);
      case 'k-pick': return esc(o.w);
      default: return esc(o.pt);
    }
  }

  function renderQuiz() {
    const q = S.q;
    const total = S.done + S.queue.length + 1;
    const counter = S.mode === 'learn' ? 'teste ' + (S.done + 1) + ' / ' + S.items.length : (S.done + 1) + ' / ' + total;
    const pct = S.mode === 'learn' ? S.done / S.items.length : S.done / total;
    const jpOpts = q.ex === 'v-word' || q.ex === 'k-read' || q.ex === 'k-pick';

    let body = '<div class="q-label"><span class="kind-tag">' + (q.item.kind === 'vocab' ? 'Vocabulário' : 'Kanji') + '</span>' + EX[q.ex].label + '</div>' + promptHTML(q);

    if (q.options) {
      const key = EX[q.ex].key;
      body += '<div class="options">' + q.options.map((o, idx) => {
        let cls = 'opt' + (jpOpts ? ' jp-opt' : '');
        if (q.answered) {
          if (key(o) === key(q.item)) cls += ' correct';
          else if (idx === q.chosen) cls += ' wrong';
        }
        return '<button class="' + cls + '" data-action="opt" data-i="' + idx + '"' + (q.answered ? ' disabled' : '') + '><span class="k">' + (idx + 1) + '</span>' + optionLabel(q, o) + '</button>';
      }).join('') + '</div>';
    } else {
      const cls = q.answered ? (q.correct ? 'correct' : 'wrong') : '';
      body += '<form class="type-form" data-action="type-form" autocomplete="off">' +
        '<input id="answer" class="' + cls + '" lang="ja" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="digite em romaji ou kana" value="' + esc(q.typed) + '"' + (q.answered ? ' disabled' : '') + '>' +
        (q.answered ? '' : '<button class="btn primary" type="submit">Verificar</button>') + '</form>';
    }

    if (q.answered) {
      body += '<div class="verdict ' + (q.correct ? 'ok' : 'bad') + '">' + (q.correct ? 'Correto!' : 'Não foi dessa vez') + '</div>';
      body += revealHTML(q.item);
      if (S.mode === 'review' && q.correct) {
        const st = db.srs[q.item.id];
        const lbl = r => SRS.fmtIvl(SRS.nextIvl(st, r));
        body += '<div class="actions">' +
          '<button class="btn rate-hard" data-action="rate" data-r="hard">Difícil<small>' + lbl('hard') + '</small></button>' +
          '<button class="btn rate-good" data-action="rate" data-r="good">Bom<small>' + lbl('good') + '</small></button>' +
          '<button class="btn rate-easy" data-action="rate" data-r="easy">Fácil<small>' + lbl('easy') + '</small></button></div>' +
          '<p class="hint">Teclas 1 · 2 (Enter) · 3</p>';
      } else {
        body += '<div class="actions"><button class="btn primary" data-action="continue">Continuar</button></div>';
        if (!q.correct && !q.options) body += '<button class="linkish typo-link" data-action="typo">Eu sabia — foi erro de digitação</button>';
        if (!q.correct && S.mode === 'review') body += '<p class="hint">Este item volta daqui a pouco nesta sessão.</p>';
      }
    } else if (q.options) {
      body += '<p class="hint">Teclas 1–' + q.options.length + ' para responder</p>';
    }

    $app.innerHTML = studyTop(pct, counter) + '<div class="card">' + body + '</div>';
    if (!q.answered && !q.options) {
      const inp = document.getElementById('answer');
      if (inp) inp.focus();
    } else if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }

  function renderDone() {
    const tot = S.correct + S.wrong;
    const pct = tot ? Math.round(S.correct / tot * 100) : 100;
    const now = Date.now();
    const moreNew = Math.min(db.settings.batch, newItems().length);
    const moreDue = selItems().filter(i => isDue(i, now)).length;
    let html = '<div class="card summary">';
    if (S.mode === 'learn') {
      html += '<p>Lote concluído</p><div class="big">' + S.items.length + '</div><p>itens novos entraram nas suas revisões.<br>A primeira revisão aparece em cerca de 10 minutos.</p>' +
        '<p>Acertos no teste: ' + S.correct + ' de ' + tot + ' tentativas (' + pct + '%)</p>';
    } else {
      html += '<p>Revisão concluída</p><div class="big">' + pct + '%</div><p>' + S.correct + ' acertos · ' + S.wrong + ' erros</p>';
    }
    html += '<div class="actions">' +
      '<button class="btn" data-action="home">Início</button>' +
      (moreNew ? '<button class="btn primary" data-action="learn">Aprender mais ' + moreNew + '</button>' : '') +
      (moreDue ? '<button class="btn primary" data-action="review">Revisar ' + moreDue + '</button>' : '') +
      '</div></div>';
    $app.innerHTML = html;
  }

  /* ---------- Lista de vocabulário ---------- */
  function renderList() {
    $app.innerHTML = '<header class="top"><button class="icon-btn" data-action="home" aria-label="Voltar">' + ICON.back + '</button>' +
      '<div class="brand"><h1>Lista de estudo</h1><p>' + (db.sel.lessons.length ? 'Lições selecionadas' : 'Todas as lições') + '</p></div></header>' +
      '<div class="segmented" role="group">' +
      '<button data-action="list-tab" data-v="vocab" aria-pressed="' + (listState.tab === 'vocab') + '">Vocabulário</button>' +
      '<button data-action="list-tab" data-v="kanji" aria-pressed="' + (listState.tab === 'kanji') + '">Kanji</button></div>' +
      '<input class="search" id="search" type="search" placeholder="Buscar (português, kana ou kanji)" value="' + esc(listState.q) + '">' +
      '<div id="list-results">' + listResultsHTML() + '</div>';
  }

  function listResultsHTML() {
    const lessons = (db.sel.lessons.length ? db.sel.lessons.slice().sort((a, b) => a - b) : DATA.lessons.map(L => L.id))
      .map(id => LESSON[id]).filter(lessonHasData);
    const q = Kana.normalize(listState.q);
    const qRaw = listState.q.trim().toLowerCase();
    const chipTxt = { new: 'Nova', learning: 'Aprendendo', young: 'Em revisão', mature: 'Dominada' };

    let html = '';
    let any = false;
    lessons.forEach(L => {
      const items = ITEMS.filter(i => i.lesson === L.id && i.kind === listState.tab).filter(i => {
        if (!qRaw) return true;
        return i.pt.toLowerCase().includes(qRaw) || (q && (Kana.normalize(i.r).includes(q) || Kana.normalize(plain(i.w)).includes(q))) ||
          plain(i.w).includes(listState.q.trim()) || (i.k && i.k.includes(listState.q.trim()));
      });
      if (!items.length) return;
      any = true;
      html += '<h3 class="list-lesson">Lição ' + L.id + '<span>' + esc(L.jp) + '</span></h3><div class="vlist">';
      items.forEach(i => {
        const lv = SRS.level(db.srs[i.id]);
        const st = db.srs[i.id];
        const due = st && st.ivl >= 1 ? ' · ' + SRS.fmtIvl(st.ivl) : '';
        html += '<div class="vrow"><div class="vcol"><div class="vw">' + (i.kind === 'kanji' ? esc(i.w) : ruby(i.w, db.settings.furigana)) + '</div>' +
          '<div class="vr">' + esc(i.r) + (i.k ? ' · ' + esc(i.k) : '') + '</div></div>' +
          '<div class="vm">' + esc(i.pt) + '<small>' + esc(i.t || '') + ' <span class="chip ' + lv + '" title="intervalo atual">' + chipTxt[lv] + due + '</span></small></div>' +
          (hasTTS ? '<button class="audio-btn" data-action="speak" data-text="' + esc(i.r) + '" aria-label="Ouvir">' + ICON.sound + '</button>' : '') +
          '</div>';
      });
      html += '</div>';
    });
    if (!any) html += '<div class="empty">Nada encontrado.</div>';
    return html;
  }

  /* ---------- Configurações ---------- */
  function openSettings() {
    const s = db.settings;
    const opt = (vals, cur, fmt) => vals.map(v => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + fmt(v) + '</option>').join('');
    $modal.innerHTML = '<div class="modal-back" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-label="Configurações">' +
      '<h2>Configurações <button class="icon-btn" data-action="close-modal" aria-label="Fechar">' + ICON.close + '</button></h2>' +
      '<label class="setting"><span>Mostrar furigana<small>Leitura sobre os kanji no vocabulário</small></span><input type="checkbox" class="switch" data-setting="furigana"' + (s.furigana ? ' checked' : '') + '></label>' +
      '<label class="setting"><span>Áudio automático<small>' + (ttsOk() ? 'Pronuncia a palavra ao mostrar a resposta' : 'Nenhuma voz japonesa encontrada neste navegador') + '</small></span><input type="checkbox" class="switch" data-setting="autoAudio"' + (s.autoAudio ? ' checked' : '') + '></label>' +
      '<label class="setting"><span>Palavras novas por lote</span><select data-setting="batch">' + opt([5, 10, 15, 20], s.batch, v => v) + '</select></label>' +
      '<label class="setting"><span>Máximo de revisões por sessão</span><select data-setting="reviewLimit">' + opt([20, 50, 100, 0], s.reviewLimit, v => v ? v : 'sem limite') + '</select></label>' +
      '<div class="group-title">Backup do progresso</div>' +
      '<p class="hint" style="text-align:left;margin:0 0 10px">O progresso fica salvo só neste navegador. Exporte um arquivo para guardar ou levar a outro aparelho.</p>' +
      '<div class="row"><button class="btn" data-action="export">Exportar</button>' +
      '<button class="btn" data-action="import">Importar</button>' +
      '<button class="btn danger" data-action="reset">Apagar progresso</button></div>' +
      '<input type="file" id="import-file" accept="application/json,.json" hidden>' +
      '</div></div>';
  }
  function closeModal() { $modal.innerHTML = ''; }

  function exportData() {
    const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'marugoto-a2-progresso-' + dayKey() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function importData(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || typeof d.srs !== 'object') throw new Error('formato');
        if (!confirm('Substituir o progresso atual pelo do arquivo?')) return;
        db = normalizeDb(d);
        save();
        closeModal();
        render();
        toast('Progresso importado.');
      } catch (e) { toast('Arquivo inválido.'); }
    };
    r.readAsText(file);
  }

  /* ---------- Render principal ---------- */
  function render() {
    if (view === 'home') renderHome();
    else if (view === 'list') renderList();
    else if (view === 'study' && S) {
      if (S.phase === 'present') renderPresent();
      else if (S.phase === 'done') renderDone();
      else renderQuiz();
    }
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    if (a === 'close-modal') {
      if (e.target === t || t.tagName === 'BUTTON') closeModal();
      return;
    }
    if (t.tagName === 'INPUT' || t.tagName === 'FORM') return;
    switch (a) {
      case 'kinds': db.sel.kinds = t.dataset.v; save(); render(); break;
      case 'sel-all': db.sel.lessons = DATA.lessons.filter(lessonHasData).map(L => L.id); save(); render(); break;
      case 'sel-none': db.sel.lessons = []; save(); render(); break;
      case 'sel-topic': {
        const ids = DATA.lessons.filter(L => L.topic === +t.dataset.id && lessonHasData(L)).map(L => L.id);
        const allOn = ids.every(id => db.sel.lessons.includes(id));
        db.sel.lessons = allOn ? db.sel.lessons.filter(id => !ids.includes(id)) : Array.from(new Set(db.sel.lessons.concat(ids)));
        save(); render(); break;
      }
      case 'learn': startLearn(); break;
      case 'review': startReview(); break;
      case 'list': view = 'list'; render(); break;
      case 'list-tab': listState.tab = t.dataset.v; render(); break;
      case 'home': view = 'home'; S = null; render(); break;
      case 'settings': openSettings(); break;
      case 'exit': exitSession(); break;
      case 'speak': speak(t.dataset.text); break;
      case 'prev': if (S.pi > 0) { S.pi--; render(); if (db.settings.autoAudio) speak(S.items[S.pi].r); } break;
      case 'next':
        if (S.pi < S.items.length - 1) { S.pi++; render(); if (db.settings.autoAudio) speak(S.items[S.pi].r); }
        else { S.phase = 'quiz'; nextQuestion(); }
        break;
      case 'opt': answerOption(+t.dataset.i); break;
      case 'rate': rate(t.dataset.r); break;
      case 'continue': S.mode === 'learn' ? continueLearn() : rate('again'); break;
      case 'typo': acceptTypo(); break;
      case 'export': exportData(); break;
      case 'import': document.getElementById('import-file').click(); break;
      case 'reset':
        if (confirm('Apagar todo o progresso? Isso não pode ser desfeito.')) {
          db = normalizeDb({ settings: db.settings, sel: db.sel });
          save(); closeModal(); render(); toast('Progresso apagado.');
        }
        break;
    }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.action === 'toggle-lesson') {
      const id = +t.dataset.id;
      db.sel.lessons = t.checked ? Array.from(new Set(db.sel.lessons.concat(id))) : db.sel.lessons.filter(x => x !== id);
      save(); render();
    } else if (t.dataset.setting) {
      const k = t.dataset.setting;
      db.settings[k] = t.type === 'checkbox' ? t.checked : +t.value;
      save();
      if (view !== 'study') render();
    } else if (t.id === 'import-file' && t.files && t.files[0]) {
      importData(t.files[0]);
      t.value = '';
    }
  });

  document.addEventListener('submit', e => {
    if (e.target.dataset.action === 'type-form') {
      e.preventDefault();
      const inp = document.getElementById('answer');
      if (inp) answerTyped(inp.value);
    }
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'answer' && !e.isComposing && /[a-zA-Z\-']/.test(t.value)) {
      t.value = Kana.toHiragana(t.value, false);
    } else if (t.id === 'search') {
      listState.q = t.value;
      document.getElementById('list-results').innerHTML = listResultsHTML();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $modal.innerHTML) { closeModal(); return; }
    if (view !== 'study' || !S || $modal.innerHTML) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    let handled = true;
    if (S.phase === 'present') {
      if (e.key === 'ArrowRight' || e.key === 'Enter') document.querySelector('[data-action="next"]').click();
      else if (e.key === 'ArrowLeft') { const b = document.querySelector('[data-action="prev"]'); if (b && !b.disabled) b.click(); }
      else handled = false;
    } else if (S.phase === 'quiz' && S.q) {
      const q = S.q;
      if (!q.answered) {
        const n = parseInt(e.key, 10);
        if (q.options && n >= 1 && n <= q.options.length) answerOption(n - 1);
        else handled = false;
      } else if (S.mode === 'review' && q.correct) {
        if (e.key === '1') rate('hard');
        else if (e.key === '2' || e.key === 'Enter' || e.key === ' ') rate('good');
        else if (e.key === '3') rate('easy');
        else handled = false;
      } else if (e.key === 'Enter' || e.key === ' ') {
        S.mode === 'learn' ? continueLearn() : rate('again');
      } else handled = false;
    } else if (S.phase === 'done' && e.key === 'Enter') {
      view = 'home'; S = null; render();
    } else handled = false;
    if (handled) e.preventDefault();
  });

  // Atualiza contadores quando o usuário volta para a aba
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && view === 'home') render();
  });

  render();
})();
