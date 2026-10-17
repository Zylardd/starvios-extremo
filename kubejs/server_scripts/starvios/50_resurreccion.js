// ============================================================
//  STARVIOS - RESURRECCIÓN DE COMPAÑEROS
//  1) Al ser eliminado, el jugador suelta su "Alma" (su cabeza): brilla,
//     nunca desaparece y no se quema en lava ni explota.
//  2) Un compañero fabrica un "Corazón de Resurrección" (receta en 00_config.js).
//  3) Corazón en la mano principal + Alma en la otra mano -> clic derecho.
//  4) El eliminado vuelve a la whitelist y, al entrar, aparece junto a quien
//     lo revivió con poca vida.
//  Todo usa ítems vanilla con datos propios: no hace falta instalar nada.
// ============================================================

let RC = () => global.STARVIOS.resurreccion;

let NBT_CORAZON = `{starvios_resurreccion:1b,Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],HideFlags:1,` +
  `display:{Name:'{"text":"Corazón de Resurrección","color":"light_purple","italic":false}',` +
  `Lore:['{"text":"Corazón en la mano principal","color":"gray","italic":false}',` +
  `'{"text":"y el Alma del compañero en la otra mano.","color":"gray","italic":false}',` +
  `'{"text":"Clic derecho para revivirlo.","color":"gold","italic":false}']}}`;

global.stItemCorazonResurreccion = ['minecraft:nether_star', NBT_CORAZON];
global.stResurreccionRevelada = (server) => server.persistentData.getBoolean('starvios_resurreccion_revelada');

// ---------- Receta ----------
ServerEvents.recipes(event => {
  if (!RC().activa) return;
  event.shaped(Item.of('minecraft:nether_star', NBT_CORAZON), RC().receta, RC().ingredientes)
    .id('starvios:corazon_resurreccion');
});

// ---------- Datos guardados ----------
let stLeerMapa = (server, clave) => {
  let s = server.persistentData.getString(clave);
  if (!s) return {};
  try { return JSON.parse(s); } catch (e) { return {}; }
};
let stGuardarMapa = (server, clave, mapa) => server.persistentData.putString(clave, JSON.stringify(mapa));

let stTieneTag = (item, tag) => {
  if (!item || item.isEmpty()) return false;
  let nbt = item.nbt;
  return nbt != null && nbt.contains(tag);
};

// ---------- 1) Soltar el Alma al ser eliminado (lo llama 30_eliminacion_y_comandos.js) ----------
global.stSoltarAlma = (server, n, p) => {
  if (!RC().activa) return;
  let dim = String(p.level.dimension);
  let x = p.x, y = p.y, z = p.z;
  if (y < p.level.minBuildHeight + 2) {           // murió en el vacío: el Alma va al spawn
    let s = global.STARVIOS.spawn; x = s.x; y = s.y + 1; z = s.z; dim = 'minecraft:overworld';
  }
  let item = `{id:"minecraft:player_head",Count:1b,tag:{SkullOwner:"${n}",starvios_alma:"${n}",` +
    `display:{Name:'{"text":"Alma de ${n}","color":"aqua","italic":false}',` +
    `Lore:['{"text":"Llévala con un Corazón de Resurrección","color":"gray","italic":false}',` +
    `'{"text":"para devolver a ${n} a la vida.","color":"gray","italic":false}']}}}`;
  server.runCommandSilent(`execute in ${dim} run summon minecraft:item ${x.toFixed(2)} ${(y + 0.5).toFixed(2)} ${z.toFixed(2)} ` +
    `{Age:-32768s,Invulnerable:1b,Glowing:1b,PickupDelay:40s,Item:${item}}`);
};

// El Alma no se puede colocar como bloque (perdería sus datos)
BlockEvents.placed(event => {
  let p = event.player;
  if (!p) return;
  if (stTieneTag(p.mainHandItem, 'starvios_alma') || stTieneTag(p.offHandItem, 'starvios_alma')) {
    let id = String(event.block.id);
    if (id.indexOf('head') !== -1 || id.indexOf('skull') !== -1) {
      p.server.runCommandSilent(`title ${p.getName().getString()} actionbar {"text":"Un Alma no se puede colocar","color":"aqua"}`);
      event.cancel();
    }
  }
});

// ---------- 2) Revivir ----------
let stAplicarResurreccion = (server, n) => {
  let pend = stLeerMapa(server, 'starvios_pendientes');
  let d = pend[n];
  let jugador = server.getPlayer(n);
  if (!d || !jugador) return;
  server.runCommandSilent(`gamemode survival ${n}`);
  server.runCommandSilent(`execute in ${d.dim} run tp ${n} ${d.x} ${d.y} ${d.z}`);
  server.scheduleInTicks(2, () => {
    let j = server.getPlayer(n);
    if (!j) return;
    j.setHealth(RC().vidaAlRevivir);
    server.runCommandSilent(`effect give ${n} minecraft:resistance 10 4 true`);
    server.runCommandSilent(`effect give ${n} minecraft:regeneration 5 1 true`);
    server.runCommandSilent(`execute at ${n} run particle minecraft:totem_of_undying ~ ~1 ~ 0.5 1 0.5 0.4 120`);
    server.runCommandSilent(`execute at ${n} run playsound minecraft:item.totem.use master @a ~ ~ ~ 1 1`);
    server.runCommandSilent(`title ${n} times 10 60 20`);
    server.runCommandSilent(`title ${n} title {"text":"HAS VUELTO","color":"gold","bold":true}`);
    server.runCommandSilent(`title ${n} subtitle {"text":"Revivido por ${d.por}","color":"gray"}`);
  });
  delete pend[n];
  stGuardarMapa(server, 'starvios_pendientes', pend);
};

let stIntentarRevivir = (event) => {
  let p = event.player;
  if (!p || !RC().activa) return false;
  let main = p.mainHandItem, off = p.offHandItem;
  if (!stTieneTag(main, 'starvios_resurreccion')) return false;
  let server = p.server;
  let yo = p.getName().getString();
  let avisar = (txt, color) => server.runCommandSilent(`title ${yo} actionbar {"text":"${txt}","color":"${color || 'red'}"}`);

  if (!global.stResurreccionRevelada(server)) { avisar('Este poder todavía está dormido...', 'dark_purple'); return true; }
  if (!stTieneTag(off, 'starvios_alma')) { avisar('Pon el Alma de tu compañero en la otra mano'); return true; }
  let n = off.nbt.getString('starvios_alma');

  if (global.stEliminados(server).indexOf(n) === -1) { avisar(`${n} no está eliminado`); return true; }

  let cuentas = stLeerMapa(server, 'starvios_revividas');
  let max = RC().maxPorJugador;
  if (max > 0 && (cuentas[n] || 0) >= max) { avisar(`${n} ya fue revivido el máximo de veces`); return true; }

  // Consumir Corazón y Alma
  main.shrink(1);
  off.shrink(1);

  cuentas[n] = (cuentas[n] || 0) + 1;
  stGuardarMapa(server, 'starvios_revividas', cuentas);
  global.stGuardarEliminados(server, global.stEliminados(server).filter(x => x !== n));
  server.runCommandSilent(`whitelist add ${n}`);

  let pend = stLeerMapa(server, 'starvios_pendientes');
  pend[n] = { x: p.x.toFixed(2), y: p.y.toFixed(2), z: p.z.toFixed(2), dim: String(p.level.dimension), por: yo };
  stGuardarMapa(server, 'starvios_pendientes', pend);

  server.runCommandSilent(`execute at ${yo} run particle minecraft:totem_of_undying ~ ~1 ~ 0.6 1 0.6 0.5 200`);
  server.runCommandSilent(`execute at ${yo} run playsound minecraft:item.totem.use master @a ~ ~ ~ 1 0.8`);
  server.runCommandSilent(`tellraw @a ["",{"text":"✦ ","color":"gold"},{"text":"${yo}","color":"yellow"},{"text":" ha revivido a ","color":"gold"},{"text":"${n}","color":"aqua","bold":true},{"text":". Ya puede volver a entrar.","color":"gold"}]`);

  // Si todavía estaba conectado (dentro de los segundos antes de la expulsión), vuelve ya
  if (server.getPlayer(n)) stAplicarResurreccion(server, n);
  return true;
};

ItemEvents.rightClicked(event => {
  if (String(event.hand) !== 'MAIN_HAND') return;
  if (stIntentarRevivir(event)) event.cancel();
});
BlockEvents.rightClicked(event => {
  if (String(event.hand) !== 'MAIN_HAND') return;
  if (stTieneTag(event.player ? event.player.mainHandItem : null, 'starvios_resurreccion')) {
    stIntentarRevivir(event);
    event.cancel();
  }
});

// ---------- 3) Al volver a entrar ----------
PlayerEvents.loggedIn(event => {
  let server = event.server;
  let n = event.player.getName().getString();
  if (stLeerMapa(server, 'starvios_pendientes')[n]) {
    server.scheduleInTicks(40, () => stAplicarResurreccion(server, n));
  }
});

// ---------- Mensaje con la receta (se usa al revelar y en /resurreccion) ----------
let stNombreItem = (id) => id.replace('minecraft:', '').replace(/_/g, ' ');
global.stMensajeResurreccion = (enviar) => {
  let r = RC();
  enviar('§5§l━━━━━━ ✦ RESURRECCIÓN ✦ ━━━━━━');
  enviar('§7Quien muere suelta su §bAlma§7 (su cabeza): brilla y nunca desaparece.');
  enviar('§7Fabrica un §dCorazón de Resurrección§7 en la mesa de crafteo:');
  r.receta.forEach(fila => enviar('      §f§l' + fila.split('').join('  ')));
  Object.keys(r.ingredientes).forEach(k => enviar(`   §e${k}§7 = ${stNombreItem(r.ingredientes[k])}`));
  enviar('§7Corazón en la §fmano principal§7 + Alma en la §fotra mano§7 → §6clic derecho§7.');
  enviar(`§7Revive con §f${r.vidaAlRevivir / 2} corazones§7 junto a quien lo revivió.`);
  if (r.maxPorJugador > 0) enviar(`§7Cada jugador puede ser revivido §f${r.maxPorJugador}§7 vez/veces.`);
};

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;

  // /resurreccion (todos): muestra la receta, solo si ya fue revelada
  event.register(Commands.literal('resurreccion').executes(ctx => {
    let src = ctx.source;
    if (!global.stResurreccionRevelada(src.server)) {
      src.sendSystemMessage(Text.of('§5§oEste secreto todavía no ha sido revelado...'));
      return 1;
    }
    global.stMensajeResurreccion(t => src.sendSystemMessage(Text.of(t)));
    return 1;
  }));

  // /starvios resurreccion revelar | ocultar  (solo OP)
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('resurreccion')
      .then(Commands.literal('revelar').executes(ctx => {
        let server = ctx.source.server;
        server.persistentData.putBoolean('starvios_resurreccion_revelada', true);
        let cmd = (c) => server.runCommandSilent(c);
        cmd(`title @a times 10 80 20`);
        cmd(`title @a title {"text":"✦ RESURRECCIÓN ✦","color":"light_purple","bold":true}`);
        cmd(`title @a subtitle {"text":"Los caídos pueden volver...","color":"gray"}`);
        cmd(`execute as @a at @s run playsound minecraft:item.totem.use master @s ~ ~ ~ 0.8 0.6`);
        server.players.forEach(p => global.stMensajeResurreccion(t => p.tell(Text.of(t))));
        ctx.source.sendSystemMessage(Text.of('§6[Starvios] Resurrección revelada a todos.'));
        return 1;
      }))
      .then(Commands.literal('ocultar').executes(ctx => {
        ctx.source.server.persistentData.putBoolean('starvios_resurreccion_revelada', false);
        ctx.source.sendSystemMessage(Text.of('§6[Starvios] Resurrección oculta otra vez (no se puede usar).'));
        return 1;
      })))
  );
});
