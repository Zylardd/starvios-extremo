// ============================================================
//  STARVIOS - RECOMPENSAS
//  - Mini-jefes (élites) sueltan Fragmentos de Corazón + un premio aleatorio
//  - 4 Fragmentos (2x2) = 1 Corazón Vital -> clic derecho = +1 corazón máximo
//  - Los jefes semanales sueltan Corazones Vitales
//  - Comandos de prueba: /starvios elite, /starvios dar <cosa> <cantidad>
// ============================================================

let NBT_FRAGMENTO = `{starvios_fragmento:1b,Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],HideFlags:1,` +
  `display:{Name:'{"text":"Fragmento de Corazón","color":"light_purple","italic":false}',` +
  `Lore:['{"text":"Junta 4 en la mesa de crafteo (2x2)","color":"gray","italic":false}',` +
  `'{"text":"para formar un Corazón Vital.","color":"gray","italic":false}']}}`;

let NBT_VITAL = `{starvios_corazon_vital:1b,Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],HideFlags:1,` +
  `display:{Name:'{"text":"❤ Corazón Vital","color":"red","bold":true,"italic":false}',` +
  `Lore:['{"text":"Clic derecho: +1 corazón máximo","color":"gray","italic":false}',` +
  `'{"text":"para siempre.","color":"gray","italic":false}']}}`;

global.stItemsEspeciales = {
  fragmento: ['minecraft:pink_dye', NBT_FRAGMENTO],
  corazon:   ['minecraft:red_dye', NBT_VITAL]
};

// ---------- Receta: 4 fragmentos -> Corazón Vital ----------
ServerEvents.recipes(event => {
  if (!global.STARVIOS.corazonesExtra.activa) return;
  event.shaped(Item.of('minecraft:red_dye', NBT_VITAL), ['FF', 'FF'], {
    F: Item.of('minecraft:pink_dye', NBT_FRAGMENTO).weakNBT()
  }).id('starvios:corazon_vital');
});

// ---------- Utilidades ----------
let stTag = (item, tag) => {
  if (!item || item.isEmpty()) return false;
  let nbt = item.nbt;
  return nbt != null && nbt.contains(tag);
};

global.stSoltarItem = (server, dim, x, y, z, id, cantidad, nbt) => {
  let tag = nbt ? `,tag:${nbt}` : '';
  server.runCommandSilent(`execute in ${dim} run summon minecraft:item ${x.toFixed(2)} ${(y + 0.5).toFixed(2)} ${z.toFixed(2)} ` +
    `{PickupDelay:10s,Motion:[${(Math.random() * 0.2 - 0.1).toFixed(2)},0.25,${(Math.random() * 0.2 - 0.1).toFixed(2)}],Item:{id:"${id}",Count:${cantidad}b${tag}}}`);
};

let stAzar = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

let stPremioAleatorio = () => {
  let lista = global.STARVIOS.elites.premios;
  let total = lista.reduce((s, p) => s + p.peso, 0);
  let r = Math.random() * total;
  for (let i = 0; i < lista.length; i++) {
    r -= lista[i].peso;
    if (r <= 0) return lista[i];
  }
  return lista[0];
};

global.stPremioAleatorio = stPremioAleatorio;

// ---------- Muerte de élites y jefes ----------
EntityEvents.death(event => {
  let e = event.entity;
  if (!e || e.isPlayer()) return;
  let tags = e.getTags();
  let esElite = tags.contains('starvios_elite');
  let esJefe = tags.contains('starvios_jefe');
  if (!esElite && !esJefe) return;

  let server = e.server;
  let dim = String(e.level.dimension);
  let killer = event.source.player;
  let quien = killer ? killer.getName().getString() : null;

  if (esElite) {
    if (!killer) return; // solo premia si lo mata un jugador
    let el = global.STARVIOS.elites;
    let n = stAzar(el.fragmentos[0], el.fragmentos[1]);
    global.stSoltarItem(server, dim, e.x, e.y, e.z, 'minecraft:pink_dye', n, NBT_FRAGMENTO);
    let p = stPremioAleatorio();
    global.stSoltarItem(server, dim, e.x, e.y, e.z, p.id, stAzar(p.min, p.max), p.nbt || null);
    server.runCommandSilent(`execute in ${dim} run particle minecraft:totem_of_undying ${e.x.toFixed(1)} ${(e.y + 1).toFixed(1)} ${e.z.toFixed(1)} 0.4 0.6 0.4 0.3 40`);
    server.runCommandSilent(`tellraw @a ["",{"text":"☠ ","color":"dark_purple"},{"text":"${quien}","color":"yellow"},{"text":" ha derrotado a un ","color":"gray"},{"text":"${(el.tipos[String(e.type)] || 'Mob')} Élite","color":"dark_purple","bold":true}]`);
  }

  if (esJefe) {
    let cant = global.STARVIOS.corazonesExtra.porJefe;
    for (let i = 0; i < cant; i++) {
      global.stSoltarItem(server, dim, e.x, e.y, e.z, 'minecraft:red_dye', 1, NBT_VITAL);
    }
    server.runCommandSilent(`title @a times 10 70 20`);
    server.runCommandSilent(`title @a title {"text":"¡JEFE DERROTADO!","color":"gold","bold":true}`);
    server.runCommandSilent(`title @a subtitle {"text":"Ha soltado ${cant} Corazones Vitales","color":"red"}`);
    server.runCommandSilent(`execute as @a at @s run playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 1 1`);
  }
});

// ---------- Usar el Corazón Vital ----------
ItemEvents.rightClicked(event => {
  if (String(event.hand) !== 'MAIN_HAND') return;
  let p = event.player;
  if (!p || !stTag(p.mainHandItem, 'starvios_corazon_vital')) return;
  event.cancel();
  let server = p.server;
  let n = p.getName().getString();
  let mapa = global.stCorazonesExtra(server);
  let max = global.STARVIOS.corazonesExtra.maximo;
  if ((mapa[n] || 0) >= max) {
    server.runCommandSilent(`title ${n} actionbar {"text":"Ya tienes el máximo de corazones extra (${max})","color":"red"}`);
    return;
  }
  mapa[n] = (mapa[n] || 0) + 1;
  server.persistentData.putString('starvios_corazones', JSON.stringify(mapa));
  p.mainHandItem.shrink(1);
  server.runCommandSilent(`attribute ${n} minecraft:generic.max_health base set ${global.stVidaMax(server, n)}`);
  server.scheduleInTicks(1, () => { let j = server.getPlayer(n); if (j) j.setHealth(j.getHealth() + 2); });
  server.runCommandSilent(`execute at ${n} run particle minecraft:heart ~ ~1.5 ~ 0.5 0.5 0.5 0 15`);
  server.runCommandSilent(`execute at ${n} run playsound minecraft:entity.player.levelup master @a ~ ~ ~ 1 1.2`);
  server.runCommandSilent(`title ${n} actionbar {"text":"❤ +1 corazón máximo (${mapa[n]}/${max} extra)","color":"red","bold":true}`);
});

// ---------- Comandos de prueba ----------
ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let ok = (ctx, txt) => { ctx.source.sendSystemMessage(Text.of(txt).gold()); return 1; };

  let dar = (ctx, cosa) => {
    let p = ctx.source.player;
    if (!p) return ok(ctx, 'Usa este comando dentro del juego.');
    let n = Arguments.INTEGER.getResult(ctx, 'cantidad');
    let it = cosa === 'resurreccion' ? global.stItemCorazonResurreccion : global.stItemsEspeciales[cosa];
    ctx.source.server.runCommandSilent(`give ${p.getName().getString()} ${it[0]}${it[1]} ${n}`);
    return ok(ctx, `[Starvios] Te di ${n} × ${cosa}.`);
  };

  let darNodo = Commands.literal('dar');
  ['fragmento', 'corazon', 'resurreccion'].forEach(cosa => {
    darNodo = darNodo.then(Commands.literal(cosa).then(
      Commands.argument('cantidad', Arguments.INTEGER.create(event)).executes(ctx => dar(ctx, cosa))));
  });

  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(darNodo)
    // /starvios elite -> invoca un Zombi Élite 5 bloques delante de ti
    .then(Commands.literal('elite').executes(ctx => {
      let p = ctx.source.player;
      if (!p) return ok(ctx, 'Usa este comando dentro del juego.');
      let ang = p.getYaw() * Math.PI / 180;
      let x = p.x - Math.sin(ang) * 5, z = p.z + Math.cos(ang) * 5;
      let server = ctx.source.server;
      server.runCommandSilent(`execute in ${String(p.level.dimension)} run summon minecraft:zombie ${x.toFixed(2)} ${p.y.toFixed(2)} ${z.toFixed(2)} {Tags:["starvios_elite_nuevo"]}`);
      server.scheduleInTicks(2, () => {
        p.level.getEntities().forEach(e => {
          if (e.getTags().contains('starvios_elite_nuevo')) {
            e.removeTag('starvios_elite_nuevo');
            global.stHacerElite(e, 'minecraft:zombie');
          }
        });
      });
      return ok(ctx, '[Starvios] Zombi Élite invocado.');
    }))
    // /starvios corazones reset <jugador> -> quita los corazones extra
    .then(Commands.literal('corazones').then(Commands.literal('reset').then(
      Commands.argument('jugador', Arguments.STRING.create(event)).executes(ctx => {
        let server = ctx.source.server;
        let n = Arguments.STRING.getResult(ctx, 'jugador');
        let mapa = global.stCorazonesExtra(server);
        delete mapa[n];
        server.persistentData.putString('starvios_corazones', JSON.stringify(mapa));
        global.stAplicarJugadores(server);
        return ok(ctx, `[Starvios] Corazones extra de ${n} reiniciados.`);
      }))))
  );
});
