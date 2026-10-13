/*
 * Repetição espaçada (variação simplificada do SM-2, como no Anki).
 *
 * Estado de um item:
 *   ivl    intervalo em dias (0 = ainda em aprendizado)
 *   ease   fator de facilidade (mín. 1.3)
 *   due    timestamp (ms) da próxima revisão
 *   reps   revisões feitas
 *   lapses vezes que esqueceu depois de aprender
 */
(function () {
  const MIN = 60 * 1000;
  const DAY = 24 * 60 * MIN;
  const LEARN_STEP = 10 * MIN;

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function dueInDays(days, now) {
    return startOfDay(now) + days * DAY;
  }

  function fuzz(ivl) {
    if (ivl < 3) return ivl;
    const f = 1 + (Math.random() * 0.1 - 0.05);
    return Math.max(1, Math.round(ivl * f));
  }

  function newState(now) {
    return { ivl: 0, ease: 2.5, due: now + LEARN_STEP, reps: 0, lapses: 0 };
  }

  /* Calcula o próximo intervalo (em dias) sem fuzz — usado também para exibir nos botões. */
  function nextIvl(st, rating) {
    if (rating === 'again') return 0;
    if (st.ivl < 1) {
      return rating === 'easy' ? 4 : 1;
    }
    if (rating === 'hard') return Math.max(st.ivl + 1, Math.round(st.ivl * 1.2));
    if (rating === 'good') return Math.max(st.ivl + 1, Math.round(st.ivl * st.ease));
    return Math.max(st.ivl + 2, Math.round(st.ivl * st.ease * 1.3));
  }

  function grade(st, rating, now) {
    const s = Object.assign({}, st);
    s.reps = (s.reps || 0) + 1;
    s.last = now;
    if (rating === 'again') {
      if (s.ivl >= 1) s.lapses = (s.lapses || 0) + 1;
      s.ease = Math.max(1.3, s.ease - 0.2);
      s.ivl = 0;
      s.due = now + LEARN_STEP;
      return s;
    }
    const ivl = nextIvl(st, rating);
    if (rating === 'hard') s.ease = Math.max(1.3, s.ease - 0.15);
    if (rating === 'easy') s.ease = s.ease + 0.15;
    s.ivl = fuzz(ivl);
    s.due = dueInDays(s.ivl, now);
    return s;
  }

  function fmtIvl(days) {
    if (days < 1) return '10 min';
    if (days === 1) return '1 dia';
    if (days < 100) return days + ' dias';
    if (days < 365) {
      const m = Math.round(days / 30);
      return m + (m === 1 ? ' mês' : ' meses');
    }
    const y = (days / 365).toFixed(1).replace('.0', '');
    return y + (y === '1' ? ' ano' : ' anos');
  }

  /* Nível de domínio para barras de progresso. */
  function level(st) {
    if (!st) return 'new';
    if (st.ivl < 1) return 'learning';
    if (st.ivl < 21) return 'young';
    return 'mature';
  }

  window.SRS = { MIN, DAY, newState, grade, nextIvl, fmtIvl, level, startOfDay };
})();
