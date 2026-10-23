// priority: 50
// ============================================================
//  STARVIOS - ANOMALÍAS (los 2 nerfs y el buff de cada día)
//  Los activas TÚ cuando quieras, uno por uno, y salen anunciados en el chat:
//    /starvios nerf1 <día>   -> "⚠ Se descubrió una nueva anomalía…"
//    /starvios nerf2 <día>   -> "🔬 Tras una investigación…"
//    /starvios buff <día>    -> "✦ Los antiguos escucharon sus plegarias…"
//    /starvios efectos               -> lista de lo activado (clic para quitar)
//    /starvios quitar <nerf1|nerf2|buff> <día>
//    /starvios efectos reset         -> apaga todas las anomalías
//  Jugadores: /anomalias -> ver lo que está activo
//  Una vez activado, se queda activo el resto de la serie (como las reglas de cada día).
//  Los textos se pueden cambiar aquí abajo (EF_TEXTOS y EF_ANUNCIO).
// ============================================================

let EF_DESCANSO = [6, 13, 20, 27, 28];
let EF_TIPOS = { nerf1: 'n1', nerf2: 'n2', buff: 'b' };

let EF_TEXTOS = {
  1:  { n1: 'Las herramientas de madera y piedra se gastan el doble.',
        n2: 'Sin regeneración natural mientras tengas el efecto Hambre.',
        b:  'Segunda oportunidad: la primera vez que vayas a morir, te salvas con 2 corazones (una sola vez en toda la serie).' },
  2:  { n1: 'Los zombis ahora derriban las puertas de madera.',
        n2: 'Al golpear a un zombi, puede llamar a un compañero (20%).',
        b:  'Los zombis sueltan pepitas de hierro (25%).' },
  3:  { n1: 'Cada medianoche se desata una tormenta eléctrica de 5 minutos.',
        n2: 'Bajo la tormenta, la armadura de hierro atrae los rayos (10% cada minuto).',
        b:  'Los creepers sueltan el doble de pólvora.' },
  4:  { n1: 'Las arañas son un 20% más rápidas.',
        n2: 'Las arañas de cueva salen a la superficie por la noche.',
        b:  'Matar una araña te da Regeneración I durante 5 segundos.' },
  5:  { n1: 'Los mobs te detectan desde un 50% más lejos.',
        n2: 'Los golpes de los mobs empujan más fuerte.',
        b:  'Ganas el doble de Starcoins por cada monstruo que mates.' },
  7:  { n1: 'Los zombis bebé son el doble de comunes.',
        n2: 'Los esqueletos aparecen con casco y peto de hierro.',
        b:  'Los mobs sueltan el doble de experiencia.' },
  8:  { n1: 'Una caída fuerte (3 corazones o más) te deja con Lentitud II durante 5 segundos.',
        n2: 'Al despertar tienes Hambre I durante 20 segundos.',
        b:  'Los élites pueden soltar hasta 2 Fragmentos de Corazón.' },
  9:  { n1: 'La explosión de un creeper bloquea tu escudo durante 5 segundos.',
        n2: 'Los creepers te detectan desde 32 bloques.',
        b:  'Los pararrayos se craftean con 1 solo lingote de cobre.' },
  10: { n1: 'Los zombis aparecen en grupos de 4.',
        n2: 'De noche los zombis tienen Velocidad II.',
        b:  'Nuevo objeto: Kit de reparación (4 lingotes de hierro en cruz con 1 cuero en el centro). Clic derecho sobre OTRO jugador para repararle un 40% de su armadura.' },
  11: { n1: 'Las flechas de los esqueletos dan Lentitud I.',
        n2: 'Los esqueletos llevan arcos con Poder II.',
        b:  'Los esqueletos sueltan el doble de flechas y a veces un arco.' },
  12: { n1: 'Los mobs ya no pierden tu rastro: te siguen hasta 64 bloques.',
        n2: 'Sangrado: un golpe de 3 corazones o más te da Wither I durante 3 segundos.',
        b:  'Robo de vida: cada monstruo que matas te cura medio corazón.' },
  14: { n1: 'Los élites también aparecen de día.',
        n2: 'Los élites ahora tienen Velocidad II.',
        b:  'Los élites dan el triple de Starcoins.' },
  15: { n1: 'Con menos de 3 muslos de comida tienes Debilidad I.',
        n2: 'Al anochecer todos reciben Debilidad I durante 1 minuto.',
        b:  'Comer una manzana dorada da 4 corazones de absorción extra.' },
  16: { n1: 'Los mobs son un 10% más rápidos.',
        n2: 'Zombis y arañas tienen Resistencia I.',
        b:  'Los monstruos sueltan el doble de botín.' },
  17: { n1: 'Los cultivos crecen a la mitad de velocidad.',
        n2: 'Comer carne o pescado crudo da Náuseas.',
        b:  'Cada amanecer todos reciben 8 filetes cocidos.' },
  18: { n1: 'Patrullas de vindicadores rondan por la noche.',
        n2: 'Ya no aparecen gólems de hierro en las aldeas.',
        b:  'Los zombis acorazados pueden soltar piezas de su armadura (10%).' },
  19: { n1: 'Las noches duran un 50% más.',
        n2: 'Los enderman aparecen el triple por la noche.',
        b:  'Las antorchas se craftean de 8 en 8.' },
  21: { n1: 'Con menos de 3 corazones vas con Lentitud I.',
        n2: 'El fuego también te da Wither I durante 2 segundos.',
        b:  'Bendición: Regeneración I durante 10 segundos cada amanecer.' },
  22: { n1: 'Durante las tormentas caen rayos cerca de los jugadores.',
        n2: 'Los creepers te persiguen sin perder el rastro.',
        b:  'Última resistencia: con 1 corazón ganas Resistencia II durante 5 segundos (una vez por minuto).' },
  23: { n1: 'La tormenta dura toda la noche.',
        n2: 'Las flechas de esqueleto que te impactan pueden invocar un rayo (10%).',
        b:  'Los creepers cargados sueltan 20 Starcoins y una cabeza de creeper.' },
  24: { n1: 'Los mobs tienen Fuerza I por la noche.',
        n2: 'Las brujas aparecen el triple.',
        b:  'Botín especial x2 en élites y jefes.' },
  25: { n1: 'Los mobs reciben un 30% menos de daño de las flechas.',
        n2: '3 de cada 10 esqueletos llevan armadura de diamante.',
        b:  'Fuerza I para todos durante 1 minuto cada amanecer.' },
  26: { n1: 'Los mobs aparecen en grupos el doble de grandes.',
        n2: 'Los mobs tienen Regeneración I.',
        b:  'Absorción: 2 corazones extra temporales cada amanecer.' }
};

let EF_ANUNCIO = {
  n1: { titulo: '⚠ Se descubrió una nueva anomalía…', color: 'red',
        sonidos: [['minecraft:entity.elder_guardian.curse', 0.6], ['minecraft:block.beacon.deactivate', 0.5]] },
  n2: { titulo: '🔬 Tras una investigación, se confirmó algo peor…', color: 'dark_red',
        sonidos: [['minecraft:entity.warden.heartbeat', 0.7], ['minecraft:entity.elder_guardian.curse', 0.5], ['minecraft:block.respawn_anchor.deplete', 0.6]] },
  b:  { titulo: '✦ Los antiguos escucharon sus plegarias…', color: 'gold',
        sonidos: [['minecraft:block.beacon.activate', 1.2], ['minecraft:entity.player.levelup', 1]] }
};
let EF_NOMBRE = { n1: 'Nerf 1', n2: 'Nerf 2', b: 'Buff' };

// ---------- Estado ----------
let EF_ARCHIVO = 'kubejs/config/starvios_efectos.json';   // lo leen las recetas al hacer /reload
let EF_CON_RECETA = ['9b', '10b', '19b'];

let efLeer = (server) => {
  try { return JSON.parse(server.persistentData.getString('starvios_efectos') || '{}'); } catch (e) { return {}; }
};
let efCargar = (server) => {
  let m = {};
  try { if (global.stActivo(server)) m = efLeer(server); } catch (e) {}
  global.stEfMapa = m;
  global.stEfListo = true;
};
let efGuardar = (server, m) => {
  server.persistentData.putString('starvios_efectos', JSON.stringify(m));
  try { JsonIO.write(EF_ARCHIVO, { activos: Object.keys(m).join(',') }); } catch (e) { console.warn(`[Starvios] No pude escribir ${EF_ARCHIVO}: ${e}`); }
  efCargar(server);
};
// ¿Está activa la anomalía? clave = '3n2', '10b', ...  (con el evento desactivado, nada está activo)
global.stEf = (server, k) => {
  if (!global.stEfListo && server) efCargar(server);
  let m = global.stEfMapa;
  return !!(m && m[k]);
};
global.stEfListo = false;

// ---------- Utilidades ----------
let efTipo = (e) => { try { return String(e.type); } catch (x) { return ''; } };
let efTags = (e) => { try { return String(e.getTags()); } catch (x) { return ''; } };
let efNombre = (p) => p.getName().getString();
let efNivel = (server) => server.getLevel('minecraft:overworld');
let efHora = (level) => { try { return Number(level.getDayTime()) % 24000; } catch (e) { return 6000; } };
let efNoche = (level) => { let t = efHora(level); return t >= 13000 && t < 23000; };
let efTormenta = (level) => { try { return !!level.isThundering(); } catch (e) { return false; } };
let efCielo = (e) => { try { return !!e.level.canSeeSky(e.blockPosition()); } catch (x) { return true; } };
let efMundo = (e) => global.stDimDe(e) === 'minecraft:overworld';
let efVivos = (server) => {
  let l = [];
  server.players.forEach(p => {
    try { if (p.isSpectator() || p.isCreative()) return; } catch (e) {}
    l.push(p);
  });
  return l;
};
let efPoc = (server, n, id, seg, amp) => server.runCommandSilent(`effect give ${n} ${id} ${seg} ${amp} true`);
let efAzar = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
let efSoltar = (run, id, cant) => run(`summon minecraft:item ~ ~0.5 ~ {PickupDelay:10s,Motion:[${(Math.random() * 0.2 - 0.1).toFixed(2)},0.25,${(Math.random() * 0.2 - 0.1).toFixed(2)}],Item:{id:"${id}",Count:${cant}b}}`);
let efVida = (p) => { try { return Number(p.getHealth()); } catch (e) { return 20; } };
let efArmadura = (e) => {
  let l = [];
  ['getHeadArmorItem', 'getChestArmorItem', 'getLegsArmorItem', 'getFeetArmorItem'].forEach(f => {
    try { let it = e[f](); if (it && !it.isEmpty()) l.push(it); } catch (x) {}
  });
  return l;
};
let efIdItem = (it) => { try { return String(it.getId()); } catch (e) { try { return String(it.id); } catch (e2) { return ''; } } };

// Monstruos especiales que no se tocan
let efEspecial = (tg) => tg.indexOf('starvios_jefe') !== -1 || tg.indexOf('starvios_cripta') !== -1 ||
  tg.indexOf('starvios_guardian') !== -1 || tg.indexOf('starvios_capitan') !== -1 || tg.indexOf('st_esbirro') !== -1 ||
  tg.indexOf('starvios_sin_mejora') !== -1;

let EF_ZOMBIS = ['minecraft:zombie', 'minecraft:husk', 'minecraft:zombie_villager', 'minecraft:drowned'];
let EF_ESQUELETOS = ['minecraft:skeleton', 'minecraft:stray'];
let EF_ARANAS = ['minecraft:spider', 'minecraft:cave_spider'];
let EF_GRUPO = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider', 'minecraft:creeper', 'minecraft:husk',
                'minecraft:stray', 'minecraft:drowned', 'minecraft:zombie_villager', 'minecraft:witch', 'minecraft:enderman'];
let EF_CARNE_CRUDA = ['minecraft:beef', 'minecraft:porkchop', 'minecraft:chicken', 'minecraft:mutton', 'minecraft:rabbit',
                      'minecraft:cod', 'minecraft:salmon', 'minecraft:rotten_flesh'];

// Invoca 'n' copias de un tipo alrededor del mob (máx. 10 del mismo tipo cerca)
let efGrupo = (run, tipo, n) => {
  for (let i = 0; i < n; i++) {
    run(`execute store result score #efcerca st_tmp if entity @e[type=${tipo},distance=..24]`);
    run(`execute if score #efcerca st_tmp matches ..9 run summon ${tipo} ~${(Math.random() * 4 - 2).toFixed(1)} ~ ~${(Math.random() * 4 - 2).toFixed(1)} {Tags:["starvios_extra"]}`);
  }
};

// ============================================================
//  1) Al aparecer un mob
// ============================================================
EntityEvents.spawned(event => {
  let e = event.entity;
  if (!e || e.isPlayer() || !e.isLiving()) return;
  let server = e.server;
  if (!server) return;
  let tipo = efTipo(e);

  // 18 nerf 2: sin gólems de aldea (los que construyen los jugadores sí valen)
  if (tipo === 'minecraft:iron_golem') {
    if (!global.stEf(server, '18n2')) return;
    server.scheduleInTicks(1, () => {
      let hecho = false;
      try { hecho = e.getNbt().getBoolean('PlayerCreated'); } catch (x) {}
      if (!hecho) { try { e.discard(); } catch (x) { global.stComoEntidad(e)('tp @s ~ -1000 ~'); } }
    });
    return;
  }

  if (!e.isMonster()) return;
  if (!global.stEfMapa || Object.keys(global.stEfMapa).length === 0) { if (global.stEfListo) return; }
  let tg = efTags(e);
  if (efEspecial(tg)) return;
  if (e.persistentData.getBoolean('st_anom')) return;
  e.persistentData.putBoolean('st_anom', true);
  let extra = tg.indexOf('starvios_extra') !== -1;

  // Después de 20_mobs (que aplica en el tick 1)
  server.scheduleInTicks(3, () => { global.stSeguro('93_anomalias (aparición)', () => {
    if (!e.isAlive()) return;
    let run = global.stComoEntidad(e);
    let ef = (k) => global.stEf(server, k);
    let level = efNivel(server);
    let noche = level ? efNoche(level) : false;
    let natural = !extra && !global.stObjEnSpawn(e) && tipo !== '' && efTags(e).indexOf('starvios_elite') === -1;
    let attr = (a, uuid, nombre, v, op) => run(`attribute @s ${a} modifier add ${uuid} ${nombre} ${v} ${op}`);

    // Atributos generales
    if (ef('12n1')) run(`attribute @s minecraft:generic.follow_range base set 64`);
    else if (ef('5n1')) attr('minecraft:generic.follow_range', '5a7c1e00-0000-4000-8000-0000000000a1', 'st_ef_rastro', '0.5', 'multiply');
    if (ef('5n2')) attr('minecraft:generic.attack_knockback', '5a7c1e00-0000-4000-8000-0000000000a2', 'st_ef_empuje', '1.0', 'add');
    if (ef('16n1')) attr('minecraft:generic.movement_speed', '5a7c1e00-0000-4000-8000-0000000000a3', 'st_ef_veloz', '0.10', 'multiply');
    if (ef('26n2')) run(`effect give @s minecraft:regeneration infinite 0 true`);
    if (ef('24n1') && noche && level) {
      let t = efHora(level);
      run(`effect give @s minecraft:strength ${Math.max(5, Math.floor((23000 - t) / 20))} 0 true`);
    }

    // Arañas
    if (EF_ARANAS.indexOf(tipo) !== -1) {
      if (ef('4n1')) attr('minecraft:generic.movement_speed', '5a7c1e00-0000-4000-8000-0000000000a4', 'st_ef_arana', '0.20', 'multiply');
      if (ef('16n2')) run(`effect give @s minecraft:resistance infinite 0 true`);
      if (ef('4n2') && natural && noche && tipo === 'minecraft:spider' && efMundo(e) && efCielo(e) && Math.random() < 0.5) {
        efGrupo(run, 'minecraft:cave_spider', 1);
      }
    }

    // Zombis
    if (EF_ZOMBIS.indexOf(tipo) !== -1) {
      if (ef('2n1') && tipo !== 'minecraft:drowned') run(`data merge entity @s {CanBreakDoors:1b}`);
      if (ef('7n1') && natural && Math.random() < 0.05) run(`data merge entity @s {IsBaby:1b}`);
      if (ef('16n2')) run(`effect give @s minecraft:resistance infinite 0 true`);
      if (ef('10n1') && natural && tipo === 'minecraft:zombie') efGrupo(run, 'minecraft:zombie', 3);
    }

    // Esqueletos
    if (EF_ESQUELETOS.indexOf(tipo) !== -1) {
      if (ef('25n2') && Math.random() < 0.3) {
        ['head:helmet', 'chest:chestplate', 'legs:leggings', 'feet:boots'].forEach(s => {
          let p = s.split(':');
          run(`item replace entity @s armor.${p[0]} with minecraft:diamond_${p[1]}`);
        });
        run(`data merge entity @s {ArmorDropChances:[0f,0f,0f,0f]}`);
      } else if (ef('7n2')) {
        run(`item replace entity @s armor.head with minecraft:iron_helmet`);
        run(`item replace entity @s armor.chest with minecraft:iron_chestplate`);
        run(`data modify entity @s ArmorDropChances[2] set value 0f`);
        run(`data modify entity @s ArmorDropChances[3] set value 0f`);
      }
      if (ef('11n2')) {
        let dia = global.stDia(server);
        let fuego = global.stActiva('esqueletosFuego', dia) ? ',{id:"minecraft:flame",lvl:1s}' : '';
        run(`item replace entity @s weapon.mainhand with minecraft:bow{Enchantments:[{id:"minecraft:power",lvl:2s}${fuego}]}`);
        run(`data modify entity @s HandDropChances[0] set value 0f`);
      }
    }

    // Creepers
    if (tipo === 'minecraft:creeper') {
      if (ef('22n2')) run(`attribute @s minecraft:generic.follow_range base set 64`);
      else if (ef('9n2')) run(`attribute @s minecraft:generic.follow_range base set 32`);
    }

    // Grupos más grandes
    if (natural) {
      if (ef('19n2') && tipo === 'minecraft:enderman' && noche) efGrupo(run, 'minecraft:enderman', 2);
      if (ef('24n2') && tipo === 'minecraft:witch') efGrupo(run, 'minecraft:witch', 2);
      if (ef('26n1') && EF_GRUPO.indexOf(tipo) !== -1) efGrupo(run, tipo, 1);
    }
  }); });
});

// ============================================================
//  2) Golpes
// ============================================================
let efFuente = (src) => {
  let r = { id: '', atac: null, directo: null };
  try { r.id = String(src.getMsgId()); } catch (e) { try { r.id = String(src.type); } catch (e2) {} }
  try { r.atac = src.getEntity(); } catch (e) { try { r.atac = src.actual; } catch (e2) {} }
  try { r.directo = src.getDirectEntity(); } catch (e) { try { r.directo = src.immediate; } catch (e2) {} }
  return r;
};
global.stEfEscudo = global.stEfEscudo || {};

EntityEvents.hurt(event => { global.stSeguro('93_anomalias (golpe)', () => {
  let v = event.entity;
  if (!v) return;
  let server = v.server;
  if (!server || !global.stEfMapa || Object.keys(global.stEfMapa).length === 0) { if (global.stEfListo) return; }
  let ef = (k) => global.stEf(server, k);
  let f = efFuente(event.source);
  let dano = 0;
  try { dano = Number(event.damage); } catch (e) {}
  if (!isFinite(dano) || dano <= 0) { try { dano = Number(event.getDamage()); } catch (e) { dano = 0; } }
  let tAtac = f.atac ? efTipo(f.atac) : '';
  let tDir = f.directo ? efTipo(f.directo) : '';

  if (v.isPlayer()) {
    let n = efNombre(v);
    // 8n1: caída fuerte
    if (ef('8n1') && f.id === 'fall' && dano >= 6) efPoc(server, n, 'minecraft:slowness', 5, 1);
    // 9n1: la explosión del creeper bloquea el escudo
    if (ef('9n1') && tAtac === 'minecraft:creeper') {
      try { v.getCooldowns().addCooldown(Item.of('minecraft:shield').getItem(), 100); } catch (e) {}
      try { v.stopUsingItem(); } catch (e) {}
      server.runCommandSilent(`title ${n} actionbar {"text":"🛡 ¡Tu escudo quedó aturdido 5 s!","color":"red"}`);
    }
    let flechaEsq = tDir.indexOf('arrow') !== -1 && EF_ESQUELETOS.indexOf(tAtac) !== -1;
    // 11n1: flechas con lentitud
    if (ef('11n1') && flechaEsq) efPoc(server, n, 'minecraft:slowness', 4, 0);
    // 23n2: flechas que invocan rayos
    if (ef('23n2') && flechaEsq && Math.random() < 0.10) server.runCommandSilent(`execute at ${n} run summon minecraft:lightning_bolt ~ ~ ~`);
    // 12n2: sangrado
    if (ef('12n2') && f.atac && !f.atac.isPlayer() && dano >= 6) efPoc(server, n, 'minecraft:wither', 3, 0);
    // 21n2: el fuego da wither
    if (ef('21n2') && (f.id === 'inFire' || f.id === 'onFire' || f.id === 'lava' || f.id === 'hotFloor')) efPoc(server, n, 'minecraft:wither', 2, 0);
    return;
  }

  if (!v.isMonster()) return;
  let jugador = f.atac && f.atac.isPlayer();
  // 2n2: el zombi llama a un compañero (una sola vez por zombi)
  if (ef('2n2') && jugador && EF_ZOMBIS.indexOf(efTipo(v)) !== -1 && !v.persistentData.getBoolean('st_llamo') && Math.random() < 0.2) {
    v.persistentData.putBoolean('st_llamo', true);
    let run = global.stComoEntidad(v);
    efGrupo(run, efTipo(v) === 'minecraft:drowned' ? 'minecraft:drowned' : 'minecraft:zombie', 1);
    run(`playsound minecraft:entity.zombie.ambient hostile @a[distance=..16] ~ ~ ~ 1.5 0.6`);
  }
  // 25n1: las flechas hacen 30% menos (se le devuelve la vida justo después)
  if (ef('25n1') && jugador && tDir.indexOf('arrow') !== -1 && dano > 0 && efEspecial(efTags(v)) === false) {
    let cura = dano * 0.3;
    server.scheduleInTicks(1, () => { try { if (v.isAlive()) v.heal(cura); } catch (e) {} });
  }
}); });

// ============================================================
//  3) Muertes
// ============================================================
EntityEvents.death(event => { global.stSeguro('93_anomalias (muerte)', () => {
  let e = event.entity;
  if (!e || e.isPlayer() || !e.isMonster()) return;
  let server = e.server;
  let ef = (k) => global.stEf(server, k);
  let k = null;
  try { k = event.source.player; } catch (x) {}
  if (!k) return;
  let n = efNombre(k);
  let tipo = efTipo(e), tg = efTags(e);
  let run = global.stComoEntidad(e);
  let normal = tg.indexOf('starvios_elite') === -1 && tg.indexOf('starvios_jefe') === -1 && tg.indexOf('starvios_cripta_jefe') === -1;

  if (ef('2b') && EF_ZOMBIS.indexOf(tipo) !== -1 && Math.random() < 0.25) efSoltar(run, 'minecraft:iron_nugget', efAzar(1, 3));
  if (ef('3b') && tipo === 'minecraft:creeper') efSoltar(run, 'minecraft:gunpowder', efAzar(1, 2));
  if (ef('4b') && EF_ARANAS.indexOf(tipo) !== -1) efPoc(server, n, 'minecraft:regeneration', 5, 0);
  if (ef('7b')) run(`summon minecraft:experience_orb ~ ~0.5 ~ {Value:5s}`);
  if (ef('11b') && EF_ESQUELETOS.indexOf(tipo) !== -1) {
    efSoltar(run, 'minecraft:arrow', efAzar(2, 4));
    if (Math.random() < 0.10) efSoltar(run, 'minecraft:bow', 1);
  }
  if (ef('12b')) { try { k.heal(1); } catch (x) {} }
  if (ef('18b') && EF_ZOMBIS.indexOf(tipo) !== -1 && Math.random() < 0.10) {
    let piezas = efArmadura(e).map(efIdItem).filter(id => id && id !== 'minecraft:stone_button' && id !== 'minecraft:air');
    if (piezas.length) efSoltar(run, piezas[Math.floor(Math.random() * piezas.length)], 1);
  }
  if (ef('23b') && tipo === 'minecraft:creeper') {
    let cargado = false;
    try { cargado = !!e.isPowered(); } catch (x) { try { cargado = e.getNbt().getBoolean('powered'); } catch (x2) {} }
    if (cargado) {
      if (global.stDarDinero) global.stDarDinero(server, n, 20, 'Creeper cargado');
      efSoltar(run, 'minecraft:creeper_head', 1);
    }
  }
  // 16b: botín x2 (copia lo que suelta el mob, sin tocar objetos especiales con NBT)
  if (ef('16b') && normal) {
    let p = global.stXYZ(e);
    if (!p) return;
    let dim = global.stDimDe(e);
    let pos = `${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}`;
    server.scheduleInTicks(1, () => {
      let r = (c) => server.runCommandSilent(`execute in ${dim} positioned ${pos} run ${c}`);
      for (let i = 0; i < 6; i++) {
        r(`tag @e[type=minecraft:item,distance=..2,tag=!st_dup,nbt=!{Item:{tag:{}}},limit=1] add st_dupo`);
        r(`execute as @e[type=minecraft:item,tag=st_dupo] at @s run summon minecraft:item ~ ~ ~ {Tags:["st_dup","st_dupn"],Item:{id:"minecraft:stone",Count:1b}}`);
        r(`data modify entity @e[type=minecraft:item,tag=st_dupn,limit=1] Item set from entity @e[type=minecraft:item,tag=st_dupo,limit=1] Item`);
        r(`tag @e[type=minecraft:item,tag=st_dupn] remove st_dupn`);
        r(`tag @e[type=minecraft:item,tag=st_dupo] add st_dup`);
        r(`tag @e[type=minecraft:item,tag=st_dupo] remove st_dupo`);
      }
    });
  }
}); });

// Lista de anomalías activas para el Diario (87_diario.js): [{dia, tipo:'n1'|'n2'|'b', texto}]
global.stEfActivas = (server) => {
  let m = efLeer(server), r = [];
  Object.keys(m).forEach(k => {
    let d = parseInt(k), t = k.replace(/^\d+/, '');
    if (EF_TEXTOS[d] && EF_TEXTOS[d][t]) r.push({ dia: d, tipo: t, texto: EF_TEXTOS[d][t] });
  });
  return r.sort((a, b) => a.dia - b.dia || (a.tipo < b.tipo ? -1 : 1));
};

// Multiplicadores que usan otros scripts (economía, recompensas)
global.stEfMultDinero = (server, que) => {
  if (que === 'mob') return global.stEf(server, '5b') ? 2 : 1;
  if (que === 'elite') return global.stEf(server, '14b') ? 3 : 1;
  return 1;
};

// ============================================================
//  4) Comida
// ============================================================
ItemEvents.foodEaten(event => { global.stSeguro('93_anomalias (comida)', () => {
  let p = event.player;
  if (!p) return;
  let server = p.server, n = efNombre(p);
  let id = efIdItem(event.item);
  if (global.stEf(server, '15b') && id === 'minecraft:golden_apple') {
    server.scheduleInTicks(1, () => efPoc(server, n, 'minecraft:absorption', 120, 2));
  }
  if (global.stEf(server, '17n2') && EF_CARNE_CRUDA.indexOf(id) !== -1) efPoc(server, n, 'minecraft:nausea', 10, 0);
}); });

// ============================================================
//  5) Kit de reparación (buff día 10)
// ============================================================
let EF_KIT_ID = 'minecraft:flint';
let EF_KIT_NBT = `{starvios_kit:1b,Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],HideFlags:1,` +
  `display:{Name:'{"text":"🔧 Kit de reparación","color":"aqua","italic":false}',` +
  `Lore:['{"text":"Clic derecho sobre OTRO jugador","color":"gray","italic":false}',` +
  `'{"text":"para repararle un 40% de la armadura.","color":"gray","italic":false}']}}`;
global.stEfKit = [EF_KIT_ID, EF_KIT_NBT];
global.stEfKitUso = global.stEfKitUso || {};

ItemEvents.entityInteracted(event => {
  let p = event.player, t = event.target;
  if (!p || !t || String(event.hand) !== 'MAIN_HAND') return;
  let it = p.mainHandItem, nbt = null;
  try { nbt = it.nbt; } catch (e) {}
  if (!nbt || !nbt.contains('starvios_kit')) return;
  let server = p.server, n = efNombre(p);
  if (!t.isPlayer()) {
    server.runCommandSilent(`title ${n} actionbar {"text":"El kit solo sirve con otro jugador","color":"yellow"}`);
    event.cancel(); return;
  }
  let ahora = Date.now();
  if (ahora - (global.stEfKitUso[n] || 0) < 1000) { event.cancel(); return; }
  global.stEfKitUso[n] = ahora;
  let otro = efNombre(t);
  let piezas = efArmadura(t), arregladas = 0;
  piezas.forEach(a => {
    try {
      if (!a.isDamageableItem() || a.getDamageValue() <= 0) return;
      let max = Number(a.getMaxDamage());
      a.setDamageValue(Math.max(0, Number(a.getDamageValue()) - Math.round(max * 0.4)));
      arregladas++;
    } catch (e) {}
  });
  if (arregladas === 0) {
    server.runCommandSilent(`title ${n} actionbar {"text":"La armadura de ${otro} no necesita reparación","color":"yellow"}`);
    event.cancel(); return;
  }
  it.shrink(1);
  server.runCommandSilent(`execute at ${otro} run particle minecraft:wax_off ~ ~1 ~ 0.4 0.6 0.4 0.5 25`);
  server.runCommandSilent(`execute at ${otro} run playsound minecraft:block.anvil.use player @a[distance=..16] ~ ~ ~ 0.6 1.4`);
  server.runCommandSilent(`title ${n} actionbar {"text":"🔧 Reparaste la armadura de ${otro} (${arregladas} piezas)","color":"aqua"}`);
  server.runCommandSilent(`title ${otro} actionbar {"text":"🔧 ${n} reparó tu armadura","color":"aqua"}`);
  event.cancel();
});

// Recetas que dependen de anomalías (se aplican con /reload al activarlas)
ServerEvents.recipes(event => {
  let activos = '';
  try {
    let m = JsonIO.read(EF_ARCHIVO);
    if (m) activos = String(m.activos != null ? m.activos : m.get('activos'));
  } catch (e) {}
  let a = (k) => (',' + activos + ',').indexOf(',' + k + ',') !== -1;
  if (a('9b')) event.shapeless('minecraft:lightning_rod', ['minecraft:copper_ingot']).id('starvios:pararrayos_barato');
  if (a('10b')) event.shaped(Item.of(EF_KIT_ID, EF_KIT_NBT), [' I ', 'ILI', ' I '], {
    I: 'minecraft:iron_ingot', L: 'minecraft:leather'
  }).id('starvios:kit_reparacion');
  if (a('19b')) {
    event.remove({ id: 'minecraft:torch' });
    event.shaped('8x minecraft:torch', ['C', 'S'], { C: '#minecraft:coals', S: 'minecraft:stick' }).id('starvios:antorchas_x8');
  }
});

// ============================================================
//  6) Reloj: efectos por tiempo
// ============================================================
global.stEfTick = 0;
global.stEfHoraAnt = -1;
global.stEfDormia = global.stEfDormia || {};
global.stEfUltima = global.stEfUltima || {};
global.stEfSueno = -1;

let efCruzo = (ant, t, x) => ant >= 0 && ((ant < x && t >= x) || (ant > t && (x > ant || t >= x)));

ServerEvents.tick(event => { global.stSeguro('93_anomalias (reloj)', () => {
  global.stEfTick = (global.stEfTick || 0) + 1;
  let tick = global.stEfTick;
  let server = event.server;
  if (tick % 100 === 1) efCargar(server);
  let m = global.stEfMapa;
  if (!m || Object.keys(m).length === 0) {
    return;
  }
  let ef = (k) => !!m[k];
  let level = efNivel(server);
  if (!level) return;
  let t = efHora(level);
  let noche = t >= 13000 && t < 23000;

  // 19n1: noches un 50% más largas (1 de cada 3 ticks el reloj no avanza)
  if (ef('19n1') && noche && tick % 3 === 0) { try { level.setDayTime(Number(level.getDayTime()) - 1); } catch (e) {} }

  if (tick % 10 !== 0) return;
  let dia = global.stDia(server);
  let vivos = efVivos(server);

  // Cada medio segundo: estado de cada jugador
  vivos.forEach(p => {
    let n = efNombre(p), h = efVida(p);
    if (ef('8n2')) {
      let dormido = false;
      try { dormido = !!p.isSleeping(); } catch (e) {}
      if (global.stEfDormia[n] && !dormido) efPoc(server, n, 'minecraft:hunger', 20, 0);
      global.stEfDormia[n] = dormido;
    }
    if (ef('15n1')) {
      let comida = 20;
      try { comida = Number(p.getFoodData().getFoodLevel()); } catch (e) {}
      if (comida < 6) efPoc(server, n, 'minecraft:weakness', 2, 0);
    }
    if (ef('21n1') && h < 6) efPoc(server, n, 'minecraft:slowness', 2, 0);
    if (ef('22b') && h > 0 && h <= 2 && Date.now() - (global.stEfUltima[n] || 0) > 60000) {
      global.stEfUltima[n] = Date.now();
      efPoc(server, n, 'minecraft:resistance', 5, 1);
      server.runCommandSilent(`title ${n} actionbar {"text":"✦ ¡Última resistencia!","color":"gold","bold":true}`);
      server.runCommandSilent(`execute at ${n} run playsound minecraft:item.totem.use player ${n} ~ ~ ~ 0.5 1.5`);
    }
  });

  if (tick % 20 !== 0) return;
  let ant = global.stEfHoraAnt;
  global.stEfHoraAnt = t;


  // Amanecer
  if (efCruzo(ant, t, 0)) {
    if (ef('17b')) vivos.forEach(p => server.runCommandSilent(`give ${efNombre(p)} minecraft:cooked_beef 8`));
    if (ef('21b')) vivos.forEach(p => efPoc(server, efNombre(p), 'minecraft:regeneration', 10, 0));
    if (ef('25b')) vivos.forEach(p => efPoc(server, efNombre(p), 'minecraft:strength', 60, 0));
    if (ef('26b')) vivos.forEach(p => efPoc(server, efNombre(p), 'minecraft:absorption', 600, 0));
  }
  // Anochecer
  if (efCruzo(ant, t, 12500)) {
    if (ef('15n2')) vivos.forEach(p => efPoc(server, efNombre(p), 'minecraft:weakness', 60, 0));
    if (ef('23n1')) server.runCommandSilent('weather thunder 11000');
  }
  // Medianoche
  if (efCruzo(ant, t, 18000) && ef('3n1') && !efTormenta(level)) server.runCommandSilent('weather thunder 6000');

  // 10n2: de noche los zombis tienen Velocidad II
  if (ef('10n2') && noche && tick % 100 === 0) {
    ['minecraft:zombie', 'minecraft:husk', 'minecraft:zombie_villager'].forEach(z =>
      server.runCommandSilent(`execute in minecraft:overworld run effect give @e[type=${z}] minecraft:speed 7 1 true`));
  }

  let fuera = vivos.filter(p => efMundo(p) && efCielo(p));
  let tormenta = efTormenta(level);

  // 3n2: la armadura de hierro atrae rayos bajo la tormenta
  if (ef('3n2') && tormenta && tick % 1200 === 0) {
    fuera.forEach(p => {
      let hierro = efArmadura(p).some(a => efIdItem(a).indexOf('iron_') !== -1);
      if (hierro && Math.random() < 0.10) {
        let s = () => (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random()).toFixed(1);
        server.runCommandSilent(`execute at ${efNombre(p)} run summon minecraft:lightning_bolt ~${s()} ~ ~${s()}`);
      }
    });
  }
  // 22n1: rayos aleatorios cerca de los jugadores en tormenta
  if (ef('22n1') && tormenta && tick % 400 === 0) {
    fuera.forEach(p => {
      if (Math.random() >= 0.2) return;
      let s = () => ((Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8)).toFixed(1);
      server.runCommandSilent(`execute at ${efNombre(p)} run summon minecraft:lightning_bolt ~${s()} ~ ~${s()}`);
    });
  }

  // Aparece algo a ~20 bloques de un jugador en la superficie
  let invocarCerca = (p, id, cant, tag) => {
    let q = global.stXYZ(p);
    if (!q || global.stObjEnSpawn(p)) return false;
    let ang = Math.random() * 6.2832;
    let cx = Math.floor(q.x + Math.cos(ang) * 20), cz = Math.floor(q.z + Math.sin(ang) * 20);
    for (let i = 0; i < cant; i++) server.runCommandSilent(`execute in minecraft:overworld run summon ${id} ${cx} 320 ${cz} {Tags:["starvios_extra","${tag}"],PersistenceRequired:1b}`);
    server.runCommandSilent(`execute in minecraft:overworld run spreadplayers ${cx} ${cz} 0 4 false @e[tag=${tag}]`);
    return true;
  };

  // 18n1: patrullas de vindicadores por la noche (cada 3 min, 35% por jugador)
  if (ef('18n1') && noche && tick % 3600 === 0) {
    fuera.forEach(p => {
      if (Math.random() >= 0.35) return;
      if (invocarCerca(p, 'minecraft:vindicator', efAzar(2, 3), 'st_ef_patrulla')) {
        server.runCommandSilent(`execute at ${efNombre(p)} run playsound minecraft:event.raid.horn hostile ${efNombre(p)} ~ ~ ~ 0.6 1`);
        server.runCommandSilent(`tag @e[tag=st_ef_patrulla] remove st_ef_patrulla`);
      }
    });
  }
  // 14n1: élites de día (cada minuto, 20% por jugador en la superficie)
  if (ef('14n1') && !noche && tick % 1200 === 0) {
    let tipos = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider'];
    fuera.forEach(p => {
      if (Math.random() >= 0.2) return;
      let tipo = tipos[Math.floor(Math.random() * tipos.length)];
      if (invocarCerca(p, tipo, 1, 'st_ef_elite')) {
        global.stHacerEliteSel(server, '@e[tag=st_ef_elite]', tipo);
        server.runCommandSilent(`effect give @e[tag=st_ef_elite] minecraft:fire_resistance infinite 0 true`);
        server.runCommandSilent(`tag @e[tag=st_ef_elite] remove st_ef_elite`);
      }
    });
  }
  // 14n2: élites con Velocidad II
  if (ef('14n2') && tick % 200 === 0) {
    server.getAllLevels().forEach(lv => {
      let d = global.stDimDe(lv);
      server.runCommandSilent(`execute in ${d} run effect give @e[tag=starvios_elite] minecraft:speed infinite 1 true`);
    });
  }
}); });

// Segunda oportunidad (buff día 1): la primera muerte de cada jugador se evita UNA vez en toda la serie.
// La llama 30_eliminacion antes de eliminar al jugador. Devuelve true si lo salvó (y cancela la muerte).
global.stSegundaOportunidad = (event, p) => {
  let server = p.server;
  if (!global.stEf(server, '1b')) return false;
  let n = efNombre(p);
  let usados = [];
  try { usados = JSON.parse(server.persistentData.getString('starvios_segunda') || '[]'); } catch (e) {}
  if (usados.indexOf(n) !== -1) return false;
  usados.push(n);
  server.persistentData.putString('starvios_segunda', JSON.stringify(usados));
  try { p.setHealth(4); } catch (e) {}
  efPoc(server, n, 'minecraft:regeneration', 10, 1);
  efPoc(server, n, 'minecraft:absorption', 5, 1);
  efPoc(server, n, 'minecraft:fire_resistance', 40, 0);
  server.runCommandSilent(`execute at ${n} run particle minecraft:totem_of_undying ~ ~1 ~ 0.5 1 0.5 0.5 150`);
  server.runCommandSilent(`execute at ${n} run playsound minecraft:item.totem.use player @a[distance=..32] ~ ~ ~ 1 1`);
  server.runCommandSilent(`title ${n} times 5 50 15`);
  server.runCommandSilent(`title ${n} title {"text":"💀 SEGUNDA OPORTUNIDAD","color":"gold","bold":true}`);
  server.runCommandSilent(`title ${n} subtitle {"text":"No habrá otra.","color":"gray"}`);
  server.runCommandSilent(`tellraw @a ["",{"text":"💀 ","color":"gold"},{"text":"${n}","color":"yellow","bold":true},{"text":" engañó a la muerte… por esta única vez.","color":"gold"}]`);
  event.cancel();
  return true;
};

// 1n1: las herramientas de madera y piedra se gastan el doble
let EF_HERR = /^minecraft:(wooden|stone)_(pickaxe|axe|shovel|hoe|sword)$/;
let efGastar = (p) => {
  try {
    let it = p.mainHandItem;
    if (!it || it.isEmpty() || !EF_HERR.test(efIdItem(it))) return;
    let d = Number(it.getDamageValue()) + 1;
    if (d >= Number(it.getMaxDamage())) {
      it.shrink(1);
      p.server.runCommandSilent(`execute at ${efNombre(p)} run playsound minecraft:entity.item.break player @a[distance=..8] ~ ~ ~ 1 1`);
    } else it.setDamageValue(d);
  } catch (e) {}
};
BlockEvents.broken(event => {
  let p = event.player;
  if (!p || !global.stEf(p.server, '1n1')) return;
  try { if (p.isCreative()) return; } catch (e) {}
  efGastar(p);
});
EntityEvents.hurt(event => {
  let a = null;
  try { a = event.source.getEntity(); } catch (e) {}
  if (!a || !a.isPlayer() || !global.stEf(a.server, '1n1')) return;
  try { if (event.source.getDirectEntity() !== a) return; } catch (e) {}
  efGastar(a);
});

// ============================================================
//  7) Activar / anunciar
// ============================================================
let efAnunciar = (server, dia, tipo) => {
  let a = EF_ANUNCIO[tipo];
  // Aviso arriba a la derecha: recuadro tipo chat (86_hud.js). Si está apagado, toast de logro.
  if (global.stHudActivo && global.stHudActivo()) {
    let cab = { n1: '§c⚠ NUEVA ANOMALÍA §8· §7Día ' + dia, n2: '§4☣ ANOMALÍA CONFIRMADA §8· §7Día ' + dia, b: '§6✦ BENDICIÓN §8· §7Día ' + dia }[tipo];
    let borde = { n1: '#E03030', n2: '#8B0000', b: '#F0B030' }[tipo];
    global.stAvisoHud(server, cab, a.titulo, EF_TEXTOS[dia][tipo], borde);
  } else global.stToast(server, '@a', `${tipo}_${dia}`);
  a.sonidos.forEach((s, i) => server.scheduleInTicks(i * 12, () =>
    server.runCommandSilent(`execute as @a at @s run playsound ${s[0]} master @s ~ ~ ~ 1 ${s[1]}`)));
};

let efActivar = (server, dia, tipo, avisar) => {
  if (EF_DESCANSO.indexOf(dia) !== -1) { avisar(`§e[Starvios] El día ${dia} es día de jefe: es de descanso, no tiene nerfs ni buff.`); return 0; }
  if (!EF_TEXTOS[dia]) { avisar(`§c[Starvios] El día ${dia} no existe (1-28).`); return 0; }
  let k = `${dia}${tipo}`;
  let m = efLeer(server);
  let ya = !!m[k];
  m[k] = true;
  efGuardar(server, m);
  if (!global.stActivo(server)) avisar('§e[Starvios] Ojo: el evento está desactivado (/starvios activar). La anomalía queda guardada y funcionará al activarlo.');
  efAnunciar(server, dia, tipo);
  if (EF_CON_RECETA.indexOf(k) !== -1 && !ya) {
    avisar('§7[Starvios] Recargando recetas (/reload) en 2 segundos…');
    server.scheduleInTicks(40, () => server.runCommandSilent('reload'));
  }
  if (k === '17n1') avisar('§7[Starvios] El de los cultivos necesita el archivo startup_scripts/starvios_cultivos.js (ya instalado y con el servidor reiniciado al menos una vez).');
  avisar(`§a[Starvios] Activado: día ${dia} · ${EF_NOMBRE[tipo]}${ya ? ' (ya lo estaba, se volvió a anunciar)' : ''}.`);
  return 1;
};

let efQuitar = (server, dia, tipo, avisar) => {
  let k = `${dia}${tipo}`;
  let m = efLeer(server);
  if (!m[k]) { avisar(`§e[Starvios] Día ${dia} · ${EF_NOMBRE[tipo]} no estaba activo.`); return 0; }
  delete m[k];
  efGuardar(server, m);
  if (EF_CON_RECETA.indexOf(k) !== -1) server.scheduleInTicks(40, () => server.runCommandSilent('reload'));
  avisar(`§a[Starvios] Desactivado: día ${dia} · ${EF_NOMBRE[tipo]}. (Los mobs que ya aparecieron se quedan como están.)`);
  return 1;
};

let efLista = (server, enviar, admin) => {
  let m = efLeer(server);
  let claves = Object.keys(m).sort((a, b) => parseInt(a) - parseInt(b) || (a < b ? -1 : 1));
  if (!claves.length) { enviar('["",{"text":"No hay anomalías activas.","color":"gray"}]'); return; }
  enviar('{"text":"━━ Anomalías activas ━━","color":"dark_purple","bold":true}');
  claves.forEach(k => {
    let d = parseInt(k), t = k.replace(/^\d+/, '');
    if (!EF_TEXTOS[d] || !EF_TEXTOS[d][t]) return;
    let col = t === 'b' ? 'green' : 'red';
    let quitar = admin ? `,{"text":" [quitar]","color":"dark_gray","clickEvent":{"action":"run_command","value":"/starvios quitar ${t === 'b' ? 'buff' : t === 'n1' ? 'nerf1' : 'nerf2'} ${d}"}}` : '';
    enviar(`["",{"text":"Día ${d} · ${EF_NOMBRE[t]}: ","color":"${col}"},{"text":"${global.stEsc(EF_TEXTOS[d][t])}","color":"gray"}${quitar}]`);
  });
};

ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  let raw = (ctx) => (json) => {
    let p = ctx.source.player;
    if (p) ctx.source.server.runCommandSilent(`tellraw ${efNombre(p)} ${json}`);
    else ctx.source.sendSystemMessage(Text.of(json.replace(/"[a-zA-Z]+":/g, '').replace(/[{}\[\]"]/g, '')));
  };

  let activador = (nombre) => Commands.literal(nombre).then(Commands.argument('dia', Arguments.INTEGER.create(event))
    .executes(ctx => efActivar(ctx.source.server, Arguments.INTEGER.getResult(ctx, 'dia'), EF_TIPOS[nombre], decir(ctx))));
  let quitador = (nombre) => Commands.literal(nombre).then(Commands.argument('dia', Arguments.INTEGER.create(event))
    .executes(ctx => efQuitar(ctx.source.server, Arguments.INTEGER.getResult(ctx, 'dia'), EF_TIPOS[nombre], decir(ctx))));

  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(activador('nerf1')).then(activador('nerf2')).then(activador('buff'))
    .then(Commands.literal('quitar').then(quitador('nerf1')).then(quitador('nerf2')).then(quitador('buff')))
    .then(Commands.literal('efectos')
      .executes(ctx => { efLista(ctx.source.server, raw(ctx), true); return 1; })
      .then(Commands.literal('reset').executes(ctx => {
        let server = ctx.source.server;
        let teniaReceta = EF_CON_RECETA.some(k => efLeer(server)[k]);
        efGuardar(server, {});
        server.persistentData.putString('starvios_segunda', '[]');
        if (teniaReceta) server.scheduleInTicks(40, () => server.runCommandSilent('reload'));
        decir(ctx)('§a[Starvios] Todas las anomalías desactivadas.');
        return 1;
      }))));

  event.register(Commands.literal('anomalias').executes(ctx => { efLista(ctx.source.server, raw(ctx), false); return 1; }));
});
