/* Conversão romaji → hiragana para os campos de digitação e normalização de respostas. */
(function () {
  const T = {
    a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
    ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
    ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
    sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ',
    za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
    ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と',
    da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
    na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
    ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ',
    ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
    pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
    ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
    ya: 'や', yu: 'ゆ', yo: 'よ',
    ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
    wa: 'わ', wi: 'うぃ', we: 'うぇ', wo: 'を',
    kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
    gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
    sha: 'しゃ', shu: 'しゅ', sho: 'しょ', she: 'しぇ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
    ja: 'じゃ', ju: 'じゅ', jo: 'じょ', je: 'じぇ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ', zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ',
    cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', che: 'ちぇ', cya: 'ちゃ', cyu: 'ちゅ', cyo: 'ちょ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
    dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ',
    nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
    hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
    bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
    pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
    mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
    rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
    fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
    thi: 'てぃ', dhi: 'でぃ', vu: 'ゔ',
    xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ',
    la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ',
    xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', lya: 'ゃ', lyu: 'ゅ', lyo: 'ょ',
    xtu: 'っ', xtsu: 'っ', ltu: 'っ', ltsu: 'っ',
    '-': 'ー'
  };
  const VOWELS = 'aiueo';

  /* final=false mantém letras soltas no fim (o usuário ainda está digitando). */
  function toHiragana(input, final) {
    const s = input.toLowerCase();
    let out = '';
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (!/[a-z\-']/.test(c)) { out += input[i]; i++; continue; }

      if (c === 'n') {
        const nx = s[i + 1];
        if (nx === 'n') { out += 'ん'; i += 2; continue; }
        if (nx === "'") { out += 'ん'; i += 2; continue; }
        if (nx === undefined) {
          if (final) { out += 'ん'; i++; } else { out += 'n'; i++; }
          continue;
        }
        if (!VOWELS.includes(nx) && nx !== 'y') { out += 'ん'; i++; continue; }
      }
      // consoante dobrada → っ
      if (c !== 'n' && !VOWELS.includes(c) && c === s[i + 1] && /[a-z]/.test(c)) {
        out += 'っ'; i++; continue;
      }
      let matched = false;
      for (let len = 4; len >= 1; len--) {
        const chunk = s.substr(i, len);
        if (chunk.length === len && T[chunk]) { out += T[chunk]; i += len; matched = true; break; }
      }
      if (matched) continue;
      if (c === "'") { i++; continue; }
      // sem correspondência: mantém (ainda incompleto)
      out += input[i];
      i++;
    }
    return out;
  }

  function kataToHira(s) {
    return s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }

  /* Normaliza para comparar respostas: hiragana, sem espaços nem pontuação. */
  function normalize(s) {
    return kataToHira(toHiragana(String(s || '').trim(), true))
      .replace(/[\s　・〜~()（）.,、。!?！？]/g, '')
      .replace(/\[[^\]]*\]/g, '');
  }

  window.Kana = { toHiragana, kataToHira, normalize };
})();
