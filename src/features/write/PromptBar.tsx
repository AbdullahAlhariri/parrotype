import type { Lang } from '@/types'
import { LANG_TAGS, isRtl } from '@/types'
import { Button, Select } from '@/components/ui'
import { PROMPT_KINDS, kindLabel, type PromptKind, type WritingPrompt } from '@/content/prompts'

interface Props {
  lang: Lang
  prompt?: WritingPrompt
  kind: PromptKind | 'all'
  onKind: (k: PromptKind | 'all') => void
  onShuffle: () => void
  /** drop the prompt ("write anything") */
  onFree: () => void
  disabled?: boolean
}

const KIND_OPTIONS: { value: PromptKind | 'all'; label: string }[] = [{ value: 'all', label: 'any kind' }, ...PROMPT_KINDS.map((k) => ({ value: k.id, label: k.label }))]

/** The prompt above the editor: what to write about, how long, and which forms to watch. */
export function PromptBar({ lang, prompt, kind, onKind, onShuffle, onFree, disabled }: Props) {
  const rtl = isRtl(lang)
  return (
    <section className="wp-prompt" aria-label="Writing prompt">
      {prompt ? (
        <>
          <p className="wp-prompt-meta">
            <span className="wp-prompt-kind">{kindLabel(prompt.kind)}</span>
            <span>about {prompt.words} words</span>
            {prompt.watch && (
              <span className="wp-prompt-watch">
                watch{' '}
                <span lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : 'ltr'}>
                  {prompt.watch}
                </span>
              </span>
            )}
          </p>
          <p className="wp-prompt-text" lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : 'ltr'}>
            {prompt.text}
          </p>
        </>
      ) : (
        <>
          <p className="wp-prompt-meta">
            <span className="wp-prompt-kind">no prompt</span>
          </p>
          <p className="wp-prompt-text wp-prompt-text--free">Write about whatever is on your mind. A diary entry, an email you have to send, a rant.</p>
        </>
      )}
      <div className="wp-prompt-tools">
        <Button variant="ghost" size="sm" onClick={onShuffle} disabled={disabled}>
          {prompt ? 'Another prompt' : 'Give me a prompt'}
        </Button>
        <Select className="wp-kind" aria-label="Kind of prompt" options={KIND_OPTIONS} value={kind} onChange={onKind} disabled={disabled} />
        {prompt && (
          <Button variant="ghost" size="sm" onClick={onFree} disabled={disabled}>
            Write anything
          </Button>
        )}
      </div>
    </section>
  )
}
