/**
 * Maskottchen „Fier" (v4-Library) – portiert aus den Design-Quellen unter Externe/Figur/
 * (mascot-cartoon-v4.jsx, mascot-library.jsx). Posen-Mapping für Tutorial-Keys: tutorial-fier-presets.ts
 *
 * Phase-3-Umbau:
 *  - MascotBase-API mit kompositionellen Sub-Parts (arms / legs / eyes / mouth / accessories).
 *  - v4-Hand/Schuh-Geometrie (flachere Schuhe, solide Handschuhe mit 8 px Outline am Body).
 *  - 14 Posen: welcome, hero, stand, point-down, point-right, point-up, think, idea, thumbs,
 *    cheer, alert, oops, confused, focus, goal.
 */

const MASCOT_COLORS = {
  primary: '#3E4FD6',
  accent: '#F5A524',
  ink: '#111218',
  tongue: '#F07A8E',
  shoe: '#F5A524',
  glove: '#FFFFFF',
} as const

const BODY_OUTLINE = 8

// --------------------------------- Body ---------------------------------

function FourBody({
  fill = MASCOT_COLORS.primary,
  stroke = MASCOT_COLORS.ink,
  strokeWidth = BODY_OUTLINE,
}: {
  fill?: string
  stroke?: string
  strokeWidth?: number
}) {
  const outer = `
    M 128 42
    L 148 42
    Q 160 42 160 54
    L 160 200
    Q 160 214 146 214
    L 128 214
    Q 114 214 114 200
    L 114 166
    L 58 166
    Q 44 166 44 152
    L 44 140
    Q 44 132 50 124
    L 106 50
    Q 112 40 124 40
    Z
  `
  const inner = `
    M 114 78
    L 114 148
    L 68 148
    Z
  `
  return (
    <path
      d={outer + ' ' + inner}
      fill={fill}
      fillRule="evenodd"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  )
}

// --------------------------------- Eyes ---------------------------------

export type EyeLook = 'front' | 'up' | 'left' | 'right' | 'down' | 'closed' | 'wide'

function CartoonEyes({ look = 'front' }: { look?: EyeLook }) {
  if (look === 'closed') {
    return (
      <g stroke={MASCOT_COLORS.ink} strokeWidth="3" strokeLinecap="round">
        <path d="M 119 78 Q 128 84 137 78" fill="none" />
        <path d="M 141 78 Q 150 84 159 78" fill="none" />
      </g>
    )
  }
  const offs: Record<Exclude<EyeLook, 'closed' | 'wide'>, [number, number]> = {
    front: [0, 0],
    up: [0, -1.5],
    left: [-1.5, 0],
    right: [1.5, 0],
    down: [0, 1.5],
  }
  const isWide = look === 'wide'
  const [dx, dy] = isWide ? [0, 0] : offs[look] ?? [0, 0]
  const rx = isWide ? 10 : 9
  const ry = isWide ? 12 : 10.5
  const pr = isWide ? 2.6 : 3.8
  return (
    <g>
      <ellipse cx="128" cy="80" rx={rx} ry={ry} fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="3" />
      <circle cx={128 + dx} cy={81 + dy} r={pr} fill={MASCOT_COLORS.ink} />
      <circle cx={129.5 + dx} cy={79.5 + dy} r="1.4" fill="#fff" />
      <ellipse cx="150" cy="80" rx={rx} ry={ry} fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="3" />
      <circle cx={150 + dx} cy={81 + dy} r={pr} fill={MASCOT_COLORS.ink} />
      <circle cx={151.5 + dx} cy={79.5 + dy} r="1.4" fill="#fff" />
    </g>
  )
}

// --------------------------------- Mouth ---------------------------------

export type MouthVariant = 'smile' | 'grin' | 'o' | 'flat' | 'tongue' | 'small'

function CartoonMouth({ variant = 'smile' }: { variant?: MouthVariant }) {
  if (variant === 'smile') {
    return (
      <g>
        <path
          d="M 128 96 Q 139 112 150 96 Q 152 108 139 114 Q 126 108 128 96 Z"
          fill={MASCOT_COLORS.ink}
        />
        <path
          d="M 132 104 Q 139 114 146 104 Q 147 110 139 112 Q 131 110 132 104 Z"
          fill={MASCOT_COLORS.tongue}
        />
        <rect x="136" y="98" width="4" height="3" rx="0.8" fill="#fff" />
      </g>
    )
  }
  if (variant === 'grin') {
    return (
      <path
        d="M 128 98 Q 139 108 150 98"
        fill="none"
        stroke={MASCOT_COLORS.ink}
        strokeWidth="3"
        strokeLinecap="round"
      />
    )
  }
  if (variant === 'small') {
    return (
      <path
        d="M 134 102 Q 139 106 144 102"
        fill="none"
        stroke={MASCOT_COLORS.ink}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    )
  }
  if (variant === 'flat') {
    return (
      <path
        d="M 130 102 L 148 102"
        fill="none"
        stroke={MASCOT_COLORS.ink}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    )
  }
  if (variant === 'tongue') {
    return (
      <g>
        <path d="M 128 98 Q 139 110 150 98" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="141" cy="108" rx="4.5" ry="3" fill={MASCOT_COLORS.tongue} stroke={MASCOT_COLORS.ink} strokeWidth="1.5" />
      </g>
    )
  }
  // 'o'
  return (
    <g>
      <ellipse cx="139" cy="100" rx="5" ry="6" fill={MASCOT_COLORS.ink} />
      <ellipse cx="139" cy="102" rx="3" ry="3.5" fill={MASCOT_COLORS.tongue} />
    </g>
  )
}

// --------------------------------- Arms ---------------------------------

export type ArmPose =
  | 'neutral'
  | 'wave'
  | 'point-right'
  | 'point-down'
  | 'point-up'
  | 'hips'
  | 'think'
  | 'thumbs-up'
  | 'cheer'

function CartoonArms({ pose = 'neutral' }: { pose?: ArmPose }) {
  const ink = MASCOT_COLORS.ink
  const glove = MASCOT_COLORS.glove
  const gloveR = 8
  const stroke = 4

  if (pose === 'wave') {
    return (
      <g>
        <path d="M 64 140 Q 52 148 48 164" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="47" cy="167" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 41 162 Q 43 164 45 164" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 160 120 Q 176 100 182 74" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="184" cy="70" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 178 66 Q 180 68 182 68" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    )
  }
  if (pose === 'point-right') {
    return (
      <g>
        <path d="M 64 140 Q 52 148 48 164" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="47" cy="167" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 160 126 Q 178 124 192 122" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="194" cy="122" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 198 120 L 204 119" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      </g>
    )
  }
  if (pose === 'point-down') {
    return (
      <g>
        <path d="M 64 140 Q 52 148 48 164" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="47" cy="167" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 160 140 Q 178 168 184 196" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="186" cy="198" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 188 204 L 190 208" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      </g>
    )
  }
  if (pose === 'point-up') {
    return (
      <g>
        <path d="M 64 140 Q 52 148 48 164" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="47" cy="167" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 160 122 Q 172 92 178 50" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="180" cy="46" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 180 38 L 180 32" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      </g>
    )
  }
  if (pose === 'hips') {
    return (
      <g>
        <path d="M 64 140 Q 54 152 58 166" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="59" cy="168" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 160 130 Q 178 138 172 156" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="170" cy="158" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
      </g>
    )
  }
  if (pose === 'think') {
    return (
      <g>
        <path d="M 64 140 Q 54 150 56 166" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="56" cy="168" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 160 120 Q 172 104 168 92" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="168" cy="90" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
      </g>
    )
  }
  if (pose === 'thumbs-up') {
    return (
      <g>
        <path d="M 64 140 Q 52 152 52 170" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="52" cy="172" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 160 132 Q 176 118 184 102" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <g transform="translate(186 102)">
          <circle r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
          <path d="M -1 -8 L -1 -14" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
    )
  }
  if (pose === 'cheer') {
    return (
      <g>
        <path d="M 64 140 Q 48 108 44 68" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="42" cy="64" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 160 122 Q 176 92 180 54" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="182" cy="50" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
      </g>
    )
  }
  // neutral
  return (
    <g>
      <path d="M 64 140 Q 52 152 52 170" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
      <circle cx="52" cy="172" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
      <path d="M 160 140 Q 172 152 172 170" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
      <circle cx="172" cy="172" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
    </g>
  )
}

// --------------------------------- Legs ---------------------------------

export type LegPose = 'stand' | 'walk' | 'wide'

function CartoonLegs({ pose = 'stand' }: { pose?: LegPose }) {
  const ink = MASCOT_COLORS.ink
  const shoe = MASCOT_COLORS.shoe
  const stroke = 4

  if (pose === 'walk') {
    return (
      <g>
        <path d="M 128 214 Q 124 222 116 228" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <ellipse cx="114" cy="230" rx="10" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
        <path d="M 150 214 Q 158 222 164 230" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <ellipse cx="167" cy="232" rx="10" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
      </g>
    )
  }
  if (pose === 'wide') {
    return (
      <g>
        <path d="M 128 214 L 108 234" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <ellipse cx="106" cy="236" rx="12" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
        <path d="M 150 214 L 170 234" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <ellipse cx="172" cy="236" rx="12" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
      </g>
    )
  }
  return (
    <g>
      <path d="M 128 214 L 126 230" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
      <ellipse cx="124" cy="232" rx="11" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
      <path d="M 150 214 L 152 230" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
      <ellipse cx="155" cy="232" rx="11" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
    </g>
  )
}

// --------------------------------- Accessories ---------------------------------

function Shadow() {
  return <ellipse cx="140" cy="240" rx="52" ry="5" fill="#000" opacity="0.14" />
}

function BodyFreckles() {
  const dots: [number, number, number][] = [
    [132, 130, 1.4],
    [148, 180, 1.6],
    [90, 160, 1.3],
    [156, 60, 1.2],
    [154, 120, 1.4],
    [60, 156, 1.2],
    [102, 100, 1.3],
    [144, 200, 1.3],
  ]
  return (
    <g opacity="0.28">
      {dots.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={MASCOT_COLORS.ink} />
      ))}
    </g>
  )
}

function Cheeks() {
  return (
    <g opacity="0.55">
      <ellipse cx="118" cy="94" rx="4.5" ry="2.8" fill="#F07A8E" />
      <ellipse cx="160" cy="94" rx="4.5" ry="2.8" fill="#F07A8E" />
    </g>
  )
}

function Sparkle({ x, y, size = 5 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M 0 -${size} L ${size / 3} -${size / 3} L ${size} 0 L ${size / 3} ${size / 3} L 0 ${size} L -${size / 3} ${size / 3} L -${size} 0 L -${size / 3} -${size / 3} Z`}
        fill={MASCOT_COLORS.accent}
        stroke={MASCOT_COLORS.ink}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </g>
  )
}

function ThoughtBubbles() {
  return (
    <g>
      <circle cx="178" cy="52" r="3" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" />
      <circle cx="188" cy="42" r="4.5" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" />
      <circle cx="200" cy="30" r="7" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" />
    </g>
  )
}

function LightBulb() {
  return (
    <g>
      <path
        d="M 186 30 C 194 30 200 36 200 44 C 200 50 196 54 194 58 L 194 62 L 178 62 L 178 58 C 176 54 172 50 172 44 C 172 36 178 30 186 30 Z"
        fill={MASCOT_COLORS.accent}
        stroke={MASCOT_COLORS.ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="180" y="62" width="12" height="4" fill={MASCOT_COLORS.ink} />
      <path d="M 182 68 L 190 68" stroke={MASCOT_COLORS.ink} strokeWidth="1.5" />
    </g>
  )
}

function AlertBurst() {
  return (
    <g stroke={MASCOT_COLORS.accent} strokeWidth="2.5" strokeLinecap="round">
      <line x1="180" y1="20" x2="184" y2="10" />
      <line x1="196" y1="30" x2="208" y2="28" />
      <line x1="190" y1="48" x2="200" y2="50" />
      <line x1="172" y1="30" x2="164" y2="24" />
    </g>
  )
}

function GoalFlag() {
  return (
    <g>
      <line x1="192" y1="18" x2="192" y2="70" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M 192 20 L 214 28 L 192 36 Z"
        fill={MASCOT_COLORS.accent}
        stroke={MASCOT_COLORS.ink}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </g>
  )
}

// --------------------------------- MascotBase ---------------------------------

export interface MascotBaseProps {
  arms?: ArmPose
  legs?: LegPose
  eyes?: EyeLook
  mouth?: MouthVariant
  accessories?: ('sparkle' | 'thought' | 'bulb' | 'alert' | 'goal')[]
  cheeks?: boolean
  freckles?: boolean
}

export function MascotBase({
  arms = 'neutral',
  legs = 'stand',
  eyes = 'front',
  mouth = 'smile',
  accessories = [],
  cheeks = true,
  freckles = true,
}: MascotBaseProps) {
  return (
    <>
      <FourBody />
      {freckles ? <BodyFreckles /> : null}
      <CartoonArms pose={arms} />
      <CartoonLegs pose={legs} />
      <CartoonEyes look={eyes} />
      {cheeks ? <Cheeks /> : null}
      <CartoonMouth variant={mouth} />
      {accessories.includes('sparkle') ? <Sparkle x={198} y={58} /> : null}
      {accessories.includes('thought') ? <ThoughtBubbles /> : null}
      {accessories.includes('bulb') ? <LightBulb /> : null}
      {accessories.includes('alert') ? <AlertBurst /> : null}
      {accessories.includes('goal') ? <GoalFlag /> : null}
    </>
  )
}

// --------------------------------- Poses ---------------------------------

export type FierPose =
  | 'welcome'
  | 'hero'
  | 'stand'
  | 'point' // Legacy-Alias → point-right
  | 'point-right'
  | 'point-down'
  | 'point-up'
  | 'think'
  | 'idea'
  | 'thumbs'
  | 'cheer'
  | 'alert'
  | 'oops'
  | 'confused'
  | 'focus'
  | 'goal'
  | 'surprised'
  | 'walk'

const POSE_SPEC: Record<FierPose, MascotBaseProps> = {
  welcome: { arms: 'wave', legs: 'stand', eyes: 'front', mouth: 'smile', accessories: ['sparkle'] },
  hero: { arms: 'wave', legs: 'stand', eyes: 'front', mouth: 'smile', accessories: ['sparkle'] },
  stand: { arms: 'neutral', legs: 'stand', eyes: 'up', mouth: 'grin' },
  'point-right': { arms: 'point-right', legs: 'stand', eyes: 'right', mouth: 'smile' },
  'point-down': { arms: 'point-down', legs: 'stand', eyes: 'down', mouth: 'smile' },
  'point-up': { arms: 'point-up', legs: 'stand', eyes: 'up', mouth: 'smile' },
  point: { arms: 'point-right', legs: 'stand', eyes: 'right', mouth: 'smile' },
  think: { arms: 'think', legs: 'stand', eyes: 'up', mouth: 'grin', accessories: ['thought'] },
  idea: { arms: 'point-up', legs: 'stand', eyes: 'up', mouth: 'smile', accessories: ['bulb'] },
  thumbs: { arms: 'thumbs-up', legs: 'stand', eyes: 'front', mouth: 'smile' },
  cheer: { arms: 'cheer', legs: 'wide', eyes: 'front', mouth: 'smile', accessories: ['sparkle'] },
  alert: { arms: 'hips', legs: 'stand', eyes: 'wide', mouth: 'o', accessories: ['alert'] },
  oops: { arms: 'hips', legs: 'stand', eyes: 'closed', mouth: 'small' },
  confused: { arms: 'think', legs: 'stand', eyes: 'up', mouth: 'flat' },
  focus: { arms: 'neutral', legs: 'stand', eyes: 'front', mouth: 'flat' },
  goal: { arms: 'thumbs-up', legs: 'wide', eyes: 'front', mouth: 'grin', accessories: ['goal'] },
  surprised: { arms: 'hips', legs: 'stand', eyes: 'wide', mouth: 'o' },
  walk: { arms: 'neutral', legs: 'walk', eyes: 'right', mouth: 'grin' },
}

export function FierMascot({ size = 72, pose = 'stand' }: { size?: number; pose?: FierPose }) {
  const spec = POSE_SPEC[pose] ?? POSE_SPEC.stand
  const vb = '0 0 220 260'
  const w = size * (220 / 200)
  const h = size * (260 / 200)

  return (
    <svg viewBox={vb} width={w} height={h} aria-hidden className="shrink-0" focusable="false">
      <Shadow />
      <MascotBase {...spec} />
    </svg>
  )
}
