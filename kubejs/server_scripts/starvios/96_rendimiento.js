// priority: 45
// ============================================================
//  STARVIOS - RENDIMIENTO
//  /starvios lag              -> TPS, ms por tick y qué entidades hay (por tipo)
//  /starvios limpiar          -> aviso de 30 s y borra objetos del suelo, orbes de XP y flechas clavadas
//  /starvios limpiar ya       -> lo mismo sin esperar
//  No toca jefes, élites, guardianes, criptas ni mobs con nombre.
// ============================================================

let rnDims = ['minecraft:overworld', 'minecraft:the_nether'];

let rnContar = (server) => {
  let tipos = {}, total = 0;
  rnDims.forEach(d => {
    let lv = server.getLevel(d);
    if (!lv) return;
    lv.getEntities().forEach(e => {
      let t = String(e.type);
      tipos[t] = (tipos[t] || 0) + 1;
      total++;
    });
  });
  return { tipos: tipos, total: total };
};

let rnLimpiar = (server) => {
  let antes = rnContar(server).tipos;
  let n = (antes['minecraft:item'] || 0) + (antes['minecraft:experience_orb'] || 0) + (antes['minecraft:arrow'] || 0);
  rnDims.forEach(d => {
    let en = (c) => server.runCommandSilent(`execute in ${d} run ${c}`);
    en('kill @e[type=minecraft:item]');
    en('kill @e[type=minecraft:experience_orb]');
    en('kill @e[type=minecraft:arrow,nbt={inGround:1b}]');
  });
  server.runCommandSilent(`tellraw @a {"text":"🧹 Limpieza hecha: ${n} objetos, orbes y flechas eliminados.","color":"gray"}`);
};

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));

  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('lag').executes(ctx => {
      let server = ctx.source.server, d = decir(ctx);
      let ms = 0;
      try { ms = Number(server.getAverageTickTime()); } catch (e) {}
      let tps = ms > 0 ? Math.min(20, 1000 / ms) : 20;
      let color = tps >= 19 ? '§a' : tps >= 15 ? '§e' : '§c';
      let c = rnContar(server);
      d(`§6── Rendimiento ──`);
      d(`§7TPS: ${color}${tps.toFixed(1)}§7  ·  ms por tick: ${color}${ms.toFixed(1)}§7 (más de 50 = lag)`);
      d(`§7Jugadores: §f${server.players.length}§7  ·  Entidades (mundo + nether): §f${c.total}`);
      Object.keys(c.tipos).sort((a, b) => c.tipos[b] - c.tipos[a]).slice(0, 8).forEach(t => {
        d(`§8  ${c.tipos[t]} × §7${t.replace('minecraft:', '')}`);
      });
      if ((c.tipos['minecraft:item'] || 0) > 300) d('§eMuchos objetos en el suelo: usa /starvios limpiar');
      return 1;
    }))
    .then(Commands.literal('limpiar')
      .executes(ctx => {
        let server = ctx.source.server;
        server.runCommandSilent(`tellraw @a {"text":"⚠ En 30 segundos se borrarán los objetos tirados en el suelo. ¡Recoge lo que quieras guardar!","color":"yellow"}`);
        server.scheduleInTicks(600, () => rnLimpiar(server));
        decir(ctx)('§6Limpieza programada en 30 s.');
        return 1;
      })
      .then(Commands.literal('ya').executes(ctx => { rnLimpiar(ctx.source.server); return 1; })))
  );
});

// /starvios id  -> muestra el ID del objeto que tienes en la mano (para ponerlo en misiones, recetas, etc.)
ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('id').executes(ctx => {
      let p = ctx.source.player;
      if (!p) return 0;
      let it = p.mainHandItem, id = '';
      try { id = String(it.getId()); } catch (e) { try { id = String(it.id); } catch (e2) {} }
      if (!id || id === 'minecraft:air') { ctx.source.sendSystemMessage(Text.of('§cSujeta un objeto en la mano.')); return 0; }
      ctx.source.server.runCommandSilent(`tellraw ${p.getName().getString()} ["",{"text":"ID: ","color":"gray"},{"text":"${id}","color":"yellow","underlined":true,"clickEvent":{"action":"copy_to_clipboard","value":"${id}"},"hoverEvent":{"action":"show_text","contents":"Clic para copiar"}}]`);
      return 1;
    })));
});
