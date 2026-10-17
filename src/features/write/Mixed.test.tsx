import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Mixed } from './Mixed'

const html = (text: string) => renderToStaticMarkup(<Mixed text={text} />)

describe('Mixed', () => {
  it('leaves text without Arabic alone', () => {
    expect(html('After ‘hij’: ‘wordt’')).toBe('After ‘hij’: ‘wordt’')
  })

  it('puts a quoted Arabic word in its own right-to-left span, with its quote marks on one line', () => {
    expect(html('The long a is said but not written: ‘⁨هذا⁩’')).toBe(
      'The long a is said but not written: <span class="wp-ar-quote">‘<span class="wp-ar" lang="ar" dir="rtl">هذا</span>’</span>',
    )
  })

  it('keeps a run of Arabic words (and Arabic commas) together', () => {
    expect(html('هذا، هذه، ذلك and أولئك are said with a long a')).toBe(
      '<span><span class="wp-ar" lang="ar" dir="rtl">هذا، هذه، ذلك</span></span> and <span class="wp-ar-quote"><span class="wp-ar" lang="ar" dir="rtl">أولئك</span></span> are said with a long a',
    )
  })
})
