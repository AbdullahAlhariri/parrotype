/**
 * Kees the kea, drawn on a 100x100 grid facing right. Groups are named so kees.css can
 * animate them (transform-box: view-box, origins in user units):
 *   .kees-all (hop) > tail, feet, torso, .kees-flash (underwing fan), .kees-wing (+ .kees-lining),
 *   .kees-head (tilt) > .kees-crest, skull, face, .kees-eye > .kees-pupil, .kees-lid,
 *   beak, .kees-chain, .kees-monocle, .kees-glasses
 * Detail drops out below 90px and again below 40px so he stays crisp at 24px.
 */

export type KeesDetail = 's' | 'm' | 'l'

const SCLERA = '#F6F1E4'
const GLINT = '#FFFDF6'

export function KeesArt({ detail, glasses }: { detail: KeesDetail; glasses: 'monocle' | 'reading' }) {
  const small = detail === 's'
  const large = detail === 'l'
  return (
    <g className="kees-all">
      <g className="kees-tail">
        <path d="M38 80 C31 86 23 93 16 98.5 C19.5 99.6 22.5 99.6 25 98.8 C31 94 37 89 43 85 Z" fill="var(--kees-shade)" />
        <path d="M42 82 C37 88 32 94 28 99 C31 99.5 33.5 99 35.5 97.8 C39 93 43 89 47 86 Z" fill="var(--kees-body)" />
      </g>
      {!small && (
        <g className="kees-feet" fill="none" stroke="var(--kees-beak-lo)" strokeWidth="2.4" strokeLinecap="round">
          <path d="M45 89.5 C45 93 46.5 95 49.5 95.2" />
          <path d="M54 88.6 C54 92.2 55.5 94.2 58.5 94.4" />
        </g>
      )}
      <path className="kees-torso" d="M44 46 C30 52 24 70 30 84 C34 92 46 95 55 90 C64 84 67 70 64 58 C62 50 56 46 50 45 Z" fill="var(--kees-body)" />
      {large && (
        <path
          d="M55.5 63 q3 2.2 6 0 M54.5 70 q3 2.2 6 0 M51.5 77 q3 2.2 6 0"
          fill="none"
          stroke="var(--kees-shade)"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity=".55"
        />
      )}
      <g className="kees-flash">
        <path d="M52 50 C43 53 35 64 31.5 85 C38.5 79 46 70 53.5 60 Z" fill="var(--kees-flash)" />
        <path d="M52 50 C46.5 56 41 66 38.5 80 C44.5 74 50 64 54.5 56 Z" fill="var(--kees-flash-2)" />
      </g>
      <g className="kees-wing">
        <path d="M52.5 48.5 C38 50 28 66 24.5 95 C34 90 46 80 54 66 C57.5 60 57 52 52.5 48.5 Z" fill="var(--kees-shade)" />
        <path className="kees-lining" d="M53 50.5 C44 53.5 36 64 31 84 C39 78 47 69 53.4 60 C55.4 56.5 55.4 52.5 53 50.5 Z" fill="var(--kees-flash)" />
        {!small && (
          <g className="kees-quills" fill="none" stroke="var(--kees-body)" strokeWidth="1.2" strokeLinecap="round" opacity=".7">
            <path d="M47.5 62 C42 70 36 79 31.5 88" />
            <path d="M51.5 58 C47.5 66 42.5 74 37.5 82" />
          </g>
        )}
      </g>
      <g className="kees-head">
        <g className="kees-crest" fill="var(--kees-shade)">
          <path className="kees-crest-1" d="M41.5 27 C37.5 24.5 34.5 21 33.5 17 C38 17.5 42.5 20 45.5 23.5 Z" />
          <path className="kees-crest-2" d="M45 21.5 C42.5 17.5 41.5 13.5 42 9.5 C46 11.5 49 15 50.5 19 Z" />
          <path className="kees-crest-3" d="M50.5 18 C50.5 13.5 52 10 54.5 7.2 C56 11 56.5 14.5 56 18 Z" />
        </g>
        <circle cx="56" cy="36" r="20" fill="var(--kees-head)" />
        <ellipse cx="55.5" cy="32" rx="9.5" ry="9" fill="var(--kees-face)" />
        <g className="kees-eye">
          <circle cx="55" cy="31.6" r={small ? 5.4 : 4.9} fill={SCLERA} />
          <g className="kees-pupil">
            <circle cx="55.7" cy="31.6" r={small ? 3.6 : 3.3} fill="var(--kees-eye)" />
            <circle cx="57" cy="30.2" r={small ? 1.3 : 1.15} fill={GLINT} />
          </g>
        </g>
        <g className="kees-lid">
          <circle cx="55" cy="31.6" r={small ? 6 : 5.6} fill="var(--kees-face)" />
          <path d="M49.6 33.4 Q55 37.4 60.4 33.4" fill="none" stroke="var(--kees-shade)" strokeWidth="1.3" strokeLinecap="round" />
        </g>
        <path
          className="kees-beak-lo"
          d="M66.5 39.5 C71 39.5 74.6 41 75.6 44 C72.6 46.8 68.6 46 65.6 43.6 Q64.8 41.4 66.5 39.5 Z"
          fill="var(--kees-beak-lo)"
        />
        <path
          className="kees-beak-up"
          d="M66 23.5 C77 22 85.5 30 86 42 C86.3 49 84.6 54.5 81.6 58.6 C81.4 51.5 79.2 45.4 75 41.6 C72.5 40.2 69.5 39.6 66.4 39.6 C63.6 34.4 63.4 28.6 66 23.5 Z"
          fill="var(--kees-beak)"
        />
        {!small && <circle cx="70" cy="27.4" r="1" fill="var(--kees-beak-lo)" />}
        {glasses === 'monocle' ? (
          <>
            {!small && (
              <path
                className="kees-chain"
                d="M50.8 37.6 C45 44 46.5 54 55 60.5"
                fill="none"
                stroke="var(--kees-ring)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="0.01 2.4"
              />
            )}
            <g className="kees-monocle">
              {!small && (
                <path
                  className="kees-stub"
                  d="M55 23.6 V18.4"
                  fill="none"
                  stroke="var(--kees-ring)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeDasharray="0.01 2.4"
                />
              )}
              <circle
                cx="55"
                cy="31.6"
                r={small ? 8.4 : 8}
                fill="var(--kees-ring)"
                fillOpacity=".14"
                stroke="var(--kees-ring)"
                strokeWidth={small ? 3.4 : 2.4}
              />
              {large && (
                <path d="M50.2 28.2 A5.6 5.6 0 0 1 53.6 25.6" fill="none" stroke={GLINT} strokeOpacity=".7" strokeWidth="1" strokeLinecap="round" />
              )}
            </g>
          </>
        ) : (
          <g
            className="kees-glasses"
            fill="none"
            stroke="var(--kees-ring)"
            strokeWidth={small ? 2.8 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="47.2" y="30" width="15.6" height="9.4" rx="3.6" fill="var(--kees-ring)" fillOpacity=".16" />
            <path d="M62.8 32.4 L66.4 31.2" />
            <path d="M47.2 32.2 L36.8 28.4" />
          </g>
        )}
      </g>
    </g>
  )
}
