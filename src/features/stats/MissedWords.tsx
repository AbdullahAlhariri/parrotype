import { Fragment } from 'react'
import { useSettings } from '@/state/settings'
import { practiseSet, practiseWordsHref, wrongVersions, type LangFilter, type MissedWord } from './aggregate'
import { plural } from './format'
import { LANG_ADJ, LangTag, Practice, PracticeLink, SectionHead, TypedDiff } from './parts'

const SHOW = 10

export function MissedWords({ words, filter }: { words: MissedWord[]; filter: LangFilter }) {
  const top = words.slice(0, SHOW)
  const current = useSettings((s) => s.lang)
  const set = practiseSet(top, filter === 'all' ? current : filter)
  const n = set.words.length
  const label = n === 1 ? `Practise ${set.mixed ? `this ${LANG_ADJ[set.lang]} word` : 'this word'}` : `Practise these ${n} ${set.mixed ? `${LANG_ADJ[set.lang]} ` : ''}words`
  return (
    <section className="st-section st-words" aria-labelledby="st-words-title">
      <SectionHead
        id="st-words-title"
        title="Most-missed words"
        note={words.length > SHOW ? `The top ${SHOW} of ${words.length} words you have missed.` : undefined}
      />
      {top.length ? (
        <>
          <div className="st-table-scroll">
            <table className="st-table st-words-table">
              <thead>
                <tr>
                  <th scope="col">word</th>
                  <th scope="col" className="num">
                    missed
                  </th>
                  <th scope="col">you typed</th>
                </tr>
              </thead>
              <tbody>
                {top.map((w) => (
                  <tr key={`${w.lang}:${w.word}`}>
                    <th scope="row">
                      <Practice lang={w.lang} className="st-word">
                        {w.word}
                      </Practice>
                      {filter === 'all' && <LangTag lang={w.lang} />}
                    </th>
                    <td className="num tabular" aria-label={plural(w.count, 'time')}>
                      {w.count}
                    </td>
                    <td className="st-typed-cell">
                      {wrongVersions(w).map((t, i) => (
                        <Fragment key={t}>
                          {i > 0 && ' '}
                          <TypedDiff expected={w.word} typed={t} lang={w.lang} />
                        </Fragment>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PracticeLink to={practiseWordsHref(set.words, set.lang)} practiceLang={set.lang} className="btn btn-subtle btn-sm st-cta">
            {label}
          </PracticeLink>
        </>
      ) : (
        <p className="st-empty-line">No problem words yet. Do a few runs and Kees will start a list.</p>
      )}
    </section>
  )
}
