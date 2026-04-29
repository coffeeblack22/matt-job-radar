// Refined TCC monogram + standalone TCC mark
// Lockup: TCC monogram on left + wordmark stacked on right.

(function () {

function LogoTCC({ size = 80, color = 'currentColor', accent, lockup = 'horizontal', tagline = true }) {
  // Three letters constructed from condensed geometric sans, tightly kerned.
  // T, C, C -- with the right C closed differently to avoid total identity with center C.
  const a = accent || color;
  const monoH = lockup === 'mark' ? size : size * 0.9;
  const tccW = monoH * 1.55;

  const Mono = (
    <svg viewBox="0 0 155 90" width={tccW} height={monoH} style={{ display: 'block' }}>
      {/* T */}
      <g fill={color}>
        <rect x="0" y="0" width="44" height="14" />
        <rect x="15" y="0" width="14" height="90" />
      </g>
      {/* C 1 */}
      <g fill="none" stroke={color} strokeWidth="14">
        <path d="M 96 7 A 38 38 0 1 0 96 83" />
      </g>
      {/* C 2 (slightly offset, tighter) */}
      <g fill="none" stroke={color} strokeWidth="14">
        <path d="M 148 7 A 38 38 0 1 0 148 83" />
      </g>
      {/* accent: green tick across top of right C */}
      <rect x="113" y="0" width="42" height="6" fill={a} />
      {/* corner registration marks */}
      <g stroke={a} strokeWidth="1.5" fill="none" opacity="0.7">
        <path d="M 0 90 L 0 84 L 6 84" />
      </g>
    </svg>
  );

  if (lockup === 'mark') return Mono;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.18 }}>
      {Mono}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1 }}>
        <div style={{
          fontFamily: 'Archivo Narrow, sans-serif',
          fontWeight: 700,
          fontSize: size * 0.34,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          color,
          lineHeight: 1,
        }}>The Compactor Co.</div>
        {tagline && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 500,
            fontSize: size * 0.14,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color,
            opacity: 0.55,
          }}>Service · Repair · Maintenance</div>
        )}
      </div>
    </div>
  );
}

window.LogoTCC = LogoTCC;
})();
