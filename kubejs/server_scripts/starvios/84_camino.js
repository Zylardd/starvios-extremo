// priority: 0
// ============================================================
//  STARVIOS - CAMINO DEL TIRANO (laberinto de 3 pisos antes de cada jefe)
//
//  /starvios camino construir <1-5>   -> lo construye con la ENTRADA donde estás (va hacia el ESTE, bajo tierra)
//  /starvios camino abrir <1-5>       -> abre la reja de entrada, llena los pisos de monstruos y lo anuncia
//  /starvios camino tp <1-5>          -> te lleva a la entrada
//  /starvios camino lista             -> los construidos
//  /starvios camino borrar <1-5>      -> lo olvida y quita sus monstruos (el terreno se regenera con /starvios estructuras)
//
//  Cada piso: laberinto de 11x11 celdas (45x45 bloques) lleno de monstruos y generadores
//  -> Sala del Guardián. Al matar al Guardián se abre su PORTAL: pisarlo te lleva al piso siguiente.
//  El portal del último piso lleva a la ARENA del jefe; cuando llega el primero, el jefe aparece a los 30 s.
//  Duración pensada: 45-60 minutos.
// ============================================================

let CAM_PISOS = 3;        // pisos
let CAM_N = 11;           // celdas por lado del laberinto (11 -> 45x45 bloques)
let CAM_D = 16;           // escalones desde la superficie hasta el piso 1
let CAM_H = 13;           // separación vertical entre pisos
let CAM_AUTOJEFE = true;  // al llegar el primero a la arena, invocar al jefe solo (30 s después)
let CAM_SEG_JEFE = 30;

let CAM_TEMAS = {
  1: { nombre: 'Minas del Coloso', color: 'gray',
       PARED: 'minecraft:stone_bricks', GRIETA: 'minecraft:cracked_stone_bricks', SUELO: 'minecraft:polished_andesite',
       TECHO: 'minecraft:smooth_stone', LUZ: 'minecraft:lantern[hanging=true]', ESCALON: 'minecraft:stone_brick_stairs[facing=west]',
       ARCO: 'minecraft:chiseled_stone_bricks', ARCO_TOP: 'minecraft:iron_block', ARCO_MURO: 'minecraft:cobblestone_wall',
       FUEGO: 'minecraft:campfire[lit=true,signal_fire=true]', PILAR: 'minecraft:polished_andesite', REJA: 'minecraft:iron_bars',
       mobs: ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:vindicator', 'minecraft:spider', 'minecraft:zombie', 'minecraft:pillager'],
       generadores: ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider'], capitan: 'minecraft:vindicator' },
  2: { nombre: 'Grutas de Escarcha', color: 'aqua',
       PARED: 'minecraft:packed_ice', GRIETA: 'minecraft:blue_ice', SUELO: 'minecraft:snow_block',
       TECHO: 'minecraft:packed_ice', LUZ: 'minecraft:soul_lantern[hanging=true]', ESCALON: 'minecraft:spruce_stairs[facing=west]',
       ARCO: 'minecraft:blue_ice', ARCO_TOP: 'minecraft:packed_ice', ARCO_MURO: 'minecraft:spruce_fence',
       FUEGO: 'minecraft:soul_campfire[lit=true,signal_fire=true]', PILAR: 'minecraft:blue_ice', REJA: 'minecraft:iron_bars',
       mobs: ['minecraft:stray', 'minecraft:stray', 'minecraft:skeleton', 'minecraft:zombie', 'minecraft:spider', 'minecraft:vindicator'],
       generadores: ['minecraft:stray', 'minecraft:skeleton', 'minecraft:spider'], capitan: 'minecraft:stray' },
  3: { nombre: 'Catacumbas del Sol', color: 'gold',
       PARED: 'minecraft:cut_red_sandstone', GRIETA: 'minecraft:chiseled_red_sandstone', SUELO: 'minecraft:orange_terracotta',
       TECHO: 'minecraft:smooth_red_sandstone', LUZ: 'minecraft:lantern[hanging=true]', ESCALON: 'minecraft:red_sandstone_stairs[facing=west]',
       ARCO: 'minecraft:chiseled_red_sandstone', ARCO_TOP: 'minecraft:gold_block', ARCO_MURO: 'minecraft:red_sandstone_wall',
       FUEGO: 'minecraft:campfire[lit=true,signal_fire=true]', PILAR: 'minecraft:smooth_red_sandstone', REJA: 'minecraft:iron_bars',
       mobs: ['minecraft:husk', 'minecraft:husk', 'minecraft:skeleton', 'minecraft:spider', 'minecraft:cave_spider', 'mowziesmobs:barakoa'],
       generadores: ['minecraft:husk', 'minecraft:cave_spider', 'minecraft:skeleton'], capitan: 'minecraft:husk' },
  4: { nombre: 'Fauces del Inframundo', color: 'dark_red',
       PARED: 'minecraft:polished_blackstone_bricks', GRIETA: 'minecraft:cracked_polished_blackstone_bricks', SUELO: 'minecraft:blackstone',
       TECHO: 'minecraft:nether_bricks', LUZ: 'minecraft:soul_lantern[hanging=true]', ESCALON: 'minecraft:blackstone_stairs[facing=west]',
       ARCO: 'minecraft:gilded_blackstone', ARCO_TOP: 'minecraft:magma_block', ARCO_MURO: 'minecraft:blackstone_wall',
       FUEGO: 'minecraft:soul_campfire[lit=true,signal_fire=true]', PILAR: 'minecraft:basalt', REJA: 'minecraft:iron_bars',
       mobs: ['minecraft:wither_skeleton', 'minecraft:wither_skeleton', 'minecraft:blaze', 'minecraft:magma_cube', 'minecraft:skeleton', 'minecraft:husk'],
       generadores: ['minecraft:blaze', 'minecraft:magma_cube', 'minecraft:wither_skeleton'], capitan: 'minecraft:wither_skeleton' }
};
CAM_TEMAS[5] = {};
Object.keys(CAM_TEMAS[4]).forEach(k => { CAM_TEMAS[5][k] = CAM_TEMAS[4][k]; });
CAM_TEMAS[5].nombre = 'Abismo de Ignis'; CAM_TEMAS[5].color = 'red'; CAM_TEMAS[5].SUELO = 'minecraft:magma_block';

let camAzar = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
let camLeer = (server) => { try { return JSON.parse(server.persistentData.getString('starvios_caminos') || '{}'); } catch (e) { return {}; } };
let camGuardar = (server, m) => server.persistentData.putString('starvios_caminos', JSON.stringify(m));

// Medidas (relativas al ancla, que está en la superficie, en la entrada)
let camMedidas = () => {
  let S = CAM_N * 4 + 1, MX0 = CAM_D + 2;
  let BX0 = MX0 + S, BL = 21;
  return { S: S, MX0: MX0, BX0: BX0, BL: BL, BZ: 10, BH: 9, Z0: -Math.floor(S / 2), largo: BX0 + BL + 3, ancho: Math.ceil(S / 2) + 3 };
};
let camF = (k) => -1 - CAM_D - (k - 1) * CAM_H;                 // suelo del piso k (relativo)
let camAncla = (n) => `@e[type=minecraft:marker,tag=st_cam_${n}_a,limit=1]`;
let camMarca = (n, t) => `@e[type=minecraft:marker,tag=st_cam_${n}_${t},limit=1]`;
let camOW = (server) => (c) => server.runCommandSilent(`execute in minecraft:overworld run ${c}`);

// ---------- Construcción de un piso ----------
let camPiso = (en, T, M, n, k) => {
  let F = camF(k), S = M.S, MX0 = M.MX0, BX0 = M.BX0, BL = M.BL, BZ = M.BZ, BH = M.BH, Z0 = M.Z0;
  let PARED = T.PARED, LUZ = T.LUZ;
  // 0) Coraza maciza (tapa cuevas y lava) por capas
  for (let y = F - 1; y <= F + 11; y += 4) {
    let y2 = Math.min(y + 3, F + 11);
    en(`fill ~${MX0 - 6} ~${y} ~${Z0 - 1} ~${BX0 + BL + 1} ~${y2} ~${-Z0 + 1} ${PARED}`);
  }
  // 1) Antesala (piso 1: la escalera llega aquí)
  let AX = k === 1 ? CAM_D - 1 : MX0 - 5;
  en(`fill ~${AX} ~${F} ~-3 ~${MX0} ~${F + 5} ~3 ${PARED} hollow`);
  en(`fill ~${AX + 1} ~${F} ~-2 ~${MX0 - 1} ~${F} ~2 ${T.SUELO}`);
  en(`setblock ~${AX + 2} ~${F + 4} ~-2 ${LUZ}`); en(`setblock ~${AX + 2} ~${F + 4} ~2 ${LUZ}`);
  // 2) Laberinto
  en(`fill ~${MX0} ~${F} ~${Z0} ~${MX0 + S - 1} ~${F} ~${Z0 + S - 1} ${T.SUELO}`);
  en(`fill ~${MX0} ~${F + 5} ~${Z0} ~${MX0 + S - 1} ~${F + 5} ~${Z0 + S - 1} ${T.TECHO}`);
  let fila = Math.floor(CAM_N / 2);
  let pas = global.crLaberinto(CAM_N, fila);
  let cX = (cx) => MX0 + 1 + cx * 4, cZ = (cz) => Z0 + 1 + cz * 4;
  for (let cx = 0; cx < CAM_N; cx++) for (let cz = 0; cz < CAM_N; cz++) {
    let x = cX(cx), z = cZ(cz);
    en(`fill ~${x} ~${F + 1} ~${z} ~${x + 2} ~${F + 4} ~${z + 2} air`);
    if (pas[cx][cz].e) en(`fill ~${x + 3} ~${F + 1} ~${z} ~${x + 3} ~${F + 4} ~${z + 2} air`);
    if (pas[cx][cz].s) en(`fill ~${x} ~${F + 1} ~${z + 3} ~${x + 2} ~${F + 4} ~${z + 3} air`);
  }
  let zE = cZ(fila);
  en(`fill ~${MX0} ~${F + 1} ~-2 ~${MX0} ~${F + 4} ~2 air`);                 // antesala -> laberinto
  en(`fill ~${MX0} ~${F + 1} ~${zE} ~${MX0} ~${F + 4} ~${zE + 2} air`);
  for (let i = 0; i < S * 2; i++) en(`setblock ~${MX0 + camAzar(0, S - 1)} ~${F + camAzar(1, 4)} ~${Z0 + camAzar(0, S - 1)} ${T.GRIETA} replace ${PARED}`);
  for (let i = 0; i < CAM_N * 3; i++) en(`setblock ~${cX(camAzar(0, CAM_N - 1)) + 1} ~${F + 4} ~${cZ(camAzar(0, CAM_N - 1)) + 1} ${LUZ}`);
  for (let i = 0; i < CAM_N * 2; i++) en(`setblock ~${cX(camAzar(1, CAM_N - 1)) + camAzar(0, 2)} ~${F + camAzar(2, 4)} ~${cZ(camAzar(0, CAM_N - 1)) + camAzar(0, 2)} minecraft:cobweb`);
  for (let i = 0; i < 4 + 2 * k; i++) {
    let mob = T.generadores[i % T.generadores.length];
    en(`setblock ~${cX(camAzar(2, CAM_N - 1)) + 1} ~${F + 1} ~${cZ(camAzar(0, CAM_N - 1)) + 1} minecraft:spawner{SpawnData:{entity:{id:"${mob}"}},SpawnCount:2,MaxNearbyEntities:6,MinSpawnDelay:200,MaxSpawnDelay:500,RequiredPlayerRange:10}`);
  }
  // 3) Sala del Guardián
  en(`fill ~${BX0 - 1} ~${F} ~${-BZ - 1} ~${BX0 + BL} ~${F + BH + 1} ~${BZ + 1} ${PARED} hollow`);
  en(`fill ~${BX0} ~${F} ~${-BZ} ~${BX0 + BL - 1} ~${F} ~${BZ} ${T.SUELO}`);
  en(`fill ~${BX0} ~${F + BH + 1} ~${-BZ} ~${BX0 + BL - 1} ~${F + BH + 1} ~${BZ} ${T.TECHO}`);
  en(`fill ~${BX0 - 1} ~${F + 1} ~${zE} ~${BX0 - 1} ~${F + 4} ~${zE + 2} air`);
  [[4, -6], [4, 5], [14, -6], [14, 5]].forEach(p => {
    en(`fill ~${BX0 + p[0]} ~${F + 1} ~${p[1]} ~${BX0 + p[0] + 1} ~${F + BH} ~${p[1] + 1} ${T.PILAR}`);
    en(`setblock ~${BX0 + p[0]} ~${F + BH} ~${p[1] - 1} ${LUZ}`);
  });
  for (let i = 0; i < 6; i++) en(`setblock ~${BX0 + camAzar(1, BL - 2)} ~${F + BH} ~${camAzar(-BZ + 1, BZ - 1)} ${LUZ}`);
  // 4) Portal (jaula de rejas que se abre al morir el Guardián)
  let PX = BX0 + BL - 4;
  en(`fill ~${PX - 1} ~${F} ~-1 ~${PX + 1} ~${F} ~1 minecraft:crying_obsidian`);
  en(`fill ~${PX - 2} ~${F + 1} ~-2 ~${PX + 2} ~${F + 3} ~2 ${T.REJA}`);
  en(`fill ~${PX - 1} ~${F + 1} ~-1 ~${PX + 1} ~${F + 3} ~1 air`);
  en(`fill ~${PX - 2} ~${F + 4} ~-2 ~${PX + 2} ~${F + 4} ~2 ${T.PILAR}`);
  en(`setblock ~${PX} ~${F + 3} ~0 ${LUZ}`);
  // Marcas: inicio del piso, portal y centro de la sala
  en(`summon minecraft:marker ~${k === 1 ? MX0 - 2 : MX0 - 3} ~${F + 1} ~0 {Tags:["st_cam","st_cam_${n}","st_cam_${n}_s${k}"]}`);
  en(`summon minecraft:marker ~${PX} ~${F + 1} ~0 {Tags:["st_cam","st_cam_${n}","st_cam_${n}_p${k}"]}`);
  en(`summon minecraft:marker ~${BX0 + 9} ~${F + 1} ~0 {Tags:["st_cam","st_cam_${n}","st_cam_${n}_g${k}"]}`);
};

// Escalera y arco de la superficie (con reja cerrada hasta "abrir")
let camEntrada = (en, T) => {
  let D = CAM_D;
  for (let i = 0; i < D; i++) {
    let f = -1 - i;
    en(`fill ~${i} ~${f - 1} ~-3 ~${i} ~${f + 5} ~3 ${T.PARED}`);
    en(`fill ~${i} ~${f + 1} ~-2 ~${i} ~${f + 4} ~2 air`);
    en(`fill ~${i} ~${f} ~-2 ~${i} ~${f} ~2 ${T.ESCALON}`);
    if (i % 5 === 2) { en(`setblock ~${i} ~${f + 4} ~-2 ${T.LUZ}`); en(`setblock ~${i} ~${f + 4} ~2 ${T.LUZ}`); }
  }
  en(`fill ~-2 ~-1 ~-5 ~-1 ~7 ~-4 ${T.ARCO}`);
  en(`fill ~-2 ~-1 ~4 ~-1 ~7 ~5 ${T.ARCO}`);
  en(`fill ~-2 ~7 ~-5 ~-1 ~8 ~5 ${T.ARCO_TOP}`);
  en(`fill ~-2 ~9 ~-3 ~-1 ~9 ~3 ${T.ARCO_MURO}`);
  en(`fill ~-2 ~0 ~-3 ~-1 ~6 ~3 ${T.REJA}`);                      // cerrado hasta /starvios camino abrir
  en(`setblock ~-3 ~6 ~-4 ${T.LUZ}`); en(`setblock ~-3 ~6 ~4 ${T.LUZ}`);
  en(`setblock ~-4 ~-1 ~-6 minecraft:hay_block`); en(`setblock ~-4 ~0 ~-6 ${T.FUEGO}`);
  en(`setblock ~-4 ~-1 ~6 minecraft:hay_block`); en(`setblock ~-4 ~0 ~6 ${T.FUEGO}`);
};

let camConstruir = (server, n, x, z, avisar) => {
  let T = CAM_TEMAS[n], M = camMedidas();
  let m = camLeer(server);
  if (m[String(n)]) { avisar(`§cEl camino ${n} ya existe. Bórralo antes con /starvios camino borrar ${n}.`); return; }
  if (global.stGenerandoCripta) { avisar('§cSe está generando otra estructura, espera unos segundos.'); return; }
  global.stGenerandoCripta = true;
  let id = String(Date.now() % 1000000);
  let ow = camOW(server);
  let fl = `${x - 10} ${z - M.ancho - 2} ${x + M.largo + 2} ${z + M.ancho + 2}`;
  ow(`forceload add ${fl}`);
  avisar(`§6[Starvios] Construyendo ${T.nombre} (${CAM_PISOS} pisos) en X: ${x} Z: ${z}... unos 15 segundos.`);
  server.scheduleInTicks(120, () => global.stSeguro('84_camino (ancla)', () => {
    ow(`summon minecraft:armor_stand ${x} 320 ${z} {Tags:["st_cam_tmp_${n}"],Invisible:1b,Marker:1b,NoGravity:1b}`);
    ow(`spreadplayers ${x} ${z} 0 1 false @e[tag=st_cam_tmp_${n}]`);
    for (let k = 0; k < 40; k++) {
      ow(`execute as @e[tag=st_cam_tmp_${n}] at @s if block ~ ~-1 ~ #minecraft:leaves run tp @s ~ ~-1 ~`);
      ow(`execute as @e[tag=st_cam_tmp_${n}] at @s if block ~ ~-1 ~ #minecraft:logs run tp @s ~ ~-1 ~`);
      ow(`execute as @e[tag=st_cam_tmp_${n}] at @s if block ~ ~-1 ~ minecraft:air run tp @s ~ ~-1 ~`);
    }
    ow(`execute at @e[tag=st_cam_tmp_${n},limit=1] run summon minecraft:marker ~ ~ ~ {Tags:["st_cam","st_cam_${n}","st_cam_${n}_a"]}`);
    ow(`kill @e[tag=st_cam_tmp_${n}]`);
  }));
  let en = (c) => server.runCommandSilent(`execute in minecraft:overworld at ${camAncla(n)} run ${c}`);
  let pisos = []; for (let k = 1; k <= CAM_PISOS; k++) pisos.push(k);
  pisos.forEach(k => server.scheduleInTicks(130 + k * 30, () => global.stSeguro('84_camino (piso)', () => camPiso(en, T, M, n, k))));
  server.scheduleInTicks(130 + (CAM_PISOS + 1) * 30, () => global.stSeguro('84_camino (fin)', () => {
    camEntrada(en, T);
    let mm = camLeer(server);
    mm[String(n)] = { x: x, z: z, id: id, abierto: false, pisos: [], llegado: false };
    camGuardar(server, mm);
    // Protección, foco de monstruos y borrado con /starvios estructuras (comparte la lista de mazmorras; oculto en /mazmorras)
    let lista = global.mzLista(server);
    lista.push({ nombre: T.nombre, x: x, z: z, id: id, laberinto: true, oculta: true, camino: n,
                 dia: global.stDiaGuardado(server), largo: M.largo, ancho: M.ancho,
                 cx: x + Math.round(M.largo / 2), cz: z, radio: Math.round(M.largo / 2) + 12 });
    global.mzGuardar(server, lista);
    ow(`forceload remove ${fl}`);
    global.stGenerandoCripta = false;
    avisar(`§a[Starvios] ¡${T.nombre} lista! Está cerrada con rejas. Ábrela el día del jefe con §e/starvios camino abrir ${n}§a.`);
  }));
  server.scheduleInTicks(900, () => { global.stGenerandoCripta = false; });
};

// ---------- Abrir: monstruos, guardianes y anuncio ----------
let camGuardian = (server, n, k, T, M, id, en) => {
  let F = camF(k), gx = M.BX0 + 9;
  let tags = `"st_cam_g","camg_${n}_${k}","mz_${id}"`;
  let sel = `@e[tag=camg_${n}_${k}]`;
  let nombre = '', vida = 0;
  if (k < CAM_PISOS) {
    nombre = `Guardián del piso ${k}`;
    en(`summon ${T.capitan} ~${gx} ~${F + 1} ~0 {PersistenceRequired:1b,Tags:[${tags}]}`);
    global.stHacerEliteSel(server, sel, T.capitan);
    let mult = (1 + k + n * 0.6).toFixed(2);
    server.runCommandSilent(`execute as ${sel} run attribute @s minecraft:generic.max_health modifier add 5a7c1e00-0000-4000-8000-0000000000c7 st_cam_guardian ${mult} multiply`);
    server.runCommandSilent(`execute as ${sel} run item replace entity @s weapon.mainhand with minecraft:netherite_sword{Enchantments:[{id:"minecraft:sharpness",lvl:${Math.min(5, 1 + n)}s}]}`);
  } else {
    // Último piso: un jefe de mod (los de las criptas), más débil las primeras semanas
    let c = global.STARVIOS.criptas, esc = Math.min(1.2, 0.55 + 0.15 * n);
    let cand = c.jefes.slice().sort(() => Math.random() - 0.5), j = null;
    for (let i = 0; i < cand.length && !j; i++) {
      if (en(`summon ${cand[i].id} ~${gx} ~${F + 1} ~0 {PersistenceRequired:1b,Tags:[${tags}]}`) > 0) j = cand[i];
    }
    if (!j) { j = c.jefeRespaldo; en(`summon ${j.id} ~${gx} ~${F + 1} ~0 {PersistenceRequired:1b,Tags:[${tags}],HandItems:[{id:"${j.arma}",Count:1b},{}],HandDropChances:[0f,0f]}`); }
    nombre = `${j.nombre}, Guardián del Abismo`;
    let as = (c2) => server.runCommandSilent(`execute as ${sel} run ${c2}`);
    as(`attribute @s minecraft:generic.max_health base set ${Math.round(j.vida * esc)}`);
    as(`attribute @s minecraft:generic.attack_damage base set ${Math.round(j.daño * esc)}`);
    as(`attribute @s minecraft:generic.armor base set ${j.armadura}`);
    as(`attribute @s minecraft:generic.knockback_resistance base set 1`);
  }
  server.runCommandSilent(`execute as ${sel} run data merge entity @s {Health:100000f,CustomNameVisible:1b,CustomName:'{"text":"♛ ${nombre}","color":"${T.color}","bold":true}'}`);
  server.runCommandSilent(`effect give ${sel} minecraft:glowing infinite 0 true`);
  server.runCommandSilent(`execute as ${sel} run data modify entity @s ForgeData.st_casa set from entity @s Pos`);
  let bb = `starvios:camg_${n}_${k}`;
  server.runCommandSilent(`bossbar remove ${bb}`);
  server.runCommandSilent(`bossbar add ${bb} {"text":"♛ ${nombre}","color":"${T.color}","bold":true}`);
  server.runCommandSilent(`bossbar set ${bb} color ${k < CAM_PISOS ? 'yellow' : 'red'}`);
  server.runCommandSilent(`execute store result bossbar ${bb} max run attribute ${sel.replace(']', ',limit=1]')} minecraft:generic.max_health get`);
  return nombre;
};

let camAbrir = (server, n, avisar) => {
  let m = camLeer(server), d = m[String(n)];
  if (!d) { avisar(`§cEl camino ${n} no está construido.`); return; }
  let T = CAM_TEMAS[n], M = camMedidas(), ow = camOW(server);
  let fl = `${d.x - 10} ${d.z - M.ancho - 2} ${d.x + M.largo + 2} ${d.z + M.ancho + 2}`;
  ow(`forceload add ${fl}`);
  avisar('§6[Starvios] Despertando el camino... (5 s)');
  server.scheduleInTicks(100, () => global.stSeguro('84_camino (abrir)', () => {
    let en = (c) => server.runCommandSilent(`execute in minecraft:overworld at ${camAncla(n)} run ${c}`);
    server.runCommandSilent(`kill @e[tag=mz_${d.id}]`);
    let fila = Math.floor(CAM_N / 2);
    let cX = (cx) => M.MX0 + 1 + cx * 4, cZ = (cz) => M.Z0 + 1 + cz * 4;
    let total = 0;
    for (let k = 1; k <= CAM_PISOS; k++) {
      let F = camF(k);
      let cant = Math.min(75, 30 + 8 * k + 4 * n);
      let pElite = Math.min(0.6, 0.15 + 0.05 * n + 0.05 * k);
      for (let i = 0; i < cant; i++) {
        let mob = T.mobs[Math.floor(Math.random() * T.mobs.length)];
        let cx = camAzar(1, CAM_N - 1), cz = camAzar(0, CAM_N - 1);
        let tg = Math.random() < pElite ? `"mz_${d.id}","st_cam_mob","starvios_cm_elite"` : `"mz_${d.id}","st_cam_mob"`;
        en(`summon ${mob} ~${cX(cx) + camAzar(0, 2)} ~${F + 1} ~${cZ(cz) + camAzar(0, 2)} {PersistenceRequired:1b,Tags:[${tg}]}`);
      }
      total += cant;
      // escolta en la sala del Guardián
      for (let i = 0; i < 2 + k; i++) {
        en(`summon ${T.mobs[i % T.mobs.length]} ~${M.BX0 + camAzar(3, 15)} ~${F + 1} ~${camAzar(-7, 7)} {PersistenceRequired:1b,Tags:["mz_${d.id}","st_cam_mob","starvios_cm_elite"]}`);
      }
      camGuardian(server, n, k, T, M, d.id, en);
    }
    T.mobs.filter((x, i) => T.mobs.indexOf(x) === i).forEach(tipo => global.stHacerEliteSel(server, `@e[tag=starvios_cm_elite,type=${tipo}]`, tipo));
    server.runCommandSilent(`tag @e[tag=starvios_cm_elite] remove starvios_cm_elite`);
    server.runCommandSilent(`execute as @e[tag=st_cam_mob,tag=mz_${d.id}] run data modify entity @s ForgeData.st_casa set from entity @s Pos`);
    // reja de la entrada fuera
    en(`fill ~-2 ~0 ~-3 ~-1 ~6 ~3 air replace ${T.REJA}`);
    ow(`forceload remove ${fl}`);
    let mm = camLeer(server);
    mm[String(n)].abierto = true; mm[String(n)].pisos = []; mm[String(n)].llegado = false;
    camGuardar(server, mm);
    let lista = global.mzLista(server);
    lista.forEach(e => { if (e.camino === n) e.oculta = false; });
    global.mzGuardar(server, lista);
    // Anuncio
    let jefe = global.STARVIOS.jefes[n - 1];
    let s = global.STARVIOS.spawn;
    let dist = Math.round(Math.sqrt(Math.pow(d.x - s.x, 2) + Math.pow(d.z - s.z, 2)));
    let t = (c) => server.runCommandSilent(c);
    t(`title @a times 10 70 20`);
    t(`title @a title {"text":"${T.nombre}","color":"${T.color}","bold":true}`);
    t(`title @a subtitle {"text":"El camino hacia el tirano se ha abierto","color":"gray"}`);
    t(`execute as @a at @s run playsound minecraft:entity.wither.spawn master @s ~ ~ ~ 0.5 0.6`);
    t(`tellraw @a ["",{"text":"☠ ","color":"${T.color}"},{"text":"${T.nombre}","color":"${T.color}","bold":true},{"text":" se ha abierto en ","color":"gray"},{"text":"X: ${d.x}  Z: ${d.z}","color":"yellow"},{"text":"  (${dist} bloques al ${global.mzDireccion(d.x - s.x, d.z - s.z)} del spawn) ","color":"gray"},` +
      `{"text":"[Copiar]","color":"aqua","clickEvent":{"action":"copy_to_clipboard","value":"${d.x} ${d.z}"}}]`);
    t(`tellraw @a {"text":"   ${CAM_PISOS} pisos de laberinto. Mata al Guardián de cada piso para abrir su portal. Al final te espera ${jefe ? jefe.nombre : 'el tirano'}.","color":"gray"}`);
    avisar(`§a[Starvios] Abierto: ${total} monstruos y ${CAM_PISOS} guardianes.`);
  }));
};

// ---------- Muerte de un Guardián: se abre su portal + cofre ----------
EntityEvents.death(event => { global.stSeguro('84_camino (guardian)', () => {
  let e = event.entity;
  if (!e || e.isPlayer()) return;
  let mt = String(e.getTags()).match(/camg_(\d)_(\d)/);
  if (!mt) return;
  let n = parseInt(mt[1]), k = parseInt(mt[2]);
  let server = e.server, T = CAM_TEMAS[n];
  let quien = event.source.player ? event.source.player.getName().getString() : null;
  let ow = (c) => server.runCommandSilent(`execute in minecraft:overworld at ${camMarca(n, 'p' + k)} run ${c}`);
  ow(`fill ~-2 ~ ~-2 ~2 ~2 ~2 air replace ${T.REJA}`);
  ow(`particle minecraft:reverse_portal ~ ~1 ~ 0.8 1 0.8 0.1 200 force`);
  ow(`playsound minecraft:block.end_portal.spawn master @a[distance=..60] ~ ~ ~ 0.8 1.2`);
  // cofre de botín junto al portal
  let items = [], slot = 0;
  let fr = global.stItemsEspeciales.fragmento;
  items.push(`{Slot:${slot++}b,id:"${fr[0]}",Count:${k}b,tag:${fr[1]}}`);
  for (let i = 0; i < 1 + k; i++) {
    let p = global.stPremioAleatorio();
    items.push(`{Slot:${2 + slot++ * 2}b,id:"${p.id}",Count:${camAzar(p.min, p.max)}b${p.nbt ? ',tag:' + p.nbt : ''}}`);
  }
  global.stBotinEspecial(k).forEach(it => items.push(`{Slot:${18 + slot++}b,id:"${it.id}",Count:${it.cantidad}b}`));
  ow(`setblock ~-4 ~ ~ minecraft:chest[facing=west]{CustomName:'{"text":"Botín del Guardián","color":"gold","bold":true}',Items:[${items.join(',')}]}`);
  server.runCommandSilent(`bossbar remove starvios:camg_${n}_${k}`);
  if (quien && global.stDarDinero) global.stDarDinero(server, quien, 100 * k, `Guardián del piso ${k}`);
  let mm = camLeer(server);
  if (mm[String(n)]) { if (mm[String(n)].pisos.indexOf(k) === -1) mm[String(n)].pisos.push(k); camGuardar(server, mm); }
  let sig = k < CAM_PISOS ? `Su portal lleva al piso ${k + 1}.` : 'Su portal lleva a la arena del tirano...';
  server.runCommandSilent(`tellraw @a ["",{"text":"♛ ","color":"${T.color}"},{"text":"${quien || 'Alguien'}","color":"yellow"},{"text":" derrotó al Guardián del piso ${k}. ${sig}","color":"gray"}]`);
}); });

// ---------- Portales (cada medio segundo) y barras de los guardianes (cada segundo) ----------
let camTick = 0;
ServerEvents.tick(event => { global.stSeguro('84_camino (tick)', () => {
  camTick++;
  if (camTick % 10 !== 0) return;
  let server = event.server, m = camLeer(server), cambio = false;
  Object.keys(m).forEach(key => {
    let d = m[key], n = parseInt(key);
    if (!d.abierto) return;
    let T = CAM_TEMAS[n];
    if (camTick % 20 === 0) {
      for (let k = 1; k <= CAM_PISOS; k++) {
        if (d.pisos.indexOf(k) !== -1) continue;
        let bb = `starvios:camg_${n}_${k}`, g = `@e[tag=camg_${n}_${k},limit=1]`;
        server.runCommandSilent(`execute store result bossbar ${bb} value run data get entity ${g} Health`);
        server.runCommandSilent(`bossbar set ${bb} players @a[tag=starvios_nadie]`);
        server.runCommandSilent(`execute in minecraft:overworld at ${g} run bossbar set ${bb} players @a[distance=..30]`);
      }
    }
    d.pisos.forEach(k => {
      let P = camMarca(n, 'p' + k);
      let hay = server.runCommandSilent(`execute in minecraft:overworld at ${P} if entity @a[distance=..1.6,gamemode=!spectator]`);
      server.runCommandSilent(`execute in minecraft:overworld at ${P} run particle minecraft:portal ~ ~0.5 ~ 0.6 0.8 0.6 0.4 25`);
      if (!(Number(hay) > 0)) return;
      if (k < CAM_PISOS) {
        server.runCommandSilent(`execute in minecraft:overworld at ${P} as @a[distance=..1.6,gamemode=!spectator] run title @s title {"text":"Piso ${k + 1} de ${CAM_PISOS}","color":"${T.color}","bold":true}`);
        server.runCommandSilent(`execute in minecraft:overworld at ${P} as @a[distance=..1.6,gamemode=!spectator] at @s run playsound minecraft:entity.enderman.teleport master @s ~ ~ ~ 1 0.7`);
        server.runCommandSilent(`execute in minecraft:overworld at ${P} as @a[distance=..1.6,gamemode=!spectator] run tp @s ${camMarca(n, 's' + (k + 1))}`);
        return;
      }
      // Último portal -> arena del jefe
      let jefe = global.STARVIOS.jefes[n - 1];
      let donde = global.stDondeArena(jefe, server);
      server.runCommandSilent(`execute in minecraft:overworld at ${P} as @a[distance=..1.6,gamemode=!spectator] run title @s title {"text":"${jefe ? jefe.nombre : 'El tirano'}","color":"red","bold":true}`);
      server.runCommandSilent(`execute in minecraft:overworld at ${P} as @a[distance=..1.6,gamemode=!spectator] ${donde} run tp @s ~ ~ ~-14 facing ~ ~1 ~`);
      if (!d.llegado) {
        d.llegado = true; cambio = true;
        server.runCommandSilent(`tellraw @a ["",{"text":"⚔ ","color":"red"},{"text":"¡Alguien ha cruzado el último portal! ","color":"red","bold":true},{"text":"${CAM_AUTOJEFE ? 'El tirano despierta en ' + CAM_SEG_JEFE + ' segundos...' : 'La arena espera.'}","color":"gray"}]`);
        if (CAM_AUTOJEFE) server.scheduleInTicks(CAM_SEG_JEFE * 20, () => server.runCommandSilent(`starvios jefe ${n}`));
      }
    });
  });
  if (cambio) camGuardar(server, m);
}); });

// ---------- Comandos ----------
ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  let N = () => Commands.argument('n', Arguments.INTEGER.create(event));
  let num = (ctx) => Arguments.INTEGER.getResult(ctx, 'n');
  let ok = (ctx, n) => { if (n >= 1 && n <= 5) return true; decir(ctx)('§cUsa un número de jefe del 1 al 5.'); return false; };
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('camino')
      .then(Commands.literal('construir').then(N().executes(ctx => {
        let n = num(ctx); if (!ok(ctx, n)) return 0;
        let p = ctx.source.player; if (!p) return 0;
        let pos = global.stXYZ(p);
        camConstruir(ctx.source.server, n, Math.floor(pos.x), Math.floor(pos.z), decir(ctx));
        return 1;
      })))
      .then(Commands.literal('abrir').then(N().executes(ctx => {
        let n = num(ctx); if (!ok(ctx, n)) return 0;
        camAbrir(ctx.source.server, n, decir(ctx)); return 1;
      })))
      .then(Commands.literal('tp').then(N().executes(ctx => {
        let n = num(ctx); if (!ok(ctx, n)) return 0;
        let d = camLeer(ctx.source.server)[String(n)], p = ctx.source.player;
        if (!d || !p) { decir(ctx)('§cEse camino no está construido.'); return 0; }
        ctx.source.server.runCommandSilent(`execute in minecraft:overworld run tp ${p.getName().getString()} ${d.x - 6} 320 ${d.z}`);
        ctx.source.server.runCommandSilent(`execute in minecraft:overworld run spreadplayers ${d.x - 6} ${d.z} 0 1 false ${p.getName().getString()}`);
        return 1;
      })))
      .then(Commands.literal('lista').executes(ctx => {
        let m = camLeer(ctx.source.server), dd = decir(ctx);
        dd('§6── Caminos del Tirano ──');
        [1, 2, 3, 4, 5].forEach(n => {
          let d = m[String(n)];
          dd(d ? `§e${n}. ${CAM_TEMAS[n].nombre}§7 → X: ${d.x} Z: ${d.z} · ${d.abierto ? `§aabierto§7 (pisos superados: ${d.pisos.length}/${CAM_PISOS})` : '§ccerrado'}`
               : `§8${n}. ${CAM_TEMAS[n].nombre} (sin construir)`);
        });
        return 1;
      }))
      .then(Commands.literal('borrar').then(N().executes(ctx => {
        let n = num(ctx); if (!ok(ctx, n)) return 0;
        let server = ctx.source.server, m = camLeer(server), d = m[String(n)];
        if (!d) { decir(ctx)('§cEse camino no está construido.'); return 0; }
        server.runCommandSilent(`kill @e[tag=mz_${d.id}]`);
        server.runCommandSilent(`kill @e[tag=st_cam_${n}]`);
        for (let k = 1; k <= CAM_PISOS; k++) server.runCommandSilent(`bossbar remove starvios:camg_${n}_${k}`);
        delete m[String(n)]; camGuardar(server, m);
        global.mzGuardar(server, global.mzLista(server).filter(e => e.camino !== n));
        decir(ctx)(`§a[Starvios] Camino ${n} olvidado. Para borrar los bloques usa /starvios estructuras (sigue en la lista).`);
        return 1;
      })))));
});
