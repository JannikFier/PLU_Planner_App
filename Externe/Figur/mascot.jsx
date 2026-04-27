// Mascot.jsx v2 — the "4" now has a real open inner triangle (white / bg),
// and the face sits DIRECTLY on the upper stroke of the 4 (no face disc).
// Uses the Abstract-variant face style (dot eyes + small smile) across
// all variations, per user feedback.

const MASCOT_COLORS = {
  primary: '#3E4FD6',
  primaryDark: '#2B3AAE',
  primaryDeep: '#1C2780',
  accent: '#F5A524',
  accentDark: '#C17F10',
  skin: '#FFD9B8',
  skinShade: '#E9B58A',
  white: '#FFFFFF',
  ink: '#1A1B2E',
  neutral: '#6B7280',
  mono: '#1A1B2E',
};

// ─────────────────────────────────────────────────────────────
// FourBody v2 — a proper "4" silhouette with an OPEN inner triangle.
// We draw it as a single path with two subpaths using evenodd fill-rule,
// so the inner triangle is truly cut out (transparent).
//
// Proportions in 200×240 viewBox:
//   – top of diagonal starts at ~(122, 40)
//   – spine runs vertical on the right, from (128,40) down to (158,214)
//   – crossbar spans from left edge (~46) across to spine, at y ≈ 150–164
//   – feet nubs sit below at y ≈ 220
//   – inner triangle: top corner at (128, 72), bottom-left (72, 148),
//     bottom-right (128, 148) — the classic "4" notch
// ─────────────────────────────────────────────────────────────
function FourBody({ fill, stroke = 'none', strokeWidth = 0, cutFill = null }) {
  // Outer silhouette — clockwise
  const outer = `
    M 128 42
    L 148 42
    Q 158 42 158 52
    L 158 202
    Q 158 214 146 214
    L 128 214
    Q 116 214 116 202
    L 116 164
    L 58 164
    Q 46 164 46 152
    L 46 140
    Q 46 132 52 124
    L 108 48
    Q 114 40 124 40
    Z
  `;
  // Inner triangle — counter-clockwise so evenodd cuts it out
  const inner = `
    M 116 76
    L 116 148
    L 72 148
    Z
  `;
  const combined = outer + ' ' + inner;

  return (
    <g>
      <path d={combined} fill={fill} fillRule="evenodd"
            stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      {/* optional fill behind the cutout (e.g. a tinted inner color
          instead of fully transparent) */}
      {cutFill && (
        <path d={inner} fill={cutFill} />
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Face v2 — minimalist. Lives DIRECTLY on the upper spine of the 4,
// between y≈60 and y≈100. No separate face disc.
// ─────────────────────────────────────────────────────────────
function Face({ variant = 'default', eyeColor = '#fff' }) {
  // Face area sits on the top-right stroke of the 4. Spine runs from
  // x≈116 to x≈158, so face center ~x=137.
  const cx = 137;
  const cy = 78;
  const eyeY = cy;
  const mouthY = cy + 12;

  return (
    <g>
      {/* eyes — simple dots */}
      <circle cx={cx - 8} cy={eyeY} r="3" fill={eyeColor} />
      <circle cx={cx + 8} cy={eyeY} r="3" fill={eyeColor} />

      {/* mouth */}
      {variant === 'default' && (
        <path d={`M ${cx - 6} ${mouthY} Q ${cx} ${mouthY + 4} ${cx + 6} ${mouthY}`}
              fill="none" stroke={eyeColor} strokeWidth="2" strokeLinecap="round" />
      )}
      {variant === 'dot' && (
        <circle cx={cx} cy={mouthY + 1} r="1.8" fill={eyeColor} />
      )}
      {variant === 'glasses' && (
        <>
          <circle cx={cx - 8} cy={eyeY} r="6" fill="none" stroke={eyeColor} strokeWidth="1.8" />
          <circle cx={cx + 8} cy={eyeY} r="6" fill="none" stroke={eyeColor} strokeWidth="1.8" />
          <line x1={cx - 2} y1={eyeY} x2={cx + 2} y2={eyeY} stroke={eyeColor} strokeWidth="1.6" />
          {/* inner eye dots behind glasses */}
          <circle cx={cx - 8} cy={eyeY} r="2" fill={eyeColor} />
          <circle cx={cx + 8} cy={eyeY} r="2" fill={eyeColor} />
          <path d={`M ${cx - 6} ${mouthY + 2} Q ${cx} ${mouthY + 6} ${cx + 6} ${mouthY + 2}`}
                fill="none" stroke={eyeColor} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Arms — unchanged from v1, user liked them.
// ─────────────────────────────────────────────────────────────
function Arms({ pose = 'neutral', color = MASCOT_COLORS.primary, outline = MASCOT_COLORS.primaryDeep, hand = MASCOT_COLORS.skin }) {
  if (pose === 'wave') {
    return (
      <g>
        <path d="M 76 138 Q 66 148 64 162" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <circle cx="63" cy="164" r="6" fill={hand} stroke={outline} strokeWidth="1.5" />
        <path d="M 158 110 Q 176 96 180 78" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <circle cx="181" cy="75" r="6.5" fill={hand} stroke={outline} strokeWidth="1.5" />
      </g>
    );
  }
  if (pose === 'point') {
    return (
      <g>
        <path d="M 76 138 Q 66 148 64 162" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <circle cx="63" cy="164" r="6" fill={hand} stroke={outline} strokeWidth="1.5" />
        <path d="M 158 120 Q 176 122 188 122" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <circle cx="190" cy="122" r="6.5" fill={hand} stroke={outline} strokeWidth="1.5" />
      </g>
    );
  }
  return (
    <g>
      <path d="M 76 142 Q 66 154 66 170" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <circle cx="66" cy="172" r="6" fill={hand} stroke={outline} strokeWidth="1.5" />
      <path d="M 158 142 Q 168 154 168 170" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <circle cx="168" cy="172" r="6" fill={hand} stroke={outline} strokeWidth="1.5" />
    </g>
  );
}

function Feet({ color = MASCOT_COLORS.ink }) {
  return (
    <g>
      <ellipse cx="130" cy="220" rx="12" ry="6" fill={color} />
      <ellipse cx="152" cy="220" rx="12" ry="6" fill={color} />
    </g>
  );
}

function Shadow() {
  return <ellipse cx="140" cy="228" rx="48" ry="5" fill="#000" opacity="0.12" />;
}

// ─────────────────────────────────────────────────────────────
// VARIATIONS — all use the new open-triangle 4 + minimal face
// ─────────────────────────────────────────────────────────────

// V1 — Flat classic. Solid indigo 4 with open inner triangle.
// Face is white dots/smile directly on the body. Arms + feet as-is.
function MascotFlat({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} aria-label="Mascot — flat">
      <Shadow />
      <FourBody fill={MASCOT_COLORS.primary} />
      <Face variant="default" eyeColor="#fff" />
      <Arms pose="neutral" />
      <Feet />
    </svg>
  );
}

// V2 — Shaded. Inner triangle subtly tinted instead of fully open,
// plus spine highlight for a bit of depth.
function MascotShaded({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} aria-label="Mascot — shaded">
      <Shadow />
      <FourBody fill={MASCOT_COLORS.primary} cutFill="rgba(43,58,174,0.12)" />
      <rect x="148" y="48" width="6" height="150" rx="3" fill="#fff" opacity="0.18" />
      <Face variant="default" eyeColor="#fff" />
      <Arms pose="neutral" />
      <Feet />
    </svg>
  );
}

// V3 — Outlined. Adds an ink stroke around the 4 (and around the inner
// triangle, so the cutout reads as a drawn shape, not a hole).
function MascotOutlined({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} aria-label="Mascot — outlined">
      <Shadow />
      <FourBody fill={MASCOT_COLORS.primary} stroke={MASCOT_COLORS.ink} strokeWidth={5} />
      <Face variant="default" eyeColor="#fff" />
      {/* outlined arms */}
      <g>
        <path d="M 76 142 Q 66 154 66 170" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="14" strokeLinecap="round" />
        <path d="M 76 142 Q 66 154 66 170" fill="none" stroke={MASCOT_COLORS.primary} strokeWidth="9" strokeLinecap="round" />
        <circle cx="66" cy="172" r="7" fill={MASCOT_COLORS.skin} stroke={MASCOT_COLORS.ink} strokeWidth="3" />
        <path d="M 158 142 Q 168 154 168 170" fill="none" stroke={MASCOT_COLORS.ink} strokeWidth="14" strokeLinecap="round" />
        <path d="M 158 142 Q 168 154 168 170" fill="none" stroke={MASCOT_COLORS.primary} strokeWidth="9" strokeLinecap="round" />
        <circle cx="168" cy="172" r="7" fill={MASCOT_COLORS.skin} stroke={MASCOT_COLORS.ink} strokeWidth="3" />
      </g>
      <ellipse cx="130" cy="220" rx="13" ry="7" fill={MASCOT_COLORS.ink} />
      <ellipse cx="152" cy="220" rx="13" ry="7" fill={MASCOT_COLORS.ink} />
    </svg>
  );
}

// V4 — Expert. Small round glasses, amber info dot on the crossbar.
function MascotExpert({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} aria-label="Mascot — expert">
      <Shadow />
      <FourBody fill={MASCOT_COLORS.primary} />
      <Face variant="glasses" eyeColor="#fff" />
      {/* amber info dot */}
      <g transform="translate(136 180)">
        <circle r="9" fill={MASCOT_COLORS.accent} />
        <text textAnchor="middle" y="3.5" fontFamily="Georgia, serif" fontSize="12" fontWeight="700" fill={MASCOT_COLORS.ink}>i</text>
      </g>
      <Arms pose="neutral" />
      <Feet />
    </svg>
  );
}

// V5 — Waving guide with sparkle. Pose variant.
function MascotWaving({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} aria-label="Mascot — waving">
      <Shadow />
      <FourBody fill={MASCOT_COLORS.primary} />
      <Face variant="default" eyeColor="#fff" />
      {/* amber sparkle near raised hand */}
      <g transform="translate(196 62)">
        <path d="M 0 -6 L 1.8 -1.8 L 6 0 L 1.8 1.8 L 0 6 L -1.8 1.8 L -6 0 L -1.8 -1.8 Z" fill={MASCOT_COLORS.accent} />
      </g>
      <Arms pose="wave" />
      <Feet />
    </svg>
  );
}

// V6 — Abstract. No arms/feet, pure icon. Inner triangle open.
function MascotAbstract({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} aria-label="Mascot — abstract">
      <Shadow />
      <FourBody fill={MASCOT_COLORS.primary} />
      <Face variant="default" eyeColor="#fff" />
      {/* amber chip on crossbar end */}
      <rect x="52" y="152" width="10" height="10" rx="2.5" fill={MASCOT_COLORS.accent} />
    </svg>
  );
}

// Monochrome — for dark headers / print.
function MascotMono({ size = 200, color = '#1A1B2E' }) {
  const bgColor = color === '#fff' || color === '#FFFFFF' ? '#1A1B2E' : '#fff';
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} aria-label="Mascot — mono">
      <FourBody fill={color} />
      <Face variant="default" eyeColor={bgColor} />
      <path d="M 76 142 Q 66 154 66 170" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <circle cx="66" cy="172" r="6" fill={color} />
      <path d="M 158 142 Q 168 154 168 170" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <circle cx="168" cy="172" r="6" fill={color} />
      <ellipse cx="130" cy="220" rx="12" ry="6" fill={color} />
      <ellipse cx="152" cy="220" rx="12" ry="6" fill={color} />
    </svg>
  );
}

Object.assign(window, {
  MASCOT_COLORS,
  FourBody, Face, Arms, Feet, Shadow,
  MascotFlat, MascotShaded, MascotOutlined,
  MascotExpert, MascotWaving, MascotAbstract,
  MascotMono,
});
