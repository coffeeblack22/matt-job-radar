// Inner pages: Plans, Emergency, Why TCC, Contact

(function () {
const { useState } = React;
const { Nav, Footer, HUD, Marquee } = window.UI;
const C = window.HiFiCompactors;

// ============================================================
// SERVICE PLANS
// ============================================================
function PlansPage({ onNav }) {
  const [hovered, setHovered] = useState(1);
  const tiers = [
    { tier: 'Essential', sub: 'Starter', price: '400', priceUnit: '/Q' },
    { tier: 'Standard', sub: 'Most chosen', price: '720', priceUnit: '/Q', featured: true },
    { tier: 'Complete', sub: 'Turnkey', price: '1,200', priceUnit: '/Q' },
  ];
  const features = [
    ['Quarterly inspection', true, true, true],
    ['Fluid + filter swap', true, true, true],
    ['30-point cycle audit', true, true, true],
    ['Inspection report', true, true, true],
    ['Common wear parts', false, true, true],
    ['Priority dispatch', false, '2.5 hr', '< 2 hr'],
    ['Labor discount', '15%', '25%', 'Included'],
    ['Emergency calls', 'Per-call', '15% off', 'Unlimited'],
    ['All parts included', false, false, true],
    ['All labor included', false, false, true],
  ];

  const cell = (v) => v === true ? '●' : v === false ? '—' : v;

  return (
    <>
      {/* Hero */}
      <section className="hero" style={{ minHeight: 'auto', paddingTop: 100, paddingBottom: 80 }}>
        <div className="hero-grid" />
        <div style={{ maxWidth: 1640, margin: '0 auto', position: 'relative' }}>
          <div className="eyebrow" style={{ marginBottom: 24 }}>§ 01 · PM CONTRACTS</div>
          <h1 className="h-display" style={{ margin: 0, maxWidth: 1100 }}>Service plans that <span style={{ color: 'var(--accent)' }}>pay for themselves.</span></h1>
          <p className="body-lg" style={{ marginTop: 28, maxWidth: 640 }}>One contract covers every compactor on your property. Quarterly visits. We catch problems before they become call-outs.</p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="section" style={{ background: 'var(--bg-2)', paddingTop: 60, paddingBottom: 120 }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          <div className="surface-2" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid var(--line-strong)' }}>
              <div style={{ padding: '32px 32px 24px' }}>
                <div className="eyebrow-mute">FEATURE</div>
              </div>
              {tiers.map((t, i) => (
                <div key={t.tier}
                  onMouseEnter={() => setHovered(i)}
                  style={{ padding: '32px 24px 24px', borderLeft: '1px solid var(--line)', background: t.featured ? 'rgba(0, 255, 136, 0.04)' : 'transparent', position: 'relative' }}>
                  {t.featured && <div className="pm-card-flag" style={{ top: 0 }}>Most chosen</div>}
                  <div className="eyebrow-mute" style={{ marginBottom: 8 }}>{t.sub}</div>
                  <div className="h-3" style={{ marginBottom: 12 }}>{t.tier}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="display" style={{ fontWeight: 700, fontSize: 32, color: t.featured ? 'var(--accent)' : 'var(--fg)' }}>${t.price}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)' }}>{t.priceUnit}</span>
                  </div>
                </div>
              ))}
            </div>
            {features.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid var(--line)', background: i % 2 ? 'transparent' : 'var(--bg-3)' }}>
                <div style={{ padding: '18px 32px', fontFamily: 'var(--display)', fontSize: 15, color: 'var(--fg)' }}>{row[0]}</div>
                {[1, 2, 3].map(j => (
                  <div key={j} style={{ padding: '18px 24px', borderLeft: '1px solid var(--line)', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 13, background: j === 2 ? 'rgba(0,255,136,0.04)' : 'transparent', color: row[j] === true ? 'var(--accent)' : row[j] === false ? 'var(--fg-mute)' : 'var(--fg)' }}>
                    {cell(row[j])}
                  </div>
                ))}
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderTop: '1px solid var(--line-strong)' }}>
              <div style={{ padding: 24 }}></div>
              {tiers.map((t, i) => (
                <div key={t.tier} style={{ padding: 24, borderLeft: '1px solid var(--line)', background: t.featured ? 'rgba(0,255,136,0.04)' : 'transparent' }}>
                  <button className={'btn btn-arrow' + (t.featured ? ' btn-primary' : '')} style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNav('contact')}>Quote {t.tier}</button>
                </div>
              ))}
            </div>
          </div>
          <div className="mono" style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '0.16em' }}>
            PRICES PER UNIT · SCALES WITH PORTFOLIO · CUSTOM QUOTES FOR &gt; 5 UNITS
          </div>
        </div>
      </section>

      {/* Detail blocks */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          {[
            { tier: 'Essential', tag: 'STARTER · DIY-ADJACENT', copy: 'Best for single-unit operators or portfolios with reliable equipment. Quarterly inspection covers fluid, filter, belts, and a 30-point cycle audit. When something breaks, you pay an hourly rate (15% below our standard rate).' },
            { tier: 'Standard', tag: 'MOST CHOSEN · BEST VALUE', copy: 'Adds parts coverage on common wear items — seals, belts, switches, hoses. Priority dispatch on emergency calls cuts average response from 4 hrs to 2.5 hrs. Labor discount jumps to 25%.' },
            { tier: 'Complete', tag: 'TURNKEY · SET & FORGET', copy: 'All-inclusive. Every call, every part, every labor hour, every truck roll — covered. Predictable monthly billing. The plan we recommend for portfolios of 4+ units or properties where downtime is a tenant-relations problem.' },
          ].map((p, i) => (
            <div key={i} className="surface" style={{ padding: 48, marginBottom: 16, display: 'grid', gridTemplateColumns: '120px 1fr 240px', gap: 48, alignItems: 'flex-start' }}>
              <div className="display" style={{ fontWeight: 700, fontSize: 100, opacity: 0.12, lineHeight: 1 }}>0{i+1}</div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>{p.tag}</div>
                <h3 className="h-2">{p.tier}</h3>
                <p className="body-lg" style={{ marginTop: 20 }}>{p.copy}</p>
              </div>
              <button className="btn btn-arrow" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNav('contact')}>Quote this plan</button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="section" style={{ background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>§ FAQ</div>
          <h2 className="h-1" style={{ margin: 0, marginBottom: 48 }}>What property managers ask.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['What if I have multiple compactors?', 'One contract covers all units on a property. We discount per-unit as you add more.'],
              ['Do you service brands you didn\'t install?', 'Yes — every commercial compactor brand. Bring us your existing fleet.'],
              ['What\'s the cancellation?', '30-day notice, no penalty. We earn it every quarter or you walk.'],
              ['Can I upgrade mid-contract?', 'Yes — pro-rate the difference and switch tier whenever.'],
            ].map(([q, a]) => (
              <div key={q} className="surface" style={{ padding: 32 }}>
                <h3 className="h-3" style={{ marginBottom: 12 }}>{q}</h3>
                <p className="body" style={{ margin: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ============================================================
// EMERGENCY
// ============================================================
function EmergencyPage({ onNav }) {
  return (
    <>
      <section className="hero" style={{ minHeight: 'auto', paddingTop: 100, paddingBottom: 60 }}>
        <div className="hero-grid" />
        <div style={{ maxWidth: 1640, margin: '0 auto', position: 'relative', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div className="chip chip-accent chip-dot" style={{ marginBottom: 24 }}>24/7 · NYC + TRI-STATE</div>
            <h1 className="h-display" style={{ margin: 0 }}>Got a unit <span style={{ color: 'var(--accent)' }}>down?</span> Call now.</h1>
            <p className="body-lg" style={{ marginTop: 28, maxWidth: 600 }}>Hydraulic blowouts, control failures, jammed bales, electrical — we dispatch within 4 hours. Master technician on every truck.</p>
          </div>
          <div className="surface cross-corners" style={{ padding: 40, position: 'relative', textAlign: 'center' }}>
            <div className="cb1"></div><div className="cb2"></div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>► EMERGENCY · 24/7</div>
            <a className="display" style={{ fontWeight: 700, fontSize: 56, letterSpacing: '-0.02em', color: 'var(--fg)', textDecoration: 'none', display: 'block', marginBottom: 8 }} href="tel:2125550100">(212)<br/>555-0100</a>
            <div className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '0.16em' }}>AVG ANSWER · 8 SEC</div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>§ 01 · HOW IT WORKS</div>
          <h2 className="h-1" style={{ marginTop: 0, marginBottom: 48 }}>Four steps from call to fix.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              ['Call', 'Real human picks up. No tree, no hold music. Average answer time: 8 seconds.'],
              ['Describe', 'Tell us the unit + the symptom. We pre-pull common parts before dispatch.'],
              ['Dispatch', 'Tech rolls within 4 hrs. Master-cert hydraulics on every truck.'],
              ['Fix', '92% of calls fixed on the first visit. We don\'t leave a unit down.'],
            ].map(([h, b], i) => (
              <div key={i} className="surface" style={{ padding: 32, position: 'relative', minHeight: 240 }}>
                <div className="display" style={{ fontWeight: 700, fontSize: 80, opacity: 0.12, lineHeight: 1, position: 'absolute', top: 16, right: 24 }}>0{i+1}</div>
                <div className="eyebrow" style={{ marginBottom: 16 }}>STEP {i+1}</div>
                <h3 className="h-3" style={{ marginBottom: 12 }}>{h}</h3>
                <p className="body" style={{ margin: 0 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>§ 02 · COMMON ISSUES</div>
          <h2 className="h-1" style={{ marginTop: 0, marginBottom: 48 }}>What we fix, every week.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              ['Hydraulic leak', 'Seals, hoses, cylinder rebuild.'],
              ['Control board', 'Relay, indicator, sensor.'],
              ['Jammed bale', 'Door, latch, ejector.'],
              ['Motor failure', 'Rebuild or full swap.'],
              ['Electrical', '480V wiring, contactors.'],
              ['Structural', 'Welds, frame, guards.'],
            ].map(([h, b], i) => (
              <div key={i} className="surface" style={{ padding: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="h-4" style={{ marginBottom: 8 }}>{h}</div>
                  <div className="body-sm" style={{ margin: 0 }}>{b}</div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.16em' }}>0{i+1}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>§ 03 · COVERAGE</div>
          <h2 className="h-1" style={{ marginTop: 0, marginBottom: 24 }}>Where we go.</h2>
          <p className="body-lg" style={{ marginBottom: 48, maxWidth: 600 }}>Five boroughs, Long Island, Westchester, North Jersey. 12 trucks. Same-day dispatch.</p>

          <div className="surface cross-corners" style={{ position: 'relative', height: 480, padding: 48 }}>
            <div className="cb1"></div><div className="cb2"></div>
            {/* Schematic NY-area "map" — abstract diagram */}
            <svg viewBox="0 0 1000 400" style={{ width: '100%', height: '100%' }}>
              {[...Array(20)].map((_, i) => (
                <line key={'h'+i} x1="0" y1={i*20} x2="1000" y2={i*20} stroke="var(--line)" strokeWidth="0.5" />
              ))}
              {[...Array(50)].map((_, i) => (
                <line key={'v'+i} x1={i*20} y1="0" x2={i*20} y2="400" stroke="var(--line)" strokeWidth="0.5" />
              ))}
              {/* Boroughs as labeled regions */}
              {[
                { x: 480, y: 220, label: 'MN', name: 'Manhattan' },
                { x: 600, y: 240, label: 'BX', name: 'Bronx' },
                { x: 580, y: 290, label: 'QN', name: 'Queens' },
                { x: 480, y: 320, label: 'BK', name: 'Brooklyn' },
                { x: 380, y: 320, label: 'SI', name: 'Staten Is' },
                { x: 720, y: 280, label: 'LI', name: 'Long Island' },
                { x: 580, y: 140, label: 'WC', name: 'Westchester' },
                { x: 320, y: 220, label: 'NJ', name: 'N. Jersey' },
              ].map((p) => (
                <g key={p.label}>
                  <circle cx={p.x} cy={p.y} r="32" fill="rgba(0,255,136,0.06)" stroke="var(--accent)" strokeWidth="1" />
                  <circle cx={p.x} cy={p.y} r="6" fill="var(--accent)" />
                  <text x={p.x} y={p.y - 44} fontFamily="JetBrains Mono, monospace" fontSize="11" fill="var(--accent)" textAnchor="middle" letterSpacing="2">{p.label}</text>
                  <text x={p.x} y={p.y + 56} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="var(--fg-mute)" textAnchor="middle" letterSpacing="1.5">{p.name.toUpperCase()}</text>
                </g>
              ))}
              {/* Connection lines */}
              <g stroke="var(--accent)" strokeWidth="0.5" fill="none" opacity="0.4">
                <path d="M 480 220 L 600 240 L 580 290 L 480 320 L 380 320 Z" />
                <line x1="480" y1="220" x2="320" y2="220" />
                <line x1="600" y1="240" x2="720" y2="280" />
                <line x1="600" y1="240" x2="580" y2="140" />
              </g>
              <text x="500" y="40" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="var(--fg-mute)" textAnchor="middle" letterSpacing="3">► COVERAGE · 12 TRUCKS · 4 HR AVG</text>
            </svg>
          </div>

          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[['12', 'Trucks'], ['8 sec', 'Avg answer'], ['3.7 hr', 'Avg dispatch'], ['92%', 'First-visit fix']].map(([n, l]) => (
              <div key={l} className="surface" style={{ padding: 28 }}>
                <div className="display" style={{ fontWeight: 700, fontSize: 48, color: 'var(--accent)', lineHeight: 1 }}>{n}</div>
                <div className="eyebrow-mute" style={{ marginTop: 8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ============================================================
// WHY TCC
// ============================================================
function WhyPage({ onNav }) {
  return (
    <>
      <section className="hero" style={{ minHeight: 'auto', paddingTop: 100, paddingBottom: 80 }}>
        <div className="hero-grid" />
        <div style={{ maxWidth: 1640, margin: '0 auto', position: 'relative' }}>
          <div className="eyebrow" style={{ marginBottom: 24 }}>EST 1980 · FAMILY OPERATED · TWO GENERATIONS</div>
          <h1 className="h-display" style={{ margin: 0, maxWidth: 1200 }}>The call you <span style={{ color: 'var(--accent)' }}>don't dread</span> making.</h1>
          <p className="body-lg" style={{ marginTop: 28, maxWidth: 700 }}>
            We're a small shop with deep bench. Two-generation family business. Same crew picks up the phone today as forty years ago.
          </p>
        </div>
      </section>

      {/* Differentiators */}
      <section className="section" style={{ background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          <div className="section-head">
            <div className="section-num">§ 01</div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>WHAT MAKES US DIFFERENT</div>
              <h2 className="h-1" style={{ margin: 0 }}>Six things you'll notice in week one.</h2>
            </div>
            <div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              ['No call center', 'You call, you get a person who knows compactors. Not a script-reader.'],
              ['Master techs', 'Every truck has a master-certified hydraulics tech. No apprentices on emergencies.'],
              ['Every brand', 'We service factory + aftermarket. Bring us your existing fleet — we know it.'],
              ['First-visit fix', '92% of repairs done on the first roll. Common parts on every truck.'],
              ['Transparent', `Quote before we touch a wrench. Photos of failed parts. No "while we're here" upsells.`],
              ['Family-run', 'Frank Sr. founded in 1980. Frank Jr. runs operations now. Same number, same people.'],
            ].map(([h, b], i) => (
              <div key={i} className="surface" style={{ padding: 32, minHeight: 200 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.16em', marginBottom: 16 }}>0{i+1}</div>
                <h3 className="h-3" style={{ marginBottom: 12 }}>{h}</h3>
                <p className="body" style={{ margin: 0 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clients band */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>§ 02 · WHO RELIES ON US</div>
          <h2 className="h-1" style={{ marginTop: 0, marginBottom: 48 }}>Two of the city's biggest agencies, plus 1,200 private units.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[
              { name: 'NYCTA', sub: 'Transit Authority', units: '184 units', tenure: 'Since 2003', desc: 'Service & PM across the depot network. We handle every compactor west of Yankee Stadium.' },
              { name: 'NYPD', sub: 'Police Department', units: '62 units', tenure: 'Since 2011', desc: 'Precinct-level service contracts. 24/7 emergency line for impound and evidence-handling sites.' },
            ].map((c) => (
              <div key={c.name} className="surface cross-corners" style={{ padding: 40, position: 'relative' }}>
                <div className="cb1"></div><div className="cb2"></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <div className="display" style={{ fontWeight: 700, fontSize: 56, lineHeight: 0.9, letterSpacing: '-0.02em' }}>{c.name}</div>
                    <div className="body-sm" style={{ marginTop: 8 }}>{c.sub}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.16em' }}>● {c.units.toUpperCase()}</div>
                    <div className="eyebrow-mute" style={{ marginTop: 8 }}>{c.tenure}</div>
                  </div>
                </div>
                <p className="body" style={{ margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {['NYC DOT', 'Port Authority', 'JFK Cargo', 'NYU Langone', 'Bronx Hosp Net', 'Midtown Mgmt'].map(c => (
              <div key={c} style={{ background: 'var(--bg-2)', padding: 24, textAlign: 'center' }}>
                <div className="display" style={{ fontWeight: 600, fontSize: 18, color: 'var(--fg-soft)' }}>{c}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section" style={{ background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          <div className="section-head">
            <div className="section-num">§ 03</div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>TRACK RECORD</div>
              <h2 className="h-1" style={{ margin: 0 }}>Forty years. One truck to twelve.</h2>
            </div>
            <div></div>
          </div>
          <div style={{ position: 'relative', paddingLeft: 32 }}>
            <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 1, background: 'var(--line-strong)' }} />
            {[
              ['1980', 'Founded', 'Frank C. Sr. starts TCC out of a single truck in Long Island City. First clients: NYC bodega chains.'],
              ['1992', 'First major contract', 'Multi-year PM contract with a major NYC grocer chain — 18 stores. Hires first three full-time techs.'],
              ['2001', 'Chute-fed expansion', 'Expands into multi-family residential chute-fed service. First high-rise contract on the Upper West Side.'],
              ['2003', 'NYCTA contract', 'Wins NYCTA service contract. Begins covering depot compactors across the transit network.'],
              ['2014', '2nd generation', 'Frank C. Jr. takes over operations. Frank Sr. stays on the bench through 2019.'],
              ['2026', 'Twelve trucks', '1,247 units under contract across NYC + tri-state. Same number. Same family. Same standards.'],
            ].map(([y, h, b], i) => (
              <div key={y} style={{ position: 'relative', paddingBottom: 48 }}>
                <div style={{ position: 'absolute', left: -32, top: 6, width: 18, height: 18, background: 'var(--bg-2)', border: '2px solid var(--accent)', boxShadow: 'var(--green-glow)' }} />
                <div className="mono" style={{ fontSize: 13, color: 'var(--accent)', letterSpacing: '0.16em', marginBottom: 8 }}>{y}</div>
                <h3 className="h-3" style={{ marginBottom: 8 }}>{h}</h3>
                <p className="body-lg" style={{ margin: 0, maxWidth: 720 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photos placeholder strip */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>§ 04 · ON THE JOB</div>
          <h2 className="h-1" style={{ marginTop: 0, marginBottom: 48 }}>Trucks roll. Techs work.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <div className="photo" style={{ height: 480 }}>
              <div className="caption">PHOTO · TCC TRUCK · BX HOSPITAL · 03/26</div>
            </div>
            <div className="photo" style={{ height: 480 }}>
              <div className="caption">PHOTO · BENCH WORK · LIC SHOP</div>
            </div>
            <div className="photo" style={{ height: 480 }}>
              <div className="caption">PHOTO · CREW · 2026</div>
            </div>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '0.16em', marginTop: 16 }}>► REAL CREW PHOTOS TO BE SUPPLIED</div>
        </div>
      </section>
    </>
  );
}

// ============================================================
// CONTACT
// ============================================================
function ContactPage() {
  return (
    <>
      <section className="hero" style={{ minHeight: 'auto', paddingTop: 100, paddingBottom: 60 }}>
        <div className="hero-grid" />
        <div style={{ maxWidth: 1640, margin: '0 auto', position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 24 }}>GET A QUOTE</div>
            <h1 className="h-display" style={{ margin: 0 }}>Tell us what<br/>you've <span style={{ color: 'var(--accent)' }}>got.</span></h1>
            <p className="body-lg" style={{ marginTop: 28, maxWidth: 480 }}>Two-minute form. Tech-grade quote back the same day during business hours. For emergencies, just call.</p>
            <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="surface" style={{ padding: 24 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>EMERGENCY · 24/7</div>
                <a href="tel:2125550100" className="display" style={{ fontWeight: 700, fontSize: 26, color: 'var(--fg)', textDecoration: 'none', letterSpacing: '-0.01em' }}>(212) 555-0100</a>
              </div>
              <div className="surface" style={{ padding: 24 }}>
                <div className="eyebrow-mute" style={{ marginBottom: 12 }}>EMAIL</div>
                <div className="mono" style={{ fontSize: 16, color: 'var(--fg)' }}>service@tcc.com</div>
              </div>
              <div className="surface" style={{ padding: 24 }}>
                <div className="eyebrow-mute" style={{ marginBottom: 12 }}>SHOP</div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.6 }}>240 Industry Ave<br/>Long Island City, NY 11101</div>
              </div>
              <div className="surface" style={{ padding: 24 }}>
                <div className="eyebrow-mute" style={{ marginBottom: 12 }}>HOURS</div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.6 }}>M-F 7a · 7p<br/>Sat on-call · Sun emergency only</div>
              </div>
            </div>
          </div>

          <div className="surface-2 cross-corners" style={{ padding: 48, position: 'relative' }}>
            <div className="cb1"></div><div className="cb2"></div>
            <div className="eyebrow" style={{ marginBottom: 32 }}>► QUOTE REQUEST · 6 FIELDS</div>
            {[
              { l: 'NAME', p: 'Your name', h: 48 },
              { l: 'COMPANY / BUILDING', p: 'e.g. 240 Industry Ave LLC', h: 48 },
              { l: 'CALLBACK NUMBER', p: '(___) ___-____', h: 48 },
              { l: '# COMPACTORS ON SITE', p: '1 unit', h: 48 },
              { l: 'INTERESTED IN', p: 'PM Contract', h: 48 },
              { l: 'ANYTHING WE SHOULD KNOW', p: 'Optional…', h: 100 },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div className="eyebrow-mute" style={{ marginBottom: 8 }}>{f.l}</div>
                <div style={{ height: f.h, border: '1px solid var(--line-strong)', padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--fg-mute)', background: 'var(--bg)' }}>{f.p}</div>
              </div>
            ))}
            <button className="btn btn-primary btn-arrow" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Submit quote request</button>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-mute)', letterSpacing: '0.16em', marginTop: 16, textAlign: 'center' }}>WE REPLY SAME DAY · M-F</div>
          </div>
        </div>
      </section>
    </>
  );
}

window.Pages = { PlansPage, EmergencyPage, WhyPage, ContactPage };
})();
