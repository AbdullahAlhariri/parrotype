import type { ReactNode } from 'react'
import { Link } from '@/lib/router'
import { Kbd, Kees } from '@/components/ui'
import { openCommandPalette } from '@/components/shell/paletteStore'
import './about.css'

/** keys: groups of combos; join says how the groups relate */
const SHORTCUTS: { keys: string[][]; join?: 'then' | 'or' | 'and'; what: string }[] = [
  { keys: [['tab'], ['enter']], join: 'then', what: 'Restart the test.' },
  { keys: [['esc']], what: 'Open the command palette: every page, theme, font and setting.' },
  { keys: [['ctrl', 'shift', 'p'], ['⌘', 'shift', 'p']], join: 'or', what: 'The command palette again, for people with Esc habits elsewhere.' },
  { keys: [['↑', '↓'], ['enter']], join: 'then', what: 'Move through the palette and pick. Themes preview as you go.' },
  { keys: [['move the mouse']], what: 'Bring the header and footer back after they faded out while you typed.' },
]

const CREDITS: { what: string; who: ReactNode; licence: string }[] = [
  {
    what: 'Word frequencies',
    who: (
      <>
        <a href="https://github.com/hermitdave/FrequencyWords">FrequencyWords</a> by Hermit Dave, built from OpenSubtitles
      </>
    ),
    licence: 'CC BY-SA 4.0',
  },
  {
    what: 'Dutch dictionary',
    who: (
      <>
        <a href="https://www.opentaal.org">OpenTaal</a>, via <a href="https://github.com/wooorm/dictionaries">wooorm/dictionaries</a>
      </>
    ),
    licence: 'BSD-2 / CC BY 3.0',
  },
  {
    what: 'English dictionaries',
    who: (
      <>
        <a href="http://wordlist.aspell.net">SCOWL</a> (US and British), via wooorm/dictionaries
      </>
    ),
    licence: 'MIT / BSD',
  },
  { what: 'Arabic dictionary', who: <a href="https://ayaspell.sourceforge.net">Ayaspell</a>, licence: 'MPL 1.1' },
  { what: 'Spell-check engine', who: 'hunspell-wasm, Hunspell compiled for the browser', licence: 'MPL 1.1' },
  { what: 'Typing font', who: 'Recursive by Arrow Type', licence: 'SIL OFL 1.1' },
  { what: 'Wordmark and big numbers', who: 'Caprasimo by Phaedra Charles and Flavia Zimbardi', licence: 'SIL OFL 1.1' },
  { what: 'Kees’s handwriting', who: 'Shantell Sans by Shantell Martin and Arrow Type', licence: 'SIL OFL 1.1' },
  { what: 'Arabic text', who: 'Noto Naskh Arabic by Google', licence: 'SIL OFL 1.1' },
  { what: 'Other typing fonts', who: 'Atkinson Hyperlegible Mono by the Braille Institute, IBM Plex Mono by IBM', licence: 'SIL OFL 1.1' },
  {
    what: 'Colours',
    who: 'Photo-derived bird palettes: Manu (kea), ochRe (rainbow lorikeet), birdcolors (scarlet macaw)',
    licence: 'tuned for contrast',
  },
]

function Keys({ combo }: { combo: string[] }) {
  if (combo.length === 1 && combo[0].includes(' ')) return <span className="about-gesture">{combo[0]}</span>
  const arrows = combo.every((k) => k === '↑' || k === '↓')
  return (
    <span className="about-combo">
      {combo.map((k, i) => (
        <span key={k}>
          {i > 0 && !arrows && <span className="about-plus">+</span>}
          <Kbd>{k}</Kbd>
        </span>
      ))}
    </span>
  )
}

export default function AboutPage() {
  return (
    <article className="page about-page">
      <header className="about-head">
        <div>
          <h1 className="page-title">About Parrotype</h1>
          <p className="about-lede">
            A typing trainer for one person who makes a lot of typos, in Dutch, English and Arabic. It is named after what it asks you to do:
            copy text letter by letter, like a parrot.
          </p>
        </div>
        <figure className="about-kees">
          <Kees mood="idle" size={132} label="Kees the kea, wearing a monocle" />
        </figure>
      </header>

      <section className="about-section" aria-labelledby="about-method">
        <h2 id="about-method">How it works</h2>
        <dl className="about-method">
          <dt>Accuracy first</dt>
          <dd>
            Speed comes later. Every typo costs a backspace and a retype, so a clean 50 wpm beats a messy 60. The weak-spot drills only ask for more speed after three
            rounds in a row at 97% or better.
          </dd>
          <dt>Two kinds of mistakes</dt>
          <dd>
            A finger slip (<em lang="en">teh</em> for <em lang="en">the</em>, or the key next door) is a motor mistake. It gets short drills built from the keys and
            letter pairs you miss most. A spelling mistake (<em lang="nl">hij word</em>, <em lang="en">recieve</em>) is a knowledge mistake. Copying text hides
            those, because the right spelling is on the screen, so they get dictation, the rule, and repetition.
          </dd>
          <dt>Dictation</dt>
          <dd>
            In <Link to="/listen">parrot says</Link> you hear a sentence and type it from memory. It is the only honest test of spelling.
          </dd>
          <dt>Spaced repetition</dt>
          <dd>
            Words you get wrong go into the mistake nest, five Leitner boxes. Get a word right and it comes back after 1, 3, 7 and then 16 days. Get it wrong and it
            goes back to the first box, ready for your next review. Right after 16 days, and it leaves the nest.
          </dd>
          <dt>Feedback at the right moment</dt>
          <dd>
            In a typing test letters change colour at once, because that is what fingers need. In free writing the notes wait until you say you are done. First only
            the lines with a mistake are marked, so you get a moment to spot it yourself, and then the words are underlined.
          </dd>
          <dt>Only the right spelling, repeated</dt>
          <dd>
            Looking at a misspelling makes it stick, so Kees never repeats your mistake. He repeats the correct word instead: <span lang="nl" className="about-nowrap">wordt. wordt. wordt.</span>
          </dd>
        </dl>
      </section>

      <section className="about-section" aria-labelledby="about-keys">
        <h2 id="about-keys">Keyboard</h2>
        <p className="about-text">
          Everything works without a mouse. The quickest way to anything is the{' '}
          <button type="button" className="about-inline-btn" onClick={() => openCommandPalette()}>
            command palette
          </button>
          .
        </p>
        <table className="about-keys">
          <caption className="visually-hidden">Keyboard shortcuts</caption>
          <thead>
            <tr>
              <th scope="col">Keys</th>
              <th scope="col">What happens</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.what}>
                <td>
                  {s.keys.map((combo, i) => (
                    <span key={i} className="about-key-group">
                      {i > 0 && <span className="about-or">{s.join}</span>}
                      <Keys combo={combo} />
                    </span>
                  ))}
                </td>
                <td>{s.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="about-section" aria-labelledby="about-privacy">
        <h2 id="about-privacy">Privacy</h2>
        <div className="about-text prose">
          <p>
            Everything stays in your browser: settings, stats, the mistakes you make. There is no account, no tracking and no cookies. Apart from loading the app
            itself, nothing needs the internet.
          </p>
          <p>
            The one exception is LanguageTool, and only if you switch it on in <Link to="/settings#checker">settings</Link>. Then the text you write in free-writing
            mode is sent to that server for a second opinion. Typing tests never leave your browser.
          </p>
          <p>
            You can export or delete all of it in <Link to="/settings#data">settings</Link>.
          </p>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-credits">
        <h2 id="about-credits">Credits and licences</h2>
        <table className="about-credits">
          <caption className="visually-hidden">Credits and licences</caption>
          <tbody>
            {CREDITS.map((c) => (
              <tr key={c.what}>
                <th scope="row">{c.what}</th>
                <td>{c.who}</td>
                <td className="about-licence">{c.licence}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="about-text about-note">
          The layout and keyboard habits owe a lot to Monkeytype. The research behind the method, with sources, lives in <code>docs/research</code> in the
          repository: typing pedagogy, Dutch and English error patterns, Arabic typing and the design notes.
        </p>
      </section>

      <section className="about-section about-kea" aria-labelledby="about-kea">
        <h2 id="about-kea">Kees</h2>
        <p className="about-text">
          Kees is a kea. Kea live in the mountains of New Zealand’s South Island and are the world’s only alpine parrots. They are curious, clever and famous for
          taking apart car wipers. His name is Dutch and sounds almost like his species. The monocle is because someone here has to look wise. His olive wings hide a
          bright orange underside, and you will only see it when you set a personal best.
        </p>
      </section>
    </article>
  )
}
