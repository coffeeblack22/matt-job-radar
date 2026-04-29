// Compactor schematics — hi-fi blueprint vector with parametric animation.
// Each takes { progress: 0..1, stroke, accent, fill }
// progress drives the visible kinematics (ram travel, door state, etc).

(function () {

const lerp = (a, b, t) => a + (b - a) * t;

// Vertical Baler — chamber + descending platen with bale forming below.
function VerticalBaler({ progress = 0.5, stroke = '#f0f4ff', accent = '#00ff88', label = true }) {
  const ramY = lerp(60, 240, progress);  // platen position
  const bale = lerp(0, 70, progress);    // bale height that grows as platen descends
  return (
    <svg viewBox="0 0 320 480" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* Top crossbeam */}
      <rect x="20" y="20" width="280" height="22" fill="none" stroke={stroke} strokeWidth="2" />
      {/* Side rails */}
      <line x1="40" y1="42" x2="40" y2="430" stroke={stroke} strokeWidth="2" />
      <line x1="280" y1="42" x2="280" y2="430" stroke={stroke} strokeWidth="2" />
      {/* Cross brace */}
      <line x1="40" y1="430" x2="280" y2="430" stroke={stroke} strokeWidth="2" />
      <rect x="20" y="430" width="280" height="22" fill="none" stroke={stroke} strokeWidth="2" />

      {/* Hydraulic cylinder housing */}
      <rect x="135" y="42" width="50" height="48" fill="none" stroke={stroke} strokeWidth="1.5" />
      <line x1="160" y1="42" x2="160" y2="22" stroke={stroke} strokeWidth="1" strokeDasharray="3 3" />

      {/* Piston rod */}
      <rect x="156" y="90" width="8" height={ramY - 90} fill={stroke} opacity="0.8" />

      {/* Platen / ram */}
      <g>
        <rect x="50" y={ramY} width="220" height="26" fill={accent} opacity="0.18" />
        <rect x="50" y={ramY} width="220" height="26" fill="none" stroke={accent} strokeWidth="2" />
        {[0, 1, 2, 3, 4].map(i => (
          <line key={i} x1={70 + i * 40} y1={ramY + 6} x2={70 + i * 40} y2={ramY + 20} stroke={accent} strokeWidth="1.2" />
        ))}
      </g>

      {/* Compacted bale forming */}
      <rect x="60" y={430 - bale} width="200" height={bale} fill={stroke} opacity="0.2" />
      <rect x="60" y={430 - bale} width="200" height={bale} fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="3 4" />

      {/* Strap lines on bale */}
      {progress > 0.85 && (
        <>
          <line x1="60" y1={400 - bale * 0.5} x2="260" y2={400 - bale * 0.5} stroke={accent} strokeWidth="1.5" />
        </>
      )}

      {/* Door (loading slot) on left side */}
      <rect x="40" y="220" width="60" height="70" fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="2 3" />

      {/* Floor */}
      <line x1="0" y1="452" x2="320" y2="452" stroke={stroke} strokeWidth="2" />
      <g stroke={stroke} strokeWidth="1" opacity="0.4">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <line key={i} x1={i * 50} y1="452" x2={i * 50 + 14} y2="470" />
        ))}
      </g>

      {label && (
        <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill={accent} letterSpacing="2">
          <text x="20" y="14">01 · VERTICAL BALER</text>
          <text x="200" y="14" fill={stroke} opacity="0.5">RAM · {Math.round(progress * 100)}%</text>
        </g>
      )}
    </svg>
  );
}

// Self-Contained — sealed body, ram sweeps left to right.
function SelfContained({ progress = 0.5, stroke = '#f0f4ff', accent = '#00ff88', label = true }) {
  const ramX = lerp(40, 240, progress);
  return (
    <svg viewBox="0 0 480 320" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* Body */}
      <rect x="20" y="60" width="380" height="200" fill="none" stroke={stroke} strokeWidth="2" />
      {/* Top hopper */}
      <path d={`M 60 60 L 120 30 L 200 30 L 240 60`} fill="none" stroke={stroke} strokeWidth="2" />
      {/* End cap (collection) */}
      <rect x="400" y="80" width="60" height="160" fill="none" stroke={stroke} strokeWidth="2" />
      <line x1="430" y1="80" x2="430" y2="240" stroke={stroke} strokeWidth="1" strokeDasharray="3 4" />

      {/* Track */}
      <line x1="40" y1="180" x2="380" y2="180" stroke={stroke} strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />

      {/* Ram piston housing left */}
      <rect x="22" y="100" width="40" height="120" fill={stroke} opacity="0.08" />
      <rect x="22" y="100" width="40" height="120" fill="none" stroke={stroke} strokeWidth="1" />

      {/* Rod */}
      <rect x="62" y="155" width={ramX - 62} height="8" fill={stroke} opacity="0.7" />

      {/* Ram face */}
      <g>
        <rect x={ramX} y="100" width="22" height="120" fill={accent} opacity="0.18" />
        <rect x={ramX} y="100" width="22" height="120" fill="none" stroke={accent} strokeWidth="2" />
      </g>

      {/* Compacted material */}
      <rect x={ramX + 22} y="110" width={Math.max(0, 380 - ramX - 22)} height="100" fill={stroke} opacity="0.15" />

      {/* Hopper material */}
      <g opacity={1 - progress * 0.7}>
        <circle cx="140" cy="50" r="4" fill={stroke} />
        <circle cx="170" cy="44" r="3" fill={stroke} />
        <circle cx="195" cy="52" r="3.5" fill={stroke} />
      </g>

      {/* Floor wheels */}
      <g stroke={stroke} strokeWidth="1.5" fill="none">
        <circle cx="60" cy="270" r="14" />
        <circle cx="200" cy="270" r="14" />
        <circle cx="340" cy="270" r="14" />
        <circle cx="430" cy="270" r="14" />
      </g>

      {label && (
        <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill={accent} letterSpacing="2">
          <text x="20" y="20">02 · SELF-CONTAINED</text>
          <text x="340" y="20" fill={stroke} opacity="0.5">SWEEP · {Math.round(progress * 100)}%</text>
        </g>
      )}
    </svg>
  );
}

// Stationary — ram pushes material into a detachable hauler.
function Stationary({ progress = 0.5, stroke = '#f0f4ff', accent = '#00ff88', label = true }) {
  const ramX = lerp(60, 220, progress);
  return (
    <svg viewBox="0 0 560 320" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* Body */}
      <rect x="20" y="80" width="280" height="180" fill="none" stroke={stroke} strokeWidth="2" />
      {/* Hopper */}
      <path d="M 80 80 L 140 40 L 240 40 L 280 80" fill="none" stroke={stroke} strokeWidth="2" />

      {/* Detachable hauler */}
      <rect x="310" y="90" width="220" height="170" fill="none" stroke={stroke} strokeWidth="2" />
      <line x1="310" y1="120" x2="530" y2="120" stroke={stroke} strokeWidth="1" />

      {/* Connection flange */}
      <rect x="298" y="110" width="14" height="130" fill={accent} opacity="0.3" />
      <rect x="298" y="110" width="14" height="130" fill="none" stroke={accent} strokeWidth="1.5" />

      {/* Rod + ram */}
      <rect x="40" y="165" width={ramX - 40} height="10" fill={stroke} opacity="0.7" />
      <rect x={ramX} y="115" width="22" height="115" fill={accent} opacity="0.18" />
      <rect x={ramX} y="115" width="22" height="115" fill="none" stroke={accent} strokeWidth="2" />

      {/* Material accumulating in hauler */}
      <rect x="312" y={260 - lerp(0, 130, progress)} width="216" height={lerp(0, 130, progress)} fill={stroke} opacity="0.15" />

      {/* Hauler wheels (truck-style) */}
      <g stroke={stroke} strokeWidth="1.5" fill="none">
        <circle cx="350" cy="270" r="12" />
        <circle cx="500" cy="270" r="12" />
      </g>
      <g stroke={stroke} strokeWidth="1.5" fill="none">
        <circle cx="60" cy="270" r="10" />
        <circle cx="200" cy="270" r="10" />
      </g>

      {label && (
        <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill={accent} letterSpacing="2">
          <text x="20" y="20">03 · STATIONARY</text>
          <text x="420" y="20" fill={stroke} opacity="0.5">PUSH · {Math.round(progress * 100)}%</text>
        </g>
      )}
    </svg>
  );
}

// Chute-fed — multi-floor chute drops material into compactor.
function ChuteFed({ progress = 0.5, stroke = '#f0f4ff', accent = '#00ff88', label = true }) {
  const dropY = lerp(40, 280, Math.min(1, progress * 1.4));
  const ramY = lerp(310, 360, progress);
  return (
    <svg viewBox="0 0 320 480" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* Floors / building stack */}
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <line x1="40" y1={40 + i * 80} x2="280" y2={40 + i * 80} stroke={stroke} strokeWidth="1" opacity="0.4" />
          <text x="50" y={36 + i * 80} fontFamily="JetBrains Mono, monospace" fontSize="9" fill={stroke} opacity="0.4" letterSpacing="2">
            {`FLR · 0${4 - i}`}
          </text>
        </g>
      ))}

      {/* Chute */}
      <rect x="135" y="20" width="50" height="280" fill="none" stroke={stroke} strokeWidth="2" />
      <line x1="135" y1="20" x2="135" y2="300" stroke={stroke} strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
      <line x1="185" y1="20" x2="185" y2="300" stroke={stroke} strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />

      {/* Falling parcel */}
      <rect x="148" y={dropY} width="24" height="24" fill={accent} opacity="0.5" />
      <rect x="148" y={dropY} width="24" height="24" fill="none" stroke={accent} strokeWidth="1.5" />

      {/* Compactor body */}
      <rect x="40" y="300" width="240" height="140" fill="none" stroke={stroke} strokeWidth="2" />
      {/* Ram inside */}
      <rect x="60" y={ramY} width="200" height="20" fill={accent} opacity="0.2" />
      <rect x="60" y={ramY} width="200" height="20" fill="none" stroke={accent} strokeWidth="2" />

      {/* Floor */}
      <line x1="0" y1="440" x2="320" y2="440" stroke={stroke} strokeWidth="2" />
      <g stroke={stroke} strokeWidth="1" opacity="0.4">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <line key={i} x1={i * 50} y1="440" x2={i * 50 + 14} y2="460" />
        ))}
      </g>

      {label && (
        <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill={accent} letterSpacing="2">
          <text x="20" y="14">04 · CHUTE-FED</text>
          <text x="200" y="14" fill={stroke} opacity="0.5">DROP · {Math.round(progress * 100)}%</text>
        </g>
      )}
    </svg>
  );
}

window.HiFiCompactors = { VerticalBaler, SelfContained, Stationary, ChuteFed };
})();
