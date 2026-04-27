// mascot-library.jsx — Big pose/situation library for "Vier".
// Extends mascot-cartoon-v4.jsx primitives; adds NEW mouths, NEW props,
// NEW poses, each with a situation label + description + tutorial-step tag.
//
// Depends on these globals being already defined (from mascot-cartoon-v4.jsx):
//   FourBody, CartoonEyes, CartoonArms, CartoonLegs,
//   Hand, HandPointing, Shoe, Shadow, BodyFreckles, Cheeks, MASCOT_COLORS

// ─────────────────────────────────────────────────────────────
// Extra mouth variants
// ─────────────────────────────────────────────────────────────
function MouthLib({ variant = 'smile' }) {
  const ink = MASCOT_COLORS.ink;
  const tongue = MASCOT_COLORS.tongue;
  const cx = 139;

  if (variant === 'smile') {
    return (
      <g>
        <path d="M 128 96 Q 139 112 150 96 Q 152 108 139 114 Q 126 108 128 96 Z" fill={ink} />
        <path d="M 132 104 Q 139 114 146 104 Q 147 110 139 112 Q 131 110 132 104 Z" fill={tongue} />
        <rect x="136" y="98" width="4" height="3" rx="0.8" fill="#fff" />
      </g>
    );
  }
  if (variant === 'grin') {
    return <path d="M 128 98 Q 139 108 150 98" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />;
  }
  if (variant === 'o') {
    return (
      <g>
        <ellipse cx={cx} cy="100" rx="5" ry="6" fill={ink} />
        <ellipse cx={cx} cy="102" rx="3" ry="3.5" fill={tongue} />
      </g>
    );
  }
  if (variant === 'bigLaugh') {
    return (
      <g>
        <path d="M 123 96 Q 139 120 155 96 Q 158 114 139 120 Q 120 114 123 96 Z" fill={ink} />
        <path d="M 128 108 Q 139 122 150 108 Q 150 116 139 118 Q 128 116 128 108 Z" fill={tongue} />
        <rect x="133" y="98" width="4" height="4" rx="0.8" fill="#fff" />
        <rect x="141" y="98" width="4" height="4" rx="0.8" fill="#fff" />
      </g>
    );
  }
  if (variant === 'smirk') {
    return <path d="M 128 102 Q 139 108 152 100" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />;
  }
  if (variant === 'sad') {
    return <path d="M 128 106 Q 139 96 150 106" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />;
  }
  if (variant === 'neutral') {
    return <line x1="130" y1="100" x2="148" y2="100" stroke={ink} strokeWidth="3" strokeLinecap="round" />;
  }
  if (variant === 'wow') {
    return (
      <g>
        <ellipse cx={cx} cy="102" rx="6" ry="8" fill={ink} />
        <ellipse cx={cx} cy="104" rx="3.5" ry="4.5" fill={tongue} />
      </g>
    );
  }
  if (variant === 'tongue') {
    return (
      <g>
        <path d="M 128 96 Q 139 108 150 96 Q 152 104 139 108 Q 126 104 128 96 Z" fill={ink} />
        <path d="M 136 104 Q 139 118 148 112 Q 146 104 141 104 Z" fill={tongue} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    );
  }
  if (variant === 'teeth') {
    // determined, clenched teeth
    return (
      <g>
        <path d="M 128 98 Q 139 106 150 98 L 150 104 Q 139 110 128 104 Z" fill="#fff" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
        <line x1="134" y1="99" x2="134" y2="107" stroke={ink} strokeWidth="1.3" />
        <line x1="139" y1="100" x2="139" y2="108" stroke={ink} strokeWidth="1.3" />
        <line x1="144" y1="99" x2="144" y2="107" stroke={ink} strokeWidth="1.3" />
      </g>
    );
  }
  if (variant === 'zzz') {
    return (
      <g>
        <ellipse cx={cx} cy="101" rx="3" ry="2" fill={ink} />
      </g>
    );
  }
  return null;
}

// Special eye variants: closed (happy), wink, stars, x, hearts.
function EyesLib({ variant = 'open', look = 'front' }) {
  const ink = MASCOT_COLORS.ink;
  if (variant === 'open') return <CartoonEyes look={look} />;

  if (variant === 'happy') {
    // ^-^ closed smiling eyes
    return (
      <g fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round">
        <path d="M 120 82 Q 128 74 136 82" />
        <path d="M 142 82 Q 150 74 158 82" />
      </g>
    );
  }
  if (variant === 'wink') {
    return (
      <g>
        <ellipse cx="128" cy="80" rx="9" ry="10.5" fill="#fff" stroke={ink} strokeWidth="3" />
        <circle cx="128" cy="81" r="3.8" fill={ink} />
        <circle cx="129.5" cy="79.5" r="1.4" fill="#fff" />
        <path d="M 142 82 Q 150 76 158 82" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  if (variant === 'stars') {
    const star = (cx, cy) => (
      <path d={`M ${cx} ${cy - 8} L ${cx + 2} ${cy - 2} L ${cx + 8} ${cy} L ${cx + 2} ${cy + 2} L ${cx} ${cy + 8} L ${cx - 2} ${cy + 2} L ${cx - 8} ${cy} L ${cx - 2} ${cy - 2} Z`}
         fill={MASCOT_COLORS.accent} stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
    );
    return <g>{star(128, 80)}{star(150, 80)}</g>;
  }
  if (variant === 'x') {
    const xmark = (cx, cy) => (
      <g stroke={ink} strokeWidth="3" strokeLinecap="round">
        <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} />
        <line x1={cx + 6} y1={cy - 6} x2={cx - 6} y2={cy + 6} />
      </g>
    );
    return <g>{xmark(128, 80)}{xmark(150, 80)}</g>;
  }
  if (variant === 'big') {
    // shocked / surprised — bigger whites
    return (
      <g>
        <ellipse cx="128" cy="80" rx="11" ry="13" fill="#fff" stroke={ink} strokeWidth="3" />
        <circle cx="128" cy="80" r="3" fill={ink} />
        <ellipse cx="150" cy="80" rx="11" ry="13" fill="#fff" stroke={ink} strokeWidth="3" />
        <circle cx="150" cy="80" r="3" fill={ink} />
      </g>
    );
  }
  if (variant === 'focus') {
    // narrowed eyes
    return (
      <g stroke={ink} strokeWidth="3" fill="#fff">
        <path d="M 120 80 Q 128 76 136 80 Q 128 84 120 80 Z" />
        <circle cx="128" cy="80" r="2" fill={ink} stroke="none" />
        <path d="M 142 80 Q 150 76 158 80 Q 150 84 142 80 Z" />
        <circle cx="150" cy="80" r="2" fill={ink} stroke="none" />
      </g>
    );
  }
  return <CartoonEyes look={look} />;
}

// ─────────────────────────────────────────────────────────────
// Props — things Vier can hold / interact with.
// Each is designed to sit at a given (cx, cy) anchor.
// ─────────────────────────────────────────────────────────────
function PropClipboard({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <rect x="-18" y="-22" width="36" height="44" rx="4" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" />
      <rect x="-8" y="-26" width="16" height="8" rx="2" fill={MASCOT_COLORS.ink} />
      <line x1="-12" y1="-12" x2="12" y2="-12" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="-12" y1="-4" x2="8" y2="-4" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="-12" y1="4" x2="12" y2="4" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M -8 12 L -4 16 L 8 8" fill="none" stroke={MASCOT_COLORS.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
function PropMagnifier({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r="14" fill="rgba(255,255,255,0.5)" stroke={MASCOT_COLORS.ink} strokeWidth="3" />
      <circle r="14" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" />
      <path d="M 10 10 L 22 22" stroke={MASCOT_COLORS.ink} strokeWidth="6" strokeLinecap="round" />
    </g>
  );
}
function PropLightbulb({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M -10 -12 Q -10 -24 0 -24 Q 10 -24 10 -12 Q 10 -6 6 -2 L 6 4 L -6 4 L -6 -2 Q -10 -6 -10 -12 Z"
            fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="-6" y1="6" x2="6" y2="6" stroke={MASCOT_COLORS.ink} strokeWidth="2" strokeLinecap="round" />
      <line x1="-4" y1="10" x2="4" y2="10" stroke={MASCOT_COLORS.ink} strokeWidth="2" strokeLinecap="round" />
      {/* rays */}
      <g stroke={MASCOT_COLORS.accent} strokeWidth="2" strokeLinecap="round">
        <line x1="-18" y1="-20" x2="-14" y2="-18" />
        <line x1="18" y1="-20" x2="14" y2="-18" />
        <line x1="0" y1="-30" x2="0" y2="-26" />
      </g>
    </g>
  );
}
function PropBox({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M -20 -6 L 0 -16 L 20 -6 L 20 14 L 0 24 L -20 14 Z"
            fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M -20 -6 L 0 4 L 20 -6" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="0" y1="4" x2="0" y2="24" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" />
    </g>
  );
}
function PropFlag({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <line x1="0" y1="-24" x2="0" y2="20" stroke={MASCOT_COLORS.ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M 0 -24 L 24 -20 L 18 -12 L 24 -4 L 0 -8 Z" fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}
function PropWrench({ cx, cy, rot = -30 }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <rect x="-3" y="-4" width="26" height="8" rx="2" fill={MASCOT_COLORS.ink} />
      <path d="M -3 -8 Q -12 -8 -12 0 Q -12 8 -3 8 Q -3 4 -7 4 Q -7 -4 -3 -4 Z" fill={MASCOT_COLORS.ink} />
    </g>
  );
}
function PropChart({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <rect x="-22" y="-16" width="44" height="30" rx="3" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" />
      <rect x="-16" y="2" width="5" height="8" fill={MASCOT_COLORS.primary} />
      <rect x="-8" y="-4" width="5" height="14" fill={MASCOT_COLORS.primary} />
      <rect x="0" y="-10" width="5" height="20" fill={MASCOT_COLORS.accent} />
      <rect x="8" y="-6" width="5" height="16" fill={MASCOT_COLORS.primary} />
    </g>
  );
}
function PropSpeech({ cx, cy, text = '!' }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M -18 -14 Q -24 -14 -24 -8 L -24 8 Q -24 14 -18 14 L -4 14 L 0 20 L 4 14 L 18 14 Q 24 14 24 8 L 24 -8 Q 24 -14 18 -14 Z"
            fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <text textAnchor="middle" y="5" fontFamily="system-ui, sans-serif" fontSize="16" fontWeight="700" fill={MASCOT_COLORS.ink}>{text}</text>
    </g>
  );
}
function PropHeart({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M 0 14 Q -16 2 -12 -8 Q -8 -16 0 -10 Q 8 -16 12 -8 Q 16 2 0 14 Z"
            fill="#F07A8E" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}
function PropCheckBadge({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M 0 -18 L 5 -14 L 11 -15 L 13 -9 L 18 -6 L 16 0 L 18 6 L 13 9 L 11 15 L 5 14 L 0 18 L -5 14 L -11 15 L -13 9 L -18 6 L -16 0 L -18 -6 L -13 -9 L -11 -15 L -5 -14 Z"
            fill="#22C55E" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M -7 0 L -2 5 L 8 -5" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
function PropKey({ cx, cy, rot = -20 }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <circle r="7" fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" />
      <circle r="2.5" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.5" />
      <rect x="5" y="-2" width="18" height="4" fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="2" strokeLinejoin="round" />
      <rect x="18" y="2" width="3" height="4" fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="2" strokeLinejoin="round" />
    </g>
  );
}
function PropCoffee({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M -12 -8 L -10 14 Q -10 18 -6 18 L 8 18 Q 12 18 12 14 L 14 -8 Z"
            fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M 12 -2 Q 20 -2 20 4 Q 20 10 12 10" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" />
      {/* steam */}
      <path d="M -4 -14 Q -6 -18 -4 -22" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M 2 -14 Q 0 -18 2 -22" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M 8 -14 Q 6 -18 8 -22" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

// Z's floating near head (sleeping)
function PropZzz({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`} fill={MASCOT_COLORS.ink} fontFamily="system-ui, sans-serif" fontWeight="700">
      <text x="0" y="0" fontSize="18">Z</text>
      <text x="-8" y="-14" fontSize="14">z</text>
      <text x="-14" y="-24" fontSize="10">z</text>
    </g>
  );
}

// Party confetti
function PropConfetti({ cx, cy }) {
  const bits = [
    [-18, -4, '#F5A524'], [-6, -22, '#3E4FD6'], [10, -18, '#F07A8E'],
    [20, -4, '#22C55E'], [-14, 10, '#3E4FD6'], [14, 12, '#F5A524'],
  ];
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {bits.map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width="5" height="3" fill={c} transform={`rotate(${i * 40} ${x} ${y})`} stroke={MASCOT_COLORS.ink} strokeWidth="1" />
      ))}
    </g>
  );
}

// Question mark above head
function PropQuestion({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`} fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="2">
      <text x="0" y="0" fontSize="32" fontFamily="system-ui, sans-serif" fontWeight="800" textAnchor="middle">?</text>
    </g>
  );
}

// Sweat drop (nervous / working hard)
function PropSweat({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M 0 -8 Q 6 0 0 6 Q -6 0 0 -8 Z" fill="#6EC1FF" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Extra arm pose: holding something centered in front (for clipboard, box).
// ─────────────────────────────────────────────────────────────
function ArmsHolding() {
  const Arm = ({ d }) => (
    <g>
      <path d={d} fill="none" stroke={MASCOT_COLORS.ink} strokeWidth={12} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MASCOT_COLORS.primary} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <Arm d="M 64 142 Q 60 158 80 166" />
      <Hand cx={86} cy={168} rotate={20} />
      <Arm d="M 160 142 Q 166 158 150 166" />
      <Hand cx={144} cy={168} rotate={-20} flip />
    </g>
  );
}

// Arm raised (single right arm up, straight) — for "I have an answer!"
function ArmsRaised() {
  const Arm = ({ d }) => (
    <g>
      <path d={d} fill="none" stroke={MASCOT_COLORS.ink} strokeWidth={12} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MASCOT_COLORS.primary} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <Arm d="M 64 142 Q 52 154 52 172" />
      <Hand cx={52} cy={176} rotate={0} />
      <Arm d="M 160 120 L 170 40" />
      <Hand cx={172} cy={34} rotate={0} flip />
    </g>
  );
}

// Both arms up — celebrate
function ArmsCheer() {
  const Arm = ({ d }) => (
    <g>
      <path d={d} fill="none" stroke={MASCOT_COLORS.ink} strokeWidth={12} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MASCOT_COLORS.primary} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <Arm d="M 64 140 Q 40 110 30 70" />
      <Hand cx={28} cy={64} rotate={30} />
      <Arm d="M 160 120 Q 184 100 192 60" />
      <Hand cx={194} cy={54} rotate={-30} flip />
    </g>
  );
}

// Arms shrug — palms up
function ArmsShrug() {
  const Arm = ({ d }) => (
    <g>
      <path d={d} fill="none" stroke={MASCOT_COLORS.ink} strokeWidth={12} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MASCOT_COLORS.primary} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <Arm d="M 64 142 Q 40 140 32 126" />
      <Hand cx={30} cy={122} rotate={-80} />
      <Arm d="M 160 130 Q 184 128 192 114" />
      <Hand cx={194} cy={110} rotate={80} flip />
    </g>
  );
}

// Arms: both pointing down to UI element below the mascot
function ArmsPointDown() {
  const Arm = ({ d }) => (
    <g>
      <path d={d} fill="none" stroke={MASCOT_COLORS.ink} strokeWidth={12} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MASCOT_COLORS.primary} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <Arm d="M 64 142 Q 50 164 48 188" />
      <HandPointing cx={48} cy={194} rotate={90} />
      <Arm d="M 160 142 Q 172 164 176 188" />
      <Hand cx={176} cy={194} rotate={90} flip />
    </g>
  );
}

// Arms crossed — stern / waiting
function ArmsCrossed() {
  const Arm = ({ d }) => (
    <g>
      <path d={d} fill="none" stroke={MASCOT_COLORS.ink} strokeWidth={12} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MASCOT_COLORS.primary} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <Arm d="M 64 146 Q 96 160 130 158" />
      <Hand cx={134} cy={158} rotate={-10} />
      <Arm d="M 160 144 Q 128 158 96 156" />
      <Hand cx={90} cy={156} rotate={10} flip />
    </g>
  );
}

// Thumbs up (single right arm bent up)
function ArmsThumbsUp() {
  const Arm = ({ d }) => (
    <g>
      <path d={d} fill="none" stroke={MASCOT_COLORS.ink} strokeWidth={12} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MASCOT_COLORS.primary} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <Arm d="M 64 142 Q 52 154 52 172" />
      <Hand cx={52} cy={176} rotate={0} />
      <Arm d="M 160 130 Q 176 124 182 108" />
      {/* thumbs up hand */}
      <g transform="translate(184 102)">
        <path d="M -8 0 Q -10 10 -2 12 Q 6 12 8 4 L 8 -4 Q 6 -10 -2 -10 Q -8 -8 -8 0 Z"
              fill={MASCOT_COLORS.glove} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M 0 -8 Q 2 -18 -4 -20 Q -8 -18 -8 -10 Z"
              fill={MASCOT_COLORS.glove} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" strokeLinejoin="round" />
      </g>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Base render — composes everything.
// ─────────────────────────────────────────────────────────────
function MascotBase({ arms, legs = 'stand', eyes = 'open', look = 'front', mouth = 'smile', freckles = true, cheeks = true, accessories = null, viewBox = "0 0 210 260", size = 200 }) {
  return (
    <svg viewBox={viewBox} width={size} height={size * 1.25} aria-label="Mascot">
      <Shadow />
      {/* accessories behind body if anchored behind */}
      {accessories && accessories.behind}
      <FourBody />
      {freckles && <BodyFreckles />}
      {arms}
      <CartoonLegs pose={legs} />
      <EyesLib variant={eyes} look={look} />
      {cheeks && <Cheeks />}
      <MouthLib variant={mouth} />
      {/* accessories in front */}
      {accessories && accessories.front}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Situation library — every entry is a labeled mascot pose with
// a description and an intended use case. Grouped into sections.
// ─────────────────────────────────────────────────────────────
// Each item returns a complete mascot for its situation.

// ── TUTORIAL / ONBOARDING sequence ──────────────────────────
function Sit_WelcomeWave(p)     { return <MascotBase {...p} arms={<CartoonArms pose="wave" />} eyes="open" mouth="smile" accessories={{ front: <g transform="translate(200 54)"><path d="M 0 -5 L 1.5 -1.5 L 5 0 L 1.5 1.5 L 0 5 L -1.5 1.5 L -5 0 L -1.5 -1.5 Z" fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="1.3" /></g> }} />; }
function Sit_Introducing(p)     { return <MascotBase {...p} arms={<CartoonArms pose="point" />} viewBox="0 0 230 260" eyes="open" look="right" mouth="smile" />; }
function Sit_Explaining(p)      { return <MascotBase {...p} arms={<ArmsHolding />} eyes="open" mouth="grin" accessories={{ front: <g><PropClipboard cx={120} cy={160} /></g> }} />; }
function Sit_PointUp(p)         { return <MascotBase {...p} arms={<ArmsRaised />} viewBox="0 0 220 260" eyes="open" look="up" mouth="smile" />; }
function Sit_PointDown(p)       { return <MascotBase {...p} arms={<ArmsPointDown />} eyes="open" look="down" mouth="grin" />; }
function Sit_PointRight(p)      { return <MascotBase {...p} arms={<CartoonArms pose="point" />} viewBox="0 0 230 260" eyes="open" look="right" mouth="grin" />; }
function Sit_Thinking(p)        { return <MascotBase {...p} arms={<CartoonArms pose="think" />} viewBox="0 0 220 260" eyes="focus" look="up" mouth="smirk" accessories={{ front: <g><circle cx="182" cy="48" r="3" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" /><circle cx="192" cy="38" r="4.5" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" /><circle cx="204" cy="24" r="7" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" /></g> }} />; }
function Sit_Idea(p)            { return <MascotBase {...p} arms={<ArmsRaised />} viewBox="0 0 220 270" eyes="stars" mouth="bigLaugh" accessories={{ front: <g transform="translate(170 20)"><PropLightbulb cx={0} cy={0} /></g> }} />; }
function Sit_Question(p)        { return <MascotBase {...p} arms={<ArmsShrug />} viewBox="0 0 220 260" eyes="open" look="up" mouth="o" accessories={{ front: <PropQuestion cx={140} cy={26} /> }} />; }
function Sit_Confused(p)        { return <MascotBase {...p} arms={<ArmsShrug />} viewBox="0 0 220 260" eyes="focus" look="left" mouth="smirk" />; }
function Sit_ThumbsUp(p)        { return <MascotBase {...p} arms={<ArmsThumbsUp />} viewBox="0 0 210 260" eyes="happy" mouth="grin" />; }
function Sit_Cheer(p)           { return <MascotBase {...p} arms={<ArmsCheer />} viewBox="0 0 220 260" eyes="happy" mouth="bigLaugh" accessories={{ front: <PropConfetti cx={140} cy={40} /> }} />; }
function Sit_Success(p)         { return <MascotBase {...p} arms={<CartoonArms pose="hips" />} viewBox="0 0 220 260" eyes="open" mouth="smile" accessories={{ front: <g transform="translate(180 60)"><PropCheckBadge cx={0} cy={0} /></g> }} />; }
function Sit_Task(p)            { return <MascotBase {...p} arms={<ArmsHolding />} eyes="focus" mouth="teeth" accessories={{ front: <PropClipboard cx={120} cy={160} /> }} />; }
function Sit_Analyzing(p)       { return <MascotBase {...p} arms={<CartoonArms pose="point" />} viewBox="0 0 230 260" eyes="focus" look="right" mouth="neutral" accessories={{ front: <PropMagnifier cx={210} cy={122} /> }} />; }
function Sit_Data(p)            { return <MascotBase {...p} arms={<ArmsHolding />} eyes="open" mouth="grin" accessories={{ front: <PropChart cx={120} cy={160} /> }} />; }
function Sit_Working(p)         { return <MascotBase {...p} arms={<ArmsHolding />} eyes="focus" look="down" mouth="teeth" accessories={{ front: <g><PropWrench cx={120} cy={160} rot={-20} /><PropSweat cx={170} cy={60} /></g> }} />; }
function Sit_Delivering(p)      { return <MascotBase {...p} arms={<ArmsHolding />} eyes="happy" mouth="grin" accessories={{ front: <PropBox cx={120} cy={160} /> }} />; }
function Sit_Unlock(p)          { return <MascotBase {...p} arms={<CartoonArms pose="point" />} viewBox="0 0 230 260" eyes="open" mouth="smile" accessories={{ front: <PropKey cx={210} cy={122} /> }} />; }
function Sit_Goal(p)            { return <MascotBase {...p} arms={<CartoonArms pose="hips" />} eyes="focus" mouth="smirk" accessories={{ front: <g transform="translate(40 30)"><PropFlag cx={0} cy={0} /></g> }} />; }
function Sit_Heart(p)           { return <MascotBase {...p} arms={<ArmsHolding />} eyes="happy" mouth="smile" accessories={{ front: <PropHeart cx={120} cy={160} /> }} />; }
function Sit_Alert(p)           { return <MascotBase {...p} arms={<CartoonArms pose="wave" />} viewBox="0 0 220 260" eyes="big" mouth="o" accessories={{ front: <PropSpeech cx={40} cy={40} text="!" /> }} />; }
function Sit_Tip(p)             { return <MascotBase {...p} arms={<CartoonArms pose="point" />} viewBox="0 0 230 260" eyes="open" look="right" mouth="grin" accessories={{ front: <PropSpeech cx={210} cy={60} text="Tip" /> }} />; }
function Sit_Loading(p)         { return <MascotBase {...p} arms={<CartoonArms pose="think" />} viewBox="0 0 220 260" eyes="focus" look="up" mouth="neutral" accessories={{ front: <g><circle cx="190" cy="40" r="2.5" fill={MASCOT_COLORS.ink} /><circle cx="200" cy="40" r="2.5" fill={MASCOT_COLORS.ink} /><circle cx="210" cy="40" r="2.5" fill={MASCOT_COLORS.ink} /></g> }} />; }
function Sit_Sleeping(p)        { return <MascotBase {...p} arms={<CartoonArms pose="neutral" />} eyes="happy" mouth="zzz" accessories={{ front: <PropZzz cx={180} cy={50} /> }} />; }
function Sit_Break(p)           { return <MascotBase {...p} arms={<ArmsHolding />} eyes="happy" mouth="grin" accessories={{ front: <PropCoffee cx={120} cy={160} /> }} />; }
function Sit_Empty(p)           { return <MascotBase {...p} arms={<CartoonArms pose="hips" />} eyes="open" look="down" mouth="sad" />; }
function Sit_Oops(p)            { return <MascotBase {...p} arms={<ArmsShrug />} viewBox="0 0 220 260" eyes="x" mouth="o" />; }
function Sit_Wow(p)             { return <MascotBase {...p} arms={<CartoonArms pose="wave" />} eyes="stars" mouth="wow" />; }
function Sit_Wink(p)            { return <MascotBase {...p} arms={<CartoonArms pose="point" />} viewBox="0 0 230 260" eyes="wink" mouth="smirk" />; }
function Sit_Silly(p)           { return <MascotBase {...p} arms={<CartoonArms pose="wave" />} eyes="happy" mouth="tongue" />; }
function Sit_Walk(p)            { return <MascotBase {...p} arms={<CartoonArms pose="walk" />} legs="walk" eyes="open" look="right" mouth="grin" />; }
function Sit_Wait(p)            { return <MascotBase {...p} arms={<ArmsCrossed />} eyes="open" mouth="neutral" />; }
function Sit_Save(p)            { return <MascotBase {...p} arms={<ArmsThumbsUp />} viewBox="0 0 210 260" eyes="happy" mouth="smile" accessories={{ front: <g transform="translate(60 60)"><PropCheckBadge cx={0} cy={0} /></g> }} />; }
function Sit_Greet(p)           { return <MascotBase {...p} arms={<CartoonArms pose="wave" />} eyes="open" mouth="bigLaugh" />; }
function Sit_Focus(p)           { return <MascotBase {...p} arms={<CartoonArms pose="hips" />} eyes="focus" mouth="teeth" />; }
function Sit_Calm(p)            { return <MascotBase {...p} arms={<CartoonArms pose="neutral" />} eyes="happy" mouth="grin" />; }

// Library manifest — grouped situations with metadata.
const SIT_GROUPS = [
  {
    id: 'tutorial',
    title: 'Tutorial · Onboarding',
    subtitle: 'Steps 1 through N of first-run flow',
    items: [
      { key: 'welcome', Comp: Sit_WelcomeWave, name: 'Welcome wave',        step: 'Tutorial · Step 1',  desc: 'Begrüßung im ersten Onboarding-Bildschirm.' },
      { key: 'intro',   Comp: Sit_Introducing, name: 'Introducing feature', step: 'Tutorial · Step 2',  desc: 'Zeigt auf eine UI-Region, erklärt was gleich kommt.' },
      { key: 'explain', Comp: Sit_Explaining,  name: 'Explaining',          step: 'Tutorial · Step 3',  desc: 'Mit Klemmbrett — erläutert Regeln oder Begriffe.' },
      { key: 'pup',     Comp: Sit_PointUp,     name: 'Point up',             step: 'Tutorial · Step 4',  desc: 'Zeigt nach oben — auf Header, Toolbar oder Navigation.' },
      { key: 'pright',  Comp: Sit_PointRight,  name: 'Point right',          step: 'Tutorial · Step 5',  desc: 'Zeigt auf ein Element rechts — Sidebar, Detail-Panel.' },
      { key: 'pdown',   Comp: Sit_PointDown,   name: 'Point down',           step: 'Tutorial · Step 6',  desc: 'Beide Hände zeigen nach unten — Aufforderung „klick hier".' },
      { key: 'tip',     Comp: Sit_Tip,         name: 'Pro tip',              step: 'Tutorial · Step 7',  desc: 'Mit Sprechblase „Tip" — für Pro-Hinweise und Shortcuts.' },
      { key: 'unlock',  Comp: Sit_Unlock,      name: 'Unlocking',            step: 'Tutorial · Step 8',  desc: 'Hält einen Schlüssel — neues Feature wird freigeschaltet.' },
      { key: 'goal',    Comp: Sit_Goal,        name: 'Goal set',             step: 'Tutorial · Step 9',  desc: 'Neben einer Flagge — Ziel/Meilenstein definiert.' },
      { key: 'cheer',   Comp: Sit_Cheer,       name: 'Tutorial complete',    step: 'Tutorial · Done',    desc: 'Jubel mit Konfetti — Onboarding abgeschlossen.' },
    ],
  },
  {
    id: 'guidance',
    title: 'Guidance · Erklärung',
    subtitle: 'Tooltips, Hinweise, In-Produkt-Hilfe',
    items: [
      { key: 'think',    Comp: Sit_Thinking,  name: 'Thinking',         step: 'Inline · Analyse',     desc: 'Hand am Kinn, Gedankenblasen — „ich überlege mit dir".' },
      { key: 'idea',     Comp: Sit_Idea,      name: 'Has an idea',      step: 'Inline · Vorschlag',    desc: 'Glühbirne + Sterne-Augen — Empfehlung / Shortcut.' },
      { key: 'question', Comp: Sit_Question,  name: 'Has a question',   step: 'Inline · Frage',        desc: 'Großes Fragezeichen — wartet auf Input des Nutzers.' },
      { key: 'analyze',  Comp: Sit_Analyzing, name: 'Analyzing',        step: 'Inline · Detail',       desc: 'Mit Lupe — prüft / schaut genau hin.' },
      { key: 'data',     Comp: Sit_Data,      name: 'Showing data',     step: 'Inline · Chart',        desc: 'Hält ein Diagramm — Report oder Auswertung.' },
      { key: 'alert',    Comp: Sit_Alert,     name: 'Alerting',         step: 'Inline · Warnung',      desc: 'Große Augen + Ausrufezeichen — Achtung.' },
      { key: 'wink',     Comp: Sit_Wink,      name: 'Winking hint',     step: 'Inline · Easter egg',   desc: 'Zwinkert und zeigt — versteckter Hinweis.' },
    ],
  },
  {
    id: 'states',
    title: 'System states',
    subtitle: 'Empty, loading, error, success',
    items: [
      { key: 'empty',    Comp: Sit_Empty,    name: 'Empty state',      step: 'State · Empty',    desc: 'Trauriger Blick, Hände an der Hüfte — „hier ist noch nichts".' },
      { key: 'loading',  Comp: Sit_Loading,  name: 'Loading',          step: 'State · Loading',  desc: 'Schaut nach oben, drei Punkte — Vorgang läuft.' },
      { key: 'working',  Comp: Sit_Working,  name: 'Working hard',     step: 'State · Processing', desc: 'Schraubenschlüssel, Schweißtropfen — im Hintergrund tut sich was.' },
      { key: 'success',  Comp: Sit_Success,  name: 'Success',          step: 'State · Success',  desc: 'Mit Häkchen-Badge — Aktion erfolgreich.' },
      { key: 'save',     Comp: Sit_Save,     name: 'Saved',            step: 'State · Saved',    desc: 'Daumen hoch + Häkchen — Änderungen gespeichert.' },
      { key: 'deliver',  Comp: Sit_Delivering,name: 'Delivering',      step: 'State · Export',    desc: 'Hält Paket — Export / Download / Versand.' },
      { key: 'oops',     Comp: Sit_Oops,     name: 'Oops / Error',     step: 'State · Error',    desc: 'X-Augen, offener Mund — da ist was schief gelaufen.' },
      { key: 'wait',     Comp: Sit_Wait,     name: 'Waiting',          step: 'State · Waiting',  desc: 'Arme verschränkt, neutral — wartet auf den Nutzer.' },
    ],
  },
  {
    id: 'reactions',
    title: 'Reactions · Emotions',
    subtitle: 'Kleinere emotionale Ausdrücke für Chat/Toast',
    items: [
      { key: 'thumbs',   Comp: Sit_ThumbsUp, name: 'Thumbs up',        step: 'Reaction · Approve', desc: 'Daumen hoch — simple Zustimmung.' },
      { key: 'heart',    Comp: Sit_Heart,    name: 'Heart / love',     step: 'Reaction · Love',    desc: 'Hält ein Herz — Danke / Love it.' },
      { key: 'wow',      Comp: Sit_Wow,      name: 'Wow',              step: 'Reaction · Wow',     desc: 'Sterne-Augen, Mund auf — beeindruckt.' },
      { key: 'silly',    Comp: Sit_Silly,    name: 'Silly',            step: 'Reaction · Fun',     desc: 'Zunge raus — Spaß, locker.' },
      { key: 'confused', Comp: Sit_Confused, name: 'Confused',         step: 'Reaction · Huh?',    desc: 'Unsicherer Blick, Schulterzucken — verwirrt.' },
      { key: 'focus',    Comp: Sit_Focus,    name: 'Focus mode',       step: 'Reaction · Focus',   desc: 'Entschlossen, Zähne zusammengebissen — konzentriert.' },
      { key: 'calm',     Comp: Sit_Calm,     name: 'All good',         step: 'Reaction · Chill',   desc: 'Ruhig, zufrieden — alles im grünen Bereich.' },
      { key: 'greet',    Comp: Sit_Greet,    name: 'Big hello',        step: 'Reaction · Hello',   desc: 'Großes Lachen, winkend — enthusiastischer Gruß.' },
    ],
  },
  {
    id: 'daily',
    title: 'Daily life',
    subtitle: 'Pausen, Bewegung, Nebenrollen',
    items: [
      { key: 'walk',     Comp: Sit_Walk,     name: 'Walking',          step: 'Ambient · Walk',    desc: 'Läuft nach rechts — für Seitenwechsel/Transition.' },
      { key: 'break',    Comp: Sit_Break,    name: 'Coffee break',     step: 'Ambient · Break',   desc: 'Kaffeetasse — kurze Pause, Wartezeit.' },
      { key: 'sleep',    Comp: Sit_Sleeping, name: 'Sleeping',         step: 'Ambient · Idle',    desc: 'Geschlossene Augen, Zzz — längere Inaktivität.' },
      { key: 'task',     Comp: Sit_Task,     name: 'On task',          step: 'Ambient · Busy',    desc: 'Arbeitet am Klemmbrett — laufende Aufgabe.' },
    ],
  },
];

Object.assign(window, {
  MouthLib, EyesLib,
  PropClipboard, PropMagnifier, PropLightbulb, PropBox, PropFlag,
  PropWrench, PropChart, PropSpeech, PropHeart, PropCheckBadge,
  PropKey, PropCoffee, PropZzz, PropConfetti, PropQuestion, PropSweat,
  ArmsHolding, ArmsRaised, ArmsCheer, ArmsShrug, ArmsPointDown, ArmsCrossed, ArmsThumbsUp,
  MascotBase,
  Sit_WelcomeWave, Sit_Introducing, Sit_Explaining, Sit_PointUp, Sit_PointDown, Sit_PointRight,
  Sit_Thinking, Sit_Idea, Sit_Question, Sit_Confused, Sit_ThumbsUp, Sit_Cheer, Sit_Success,
  Sit_Task, Sit_Analyzing, Sit_Data, Sit_Working, Sit_Delivering, Sit_Unlock, Sit_Goal,
  Sit_Heart, Sit_Alert, Sit_Tip, Sit_Loading, Sit_Sleeping, Sit_Break, Sit_Empty, Sit_Oops,
  Sit_Wow, Sit_Wink, Sit_Silly, Sit_Walk, Sit_Wait, Sit_Save, Sit_Greet, Sit_Focus, Sit_Calm,
  SIT_GROUPS,
});
