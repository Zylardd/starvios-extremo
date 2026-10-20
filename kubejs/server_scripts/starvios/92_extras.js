// priority: 55
// ============================================================
//  STARVIOS - EXTRAS
//  1) Corazones visibles: debajo del nombre de cada jugador ("7 ❤")
//  2) Los monstruos no se hacen daño entre ellos
//  3) Misión diaria: lleva el objeto del día al ATRIL del spawn -> recompensa   (/mision)
//  4) Esbirros: mientras vive un jefe semanal, aparecen monstruos a su alrededor
//  5) /starvios reset total confirmar -> borra todo lo de las pruebas (jugadores, equipos, dinero...)
// ============================================================

// ---------- 1) Corazones debajo del nombre ----------
global.stCorTick = 0;
ServerEvents.tick(event => { global.stSeguro('92_extras (corazones)', () => {
  global.stCorTick = (global.stCorTick || 0) + 1;
  if (global.stCorTick % 20 !== 0) return;
  let server = event.server;
  if (!global.stCorListo) {
    global.stCorListo = true;
    server.runCommandSilent('scoreboard objectives add st_corazones dummy {"text":"❤","color":"red"}');
    server.runCommandSilent('scoreboard objectives setdisplay below_name st_corazones');
  }
  server.players.forEach(p => {
    let h = 0;
    try { h = Math.ceil(Number(p.getHealth()) / 2); } catch (e) { return; }
    server.runCommandSilent(`scoreboard players set ${p.getName().getString()} st_corazones ${h}`);
  });
}); });

// ---------- 2) Sin daño entre monstruos (vanilla, de mods, élites, jefes y esbirros) ----------
// Los gólems, lobos y demás aliados SÍ pueden seguir atacando a los monstruos.
let exHostil = (e) => {
  try {
    let tg = String(e.getTags());
    if (tg.indexOf('starvios_') !== -1 || tg.indexOf('st_esbirro') !== -1) return true;
  } catch (x) {}
  try { if (e.isMonster()) return true; } catch (x) {}
  try { return String(e.getType().getCategory()) === 'MONSTER'; } catch (x) {}
  return false;
};
EntityEvents.hurt(event => {
  let v = event.entity;
  if (!v || v.isPlayer()) return;
  let a = null;
  try { a = event.source.getEntity(); } catch (e) { try { a = event.source.actual; } catch (e2) {} }
  if (!a || a.isPlayer() || a === v) return;
  if (exHostil(v) && exHostil(a)) event.cancel();
});

// ---------- 3) Misión diaria en el atril del spawn ----------
// Cada misión pide varios objetos (se sacan del inventario) y da un premio.
// Si todos los vivos de un equipo la completan el mismo día, cada uno recibe un premio extra.
let msNombre = (id) => String(id).replace(/\{.*$/, '').replace(/^#/, '').replace(/^[a-z0-9_]+:/, '').replace(/_/g, ' ');
let msHoy = (server) => {
  let dia = global.stDia(server);
  let l = global.STARVIOS.misiones || {};
  return dia > 0 && l[dia] ? { dia: dia, m: l[dia] } : null;
};
let msHechas = (server) => {
  try { return JSON.parse(server.persistentData.getString('starvios_misiones') || '{}'); } catch (e) { return {}; }
};
// Lista [[id, cantidad, nombre], ...] (también acepta el formato antiguo item/cantidad)
let msPide = (m) => m.pide ? m.pide : [[m.item, m.cantidad, msNombre(m.item)]];
let msTextoPide = (m) => msPide(m).map(x => `${x[1]} ${x[2] || msNombre(x[0])}`).join(', ');
let msTextoPremio = (pr) => {
  let t = [];
  if (pr.monedas) t.push(`${pr.monedas} ${global.STARVIOS.economia.simbolo}`);
  if (pr.vitales) t.push(`${pr.vitales} Corazón Vital`);
  if (pr.fragmentos) t.push(`${pr.fragmentos} Fragmento(s) de Corazón`);
  if (pr.fragiles) t.push(`${pr.fragiles} Corazón(es) Frágil(es)`);
  (pr.items || []).forEach(x => t.push(`${x[1]} ${msNombre(x[0])}`));
  return t.join(' + ');
};
let msPremioDe = (m) => m.premio || { monedas: m.monedas, fragmentos: m.fragmentos };

global.stAnunciarMision = (server, quien) => {
  let h = msHoy(server);
  if (!h) return;
  let a = quien || '@a';
  let titulo = h.m.texto ? `${h.m.texto}: ` : '';
  server.runCommandSilent(`tellraw ${a} ["",{"text":"📜 Misión del día ${h.dia}: ","color":"aqua","bold":true},{"text":"${global.stEsc(titulo)}","color":"yellow"},{"text":"trae ${global.stEsc(msTextoPide(h.m))}","color":"white"}]`);
  server.runCommandSilent(`tellraw ${a} ["",{"text":"   Entrégalo en el atril del spawn (clic derecho). Premio: ","color":"gray"},{"text":"${global.stEsc(msTextoPremio(msPremioDe(h.m)))}","color":"gold"}]`);
  let eq = global.STARVIOS.misionEquipo;
  if (eq && eq.fragiles) server.runCommandSilent(`tellraw ${a} {"text":"   👥 Si todo tu equipo la completa hoy: +${eq.fragiles} Corazón Frágil para cada uno.","color":"dark_aqua"}`);
};

let msDar = (server, n, pr, motivo) => {
  if (pr.monedas && global.stDarDinero) global.stDarDinero(server, n, pr.monedas, motivo);
  let esp = global.stItemsEspeciales;
  if (pr.fragmentos) server.runCommandSilent(`give ${n} ${esp.fragmento[0]}${esp.fragmento[1]} ${pr.fragmentos}`);
  if (pr.fragiles) server.runCommandSilent(`give ${n} ${esp.fragil[0]}${esp.fragil[1]} ${pr.fragiles}`);
  if (pr.vitales) server.runCommandSilent(`give ${n} ${esp.corazon[0]}${esp.corazon[1]} ${pr.vitales}`);
  (pr.items || []).forEach(x => server.runCommandSilent(`give ${n} ${x[0]} ${x[1]}`));
  if (pr.premio) server.runCommandSilent(`give ${n} ${pr.premio.id}${pr.premio.nbt || ''} ${pr.premio.cantidad || 1}`);
};

// Premio de equipo: cuando todos los miembros vivos ya la completaron
let msEquipo = (server, n, dia, lista) => {
  let cfg = global.STARVIOS.misionEquipo;
  if (!cfg || !global.stEquipoDe) return;
  let eq = global.stEquipoDe(server, n);
  if (!eq || !eq.miembros || eq.miembros.length < 2) return;
  let muertos = global.stEliminados(server);
  let vivos = eq.miembros.filter(x => muertos.indexOf(x) === -1);
  if (vivos.length < 2 || vivos.some(x => lista.indexOf(x) === -1)) return;
  let hechos = msHechas(server);
  let clave = 'eq_' + dia;
  let eqs = hechos[clave] || [];
  if (eqs.indexOf(eq.nombre) !== -1) return;
  eqs.push(eq.nombre); hechos[clave] = eqs;
  server.persistentData.putString('starvios_misiones', JSON.stringify(hechos));
  vivos.forEach(x => {
    if (server.getPlayer(x)) msDar(server, x, cfg, 'Misión en equipo');
    else {
      // Se le guarda para cuando entre
      let p = msHechas(server); let pend = p.pendiente_eq || {};
      pend[x] = (pend[x] || 0) + 1; p.pendiente_eq = pend;
      server.persistentData.putString('starvios_misiones', JSON.stringify(p));
    }
  });
  server.runCommandSilent(`tellraw @a ["",{"text":"👥 ¡El equipo ","color":"dark_aqua"},{"text":"${global.stEsc(eq.nombre)}","color":"${eq.color || 'yellow'}","bold":true},{"text":" completó entero la misión del día! (+${global.stEsc(msTextoPremio(cfg))} para cada uno)","color":"dark_aqua"}]`);
};

BlockEvents.rightClicked(event => {
  let p = event.player;
  if (!p || String(event.block.id) !== 'minecraft:lectern') return;
  if (global.stObjEnSpawn && !global.stObjEnSpawn(event.block)) return;
  if (String(event.hand) !== 'MAIN_HAND') { event.cancel(); return; }
  let server = p.server, n = p.getName().getString();
  let h = msHoy(server);
  let aviso = (t, c) => server.runCommandSilent(`title ${n} actionbar {"text":"${global.stEsc(t)}","color":"${c || 'aqua'}"}`);
  if (!h) { aviso('Hoy no hay misión'); event.cancel(); return; }
  let hechas = msHechas(server);
  let lista = hechas[h.dia] || [];
  if (lista.indexOf(n) !== -1) { aviso('Ya completaste la misión de hoy ✔', 'green'); event.cancel(); return; }
  // 1) ¿Tiene todo? (clear ... 0 solo cuenta, no quita nada)
  let pide = msPide(h.m), falta = [];
  pide.forEach(x => {
    let tiene = Number(server.runCommandSilent(`clear ${n} ${x[0]} 0`)) || 0;
    if (tiene < x[1]) falta.push(`${x[2] || msNombre(x[0])} (${tiene}/${x[1]})`);
  });
  if (falta.length) {
    global.stAnunciarMision(server, n);
    server.runCommandSilent(`tellraw ${n} ["",{"text":"   Te falta: ","color":"red"},{"text":"${global.stEsc(falta.join(', '))}","color":"yellow"}]`);
    aviso('Te faltan cosas para la misión', 'yellow');
    event.cancel(); return;
  }
  // 2) Se lo quita y le da el premio
  pide.forEach(x => server.runCommandSilent(`clear ${n} ${x[0]} ${x[1]}`));
  lista.push(n); hechas[h.dia] = lista;
  server.persistentData.putString('starvios_misiones', JSON.stringify(hechas));
  msDar(server, n, msPremioDe(h.m), 'Misión del día');
  server.runCommandSilent(`execute at ${n} run particle minecraft:happy_villager ~ ~1 ~ 0.5 0.6 0.5 0 20`);
  server.runCommandSilent(`execute at ${n} run playsound minecraft:entity.villager.celebrate master ${n} ~ ~ ~ 1 1`);
  aviso('✔ ¡Misión del día completada!', 'green');
  server.runCommandSilent(`tellraw @a ["",{"text":"📜 ","color":"aqua"},{"text":"${n}","color":"yellow"},{"text":" completó la misión del día (${lista.length}).","color":"gray"}]`);
  msEquipo(server, n, h.dia, lista);
  msBuff(server, n, h.dia, true);
  event.cancel();
});

PlayerEvents.loggedIn(event => {
  let server = event.server, n = event.player.getName().getString();
  server.scheduleInTicks(100, () => {
    let hechas = msHechas(server);
    let pend = hechas.pendiente_eq || {};
    if (pend[n]) {
      for (let i = 0; i < pend[n]; i++) msDar(server, n, global.STARVIOS.misionEquipo, 'Misión en equipo');
      delete pend[n]; hechas.pendiente_eq = pend;
      server.persistentData.putString('starvios_misiones', JSON.stringify(hechas));
    }
    let h = msHoy(server);
    if (h && (hechas[h.dia] || []).indexOf(n) === -1) global.stAnunciarMision(server, n);
  });
});

// ---------- 3b) 2º buff para quien completa la misión del día (dura hasta que cambia el día) ----------
let msBuffDe = (dia) => {
  let l = global.STARVIOS.buffMision || [];
  return l.length ? l[(dia - 1) % l.length] : null;
};
let msBuff = (server, n, dia, avisar) => {
  let b = msBuffDe(dia);
  if (!b) return;
  server.runCommandSilent(`effect give ${n} ${b[0]} 45 ${b[1]} true`);
  if (avisar) server.runCommandSilent(`tellraw ${n} ["",{"text":"✦ 2º buff por completar la misión: ","color":"aqua","bold":true},{"text":"${b[2]}","color":"yellow"},{"text":" hasta que termine el día.","color":"gray"}]`);
};
global.stMsBuffTick = 0;
ServerEvents.tick(event => { global.stSeguro('92_extras (buff de misión)', () => {
  global.stMsBuffTick = (global.stMsBuffTick || 0) + 1;
  if (global.stMsBuffTick % 600 !== 0) return;
  let server = event.server, h = msHoy(server);
  if (!h) return;
  let lista = msHechas(server)[h.dia] || [];
  lista.forEach(n => { if (server.getPlayer(n)) msBuff(server, n, h.dia, false); });
}); });

// ---------- 4) Esbirros de los jefes semanales ----------
global.stEsbTick = 0;
ServerEvents.tick(event => { global.stSeguro('92_extras (esbirros)', () => {
  global.stEsbTick = (global.stEsbTick || 0) + 1;
  let cfg = global.STARVIOS.esbirros || { cada: 20, cantidad: 3, maximo: 10 };
  if (global.stEsbTick % (cfg.cada * 20) !== 0 || global.stCine) return;
  let server = event.server;
  let level = server.getLevel('minecraft:overworld');
  if (!level) return;
  let jefes = [], esb = [];
  level.getEntities().forEach(e => {
    let tg = String(e.getTags());
    if (tg.indexOf('starvios_jefe') !== -1 && tg.indexOf('starvios_jefe_cayendo') === -1) jefes.push(e);
    else if (tg.indexOf('st_esbirro') !== -1) esb.push(e);
  });
  for (let i = 0; i < jefes.length; i++) {
    let j = jefes[i], tipo = String(j.type);
    let conf = null;
    for (let k = 0; k < global.STARVIOS.jefes.length; k++) if (global.STARVIOS.jefes[k].id === tipo) conf = global.STARVIOS.jefes[k];
    if (!conf || !conf.esbirros || !conf.esbirros.length) continue;
    let pj = global.stXYZ(j);
    if (!pj) continue;
    let cerca = 0;
    for (let k = 0; k < esb.length; k++) {
      let q = global.stXYZ(esb[k]);
      if (q && Math.abs(q.x - pj.x) < 40 && Math.abs(q.z - pj.z) < 40) cerca++;
    }
    let poner = Math.min(cfg.cantidad, cfg.maximo - cerca);
    let en = global.stComoEntidad(j);
    for (let k = 0; k < poner; k++) {
      let id = conf.esbirros[Math.floor(Math.random() * conf.esbirros.length)];
      let sx = Math.random() < 0.5 ? -1 : 1, sz = Math.random() < 0.5 ? -1 : 1;
      let dx = (sx * (4 + Math.random() * 8)).toFixed(1), dz = (sz * (4 + Math.random() * 8)).toFixed(1);
      let ok = en(`summon ${id} ~${dx} ~1 ~${dz} {Tags:["st_esbirro"],PersistenceRequired:1b}`);
      if (!ok) en(`summon minecraft:zombie ~${dx} ~1 ~${dz} {Tags:["st_esbirro"],PersistenceRequired:1b}`);
      en(`particle minecraft:large_smoke ~${dx} ~1 ~${dz} 0.3 0.6 0.3 0.02 15`);
    }
    if (poner > 0) en(`playsound minecraft:entity.evoker.prepare_summon hostile @a[distance=..48] ~ ~ ~ 2 0.7`);
  }
}); });

// Los esbirros desaparecen cuando muere su jefe (sin botín)
EntityEvents.death(event => {
  let e = event.entity;
  if (!e || e.isPlayer()) return;
  if (String(e.getTags()).indexOf('starvios_jefe') === -1) return;
  e.server.scheduleInTicks(40, () => {
    e.server.runCommandSilent(`execute as @e[tag=st_esbirro] at @s run particle minecraft:poof ~ ~1 ~ 0.3 0.5 0.3 0.02 10`);
    e.server.runCommandSilent(`tp @e[tag=st_esbirro] ~ -500 ~`);
  });
});

// ---------- 5) Reset total (borrar las pruebas) ----------
let rsAplicar = (server, n) => {
  let r = (c) => server.runCommandSilent(c);
  let s = global.STARVIOS.spawn;
  r(`clear ${n}`);
  for (let i = 0; i < 27; i++) r(`item replace entity ${n} enderchest.${i} with minecraft:air`);
  r(`xp set ${n} 0 levels`); r(`xp set ${n} 0 points`);
  r(`effect clear ${n}`);
  r(`advancement revoke ${n} everything`);
  r(`recipe take ${n} *`);
  r(`gamemode survival ${n}`);
  r(`execute in minecraft:overworld run spawnpoint ${n} ${s.x} ${s.y} ${s.z}`);
  r(`execute in minecraft:overworld run tp ${n} ${s.x + 0.5} ${s.y} ${s.z + 0.5}`);
  r(`attribute ${n} minecraft:generic.max_health base set 20`);
  r(`effect give ${n} minecraft:instant_health 1 10 true`);
  r(`effect give ${n} minecraft:saturation 1 20 true`);
  r(`scoreboard players reset ${n}`);
  if (global.stMonedaMod && global.stMonedaMod()) r(`lcbank delete player online ${n}`);   // banco de Lightman's Currency
};
let rsTotal = (server) => {
  let d = server.persistentData;
  let r = (c) => server.runCommandSilent(c);
  // Equipos vanilla
  try { Object.keys(JSON.parse(d.getString('starvios_equipos') || '{}')).forEach(k => r(`team remove ${k}`)); } catch (e) {}
  ['starvios_equipos', 'starvios_dinero', 'starvios_corazones', 'starvios_revividas', 'starvios_pendientes', 'starvios_eliminados',
   'starvios_devoluciones', 'starvios_misiones', 'starvios_cine_antes', 'starvios_mazmorras'].forEach(k => d.putString(k, k === 'starvios_eliminados' ? '' : '{}'));
  d.putString('starvios_mazmorras', '[]');
  d.putString('starvios_lc_ini', '{}'); d.putString('starvios_lc_pend', '{}');   // saldo inicial otra vez
  d.putString('starvios_efectos', '{}'); d.putString('starvios_segunda', '[]'); d.putString('starvios_loteria', '{}'); d.putString('starvios_kit1', '[]');   // anomalías
  global.stEfListo = false;
  d.putInt('starvios_dia', 0); d.putInt('starvios_ultimo_dia', 0);
  d.putBoolean('starvios_activo', false); d.putBoolean('starvios_intro_vista', false); d.putBoolean('starvios_resurreccion_revelada', false);
  r('scoreboard players reset * st_dinero');
  r('scoreboard players reset * st_corazones');
  r('kill @e[type=minecraft:item]');
  r('kill @e[tag=st_esbirro]');
  // Los jugadores conectados se limpian ya; los demás, al volver a entrar
  let token = String(Date.now());
  d.putString('starvios_reset_token', token);
  let ini = {};
  server.players.forEach(p => { rsAplicar(server, p.getName().getString()); p.persistentData.putString('starvios_reset', token); });
  if (global.stMonedaMod && global.stMonedaMod()) {
    server.players.forEach(p => { ini[p.getName().getString()] = true; });
    d.putString('starvios_lc_ini', JSON.stringify(ini));
    server.scheduleInTicks(20, () => server.players.forEach(p => global.stDarDinero(server, p.getName().getString(), global.STARVIOS.economia.saldoInicial, 'saldo inicial')));
  }
};
PlayerEvents.loggedIn(event => {
  let p = event.player, server = event.server;
  let token = server.persistentData.getString('starvios_reset_token');
  if (!token || p.persistentData.getString('starvios_reset') === token) return;
  p.persistentData.putString('starvios_reset', token);
  server.scheduleInTicks(20, () => rsAplicar(server, p.getName().getString()));
});

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  event.register(Commands.literal('mision').executes(ctx => {
    let server = ctx.source.server, p = ctx.source.player;
    let h = msHoy(server);
    if (!h) { decir(ctx)('§7Hoy no hay misión.'); return 1; }
    if (p && (msHechas(server)[h.dia] || []).indexOf(p.getName().getString()) !== -1) { decir(ctx)('§a✔ Ya completaste la misión de hoy.'); return 1; }
    global.stAnunciarMision(server, p ? p.getName().getString() : '@a');
    return 1;
  }));
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('reset').then(Commands.literal('total')
      .executes(ctx => {
        decir(ctx)('§c⚠ Esto borra inventarios, cofre de ender, XP, logros, equipos, dinero, corazones, eliminados, misiones y la lista de mazmorras/criptas,');
        decir(ctx)('§cy deja el evento en el día 0. Los que no estén conectados se limpian al entrar. Las arenas se conservan.');
        decir(ctx)('§6Para hacerlo: §e/starvios reset total confirmar');
        return 1;
      })
      .then(Commands.literal('confirmar').executes(ctx => {
        rsTotal(ctx.source.server);
        decir(ctx)('§a[Starvios] Todo reiniciado. Listo para empezar de 0.');
        return 1;
      })))));
});
