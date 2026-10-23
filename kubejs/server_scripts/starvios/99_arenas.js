// priority: 20
// ============================================================
//  STARVIOS - ARENAS DE JEFES (4 temáticas, para ~20 jugadores)
//
//  /starvios arena construir <1-4>            -> te explica las opciones
//  /starvios arena construir <1-4> lejos      -> en una esquina del mundo (dentro del borde)
//  /starvios arena construir <1-4> aqui       -> CENTRADA donde estás
//  /starvios arena construir <1-4> en <x> <z> -> en esas coordenadas
//  /starvios arena tp <1-4>                   -> te lleva a la arena
//  /starvios arena llevar <1-4>               -> lleva a todos los jugadores (supervivencia) dentro
//  /starvios arena cerrar <1-4> / abrir <1-4> -> rejas en las 4 puertas
//  /starvios arena lista
//
//  1 Coliseo de Hierro  (Ferrous Wroughtnaut)  · piedra, hierro y faroles
//  2 Arena Glacial      (Frostmaw)             · nieve, hielo y picos de hielo
//  3 Templo del Sol     (Umvuthi)              · arenisca roja, terracota y rayos de sol
//  4 Forja Infernal     (Netherita / Ignis)    · piedra negra, basalto y anillo de magma
//
//  Suelo de 45 bloques de diámetro + gradas + muro exterior (unos 70x70 en total).
//  ¡Borra TODO lo que haya en un radio de ~35 bloques! Construye lejos de bases.
//  Las arenas no se pueden romper (salvo OP), las explosiones no les hacen nada
//  y no aparecen monstruos naturales dentro.
// ============================================================

let AR_R = 22;          // radio del suelo de combate
let AR_TOTAL = AR_R + 13;
let AR_JEFE_A_ARENA = [1, 2, 3, 4, 4];   // jefe 1..5 -> arena (Ignis usa la Forja). En config: jefes[i].arena

let arHash = (a, b, c) => {
  let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
let arMezcla = (lista, a, b, c) => {          // [[bloque, peso], ...]
  let r = arHash(a, b, c), tot = lista.reduce((s, x) => s + x[1], 0) * r;
  for (let i = 0; i < lista.length; i++) { tot -= lista[i][1]; if (tot <= 0) return lista[i][0]; }
  return lista[0][0];
};
let arCerca = (ang, cada, tol) => { let m = ang % cada; return m < tol || m > cada - tol; };

// ---------- Temas ----------
let AR_TEMAS = {
  1: {
    nombre: 'Coliseo de Hierro', color: 'gray',
    suelo: (dx, dz, r, ang) => {
      if (r <= 1.5) return 'minecraft:iron_block';
      if (r <= 4.5) return (Math.abs(dx) <= 0 || Math.abs(dz) <= 0) ? 'minecraft:iron_block' : 'minecraft:chiseled_stone_bricks';
      if (Math.abs(r - 9) < 0.6 || Math.abs(r - 16) < 0.6) return 'minecraft:stone_bricks';
      return arMezcla([['minecraft:polished_andesite', 6], ['minecraft:andesite', 2], ['minecraft:gravel', 1]], dx, 0, dz);
    },
    muro: (x, y, z) => arMezcla([['minecraft:stone_bricks', 6], ['minecraft:cracked_stone_bricks', 2], ['minecraft:mossy_stone_bricks', 1]], x, y, z),
    remate: 'minecraft:iron_bars', grada: 'minecraft:stone_bricks', asiento: 'minecraft:smooth_stone_slab[type=bottom]',
    exterior: (x, y, z) => arMezcla([['minecraft:stone_bricks', 5], ['minecraft:cracked_stone_bricks', 2], ['minecraft:andesite', 1]], x, y, z),
    pilar: (y) => (y % 4 === 0 ? 'minecraft:iron_block' : 'minecraft:polished_andesite'),
    almena: 'minecraft:stone_brick_wall', luz: 'minecraft:glowstone', farol: 'minecraft:lantern',
    plaza: (dx, dz) => arMezcla([['minecraft:cobblestone', 3], ['minecraft:gravel', 1], ['minecraft:stone', 2]], dx, 1, dz),
    reja: 'minecraft:iron_bars', cimiento: 'minecraft:stone'
  },
  2: {
    nombre: 'Arena Glacial', color: 'aqua',
    suelo: (dx, dz, r, ang) => {
      if (r <= 2.5) return 'minecraft:blue_ice';
      if (r <= 9 && arCerca(ang, 60, 6)) return 'minecraft:blue_ice';            // copo de nieve de 6 brazos
      if (r <= 9 && r > 6 && arCerca(ang + 30, 60, 5)) return 'minecraft:packed_ice';
      if (Math.abs(r - 13) < 0.6 || Math.abs(r - 18) < 0.6) return 'minecraft:packed_ice';
      return arMezcla([['minecraft:snow_block', 6], ['minecraft:white_concrete_powder', 1]], dx, 0, dz);
    },
    muro: (x, y, z) => arMezcla([['minecraft:packed_ice', 5], ['minecraft:blue_ice', 1]], x, y, z),
    remate: 'minecraft:diorite_wall', grada: 'minecraft:snow_block', asiento: 'minecraft:smooth_quartz_slab[type=bottom]',
    exterior: (x, y, z) => (y % 4 === 0 ? 'minecraft:snow_block' : 'minecraft:packed_ice'),
    pilar: (y) => 'minecraft:blue_ice',
    almena: 'minecraft:diorite_wall', luz: 'minecraft:sea_lantern', farol: 'minecraft:soul_lantern',
    plaza: (dx, dz) => 'minecraft:snow_block',
    reja: 'minecraft:iron_bars', cimiento: 'minecraft:packed_ice',
    pinchos: 'minecraft:packed_ice'
  },
  3: {
    nombre: 'Templo del Sol', color: 'gold',
    suelo: (dx, dz, r, ang) => {
      if (r <= 2.5) return 'minecraft:gold_block';
      if (r <= 3.6) return 'minecraft:ochre_froglight';
      if (r <= 17 && arCerca(ang, 30, 5 + 20 / Math.max(r, 1))) return (r < 10 ? 'minecraft:yellow_terracotta' : 'minecraft:orange_terracotta');
      if (Math.abs(r - 17.5) < 0.6) return 'minecraft:red_terracotta';
      return arMezcla([['minecraft:smooth_sandstone', 5], ['minecraft:sandstone', 1]], dx, 0, dz);
    },
    muro: (x, y, z) => (y === 3 ? 'minecraft:chiseled_red_sandstone' : 'minecraft:cut_red_sandstone'),
    remate: 'minecraft:acacia_fence', grada: 'minecraft:terracotta', asiento: 'minecraft:acacia_slab[type=bottom]',
    exterior: (x, y, z) => (y % 5 === 0 ? 'minecraft:orange_terracotta' : 'minecraft:red_sandstone'),
    pilar: (y) => 'minecraft:stripped_acacia_log',
    almena: 'minecraft:red_sandstone_wall', luz: 'minecraft:ochre_froglight', farol: 'minecraft:lantern',
    plaza: (dx, dz) => arMezcla([['minecraft:coarse_dirt', 3], ['minecraft:red_sand', 1], ['minecraft:smooth_sandstone', 1]], dx, 1, dz),
    reja: 'minecraft:acacia_fence', cimiento: 'minecraft:sandstone'
  },
  4: {
    nombre: 'Forja Infernal', color: 'dark_red',
    suelo: (dx, dz, r, ang) => {
      if (r <= 2.5) return 'minecraft:crying_obsidian';
      if (r <= 4) return 'minecraft:gilded_blackstone';
      if (r > AR_R - 2.2 && r <= AR_R - 0.8) return 'minecraft:magma_block';          // anillo de magma junto al muro
      if (Math.abs(r - 10) < 0.6 || Math.abs(r - 15) < 0.6) return 'minecraft:polished_basalt';
      return arMezcla([['minecraft:polished_blackstone_bricks', 5], ['minecraft:cracked_polished_blackstone_bricks', 2], ['minecraft:blackstone', 1]], dx, 0, dz);
    },
    muro: (x, y, z) => arMezcla([['minecraft:polished_blackstone_bricks', 4], ['minecraft:blackstone', 2], ['minecraft:gilded_blackstone', 0.3]], x, y, z),
    remate: 'minecraft:nether_brick_fence', grada: 'minecraft:nether_bricks', asiento: 'minecraft:nether_brick_slab[type=bottom]',
    exterior: (x, y, z) => arMezcla([['minecraft:polished_blackstone_bricks', 4], ['minecraft:cracked_polished_blackstone_bricks', 2]], x, y, z),
    pilar: (y) => 'minecraft:polished_basalt',
    almena: 'minecraft:blackstone_wall', luz: 'minecraft:shroomlight', farol: 'minecraft:soul_lantern',
    plaza: (dx, dz) => arMezcla([['minecraft:basalt', 2], ['minecraft:blackstone', 2], ['minecraft:magma_block', 0.15]], dx, 1, dz),
    reja: 'minecraft:iron_bars', cimiento: 'minecraft:blackstone'
  }
};

// ---------- Diseño: lista de bloques de una columna (y relativo al suelo; 0 = suelo) ----------
let AR_YMIN = -4, AR_YMAX = 24;
let arColumna = (T, dx, dz) => {
  let r = Math.sqrt(dx * dx + dz * dz);
  if (r > AR_TOTAL) return null;
  let ang = (Math.atan2(dz, dx) * 180 / Math.PI + 360) % 360;
  let col = {};
  let pon = (y0, y1, b) => { for (let y = y0; y <= y1; y++) col[y] = (typeof b === 'function') ? b(y) : b; };
  pon(AR_YMIN, -1, T.cimiento);
  pon(1, AR_YMAX, 'minecraft:air');
  let lat = Math.min(Math.abs(dx), Math.abs(dz));       // distancia al eje cardinal más cercano
  let tunel = lat <= 2 && r > AR_R - 0.5;
  let W = (x) => (y) => T.muro(dx, y, dz);

  if (r <= AR_R) {                                     // suelo de combate
    let b = T.suelo(dx, dz, r, ang);
    if (Math.abs(r - (AR_R - 3)) < 0.7 && arCerca(ang, 20, 2.2)) b = T.luz;
    if (Math.abs(r - 11) < 0.7 && arCerca(ang + 22.5, 45, 2.5)) b = T.luz;
    pon(0, 0, b);
  } else if (r <= AR_R + 1.5) {                        // muro interior (5 de alto) + remate
    pon(0, 5, W());
    pon(6, 6, arCerca(ang, 15, 1.5) ? T.farol : T.remate);
    if (tunel) { pon(1, 4, 'minecraft:air'); pon(5, 5, T.pilar(5)); pon(6, 6, T.almena); }
  } else if (r <= AR_R + 8.5) {                        // gradas
    let t = Math.min(6, Math.floor(r - (AR_R + 1.5)));
    let h = 5 + t;
    pon(0, h - 1, T.grada);
    pon(h, h, (t === 3 && arCerca(ang, 30, 1.6)) ? T.luz : T.asiento);
    if (tunel) { pon(1, 4, 'minecraft:air'); if (t === 3) pon(5, 5, T.luz); }
  } else if (r <= AR_R + 10) {                         // muro exterior con pilares y ventanas
    let pil = arCerca(ang, 15, 2.2);
    if (pil) {
      pon(0, 17, (y) => T.pilar(y));
      pon(18, 18, T.farol);
    } else {
      pon(0, 16, (y) => T.exterior(dx, y, dz));
      if (arCerca(ang + 7.5, 15, 2.2)) pon(13, 14, 'minecraft:air');   // ventanas
      pon(17, 17, Math.floor(ang / 3) % 2 === 0 ? T.almena : 'minecraft:air');
    }
    if (tunel) { pon(1, 4, 'minecraft:air'); pon(5, 6, T.pilar(4)); }
  } else {                                             // plaza exterior
    pon(0, 0, T.plaza(dx, dz));
    if (Math.abs(r - (AR_R + 11.5)) < 0.7 && arCerca(ang + 15, 30, 1.2) && !tunel) {
      pon(1, 2, T.almena); pon(3, 3, T.farol);
    }
    if (T.pinchos && !tunel && arHash(dx, 7, dz) < 0.035) {
      let alto = 3 + Math.floor(arHash(dx, 9, dz) * 6);
      pon(1, alto, T.pinchos);
    }
  }
  return col;
};

// Convierte el diseño en comandos fill (agrupa columnas iguales en filas)
let arComandos = (T, cx, Y, cz, rel) => {
  let t = rel ? '~' : '';
  let cmds = [];
  for (let dz = -AR_TOTAL; dz <= AR_TOTAL; dz++) {
    let prev = null, x0 = 0, prevKey = '';
    let flush = (xEnd) => {
      if (!prev) return;
      let ys = Object.keys(prev).map(Number).sort((a, b) => a - b);
      let i = 0;
      while (i < ys.length) {
        let j = i;
        while (j + 1 < ys.length && ys[j + 1] === ys[j] + 1 && prev[ys[j + 1]] === prev[ys[i]]) j++;
        cmds.push(`fill ${t}${cx + x0} ${t}${Y + ys[i]} ${t}${cz + dz} ${t}${cx + xEnd} ${t}${Y + ys[j]} ${t}${cz + dz} ${prev[ys[i]]}`);
        i = j + 1;
      }
    };
    for (let dx = -AR_TOTAL; dx <= AR_TOTAL + 1; dx++) {
      let col = dx <= AR_TOTAL ? arColumna(T, dx, dz) : null;
      let key = col ? JSON.stringify(col) : '';
      if (key !== prevKey) {
        flush(dx - 1);
        prev = col; prevKey = key; x0 = dx;
      }
    }
  }
  return cmds;
};
global.arComandos = arComandos;
global.AR_TEMAS = AR_TEMAS;

// ---------- Datos ----------
// Cada arena tiene un "ancla" (entidad marker invisible) en el centro, a la altura de los pies.
// Su chunk queda cargado siempre (forceload) para que los jefes puedan caer allí aunque no haya nadie.
let arLeer = (server) => {
  let s = server.persistentData.getString('starvios_arenas');
  try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; }
};
let arGuardar = (server, m) => server.persistentData.putString('starvios_arenas', JSON.stringify(m));
let arAncla = (n) => `@e[type=minecraft:marker,tag=st_arena_${n},limit=1]`;
let arOW = (server) => (c) => server.runCommandSilent(`execute in minecraft:overworld run ${c}`);
let arEnAncla = (server, n) => (c) => server.runCommandSilent(`execute in minecraft:overworld at ${arAncla(n)} run ${c}`);

// Arena del jefe -> texto para "execute ... run summon" (lo usa 30_eliminacion)
global.stArenaDeJefe = (server, jefe) => {
  let i = global.STARVIOS.jefes.indexOf(jefe);
  let n = (jefe && jefe.arena) || AR_JEFE_A_ARENA[i] || 1;
  return arLeer(server)[String(n)] ? `in minecraft:overworld at ${arAncla(n)}` : null;
};

let arEnZona = (server, x, y, z) => {
  let m = arLeer(server);
  for (let k in m) {
    let dx = x - m[k].x, dz = z - m[k].z;
    if (dx * dx + dz * dz <= (AR_TOTAL + 1) * (AR_TOTAL + 1)) return true;
  }
  return false;
};
global.stEnArena = arEnZona;

// ---------- Sitio automático: esquinas del mundo (dentro del borde), lejos de todo ----------
let arSitioAuto = (server, n) => {
  let cx = global.STARVIOS.spawn.x, cz = global.STARVIOS.spawn.z, mitad = 0;
  try {
    let wb = server.overworld().getWorldBorder();
    cx = Math.round(wb.getCenterX()); cz = Math.round(wb.getCenterZ()); mitad = wb.getSize() / 2;
  } catch (e) {}
  let cfg = global.STARVIOS.arenas || {};
  let d;
  if (cfg.distancia) d = cfg.distancia;                        // fija en la config
  else if (mitad > 0 && mitad < 100000) d = Math.floor(mitad - 250);   // junto al borde del mundo, por dentro
  else d = 3000;
  let esq = [[1, -1], [-1, -1], [-1, 1], [1, 1]][n - 1];       // 1 NE, 2 NO, 3 SO, 4 SE
  return { x: Number(cx) + esq[0] * Number(d), z: Number(cz) + esq[1] * Number(d) };
};

// ---------- Construcción por tandas ----------
// donde = { jugador: 'Nombre' }  o  { x, z } (busca el suelo solo)
let arConstruir = (server, n, donde, avisar) => {
  if (global.stConstruyendoArena) { avisar('§cYa se está construyendo una arena, espera.'); return; }
  global.stConstruyendoArena = true;
  let T = AR_TEMAS[n], ow = arOW(server), en = arEnAncla(server, n);
  let m = arLeer(server), vieja = m[String(n)];

  let x, z, espera;
  if (donde.jugador) {
    let pos = global.stXYZ(server.getPlayer(donde.jugador));
    x = Math.floor(pos.x); z = Math.floor(pos.z); espera = 20;
  } else { x = donde.x; z = donde.z; espera = 200; }   // chunks lejanos: hay que generarlos
  let a = AR_TOTAL + 2;

  // Quitar el ancla anterior de esta arena
  if (vieja) {
    ow(`forceload add ${vieja.x} ${vieja.z}`);
    server.scheduleInTicks(5, () => { ow(`kill ${arAncla(n)}`); if (vieja.x !== x || vieja.z !== z) ow(`forceload remove ${vieja.x} ${vieja.z}`); });
  }
  ow(`forceload add ${x - a} ${z - a} ${x + a} ${z + a}`);
  avisar(`§6[Starvios] Preparando ${T.nombre} en X: ${x} Z: ${z}... (${Math.round(espera / 20) + 5} s aprox.)`);

  server.scheduleInTicks(espera, () => {
    if (donde.jugador) ow(`execute at ${donde.jugador} align xyz positioned ~0.5 ~ ~0.5 run summon minecraft:marker ~ ~ ~ {Tags:["st_arena","st_arena_${n}"]}`);
    else ow(`execute positioned ${x} 0 ${z} positioned over motion_blocking_no_leaves align xyz positioned ~0.5 ~ ~0.5 run summon minecraft:marker ~ ~ ~ {Tags:["st_arena","st_arena_${n}"]}`);
    // el suelo de la arena queda justo bajo el ancla (y relativo -1)
    let cmds = arComandos(T, 0, -1, 0, true);
    en(`kill @e[type=item,distance=..60]`);
    let POR_TICK = 250, tandas = Math.ceil(cmds.length / POR_TICK);
    for (let t = 0; t < tandas; t++) {
      let trozo = cmds.slice(t * POR_TICK, (t + 1) * POR_TICK);
      server.scheduleInTicks(5 + t, () => trozo.forEach(en));
    }
    server.scheduleInTicks(5 + tandas + 5, () => {
      en(`kill @e[type=item,distance=..60]`);
      ow(`forceload remove ${x - a} ${z - a} ${x + a} ${z + a}`);
      ow(`forceload add ${x} ${z}`);                       // el centro siempre cargado (jefes)
      let mm = arLeer(server);
      mm[String(n)] = { x: x, z: z, nombre: T.nombre };
      arGuardar(server, mm);
      global.stConstruyendoArena = false;
      avisar(`§a[Starvios] ¡${T.nombre} lista en X: ${x} Z: ${z}! Usa /starvios arena tp ${n} para verla.`);
    });
  });
  // por si algo falla, no dejar bloqueado el constructor
  server.scheduleInTicks(espera + 400, () => { global.stConstruyendoArena = false; });
};

// Rejas de las 4 puertas
let arPuertas = (server, n, abrir) => {
  if (!arLeer(server)[String(n)]) return false;
  let T = AR_TEMAS[n], en = arEnAncla(server, n);
  let bloque = abrir ? 'minecraft:air' : T.reja, reemplazo = abrir ? T.reja : 'minecraft:air';
  let d = AR_R + 1;
  en(`fill ~${d} ~ ~-2 ~${d} ~3 ~2 ${bloque} replace ${reemplazo}`);
  en(`fill ~-${d} ~ ~-2 ~-${d} ~3 ~2 ${bloque} replace ${reemplazo}`);
  en(`fill ~-2 ~ ~${d} ~2 ~3 ~${d} ${bloque} replace ${reemplazo}`);
  en(`fill ~-2 ~ ~-${d} ~2 ~3 ~-${d} ${bloque} replace ${reemplazo}`);
  en(`playsound minecraft:block.iron_door.${abrir ? 'open' : 'close'} master @a[distance=..80] ~ ~ ~ 4 0.6`);
  return true;
};

// ---------- Protección ----------
// Solo se puede editar en modo CREATIVO (aunque seas OP, en supervivencia tampoco puedes romperla)
let arPuedeEditar = (p) => { try { return !!p && p.hasPermissions(2) && p.isCreative(); } catch (e) { return false; } };

BlockEvents.broken(event => {
  let p = event.player;
  if (arPuedeEditar(p)) return;
  let pos = global.stXYZ(event.block);
  if (pos && arEnZona(event.server, pos.x, pos.y, pos.z)) {
    event.server.runCommandSilent(`title ${p.getName().getString()} actionbar {"text":"🛡 La arena no se puede romper","color":"gold"}`);
    event.cancel();
  }
});

BlockEvents.placed(event => {
  let p = event.player;
  if (!p || arPuedeEditar(p)) return;
  let pos = global.stXYZ(event.block);
  if (pos && arEnZona(event.server, pos.x, pos.y, pos.z)) {
    event.server.runCommandSilent(`title ${p.getName().getString()} actionbar {"text":"🛡 No puedes construir en la arena","color":"gold"}`);
    event.cancel();
  }
});

LevelEvents.afterExplosion(event => { global.stSeguro('99_arenas (explosiones)', () => {
  let pos = global.stXYZ(event);
  if (!pos) return;
  let server = event.server || event.level.server;
  if (arEnZona(server, pos.x, pos.y, pos.z)) {
    try { event.removeAllAffectedBlocks(); } catch (e) { event.getAffectedBlocks().clear(); }
    return;
  }
  // Explosión fuera pero que alcanza la arena: se salvan solo los bloques de la arena
  let quitar = [];
  try {
    event.getAffectedBlocks().forEach(b => {
      let q = global.stXYZ(b);
      if (q && arEnZona(server, q.x, q.y, q.z)) quitar.push(b);
    });
    quitar.forEach(b => event.removeAffectedBlock(b));
  } catch (e) {}
}); });

// Los jefes (Cataclysm, Mowzie's) no rompen bloques mientras haya alguno vivo:
// mobGriefing se apaga durante la pelea y se vuelve a encender cuando no queda ninguno.
global.stArTick = 0;
ServerEvents.tick(event => { global.stSeguro('99_arenas (jefes sin romper)', () => {
  global.stArTick = (global.stArTick || 0) + 1;
  if (global.stArTick % 40 !== 0) return;
  let server = event.server;
  let hay = Number(server.runCommandSilent('execute if entity @e[tag=starvios_jefe]')) > 0;
  let d = server.persistentData;
  if (hay && !d.getBoolean('starvios_griefing_off')) {
    d.putBoolean('starvios_griefing_off', true);
    server.runCommandSilent('gamerule mobGriefing false');
  } else if (!hay && d.getBoolean('starvios_griefing_off')) {
    d.putBoolean('starvios_griefing_off', false);
    server.runCommandSilent('gamerule mobGriefing true');
  }
}); });

EntityEvents.checkSpawn(event => {
  let e = event.entity;
  if (!e || !e.isMonster()) return;
  let pos = global.stXYZ(e);
  if (pos && arEnZona(event.server || e.server, pos.x, pos.y, pos.z)) event.cancel();
});

// ---------- Comandos ----------
ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  let num = (ctx) => Arguments.INTEGER.getResult(ctx, 'n');
  let valida = (ctx, n) => { if (!AR_TEMAS[n]) { decir(ctx)('§cArena 1-4.'); return false; } return true; };

  let info = (ctx) => {
    let n = num(ctx), d = decir(ctx);
    if (!valida(ctx, n)) return 0;
    let s = arSitioAuto(ctx.source.server, n);
    d(`§6${AR_TEMAS[n].nombre}§7 ocupa unos ${AR_TOTAL * 2}x${AR_TOTAL * 2} bloques y §cborra todo§7 lo que haya en ${AR_TOTAL} bloques a la redonda.`);
    d(`§e/starvios arena construir ${n} lejos§7 → en la esquina del mundo: X: ${s.x} Z: ${s.z}`);
    d(`§e/starvios arena construir ${n} aqui§7 → centrada donde estás tú`);
    d(`§e/starvios arena construir ${n} en <x> <z>§7 → en esas coordenadas (busca el suelo sola)`);
    return 1;
  };
  let lejos = (ctx) => {
    let n = num(ctx); if (!valida(ctx, n)) return 0;
    arConstruir(ctx.source.server, n, arSitioAuto(ctx.source.server, n), decir(ctx)); return 1;
  };
  let aqui = (ctx) => {
    let n = num(ctx); if (!valida(ctx, n)) return 0;
    let p = ctx.source.player; if (!p) { decir(ctx)('Usa este comando dentro del juego.'); return 0; }
    arConstruir(ctx.source.server, n, { jugador: p.getName().getString() }, decir(ctx)); return 1;
  };
  let enXZ = (ctx) => {
    let n = num(ctx); if (!valida(ctx, n)) return 0;
    arConstruir(ctx.source.server, n, { x: Arguments.INTEGER.getResult(ctx, 'x'), z: Arguments.INTEGER.getResult(ctx, 'z') }, decir(ctx)); return 1;
  };

  let tp = (ctx, todos) => {
    let n = num(ctx), d = decir(ctx), server = ctx.source.server;
    if (!valida(ctx, n)) return 0;
    if (!arLeer(server)[String(n)]) { d(`§cLa arena ${n} aún no está construida.`); return 0; }
    let en = arEnAncla(server, n);
    if (todos) {
      let lista = []; server.players.forEach(p => lista.push(p.getName().getString()));
      lista.forEach((nm, i) => {
        let ang = (i / Math.max(lista.length, 1)) * Math.PI * 2, rr = AR_R - 5;
        en(`tp ${nm} ~${(Math.cos(ang) * rr).toFixed(1)} ~ ~${(Math.sin(ang) * rr).toFixed(1)} facing entity ${arAncla(n)}`);
      });
      server.runCommandSilent(`title @a times 10 50 20`);
      server.runCommandSilent(`title @a title {"text":"${AR_TEMAS[n].nombre}","color":"${AR_TEMAS[n].color}","bold":true}`);
      return 1;
    }
    let p = ctx.source.player; if (!p) return 0;
    en(`tp ${p.getName().getString()} ~ ~12 ~${AR_R + 5} facing entity ${arAncla(n)}`);
    return 1;
  };

  let N = () => Commands.argument('n', Arguments.INTEGER.create(event));
  let arenaNodo = Commands.literal('arena')
    .then(Commands.literal('construir').then(N().executes(info)
      .then(Commands.literal('lejos').executes(lejos))
      .then(Commands.literal('aqui').executes(aqui))
      .then(Commands.literal('en').then(Commands.argument('x', Arguments.INTEGER.create(event))
        .then(Commands.argument('z', Arguments.INTEGER.create(event)).executes(enXZ))))))
    .then(Commands.literal('tp').then(N().executes(ctx => tp(ctx, false))))
    .then(Commands.literal('llevar').then(N().executes(ctx => tp(ctx, true))))
    .then(Commands.literal('cerrar').then(N().executes(ctx => {
      let n = num(ctx); if (!valida(ctx, n)) return 0;
      if (!arPuertas(ctx.source.server, n, false)) { decir(ctx)('§cEsa arena no está construida.'); return 0; }
      decir(ctx)('§6Puertas cerradas.'); return 1;
    })))
    .then(Commands.literal('abrir').then(N().executes(ctx => {
      let n = num(ctx); if (!valida(ctx, n)) return 0;
      if (!arPuertas(ctx.source.server, n, true)) { decir(ctx)('§cEsa arena no está construida.'); return 0; }
      decir(ctx)('§6Puertas abiertas.'); return 1;
    })))
    .then(Commands.literal('lista').executes(ctx => {
      let m = arLeer(ctx.source.server), d = decir(ctx);
      d('§6── Arenas ──');
      [1, 2, 3, 4].forEach(n => {
        let a = m[String(n)];
        d(a ? `§e${n}. ${AR_TEMAS[n].nombre}§7 → X: ${a.x} Z: ${a.z}` : `§8${n}. ${AR_TEMAS[n].nombre} (sin construir)`);
      });
      return 1;
    }));

  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2)).then(arenaNodo));
});
