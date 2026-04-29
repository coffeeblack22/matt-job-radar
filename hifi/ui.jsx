// Shared layout: Nav + Footer + small UI primitives.

(function () {
const { useState, useEffect } = React;

function Nav({ current = 'home', onNav }) {
  const links = [
    { id: 'home', label: 'Home' },
    { id: 'plans', label: 'Service Plans' },
    { id: 'emergency', label: 'Emergency' },
    { id: 'why', label: 'Why TCC' },
    { id: 'contact', label: 'Contact' },
  ];
  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-brand" onClick={() => onNav('home')}>
          <window.LogoTCC size={36} color="var(--fg)" accent="var(--accent)" tagline={false} />
        </div>
        <div className="nav-links">
          {links.map(l => (
            <a key={l.id} className={'nav-link' + (current === l.id ? ' active' : '')} onClick={() => onNav(l.id)}>
              {l.label}
            </a>
          ))}
        </div>
        <div className="nav-cta">
          <a className="mono" style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--accent)', textDecoration: 'none' }} href="tel:2125550100">
            <span className="chip-dot" style={{ display: 'inline-block', width: 6, height: 6, marginRight: 8, borderRadius: '50%', background: 'var(--accent)' }}></span>
            (212) 555-0100
          </a>
          <button className="btn btn-primary btn-arrow" onClick={() => onNav('contact')}>Get a quote</button>
        </div>
      </div>
    </nav>
  );
}

function Footer({ onNav }) {
  return (
    <footer className="footer">
      <div style={{ maxWidth: 1640, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 48, paddingBottom: 48, borderBottom: '1px solid var(--line)' }}>
          <div>
            <window.LogoTCC size={48} color="var(--fg)" accent="var(--accent)" />
            <div className="body-sm" style={{ marginTop: 24, maxWidth: 320 }}>
              Family-run since 1980. We service every commercial compactor in NYC and the tri-state. PM contracts, 24/7 emergency repair.
            </div>
            <div className="mono" style={{ marginTop: 24, fontSize: 11, letterSpacing: '0.16em', color: 'var(--fg-mute)' }}>
              240 INDUSTRY AVE · LIC, NY 11101
            </div>
          </div>
          {[
            ['Services', [['plans', 'PM Contracts'], ['emergency', '24/7 Emergency'], ['emergency', 'Repairs'], ['plans', 'Inspections']]],
            ['Company', [['why', 'Why TCC'], ['why', 'Track Record'], ['why', 'Industries'], ['contact', 'Careers']]],
            ['Contact', [['contact', '(212) 555-0100'], ['contact', 'service@tcc.com'], ['contact', 'Get a quote'], ['emergency', '24/7 line']]],
          ].map(([h, items]) => (
            <div key={h}>
              <div className="eyebrow-mute" style={{ marginBottom: 16 }}>{h}</div>
              {items.map(([id, t], i) => (
                <a key={i} onClick={() => onNav(id)} style={{ display: 'block', padding: '6px 0', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--fg-soft)', textDecoration: 'none', cursor: 'pointer' }}>{t}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 24, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          <div>© 2026 The Compactor Company, Inc. · Est. 1980</div>
          <div>NYC · BX · BK · QN · SI · LI · WC · NJ</div>
        </div>
      </div>
    </footer>
  );
}

function HUD({ items }) {
  return (
    <div className="hud">
      {items.map((it, i) => (
        <div className="hud-cell" key={i}>
          <div className="hud-label">{it[0]}</div>
          <div className="hud-value">{it[1]}{it[2] && <span className="hud-value-unit">{it[2]}</span>}</div>
        </div>
      ))}
    </div>
  );
}

function Marquee({ items }) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee">
      <div className="marquee-track">
        {doubled.map((t, i) => (
          <span key={i}><span className="dot">●</span> {t}</span>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ value, label, unit }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 80, lineHeight: 0.9, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
        {value}{unit && <span style={{ fontSize: 32, color: 'var(--accent)', marginLeft: 4 }}>{unit}</span>}
      </div>
      <div className="eyebrow-mute" style={{ marginTop: 8 }}>{label}</div>
    </div>
  );
}

window.UI = { Nav, Footer, HUD, Marquee, StatBlock };
})();
