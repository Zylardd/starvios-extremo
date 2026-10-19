// priority: 800
// ============================================================
//  STARVIOS - DIFICULTAD DE MOBS SEGÚN EL DÍA
// ============================================================

// UUIDs fijos para que los modificadores no se dupliquen
let UUID_VIDA  = '5a7c1e00-0000-4000-8000-000000000001';
let UUID_DAÑO  = '5a7c1e00-0000-4000-8000-000000000002';
let UUID_VELOC = '5a7c1e00-0000-4000-8000-000000000003';

// Muertos vivientes que se queman al sol
let NO_MUERTOS = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:stray', 'minecraft:drowned',
                  'minecraft:zombie_villager', 'minecraft:wither_skeleton'];
// Monstruos que reciben refuerzos según el día
let REFUERZOS = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider', 'minecraft:creeper',
                 'minecraft:husk', 'minecraft:stray', 'minecraft:drowned', 'minecraft:zombie_villager', 'minecraft:witch'];

EntityEvents.spawned(event => {
  let e = event.entity;
  if (!e || e.isPlayer() || !e.isLiving() || !e.isMonster()) return;

  let server = e.server;
  if (!server) return;
  let dia = global.stDia(server);
  if (dia <= 0) return;

  let tipo = String(e.type);
  try {
    let tg = e.getTags();
    if (tg.contains('starvios_jefe') || tg.contains('starvios_cripta_jefe') || tg.contains('starvios_sin_mejora')) return;
  } catch (err) {}
  if (global.STARVIOS.sinMultiplicador.indexOf(tipo) !== -1) return;

  // Evita aplicar dos veces cuando el chunk se vuelve a cargar
  if (e.persistentData.getBoolean('starvios')) return;
  e.persistentData.putBoolean('starvios', true);

  // Se aplica 1 tick después, cuando la entidad ya está en el mundo
  server.scheduleInTicks(1, () => {
    if (!e.isAlive()) return;
    let run = global.stComoEntidad(e);

    let vida = global.stEscala('vidaMobs', dia);
    if (vida > 1) {
      run(`attribute @s minecraft:generic.max_health modifier add ${UUID_VIDA} starvios_vida ${(vida - 1).toFixed(2)} multiply`);
      try { e.setHealth(9999); } catch (err) { run(`data merge entity @s {Health:100000f}`); } // se ajusta al nuevo máximo
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

    // --- Desde el día 7 no se queman al sol (un botón como "casco" invisible) ---
    if (global.stActiva('sinQuemarseAlSol', dia) && NO_MUERTOS.indexOf(tipo) !== -1) {
      run(`execute unless data entity @s ArmorItems[3].id run item replace entity @s armor.head with minecraft:stone_button`);
      run(`data modify entity @s ArmorDropChances[3] set value 0f`);
    }
    if (global.stActiva('sinQuemarseAlSol', dia) && tipo === 'minecraft:phantom') {
      run(`effect give @s minecraft:fire_resistance infinite 0 true`);
    }

    // --- Refuerzos: cada día aparecen más monstruos junto a los naturales ---
    let extra = global.stEscala('mobsExtra', dia);
    let esExtra = false, esCripta = false;
    try { let tg = String(e.getTags()); esExtra = tg.indexOf('starvios_extra') !== -1; esCripta = tg.indexOf('starvios_cripta') !== -1 || tg.indexOf('starvios_guardian') !== -1 || tg.indexOf('starvios_capitan') !== -1; } catch (err) {}
    if (extra > 0 && !esExtra && !esCripta && REFUERZOS.indexOf(tipo) !== -1 && !global.stObjEnSpawn(e)) {
      let n = Math.floor(extra) + (Math.random() < extra % 1 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        // tope: si ya hay 10 o más del mismo tipo cerca, no se añaden más
        run(`execute store result score #cerca st_tmp if entity @e[type=${tipo},distance=..24]`);
        run(`execute if score #cerca st_tmp matches ..9 run summon ${tipo} ~${(Math.random() * 4 - 2).toFixed(1)} ~ ~${(Math.random() * 4 - 2).toFixed(1)} {Tags:["starvios_extra"]}`);
      }
    }

    // --- MINI-JEFE (ÉLITE) ---
    let el = global.STARVIOS.elites;
    if (el && el.activa && el.tipos[tipo] && Math.random() < global.stEscala('probElite', dia)) {
      global.stHacerElite(e, tipo);
    }
  });
});

// Convierte un mob en mini-jefe.
// run(c) ejecuta el comando c "como" el mob (@s) y en su posición.
global.stHacerEliteCon = (run, tipo) => {
  let el = global.STARVIOS.elites;
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
  let distancia = tipo.indexOf('skeleton') !== -1 || tipo === 'minecraft:stray' || tipo === 'minecraft:pillager';
  if (!distancia && tipo !== 'minecraft:witch' && tipo !== 'minecraft:spider') {
    run(`item replace entity @s weapon.mainhand with minecraft:iron_sword{Enchantments:[{id:"minecraft:sharpness",lvl:2s}]}`);
  }
  run(`effect give @s minecraft:speed infinite 0 true`);
  run(`effect give @s minecraft:resistance infinite 0 true`);
  run(`data merge entity @s {Health:100000f}`);   // vida llena hasta el nuevo máximo
};

// Para un mob concreto (aparición natural)
global.stHacerElite = (e, tipo) => global.stHacerEliteCon(global.stComoEntidad(e), tipo);

// Para todos los mobs que encajen con un selector (comandos, mazmorras)
global.stHacerEliteSel = (server, selector, tipo) =>
  global.stHacerEliteCon((c) => server.runCommandSilent(`execute as ${selector} at @s run ${c}`), tipo);
