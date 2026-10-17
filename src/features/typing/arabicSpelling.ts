import type { Lang } from '@/types'

/*
 * The Arabic frequency list (src/content/words/ar.json) comes from film subtitles and keeps their
 * spelling slips: hamza left off (انا for أنا) or put where there is none (إبن), ى for a final ي
 * (فى), ه for ة (مره). A spelling trainer must not drill those, so every word drawn from the list
 * goes through this map. Forms that are correct words in their own right are left alone: the
 * imperatives انظر, اذهب, اسمع, اتصل, the past tenses اعتقد, انتهى.
 */
const AR_FIXES: Record<string, string> = {
  // hamza on or under the alif
  ان: 'أن',
  انا: 'أنا',
  انه: 'أنه',
  انها: 'أنها',
  انهم: 'أنهم',
  انك: 'أنك',
  انني: 'أنني',
  اننى: 'أنني',
  اننا: 'أننا',
  اني: 'أني',
  انت: 'أنت',
  انتم: 'أنتم',
  انتي: 'أنت',
  أنتي: 'أنت',
  وانا: 'وأنا',
  وانت: 'وأنت',
  الى: 'إلى',
  الي: 'إلي',
  اليك: 'إليك',
  اليه: 'إليه',
  اذا: 'إذا',
  أذا: 'إذا',
  اذن: 'إذن',
  الا: 'إلا',
  الان: 'الآن',
  الأن: 'الآن',
  اي: 'أي',
  اى: 'أي',
  أى: 'أي',
  او: 'أو',
  ام: 'أم',
  اين: 'أين',
  اجل: 'أجل',
  احد: 'أحد',
  اكثر: 'أكثر',
  ايضا: 'أيضا',
  ايها: 'أيها',
  اخرى: 'أخرى',
  اخر: 'آخر',
  افضل: 'أفضل',
  الافضل: 'الأفضل',
  الامر: 'الأمر',
  الامور: 'الأمور',
  الاشياء: 'الأشياء',
  الاسبوع: 'الأسبوع',
  اليس: 'أليس',
  لان: 'لأن',
  بان: 'بأن',
  امر: 'أمر',
  ابدا: 'أبدا',
  ابي: 'أبي',
  امي: 'أمي',
  اوه: 'أوه',
  اه: 'آه',
  اسف: 'آسف',
  اسفة: 'آسفة',
  اهلا: 'أهلا',
  الهي: 'إلهي',
  // first person present tense: أ + verb
  اريد: 'أريد',
  استطيع: 'أستطيع',
  اكون: 'أكون',
  اكن: 'أكن',
  اقول: 'أقول',
  اشعر: 'أشعر',
  احب: 'أحب',
  احتاج: 'أحتاج',
  اظن: 'أظن',
  اعني: 'أعني',
  ارى: 'أرى',
  اردت: 'أردت',
  اتمنى: 'أتمنى',
  افكر: 'أفكر',
  اقصد: 'أقصد',
  ابقى: 'أبقى',
  اقوم: 'أقوم',
  احاول: 'أحاول',
  ارجوك: 'أرجوك',
  // a hamza where the alif is a plain connecting one
  إمرأة: 'امرأة',
  إبن: 'ابن',
  إثنان: 'اثنان',
  إتفقنا: 'اتفقنا',
  إنتهى: 'انتهى',
  إعتقدت: 'اعتقدت',
  إنتظر: 'انتظر',
  إذهب: 'اذهب',
  إسمع: 'اسمع',
  أنظري: 'انظري',
  الإتصال: 'الاتصال',
  الإنتظار: 'الانتظار',
  // ى written for a final ي
  فى: 'في',
  الذى: 'الذي',
  التى: 'التي',
  لى: 'لي',
  بى: 'بي',
  هى: 'هي',
  معى: 'معي',
  منى: 'مني',
  لكى: 'لكي',
  أبى: 'أبي',
  سيدى: 'سيدي',
  يمكننى: 'يمكنني',
  أننى: 'أنني',
  حتي: 'حتى',
  // ه written for ة, and the hamza of شيء
  هذة: 'هذه',
  مره: 'مرة',
  واحده: 'واحدة',
  جيده: 'جيدة',
  اللعنه: 'اللعنة',
  شئ: 'شيء',
  شيئ: 'شيء',
  الشئ: 'الشيء',
}

/** One word with its spelling corrected; punctuation the generator put round it ("انه،", "(انا)") stays. */
export function fixArabicWord(word: string): string {
  const m = /^(\P{L}*)(\p{L}+)(\P{L}*)$/u.exec(word)
  const fixed = m && AR_FIXES[m[2]]
  return fixed ? m[1] + fixed + m[3] : word
}

/**
 * Words drawn from a frequency list, with Arabic spelling slips corrected. A correction can put
 * the same word twice in a row (ان أن); the second one then trades places with a later word.
 */
export function fixSpelling(words: string[], lang: Lang): string[] {
  if (lang !== 'ar') return words
  const out = words.map(fixArabicWord)
  for (let i = 1; i < out.length; i++) {
    const a = out[i]
    if (a !== out[i - 1]) continue
    const j = out.findIndex((b, k) => k > i + 1 && b !== a && out[k - 1] !== a && out[k + 1] !== a && out[i - 1] !== b && out[i + 1] !== b)
    if (j > 0) [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** A frequency list with the corrections applied and duplicates (ان and أن) merged, rank order kept. */
export const fixWordList = (list: string[], lang: Lang): string[] => (lang === 'ar' ? [...new Set(list.map(fixArabicWord))] : list)
