import { Link } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { useTypingFont } from '@/styles/fontStore'
import { getTypingFont } from '@/styles/fonts'
import { themeName } from '@/styles/themes'
import { Kbd } from '@/components/ui/Kbd'
import { Icon } from '@/components/ui/Icon'
import { openCommandPalette } from './paletteStore'

export function Footer() {
  const theme = useSettings((s) => s.theme)
  const font = useTypingFont((f) => f.font)

  return (
    <footer className="app-footer">
      <p className="footer-keys">
        <span>
          <Kbd>tab</Kbd>+<Kbd>enter</Kbd> restart
        </span>
        <span>
          <Kbd>esc</Kbd> commands
        </span>
      </p>
      <div className="footer-meta">
        <button type="button" className="link-btn" onClick={() => openCommandPalette('theme ')} aria-label={`Theme: ${themeName(theme)}. Change theme`}>
          <Icon name="feather" size={14} />
          {themeName(theme)}
        </button>
        <button type="button" className="link-btn" onClick={() => openCommandPalette('typing font ')} aria-label={`Typing font: ${getTypingFont(font).name}. Change font`}>
          {getTypingFont(font).name.toLowerCase()}
        </button>
        <Link to="/about" className="link-btn">
          about
        </Link>
      </div>
    </footer>
  )
}
