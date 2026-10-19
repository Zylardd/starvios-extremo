// priority: 150
// ============================================================
//  STARVIOS - CRIPTAS SUBTERRÁNEAS y MAZMORRAS-LABERINTO (mismo generador)
//  /starvios cripta          -> en un punto al azar
//  /starvios cripta aqui     -> la entrada donde estás tú (la cripta va hacia el ESTE)
//
//  Gran arco en superficie -> escalera ancha de ~24 bloques -> antesala ->
//  LABERINTO aleatorio (monstruos, generadores, telarañas) -> sala del trono
//  con un jefe de mod (Cataclysm) con barra de vida propia.
//  Al morir el jefe aparece su cofre de botín junto al trono.
// ============================================================

let CR = () => global.STARVIOS.criptas;
let crAzar = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

global.stCriptasActivas = global.stCriptasActivas || [];

// ---------- Laberinto (backtracking recursivo + algunos atajos) ----------
let crLaberinto = (N, entradaFila) => {
  // pasajes[x][z] = { e: abierto al este, s: abierto al sur }
  let pas = [], visto = [];
  for (let x = 0; x < N; x++) { pas.push([]); visto.push([]); for (let z = 0; z < N; z++) { pas[x].push({ e: false, s: false }); visto[x].push(false); } }
  let pila = [[0, entradaFila]];
  visto[0][entradaFila] = true;
  while (pila.length) {
    let c = pila[pila.length - 1], x = c[0], z = c[1];
    let vec = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => {
      let nx = x + d[0], nz = z + d[1];
      return nx >= 0 && nz >= 0 && nx < N && nz < N && !visto[nx][nz];
    });
    if (!vec.length) { pila.pop(); continue; }
    let d = vec[Math.floor(Math.random() * vec.length)];
    let nx = x + d[0], nz = z + d[1];
    if (d[0] === 1) pas[x][z].e = true; else if (d[0] === -1) pas[nx][nz].e = true;
    else if (d[1] === 1) pas[x][z].s = true; else pas[nx][nz].s = true;
    visto[nx][nz] = true;
    pila.push([nx, nz]);
  }
  // Atajos: abre algunas paredes extra para que haya más de un camino
  for (let k = 0; k < Math.floor(N * N * 0.15); k++) {
    let x = Math.floor(Math.random() * N), z = Math.floor(Math.random() * N);
    if (Math.random() < 0.5 && x < N - 1) pas[x][z].e = true; else if (z < N - 1) pas[x][z].s = true;
  }
  return pas;
};

// ---------- Temas: cripta (bajo tierra, jefe de mod) y mazmorra (fortaleza, Capitán) ----------
let crTema = (tipo) => {
  if (tipo === 'mazmorra') {
    let m = global.STARVIOS.mazmorras;
    let L = m.laberintoCfg || {};
    return {
      tipo: 'mazmorra', profundidad: L.profundidad || 3, laberinto: L.laberinto || 7,
      PARED: 'minecraft:stone_bricks', GRIETA: 'minecraft:mossy_stone_bricks', SUELO: 'minecraft:polished_andesite',
      TECHO: 'minecraft:dark_oak_planks', LUZ: 'minecraft:lantern[hanging=true]', ESCALON: 'minecraft:stone_brick_stairs[facing=west]',
      ARCO: 'minecraft:chiseled_stone_bricks', ARCO_TOP: 'minecraft:mossy_cobblestone', ARCO_MURO: 'minecraft:mossy_cobblestone_wall',
      FUEGO: 'minecraft:campfire[lit=true,signal_fire=true]', PILAR: 'minecraft:polished_andesite', TRONO: 'minecraft:chiseled_stone_bricks',
      ALFOMBRA: 'minecraft:red_wool',
      mobs: L.mobs || m.tiposGuardian, generadores: L.generadores || [],
      cantidadMobs: L.cantidadMobs || { base: 10, porDia: 0.8, maximo: 35 },
      probEliteMob: L.probEliteMob || { base: 0.25, porDia: 0.015, maximo: 0.6 }
    };
  }
  let c = CR();
  return {
    tipo: 'cripta', profundidad: c.profundidad, laberinto: c.laberinto,
    PARED: 'minecraft:deepslate_bricks', GRIETA: 'minecraft:cracked_deepslate_bricks', SUELO: 'minecraft:polished_deepslate',
    TECHO: 'minecraft:deepslate_tiles', LUZ: 'minecraft:soul_lantern[hanging=true]', ESCALON: 'minecraft:deepslate_brick_stairs[facing=west]',
    ARCO: 'minecraft:chiseled_deepslate', ARCO_TOP: 'minecraft:polished_blackstone_bricks', ARCO_MURO: 'minecraft:polished_blackstone_brick_wall',
    FUEGO: 'minecraft:soul_campfire[lit=true,signal_fire=true]', PILAR: 'minecraft:polished_blackstone_bricks', TRONO: 'minecraft:gilded_blackstone',
    ALFOMBRA: 'minecraft:red_nether_bricks',
    mobs: c.mobs, generadores: c.generadores, cantidadMobs: c.cantidadMobs, probEliteMob: c.probEliteMob
  };
};
// Medidas de la zona (desde la entrada hacia el este)
let crMedidas = (T) => {
  let S = T.laberinto * 4 + 1;
  return { S: S, largo: T.profundidad + 2 + S + 21 + 3, ancho: Math.max(Math.ceil(S / 2), 11) + 3 };
};

// ---------- Construcción ----------
// Todo se construye RELATIVO a un ancla invisible colocada en la superficie,
// así no hace falta conocer la altura del terreno.
// Superficie -> escalera -> antesala -> LABERINTO -> sala del trono con el jefe.
let crConstruir = (server, id, T) => {
  let A = `@e[tag=starvios_ancla_${id},limit=1]`;
  let en = (c) => server.runCommandSilent(`execute in minecraft:overworld at ${A} run ${c}`);
  let esMz = T.tipo === 'mazmorra';
  let D = T.profundidad;
  let F = -1 - D;                 // suelo (relativo)
  let N = T.laberinto;
  let PARED = T.PARED, SUELO = T.SUELO, TECHO = T.TECHO, LUZ = T.LUZ;

  // 1) Escalera ancha (5 bloques) y alta (4) desde la superficie
  for (let i = 0; i < D; i++) {
    let f = -1 - i;
    en(`fill ~${i} ~${f - 1} ~-3 ~${i} ~${f + 5} ~3 ${PARED}`);
    en(`fill ~${i} ~${f + 1} ~-2 ~${i} ~${f + 4} ~2 air`);
    en(`fill ~${i} ~${f} ~-2 ~${i} ~${f} ~2 ${T.ESCALON}`);
    if (i % 5 === 2) { en(`setblock ~${i} ~${f + 4} ~-2 ${LUZ}`); en(`setblock ~${i} ~${f + 4} ~2 ${LUZ}`); }
  }
  // Gran arco de entrada
  en(`fill ~-2 ~-1 ~-5 ~-1 ~6 ~-4 ${T.ARCO}`);
  en(`fill ~-2 ~-1 ~4 ~-1 ~6 ~5 ${T.ARCO}`);
  en(`fill ~-2 ~6 ~-5 ~-1 ~7 ~5 ${T.ARCO_TOP}`);
  en(`fill ~-2 ~8 ~-3 ~-1 ~8 ~3 ${T.ARCO_MURO}`);
  en(`fill ~-2 ~0 ~-3 ~-1 ~5 ~3 air`);
  en(`setblock ~-3 ~5 ~-4 ${LUZ}`);
  en(`setblock ~-3 ~5 ~4 ${LUZ}`);
  en(`setblock ~-3 ~6 ~-4 ${T.ARCO_MURO}`);
  en(`setblock ~-3 ~6 ~4 ${T.ARCO_MURO}`);
  en(`setblock ~-4 ~-1 ~-6 minecraft:hay_block`);
  en(`setblock ~-4 ~0 ~-6 ${T.FUEGO}`);
  en(`setblock ~-4 ~-1 ~6 minecraft:hay_block`);
  en(`setblock ~-4 ~0 ~6 ${T.FUEGO}`);

  // 2) Antesala
  let MX0 = D + 2;
  en(`fill ~${D - 1} ~${F} ~-3 ~${MX0} ~${F + 5} ~3 ${PARED} hollow`);
  en(`fill ~${D} ~${F} ~-2 ~${MX0 - 1} ~${F} ~2 ${SUELO}`);
  en(`fill ~${D - 1} ~${F + 2} ~-2 ~${D - 1} ~${F + 5} ~2 air`);
  if (D === 0) en(`fill ~-1 ~${F + 1} ~-2 ~${MX0 - 1} ~${F + 4} ~2 air`);

  // 3) Laberinto: N x N celdas de 3x3, paredes de 1, altura 4
  let S = N * 4 + 1, Z0 = -Math.floor(S / 2);
  let fila = Math.floor(N / 2);
  en(`fill ~${MX0} ~${F} ~${Z0} ~${MX0 + S - 1} ~${F + 5} ~${Z0 + S - 1} ${PARED}`);
  en(`fill ~${MX0} ~${F} ~${Z0} ~${MX0 + S - 1} ~${F} ~${Z0 + S - 1} ${SUELO}`);
  en(`fill ~${MX0} ~${F + 5} ~${Z0} ~${MX0 + S - 1} ~${F + 5} ~${Z0 + S - 1} ${TECHO}`);
  let pas = crLaberinto(N, fila);
  let celdaX = (cx) => MX0 + 1 + cx * 4;
  let celdaZ = (cz) => Z0 + 1 + cz * 4;
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    let x = celdaX(cx), z = celdaZ(cz);
    en(`fill ~${x} ~${F + 1} ~${z} ~${x + 2} ~${F + 4} ~${z + 2} air`);
    if (pas[cx][cz].e) en(`fill ~${x + 3} ~${F + 1} ~${z} ~${x + 3} ~${F + 4} ~${z + 2} air`);
    if (pas[cx][cz].s) en(`fill ~${x} ~${F + 1} ~${z + 3} ~${x + 2} ~${F + 4} ~${z + 3} air`);
  }
  let zE = celdaZ(fila);
  en(`fill ~${MX0 - 1} ~${F + 1} ~-2 ~${MX0 - 1} ~${F + 4} ~2 air`);
  en(`fill ~${MX0} ~${F + 1} ~${zE} ~${MX0} ~${F + 4} ~${zE + 2} air`);
  en(`fill ~${MX0} ~${F + 1} ~-2 ~${MX0} ~${F + 4} ~2 air`);
  for (let k = 0; k < S * 2; k++) {
    en(`setblock ~${MX0 + crAzar(0, S - 1)} ~${F + crAzar(1, 4)} ~${Z0 + crAzar(0, S - 1)} ${T.GRIETA} replace ${PARED}`);
  }
  for (let k = 0; k < N * 2; k++) {
    let x = celdaX(crAzar(0, N - 1)) + 1, z = celdaZ(crAzar(0, N - 1)) + 1;
    en(`setblock ~${x} ~${F + 4} ~${z} ${LUZ}`);
  }
  for (let k = 0; k < N * 2; k++) {
    let x = celdaX(crAzar(1, N - 1)) + crAzar(0, 2), z = celdaZ(crAzar(0, N - 1)) + crAzar(0, 2);
    en(`setblock ~${x} ~${F + crAzar(2, 4)} ~${z} minecraft:cobweb`);
  }
  let celdaAzar = () => [crAzar(1, N - 1), crAzar(0, N - 1)];
  T.generadores.forEach(mob => {
    let q = celdaAzar();
    en(`setblock ~${celdaX(q[0]) + 1} ~${F + 1} ~${celdaZ(q[1]) + 1} minecraft:spawner{SpawnData:{entity:{id:"${mob}"}},SpawnCount:2,MaxNearbyEntities:6,MinSpawnDelay:200,MaxSpawnDelay:500,RequiredPlayerRange:10}`);
  });
  // Monstruos (cantidad y fuerza según el día)
  let dia = Math.max(1, global.stDiaGuardado(server));
  let cm = T.cantidadMobs, pe = T.probEliteMob;
  let total = Math.min(cm.maximo, Math.round(cm.base + cm.porDia * dia));
  let pElite = Math.min(pe.maximo, pe.base + pe.porDia * dia);
  let marca = esMz ? `"mz_${id}"` : '"starvios_cripta_mob"';
  for (let k = 0; k < total; k++) {
    let q = celdaAzar(), mob = T.mobs[Math.floor(Math.random() * T.mobs.length)];
    let tags = Math.random() < pElite ? `${marca},"starvios_cm_elite"` : marca;
    en(`summon ${mob} ~${celdaX(q[0]) + crAzar(0, 2)} ~${F + 1} ~${celdaZ(q[1]) + crAzar(0, 2)} {PersistenceRequired:1b,Tags:[${tags}]}`);
  }
  T.mobs.filter((m, i) => T.mobs.indexOf(m) === i).forEach(tipo => {
    global.stHacerEliteSel(server, `@e[tag=starvios_cm_elite,type=${tipo}]`, tipo);
  });
  server.runCommandSilent(`tag @e[tag=starvios_cm_elite] remove starvios_cm_elite`);

  // 4) Sala del trono
  let BX0 = MX0 + S;
  let BL = 21, BZ = 10, BH = 9;
  en(`fill ~${BX0 - 1} ~${F} ~${-BZ - 1} ~${BX0 + BL} ~${F + BH + 1} ~${BZ + 1} ${PARED} hollow`);
  en(`fill ~${BX0} ~${F} ~${-BZ} ~${BX0 + BL - 1} ~${F} ~${BZ} ${SUELO}`);
  en(`fill ~${BX0} ~${F + BH + 1} ~${-BZ} ~${BX0 + BL - 1} ~${F + BH + 1} ~${BZ} ${TECHO}`);
  en(`fill ~${BX0 - 1} ~${F + 1} ~${zE} ~${BX0 - 1} ~${F + 4} ~${zE + 2} air`);
  en(`fill ~${BX0 - 2} ~${F + 1} ~${zE} ~${BX0 - 2} ~${F + 4} ~${zE + 2} air`);
  [[4, -6], [4, 5], [14, -6], [14, 5]].forEach(p => {
    en(`fill ~${BX0 + p[0]} ~${F + 1} ~${p[1]} ~${BX0 + p[0] + 1} ~${F + BH} ~${p[1] + 1} ${T.PILAR}`);
    en(`setblock ~${BX0 + p[0]} ~${F + BH} ~${p[1] - 1} ${LUZ}`);
  });
  en(`fill ~${BX0 + BL - 3} ~${F + 1} ~-3 ~${BX0 + BL - 1} ~${F + 1} ~3 ${T.PILAR}`);
  en(`fill ~${BX0 + BL - 1} ~${F + 2} ~-1 ~${BX0 + BL - 1} ~${F + 6} ~1 ${T.TRONO}`);
  en(`fill ~${BX0} ~${F} ~-1 ~${BX0 + BL - 1} ~${F} ~1 ${T.ALFOMBRA}`);
  for (let k = 0; k < 6; k++) en(`setblock ~${BX0 + crAzar(1, BL - 2)} ~${F + BH} ~${crAzar(-BZ + 1, BZ - 1)} ${LUZ}`);
  let jx = BX0 + Math.floor(BL / 2);

  // 5a) MAZMORRA: el Capitán espera en la sala del trono (suelta el cofre al morir)
  if (esMz) {
    let mz = global.STARVIOS.mazmorras;
    let cap = mz.capitan || { vidaExtra: 3, nombre: 'Capitán de la mazmorra' };
    en(`summon minecraft:vindicator ~${jx} ~${F + 1} ~0 {Tags:["starvios_capitan_nuevo","mz_${id}"],PersistenceRequired:1b}`);
    // Escolta del capitán
    let escolta = mz.escoltaCapitan || 3;
    for (let k = 0; k < escolta; k++) {
      en(`summon ${T.mobs[Math.floor(Math.random() * T.mobs.length)]} ~${jx - 3} ~${F + 1} ~${crAzar(-5, 5)} {PersistenceRequired:1b,Tags:["mz_${id}","starvios_cm_elite"]}`);
    }
    T.mobs.filter((m, i) => T.mobs.indexOf(m) === i).forEach(tipo => global.stHacerEliteSel(server, `@e[tag=starvios_cm_elite,type=${tipo}]`, tipo));
    server.runCommandSilent(`tag @e[tag=starvios_cm_elite] remove starvios_cm_elite`);
    let capSel = '@e[tag=starvios_capitan_nuevo]';
    global.stHacerEliteSel(server, capSel, 'minecraft:vindicator');
    let as = (k) => server.runCommandSilent(`execute as ${capSel} run ${k}`);
    as(`attribute @s minecraft:generic.max_health modifier add 5a7c1e00-0000-4000-8000-0000000000c1 starvios_capitan ${(cap.vidaExtra - 1).toFixed(2)} multiply`);
    as(`data merge entity @s {Health:100000f,CustomName:'{"text":"♛ ${cap.nombre}","color":"gold","bold":true}'}`);
    as(`item replace entity @s weapon.mainhand with minecraft:netherite_axe{Enchantments:[{id:"minecraft:sharpness",lvl:3s}]}`);
    as(`effect give @s minecraft:glowing infinite 0 true`);
    as(`tag @s add starvios_capitan`);
    server.runCommandSilent(`tag ${capSel} remove starvios_capitan_nuevo`);
    server.runCommandSilent(`execute as @e[tag=mz_${id}] run attribute @s minecraft:generic.follow_range base set 32`);
    server.runCommandSilent(`execute as @e[tag=mz_${id}] run data modify entity @s ForgeData.st_casa set from entity @s Pos`);
    server.runCommandSilent(`kill @e[tag=starvios_ancla_${id}]`);
    return { nombre: cap.nombre, guardianes: total + escolta };
  }

  // 5b) CRIPTA: jefe de mod (con respaldo vanilla)
  let c = CR();
  en(`summon minecraft:armor_stand ~${BX0 + BL - 2} ~${F + 2} ~0 {Tags:["starvios_cripta_cofre","cripta_${id}"],Invisible:1b,Marker:1b,NoGravity:1b,Invulnerable:1b}`);
  let tags = `Tags:["starvios_cripta_jefe","cripta_${id}"],PersistenceRequired:1b`;
  let sel = `@e[tag=starvios_cripta_jefe,tag=cripta_${id}]`;
  let elegido = null;
  let candidatos = c.jefes.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < candidatos.length && !elegido; i++) {
    let j = candidatos[i];
    let nom = `'{"text":"☠ ${j.nombre}","color":"gold","bold":true}'`;
    let r = en(`summon ${j.id} ~${jx} ~${F + 1} ~0 {${tags},CustomName:${nom},CustomNameVisible:1b}`);
    if (r > 0) elegido = j;
  }
  if (elegido) {
    let as = (cmd) => server.runCommandSilent(`execute as ${sel} run ${cmd}`);
    as(`attribute @s minecraft:generic.max_health base set ${elegido.vida}`);
    as(`attribute @s minecraft:generic.attack_damage base set ${elegido.daño}`);
    as(`attribute @s minecraft:generic.armor base set ${elegido.armadura}`);
    as(`attribute @s minecraft:generic.knockback_resistance base set 1`);
    as(`data merge entity @s {Health:100000f}`);
  } else {
    let j = c.jefeRespaldo; elegido = j;
    let nom = `'{"text":"☠ ${j.nombre}","color":"gold","bold":true}'`;
    let attrs = `[{Name:"minecraft:generic.max_health",Base:${j.vida}},{Name:"minecraft:generic.attack_damage",Base:${j.daño}},` +
      `{Name:"minecraft:generic.armor",Base:${j.armadura}},{Name:"minecraft:generic.knockback_resistance",Base:0.8}]`;
    let ench = '{Enchantments:[{id:"minecraft:protection",lvl:3s}]}';
    en(`summon ${j.id} ~${jx} ~${F + 1} ~0 {${tags},CustomName:${nom},CustomNameVisible:1b,Attributes:${attrs},Health:${j.vida}f,` +
      `HandItems:[{id:"${j.arma}",Count:1b},{}],HandDropChances:[0f,0f],` +
      `ArmorItems:[{id:"minecraft:netherite_boots",Count:1b,tag:${ench}},{id:"minecraft:netherite_leggings",Count:1b,tag:${ench}},` +
      `{id:"minecraft:netherite_chestplate",Count:1b,tag:${ench}},{id:"minecraft:netherite_helmet",Count:1b,tag:${ench}}],ArmorDropChances:[0f,0f,0f,0f]}`);
  }
  let nombreJ = `{"text":"☠ ${elegido.nombre}","color":"gold","bold":true}`;
  server.runCommandSilent(`bossbar add starvios:cripta_${id} ${nombreJ}`);
  server.runCommandSilent(`bossbar set starvios:cripta_${id} color purple`);
  server.runCommandSilent(`bossbar set starvios:cripta_${id} max ${elegido.vida}`);
  server.runCommandSilent(`bossbar set starvios:cripta_${id} value ${elegido.vida}`);
  global.stCriptasActivas = global.stCriptasActivas.concat([String(id)]);
  server.runCommandSilent(`kill @e[tag=starvios_ancla_${id}]`);
  return { nombre: elegido.nombre, guardianes: total };
};

// ---------- Flujo: elegir punto -> cargar chunks -> ancla -> construir ----------
let CR_NOMBRES_MZ = ['Bastión Olvidado', 'Fortaleza del Capitán', 'Cuartel de los Saqueadores', 'Laberinto de Hierro',
  'Ciudadela Maldita', 'Fuerte de los Desterrados', 'Guarida del Tirano'];
let crEmpezar = (server, x, z, avisar, tipo) => {
  tipo = tipo || 'cripta';
  let T = crTema(tipo), M = crMedidas(T);
  let esMz = tipo === 'mazmorra';
  if (!isFinite(x) || !isFinite(z)) { avisar('§cCoordenadas inválidas.'); return; }
  if (global.stGenerandoCripta) { avisar('§cYa se está generando una cripta o mazmorra, espera unos segundos.'); return; }
  global.stGenerandoCripta = true;
  let id = String(Date.now() % 1000000);
  let ow = (c) => server.runCommandSilent(`execute in minecraft:overworld run ${c}`);
  let fl = `${x - 8} ${z - M.ancho} ${x + M.largo} ${z + M.ancho}`;
  ow(`forceload add ${fl}`);
  avisar(`§6[Starvios] ${esMz ? 'Levantando una mazmorra' : 'Excavando una cripta'} en X: ${x} Z: ${z}... (unos segundos)`);

  server.scheduleInTicks(100, () => {
    global.stSeguro('85_criptas (construir)', () => {
      ow(`summon minecraft:armor_stand ${x} 320 ${z} {Tags:["starvios_ancla_${id}"],Invisible:1b,Marker:1b,NoGravity:1b}`);
      ow(`spreadplayers ${x} ${z} 0 1 false @e[tag=starvios_ancla_${id}]`);
      for (let k = 0; k < 40; k++) {
        ow(`execute as @e[tag=starvios_ancla_${id}] at @s if block ~ ~-1 ~ #minecraft:leaves run tp @s ~ ~-1 ~`);
        ow(`execute as @e[tag=starvios_ancla_${id}] at @s if block ~ ~-1 ~ #minecraft:logs run tp @s ~ ~-1 ~`);
        ow(`execute as @e[tag=starvios_ancla_${id}] at @s if block ~ ~-1 ~ minecraft:air run tp @s ~ ~-1 ~`);
      }
      ow(`scoreboard players set #alto st_tmp 0`);
      ow(`execute store result score #alto st_tmp run data get entity @e[tag=starvios_ancla_${id},limit=1] Pos[1]`);
      let r = crConstruir(server, id, T);

      let lista = global.mzLista(server);
      if (esMz) {
        let nombre = CR_NOMBRES_MZ[Math.floor(Math.random() * CR_NOMBRES_MZ.length)];
        let cx = x + Math.round(M.largo / 2), radio = Math.round(M.largo / 2) + 12;
        lista.push({ nombre: nombre, x: x, z: z, dia: global.stDiaGuardado(server), id: id, laberinto: true,
                     cx: cx, cz: z, radio: radio, largo: M.largo, ancho: M.ancho });
        global.mzGuardar(server, lista);
        if (global.mzAnunciar) global.mzAnunciar(server, { nombre: nombre, x: x, z: z, guardianes: r.guardianes, capitan: r.nombre }, true);
      } else {
        lista.push({ nombre: 'Cripta', x: x, z: z, dia: global.stDiaGuardado(server), cripta: id, largo: M.largo, ancho: M.ancho });
        global.mzGuardar(server, lista);
        let s = global.STARVIOS.spawn;
        let dist = Math.round(Math.sqrt(Math.pow(x - s.x, 2) + Math.pow(z - s.z, 2)));
        let t = (c) => server.runCommandSilent(c);
        let jefeTxt = String(r.nombre).replace(/"/g, '\\"');
        t(`tellraw @a ["",{"text":"☠ ","color":"dark_purple"},{"text":"Se ha localizado una cripta en las coordenadas ","color":"light_purple"},` +
          `{"text":"X: ${x}  Y: ","color":"yellow"},{"score":{"name":"#alto","objective":"st_tmp"},"color":"yellow"},{"text":"  Z: ${z}","color":"yellow"}]`);
        t(`tellraw @a ["",{"text":"   ${dist} bloques al ${global.mzDireccion(x - s.x, z - s.z)} del spawn  ","color":"gray"},` +
          `{"text":"[Copiar]","color":"aqua","clickEvent":{"action":"copy_to_clipboard","value":"${x} ${z}"},"hoverEvent":{"action":"show_text","contents":"Copiar las coordenadas"}}]`);
        t(`tellraw @a ["",{"text":"   En lo más hondo de su laberinto aguarda ","color":"gray"},{"text":"${jefeTxt}","color":"gold","bold":true},` +
          `{"text":". Su tesoro aparecerá al caer. Busca el humo azul.","color":"gray"}]`);
        t(`execute as @a at @s run playsound minecraft:ambient.cave master @s ~ ~ ~ 0.6 0.6`);
      }
    });
    server.scheduleInTicks(60, () => ow(`forceload remove ${fl}`));
    global.stGenerandoCripta = false;
  });
  server.scheduleInTicks(1200, () => { global.stGenerandoCripta = false; });
};
global.crEmpezar = crEmpezar;

// ---------- Barra de vida del jefe: se actualiza cada segundo ----------
ServerEvents.tick(event => { global.stSeguro('85_criptas (barra)', () => {
  global.stCriptaTick = (global.stCriptaTick || 0) + 1;
  if (global.stCriptaTick % 20 !== 0) return;
  let server = event.server;
  global.stCriptasActivas.forEach(id => {
    let jefe = `@e[tag=starvios_cripta_jefe,tag=cripta_${id},limit=1]`;
    server.runCommandSilent(`execute store result bossbar starvios:cripta_${id} value run data get entity ${jefe} Health`);
    server.runCommandSilent(`bossbar set starvios:cripta_${id} players @a[tag=starvios_nadie]`);
    server.runCommandSilent(`execute in minecraft:overworld at ${jefe} run bossbar set starvios:cripta_${id} players @a[distance=..30]`);
  });
}); });

// ---------- Muerte del Señor de la Cripta: aparece el cofre ----------
let crItemsCofre = (killer) => {
  let c = CR().cofre, items = [], slot = 0;
  let frag = global.stItemsEspeciales.fragmento;
  items.push(`{Slot:${slot++}b,id:"${frag[0]}",Count:${crAzar(c.fragmentos[0], c.fragmentos[1])}b,tag:${frag[1]}}`);
  for (let i = 0; i < c.premios; i++) {
    let p = global.stPremioAleatorio();
    let tag = p.nbt ? `,tag:${p.nbt}` : '';
    items.push(`{Slot:${slot++ * 2}b,id:"${p.id}",Count:${crAzar(p.min, p.max)}b${tag}}`);
  }
  let t = global.STARVIOS.botinEspecial ? global.STARVIOS.botinEspecial.tiradas.cripta : 0;
  global.stBotinEspecial(t).forEach(it => {
    items.push(`{Slot:${18 + slot++}b,id:"${it.id}",Count:${it.cantidad}b}`);
  });
  return `[${items.join(',')}]`;
};

EntityEvents.death(event => { global.stSeguro('85_criptas (muerte)', () => {
  let e = event.entity;
  if (!e || e.isPlayer()) return;
  let tags = String(e.getTags());
  if (tags.indexOf('starvios_cripta_jefe') === -1) return;
  let m = tags.match(/cripta_(\d+)/);
  if (!m) return;
  let id = m[1];
  let server = e.server;
  let killer = event.source.player;
  let quien = killer ? killer.getName().getString() : 'Alguien';

  let cofre = `@e[tag=starvios_cripta_cofre,tag=cripta_${id},limit=1]`;
  let ow = (c) => server.runCommandSilent(`execute in minecraft:overworld at ${cofre} run ${c}`);
  ow(`setblock ~ ~ ~ minecraft:chest[facing=west]{CustomName:'{"text":"Tesoro de la Cripta","color":"gold","bold":true}',Items:${crItemsCofre(killer)}}`);
  ow(`particle minecraft:totem_of_undying ~ ~1 ~ 0.6 1 0.6 0.4 150 force`);
  ow(`playsound minecraft:ui.toast.challenge_complete master @a[distance=..40] ~ ~ ~ 1 1`);
  server.runCommandSilent(`kill ${cofre}`);
  server.runCommandSilent(`bossbar remove starvios:cripta_${id}`);
  global.stCriptasActivas = global.stCriptasActivas.filter(x => x !== id);

  // Monedas para el que lo mató
  if (killer && global.stDarDinero) global.stDarDinero(server, quien, CR().cofre.monedas, 'Señor de la Cripta');

  // Marcar la cripta como conquistada en /mazmorras
  let lista = global.mzLista(server);
  lista.forEach(d => { if (d.cripta === id) d.nombre = 'Cripta (conquistada)'; });
  global.mzGuardar(server, lista);

  server.runCommandSilent(`tellraw @a ["",{"text":"☠ ","color":"dark_purple"},{"text":"${quien}","color":"yellow"},{"text":" ha derrotado al Señor de la Cripta. Su tesoro aguarda junto al trono.","color":"gold"}]`);
}); });

// ---------- Comandos ----------
ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  let msg = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('cripta')
      .executes(ctx => {
        let server = ctx.source.server;
        let c = CR();
        // Reutiliza el buscador de tierra firme de las mazmorras, con las distancias de las criptas
        let m = global.STARVIOS.mazmorras;
        let antes = [m.distanciaMin, m.distanciaMax];
        m.distanciaMin = c.distanciaMin; m.distanciaMax = c.distanciaMax;
        let p = global.mzElegirPunto(server);
        m.distanciaMin = antes[0]; m.distanciaMax = antes[1];
        if (!p) { msg(ctx)('§cNo encontré tierra firme en el rango. Prueba otra vez.'); return 1; }
        crEmpezar(server, p.x, p.z, msg(ctx), 'cripta');
        return 1;
      })
      .then(Commands.literal('aqui').executes(ctx => {
        let pl = ctx.source.player;
        if (!pl) { msg(ctx)('Usa este comando dentro del juego.'); return 1; }
        let pos = global.stXYZ(pl);
        if (!pos) { msg(ctx)('§cNo pude leer tu posición.'); return 1; }
        crEmpezar(ctx.source.server, Math.floor(pos.x), Math.floor(pos.z), msg(ctx), 'cripta');
        return 1;
      })))
  );
});

// ---------- Generación automática de mazmorras y criptas ----------
global.stAutoTick = 0;
ServerEvents.tick(event => { global.stSeguro('85_criptas (automatico)', () => {
  global.stAutoTick = (global.stAutoTick || 0) + 1;
  if (global.stAutoTick % 1200 !== 0) return;          // se comprueba cada minuto
  let server = event.server;
  let au = global.STARVIOS.automatico;
  if (!au || !global.stActivo(server) || !server.players.length) return;
  let minuto = global.stAutoTick / 1200;
  let nada = () => {};
  if (au.mazmorraCadaMin > 0 && minuto % au.mazmorraCadaMin === 0) {
    server.runCommandSilent('starvios mazmorra');
  }
  if (au.criptaCadaMin > 0 && minuto % au.criptaCadaMin === 0) {
    server.scheduleInTicks(400, () => server.runCommandSilent('starvios cripta'));
  }
}); });

// ---------- Las criptas aguantan explosiones ----------
// Creepers, TNT o jefes: hacen daño a los jugadores, pero NO rompen bloques
// en toda la zona de una cripta (escalera, laberinto, sala del trono y la superficie encima).
let crEnCripta = (server, px, pz) => {
  let M = crMedidas(crTema('cripta'));
  let lista = global.mzLista(server);
  for (let i = 0; i < lista.length; i++) {
    let m = lista[i];
    if (!m.cripta && !m.laberinto) continue;
    let largo = m.largo || M.largo, ancho = m.ancho || M.ancho;
    if (px >= m.x - 8 && px <= m.x + largo && Math.abs(pz - m.z) <= ancho) return true;
  }
  return false;
};
global.stEnCripta = crEnCripta;

LevelEvents.afterExplosion(event => { global.stSeguro('85_criptas (explosiones)', () => {
  let pos = global.stXYZ(event);
  if (!pos) return;
  let dim = '';
  try { dim = String(global.stDimDe(event)); } catch (e) {}
  if (dim && dim.indexOf('overworld') === -1) return;
  let server = event.server || event.level.server;
  if (!crEnCripta(server, pos.x, pos.z)) return;
  try { event.removeAllAffectedBlocks(); }
  catch (e) { event.getAffectedBlocks().clear(); }
}); });

// ---------- Dentro de las criptas: no se rompe ni se construye (salvo OP) ----------
let crPuedeEditar = (p) => p && p.hasPermissions(2);
let crAvisar = (p, txt) => p.server.runCommandSilent(`title ${p.getName().getString()} actionbar {"text":"☠ ${txt}","color":"dark_purple"}`);

BlockEvents.broken(event => {
  let p = event.player;
  if (!p || crPuedeEditar(p)) return;
  let pos = global.stXYZ(event.block);
  if (pos && crEnCripta(event.server, pos.x, pos.z)) { crAvisar(p, 'Los muros de la cripta no ceden'); event.cancel(); }
});

BlockEvents.placed(event => {
  let p = event.player;
  if (!p || crPuedeEditar(p)) return;
  let pos = global.stXYZ(event.block);
  if (pos && crEnCripta(event.server, pos.x, pos.z)) { crAvisar(p, 'No puedes construir dentro de la cripta'); event.cancel(); }
});

// ---------- Dentro de las criptas: TODOS los monstruos van a por los jugadores ----------
// Cada segundo, cada monstruo dentro de una cripta persigue al jugador más cercano que también esté dentro.
ServerEvents.tick(event => { global.stSeguro('85_criptas (foco)', () => {
  global.stCrFocoTick = (global.stCrFocoTick || 0) + 1;
  if (global.stCrFocoTick % 20 !== 0) return;
  let server = event.server;
  if (!global.mzLista(server).some(m => m.cripta || m.laberinto)) return;
  let dentro = [];
  server.players.forEach(p => {
    try { if (p.isSpectator() || p.isCreative()) return; } catch (e) {}
    let pos = global.stXYZ(p);
    if (pos && String(global.stDimDe(p)).indexOf('overworld') !== -1 && crEnCripta(server, pos.x, pos.z)) dentro.push({ p: p, pos: pos });
  });
  if (!dentro.length) return;
  let level = server.getLevel('minecraft:overworld');
  if (!level) return;
  level.getEntities().forEach(e => {
    try {
      if (e.isPlayer() || !e.isMonster()) return;
      let q = global.stXYZ(e);
      if (!q || !crEnCripta(server, q.x, q.z)) return;
      let mejor = null, dMin = 48 * 48;
      for (let k = 0; k < dentro.length; k++) {      // bucle normal: sin funciones anidadas
        let j = dentro[k];
        let d = Math.pow(j.pos.x - q.x, 2) + Math.pow(j.pos.y - q.y, 2) + Math.pow(j.pos.z - q.z, 2);
        if (d < dMin) { dMin = d; mejor = j.p; }
      }
      if (!mejor) return;
      if (String(e.getTags()).indexOf('st_cr_foco') === -1) {
        global.stComoEntidad(e)('attribute @s minecraft:generic.follow_range base set 48');
        global.stComoEntidad(e)('tag @s add st_cr_foco');
      }
      e.setTarget(mejor);
    } catch (err) {}
  });
}); });
