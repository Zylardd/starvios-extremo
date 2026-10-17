// ============================================================
//  STARVIOS - PROTECCIÓN DEL SPAWN (la isla)
//  - Nadie (salvo OP) rompe ni coloca bloques, ni usa cubos, fuego o TNT
//  - No se pisotean cultivos y las explosiones no rompen nada
//  - No aparecen mobs hostiles y los que entren desaparecen
//  La zona se define en 00_config.js -> zonaProtegida
// ============================================================

global.stEnSpawn = (level, x, z) => {
  let zp = global.STARVIOS.zonaProtegida;
  if (!zp || !zp.activa) return false;
  if (String(level.dimension) !== 'minecraft:overworld') return false;
  return x >= Math.min(zp.x1, zp.x2) && x <= Math.max(zp.x1, zp.x2) + 1 &&
         z >= Math.min(zp.z1, zp.z2) && z <= Math.max(zp.z1, zp.z2) + 1;
};

let stPuedeEditar = (p) => p && p.hasPermissions(2);

let stAvisar = (p) => {
  p.server.runCommandSilent(`title ${p.getName().getString()} actionbar {"text":"🛡 Zona protegida del spawn","color":"gold"}`);
};

// --- Romper bloques ---
BlockEvents.broken(event => {
  let p = event.player, b = event.block;
  if (stPuedeEditar(p)) return;
  if (global.stEnSpawn(b.level, b.x, b.z)) { if (p) stAvisar(p); event.cancel(); }
});

// --- Colocar bloques ---
BlockEvents.placed(event => {
  let p = event.player, b = event.block;
  if (stPuedeEditar(p)) return;
  if (global.stEnSpawn(b.level, b.x, b.z)) { if (p) stAvisar(p); event.cancel(); }
});

// --- Pisotear cultivos ---
BlockEvents.farmlandTrampled(event => {
  let b = event.block;
  if (global.stEnSpawn(b.level, b.x, b.z)) event.cancel();
});

// --- Cubos, fuego y similares (no pasan por "placed") ---
let ITEMS_PROHIBIDOS = [
  'minecraft:water_bucket', 'minecraft:lava_bucket', 'minecraft:powder_snow_bucket',
  'minecraft:bucket', 'minecraft:flint_and_steel', 'minecraft:fire_charge',
  'minecraft:end_crystal', 'minecraft:tnt_minecart', 'minecraft:bone_meal'
];
let stBloquearUso = (event) => {
  let p = event.player;
  if (!p || stPuedeEditar(p)) return;
  let id = String(event.item.id);
  if (ITEMS_PROHIBIDOS.indexOf(id) === -1 && id.indexOf('bucket') === -1) return;
  if (global.stEnSpawn(p.level, p.x, p.z)) { stAvisar(p); event.cancel(); }
};
ItemEvents.rightClicked(stBloquearUso);
BlockEvents.rightClicked(event => {
  let p = event.player;
  if (!p || stPuedeEditar(p)) return;
  let id = String(event.item.id);
  if (ITEMS_PROHIBIDOS.indexOf(id) === -1 && id.indexOf('bucket') === -1) return;
  let b = event.block;
  if (global.stEnSpawn(b.level, b.x, b.z)) { stAvisar(p); event.cancel(); }
});

// --- Explosiones (creepers, TNT, jefes): se cancelan dentro de la zona ---
LevelEvents.beforeExplosion(event => {
  if (global.stEnSpawn(event.level, event.x, event.z)) event.cancel();
});

// --- Armaduras/soportes y animales del spawn no se pueden atacar (salvo OP) ---
EntityEvents.hurt(event => {
  let e = event.entity;
  if (!e || e.isPlayer() || e.isMonster()) return;
  let atacante = event.source.player;
  if (!atacante || stPuedeEditar(atacante)) return;
  if (String(e.type) !== 'minecraft:armor_stand' && !e.isAnimal()) return;
  if (global.stEnSpawn(e.level, e.x, e.z)) event.cancel();
});

// --- Mobs hostiles: no aparecen en la zona ---
EntityEvents.checkSpawn(event => {
  let e = event.entity;
  if (e && e.isMonster() && global.stEnSpawn(event.level, e.x, e.z)) event.cancel();
});

// Limpieza cada 5 s de hostiles que hayan entrado caminando (los jefes de /starvios jefe se respetan)
let stLimpieza = 0;
ServerEvents.tick(event => {
  if (++stLimpieza % 100 !== 0) return;
  let zp = global.STARVIOS.zonaProtegida;
  if (!zp || !zp.activa) return;
  let level = event.server.getLevel('minecraft:overworld');
  if (!level) return;
  level.getEntities().forEach(e => {
    if (!e.isLiving() || e.isPlayer() || !e.isMonster()) return;
    if (e.getTags().contains('starvios_jefe')) return;
    if (global.stEnSpawn(level, e.x, e.z)) e.discard();
  });
});

// ============================================================
//  END DESACTIVADO
//  1) No se pueden poner Ojos de Ender en el marco del portal
//  2) Si alguien llega al End de alguna forma, vuelve al spawn (10_dias.js)
// ============================================================
BlockEvents.rightClicked(event => {
  if (String(event.block.id) !== 'minecraft:end_portal_frame') return;
  if (String(event.item.id) !== 'minecraft:ender_eye') return;
  let p = event.player;
  if (p) p.server.runCommandSilent(`title ${p.getName().getString()} actionbar {"text":"El End está cerrado en Starvios","color":"dark_purple"}`);
  event.cancel();
});
