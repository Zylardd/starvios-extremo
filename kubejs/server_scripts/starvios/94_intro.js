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

// ---------- Prólogo narrado (solo audio + subtítulos) ----------
let PROLOGO_SONIDO = 'starvios:prologo.completo';
let PR_TIEMPOS = 'kubejs/config/starvios_prologo.json';   // lo crea generar_prologo.bat (tiempos exactos de cada frase)

// [[inicio, fin, texto], ...] en segundos
let prSegmentos = () => {
  try {
    let m = JsonIO.read(PR_TIEMPOS);
    if (m) {
      let d = JSON.parse(String(m.datos != null ? m.datos : m.get('datos')));
      if (d && d.length) return d;
    }
  } catch (e) {}
  let txt = global.STARVIOS.prologo || [];
  // Tiempos medidos (00_config.js -> prologoTiempos)
  let tm = global.STARVIOS.prologoTiempos;
  if (tm && tm.length === txt.length) return txt.map((t, i) => [tm[i][0], tm[i][1], t]);
  // Sin tiempos: se reparte la duración según lo largo de cada frase
  let total = Number(global.STARVIOS.prologoSegundos) || 90;
  let letras = txt.reduce((s, t) => s + t.length, 0) || 1;
  let r = [], t0 = 0.3;
  txt.forEach(t => { let d = (total - 1) * t.length / letras; r.push([t0, t0 + d, t]); t0 += d; });
  return r;
};
global.stPrologoDuracion = () => {
  let seg = prSegmentos();
  let fin = seg.length ? Number(seg[seg.length - 1][1]) : 0;
  return Math.max(fin + 1, Number(global.STARVIOS.prologoSegundos) || 0) || 90;
};

// Parte una frase en trozos de ~55 letras que quepan en pantalla
let prTrozos = (texto) => {
  let palabras = String(texto).split(' '), out = [], cur = '';
  palabras.forEach(w => {
    if ((cur + ' ' + w).trim().length > 55 && cur) { out.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
    if (/[.!?…:]$/.test(w) && cur.length > 25) { out.push(cur.trim()); cur = ''; }
  });
  if (cur.trim()) out.push(cur.trim());
  return out;
};
let prEsc = (t) => String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// Subtítulos abajo (encima de la barra de objetos), pequeños, y sincronizados con el RELOJ REAL:
// aunque el servidor vaya lento, cada línea sale en el segundo exacto del audio.
// Si notas que van adelantados/atrasados, ajusta prologoDesfase en 00_config.js (segundos, puede ser negativo).
let prSubs = [];          // [[inicio, fin, texto], ...] por trozos
let prInicio = 0, prUltimo = -1, prUltimoEnvio = 0;
global.stPrologoToken = 0;
global.stPrologoAudio = (server) => {
  let total = global.stPrologoDuracion();
  global.stPrologoHasta = Date.now() + total * 1000;     // el anuncio del día 1 espera a que termine
  // volumen 100 = se oye igual en cualquier sitio cercano aunque te muevas
  server.runCommandSilent(`execute as @a at @s run playsound ${PROLOGO_SONIDO} voice @s ~ ~ ~ 100 1`);
  // Con Plasmo Voice: se silencia a todos (menos a los admins) mientras dura el prólogo
  if (global.STARVIOS.silenciarVozEnPrologo !== false && global.stSilencioVoz) {
    global.stSilencioVoz(server, true);
    let fin = Date.now() + total * 1000;
    global.stSilencioHasta = fin;
    server.scheduleInTicks(Math.round(total * 20) + 20, () => { if (global.stSilencioHasta === fin) global.stSilencioVoz(server, false); });
  }
  prSubs = [];
  if (global.STARVIOS.prologoSubtitulos !== false) {
    prSegmentos().forEach(sg => {
      let ini = Number(sg[0]), fin = Number(sg[1]);
      let trozos = prTrozos(sg[2]);
      let letras = trozos.reduce((s2, t) => s2 + t.length, 0) || 1;
      let t = ini;
      trozos.forEach(tr => { let d = (fin - ini) * tr.length / letras; prSubs.push([t, t + d, tr]); t += d; });
    });
  }
  prInicio = Date.now() + (Number(global.STARVIOS.prologoDesfase) || 0) * 1000;
  prUltimo = -1;
  global.stPrologoToken = prInicio;
  return true;
};
ServerEvents.tick(event => { global.stSeguro('94_intro (subtítulos)', () => {
  if (!prSubs.length || global.stPrologoToken !== prInicio) return;
  let server = event.server;
  let t = (Date.now() - prInicio) / 1000;
  if (t < 0) return;
  let i = -1;
  for (let k = 0; k < prSubs.length; k++) if (t >= prSubs[k][0] && t < prSubs[k][1] + 0.4) { i = k; break; }
  if (t > prSubs[prSubs.length - 1][1] + 1) {   // terminó
    server.runCommandSilent('title @a actionbar {"text":""}');
    prSubs = []; return;
  }
  // la barra de acción se borra sola a los ~2 s: se reenvía mientras dure la línea
  if (i !== prUltimo || (i >= 0 && Date.now() - prUltimoEnvio > 1500)) {
    prUltimo = i; prUltimoEnvio = Date.now();
    server.runCommandSilent(i >= 0
      ? `title @a actionbar {"text":"${prEsc(prSubs[i][2])}","color":"#F3E2C0","italic":true}`
      : 'title @a actionbar {"text":""}');
  }
}); });

global.stPrologoSonando = () => Date.now() < (global.stPrologoHasta || 0);

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('intro')
      .executes(ctx => { global.stPrologoAudio(ctx.source.server); decir(ctx)('§6[Starvios] Prólogo sonando para todos.'); return 1; })
      .then(Commands.literal('parar').executes(ctx => {
        global.stPrologoHasta = 0;
        global.stPrologoToken = -1;
        global.stSilencioHasta = 0;
        if (global.stSilencioVoz) global.stSilencioVoz(ctx.source.server, false);
        ctx.source.server.runCommandSilent(`stopsound @a voice ${PROLOGO_SONIDO}`);
        ctx.source.server.runCommandSilent('title @a actionbar {"text":""}');
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


// ============================================================
//  SILENCIO DEL CHAT DE VOZ (mod Plasmo Voice: comandos /vmute y /vunmute)
//  /starvios silencio on   -> silencia a todos los jugadores (los admins NO, para que puedas hablar)
//  /starvios silencio off  -> les devuelve la voz
//  Durante el prólogo se hace solo (00_config.js -> silenciarVozEnPrologo).
//  Para hablarles a TODOS a la vez: addon pv-addon-broadcast (/vbc server + tecla de Broadcast).
// ============================================================
global.stSilencioVoz = (server, on) => {
  server.persistentData.putBoolean('starvios_silencio', on);
  server.players.forEach(p => {
    let n = p.getName().getString();
    try { if (p.hasPermissions(2)) return; } catch (e) {}
    server.runCommandSilent(on ? `vmute ${n}` : `vunmute ${n}`);
  });
  server.runCommandSilent(on
    ? 'title @a actionbar {"text":"🔇 Chat de voz silenciado","color":"gray"}'
    : 'title @a actionbar {"text":"🔊 Chat de voz activado","color":"green"}');
};
ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('silencio')
      .then(Commands.literal('on').executes(ctx => { global.stSilencioVoz(ctx.source.server, true); ctx.source.sendSystemMessage(Text.of('§6[Starvios] Voz silenciada (menos admins).')); return 1; }))
      .then(Commands.literal('off').executes(ctx => { global.stSilencioHasta = 0; global.stSilencioVoz(ctx.source.server, false); ctx.source.sendSystemMessage(Text.of('§6[Starvios] Voz activada.')); return 1; }))));
});

// Quien entre mientras el silencio está activo también queda silenciado
PlayerEvents.loggedIn(event => {
  let server = event.server, p = event.player;
  if (!server.persistentData.getBoolean('starvios_silencio')) return;
  try { if (p.hasPermissions(2)) return; } catch (e) {}
  let n = p.getName().getString();
  server.scheduleInTicks(40, () => server.runCommandSilent(`vmute ${n}`));
});
