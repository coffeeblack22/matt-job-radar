// Homepage — Hero Cycle direction
// Cinematic dark hero with scroll-pinned compactor cycle.

(function () {
const { useState, useEffect, useRef } = React;
const { Nav, Footer, HUD, Marquee, StatBlock } = window.UI;
const C = window.HiFiCompactors;

function HeroCycle({ heroType = 'vertical', speed = 60 }) {
  const [progress, setProgress] = useState(0);
  const [auto, setAuto] = useState(true);
  const ref = useRef(null);

  // Scroll-driven inside the hero section
  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (total <= 0) return;
      const p = Math.max(0, Math.min(1, -r.top / total));
      if (p > 0.02 && p < 0.98) {
        setAuto(false);
        setProgress(p);
      } else {
        setAuto(true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-cycle when not scroll-scrubbed
  useEffect(() => {
    if (!auto) return;
    const start = performance.now();
    const period = Math.max(1500, (110 - speed) * 80);
    let raf;
    const loop = (t) => {
      const ph = ((t - start) / period) % 1;
      const v = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
      setProgress(v);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auto, speed]);

  const Comp = { vertical: C.VerticalBaler, selfcontained: C.SelfContained, stationary: C.Stationary, chute: C.ChuteFed }[heroType] || C.VerticalBaler;

  const labels = { vertical: 'Vertical baler', selfcontained: 'Self-contained', stationary: 'Stationary', chute: 'Chute-fed' };

  return (
    <section ref={ref} className="hero" style={{ minHeight: '180vh', position: 'relative' }}>
      {/* Pinned content */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="hero-grid" />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'center', padding: '0 var(--pad-x)', gap: 40, position: 'relative', maxWidth: 1640, margin: '0 auto', width: '100%' }}>
          <div>
            <div className="chip chip-accent chip-dot" style={{ marginBottom: 32 }}>EST 1980 · NYC · 24/7 EMERGENCY</div>
            <h1 className="h-display" style={{ margin: 0 }}>
              We keep<br/>the cycle<br/><span style={{ color: 'var(--accent)', textShadow: 'var(--green-glow)' }}>running.</span>
            </h1>
            <p className="body-lg" style={{ marginTop: 28, maxWidth: 540 }}>
              PM contracts and 24/7 emergency service for every commercial compactor in your portfolio. Forty years of bench. One number. No call tree.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
              <button className="btn btn-primary btn-arrow" onClick={() => window.dispatchEvent(new CustomEvent('tcc-nav', { detail: 'plans' }))}>See PM plans</button>
              <a className="btn btn-arrow" href="tel:2125550100">Call emergency</a>
            </div>

            {/* Scrub indicator */}
            <div style={{ marginTop: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--fg-mute)' }}>SCROLL TO CYCLE</div>
              <div style={{ flex: 1, maxWidth: 200, height: 2, background: 'var(--line-strong)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${progress * 100}%`, background: 'var(--accent)', boxShadow: 'var(--green-glow)' }}></div>
              </div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--accent)' }}>{Math.round(progress * 100).toString().padStart(2, '0')}%</div>
            </div>
          </div>

          {/* Hero compactor — large, centerpiece */}
          <div style={{ position: 'relative', height: '70vh', maxHeight: 720, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="cross-corners" style={{ width: '100%', height: '100%', padding: 32, position: 'relative' }}>
              <div className="cb1"></div><div className="cb2"></div>
              <div style={{ position: 'absolute', top: 12, left: 12, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--fg-mute)' }}>UNIT · {labels[heroType].toUpperCase()}</div>
              <div style={{ position: 'absolute', top: 12, right: 12, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--accent)' }}>● LIVE CYCLE</div>
              <Comp progress={progress} stroke="var(--fg)" accent="var(--accent)" label={false} />
              <div style={{ position: 'absolute', bottom: 12, left: 12, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--fg-mute)' }}>RAM · {Math.round(progress * 100)}% · CYCLE TIME 22S</div>
              <div style={{ position: 'absolute', bottom: 12, right: 12, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--fg-mute)' }}>SCHEMATIC · TCC-04A</div>
            </div>
          </div>
        </div>

        {/* HUD strip at bottom of hero */}
        <HUD items={[
          ['UNITS UNDER CONTRACT', '1,247'],
          ['CALLS THIS MONTH', '186'],
          ['AVG RESPONSE', '3.7', 'HR'],
          ['FIX-FIRST-VISIT', '92', '%'],
          ['PM RETENTION', '98', '%'],
          ['ON THE BENCH', '40', 'YR'],
        ]} />
      </div>
    </section>
  );
}

function ProofMarquee() {
  return (
    <Marquee items={[
      'NYCTA · TRANSIT AUTHORITY',
      'NYPD · POLICE DEPT',
      'NYC DOT',
      'PRIVATE GROCERY · 22 LOCATIONS',
      'MULTI-FAMILY · 1,200 UNITS',
      'NYU LANGONE',
      'PORT AUTHORITY',
      'JFK CARGO TERMINALS',
      'BX HOSPITAL NETWORK',
    ]} />
  );
}

function PlansBlock({ onNav }) {
  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1640, margin: '0 auto' }}>
        <div className="section-head">
          <div className="section-num">§ 01</div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>PM CONTRACTS · PRIMARY OFFERING</div>
            <h2 className="h-1" style={{ margin: 0 }}>The plan that pays for itself.</h2>
            <p className="body-lg" style={{ marginTop: 16, maxWidth: 600 }}>One contract covers every compactor on your property. Quarterly visits. We catch problems before they call you at 2am.</p>
          </div>
          <button className="btn btn-arrow" onClick={() => onNav('plans')}>Compare plans</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { tier: 'Essential', sub: 'Starter · DIY-adjacent', price: 'From $400', priceUnit: '/quarter', desc: 'Quarterly visit. Inspection + fluid + filter. Discounted hourly when something breaks.', incl: ['Quarterly inspection', 'Fluid + filter swap', '30-point cycle audit', 'Inspection report'], excl: ['Parts coverage', 'Priority dispatch'] },
            { tier: 'Standard', sub: 'Most chosen · Best value', price: 'From $720', priceUnit: '/quarter', desc: 'Adds parts coverage on common wear items. Priority dispatch — 2.5hr avg response.', incl: ['Everything in Essential', 'Common wear parts inc.', 'Priority dispatch · 2.5hr', '25% labor discount'], excl: ['Unlimited calls'], featured: true },
            { tier: 'Complete', sub: 'Turnkey · Set & forget', price: 'From $1,200', priceUnit: '/quarter', desc: 'All-inclusive. Every call, every part, every truck roll — covered. Predictable monthly billing.', incl: ['Everything in Standard', 'All parts included', 'All labor included', 'Unlimited emergency calls', '24/7 priority line'], excl: [] },
          ].map(p => (
            <div key={p.tier} className={'pm-card' + (p.featured ? ' featured' : '')}>
              {p.featured && <div className="pm-card-flag">Most chosen</div>}
              <div>
                <div className="eyebrow-mute" style={{ marginBottom: 8 }}>{p.sub}</div>
                <div className="h-2" style={{ marginBottom: 16 }}>{p.tier}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div className="display" style={{ fontWeight: 700, fontSize: 38, color: p.featured ? 'var(--accent)' : 'var(--fg)' }}>{p.price}</div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--fg-mute)' }}>{p.priceUnit}</div>
                </div>
              </div>
              <p className="body-sm" style={{ margin: 0 }}>{p.desc}</p>
              <ul className="feat-list">
                {p.incl.map(f => <li key={f}>{f}</li>)}
                {p.excl.map(f => <li key={f} className="dim">{f}</li>)}
              </ul>
              <button className={'btn ' + (p.featured ? 'btn-primary' : '') + ' btn-arrow'} onClick={() => onNav('plans')}>Quote this plan</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MathBlock() {
  return (
    <section className="section stripe" style={{ background: 'var(--bg-2)', paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1640, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>§ 02 · THE MATH</div>
          <h2 className="h-1" style={{ margin: 0 }}>One missed PM = one weekend emergency.</h2>
          <p className="body-lg" style={{ marginTop: 24 }}>
            $400 quarterly inspection vs. $2,400 weekend hydraulic blowout plus four hours of dumpster overflow your tenants will absolutely call you about. The math isn't close.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            ['$400', 'Avg quarterly visit'],
            ['$2,400', 'Avg emergency call'],
            ['68%', 'Of breakdowns are preventable'],
            ['4.2×', 'ROI on PM contracts'],
          ].map(([n, l]) => (
            <div key={l} style={{ background: 'var(--bg)', padding: 32, minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="display" style={{ fontWeight: 700, fontSize: 64, lineHeight: 0.9, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{n}</div>
              <div className="eyebrow-mute">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmergencyBand({ onNav }) {
  return (
    <section className="section" style={{ background: 'var(--bg-3)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1640, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>§ 03 · 24/7 EMERGENCY</div>
          <h2 className="h-1" style={{ margin: 0 }}>Down? We dispatch in four hours.</h2>
          <p className="body-lg" style={{ marginTop: 24 }}>Hydraulic blowouts. Control failures. Jammed bales. Whatever's down, our master techs roll with the parts to fix it on the first visit.</p>
          <div style={{ marginTop: 32, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['4-hour response', 'NYC + tri-state', '92% first-visit fix', 'Master-cert techs', 'Common parts on board'].map(t => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
          <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
            <button className="btn btn-primary btn-arrow" onClick={() => onNav('emergency')}>How dispatch works</button>
            <a className="btn btn-arrow" href="tel:2125550100">(212) 555-0100</a>
          </div>
        </div>
        <div className="surface cross-corners" style={{ padding: 40, position: 'relative' }}>
          <div className="cb1"></div><div className="cb2"></div>
          <div className="eyebrow" style={{ marginBottom: 24 }}>► CALL FLOW · 4 STEPS</div>
          {[
            ['01', 'Call', 'Real human picks up. No tree.'],
            ['02', 'Describe', 'Tell us the unit + the symptom.'],
            ['03', 'Dispatch', 'Tech rolls within 4 hrs.'],
            ['04', 'Fix', '92% done on the first visit.'],
          ].map(([n, h, b], i, arr) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 20, padding: '20px 0', borderTop: i ? '1px dashed var(--line)' : 'none' }}>
              <div className="mono" style={{ fontSize: 24, color: 'var(--accent)', fontWeight: 600 }}>{n}</div>
              <div>
                <div className="h-4" style={{ marginBottom: 4 }}>{h}</div>
                <div className="body-sm" style={{ margin: 0 }}>{b}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, paddingTop: 24, borderTop: '1px solid var(--accent)' }}>
            <div className="eyebrow">Emergency line · 24/7</div>
            <div className="display" style={{ fontWeight: 700, fontSize: 40, marginTop: 4, letterSpacing: '-0.01em' }}>(212) 555-0100</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofBlock() {
  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1640, margin: '0 auto' }}>
        <div className="section-head">
          <div className="section-num">§ 04</div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>WHO WE SERVICE</div>
            <h2 className="h-1" style={{ margin: 0 }}>NYC's hardest-running compactors.</h2>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '0.16em' }}>1,247 UNITS UNDER CONTRACT</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { name: 'NYCTA', sub: 'Transit Authority', units: '184 units' },
            { name: 'NYPD', sub: 'Police Department', units: '62 units' },
            { name: 'NYC DOT', sub: 'Dept of Transportation', units: '38 units' },
            { name: 'Port Authority', sub: 'PA NY/NJ', units: '24 units' },
          ].map(c => (
            <div key={c.name} style={{ background: 'var(--bg-2)', padding: 32, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="display" style={{ fontWeight: 700, fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em' }}>{c.name}</div>
                <div className="body-sm" style={{ marginTop: 6 }}>{c.sub}</div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.16em' }}>● {c.units.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 32 }}>
          {[
            ['"Twelve years on a TCC contract. Zero unit-down days longer than 24 hours. They make compactors a non-issue."', 'Director of Facilities', 'NYCTA'],
            ['"They caught a leaking ram on a Tuesday quarterly. Saved a $2,800 weekend repair and a chute backup we would\'ve eaten."', 'Property Manager', 'Midtown Mgmt — 24-unit portfolio'],
          ].map(([q, role, org], i) => (
            <div key={i} className="surface" style={{ padding: 32 }}>
              <div className="display" style={{ fontWeight: 600, fontSize: 22, lineHeight: 1.4, color: 'var(--fg)' }}>{q}</div>
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div className="eyebrow-mute">— {role}</div>
                <div className="eyebrow" style={{ color: 'var(--accent)' }}>{org}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesStrip({ onNav }) {
  return (
    <section className="section" style={{ background: 'var(--bg-2)' }}>
      <div style={{ maxWidth: 1640, margin: '0 auto' }}>
        <div className="section-head">
          <div className="section-num">§ 05</div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>WHAT WE DO</div>
            <h2 className="h-1" style={{ margin: 0 }}>Three things, every day.</h2>
          </div>
          <div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { tag: 'Primary', h: 'PM Service Contracts', b: 'Quarterly preventive maintenance for every compactor on your property. Three plan tiers.', cta: 'See plans', to: 'plans', Comp: C.VerticalBaler },
            { tag: '24/7', h: 'Emergency Repair', b: 'Four-hour response across NYC + tri-state. Master-cert techs on every truck.', cta: 'Dispatch flow', to: 'emergency', Comp: C.SelfContained },
            { tag: 'Turnkey', h: 'Install & Retrofit', b: 'New units, swap-outs, NYC DOB compliance, coordinated electrical.', cta: 'Get a quote', to: 'contact', Comp: C.Stationary },
          ].map((s, i) => (
            <div key={i} className="surface-2" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 200, padding: 16, borderBottom: '1px solid var(--line)', position: 'relative' }}>
                <s.Comp progress={0.55} stroke="var(--fg-soft)" accent="var(--accent)" label={false} />
                <div className="chip chip-accent" style={{ position: 'absolute', top: 12, left: 12 }}>{s.tag}</div>
              </div>
              <div style={{ padding: 32, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 className="h-3">{s.h}</h3>
                <p className="body" style={{ margin: 0, flex: 1 }}>{s.b}</p>
                <button className="btn btn-arrow" onClick={() => onNav(s.to)}>{s.cta}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onNav }) {
  return (
    <section className="section" style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1640, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 80, alignItems: 'center' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>§ 06 · GET A QUOTE</div>
          <h2 className="h-display" style={{ margin: 0, fontSize: 'clamp(72px, 8vw, 132px)' }}>
            Stop dreading <span style={{ color: 'var(--accent)', textShadow: 'var(--green-glow)' }}>downtime.</span>
          </h2>
          <p className="body-lg" style={{ marginTop: 24, maxWidth: 540 }}>
            Two-minute form. Tech-grade quote back the same day during business hours. For emergencies, just call.
          </p>
          <div style={{ marginTop: 36, display: 'flex', gap: 12 }}>
            <button className="btn btn-primary btn-arrow" onClick={() => onNav('contact')}>Get a service quote</button>
            <a className="btn btn-arrow" href="tel:2125550100">(212) 555-0100</a>
          </div>
        </div>
        <div className="surface cross-corners" style={{ padding: 40, position: 'relative' }}>
          <div className="cb1"></div><div className="cb2"></div>
          <div className="eyebrow" style={{ marginBottom: 24 }}>► QUICK QUOTE</div>
          {[
            ['SITE / BUILDING', 'e.g. 240 Industry Ave'],
            ['# OF COMPACTORS', '1 unit'],
            ['INTERESTED IN', 'PM Contract'],
            ['CALLBACK NUMBER', '(___) ___-____'],
          ].map(([l, p], i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div className="eyebrow-mute" style={{ marginBottom: 8 }}>{l}</div>
              <div style={{ height: 44, border: '1px solid var(--line-strong)', padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--fg-mute)' }}>{p}</div>
            </div>
          ))}
          <button className="btn btn-primary btn-arrow" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => onNav('contact')}>Submit quote request</button>
        </div>
      </div>
    </section>
  );
}

function HomePage({ onNav, heroType, speed }) {
  return (
    <>
      <HeroCycle heroType={heroType} speed={speed} />
      <ProofMarquee />
      <PlansBlock onNav={onNav} />
      <MathBlock />
      <EmergencyBand onNav={onNav} />
      <ProofBlock />
      <ServicesStrip onNav={onNav} />
      <FinalCTA onNav={onNav} />
    </>
  );
}

window.HomePage = HomePage;
})();
