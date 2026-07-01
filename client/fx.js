/* fx.js — animation triggers (design-reference verbatim timing/style, vanilla DOM) */
const FX = (() => {

  // ── helpers ───────────────────────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  function mkDiv(styles, parent, ms) {
    const d = document.createElement('div');
    Object.assign(d.style, styles);
    (parent || document.body).appendChild(d);
    if (ms) setTimeout(() => d.remove(), ms);
    return d;
  }

  // Compute sword center as CSS % of game-root — mirrors FX01's left:'50%',top:'40%' approach
  function anchorPct(anchorEl) {
    if (!anchorEl) anchorEl = el('my-sword-art') || el('game-root');
    const root = el('game-root');
    if (!root) return { cx: '50%', cy: '40%' };
    const r = anchorEl.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    if (rr.width === 0 || rr.height === 0) return { cx: '50%', cy: '40%' };
    const cx = ((r.left + r.width  / 2 - rr.left) / rr.width  * 100).toFixed(1) + '%';
    const cy = ((r.top  + r.height / 2 - rr.top)  / rr.height * 100).toFixed(1) + '%';
    return { cx, cy };
  }

  // pixel coords for FX that still need them (FX02/03/04)
  function anchorCenter(anchorEl) {
    if (!anchorEl) anchorEl = el('my-sword-art') || el('game-root');
    const root = el('game-root');
    if (!root) return { x: 640, y: 360 };
    const r  = anchorEl.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    return {
      x: r.left + r.width  / 2 - rr.left,
      y: r.top  + r.height / 2 - rr.top
    };
  }

  function layer(zIndex, parent) {
    return mkDiv({
      position: 'absolute', inset: '0', zIndex: String(zIndex || 20),
      pointerEvents: 'none', overflow: 'hidden'
    }, parent || el('game-root'));
  }

  // ── buildCardHTML — EnhanceCard.dc.html 원본 그대로 (136×180) ─────────────
  function buildCardHTML(card) {
    const r = String(card.rarity ?? 1);
    const M = {
      '1': { c:'#9aa0ac', t:'#c8ccd4', g:'#9aa0ac', gl:'rgba(154,160,172,0)' },
      '2': { c:'#4fbf66', t:'#8be89c', g:'#4fbf66', gl:'rgba(79,191,102,.5)' },
      '3': { c:'#3f8be0', t:'#82b8f2', g:'#3f8be0', gl:'rgba(63,139,224,.5)' },
      '4': { c:'#a865e8', t:'#caa0f4', g:'#a865e8', gl:'rgba(168,101,232,.55)' },
      '5': { c:'#f5972a', t:'#ffc564', g:'#f6a92e', gl:'rgba(245,151,42,.6)' },
      '6': { c:'#e8463f', t:'#ff8079', g:'#e8463f', gl:'rgba(232,70,63,.6)' }
    };
    let frameBg, glow, gemColor, nameColor, anim = 'none';
    if (r === '7') {
      frameBg = 'linear-gradient(90deg,#ff5e5e,#ffbe4d,#7dff8a,#4dd2ff,#a97bff,#ff5ec8,#ff5e5e)';
      glow = '0 0 14px rgba(255,180,80,.6),0 0 28px rgba(150,120,255,.45),3px 3px 0 rgba(0,0,0,.55)';
      gemColor = '#ffd84d';
      nameColor = '#ffe9a8';
      anim = 'ec_shimmer 3.2s linear infinite, ec_glow 1.9s ease-in-out infinite';
    } else {
      const m = M[r] || M['1'];
      frameBg = m.c; gemColor = m.g; nameColor = m.t;
      const strong = (r === '4' || r === '5' || r === '6');
      glow = strong ? ('0 0 10px ' + m.gl + ',3px 3px 0 rgba(0,0,0,.55)') : '3px 3px 0 rgba(0,0,0,.55)';
    }
    const n = Math.max(1, Math.min(7, parseInt(r, 10) || 1));
    const stars = '★'.repeat(n);
    const starColor = r === '7' ? '#ffd84d' : ((M[r] || M['1']).c);
    const starShadow = r === '7' ? '0 0 6px rgba(255,206,90,.85),1px 1px 0 #000' : '1px 1px 0 #000';
    const starSize = n >= 6 ? '10px' : '12px';

    let xpBlock = '';
    const xpMax = card.xpMax ?? card.xpmax ?? 0;
    if (xpMax > 0) {
      const lv = card.xpLevel ?? card.lv ?? 1;
      const xp = Math.max(0, Math.min(xpMax, card.xp ?? 0));
      const pct = Math.round(xp / xpMax * 100);
      const barCol = r === '7' ? 'linear-gradient(#ffe9a8,#f0a52e)' : 'linear-gradient(#ffd76a,#f0a52e)';
      xpBlock = '<div style="margin-top:3px;display:flex;flex-direction:column;gap:2px;padding:0 1px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-family:Galmuri7,monospace;font-size:8px;color:#ffce5a;text-shadow:1px 1px 0 #000;">Lv.' + lv + '</span><span style="font-family:Galmuri7,monospace;font-size:7px;color:#7d8088;">' + xp + ' / ' + xpMax + '</span></div><div style="height:5px;background:#0e0e14;border:1px solid #000;position:relative;overflow:hidden;"><div style="position:absolute;left:0;top:0;bottom:0;width:' + pct + '%;background:' + barCol + ';box-shadow:0 0 5px rgba(255,180,80,.6);"></div></div></div>';
    }

    return '<div style="width:136px;height:180px;box-sizing:border-box;padding:3px;background:' + frameBg + ';background-size:200% 100%;box-shadow:' + glow + ';image-rendering:pixelated;animation:' + anim + ';flex:none;"><div style="width:100%;height:100%;box-sizing:border-box;background:#15151b;border:2px solid #000;position:relative;display:flex;flex-direction:column;padding:6px 6px 5px;"><div style="position:absolute;top:-3px;left:-3px;width:30px;height:30px;background:' + gemColor + ';border:2px solid #000;box-shadow:inset -2px -2px 0 rgba(0,0,0,.4),inset 2px 2px 0 rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-family:Galmuri11,sans-serif;font-size:15px;color:#1a1206;text-shadow:0 1px 0 rgba(255,255,255,.25);">' + (card.cost ?? '') + '</div><div style="position:absolute;top:5px;right:6px;display:flex;gap:0;font-size:' + starSize + ';line-height:1;letter-spacing:0;color:' + starColor + ';text-shadow:' + starShadow + ';">' + stars + '</div><div style="margin-top:25px;height:72px;border:2px solid #000;background-color:#1c1c24;background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.045) 0 4px,transparent 4px 9px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),inset 0 0 12px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;"><span style="font-family:Galmuri7,monospace;font-size:8px;color:#555564;letter-spacing:1px;">' + (card.art || 'ART') + '</span></div><div style="margin-top:5px;text-align:center;font-family:Galmuri11,sans-serif;font-size:11px;color:' + nameColor + ';text-shadow:1px 1px 0 #000;line-height:1.05;min-height:13px;">' + (card.name ?? '') + '</div><div style="height:2px;background:rgba(255,255,255,.09);margin:4px 1px;"></div><div style="flex:1;text-align:center;font-family:Galmuri9,sans-serif;font-size:9px;color:#b6b9c4;line-height:1.4;padding:1px 1px 0;">' + (card.description ?? card.effect ?? '') + '</div>' + xpBlock + '</div></div>';
  }

  // ── FX01 강화성공 — FX01 원본: 검 중심을 % 기준점으로 (left:'50%',top:'40%' 방식) ──
  function success(combo) {
    const tier = combo <= 2 ? 1 : combo <= 5 ? 2 : 3;
    const anchor = el('my-sword-art');
    const { cx, cy } = anchorPct(anchor);
    const root = el('game-root');
    if (!root) return;

    const lyr = layer(22, root);

    // sparks — FX01 pattern: left/top as CSS % from anchor center
    const count = tier === 1 ? 7 : tier === 2 ? 13 : 22;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (i % 2) * 0.3;
      const dist = 40 + (i % 4) * 22 + tier * 14;
      const sz = 2 + (i % 3);
      const p = document.createElement('div');
      p.style.cssText = 'position:absolute;left:' + cx + ';top:' + cy + ';width:' + sz + 'px;height:' + sz + 'px;background:' + (i%3===0?'#fff2c8':i%3===1?'#ffbe5c':'#ff8a3c') + ';box-shadow:0 0 5px #ff7a2a;--dx:' + (Math.cos(ang)*dist) + 'px;--dy:' + (Math.sin(ang)*dist-20) + 'px;animation:fx_spark ' + (0.42+(i%4)*0.06) + 's steps(6) .14s both;';
      lyr.appendChild(p);
    }

    // impact flash (FX01 iflash verbatim)
    const tColA = tier===3?'rgba(255,205,115,':tier===2?'rgba(255,185,95,':'rgba(255,165,75,';
    const iflash = document.createElement('div');
    iflash.style.cssText = 'position:absolute;inset:0;background:radial-gradient(circle at ' + cx + ' ' + cy + ',' + tColA + '.5),transparent 55%);animation:fx_flash .4s steps(5) .14s both;';
    lyr.appendChild(iflash);

    // shockwave ring (tier>=2) — FX01 verbatim
    const accent = tier === 3 ? '#ffd24d' : '#ffbe5c';
    if (tier >= 2) {
      const ring = document.createElement('div');
      ring.style.cssText = 'position:absolute;left:' + cx + ';top:' + cy + ';width:70px;height:70px;border:4px solid ' + accent + ';border-radius:2px;box-shadow:0 0 12px ' + accent + ';animation:fx_ring .55s steps(6) .28s both;';
      lyr.appendChild(ring);
    }

    // fire pillar (tier3) — FX01 verbatim
    if (tier === 3) {
      const pillar = document.createElement('div');
      pillar.style.cssText = 'position:absolute;left:' + cx + ';bottom:10%;width:70px;height:320px;background:linear-gradient(rgba(255,220,120,.85),rgba(255,140,50,.5) 50%,transparent);transform-origin:bottom center;animation:fx_pillar .6s steps(7) .28s both;';
      lyr.appendChild(pillar);
    }

    // shake anchor — FX01 verbatim
    const shakeAnim = tier===3?'fx_shakeL .4s steps(3) .14s':tier===2?'fx_shakeM .35s steps(3) .14s':'fx_shakeS .3s steps(3) .14s';
    const shakeMs  = tier===3?450:tier===2?400:350;
    if (anchor) { anchor.style.animation = shakeAnim; setTimeout(() => { anchor.style.animation = ''; }, shakeMs); }

    // combo badge — FX01 verbatim
    if (combo > 0 && tier >= 2) {
      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;left:' + cx + ';top:' + cy + ';font-family:Galmuri11,sans-serif;font-size:' + (tier===3?52:40) + 'px;color:' + accent + ';text-shadow:0 0 10px rgba(255,170,60,.7),2px 2px 0 #000;animation:fx_badge .9s steps(8) .28s both;transform:translate(-50%,calc(-50% - 40px));';
      badge.textContent = '×' + combo + ' !';
      lyr.appendChild(badge);
    }

    setTimeout(() => lyr.remove(), 1200);
  }

  // ── FX02 강화실패 ─────────────────────────────────────────────────────────
  function fail() {
    const anchor = el('my-sword-art');
    const { x, y } = anchorCenter(anchor);
    const root = el('game-root');
    if (!root) return;

    const lyr = layer(22, root);

    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;inset:0;background:rgba(200,50,30,.45);animation:fx_redflash .5s steps(5) both;';
    lyr.appendChild(flash);

    for (let i = 0; i < 14; i++) {
      const ang = (Math.PI * 2 * i) / 14 + (Math.random() * 0.3);
      const d = 60 + Math.random() * 80;
      const shard = document.createElement('div');
      shard.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + (5+(i%4)) + 'px;height:' + (5+(i%3)) + 'px;background:' + (i%3===0?'#ff9a3c':'#8a8f9a') + ';--dx:' + (Math.cos(ang)*d) + 'px;--dy:' + (Math.sin(ang)*d) + 'px;--rot:' + (Math.random()*720-360) + 'deg;animation:fx_shatter ' + (0.6+Math.random()*0.3) + 's steps(8) both;';
      lyr.appendChild(shard);
    }

    const broken = document.createElement('div');
    broken.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-50%);font-family:Galmuri11,sans-serif;font-size:36px;color:#e8342a;text-shadow:3px 3px 0 #000,0 0 18px rgba(232,52,42,.6);letter-spacing:4px;animation:fx_brokenIn 1.4s steps(10) both;';
    broken.textContent = 'BROKEN';
    lyr.appendChild(broken);

    if (anchor) { anchor.style.animation = 'fx_shakeL .5s steps(7)'; setTimeout(() => { anchor.style.animation = ''; }, 550); }
    setTimeout(() => lyr.remove(), 1800);
  }

  // ── FX07 교전 — FX07 교전.dc.html arena 구조 그대로 ──────────────────────
  async function combat(serverHits, myInitDur, oppInitDur, damageTaken, finalMyHp, finalOppHp, updateHpCb, flashCb) {
    const engLyr = el('engage-layer');
    if (!engLyr) return;

    const N = (serverHits && serverHits.length > 0) ? serverHits.length : 8;
    const openCount = Math.min(3, N - 1);
    const montageCount = Math.max(0, N - openCount - 1);
    const montagePer = Math.max(120, Math.min(200, Math.round(3400 / Math.max(1, montageCount))));

    const schedule = (serverHits && serverHits.length > 0)
      ? serverHits.map((h, i) => {
          const phase = i < openCount ? 'open' : i === N-1 ? 'finish' : 'montage';
          const per = phase === 'open' ? 500 : phase === 'finish' ? 400 : montagePer;
          return { ...h, phase, isLast: i === N-1, per };
        })
      : (() => {
          const hits = [];
          for (let i = 0; i < N; i++) {
            const phase = i < openCount ? 'open' : i === N-1 ? 'finish' : 'montage';
            hits.push({ def: i%2===0?'me':'opp', phase, isLast: i===N-1, per: phase==='open'?500:phase==='finish'?400:montagePer, crit: false });
          }
          return hits;
        })();

    const lastHit = schedule[schedule.length - 1];
    const winner = lastHit ? (lastHit.def === 'me' ? 'opp' : 'me') : 'me';

    // ── Build FX07 arena inside engage-layer ──
    engLyr.innerHTML = '';

    // Dim (FX07 verbatim)
    const dim = document.createElement('div');
    dim.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,.55);animation:fx_engDim .3s steps(4) both;';
    engLyr.appendChild(dim);

    // Spark layer
    const sparkLyr = document.createElement('div');
    sparkLyr.style.cssText = 'position:absolute;inset:0;z-index:8;pointer-events:none;';
    engLyr.appendChild(sparkLyr);

    // Sword blade HTML (FX07 _sword blade verbatim)
    function buildBlade(side) {
      const flip = side === 'opp' ? 'scaleX(-1)' : 'none';
      return '<div style="display:flex;flex-direction:column;align-items:center;transform:' + flip + ';">' +
        '<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:14px solid #eef2f7;"></div>' +
        '<div style="width:12px;height:80px;background:linear-gradient(90deg,#9aa4b2,#eef2f7 45%,#cfd6e0 55%,#7e8794);box-shadow:inset 0 0 0 1px #000;"></div>' +
        '<div style="width:40px;height:8px;background:linear-gradient(#ffd86a,#c2902f);box-shadow:inset 0 0 0 1px #000;margin-top:-1px;"></div>' +
        '<div style="width:9px;height:22px;background:#6e4a2a;box-shadow:inset 0 0 0 1px #000;"></div>' +
        '<div style="width:15px;height:10px;background:#ffd86a;box-shadow:inset 0 0 0 1px #000;margin-top:-1px;"></div>' +
        '</div>';
    }

    // Combatant (FX07 combatant verbatim)
    function buildCombatant(side, initDur) {
      const name = side === 'me' ? (window.myDisplayName || '나') : (window.oppDisplayName || '상대');
      const col = side === 'me' ? '#f5a93a' : '#cfd2db';
      const danger = initDur <= 25;
      const barBg = danger ? 'linear-gradient(#e8554c,#b8302a)' : 'linear-gradient(#e2e8f0,#9aa3b3)';
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;width:170px;';
      div.innerHTML =
        '<span style="font-family:Galmuri11,sans-serif;font-size:12px;color:' + col + ';text-shadow:1px 1px 0 #000;">' + name + '</span>' +
        '<div id="cbsword-' + side + '" style="height:130px;display:flex;align-items:flex-start;justify-content:center;">' + buildBlade(side) + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:4px;width:150px;">' +
          '<div style="display:flex;justify-content:space-between;font-family:Galmuri7,monospace;font-size:9px;color:' + (danger?'#e8554c':'#aab2c0') + ';">' +
            '<span>DUR</span><span id="cbdur-txt-' + side + '">' + Math.round(initDur) + '%</span>' +
          '</div>' +
          '<div style="height:13px;background:#15171c;border:2px solid #000;position:relative;overflow:hidden;">' +
            '<div id="cbdur-bar-' + side + '" style="position:absolute;left:0;top:0;bottom:0;width:' + Math.round(initDur) + '%;background:' + barBg + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.4);transition:width .14s steps(4);"></div>' +
          '</div>' +
        '</div>';
      return div;
    }

    // Arena (FX07 arena verbatim)
    const arena = document.createElement('div');
    arena.style.cssText = 'position:absolute;left:0;right:0;top:24%;display:flex;align-items:flex-start;justify-content:center;gap:90px;z-index:5;';
    arena.appendChild(buildCombatant('me', myInitDur ?? 100));
    arena.appendChild(buildCombatant('opp', oppInitDur ?? 100));
    engLyr.appendChild(arena);

    // Center HUD (FX07 center verbatim)
    const center = document.createElement('div');
    center.style.cssText = 'position:absolute;left:50%;top:36%;transform:translateX(-50%);z-index:6;display:flex;flex-direction:column;align-items:center;gap:8px;';
    center.innerHTML =
      '<div id="cbphase-lbl" style="font-family:Galmuri7,monospace;font-size:10px;color:#ff8a3c;letter-spacing:2px;text-shadow:1px 1px 0 #000;"></div>' +
      '<div style="display:flex;align-items:baseline;gap:5px;">' +
        '<span style="font-family:Galmuri7,monospace;font-size:11px;color:#8a8a98;">HIT</span>' +
        '<span id="cbhit-num" style="font-family:Galmuri11,sans-serif;font-size:34px;color:#ffd76a;text-shadow:0 0 8px rgba(245,170,60,.5),2px 2px 0 #000;">0</span>' +
        '<span style="font-family:Galmuri7,monospace;font-size:11px;color:#5c5c6a;">/ ' + N + '</span>' +
      '</div>';
    engLyr.appendChild(center);

    // ── Hit schedule (FX07 replay logic verbatim) ──
    let meDur = myInitDur ?? 100;
    let oppDur = oppInitDur ?? 100;
    const timers = [];
    const phaseLabels = { open: '교전 개시', montage: '집중 타격', finish: '결정타' };

    let t = 500;
    schedule.forEach((hit, idx) => {
      if (hit.isLast) t += 600;
      timers.push(setTimeout(() => {
        // Jolt struck sword
        const swordEl = el('cbsword-' + hit.def);
        if (swordEl) {
          swordEl.style.animation = hit.def === 'me' ? 'fx_joltL .18s steps(3)' : 'fx_joltR .18s steps(3)';
          setTimeout(() => { if (swordEl) swordEl.style.animation = ''; }, 200);
        }

        // DUR update (FX07 verbatim)
        const lossPct = 100 / N;
        if (hit.def === 'me') meDur = hit.isLast && winner !== 'me' ? 0 : Math.max(0, meDur - (hit.dmg ?? lossPct));
        else                  oppDur = hit.isLast && winner !== 'opp' ? 0 : Math.max(0, oppDur - (hit.dmg ?? lossPct));
        if (hit.isLast) { if (winner === 'me') oppDur = 0; else meDur = 0; }

        const meDurR = Math.round(Math.max(0, meDur)), oppDurR = Math.round(Math.max(0, oppDur));
        const bMe = el('cbdur-bar-me'), bOpp = el('cbdur-bar-opp');
        const tMe = el('cbdur-txt-me'), tOpp = el('cbdur-txt-opp');
        if (bMe)  { bMe.style.width  = meDurR  + '%'; bMe.style.background  = meDurR  <= 25 ? 'linear-gradient(#e8554c,#b8302a)' : 'linear-gradient(#e2e8f0,#9aa3b3)'; }
        if (bOpp) { bOpp.style.width = oppDurR + '%'; bOpp.style.background = oppDurR <= 25 ? 'linear-gradient(#e8554c,#b8302a)' : 'linear-gradient(#e2e8f0,#9aa3b3)'; }
        if (tMe)  tMe.textContent  = meDurR  + '%';
        if (tOpp) tOpp.textContent = oppDurR + '%';

        const phaseLbl = el('cbphase-lbl');
        if (phaseLbl) phaseLbl.textContent = phaseLabels[hit.phase] || '';

        const hitNum = el('cbhit-num');
        if (hitNum) { hitNum.textContent = idx + 1; hitNum.style.animation = 'fx_hitPop .15s steps(2)'; setTimeout(() => { if (hitNum) hitNum.style.animation = ''; }, 200); }

        // Spark burst at struck side (FX07 sparkEl verbatim)
        const sideX = hit.def === 'me' ? '30%' : '70%';
        const count = hit.isLast ? 26 : (hit.crit ? 16 : 10);
        for (let j = 0; j < count; j++) {
          const ang = (Math.PI * 2 * j) / count;
          const d = (hit.isLast ? 90 : 50) + (j % 4) * 16;
          const sp = document.createElement('div');
          sp.style.cssText = 'position:absolute;left:' + sideX + ';top:44%;width:' + (3+(j%3)) + 'px;height:' + (3+(j%3)) + 'px;background:' + (hit.crit||hit.isLast?'#fff2c8':'#ffbe5c') + ';box-shadow:0 0 6px #ff7a2a;--dx:' + (Math.cos(ang)*d) + 'px;--dy:' + (Math.sin(ang)*d-10) + 'px;animation:fx_spark ' + (0.32+(j%3)*0.06) + 's steps(5) both;';
          sparkLyr.appendChild(sp);
          setTimeout(() => sp.remove(), 600);
        }

        // Clash
        const clash = document.createElement('div');
        clash.style.cssText = 'position:absolute;left:' + sideX + ';top:44%;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle,rgba(255,230,150,.9),transparent 65%);animation:fx_clash .3s steps(4) both;';
        sparkLyr.appendChild(clash);
        setTimeout(() => clash.remove(), 400);

        // Crit ring
        if (hit.crit) {
          const cr = document.createElement('div');
          cr.style.cssText = 'position:absolute;left:' + sideX + ';top:44%;width:50px;height:50px;border:3px solid #ffd24d;border-radius:2px;box-shadow:0 0 10px #ffd24d;animation:fx_clash .35s steps(5) both;';
          sparkLyr.appendChild(cr);
          setTimeout(() => cr.remove(), 500);
        }

        // Montage streak (FX07 verbatim)
        if (hit.phase !== 'open') {
          const streak = document.createElement('div');
          streak.style.cssText = 'position:absolute;left:' + (hit.def==='me'?'8%':'52%') + ';top:' + (30+(idx%5)*8) + '%;width:40%;height:3px;background:linear-gradient(90deg,transparent,#ffbe5c,transparent);transform-origin:' + (hit.def==='me'?'left':'right') + ';animation:fx_streak .22s steps(3) both;';
          sparkLyr.appendChild(streak);
          setTimeout(() => streak.remove(), 300);
        }

        // Finish flash
        if (hit.isLast) {
          const ff = document.createElement('div');
          ff.style.cssText = 'position:absolute;inset:0;background:radial-gradient(circle at ' + sideX + ' 44%,rgba(255,200,110,.85),transparent 55%);animation:fx_flash .5s steps(6) both;z-index:9;';
          sparkLyr.appendChild(ff);
          setTimeout(() => ff.remove(), 600);
        }
      }, t));
      t += hit.per;
    });

    await new Promise(res => setTimeout(res, t + 200));

    // Shatter loser sword (FX07 _sword broken verbatim)
    const loserSide = winner === 'me' ? 'opp' : 'me';
    const loserSwordEl = el('cbsword-' + loserSide);
    if (loserSwordEl) {
      let shards = '<div style="position:relative;width:60px;height:130px;">';
      for (let i = 0; i < 12; i++) {
        const dx = (Math.random()*2-1)*130;
        const dy = 90 + Math.random()*130;
        const rot = Math.random()*720-360;
        shards += '<div style="position:absolute;left:50%;top:' + (20+Math.random()*70) + 'px;width:' + (5+(i%4)) + 'px;height:' + (5+(i%3)) + 'px;background:' + (i%3===0?'#ff9a3c':'#8a8f9a') + ';--dx:' + dx + 'px;--dy:' + dy + 'px;--rot:' + rot + 'deg;animation:fx_shatter ' + (0.6+Math.random()*0.3) + 's steps(8) both;"></div>';
      }
      shards += '</div>';
      loserSwordEl.innerHTML = shards;
    }

    // Win glow
    const winSwordEl = el('cbsword-' + winner);
    if (winSwordEl) winSwordEl.style.animation = 'fx_winGlow 1.2s ease-in-out infinite';

    // Result banner (FX07 result verbatim)
    const resultEl = document.createElement('div');
    resultEl.style.cssText = 'position:absolute;left:50%;top:34%;z-index:9;font-family:Galmuri11,sans-serif;font-size:44px;color:' + (winner==='me'?'#ffd76a':'#cfd2db') + ';text-shadow:' + (winner==='me'?'0 0 16px rgba(245,170,60,.7),3px 3px 0 #000':'3px 3px 0 #000') + ';letter-spacing:3px;white-space:nowrap;animation:fx_resultIn .6s steps(7) both;transform:translate(-50%,-50%);';
    resultEl.textContent = winner === 'me' ? 'WIN!' : 'LOSE';
    engLyr.appendChild(resultEl);

    if (updateHpCb) updateHpCb(finalMyHp, finalOppHp);
    if (damageTaken > 0 && flashCb) flashCb('-' + Math.round(damageTaken) + ' HP');

    await new Promise(res => setTimeout(res, 1600));

    timers.forEach(clearTimeout);
    engLyr.innerHTML = '';
  }

  // ── FX03 코인 변화 ─────────────────────────────────────────────────────────
  function coinChange(dir, amount) {
    const coinEl = el('my-coins');
    if (!coinEl) return;
    if (dir === 'deny') {
      coinEl.style.animation = 'fx_denyShake .3s steps(4)';
      setTimeout(() => { coinEl.style.animation = ''; }, 350);
      return;
    }
    const root = el('game-root');
    if (!root) return;
    const r = coinEl.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const cx = r.left + r.width / 2 - rr.left;
    const cy = r.top - rr.top;
    const lbl = document.createElement('div');
    lbl.style.cssText = 'position:absolute;left:' + cx + 'px;top:' + cy + 'px;font-family:Galmuri11,sans-serif;font-size:16px;color:' + (dir==='plus'?'#7fe47c':'#e87a72') + ';text-shadow:1px 1px 0 #000;pointer-events:none;transform:translateX(-50%);animation:fx_floatUp .9s steps(7) both;z-index:30;';
    lbl.textContent = (dir === 'plus' ? '+' : '-') + Math.round(amount);
    root.appendChild(lbl);
    setTimeout(() => lbl.remove(), 950);
    coinEl.style.animation = 'fx_coinPop .3s steps(4)';
    setTimeout(() => { coinEl.style.animation = ''; }, 350);
  }

  // ── FX04 판매 ────────────────────────────────────────────────────────────
  function sell(gained) {
    const anchor = el('my-sword-art');
    const root = el('game-root');
    if (!root) return;
    const { x, y } = anchorCenter(anchor || root);
    const stamp = document.createElement('div');
    stamp.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-50%) scale(2.6) rotate(-12deg);font-family:Galmuri11,sans-serif;font-size:28px;color:#4a8fd0;text-shadow:3px 3px 0 #000;letter-spacing:2px;animation:fx_stamp 1.1s steps(9) both;z-index:25;pointer-events:none;';
    stamp.textContent = 'SOLD!';
    root.appendChild(stamp);
    setTimeout(() => stamp.remove(), 1200);
    if (gained > 0) coinChange('plus', gained);
  }

  // ── FX05 라운드 시작 ─────────────────────────────────────────────────────
  function roundStart(round) {
    const root = el('game-root');
    if (!root) return;
    const lyr = layer(25, root);
    mkDiv({ position: 'absolute', inset: '0', background: 'rgba(0,0,0,.55)', animation: 'fx_dim .8s steps(5) both' }, lyr);
    const label = document.createElement('div');
    label.style.cssText = 'position:absolute;left:50%;top:50%;font-family:Galmuri11,sans-serif;font-size:56px;color:#ffd76a;text-shadow:0 0 24px rgba(245,170,60,.6),3px 4px 0 #000;letter-spacing:4px;animation:fx_countIn .9s steps(8) both;transform:translate(-50%,-50%);';
    label.textContent = 'ROUND ' + round;
    lyr.appendChild(label);
    setTimeout(() => lyr.remove(), 1200);
  }

  // ── FX06 상점 오픈 — FX06 상점오픈.dc.html 원본 그대로 ───────────────────
  function shopOpen() {
    const root = el('game-root');
    if (!root) return;

    // z-index:999 overlay bridges game→shop screen transition
    const overlay = mkDiv({ position: 'absolute', inset: '0', zIndex: '999', overflow: 'hidden' }, root);

    // Battle strip (slides out) — FX06 battle verbatim
    const battle = document.createElement('div');
    battle.style.cssText = 'position:absolute;left:calc(50% - 230px);top:20%;z-index:5;width:460px;display:flex;align-items:center;justify-content:space-between;gap:14px;background:#23222b;border:2px solid #07070a;box-shadow:inset 0 0 0 2px #34333f,0 5px 0 rgba(0,0,0,.45);padding:14px 18px;animation:fx_slideOut .45s steps(5) .05s both;';
    battle.innerHTML = '<div style="width:40px;height:40px;background:#191820;border:2px solid #000;"></div><span style="font-family:Galmuri11,sans-serif;font-size:14px;color:#e6e1ea;">라운드 교전</span><div style="width:60px;height:12px;background:#1a1216;border:2px solid #000;"></div>';
    overlay.appendChild(battle);

    // Sign letters (fx_signLit) — FX06 sign verbatim
    const signChars = ['❖', ' ', '카드', ' ', '상점', ' ', '❖'];
    const flat = signChars.join('').split('');
    const signSpans = flat.map((ch, i) =>
      '<span style="color:' + (ch==='❖'?'#f5a93a':'#ffd76a') + ';white-space:pre;opacity:.12;animation:fx_signLit .18s steps(3) ' + (0.75+i*0.07).toFixed(2) + 's both' + (ch==='❖'?',fx_signTwinkle 1.4s ease-in-out '+(1.4+i*0.07).toFixed(2)+'s infinite':'') + ';">' + ch + '</span>'
    ).join('');

    // Card thumbnails (fx_dealIn) — FX06 cardColors verbatim
    const cc = [['#4fbf66','#8be89c'],['#a865e8','#caa0f4'],['#f6a92e','#ffc564'],['#3f8be0','#82b8f2']];
    const cardThumbs = cc.map((c, i) =>
      '<div style="width:76px;height:102px;background:' + c[0] + ';padding:3px;box-shadow:0 0 8px ' + c[0] + '88,2px 3px 0 rgba(0,0,0,.5);animation:fx_dealIn .4s steps(5) ' + (0.95+i*0.09).toFixed(2) + 's both;"><div style="width:100%;height:100%;background:#15151b;border:2px solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;"><div style="color:' + c[1] + ';font-family:Galmuri11,sans-serif;font-size:11px;">' + '★'.repeat(i+2>5?5:i+2) + '</div><div style="width:44px;height:34px;background:#1c1c24;background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.05) 0 4px,transparent 4px 9px);border:2px solid #000;"></div></div></div>'
    ).join('');

    // Shop panel (drops in) — FX06 shop verbatim
    const shop = document.createElement('div');
    shop.style.cssText = 'position:absolute;left:calc(50% - 240px);top:24%;z-index:6;width:480px;display:flex;flex-direction:column;align-items:center;gap:16px;background:#26242e;border:2px solid #07070a;box-shadow:inset 0 0 0 2px #3a3946,inset 4px 4px 0 rgba(255,255,255,.05),inset -4px -6px 0 rgba(0,0,0,.5),0 6px 0 rgba(0,0,0,.5);padding:20px 24px 24px;animation:fx_dropIn .6s steps(7) .35s both;';
    shop.innerHTML = '<div style="font-family:Galmuri11,sans-serif;font-size:24px;letter-spacing:3px;display:flex;">' + signSpans + '</div><div style="display:flex;gap:12px;">' + cardThumbs + '</div>';
    overlay.appendChild(shop);

    setTimeout(() => overlay.remove(), 1800);
  }

  // ── FX08 7성 카드 등장 ────────────────────────────────────────────────────
  function sevenStarReveal(cardEl) {
    if (!cardEl) return;
    cardEl.style.animation = 'ec_glow .4s steps(5)';
    setTimeout(() => { cardEl.style.animation = ''; }, 500);
    const root = el('game-root');
    if (!root) return;
    const r = cardEl.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const cx = r.left + r.width/2 - rr.left;
    const cy = r.top  + r.height/2 - rr.top;
    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;left:' + cx + 'px;top:' + cy + 'px;width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,rgba(255,216,77,.9),transparent 65%);animation:fx_clash .5s steps(6) both;z-index:25;pointer-events:none;';
    root.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
  }

  // ── FX09 카드 레벨업 ──────────────────────────────────────────────────────
  function cardLevelUp(anchorEl) {
    const root = el('game-root');
    if (!root || !anchorEl) return;
    const { x, y } = anchorCenter(anchorEl);
    const lyr = layer(25, root);
    const ring = document.createElement('div');
    ring.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:60px;height:60px;border:3px solid #ffd24d;border-radius:2px;animation:fx_ringPop .5s steps(6) both;';
    lyr.appendChild(ring);
    const lbl = document.createElement('div');
    lbl.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;font-family:Galmuri11,sans-serif;font-size:22px;color:#ffd76a;text-shadow:2px 2px 0 #000;animation:fx_lvBurst .7s steps(7) both;transform:translate(-50%,-50%);';
    lbl.textContent = 'LV UP!';
    lyr.appendChild(lbl);
    setTimeout(() => lyr.remove(), 900);
  }

  // ── FX11 HP 경고 ──────────────────────────────────────────────────────────
  let _hpWarnInterval = null;
  function hpWarning(active) {
    const myHpBar = el('my-hp-bar');
    if (active) {
      if (!_hpWarnInterval) {
        if (myHpBar) myHpBar.style.animation = 'fx_barPulse .6s steps(5) infinite';
        _hpWarnInterval = setInterval(() => {}, 9999);
      }
    } else {
      if (_hpWarnInterval) { clearInterval(_hpWarnInterval); _hpWarnInterval = null; }
      if (myHpBar) myHpBar.style.animation = '';
    }
  }

  // ── 드래그 카드 인터랙션 ──────────────────────────────────────────────────
  // getIsOver(e): (MouseEvent) => bool — 드롭 유효 여부
  // onDrop: () => void — 드롭 성공 시 호출
  // getHighlightEl: () => HTMLElement | null — hover 시 강조할 요소
  function dragCard(sourceEl, getIsOver, onDrop, getHighlightEl) {
    const root = el('game-root');
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const scale = rootRect.width / 1280;

    // 고스트 생성
    const ghost = document.createElement('div');
    ghost.style.cssText = 'position:absolute;z-index:9999;pointer-events:none;opacity:0.88;visibility:hidden;width:' + sourceEl.offsetWidth + 'px;height:' + sourceEl.offsetHeight + 'px;';
    ghost.innerHTML = sourceEl.innerHTML;
    root.appendChild(ghost);

    let wasOver = false;

    const move = (e) => {
      const cx = (e.clientX - rootRect.left) / scale;
      const cy = (e.clientY - rootRect.top) / scale;
      ghost.style.left = (cx - sourceEl.offsetWidth / 2) + 'px';
      ghost.style.top  = (cy - sourceEl.offsetHeight / 2) + 'px';
      ghost.style.visibility = 'visible';

      const over = getIsOver(e);
      const hlEl = getHighlightEl ? getHighlightEl() : null;
      if (hlEl && over !== wasOver) {
        hlEl.style.boxShadow = over ? 'inset 0 0 0 3px #5fd6c4, 0 0 16px rgba(95,214,196,.55)' : '';
        wasOver = over;
      }
    };

    const up = (e) => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      ghost.remove();
      const hlEl = getHighlightEl ? getHighlightEl() : null;
      if (hlEl) hlEl.style.boxShadow = '';
      if (getIsOver(e)) onDrop();
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  return { buildCardHTML, success, fail, coinChange, sell, roundStart, shopOpen, combat, sevenStarReveal, cardLevelUp, hpWarning, dragCard };
})();
