/* Shared by combat and the real-scene preview. No damage or board state is changed here. */
(function (root) {
  'use strict';
  const LIMIT = 96, live = new WeakMap();
  const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function own(s, object, depth, duration, tween) {
    let set = live.get(s);
    if (!set) {
      live.set(s, set = new Set());
      s.events.once('shutdown', () => { set.forEach(o => o.destroy()); set.clear(); });
    }
    if (set.size >= LIMIT) { object.destroy(); return; }
    set.add(object); object.setDepth(depth);
    object.once('destroy', () => set.delete(object));
    s.tweens.add(Object.assign({ targets: object, duration, alpha: 0, ease: 'Cubic.out', onComplete: () => object.destroy() }, tween));
    return object;
  }
  function gather(s, x, y, cells, color, step, depth) {
    const calm = reduced(), points = cells.slice(0, 9).map(rc => s.cellCenter(rc[0], rc[1]));
    // A complete palace receives a square seal; partial row/column segments retain individual tile cues.
    if (points.length === 9) {
      const size = step * 2.85;
      const seal = s.add.rectangle(x, y, size, size, color, 0.035).setStrokeStyle(2, color, 0.9);
      own(s, seal, depth - 1, calm ? 160 : 280, { scale: calm ? 1 : 0.78, angle: 0 });
      if (!calm) {
        const inner = s.add.rectangle(x, y, size * .78, size * .78, color, 0).setStrokeStyle(1, 0xffe6b3, .65);
        own(s, inner, depth, 190, { scale: .3, angle: 8 });
      }
    }
    points.forEach((p, i) => {
      const tile = s.add.rectangle(p.x, p.y, step * .74, step * .74, color, .22).setStrokeStyle(1, color, .8);
      own(s, tile, depth - 1, calm ? 130 : 180, { scale: calm ? 1 : .72, delay: calm ? 0 : i * 5 });
      if (calm) return;
      const shard = s.add.rectangle(p.x, p.y, 4, 9, color, .9).setAngle(35);
      own(s, shard, depth, 145, { x, y, scale: .2, angle: 105, delay: i * 4 });
    });
    if (!calm) {
      const slash = s.add.rectangle(x, y, step * 1.4, 2, 0xffe6b3, .85).setAngle(-32);
      own(s, slash, depth + 1, 170, { scaleX: 1.6, scaleY: .2 });
    }
  }
  function skill(s, el, x, y, color, depth, duration) {
    const calm = reduced();
    const seal = s.add.rectangle(x, y, 40, 40, color, .05).setStrokeStyle(2, color, .9).setAngle(calm ? 0 : 45);
    own(s, seal, depth, calm ? 180 : Math.min(420, duration || 300), { scale: calm ? 1 : 1.5, angle: calm ? 0 : 90 });
    if (calm) return;
    // Water opens upward like a restorative pulse; earth/wind frame the board action; attacks cut outward.
    const restorative = el === 'water', board = el === 'earth' || el === 'wind';
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2, r = board ? 34 : 24;
      const p = s.add.rectangle(x + Math.cos(a) * 12, y + Math.sin(a) * 12, board ? 9 : 3, board ? 3 : 10, color, .8).setAngle(i * 90);
      own(s, p, depth, 240, { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r - (restorative ? 20 : 0), scale: .4 });
    }
  }
  function heal(s, x, y, depth) {
    const calm = reduced();
    const line = s.add.rectangle(x, y, 240, 5, 0x9ddfb0, .7);
    own(s, line, depth, calm ? 160 : 380, { scaleX: calm ? 1 : 1.12 });
    if (calm) return;
    for (let i = 0; i < 5; i++) {
      const plus = s.add.text(x - 80 + i * 40, y - 2, '+', { fontSize: '20px', color: '#b4edc0' }).setOrigin(.5);
      own(s, plus, depth, 420, { y: y - 30, delay: i * 30 });
    }
  }
  function rebirth(s, slots, y, color, depth) {
    slots.slice(0, 3).forEach(x => {
      const seal = s.add.rectangle(x, y, 46, 40, color, .06).setStrokeStyle(2, color, .8);
      own(s, seal, depth, reduced() ? 170 : 480, { scale: reduced() ? 1 : .35, angle: reduced() ? 0 : 90 });
    });
  }
  function mountLab(s, constants) {
    if (s._battleVfxLab) return;
    s._battleVfxLab = true;
    let busyUntil = 0;
    const send = data => { if (root.parent !== root) root.parent.postMessage(Object.assign({ source: 'battle-vfx' }, data), root.location.origin); };
    const receive = event => {
      if (event.origin !== root.location.origin || event.source !== root.parent || !event.data || event.data.source !== 'battle-vfx-controls') return;
      const { el, mode } = event.data;
      if (!['fire','water','thunder','earth','wind'].includes(el) || !['block','palace','large','skill'].includes(mode)) return;
      if (s.time.now < busyUntil) return;
      busyUntil = s.time.now + 2100;
      const victims = (s.enemies || []).filter(e => !e.dead && e.sprite);
      if (!victims.length) { send({ state: '等待敵人登場' }); return; }
      const col = constants.EL[el].color;
      if (mode === 'skill') {
        const card = s.teamCards.find(c => c.el === el);
        if (card) {
          s.chargeEl(el, card.rect.x, card.rect.y, 400);
          s.time.delayedCall(s.chargeClimaxMs(el), () => {
            const v = victims[0]; if (!v.sprite || !v.sprite.active) return;
            if (el === 'water') {
              heal(s, constants.CX, constants.PHP_Y, constants.DEPTH.fx);
              s.floatText(constants.CX, constants.PHP_Y - 24, '回復演出', '#b4edc0');
              s.labSnd('s_heal', .6);
            } else if (el === 'earth') {
              rebirth(s, s.traySlots, constants.TRAY_Y, col, constants.DEPTH.tray + 1);
              s.tonFloat('托盤重生 · 演出預覽', '#e7c58e');
            } else if (el === 'thunder') {
              victims.forEach(victim => s.lightningStrike(victim, true));
            } else if (el === 'wind') {
              const cells = Array.from({length: 9}, (_, i) => [Math.floor(i / 3), i % 3]);
              const center = s.cellCenter(1, 1);
              gather(s, center.x, center.y, cells, col, constants.CS, constants.DEPTH.proj);
              s.time.delayedCall(150, () => s.chakraBolt(center.x, center.y, v.sprite.x, v.sprite.y, col, v, 0, 1, col));
            } else {
              s.boltLaunchFx(el, card.rect.x, card.rect.y, v.sprite.x, v.sprite.y);
              s.chakraBolt(card.rect.x, card.rect.y, v.sprite.x, v.sprite.y, col, v, 0, 2, col);
            }
          });
        }
      } else {
        let cells;
        if (mode === 'block') cells = Array.from({length: 9}, (_, c) => [1,c]);
        else cells = Array.from({length: mode === 'large' ? 27 : 9}, (_, i) => [Math.floor(i / 9) + (mode === 'palace' ? Math.floor(i / 3) : 0), mode === 'palace' ? i % 3 : i % 9]);
        s.labAttackFX([{ cells, el, dmg: 0 }], mode === 'large' ? victims : [victims[0]]);
      }
      send({ state: '播放中', el, mode });
      s.time.delayedCall(2200, () => send({ state: '可以重播', live: (live.get(s) || new Set()).size }));
    };
    root.addEventListener('message', receive);
    s.events.once('shutdown', () => root.removeEventListener('message', receive));
    send({ state: '準備完成' });
  }
  root.BattleVFX = { gather, skill, heal, rebirth, reduced, mountLab, LIMIT };
})(window);
