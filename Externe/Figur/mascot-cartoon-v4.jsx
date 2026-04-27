// mascot-cartoon-v4.jsx — thicker limbs, proper hands (4-finger mitten
// with visible thumb), proper shoes (shaped sneakers with sole + laces).

const MASCOT_COLORS = {
  primary: '#3E4FD6',
  primaryDark: '#2B3AAE',
  accent: '#F5A524',
  ink: '#111218',
  tongue: '#F07A8E',
  white: '#FFFFFF',
  shoe: '#F5A524',
  shoeSole: '#FFFFFF',
  shoeLace: '#111218',
  glove: '#FFFFFF',
};

// ─────────────────────────────────────────────────────────────
// Body — same open-triangle "4" with chunky outline.
// ─────────────────────────────────────────────────────────────
function FourBody({ fill = MASCOT_COLORS.primary, stroke = MASCOT_COLORS.ink, strokeWidth = 8 }) {
  const outer = `
    M 128 42 L 148 42 Q 160 42 160 54 L 160 200
    Q 160 214 146 214 L 128 214 Q 114 214 114 200
    L 114 166 L 58 166 Q 44 166 44 152 L 44 140
    Q 44 132 50 124 L 106 50 Q 112 40 124 40 Z
  `;
  const inner = `M 114 78 L 114 148 L 68 148 Z`;
  return (
    <path d={outer + ' ' + inner} fill={fill} fillRule="evenodd"
          stroke={stroke} strokeWidth={strokeWidth}
          strokeLinejoin="round" strokeLinecap="round" />
  );
}

// ─────────────────────────────────────────────────────────────
// Eyes — unchanged from v3.
// ─────────────────────────────────────────────────────────────
function CartoonEyes({ look = 'front' }) {
  const offs = { front: [0, 0], up: [0, -1.5], left: [-1.5, 0], right: [1.5, 0], down: [0, 1.5] }[look] || [0, 0];
  const [dx, dy] = offs;
  return (
    <g>
      <ellipse cx="128" cy="80" rx="9" ry="10.5" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="3" />
      <circle cx={128 + dx} cy={81 + dy} r="3.8" fill={MASCOT_COLORS.ink} />
      <circle cx={129.5 + dx} cy={79.5 + dy} r="1.4" fill="#fff" />
      <ellipse cx="150" cy="80" rx="9" ry="10.5" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="3" />
      <circle cx={150 + dx} cy={81 + dy} r="3.8" fill={MASCOT_COLORS.ink} />
      <circle cx={151.5 + dx} cy={79.5 + dy} r="1.4" fill="#fff" />
    </g>
  );
}

function CartoonMouth({ variant = 'smile' }) {
  if (variant === 'smile') {
    return (
      <g>
        <path d="M 128 96 Q 139 112 150 96 Q 152 108 139 114 Q 126 108 128 96 Z"
              fill={MASCOT_COLORS.ink} />
        <path d="M 132 104 Q 139 114 146 104 Q 147 110 139 112 Q 131 110 132 104 Z"
              fill={MASCOT_COLORS.tongue} />
        <rect x="136" y="98" width="4" height="3" rx="0.8" fill="#fff" />
      </g>
    );
  }
  if (variant === 'grin') {
    return (
      <path d="M 128 98 Q 139 108 150 98" fill="none"
            stroke={MASCOT_COLORS.ink} strokeWidth="3" strokeLinecap="round" />
    );
  }
  if (variant === 'o') {
    return (
      <g>
        <ellipse cx="139" cy="100" rx="5" ry="6" fill={MASCOT_COLORS.ink} />
        <ellipse cx="139" cy="102" rx="3" ry="3.5" fill={MASCOT_COLORS.tongue} />
      </g>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Hand — proper mitten-style: palm oval, one thumb, 3 finger creases.
// Rendered at (cx, cy) with optional rotation and flip.
// ─────────────────────────────────────────────────────────────
function Hand({ cx, cy, rotate = 0, flip = false, size = 1 }) {
  // scale factor; base size 1 ≈ 11px palm
  const s = size;
  const t = `translate(${cx} ${cy}) rotate(${rotate}) scale(${flip ? -s : s} ${s})`;
  return (
    <g transform={t}>
      {/* palm */}
      <path d="M -9 -2 Q -11 6 -4 10 Q 6 12 10 6 Q 12 -2 9 -8 Q 4 -12 -3 -10 Q -9 -8 -9 -2 Z"
            fill={MASCOT_COLORS.glove} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" strokeLinejoin="round" />
      {/* thumb */}
      <path d="M -8 -3 Q -13 -5 -13 -9 Q -12 -13 -7 -12 Q -4 -10 -5 -6 Z"
            fill={MASCOT_COLORS.glove} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" strokeLinejoin="round" />
      {/* finger creases */}
      <path d="M 1 10 Q 1 6 -1 4" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M 6 9 Q 7 5 4 3" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="1.3" strokeLinecap="round" />
    </g>
  );
}

// Pointing hand — extended index finger instead of mitten.
function HandPointing({ cx, cy, rotate = 0 }) {
  const t = `translate(${cx} ${cy}) rotate(${rotate})`;
  return (
    <g transform={t}>
      {/* palm */}
      <path d="M -8 -2 Q -10 6 -3 9 Q 5 10 8 4 Q 9 -2 6 -7 Q 1 -10 -5 -8 Q -9 -6 -8 -2 Z"
            fill={MASCOT_COLORS.glove} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" strokeLinejoin="round" />
      {/* thumb up */}
      <path d="M 0 -6 Q -1 -12 4 -13 Q 8 -11 7 -6 Z"
            fill={MASCOT_COLORS.glove} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" strokeLinejoin="round" />
      {/* index finger extended right */}
      <path d="M 7 -2 Q 16 -3 20 -1 Q 22 1 20 3 Q 16 4 7 3 Z"
            fill={MASCOT_COLORS.glove} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" strokeLinejoin="round" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Arms — chunky (width 8), with proper hands.
// ─────────────────────────────────────────────────────────────
function CartoonArms({ pose = 'neutral' }) {
  const ink = MASCOT_COLORS.ink;
  const armStroke = 8;
  const armColor = MASCOT_COLORS.primary;

  // Helper: draw a chunky arm — two strokes (outline + fill) via a single
  // path with stroke + a thinner inner stroke for colored fill.
  const Arm = ({ d }) => (
    <g>
      <path d={d} fill="none" stroke={ink} strokeWidth={armStroke + 4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={armColor} strokeWidth={armStroke} strokeLinecap="round" />
    </g>
  );

  if (pose === 'wave') {
    return (
      <g>
        <Arm d="M 64 140 Q 52 150 48 164" />
        <Hand cx={46} cy={168} rotate={-20} />
        <Arm d="M 160 120 Q 178 96 184 70" />
        <Hand cx={186} cy={64} rotate={-30} />
      </g>
    );
  }
  if (pose === 'point') {
    return (
      <g>
        <Arm d="M 64 140 Q 52 150 48 164" />
        <Hand cx={46} cy={168} rotate={-20} />
        <Arm d="M 160 126 Q 178 124 190 122" />
        <HandPointing cx={196} cy={122} rotate={0} />
      </g>
    );
  }
  if (pose === 'hips') {
    return (
      <g>
        <Arm d="M 64 140 Q 54 152 60 166" />
        <Hand cx={62} cy={170} rotate={20} />
        <Arm d="M 160 130 Q 176 140 170 158" />
        <Hand cx={168} cy={162} rotate={-20} flip />
      </g>
    );
  }
  if (pose === 'think') {
    return (
      <g>
        <Arm d="M 64 140 Q 54 150 56 166" />
        <Hand cx={56} cy={170} rotate={10} />
        <Arm d="M 160 120 Q 174 104 168 92" />
        <Hand cx={166} cy={88} rotate={-40} />
      </g>
    );
  }
  if (pose === 'walk') {
    return (
      <g>
        <Arm d="M 64 140 Q 54 152 58 170" />
        <Hand cx={58} cy={174} rotate={10} />
        <Arm d="M 160 140 Q 172 146 170 160" />
        <Hand cx={170} cy={164} rotate={-10} flip />
      </g>
    );
  }
  // neutral
  return (
    <g>
      <Arm d="M 64 140 Q 52 152 52 172" />
      <Hand cx={52} cy={176} rotate={0} />
      <Arm d="M 160 140 Q 172 152 172 172" />
      <Hand cx={172} cy={176} rotate={0} flip />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Shoes — shaped sneakers with toe cap, sole, and a lace stripe.
// ─────────────────────────────────────────────────────────────
function Shoe({ cx, cy, flip = false }) {
  const t = `translate(${cx} ${cy}) scale(${flip ? -1 : 1} 1)`;
  return (
    <g transform={t}>
      {/* upper body of the shoe */}
      <path d="M -10 -8 Q -11 -2 -10 2 L 12 2 Q 16 2 16 -2 Q 16 -8 10 -10 Q 0 -12 -8 -11 Q -10 -10 -10 -8 Z"
            fill={MASCOT_COLORS.shoe} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" strokeLinejoin="round" />
      {/* white sole */}
      <path d="M -10 2 L 12 2 Q 17 2 17 5 Q 17 8 12 8 L -9 8 Q -12 8 -12 5 Q -12 2 -10 2 Z"
            fill={MASCOT_COLORS.shoeSole} stroke={MASCOT_COLORS.ink} strokeWidth="2.2" strokeLinejoin="round" />
      {/* lace stripe */}
      <path d="M -3 -7 Q 0 -4 4 -3" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M -2 -4 Q 2 -1 6 0" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Legs — chunky (width 7), with proper sneakers at the end.
// ─────────────────────────────────────────────────────────────
function CartoonLegs({ pose = 'stand' }) {
  const ink = MASCOT_COLORS.ink;
  const Leg = ({ d }) => (
    <g>
      <path d={d} fill="none" stroke={ink} strokeWidth={11} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MASCOT_COLORS.primary} strokeWidth={7} strokeLinecap="round" />
    </g>
  );

  if (pose === 'walk') {
    return (
      <g>
        <Leg d="M 128 214 Q 124 222 118 228" />
        <Shoe cx={116} cy={232} />
        <Leg d="M 150 214 Q 158 222 164 230" />
        <Shoe cx={168} cy={234} flip />
      </g>
    );
  }
  return (
    <g>
      <Leg d="M 128 214 L 126 230" />
      <Shoe cx={124} cy={234} />
      <Leg d="M 150 214 L 152 230" />
      <Shoe cx={154} cy={234} flip />
    </g>
  );
}

function Shadow() {
  return <ellipse cx="140" cy="244" rx="54" ry="5" fill="#000" opacity="0.14" />;
}

function BodyFreckles() {
  const dots = [
    [132, 130, 1.4], [148, 180, 1.6], [90, 160, 1.3],
    [156, 60, 1.2], [154, 120, 1.4], [60, 156, 1.2],
    [102, 100, 1.3], [144, 200, 1.3],
  ];
  return (
    <g opacity="0.28">
      {dots.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={MASCOT_COLORS.ink} />)}
    </g>
  );
}

function Cheeks() {
  return (
    <g opacity="0.55">
      <ellipse cx="118" cy="94" rx="4.5" ry="2.8" fill="#F07A8E" />
      <ellipse cx="160" cy="94" rx="4.5" ry="2.8" fill="#F07A8E" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Variations
// ─────────────────────────────────────────────────────────────
function MascotCartoonHero({ size = 200 }) {
  return (
    <svg viewBox="0 0 210 255" width={size} height={size * 1.21} aria-label="Mascot — cartoon hero">
      <Shadow />
      <FourBody />
      <BodyFreckles />
      <CartoonArms pose="wave" />
      <CartoonLegs pose="stand" />
      <CartoonEyes look="front" />
      <Cheeks />
      <CartoonMouth variant="smile" />
      <g transform="translate(200 54)">
        <path d="M 0 -5 L 1.5 -1.5 L 5 0 L 1.5 1.5 L 0 5 L -1.5 1.5 L -5 0 L -1.5 -1.5 Z" fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="1.3" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
function MascotCartoonStand({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 255" width={size} height={size * 1.275} aria-label="Mascot — cartoon stand">
      <Shadow /><FourBody /><BodyFreckles />
      <CartoonArms pose="neutral" /><CartoonLegs pose="stand" />
      <CartoonEyes look="up" /><Cheeks /><CartoonMouth variant="grin" />
    </svg>
  );
}
function MascotCartoonPoint({ size = 200 }) {
  return (
    <svg viewBox="0 0 220 255" width={size} height={size * 1.16} aria-label="Mascot — cartoon pointing">
      <Shadow /><FourBody /><BodyFreckles />
      <CartoonArms pose="point" /><CartoonLegs pose="stand" />
      <CartoonEyes look="right" /><Cheeks /><CartoonMouth variant="smile" />
    </svg>
  );
}
function MascotCartoonThink({ size = 200 }) {
  return (
    <svg viewBox="0 0 210 255" width={size} height={size * 1.21} aria-label="Mascot — cartoon thinking">
      <Shadow /><FourBody /><BodyFreckles />
      <CartoonArms pose="think" /><CartoonLegs pose="stand" />
      <CartoonEyes look="up" /><Cheeks /><CartoonMouth variant="grin" />
      <g>
        <circle cx="180" cy="52" r="3" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" />
        <circle cx="190" cy="42" r="4.5" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" />
        <circle cx="202" cy="28" r="7" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" />
      </g>
    </svg>
  );
}
function MascotCartoonSurprised({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 255" width={size} height={size * 1.275} aria-label="Mascot — cartoon surprised">
      <Shadow /><FourBody /><BodyFreckles />
      <CartoonArms pose="hips" /><CartoonLegs pose="stand" />
      <CartoonEyes look="down" /><Cheeks /><CartoonMouth variant="o" />
    </svg>
  );
}
function MascotCartoonWalk({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 255" width={size} height={size * 1.275} aria-label="Mascot — cartoon walking">
      <Shadow /><FourBody /><BodyFreckles />
      <CartoonArms pose="walk" /><CartoonLegs pose="walk" />
      <CartoonEyes look="right" /><Cheeks /><CartoonMouth variant="grin" />
    </svg>
  );
}

function MascotCartoonMono({ size = 200, color = MASCOT_COLORS.ink }) {
  const fg = color === '#fff' || color === '#FFFFFF' ? MASCOT_COLORS.ink : '#fff';
  return (
    <svg viewBox="0 0 200 255" width={size} height={size * 1.275} aria-label="Mascot — cartoon mono">
      <FourBody fill={color} stroke={color} strokeWidth={0} />
      <g fill={fg}>
        <ellipse cx="128" cy="80" rx="6" ry="7" />
        <ellipse cx="150" cy="80" rx="6" ry="7" />
      </g>
      <path d="M 128 100 Q 139 110 150 100" fill="none" stroke={fg} strokeWidth="3" strokeLinecap="round" />
      <path d="M 64 140 Q 52 152 52 172" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <circle cx="52" cy="176" r="8" fill={color} />
      <path d="M 160 140 Q 172 152 172 172" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <circle cx="172" cy="176" r="8" fill={color} />
      <path d="M 128 214 L 126 230" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <ellipse cx="124" cy="234" rx="12" ry="5" fill={color} />
      <path d="M 150 214 L 152 230" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <ellipse cx="155" cy="234" rx="12" ry="5" fill={color} />
    </svg>
  );
}

Object.assign(window, {
  MASCOT_COLORS,
  FourBody, CartoonEyes, CartoonMouth, CartoonArms, CartoonLegs,
  Hand, HandPointing, Shoe, Shadow, BodyFreckles, Cheeks,
  MascotCartoonHero, MascotCartoonStand, MascotCartoonPoint,
  MascotCartoonThink, MascotCartoonSurprised, MascotCartoonWalk,
  MascotCartoonMono,
});
