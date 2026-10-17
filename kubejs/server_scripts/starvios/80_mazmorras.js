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
let mzGuardar = (server, l) => server.persistentData.putString('starvios_mazmorras', JSON.stringify(l.slice(-8)));

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
let mzElegirPunto = (server) => {
  let s = global.STARVIOS.spawn, c = MZ();
  for (let i = 0; i < 40; i++) {
    let ang = Math.random() * Math.PI * 2;
    let d = c.distanciaMin + Math.random() * (c.distanciaMax - c.distanciaMin);
    let x = Math.round(s.x + Math.cos(ang) * d), z = Math.round(s.z + Math.sin(ang) * d);
    if (global.stEnSpawn({ dimension: 'minecraft:overworld' }, x, z)) continue;
    if (mzEsAgua(server, x, z)) continue;
    return { x: x, z: z };
  }
  return null;
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
  return `[${items.join(',')}]`;
};

// Paso final: guardianes, cofre, humo, anuncio
let mzPoblar = (server, x, z, nombre) => {
  let cmd = (c) => server.runCommandSilent(`execute in minecraft:overworld run ${c}`);
  let c = MZ();

  // Cofre + fogata de señal junto a él
  cmd(`summon minecraft:armor_stand ${x} 320 ${z} {Tags:["starvios_cofre_nuevo"],Invisible:1b,Marker:1b,NoGravity:1b}`);
  cmd(`spreadplayers ${x} ${z} 0 4 false @e[tag=starvios_cofre_nuevo]`);
  cmd(`execute at @e[tag=starvios_cofre_nuevo,limit=1] run setblock ~ ~ ~ minecraft:chest[facing=north]{CustomName:'{"text":"Botín de la mazmorra","color":"gold"}',Items:${mzItemsCofre()}}`);
  cmd(`execute at @e[tag=starvios_cofre_nuevo,limit=1] run setblock ~1 ~-1 ~ minecraft:hay_block`);
  cmd(`execute at @e[tag=starvios_cofre_nuevo,limit=1] run setblock ~1 ~ ~ minecraft:campfire[lit=true,signal_fire=true]`);
  cmd(`kill @e[tag=starvios_cofre_nuevo]`);

  // Guardianes élite alrededor
  let n = mzAzar(c.guardianes[0], c.guardianes[1]);
  for (let i = 0; i < n; i++) {
    let tipo = c.tiposGuardian[Math.floor(Math.random() * c.tiposGuardian.length)];
    cmd(`summon ${tipo} ${x} 320 ${z} {Tags:["starvios_guardian_nuevo"],PersistenceRequired:1b}`);
  }
  cmd(`spreadplayers ${x} ${z} 3 18 false @e[tag=starvios_guardian_nuevo]`);
  server.scheduleInTicks(2, () => {
    let level = server.getLevel('minecraft:overworld');
    level.getEntities().forEach(e => {
      if (!e.getTags().contains('starvios_guardian_nuevo')) return;
      e.removeTag('starvios_guardian_nuevo');
      global.stHacerElite(e, String(e.type));
    });
  });

  // Soltar los chunks cargados a la fuerza
  server.scheduleInTicks(200, () => cmd(`forceload remove ${x - 48} ${z - 48} ${x + 48} ${z + 48}`));

  // Guardar y anunciar
  let lista = mzLista(server);
  lista.push({ nombre: nombre, x: x, z: z, dia: global.stDiaGuardado(server) });
  mzGuardar(server, lista);
  mzAnunciar(server, { nombre: nombre, x: x, z: z }, true);
  global.stGenerando = false;
};

let mzAnunciar = (server, m, conTitulo) => {
  let s = global.STARVIOS.spawn;
  let dist = Math.round(Math.sqrt(Math.pow(m.x - s.x, 2) + Math.pow(m.z - s.z, 2)));
  let dir = mzDireccion(m.x - s.x, m.z - s.z);
  if (conTitulo) {
    server.runCommandSilent(`title @a times 10 70 20`);
    server.runCommandSilent(`title @a title {"text":"⚔ NUEVA MAZMORRA","color":"dark_red","bold":true}`);
    server.runCommandSilent(`title @a subtitle {"text":"${m.nombre}","color":"gold"}`);
    server.runCommandSilent(`execute as @a at @s run playsound minecraft:event.raid.horn master @s ~ ~ ~ 0.8 1`);
  }
  server.runCommandSilent(`tellraw @a ["",{"text":"⚔ ","color":"dark_red"},{"text":"${m.nombre}","color":"gold","bold":true},` +
    `{"text":"  X: ${m.x}  Z: ${m.z}","color":"yellow"},{"text":"  (${dist} bloques al ${dir} del spawn)","color":"gray"}]`);
  if (conTitulo) {
    server.runCommandSilent(`tellraw @a {"text":"Busca la columna de humo. La protegen mini-jefes y guarda un cofre de botín.","color":"gray"}`);
  }
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
        mzEmpezar(server, p.x, p.z, msg(ctx));
        return 1;
      })
      .then(Commands.literal('aqui').executes(ctx => {
        let pl = ctx.source.player;
        if (!pl) { msg(ctx)('Usa este comando dentro del juego.'); return 1; }
        mzEmpezar(ctx.source.server, Math.round(pl.x), Math.round(pl.z), msg(ctx));
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
    let l = mzLista(server);
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
