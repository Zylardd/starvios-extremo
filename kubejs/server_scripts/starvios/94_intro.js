// priority: 47
// ============================================================
//  STARVIOS - PRÓLOGO (solo audio) + CINEMÁTICA DE LOS JEFES
//
//  Al empezar la serie (día 1) suena el prólogo narrado para todos, una única vez.
//  Necesita el audio "starvios:prologo.completo" (lo crea generar_prologo.bat).
//  /starvios intro          -> reproduce el prólogo ahora (para probar)
//  /starvios intro parar    -> lo corta
//  /starvios intro reset    -> para que vuelva a sonar solo al reiniciar la serie
//  En 00_config.js: prologoSegundos (lo que dura el audio; el anuncio del día 1 espera a que acabe)
// ============================================================

global.stCine = global.stCine || false;

let cnLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// Las cámaras son DATOS (no funciones): el JavaScript de KubeJS pierde los números
// guardados dentro de funciones anidadas, y por eso las órbitas no se movían.
let cnOrbita = (r, h, a0, a1) => ({ o: [r, h, a0, a1] });
let cnRecta = (a, b) => ({ l: [a, b] });
// Seno y coseno propios (serie de Taylor): no dependen de Math.sin/Math.cos
let cnSin = (x) => {
  let P = 3.141592653589793;
  x = x % (2 * P); if (x > P) x -= 2 * P; if (x < -P) x += 2 * P;
  let x2 = x * x;
  return x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42 * (1 - x2 / 72 * (1 - x2 / 110 * (1 - x2 / 156))))));
};
let cnCos = (x) => cnSin(x + 1.5707963267948966);
let cnPos = (cam, t) => {
  if (cam.o) {
    let ang = (Number(cam.o[2]) + (Number(cam.o[3]) - Number(cam.o[2])) * t) * 0.017453292519943295;
    let r = Number(cam.o[0]);
    return [cnCos(ang) * r, Number(cam.o[1]), cnSin(ang) * r];
  }
  return cnLerp(cam.l[0], cam.l[1], t);
};
let cnSuave = (t) => t * t * (3 - 2 * t);     // empieza y acaba despacio
let CN_ESPERA = 40;   // ticks a oscuras al empezar cada escena para que carguen los chunks

let CN_TAG = 'st_cine';
let cnSel = `@a[tag=${CN_TAG}]`;

let cnTerminar = (server) => {
  let c = global.stCine;
  global.stCine = false;
  if (!c) return;
  let run = (x) => server.runCommandSilent(x);
  run('gamerule sendCommandFeedback false');
  Object.keys(c.antes).forEach(n => {
    let a = c.antes[n];
    if (!server.getPlayer(n)) return;
    if (a.pos) run(`execute in ${a.dim} run tp ${n} ${a.pos.x.toFixed(2)} ${a.pos.y.toFixed(2)} ${a.pos.z.toFixed(2)}`);
    run(`gamemode ${a.modo} ${n}`);
  });
  run('gamerule sendCommandFeedback true');
  run(`tag @a remove ${CN_TAG}`);
  run(`effect clear @a minecraft:night_vision`);
  // Los que no estaban conectados al terminar se restauran al volver a entrar
  let pend = {};
  Object.keys(c.antes).forEach(n => { if (!server.getPlayer(n)) pend[n] = c.antes[n]; });
  server.persistentData.putString('starvios_cine_antes', JSON.stringify(pend));
  (c.forzados || []).forEach(f => run(`execute in minecraft:overworld run forceload remove ${f}`));
  if (c.fin) { c.fin(server); return; }
  run(`effect give @a minecraft:blindness 2 0 true`);
  run(`title @a times 10 60 20`);
  run(`title @a title {"text":"STARVIOS EXTREMO","color":"gold","bold":true}`);
  run(`title @a subtitle {"text":"28 días. Cuatro Tiranos. Una sola vida.","color":"gray"}`);
  run(`execute as @a at @s run playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 1 0.6`);
};

let cnEmpezar = (server, avisar, escenasDadas, fin) => {
  if (global.stCine) { avisar('§cLa cinemática ya está en marcha.'); return false; }
  let escenas = (escenasDadas || []).filter(e => {
    e.prefijo = e.prefijo || (e.donde ? e.donde(server) : null);
    return !!e.prefijo;
  });
  if (!escenas.length || !server.players.length) return false;
  let antes = {};
  server.runCommandSilent('gamerule sendCommandFeedback false');   // sin "Modo de juego cambiado" en el chat
  server.players.forEach(p => {
    let n = p.getName().getString();
    let modo = 'survival';
    try { if (p.isSpectator()) modo = 'spectator'; else if (p.isCreative()) modo = 'creative'; } catch (e) {}
    antes[n] = { modo: modo, pos: global.stXYZ(p), dim: global.stDimDe(p) };
    server.runCommandSilent(`tag ${n} add ${CN_TAG}`);
    server.runCommandSilent(`gamemode spectator ${n}`);
  });
  server.runCommandSilent('gamerule sendCommandFeedback true');
  // Cargar de antemano los chunks de la cripta y la mazmorra
  let forzados = [];
  if (!escenasDadas) (global.mzLista ? global.mzLista(server) : []).slice().reverse().forEach(m => {
    if (forzados.length >= 2) return;
    let k = `${m.x} ${m.z}`;
    if (forzados.indexOf(k) === -1) { forzados.push(k); server.runCommandSilent(`execute in minecraft:overworld run forceload add ${k}`); }
  });
  global.stCine = { escenas: escenas, i: 0, t: 0, antes: antes, forzados: forzados, fin: fin || null };
  server.persistentData.putString('starvios_cine_antes', JSON.stringify(antes));
  avisar(`§6[Starvios] Cinemática iniciada: ${escenas.length} escenas.`);
  return true;
};
global.stCinematica = cnEmpezar;

ServerEvents.tick(event => { global.stSeguro('94_intro', () => {
  let c = global.stCine;
  if (!c) return;
  let server = event.server;
  let e = c.escenas[c.i];
  if (!e) { cnTerminar(server); return; }
  let espera = (e.fundido === false) ? 0 : CN_ESPERA;
  let dur = e.seg * 20;
  let total = espera + dur;
  let tt = Math.max(0, c.t - espera);        // tiempo dentro de la escena (tras la espera)
  let run = (x) => server.runCommandSilent(x);

  if (c.t === 0) {
    if (c.i === 0) {
      let seg = c.escenas.reduce((s2, x) => s2 + x.seg + 2, 0) + 5;
      run(`effect give ${cnSel} minecraft:night_vision ${seg} 0 true`);   // que se vea aunque sea de noche
    }
    if (espera > 0) run(`effect give ${cnSel} minecraft:blindness 3 0 true`);   // fundido a negro mientras carga
  }
  if (c.t >= espera && e.eventos && e.eventos[tt]) { try { e.eventos[tt](server); } catch (err) {} }
  // Cámara (durante la espera se queda quieta en el punto de inicio)
  let p = cnPos(e.cam, cnSuave(tt / dur)), m = e.mira;
  let mirar = (typeof m === 'string') ? `facing entity ${m} eyes` : `facing ~${m[0]} ~${m[1]} ~${m[2]}`;
  let x = Number(p[0]), y = Number(p[1]), z = Number(p[2]);
  if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
    if (c.t === 0) console.warn(`[Starvios] Cinemática: posición inválida en la escena ${e.id}: ${p}`);
  } else {
    let cmdTp = `execute ${e.prefijo} run tp ${cnSel} ~${x.toFixed(2)} ~${y.toFixed(2)} ~${z.toFixed(2)} ${mirar}`;
    let res = run(cmdTp);
    if (c.t === 0) console.info(`[Starvios] Cinemática escena ${e.id} (resultado ${res}): ${cmdTp}`);
    if (c.t === 0 && !res) console.warn(`[Starvios] Cinemática: la cámara no se movió en la escena ${e.id}: ${cmdTp}`);
  }
  // La voz empieza cuando arranca el movimiento (después de la espera)
  if (c.t === espera + 1 && e.voz !== false) run(`execute as ${cnSel} at @s run playsound ${e.voz || 'starvios:prologo.' + e.id} master @s ~ ~ ~ 10 1`);
  // Subtítulo abajo (cada línea ocupa su parte del tiempo de la escena)
  if (c.t >= espera && tt % 20 === 0 && e.lineas && e.lineas.length) {
    let k = Math.min(e.lineas.length - 1, Math.floor(tt / (dur / e.lineas.length)));
    let txt = String(e.lineas[k]).replace(/"/g, '\\"');
    run(`title ${cnSel} actionbar {"text":"${txt}","color":"white","italic":true}`);
  }
  c.t++;
  if (c.t >= total) { c.i++; c.t = 0; }
}); });

// Si alguien se desconectó durante la cinemática y vuelve cuando ya terminó, se le devuelve a su sitio
PlayerEvents.loggedIn(event => {
  let server = event.server, n = event.player.getName().getString();
  let c = global.stCine;
  if (c && c.antes[n]) return;
  let m = {};
  try { m = JSON.parse(server.persistentData.getString('starvios_cine_antes') || '{}'); } catch (e) {}
  server.runCommandSilent(`tag ${n} remove ${CN_TAG}`);
  let a = m[n];
  if (!a) return;
  server.scheduleInTicks(20, () => {
    if (a.pos) server.runCommandSilent(`execute in ${a.dim} run tp ${n} ${Number(a.pos.x).toFixed(2)} ${Number(a.pos.y).toFixed(2)} ${Number(a.pos.z).toFixed(2)}`);
    server.runCommandSilent(`gamemode ${a.modo} ${n}`);
  });
  delete m[n];
  server.persistentData.putString('starvios_cine_antes', JSON.stringify(m));
});

// ---------- Prólogo narrado (solo audio) ----------
let PROLOGO_SONIDO = 'starvios:prologo.completo';
global.stPrologoAudio = (server) => {
  let seg = Number(global.STARVIOS.prologoSegundos) || 90;
  global.stPrologoHasta = Date.now() + seg * 1000;     // el anuncio del día 1 espera a que termine
  // volumen 100 = se oye igual en cualquier sitio cercano aunque te muevas
  server.runCommandSilent(`execute as @a at @s run playsound ${PROLOGO_SONIDO} master @s ~ ~ ~ 100 1`);
  return true;
};
global.stPrologoSonando = () => Date.now() < (global.stPrologoHasta || 0);

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('intro')
      .executes(ctx => { global.stPrologoAudio(ctx.source.server); decir(ctx)('§6[Starvios] Prólogo sonando para todos.'); return 1; })
      .then(Commands.literal('parar').executes(ctx => {
        global.stPrologoHasta = 0;
        ctx.source.server.runCommandSilent(`stopsound @a master ${PROLOGO_SONIDO}`);
        decir(ctx)('§6Prólogo detenido.'); return 1;
      }))
      .then(Commands.literal('reset').executes(ctx => {
        ctx.source.server.persistentData.putBoolean('starvios_intro_vista', false);
        decir(ctx)('§6El prólogo volverá a sonar solo cuando empiece la serie.'); return 1;
      }))));
});

// ============================================================
//  CINEMÁTICA DE JEFE: al invocar un jefe con anuncio (/starvios jefe N o la cuenta atrás)
//  1) la cámara rodea la arena mientras el jefe cae del cielo
//  2) primer plano: el jefe salta, ruge y suelta una onda de choque; sale su nombre
//  3) la cámara gira a su alrededor... y cada uno vuelve a su sitio para luchar
//  Desactivar: animacionJefes.cinematica = false en 00_config.js
// ============================================================
global.stCineJefe = (server, jefe) => {
  let anim = global.STARVIOS.animacionJefes || {};
  if (anim.cinematica === false || global.stCine || !server.players.length) return false;
  let J = '@e[tag=st_cine_jefe,limit=1]';
  let caida = anim.activa ? (anim.segundosCaida || 3) : 0;
  let donde = global.stDondeArena(jefe, server);
  let nombre = String(jefe.nombre).replace(/"/g, '\\"');
  let run = (x) => server.runCommandSilent(x);
  // quieto durante la cinemática
  run(`effect give @e[tag=st_cine_jefe] minecraft:slowness ${caida + 14} 255 true`);
  let escenas = [
    { id: 'j1', prefijo: donde, seg: caida + 1, voz: false, fundido: false, cam: cnRecta([-30, 18, -22], [-18, 12, -30]), mira: J,
      lineas: ['El cielo se oscurece sobre la arena...'] },
    { id: 'j2', prefijo: donde, seg: 6, voz: false, fundido: false, cam: cnRecta([0, 3, -13], [0, 2.5, -8]), mira: J,
      lineas: [`☠ ${jefe.nombre} ha despertado`],
      eventos: {
        10: (sv) => {
          sv.runCommandSilent(`execute as ${J} run data merge entity @s {Motion:[0.0,0.7,0.0]}`);
          sv.runCommandSilent(`execute at ${J} run playsound minecraft:entity.ravager.roar master @a ~ ~ ~ 6 0.6`);
        },
        28: (sv) => {
          sv.runCommandSilent(`execute at ${J} run particle minecraft:explosion_emitter ~ ~ ~ 0 0 0 0 1 force`);
          sv.runCommandSilent(`execute at ${J} run particle minecraft:sweep_attack ~ ~0.5 ~ 4 0.2 4 0 40 force`);
          sv.runCommandSilent(`execute at ${J} run particle minecraft:large_smoke ~ ~0.3 ~ 5 0.2 5 0.05 120 force`);
          sv.runCommandSilent(`execute at ${J} run playsound minecraft:entity.generic.explode master @a ~ ~ ~ 6 0.5`);
          sv.runCommandSilent(`title @a[tag=${CN_TAG}] times 5 50 15`);
          sv.runCommandSilent(`title @a[tag=${CN_TAG}] title {"text":"${nombre.toUpperCase()}","color":"${jefe.color || 'dark_red'}","bold":true}`);
          sv.runCommandSilent(`title @a[tag=${CN_TAG}] subtitle {"text":"Tirano de Starvios","color":"gray"}`);
        }
      } },
    { id: 'j3', prefijo: donde, seg: 4, voz: false, fundido: false, cam: cnRecta([-8, 3, -8], [8, 4, -8]), mira: J,
      lineas: ['¡Que comience la batalla!'] }
  ];
  let ok = cnEmpezar(server, () => {}, escenas, (sv) => {
    sv.runCommandSilent(`effect clear @e[tag=st_cine_jefe] minecraft:slowness`);
    sv.runCommandSilent(`tag @e[tag=st_cine_jefe] remove st_cine_jefe`);
    sv.runCommandSilent(`effect give @a minecraft:resistance 5 4 true`);
    sv.runCommandSilent(`effect give @a minecraft:blindness 1 0 true`);
    sv.runCommandSilent(`title @a actionbar {"text":"⚔ ¡A luchar!","color":"red","bold":true}`);
    sv.runCommandSilent(`execute as @a at @s run playsound minecraft:event.raid.horn master @s ~ ~ ~ 1 0.8`);
  });
  if (!ok) run(`effect clear @e[tag=st_cine_jefe] minecraft:slowness`);
  return ok;
};
