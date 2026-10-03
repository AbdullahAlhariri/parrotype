import { Fragment, type ReactNode } from 'react'
import { LANG_TAGS, type Lang } from '@/types'

const ARABIC_RUN = /([؀-ۿ](?:[؀-ۿ\s،؛]*[؀-ۿ])?)/g

/** Arabic words inside a left-to-right sentence get their own direction and font. */
export function isolateArabic(s: string): ReactNode[] {
  return s.split(ARABIC_RUN).map((part, i) =>
    i % 2 ? (
      <bdi key={i} lang="ar">
        {part}
      </bdi>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

interface Props {
  text: string
  /** language of the words marked *like this* */
  exampleLang: Lang
  /** the text itself is right-to-left (an Arabic explanation) */
  rtl?: boolean
}

/** Inline text where *word* is an example, set in the typing font. */
export function Rich({ text, exampleLang, rtl = false }: Props) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) => {
        if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={i} className="gym-ex" lang={LANG_TAGS[exampleLang]}>
              {part.slice(1, -1)}
            </em>
          )
        }
        return <Fragment key={i}>{rtl ? part : isolateArabic(part)}</Fragment>
      })}
    </>
  )
}

/** A rule: paragraphs split on blank lines. */
export function RuleText({ text, lang, exampleLang, id }: { text: string; lang: Lang; exampleLang: Lang; id?: string }) {
  const rtl = lang === 'ar'
  return (
    <div className="gym-rule-text" id={id} lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : 'ltr'}>
      {text.split(/\n\n+/).map((p, i) => (
        <p key={i}>
          <Rich text={p} exampleLang={exampleLang} rtl={rtl} />
        </p>
      ))}
    </div>
  )
}
