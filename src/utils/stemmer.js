// Porter Stemmer implementation for TF-IDF based lorebook

function stem(raw) {
  if (raw.length < 3) return raw;
  let word = raw;
  const first = word[0];
  if (first === 'y') word = first.toUpperCase() + word.slice(1);
  word = steps.reduce((w, step) => step(w), word);
  if (first === 'y') word = first.toLowerCase() + word.slice(1);
  return word;
}

const vowel = '[aeiouy]', consonant = '[^aeiou]';
const o = new RegExp(`^${consonant}[^aeiouy]*${vowel}[^aeiouwxy]$`, 'u');

const replace = (rules) => (word) => {
  for (const [suffix, repl] of Object.entries(rules).sort(([a], [b]) => b.length - a.length)) {
    if (!word.endsWith(suffix)) continue;
    if (Array.isArray(repl) && !repl[0](word.slice(0, -suffix.length))) break;
    return word.slice(0, -suffix.length) + (Array.isArray(repl) ? repl[1] : repl);
  }
  return word;
};

const calcMeasure = (w) =>
  w.split('').reduce((sum, _, i) => sum + (!isCons(w, i) && i + 1 < w.length && isCons(w, i + 1) ? 1 : 0), 0);

const measure = (min) => (w) => calcMeasure(w) > min;

function isCons(w, i) {
  if ('aeiou'.includes(w[i])) return false;
  return w[i] === 'y' ? (i === 0 || !isCons(w, i - 1)) : true;
}

const hasVowel = (w) => w.split('').some((_, i) => !isCons(w, i));

const steps = [
  replace({ sses: 'ss', ies: 'i', ss: 'ss', s: '' }),
  (w) => {
    if (w.endsWith('eed')) return replace({ eed: [measure(0), 'ee'] })(w);
    const upd = replace({ ed: [hasVowel, ''], ing: [hasVowel, ''] })(w);
    if (upd === w) return w;
    const repl = replace({ at: 'ate', bl: 'ble', iz: 'ize' })(upd);
    if (repl !== upd) return repl;
    if (repl.at(-1) === repl.at(-2) && isCons(repl, repl.length - 1) && !['l','s','z'].includes(repl.at(-1)))
      return repl.slice(0, -1);
    if (calcMeasure(repl) === 1 && o.test(repl)) return `${repl}e`;
    return repl;
  },
  replace({ y: [hasVowel, 'i'] }),
  replace({
    ational: [measure(0), 'ate'], tional: [measure(0), 'tion'], enci: [measure(0), 'ence'],
    anci: [measure(0), 'ance'], izer: [measure(0), 'ize'], abli: [measure(0), 'able'],
    alli: [measure(0), 'al'], entli: [measure(0), 'ent'], eli: [measure(0), 'e'],
    ousli: [measure(0), 'ous'], ization: [measure(0), 'ize'], ation: [measure(0), 'ate'],
    ator: [measure(0), 'ate'], alism: [measure(0), 'al'], iveness: [measure(0), 'ive'],
    fulness: [measure(0), 'ful'], ousness: [measure(0), 'ous'], aliti: [measure(0), 'al'],
    iviti: [measure(0), 'ive'], biliti: [measure(0), 'ble'], logi: [measure(0), 'log'],
    bli: [measure(0), 'ble']
  }),
  replace({
    icate: [measure(0), 'ic'], ative: [measure(0), ''], alize: [measure(0), 'al'],
    iciti: [measure(0), 'ic'], ical: [measure(0), 'ic'], ful: [measure(0), ''],
    ness: [measure(0), '']
  }),
  (w) => {
    const nw = replace({
      al: [measure(1), ''], ance: [measure(1), ''], ence: [measure(1), ''],
      er: [measure(1), ''], ic: [measure(1), ''], able: [measure(1), ''],
      ible: [measure(1), ''], ant: [measure(1), ''], ement: [measure(1), ''],
      ment: [measure(1), ''], ent: [measure(1), ''], ou: [measure(1), ''],
      ism: [measure(1), ''], ate: [measure(1), ''], iti: [measure(1), ''],
      ous: [measure(1), ''], ive: [measure(1), ''], ize: [measure(1), '']
    })(w);
    if (nw !== w) return nw;
    return ((w.endsWith('tion') || w.endsWith('sion')) && measure(1)(w.slice(0, -3))) ? w.slice(0, -3) : w;
  },
  (w) => {
    if (!w.endsWith('e')) return w;
    const st = w.slice(0, -1), m = calcMeasure(st);
    return m > 1 || (m === 1 && !o.test(st)) ? st : w;
  },
  (w) => w.endsWith('ll') && measure(1)(w.slice(0, -1)) ? w.slice(0, -1) : w
];

const stopWords = new Set([
  'a','an','and','are','as','at','be','by','for','from','has','he','in','is','it',
  'of','on','that','the','to','was','will','with','you','they','we','been','have',
  'had','were','would','could','should'
]);

export function tokenize(text) {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w)).map(stem);
}

export function buildVocab(texts) {
  const vocab = new Set();
  texts.forEach(t => tokenize(t).forEach(w => vocab.add(w)));
  return vocab;
}

function toVector(text, allTexts, vocab) {
  const words = tokenize(text).filter(w => vocab.has(w));
  const tf = {};
  words.forEach(w => tf[w] = (tf[w] || 0) + 1);

  const vec = {};
  for (const [term, freq] of Object.entries(tf)) {
    const df = allTexts.filter(t => tokenize(t).includes(term)).length;
    vec[term] = (freq / words.length) * Math.log(allTexts.length / (df || 1));
  }
  return vec;
}

export function parse(rawText) {
  const texts = rawText.split('\n\n').map(t => t.trim()).filter(t => t.length > 0);
  const vocab = buildVocab(texts);
  return {
    entries: texts.map(text => ({ text, vector: toVector(text, texts, vocab) })),
    vocab: Array.from(vocab)
  };
}

