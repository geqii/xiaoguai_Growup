const VOWELS = [
  { symbol: "/i:/", category: "vowel", sampleWord: "sheep", highlightText: "ee", tip: "长音 i" },
  { symbol: "/ɪ/", category: "vowel", sampleWord: "ship", highlightText: "i", tip: "短音 i" },
  { symbol: "/e/", category: "vowel", sampleWord: "pen", highlightText: "e", tip: "短音 e" },
  { symbol: "/æ/", category: "vowel", sampleWord: "cat", highlightText: "a", tip: "短音 a" },
  { symbol: "/ɑ:/", category: "vowel", sampleWord: "car", highlightText: "ar", tip: "长音 a" },
  { symbol: "/ɒ/", category: "vowel", sampleWord: "dog", highlightText: "o", tip: "短音 o" },
  { symbol: "/ɔ:/", category: "vowel", sampleWord: "horse", highlightText: "or", tip: "长音 o" },
  { symbol: "/ʊ/", category: "vowel", sampleWord: "book", highlightText: "oo", tip: "短音 u" },
  { symbol: "/u:/", category: "vowel", sampleWord: "blue", highlightText: "ue", tip: "长音 u" },
  { symbol: "/ʌ/", category: "vowel", sampleWord: "bus", highlightText: "u", tip: "短音 u" },
  { symbol: "/ɜ:/", category: "vowel", sampleWord: "bird", highlightText: "ir", tip: "卷舌长元音" },
  { symbol: "/ə/", category: "vowel", sampleWord: "teacher", highlightText: "er", tip: "弱读央元音" },
  { symbol: "/eɪ/", category: "vowel", sampleWord: "cake", highlightText: "a", tip: "双元音 eɪ" },
  { symbol: "/aɪ/", category: "vowel", sampleWord: "kite", highlightText: "i", tip: "双元音 aɪ" },
  { symbol: "/ɔɪ/", category: "vowel", sampleWord: "boy", highlightText: "oy", tip: "双元音 ɔɪ" },
  { symbol: "/əʊ/", category: "vowel", sampleWord: "nose", highlightText: "o", tip: "双元音 əʊ" },
  { symbol: "/aʊ/", category: "vowel", sampleWord: "house", highlightText: "ou", tip: "双元音 aʊ" },
  { symbol: "/ɪə/", category: "vowel", sampleWord: "ear", highlightText: "ea", tip: "双元音 ɪə" },
  { symbol: "/eə/", category: "vowel", sampleWord: "hair", highlightText: "air", tip: "双元音 eə" },
  { symbol: "/ʊə/", category: "vowel", sampleWord: "tour", highlightText: "our", tip: "双元音 ʊə" },
];

const CONSONANTS = [
  { symbol: "/p/", category: "consonant", sampleWord: "pen", highlightText: "p", tip: "清辅音 p" },
  { symbol: "/b/", category: "consonant", sampleWord: "bag", highlightText: "b", tip: "浊辅音 b" },
  { symbol: "/t/", category: "consonant", sampleWord: "tea", highlightText: "t", tip: "清辅音 t" },
  { symbol: "/d/", category: "consonant", sampleWord: "dog", highlightText: "d", tip: "浊辅音 d" },
  { symbol: "/k/", category: "consonant", sampleWord: "kite", highlightText: "k", tip: "清辅音 k" },
  { symbol: "/g/", category: "consonant", sampleWord: "go", highlightText: "g", tip: "浊辅音 g" },
  { symbol: "/f/", category: "consonant", sampleWord: "fish", highlightText: "f", tip: "清辅音 f" },
  { symbol: "/v/", category: "consonant", sampleWord: "van", highlightText: "v", tip: "浊辅音 v" },
  { symbol: "/θ/", category: "consonant", sampleWord: "thin", highlightText: "th", tip: "清辅音 θ" },
  { symbol: "/ð/", category: "consonant", sampleWord: "this", highlightText: "th", tip: "浊辅音 ð" },
  { symbol: "/s/", category: "consonant", sampleWord: "sun", highlightText: "s", tip: "清辅音 s" },
  { symbol: "/z/", category: "consonant", sampleWord: "zoo", highlightText: "z", tip: "浊辅音 z" },
  { symbol: "/ʃ/", category: "consonant", sampleWord: "she", highlightText: "sh", tip: "清辅音 ʃ" },
  { symbol: "/ʒ/", category: "consonant", sampleWord: "vision", highlightText: "si", tip: "浊辅音 ʒ" },
  { symbol: "/h/", category: "consonant", sampleWord: "hat", highlightText: "h", tip: "清辅音 h" },
  { symbol: "/m/", category: "consonant", sampleWord: "man", highlightText: "m", tip: "鼻音 m" },
  { symbol: "/n/", category: "consonant", sampleWord: "nose", highlightText: "n", tip: "鼻音 n" },
  { symbol: "/ŋ/", category: "consonant", sampleWord: "sing", highlightText: "ng", tip: "鼻音 ŋ" },
  { symbol: "/l/", category: "consonant", sampleWord: "leg", highlightText: "l", tip: "边音 l" },
  { symbol: "/r/", category: "consonant", sampleWord: "red", highlightText: "r", tip: "卷舌音 r" },
  { symbol: "/j/", category: "consonant", sampleWord: "yes", highlightText: "y", tip: "半元音 j" },
  { symbol: "/w/", category: "consonant", sampleWord: "wet", highlightText: "w", tip: "半元音 w" },
  { symbol: "/tʃ/", category: "consonant", sampleWord: "chair", highlightText: "ch", tip: "清辅音 tʃ" },
  { symbol: "/dʒ/", category: "consonant", sampleWord: "juice", highlightText: "j", tip: "浊辅音 dʒ" },
];

const ALL_PHONICS = [...VOWELS, ...CONSONANTS];
const PHONICS_BY_SYMBOL = Object.fromEntries(ALL_PHONICS.map((item) => [item.symbol, item]));

module.exports = {
  VOWELS,
  CONSONANTS,
  ALL_PHONICS,
  PHONICS_BY_SYMBOL,
};
