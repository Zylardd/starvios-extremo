// priority: 58
// ============================================================
//  STARVIOS - AJUSTES DEL MUNDO
//  1) Más monstruos en la superficie, de día y de noche  (00_config.js -> mobsSuperficie)
//  2) Élites y Capitanes rompen bloques para llegar a ti  (00_config.js -> rompeBloques)
//  3) Limpieza del inventario: quita el libro "Livestock Guide" y cambia las monedas
//     viejas de Lightman's Currency (cobre, hierro...) por Starcoins en el banco
//  4) Al entrar: mapa en "juego limpio" (sin modo cueva ni radar de entidades en Xaero)
//     y el punto "Base" para añadirlo al mapa
// ============================================================

let AJ_CONTAR = ['minecraft:zombie', 'minecraft:husk', 'minecraft:skeleton', 'minecraft:stray', 'minecraft:spider',
                 'minecraft:creeper', 'minecraft:witch', 'minecraft:enderman', 'minecraft:drowned'];

let ajHora = (server) => {
  try { return Number(server.getLevel('minecraft:overworld').getDayTime()) % 24000; } catch (e) { return 6000; }
};
let ajCielo = (p) => { try { return !!p.level.canSeeSky(p.blockPosition()); } catch (e) { return true; } };

// ---------- 1) Más monstruos en la superficie ----------
global.stAjTick = 0;
ServerEvents.tick(event => { global.stSeguro('89_ajustes (superficie)', () => {
  global.stAjTick = (global.stAjTick || 0) + 1;
  let cfg = global.STARVIOS.mobsSuperficie;
  if (!cfg || !cfg.activa || global.stAjTick % ((cfg.cada || 20) * 20) !== 0) return;
  let server = event.server;
  if (global.stDia(server) <= 0 || global.stCine) return;
  let t = ajHora(server);
  let modo = t >= 13000 && t < 23000 ? cfg.noche : cfg.dia;
  server.players.forEach(p => {
    try { if (p.isSpectator() || p.isCreative()) return; } catch (e) {}
    if (global.stDimDe(p) !== 'minecraft:overworld' || !ajCielo(p) || global.stObjEnSpawn(p)) return;
    let n = p.getName().getString();
    let q = global.stXYZ(p);
    if (!q || (global.stEnArena && global.stEnArena(server, q.x, q.y, q.z))) return;
    // ¿Cuántos monstruos hay ya cerca?
    let cerca = 0;
    AJ_CONTAR.forEach(tp => { cerca += Number(server.runCommandSilent(`execute at ${n} if entity @e[type=${tp},distance=..48]`)) || 0; });
    let poner = Math.min(modo.cantidad, modo.maximo - cerca);
    for (let i = 0; i < poner; i++) {
      let ang = Math.random() * 6.2832, r = 22 + Math.random() * 10;
      let cx = Math.floor(q.x + Math.cos(ang) * r), cz = Math.floor(q.z + Math.sin(ang) * r);
      if (global.stEnSpawn(server.getLevel('minecraft:overworld'), cx, cz)) continue;
      let tipo = modo.tipos[Math.floor(Math.random() * modo.tipos.length)];
      server.runCommandSilent(`execute in minecraft:overworld run summon ${tipo} ${cx} 320 ${cz} {Tags:["starvios_extra","st_aj_nuevo"]}`);
      server.runCommandSilent(`execute in minecraft:overworld run spreadplayers ${cx} ${cz} 0 3 false @e[tag=st_aj_nuevo]`);
      server.runCommandSilent(`tag @e[tag=st_aj_nuevo] remove st_aj_nuevo`);
    }
  });
}); });

// ---------- 2) Élites y Capitanes rompen bloques ----------
let ajSolido = (id) => id && id !== 'minecraft:air' && id !== 'minecraft:cave_air' && id !== 'minecraft:void_air' &&
  id.indexOf('water') === -1 && id.indexOf('lava') === -1;
ServerEvents.tick(event => { global.stSeguro('89_ajustes (rompen bloques)', () => {
  let cfg = global.STARVIOS.rompeBloques;
  if (!cfg || !cfg.activa || (global.stAjTick || 0) % 20 !== 5) return;
  let server = event.server;
  if (global.stDia(server) <= 0) return;
  let level = server.getLevel('minecraft:overworld');
  if (!level) return;
  let lista = [];
  level.getEntities().forEach(e => {
    let tg = '';
    try { tg = String(e.getTags()); } catch (x) { return; }
    if (tg.indexOf('starvios_elite') !== -1 || tg.indexOf('starvios_capitan') !== -1) lista.push(e);
  });
  lista.forEach(e => {
    let obj = null;
    try { obj = e.getTarget(); } catch (x) {}
    if (!obj || !obj.isPlayer()) return;
    let pe = global.stXYZ(e), pt = global.stXYZ(obj);
    if (!pe || !pt) return;
    // ¿Está atascado? (casi no se movió en el último segundo)
    let pd = e.persistentData;
    let ux = pd.getDouble('st_ux'), uz = pd.getDouble('st_uz');
    pd.putDouble('st_ux', pe.x); pd.putDouble('st_uz', pe.z);
    let movio = Math.abs(pe.x - ux) + Math.abs(pe.z - uz);
    let dx = pt.x - pe.x, dz = pt.z - pe.z, dy = pt.y - pe.y;
    let horiz = Math.sqrt(dx * dx + dz * dz);
    let objetivos = [];
    let bx = Math.floor(pe.x), by = Math.floor(pe.y), bz = Math.floor(pe.z);
    if (movio < 0.3 && horiz > 1.2) {
      let sx = 0, sz = 0;
      if (Math.abs(dx) >= Math.abs(dz)) sx = dx > 0 ? 1 : -1; else sz = dz > 0 ? 1 : -1;
      objetivos.push([bx + sx, by, bz + sz], [bx + sx, by + 1, bz + sz]);
      if (dy > 1) objetivos.push([bx, by + 2, bz]);
    }
    // Se subió a un pilar cerca: le rompe el bloque de debajo
    if (horiz < 3.5 && dy >= 2) objetivos.push([Math.floor(pt.x), Math.floor(pt.y) - 1, Math.floor(pt.z)]);
    let rotos = 0;
    objetivos.forEach(b => {
      if (rotos >= 2) return;
      if (global.stEnSpawn(level, b[0], b[2])) return;
      if (global.stEnArena && global.stEnArena(server, b[0], b[1], b[2])) return;
      let id = '';
      try { id = String(level.getBlock(b[0], b[1], b[2]).id); } catch (x) { return; }
      if (!ajSolido(id) || cfg.noRompe.indexOf(id) !== -1) return;
      server.runCommandSilent(`execute in minecraft:overworld run setblock ${b[0]} ${b[1]} ${b[2]} minecraft:air destroy`);
      rotos++;
    });
    if (rotos > 0) global.stComoEntidad(e)(`playsound minecraft:entity.zombie.break_wooden_door hostile @a[distance=..24] ~ ~ ~ 0.8 0.8`);
  });
}); });

// ---------- 3) Limpieza del inventario ----------
let AJ_MONEDAS_LC = { coin_copper: 1, coin_iron: 10, coin_gold: 100, coin_emerald: 1000, coin_diamond: 10000, coin_netherite: 100000 };
ServerEvents.tick(event => { global.stSeguro('89_ajustes (inventario)', () => {
  if ((global.stAjTick || 0) % 100 !== 50) return;
  let server = event.server;
  server.players.forEach(p => {
    let inv = null;
    try { inv = p.getInventory(); } catch (e) { try { inv = p.inventory; } catch (e2) { return; } }
    if (!inv) return;
    let n = p.getName().getString();
    let valor = 0, libros = 0;
    let tam = 41;
    try { tam = Number(inv.getContainerSize()); } catch (e) {}
    for (let i = 0; i < tam; i++) {
      let it = null;
      try { it = inv.getItem(i); } catch (e) { continue; }
      if (!it || it.isEmpty()) continue;
      let id = '';
      try { id = String(it.getId()); } catch (e) { try { id = String(it.id); } catch (e2) { continue; } }
      // Libro "Livestock Guide" que da un mod al entrar por primera vez
      let nombre = '';
      try { nombre = String(it.getHoverName().getString()); } catch (e) {}
      let nbt = '';
      try { nbt = it.nbt ? String(it.nbt) : ''; } catch (e) {}
      if (/livestock/i.test(nombre) || /livestock/i.test(nbt) || /livestock.*(guide|book)|(guide|book).*livestock/i.test(id)) {
        it.setCount(0); libros++; continue;
      }
      // Monedas del mod que no son Starcoins -> se cambian al banco
      let m = id.match(/^lightmanscurrency:(coin_[a-z]+)$/);
      if (m && AJ_MONEDAS_LC[m[1]]) {
        valor += AJ_MONEDAS_LC[m[1]] * Number(it.getCount());
        it.setCount(0);
      }
    }
    if (valor > 0 && global.stDarDinero) global.stDarDinero(server, n, valor, 'monedas cambiadas');
  });
}); });

// ---------- 4) Al entrar: mapa en juego limpio + punto "Base" ----------
PlayerEvents.loggedIn(event => {
  let server = event.server, n = event.player.getName().getString();
  // Códigos de Xaero's Minimap / World Map: desactivan el modo cueva y el radar de entidades
  server.runCommandSilent(`tellraw ${n} {"text":"§f§a§i§r§x§a§e§r§o"}`);
  server.scheduleInTicks(140, () => {
    let s = global.STARVIOS.spawn;
    server.runCommandSilent(`tellraw ${n} ["",{"text":"📍 Base: ","color":"gold","bold":true},{"text":"${s.x} ${s.y} ${s.z}  ","color":"yellow"},{"text":"xaero-waypoint:Base:B:${s.x}:${s.y}:${s.z}:6:false:0:Internal-overworld-waypoints","color":"gray"}]`);
  });
});

// ---------- 5) /starvios girar  -> gira el bloque que miras (y su otra mitad) 90° ----------
// Pensado para las máquinas de Lightman's Currency copiadas con /clone: conservan su configuración
// y solo cambia hacia dónde miran. Repite el comando hasta que quede como quieres.
let AJ_GIRO = { north: 'east', east: 'south', south: 'west', west: 'north' };
let ajGirar = (server, level, x, y, z) => {
  let b = level.getBlock(x, y, z);
  let id = String(b.id);
  let props = {};
  try { let pr = b.getProperties(); pr.forEach((k, v) => { props[String(k)] = String(v); }); } catch (e) {}
  if (!props.facing) {
    try { let st = String(b.getBlockState()); let m = st.match(/facing=(\w+)/); if (m) props.facing = m[1]; } catch (e) {}
  }
  if (!props.facing || !AJ_GIRO[props.facing]) return null;
  let nuevo = AJ_GIRO[props.facing];
  let partes = [y];
  [-1, 1].forEach(dy => { try { if (String(level.getBlock(x, y + dy, z).id) === id) partes.push(y + dy); } catch (e) {} });
  partes.forEach(yy => {
    let bb = level.getBlock(x, yy, z);
    let st = String(bb.getBlockState());   // Block{id}[a=b,c=d]
    let m = st.match(/\[(.*)\]/);
    let lista = m ? m[1].split(',').map(s => s.split('=')) : [];
    let estado = lista.map(kv => kv[0] === 'facing' ? `facing=${nuevo}` : kv.join('=')).join(',');
    // Mismo bloque, solo cambia el estado: el bloque-entidad (la máquina y sus datos) se conserva
    try {
      let nprops = {}; lista.forEach(kv => { nprops[kv[0]] = kv[0] === 'facing' ? nuevo : kv[1]; });
      bb.set(id, nprops);
    } catch (e) {
      server.runCommandSilent(`execute in ${global.stDimDe(level)} run setblock ${x} ${yy} ${z} ${id}[${estado}] keep`);
    }
  });
  return nuevo;
};
ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('girar').executes(ctx => {
      let p = ctx.source.player;
      if (!p) return 0;
      let r = null;
      try { r = p.rayTrace(6, false); } catch (e) {}
      let b = r && r.block;
      if (!b) { ctx.source.sendSystemMessage(Text.of('§cMira el bloque que quieres girar (a menos de 6 bloques).')); return 0; }
      let q = global.stXYZ(b);
      let nuevo = ajGirar(ctx.source.server, p.level, Math.floor(q.x), Math.floor(q.y), Math.floor(q.z));
      ctx.source.sendSystemMessage(Text.of(nuevo ? `§a[Starvios] Ahora mira hacia el ${{ north: 'norte', east: 'este', south: 'sur', west: 'oeste' }[nuevo]}.` : '§cEse bloque no se puede girar.'));
      return nuevo ? 1 : 0;
    })));
});

// /starvios base : vuelve a enviar a TODOS el waypoint "Base" con el botón [Add] de Xaero
ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('base').executes(ctx => {
      let s = global.STARVIOS.spawn;
      ctx.source.server.runCommandSilent(`tellraw @a ["",{"text":"📍 Base: ","color":"gold","bold":true},{"text":"${s.x} ${s.y} ${s.z}  ","color":"yellow"},{"text":"xaero-waypoint:Base:B:${s.x}:${s.y}:${s.z}:6:false:0:Internal-overworld-waypoints","color":"gray"}]`);
      return 1;
    })));
});
