// mascot-cartoon.jsx — Cartoon-styled "4" mascot (v3).
// Inspired by playful sticker-cartoon references: chunky black outlines,
// big expressive eyes (whites + pupils + highlights), open smile with tongue,
// thin black stick arms/legs with white-gloved hands and colored shoes.

const MASCOT_COLORS = {
  primary: '#3E4FD6',
  primaryDark: '#2B3AAE',
  accent: '#F5A524',
  accentDeep: '#C17F10',
  ink: '#111218',
  tongue: '#F07A8E',
  gum: '#C7455E',
  white: '#FFFFFF',
  shoe: '#F5A524',
  shoeDark: '#B87810',
  glove: '#FFFFFF',
};

// ─────────────────────────────────────────────────────────────
// Body: the "4" as a chunky outlined shape with open inner triangle.
// Single evenodd path so the notch is a real cutout.
// ─────────────────────────────────────────────────────────────
function FourBody({ fill = MASCOT_COLORS.primary, stroke = MASCOT_COLORS.ink, strokeWidth = 8 }) {
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
  `;
  const inner = `
    M 114 78
    L 114 148
    L 68 148
    Z
  `;
  return (
    <path d={outer + ' ' + inner} fill={fill} fillRule="evenodd"
          stroke={stroke} strokeWidth={strokeWidth}
          strokeLinejoin="round" strokeLinecap="round" />
  );
}

// ─────────────────────────────────────────────────────────────
// Cartoon eyes — big whites with dark pupils and small highlights.
// Positioned on the upper-right stroke of the 4 (face zone ~130–160, 70–95).
// ─────────────────────────────────────────────────────────────
function CartoonEyes({ look = 'front' }) {
  // eye pupil offset by look direction
  const offs = { front: [0, 0], up: [0, -1.5], left: [-1.5, 0], right: [1.5, 0], down: [0, 1.5] }[look] || [0, 0];
  const [dx, dy] = offs;
  return (
    <g>
      {/* left eye */}
      <ellipse cx="128" cy="80" rx="9" ry="10.5" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="3" />
      <circle cx={128 + dx} cy={81 + dy} r="3.8" fill={MASCOT_COLORS.ink} />
      <circle cx={129.5 + dx} cy={79.5 + dy} r="1.4" fill="#fff" />
      {/* right eye */}
      <ellipse cx="150" cy="80" rx="9" ry="10.5" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="3" />
      <circle cx={150 + dx} cy={81 + dy} r="3.8" fill={MASCOT_COLORS.ink} />
      <circle cx={151.5 + dx} cy={79.5 + dy} r="1.4" fill="#fff" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Cartoon mouth — open smile with tongue inside, like the reference.
// ─────────────────────────────────────────────────────────────
function CartoonMouth({ variant = 'smile' }) {
  if (variant === 'smile') {
    // big open smile below the eyes
    return (
      <g>
        {/* mouth outline shape */}
        <path d="M 128 96 Q 139 112 150 96 Q 152 108 139 114 Q 126 108 128 96 Z"
              fill={MASCOT_COLORS.ink} />
        {/* tongue */}
        <path d="M 132 104 Q 139 114 146 104 Q 147 110 139 112 Q 131 110 132 104 Z"
              fill={MASCOT_COLORS.tongue} />
        {/* tiny tooth */}
        <rect x="136" y="98" width="4" height="3" rx="0.8" fill="#fff" />
      </g>
    );
  }
  if (variant === 'grin') {
    // closed grin
    return (
      <path d="M 128 98 Q 139 108 150 98" fill="none"
            stroke={MASCOT_COLORS.ink} strokeWidth="3" strokeLinecap="round" />
    );
  }
  if (variant === 'o') {
    // small surprised "o"
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
// Stick arms + white gloved hands. Thin black strokes, big round hands.
// ─────────────────────────────────────────────────────────────
function CartoonArms({ pose = 'neutral' }) {
  const ink = MASCOT_COLORS.ink;
  const glove = MASCOT_COLORS.glove;
  const gloveR = 8;
  const stroke = 4;

  if (pose === 'wave') {
    return (
      <g>
        {/* left arm — down at side */}
        <path d="M 64 140 Q 52 148 48 164" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="47" cy="167" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        {/* thumb mark on glove */}
        <path d="M 41 162 Q 43 164 45 164" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        {/* right arm — raised waving */}
        <path d="M 160 120 Q 176 100 182 74" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="184" cy="70" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 178 66 Q 180 68 182 68" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    );
  }
  if (pose === 'point') {
    return (
      <g>
        <path d="M 64 140 Q 52 148 48 164" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="47" cy="167" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        {/* right arm pointing */}
        <path d="M 160 126 Q 178 124 192 122" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="194" cy="122" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        {/* pointing finger */}
        <path d="M 198 120 L 204 119" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }
  if (pose === 'hips') {
    // hand on hip — confident
    return (
      <g>
        <path d="M 64 140 Q 54 152 58 166" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="59" cy="168" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        <path d="M 160 130 Q 178 138 172 156" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="170" cy="158" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
      </g>
    );
  }
  if (pose === 'think') {
    return (
      <g>
        <path d="M 64 140 Q 54 150 56 166" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="56" cy="168" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
        {/* right arm up to chin */}
        <path d="M 160 120 Q 172 104 168 92" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="168" cy="90" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
      </g>
    );
  }
  // neutral
  return (
    <g>
      <path d="M 64 140 Q 52 152 52 170" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
      <circle cx="52" cy="172" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
      <path d="M 160 140 Q 172 152 172 170" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
      <circle cx="172" cy="172" r={gloveR} fill={glove} stroke={ink} strokeWidth="2.5" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Stick legs + colored shoes. Legs hang off the base of the 4.
// ─────────────────────────────────────────────────────────────
function CartoonLegs({ pose = 'stand' }) {
  const ink = MASCOT_COLORS.ink;
  const shoe = MASCOT_COLORS.shoe;
  const stroke = 4;

  if (pose === 'walk') {
    return (
      <g>
        <path d="M 128 214 Q 124 222 116 228" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <ellipse cx="114" cy="230" rx="10" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
        <path d="M 150 214 Q 158 222 164 230" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
        <ellipse cx="167" cy="232" rx="10" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
      </g>
    );
  }
  // stand
  return (
    <g>
      <path d="M 128 214 L 126 230" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
      <ellipse cx="124" cy="232" rx="11" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
      <path d="M 150 214 L 152 230" fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
      <ellipse cx="155" cy="232" rx="11" ry="5" fill={shoe} stroke={ink} strokeWidth="2.5" />
    </g>
  );
}

function Shadow() {
  return <ellipse cx="140" cy="240" rx="52" ry="5" fill="#000" opacity="0.14" />;
}

// Small dot-texture sprinkled across the body (SpongeBob-style speckle).
function BodyFreckles() {
  const dots = [
    [132, 130, 1.4], [148, 180, 1.6], [90, 160, 1.3],
    [156, 60, 1.2], [154, 120, 1.4], [60, 156, 1.2],
    [102, 100, 1.3], [144, 200, 1.3],
  ];
  return (
    <g opacity="0.28">
      {dots.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={MASCOT_COLORS.ink} />
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Rosy cheek blush — two soft pink ovals.
// ─────────────────────────────────────────────────────────────
function Cheeks() {
  return (
    <g opacity="0.55">
      <ellipse cx="118" cy="94" rx="4.5" ry="2.8" fill="#F07A8E" />
      <ellipse cx="160" cy="94" rx="4.5" ry="2.8" fill="#F07A8E" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIATIONS (cartoon series)
// ─────────────────────────────────────────────────────────────

// C1 — Hero cartoon. Waving, open smile + tongue, freckles + cheeks.
function MascotCartoonHero({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 250" width={size} height={size * 1.25} aria-label="Mascot — cartoon hero">
      <Shadow />
      <FourBody />
      <BodyFreckles />
      <CartoonArms pose="wave" />
      <CartoonLegs pose="stand" />
      <CartoonEyes look="front" />
      <Cheeks />
      <CartoonMouth variant="smile" />
      {/* amber sparkle near the waving hand */}
      <g transform="translate(198 58)">
        <path d="M 0 -5 L 1.5 -1.5 L 5 0 L 1.5 1.5 L 0 5 L -1.5 1.5 L -5 0 L -1.5 -1.5 Z" fill={MASCOT_COLORS.accent} stroke={MASCOT_COLORS.ink} strokeWidth="1.3" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// C2 — Neutral stance. Arms at sides, closed grin, looking up slightly.
function MascotCartoonStand({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 250" width={size} height={size * 1.25} aria-label="Mascot — cartoon stand">
      <Shadow />
      <FourBody />
      <BodyFreckles />
      <CartoonArms pose="neutral" />
      <CartoonLegs pose="stand" />
      <CartoonEyes look="up" />
      <Cheeks />
      <CartoonMouth variant="grin" />
    </svg>
  );
}

// C3 — Pointing guide. Points to the right, open smile. For tooltip/onboarding.
function MascotCartoonPoint({ size = 200 }) {
  return (
    <svg viewBox="0 0 210 250" width={size} height={size * 1.25} aria-label="Mascot — cartoon pointing">
      <Shadow />
      <FourBody />
      <BodyFreckles />
      <CartoonArms pose="point" />
      <CartoonLegs pose="stand" />
      <CartoonEyes look="right" />
      <Cheeks />
      <CartoonMouth variant="smile" />
    </svg>
  );
}

// C4 — Thinking. Hand at chin, looking up-left, closed grin.
function MascotCartoonThink({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 250" width={size} height={size * 1.25} aria-label="Mascot — cartoon thinking">
      <Shadow />
      <FourBody />
      <BodyFreckles />
      <CartoonArms pose="think" />
      <CartoonLegs pose="stand" />
      <CartoonEyes look="up" />
      <Cheeks />
      <CartoonMouth variant="grin" />
      {/* thought bubble */}
      <g>
        <circle cx="178" cy="52" r="3" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" />
        <circle cx="188" cy="42" r="4.5" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" />
        <circle cx="200" cy="30" r="7" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="1.8" />
      </g>
    </svg>
  );
}

// C5 — Surprised / empty-state. Small "o" mouth, looking down.
function MascotCartoonSurprised({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 250" width={size} height={size * 1.25} aria-label="Mascot — cartoon surprised">
      <Shadow />
      <FourBody />
      <BodyFreckles />
      <CartoonArms pose="hips" />
      <CartoonLegs pose="stand" />
      <CartoonEyes look="down" />
      <Cheeks />
      <CartoonMouth variant="o" />
    </svg>
  );
}

// C6 — Walking. Slight leg asymmetry, arms swinging opposite.
function MascotCartoonWalk({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 250" width={size} height={size * 1.25} aria-label="Mascot — cartoon walking">
      <Shadow />
      <FourBody />
      <BodyFreckles />
      {/* custom arms for walk swing */}
      <g>
        <path d="M 64 140 Q 56 152 58 168" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="4" strokeLinecap="round" />
        <circle cx="58" cy="170" r="8" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" />
        <path d="M 160 140 Q 170 148 168 162" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="4" strokeLinecap="round" />
        <circle cx="168" cy="164" r="8" fill="#fff" stroke={MASCOT_COLORS.ink} strokeWidth="2.5" />
      </g>
      <CartoonLegs pose="walk" />
      <CartoonEyes look="right" />
      <Cheeks />
      <CartoonMouth variant="grin" />
    </svg>
  );
}

// Monochrome cartoon — for dark headers / favicon test.
function MascotCartoonMono({ size = 200, color = MASCOT_COLORS.ink }) {
  return (
    <svg viewBox="0 0 200 250" width={size} height={size * 1.25} aria-label="Mascot — cartoon mono">
      <FourBody fill={color} stroke={color} strokeWidth={0} />
      <g fill={color === '#fff' || color === '#FFFFFF' ? MASCOT_COLORS.ink : '#fff'}>
        <ellipse cx="128" cy="80" rx="6" ry="7" />
        <ellipse cx="150" cy="80" rx="6" ry="7" />
      </g>
      <path d="M 128 100 Q 139 110 150 100" fill="none" stroke={color === '#fff' ? MASCOT_COLORS.ink : '#fff'} strokeWidth="3" strokeLinecap="round" />
      <path d="M 64 140 Q 52 152 52 170" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <circle cx="52" cy="172" r="6" fill={color} />
      <path d="M 160 140 Q 172 152 172 170" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <circle cx="172" cy="172" r="6" fill={color} />
      <path d="M 128 214 L 126 230" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="124" cy="232" rx="10" ry="4.5" fill={color} />
      <path d="M 150 214 L 152 230" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="155" cy="232" rx="10" ry="4.5" fill={color} />
    </svg>
  );
}

Object.assign(window, {
  MASCOT_COLORS,
  FourBody, CartoonEyes, CartoonMouth, CartoonArms, CartoonLegs,
  Shadow, BodyFreckles, Cheeks,
  MascotCartoonHero, MascotCartoonStand, MascotCartoonPoint,
  MascotCartoonThink, MascotCartoonSurprised, MascotCartoonWalk,
  MascotCartoonMono,
});
