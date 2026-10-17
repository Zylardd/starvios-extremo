// ============================================================
//  STARVIOS - DIFICULTAD DE MOBS SEGÚN EL DÍA
// ============================================================

// UUIDs fijos para que los modificadores no se dupliquen
let UUID_VIDA  = '5a7c1e00-0000-4000-8000-000000000001';
let UUID_DAÑO  = '5a7c1e00-0000-4000-8000-000000000002';
let UUID_VELOC = '5a7c1e00-0000-4000-8000-000000000003';

EntityEvents.spawned(event => {
  let e = event.entity;
  if (!e || e.isPlayer() || !e.isLiving() || !e.isMonster()) return;

  let server = e.server;
  if (!server) return;
  let dia = global.stDia(server);
  if (dia <= 0) return;

  let tipo = String(e.type);
  if (global.STARVIOS.sinMultiplicador.indexOf(tipo) !== -1) return;

  // Evita aplicar dos veces cuando el chunk se vuelve a cargar
  if (e.persistentData.getBoolean('starvios')) return;
  e.persistentData.putBoolean('starvios', true);

  // Se aplica 1 tick después, cuando la entidad ya está en el mundo
  server.scheduleInTicks(1, () => {
    if (!e.isAlive()) return;
    let run = (c) => e.runCommandSilent(c);

    let vida = global.stEscala('vidaMobs', dia);
    if (vida > 1) {
      run(`attribute @s minecraft:generic.max_health modifier add ${UUID_VIDA} starvios_vida ${(vida - 1).toFixed(2)} multiply`);
      e.setHealth(9999); // se ajusta solo al nuevo máximo
    }

    let daño = global.stEscala('dañoMobs', dia);
    if (daño > 1) {
      run(`attribute @s minecraft:generic.attack_damage modifier add ${UUID_DAÑO} starvios_dano ${(daño - 1).toFixed(2)} multiply`);
    }

    if (Math.random() < global.stEscala('mobsResistencia', dia)) {
      run(`effect give @s minecraft:resistance infinite 0 true`);
    }
    if (global.stActiva('mobsConFuerza', dia)) {
      run(`effect give @s minecraft:strength infinite 0 true`);
    }

    // --- Por tipo ---
    if (tipo === 'minecraft:creeper') {
      if (Math.random() < global.stEscala('creeperCargado', dia)) run(`data merge entity @s {powered:1b}`);
    }

    if (tipo === 'minecraft:zombie' || tipo === 'minecraft:husk' || tipo === 'minecraft:drowned') {
      if (global.stActiva('zombisRapidos', dia)) {
        run(`attribute @s minecraft:generic.movement_speed modifier add ${UUID_VELOC} starvios_veloc 0.15 multiply`);
      }
      let mat = null;
      if (Math.random() < global.stEscala('zombiArmaduraHierro', dia)) mat = 'iron';
      else if (Math.random() < global.stEscala('zombiArmaduraMalla', dia)) mat = 'chainmail';
      if (mat) {
        run(`item replace entity @s armor.head with minecraft:${mat}_helmet`);
        run(`item replace entity @s armor.chest with minecraft:${mat}_chestplate`);
        run(`item replace entity @s armor.legs with minecraft:${mat}_leggings`);
        run(`item replace entity @s armor.feet with minecraft:${mat}_boots`);
      }
    }

    if ((tipo === 'minecraft:skeleton' || tipo === 'minecraft:stray') && global.stActiva('esqueletosFuego', dia)) {
      run(`item replace entity @s weapon.mainhand with minecraft:bow{Enchantments:[{id:"minecraft:flame",lvl:1s}]}`);
    }

    // --- MINI-JEFE (ÉLITE) ---
    let el = global.STARVIOS.elites;
    if (el && el.activa && el.tipos[tipo] && Math.random() < global.stEscala('probElite', dia)) {
      global.stHacerElite(e, tipo);
    }
  });
});

// Convierte un mob en mini-jefe. También lo usa /starvios elite (pruebas).
global.stHacerElite = (e, tipo) => {
  let el = global.STARVIOS.elites;
  let run = (c) => e.runCommandSilent(c);
  let nombre = el.tipos[tipo] || 'Mob';
  run(`tag @s add starvios_elite`);
  run(`data merge entity @s {CustomName:'{"text":"☠ ${nombre} Élite","color":"dark_purple","bold":true}',CustomNameVisible:1b,PersistenceRequired:1b,ArmorDropChances:[0f,0f,0f,0f],HandDropChances:[0f,0f]}`);
  run(`attribute @s minecraft:generic.max_health modifier add 5a7c1e00-0000-4000-8000-0000000000e1 starvios_elite_vida ${(el.vida - 1).toFixed(2)} multiply`);
  run(`attribute @s minecraft:generic.attack_damage modifier add 5a7c1e00-0000-4000-8000-0000000000e2 starvios_elite_dano ${(el.daño - 1).toFixed(2)} multiply`);
  run(`attribute @s minecraft:generic.knockback_resistance base set 0.6`);
  let ench = '{Enchantments:[{id:"minecraft:protection",lvl:2s}]}';
  run(`item replace entity @s armor.head with minecraft:diamond_helmet${ench}`);
  run(`item replace entity @s armor.chest with minecraft:iron_chestplate${ench}`);
  run(`item replace entity @s armor.legs with minecraft:iron_leggings${ench}`);
  run(`item replace entity @s armor.feet with minecraft:diamond_boots${ench}`);
  if (tipo.indexOf('skeleton') !== -1 || tipo === 'minecraft:stray' || tipo === 'minecraft:pillager') {
    // conserva su arma a distancia
  } else if (tipo !== 'minecraft:witch' && tipo !== 'minecraft:spider') {
    run(`item replace entity @s weapon.mainhand with minecraft:iron_sword{Enchantments:[{id:"minecraft:sharpness",lvl:2s}]}`);
  }
  run(`effect give @s minecraft:speed infinite 0 true`);
  run(`effect give @s minecraft:resistance infinite 0 true`);
  e.setHealth(99999);
};

// Arañas: veneno y ceguera al golpear jugadores
EntityEvents.hurt(event => {
  let victima = event.entity;
  if (!victima || !victima.isPlayer()) return;
  let atacante = event.source.actual;
  if (!atacante) return;
  let tipo = String(atacante.type);
  if (tipo !== 'minecraft:spider' && tipo !== 'minecraft:cave_spider') return;

  let dia = global.stDia(victima.server);
  if (global.stActiva('arañaVeneno', dia)) victima.runCommandSilent(`effect give @s minecraft:poison 3 0`);
  if (global.stActiva('arañaCeguera', dia)) victima.runCommandSilent(`effect give @s minecraft:blindness 3 0`);
});
