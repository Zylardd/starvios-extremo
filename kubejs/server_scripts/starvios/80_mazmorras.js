// priority: 200
// ============================================================
//  STARVIOS - MAZMORRAS ALEATORIAS
//  /starvios mazmorra           -> en un punto al azar (configuración en 00_config.js -> mazmorras)
//  /starvios mazmorra aqui      -> donde estás tú
//  /starvios mazmorra lista     -> vuelve a anunciar las mazmorras activas
//  /starvios mazmorra limpiar   -> borra la lista (no toca el mundo)
//  /mazmorras (todos)           -> ver coordenadas de las mazmorras activas
//
//  Cada mazmorra: una estructura (según el bioma), guardianes élite,
//  un cofre de botín con fragmentos de corazón y una columna de humo
//  (fogata de señal) que se ve desde lejos.
// ============================================================

let MZ = () => global.STARVIOS.mazmorras;
let mzAzar = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

let mzLista = (server) => {
  let s = server.persistentData.getString('starvios_mazmorras');
  if (!s) return [];
  try { return JSON.parse(s); } catch (e) { return []; }
};
let mzGuardar = (server, l) => {
  server.persistentData.putString('starvios_mazmorras', JSON.stringify(l.slice(-8)));
  // Historial PERMANENTE de todo lo construido (no se recorta ni lo borra el reset): sirve para /starvios estructuras
  let h = [];
  try { h = JSON.parse(server.persistentData.getString('starvios_historial') || '[]'); } catch (e) {}
  l.forEach(m => { if (!h.some(x => x.x === m.x && x.z === m.z)) h.push(m); });
  server.persistentData.putString('starvios_historial', JSON.stringify(h));
};

let mzDireccion = (dx, dz) => {
  let ang = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;   // 0 = norte
  let nombres = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  return nombres[Math.round(ang / 45) % 8];
};

let mzEsAgua = (server, x, z) => {
  let r = server.runCommandSilent(`execute in minecraft:overworld if biome ${x} 64 ${z} #minecraft:is_ocean`);
  let r2 = server.runCommandSilent(`execute in minecraft:overworld if biome ${x} 64 ${z} #minecraft:is_river`);
  return (r > 0) || (r2 > 0);
};

// Punto al azar: en tierra, fuera del spawn protegido, dentro del rango
// Un intento: devuelve {x, z} o null (sin variables "let" dentro de bucles: Rhino a veces las pierde)
let mzProbar = (server, sx, sz, dMin, dMax) => {
  let ang = Math.random() * Math.PI * 2;
  let d = dMin + Math.random() * (dMax - dMin);
  let px = Math.round(sx + Math.cos(ang) * d) * 1;
  let pz = Math.round(sz + Math.sin(ang) * d) * 1;
  if (!isFinite(px) || !isFinite(pz)) { console.warn(`[Starvios] mzProbar NaN: sx=${sx} sz=${sz} d=${d} ang=${ang}`); return null; }
  if (global.stEnSpawn('minecraft:overworld', px, pz)) return null;
  if (mzEsAgua(server, px, pz)) return null;
  return `${px} ${pz}`;   // texto "x z": los objetos a veces no sobreviven al pasar por global en KubeJS
};
let mzElegirPunto = (server) => {
  let s = global.STARVIOS.spawn, c = MZ();
  if (!c || !s) return null;
  // Number(): los valores de la config pueden llegar como objetos Java; así se convierten bien
  let sx = Number(String(s.x)), sz = Number(String(s.z)), dMin = Number(String(c.distanciaMin)), dMax = Number(String(c.distanciaMax));
  if (!isFinite(sx) || !isFinite(sz) || !isFinite(dMin) || !isFinite(dMax)) {
    console.warn(`[Starvios] mzElegirPunto: config rara sx=${s.x} sz=${s.z} min=${c.distanciaMin} max=${c.distanciaMax}`);
    return null;
  }
  let res = '';
  for (let i = 0; i < 40 && !res; i++) res = mzProbar(server, sx, sz, dMin, dMax) || '';
  return res;   // "x z" o '' si no encontró
};

let mzMezclar = (arr) => {
  let a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); let t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};

// Contenido del cofre en formato NBT
let mzItemsCofre = () => {
  let c = MZ().cofre, items = [], slot = 0;
  let frag = global.stItemsEspeciales.fragmento;
  items.push(`{Slot:${slot++}b,id:"${frag[0]}",Count:${mzAzar(c.fragmentos[0], c.fragmentos[1])}b,tag:${frag[1]}}`);
  for (let i = 0; i < c.premios; i++) {
    let p = global.stPremioAleatorio();
    let tag = p.nbt ? `,tag:${p.nbt}` : '';
    items.push(`{Slot:${slot * 3}b,id:"${p.id}",Count:${mzAzar(p.min, p.max)}b${tag}}`);
    slot++;
  }
  // Valiosos garantizados (tótem, manzana de Notch o corazón del mar) + botín especial
  let b = global.STARVIOS.botinEspecial;
  for (let i = 0; i < (c.valiososGarantizados || 0); i++) {
    let v = b.valiosos[Math.floor(Math.random() * b.valiosos.length)];
    items.push(`{Slot:${13 + i}b,id:"${v.id}",Count:${v.cantidad}b}`);
  }
  global.stBotinEspecial(c.tiradasEspeciales == null ? 3 : c.tiradasEspeciales).forEach((it, i) => items.push(`{Slot:${20 + i}b,id:"${it.id}",Count:${it.cantidad}b}`));
  return `[${items.join(',')}]`;
};

// Paso final: guardianes, cofre, humo, anuncio
let mzPoblar = (server, x, z, nombre) => {
  let cmd = (c) => server.runCommandSilent(`execute in minecraft:overworld run ${c}`);
  let c = MZ();
  let mzId = String(Date.now() % 1000000);   // todos los defensores de esta mazmorra llevan la marca mz_<id>

  // Fogata de señal (humo visible desde lejos). El botín lo lleva el Capitán.
  cmd(`summon minecraft:armor_stand ${x} 320 ${z} {Tags:["starvios_cofre_nuevo"],Invisible:1b,Marker:1b,NoGravity:1b}`);
  cmd(`spreadplayers ${x} ${z} 0 4 false @e[tag=starvios_cofre_nuevo]`);
  cmd(`execute at @e[tag=starvios_cofre_nuevo,limit=1] run setblock ~ ~-1 ~ minecraft:hay_block`);
  cmd(`execute at @e[tag=starvios_cofre_nuevo,limit=1] run setblock ~ ~ ~ minecraft:campfire[lit=true,signal_fire=true]`);
  cmd(`kill @e[tag=starvios_cofre_nuevo]`);

  // Capitán: élite reforzado que suelta el cofre al morir
  let cap = c.capitan || { vidaExtra: 2, nombre: 'Capitán de la mazmorra' };
  cmd(`summon minecraft:vindicator ${x} 320 ${z} {Tags:["starvios_capitan_nuevo","mz_${mzId}"],PersistenceRequired:1b}`);
  cmd(`spreadplayers ${x} ${z} 0 6 false @e[tag=starvios_capitan_nuevo]`);

  // Guardianes élite alrededor
  let n = mzAzar(c.guardianes[0], c.guardianes[1]);
  for (let i = 0; i < n; i++) {
    let tipo = c.tiposGuardian[Math.floor(Math.random() * c.tiposGuardian.length)];
    cmd(`summon ${tipo} ${x} 320 ${z} {Tags:["starvios_guardian_nuevo","mz_${mzId}"],PersistenceRequired:1b}`);
  }
  cmd(`spreadplayers ${x} ${z} 3 18 false @e[tag=starvios_guardian_nuevo]`);
  server.scheduleInTicks(2, () => {
    c.tiposGuardian.forEach(tipo => {
      global.stHacerEliteSel(server, `@e[tag=starvios_guardian_nuevo,type=${tipo}]`, tipo);
    });
    server.runCommandSilent(`execute as @e[tag=mz_${mzId}] run attribute @s minecraft:generic.follow_range base set 32`);
    // Cada defensor recuerda su puesto (para volver si persigue demasiado lejos)
    server.runCommandSilent(`execute as @e[tag=mz_${mzId}] run data modify entity @s ForgeData.st_casa set from entity @s Pos`);
    server.runCommandSilent(`tag @e[tag=starvios_guardian_nuevo] remove starvios_guardian_nuevo`);
    // El capitán: élite + vida extra + nombre propio + brillo
    let capSel = '@e[tag=starvios_capitan_nuevo]';
    global.stHacerEliteSel(server, capSel, 'minecraft:vindicator');
    let as = (k) => server.runCommandSilent(`execute as ${capSel} run ${k}`);
    as(`attribute @s minecraft:generic.max_health modifier add 5a7c1e00-0000-4000-8000-0000000000c1 starvios_capitan ${(cap.vidaExtra - 1).toFixed(2)} multiply`);
    as(`data merge entity @s {Health:100000f,CustomName:'{"text":"♛ ${cap.nombre}","color":"gold","bold":true}'}`);
    as(`item replace entity @s weapon.mainhand with minecraft:netherite_axe{Enchantments:[{id:"minecraft:sharpness",lvl:3s}]}`);
    as(`effect give @s minecraft:glowing infinite 0 true`);
    as(`tag @s add starvios_capitan`);
    server.runCommandSilent(`tag ${capSel} remove starvios_capitan_nuevo`);
  });

  // Soltar los chunks cargados a la fuerza
  server.scheduleInTicks(200, () => cmd(`forceload remove ${x - 48} ${z - 48} ${x + 48} ${z + 48}`));

  // Guardar y anunciar
  let lista = mzLista(server);
  lista.push({ nombre: nombre, x: x, z: z, dia: global.stDiaGuardado(server), id: mzId });
  mzGuardar(server, lista);
  // Altura aproximada (la del Capitán, ya en el suelo) para el anuncio
  server.runCommandSilent(`scoreboard players set #alto st_tmp 0`);
  server.runCommandSilent(`execute store result score #alto st_tmp run data get entity @e[tag=starvios_capitan_nuevo,limit=1] Pos[1]`);
  mzAnunciar(server, { nombre: nombre, x: x, z: z, guardianes: n, capitan: cap.nombre }, true);
  global.stGenerando = false;
};

let mzAnunciar = (server, m, nueva) => {
  let s = global.STARVIOS.spawn;
  let dist = Math.round(Math.sqrt(Math.pow(m.x - s.x, 2) + Math.pow(m.z - s.z, 2)));
  let dir = mzDireccion(m.x - s.x, m.z - s.z);
  let t = (c) => server.runCommandSilent(c);
  if (!nueva) {   // listado (/starvios mazmorra lista)
    t(`tellraw @a ["",{"text":"⚔ ","color":"dark_red"},{"text":"${m.nombre}","color":"gold","bold":true},` +
      `{"text":"  X: ${m.x}  Z: ${m.z}","color":"yellow"},{"text":"  (${dist} bloques al ${dir} del spawn)","color":"gray"}]`);
    return;
  }
  // "Cerca de": redondeado a decenas
  let rx = Math.round(m.x / 10) * 10, rz = Math.round(m.z / 10) * 10;
  let dia = global.stDiaGuardado(server);
  let nivel = dia >= 22 ? 4 : dia >= 15 ? 3 : dia >= 8 ? 2 : 1;
  let estrellas = '★'.repeat(nivel) + '☆'.repeat(4 - nivel);
  let nom = String(m.nombre).replace(/"/g, '\\"');
  t(`tellraw @a ["",{"text":"⚔ ","color":"dark_red"},{"text":"Se ha localizado una mazmorra: ","color":"gold"},{"text":"${nom}","color":"gold","bold":true}]`);
  t(`tellraw @a ["",{"text":"   📍 Cerca de ","color":"gray"},{"text":"X: ${rx}  Y: ","color":"yellow"},{"score":{"name":"#alto","objective":"st_tmp"},"color":"yellow"},` +
    `{"text":"  Z: ${rz}","color":"yellow"},{"text":"  (${dist} bloques al ${dir} del spawn)  ","color":"gray"},` +
    `{"text":"[Copiar]","color":"aqua","clickEvent":{"action":"copy_to_clipboard","value":"${rx} ${rz}"},"hoverEvent":{"action":"show_text","contents":"Copiar las coordenadas"}}]`);
  t(`tellraw @a ["",{"text":"   ☠ Peligro: ","color":"gray"},{"text":"${estrellas}","color":"red"},` +
    `{"text":"  ·  ${m.guardianes || 'Varios'} guardianes élite y su ","color":"gray"},{"text":"♛ ${m.capitan || 'Capitán'}","color":"gold"},` +
    `{"text":" (brilla). Solo el Capitán guarda el cofre con diamantes.","color":"gray"}]`);
  t(`tellraw @a {"text":"   Busca la columna de humo. Al golpear a uno, toda la mazmorra irá a por ti.","color":"dark_gray","italic":true}`);
  t(`execute as @a at @s run playsound minecraft:block.bell.resonate master @s ~ ~ ~ 0.6 0.8`);
};

// Genera la estructura; si los chunks aún no están listos, reintenta
let mzConstruir = (server, x, z, intento) => {
  let c = MZ();
  let candidatas = mzMezclar(c.estructuras).concat([c.respaldo]);
  for (let i = 0; i < candidatas.length; i++) {
    let r = server.runCommandSilent(`execute in minecraft:overworld run place structure ${candidatas[i].id} ${x} 64 ${z}`);
    if (r > 0) { mzPoblar(server, x, z, candidatas[i].nombre); return; }
  }
  if (intento < 3) {
    server.scheduleInTicks(100, () => mzConstruir(server, x, z, intento + 1));
  } else {
    // Ninguna estructura cupo: igual se crea el campamento de guardianes con el cofre
    mzPoblar(server, x, z, 'Campamento maldito');
  }
};

let mzEmpezar = (server, x, z, avisar) => {
  x = Number(x); z = Number(z);
  if (!isFinite(x) || !isFinite(z)) { avisar(`§cCoordenadas inválidas (x=${x}, z=${z}). Revisa "spawn" y "mazmorras" en 00_config.js.`); return; }
  // Mazmorra-laberinto (mismo generador que las criptas, en 85_criptas.js)
  if (global.crEmpezar && MZ().estilo !== 'estructura') { global.crEmpezar(server, x, z, avisar, 'mazmorra'); return; }
  if (global.stGenerando) { avisar('§cYa se está generando una mazmorra, espera unos segundos.'); return; }
  global.stGenerando = true;
  server.runCommandSilent(`execute in minecraft:overworld run forceload add ${x - 48} ${z - 48} ${x + 48} ${z + 48}`);
  avisar(`§6[Starvios] Generando mazmorra en X: ${x} Z: ${z}... (unos segundos)`);
  server.scheduleInTicks(100, () => mzConstruir(server, x, z, 0));
  // Seguro por si algo falla: libera el bloqueo a los 60 s
  server.scheduleInTicks(1200, () => { global.stGenerando = false; });
};

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  let msg = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));

  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('mazmorra')
      .executes(ctx => {
        let server = ctx.source.server;
        let p = mzElegirPunto(server);
        if (!p) { msg(ctx)('§cNo encontré tierra firme en el rango. Prueba otra vez.'); return 1; }
        let pp = String(p).split(' ');
        mzEmpezar(server, parseInt(pp[0]), parseInt(pp[1]), msg(ctx));
        return 1;
      })
      .then(Commands.literal('aqui').executes(ctx => {
        let pl = ctx.source.player;
        if (!pl) { msg(ctx)('Usa este comando dentro del juego.'); return 1; }
        let pos = global.stXYZ(pl);
        if (!pos) { msg(ctx)('§cNo pude leer tu posición. Usa /starvios mazmorra sin "aqui".'); return 1; }
        mzEmpezar(ctx.source.server, Math.round(pos.x), Math.round(pos.z), msg(ctx));
        return 1;
      }))
      .then(Commands.literal('lista').executes(ctx => {
        let l = mzLista(ctx.source.server);
        if (!l.length) { msg(ctx)('§7No hay mazmorras activas.'); return 1; }
        ctx.source.server.runCommandSilent(`tellraw @a {"text":"━━ Mazmorras activas ━━","color":"dark_red","bold":true}`);
        l.forEach(m => mzAnunciar(ctx.source.server, m, false));
        return 1;
      }))
      .then(Commands.literal('limpiar').executes(ctx => {
        mzGuardar(ctx.source.server, []);
        msg(ctx)('§6[Starvios] Lista de mazmorras vaciada (el mundo no cambia).');
        return 1;
      })))
  );

  // /mazmorras (todos)
  event.register(Commands.literal('mazmorras').executes(ctx => {
    let server = ctx.source.server;
    let l = mzLista(server).filter(d => !d.oculta);
    let m = msg(ctx);
    if (!l.length) { m('§7Ahora mismo no hay mazmorras conocidas.'); return 1; }
    let s = global.STARVIOS.spawn;
    m('§4§l━━ Mazmorras activas ━━');
    l.forEach(d => {
      let dist = Math.round(Math.sqrt(Math.pow(d.x - s.x, 2) + Math.pow(d.z - s.z, 2)));
      m(`§6${d.nombre} §eX: ${d.x} Z: ${d.z} §7(${dist} bloques al ${mzDireccion(d.x - s.x, d.z - s.z)})`);
    });
    return 1;
  }));
});

// Compartir utilidades con las criptas (85_criptas.js)
global.mzElegirPunto = mzElegirPunto;
global.mzLista = mzLista;
global.mzGuardar = mzGuardar;
global.mzDireccion = mzDireccion;
global.mzAnunciar = mzAnunciar;

// ---------- Muerte del Capitán: cae el cofre ----------
EntityEvents.death(event => { global.stSeguro('80_mazmorras (capitan)', () => {
  let e = event.entity;
  if (!e || e.isPlayer()) return;
  if (String(e.getTags()).indexOf('starvios_capitan') === -1) return;
  let killer = event.source.player;
  let quien = killer ? killer.getName().getString() : 'Alguien';
  let en = global.stComoEntidad(e);
  en(`setblock ~ ~ ~ minecraft:chest[facing=north]{CustomName:'{"text":"Tesoro del Capitán","color":"gold","bold":true}',Items:${mzItemsCofre()}}`);
  en(`particle minecraft:totem_of_undying ~ ~1 ~ 0.5 1 0.5 0.4 120 force`);
  en(`playsound minecraft:ui.toast.challenge_complete master @a[distance=..40] ~ ~ ~ 1 1`);
  e.server.runCommandSilent(`tellraw @a ["",{"text":"♛ ","color":"gold"},{"text":"${quien}","color":"yellow"},{"text":" ha derrotado al Capitán de una mazmorra. ¡Su tesoro está a la vista!","color":"gold"}]`);
}); });

// ---------- Foco común: todos los defensores de una mazmorra atacan al mismo jugador ----------
// Cuando un jugador golpea a un defensor (o un defensor golpea a un jugador),
// todos los de esa mazmorra pasan a perseguir a ese jugador.
EntityEvents.hurt(event => { global.stSeguro('80_mazmorras (foco)', () => {
  let v = event.entity;
  if (!v) return;
  let atacante = null;
  try { atacante = event.source.getEntity(); } catch (err) { try { atacante = event.source.actual; } catch (e2) {} }
  if (!atacante) return;
  let jugador = null, defensor = null;
  if (v.isPlayer() && !atacante.isPlayer()) { jugador = v; defensor = atacante; }
  else if (!v.isPlayer() && atacante.isPlayer()) { jugador = atacante; defensor = v; }
  if (!jugador || !defensor) return;
  let m = String(defensor.getTags()).match(/mz_(\d+)/);
  if (!m) return;
  let id = m[1];
  let n = jugador.getName().getString();
  global.stFoco = global.stFoco || {};
  let f = global.stFoco[id], ahora = Date.now();
  if (f && f.n === n && ahora - f.t < 3000) return;          // ya van a por él
  global.stFoco[id] = { n: n, t: ahora };
  let server = jugador.server;
  let level = server.getLevel(global.stDimDe(defensor));
  if (!level) return;
  level.getEntities().forEach(e => {
    if (String(e.getTags()).indexOf('mz_' + id) === -1) return;
    try { e.setTarget(jugador); } catch (err) {}
  });
  if (!f || f.n !== n) {
    server.runCommandSilent(`title ${n} actionbar {"text":"⚠ ¡Toda la mazmorra va a por ti!","color":"red","bold":true}`);
  }
}); });


// ---------- Correa: si persiguen demasiado lejos, vuelven a su puesto ----------
// Cada 2 s: los defensores que estén a más de "radioCorrea" bloques del centro de su mazmorra
// dejan de perseguir, vuelven a su sitio y se curan.
ServerEvents.tick(event => { global.stSeguro('80_mazmorras (correa)', () => {
  global.stCorreaTick = (global.stCorreaTick || 0) + 1;
  if (global.stCorreaTick % 40 !== 0) return;
  let server = event.server;
  let R = (global.STARVIOS.mazmorras && global.STARVIOS.mazmorras.radioCorrea) || 40;
  let lista = mzLista(server).filter(m => m.id && !m.cripta);
  if (!lista.length) return;
  let ow = (c) => server.runCommandSilent(`execute in minecraft:overworld run ${c}`);
  lista.forEach(m => {
    ow(`execute as @e[tag=mz_${m.id}] at @s positioned ${m.cx || m.x} ~ ${m.cz || m.z} unless entity @s[distance=..${m.radio || R}] run tag @s add st_volver`);
  });
  // Olvidar al jugador
  let level = server.getLevel('minecraft:overworld');
  if (level) level.getEntities().forEach(e => {
    let tg = String(e.getTags());
    if (tg.indexOf('st_volver') === -1) return;
    try { e.setTarget(null); } catch (err) {}
    let mm = tg.match(/mz_(\d+)/);
    if (mm && global.stFoco) delete global.stFoco[mm[1]];
  });
  let V = '@e[tag=st_volver]';
  ow(`execute at ${V} run particle minecraft:large_smoke ~ ~1 ~ 0.3 0.6 0.3 0.02 20`);
  ow(`execute as ${V} run data modify entity @s Pos set from entity @s ForgeData.st_casa`);
  ow(`execute as ${V} run data merge entity @s {Health:100000f,Fire:0s}`);
  ow(`execute at ${V} run particle minecraft:reverse_portal ~ ~1 ~ 0.4 0.8 0.4 0.05 30`);
  ow(`execute at ${V} run playsound minecraft:entity.enderman.teleport hostile @a[distance=..24] ~ ~ ~ 0.6 0.7`);
  ow(`tag ${V} remove st_volver`);
}); });


// ============================================================
//  /starvios estructuras          -> lista TODAS las mazmorras/criptas construidas, con botones para borrarlas
//  /starvios estructuras olvidar  -> vacía la lista (después de borrarlas)
//  El borrado usa WorldEdit (//regen): regenera esa zona como era el terreno original de la semilla.
//  Pasos por cada una: [TP] -> [1] -> [2] -> [3 Regenerar]
// ============================================================
let mzHistorial = (server) => {
  let h = [];
  try { h = JSON.parse(server.persistentData.getString('starvios_historial') || '[]'); } catch (e) {}
  mzLista(server).forEach(m => { if (!h.some(x => x.x === m.x && x.z === m.z)) h.push(m); });
  return h;
};
// Caja que ocupa cada estructura (bloques)
let mzCaja = (m) => {
  if (m.cripta || m.laberinto) {
    let largo = m.largo || 70, ancho = m.ancho || 35;
    return { x1: m.x - 12, z1: m.z - ancho - 4, x2: m.x + largo + 4, z2: m.z + ancho + 4 };
  }
  return { x1: m.x - 32, z1: m.z - 32, x2: m.x + 32, z2: m.z + 32 };   // mazmorra antigua (estructura)
};
ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('estructuras')
      .executes(ctx => {
        let server = ctx.source.server, p = ctx.source.player;
        let h = mzHistorial(server);
        let dest = p ? p.getName().getString() : '@a';
        if (!h.length) { ctx.source.sendSystemMessage(Text.of('§7No hay mazmorras ni criptas registradas.')); return 1; }
        server.runCommandSilent(`tellraw ${dest} {"text":"━━ Estructuras construidas (${h.length}) ━━","color":"gold","bold":true}`);
        server.runCommandSilent(`tellraw ${dest} {"text":"Para cada una: [TP], luego [1], [2] y [3 Regenerar] (WorldEdit). Tarda unos segundos.","color":"gray"}`);
        h.forEach((m, i) => {
          let c = mzCaja(m);
          let tipo = m.cripta ? 'Cripta' : (m.laberinto ? 'Mazmorra' : 'Mazmorra (antigua)');
          let aviso = '';
          let enArena = global.stEnArena && (global.stEnArena(server, c.x1, 64, c.z1) || global.stEnArena(server, c.x2, 64, c.z2) || global.stEnArena(server, m.x, 64, m.z));
          if (enArena) aviso = ',{"text":"  ⚠ toca una ARENA, no la regeneres","color":"red","bold":true}';
          server.runCommandSilent(`tellraw ${dest} ["",{"text":"${i + 1}. ${tipo} ${String(m.nombre || '').replace(/"/g, '')} ","color":"yellow"},{"text":"(${m.x}, ${m.z})  ","color":"gray"},` +
            `{"text":"[TP] ","color":"aqua","clickEvent":{"action":"run_command","value":"/execute in minecraft:overworld run tp @s ${m.x} 200 ${m.z}"}},` +
            `{"text":"[1] ","color":"green","clickEvent":{"action":"run_command","value":"//pos1 ${c.x1},-64,${c.z1}"},"hoverEvent":{"action":"show_text","contents":"Primera esquina"}},` +
            `{"text":"[2] ","color":"green","clickEvent":{"action":"run_command","value":"//pos2 ${c.x2},319,${c.z2}"},"hoverEvent":{"action":"show_text","contents":"Segunda esquina"}},` +
            `{"text":"[3 Regenerar]","color":"red","bold":true,"clickEvent":{"action":"run_command","value":"//regen"},"hoverEvent":{"action":"show_text","contents":"Vuelve el terreno a como era (WorldEdit)"}}${aviso}]`);
        });
        return 1;
      })
      .then(Commands.literal('olvidar').executes(ctx => {
        let server = ctx.source.server;
        server.persistentData.putString('starvios_historial', '[]');
        server.persistentData.putString('starvios_mazmorras', '[]');
        server.runCommandSilent('kill @e[tag=starvios_guardian]');
        server.runCommandSilent('kill @e[tag=starvios_capitan]');
        server.runCommandSilent('kill @e[tag=starvios_cripta_jefe]');
        server.runCommandSilent('kill @e[tag=starvios_cripta]');
        ctx.source.sendSystemMessage(Text.of('§a[Starvios] Lista de mazmorras y criptas vaciada (y sus monstruos cargados, eliminados).'));
        return 1;
      }))));
});
