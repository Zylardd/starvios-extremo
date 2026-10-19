// priority: 300
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

let NBT_FRAGIL = `{starvios_corazon_fragil:1b,Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],HideFlags:1,` +
  `display:{Name:'{"text":"💛 Corazón Frágil","color":"gold","bold":true,"italic":false}',` +
  `Lore:['{"text":"Clic derecho: +1 corazón dorado","color":"gray","italic":false}',` +
  `'{"text":"No se regenera: si te golpean, se pierde.","color":"gray","italic":false}']}}`;

global.stItemsEspeciales = {
  fragmento: ['minecraft:pink_dye', NBT_FRAGMENTO],
  corazon:   ['minecraft:red_dye', NBT_VITAL],
  fragil:    ['minecraft:yellow_dye', NBT_FRAGIL]
};

// ---------- Receta: 4 fragmentos -> Corazón Vital ----------
// Bloquear recetas (armaduras de mods, etc.) — ver recetasBloqueadas en 00_config.js
ServerEvents.recipes(event => {
  (global.STARVIOS.recetasBloqueadas || []).forEach(patron => {
    try { event.remove({ output: new RegExp(patron) }); }
    catch (err) { console.error(`[Starvios] No pude bloquear recetas con "${patron}": ${err}`); }
  });
});

ServerEvents.recipes(event => {
  if (!global.STARVIOS.corazonesExtra.activa) return;
  event.shaped(Item.of('minecraft:red_dye', NBT_VITAL), ['FF', 'FF'], {
    F: Item.of('minecraft:pink_dye', NBT_FRAGMENTO).weakNBT()
  }).id('starvios:corazon_vital');
  let cf = global.STARVIOS.corazonFragil;
  if (cf && cf.activa) {
    event.shaped(Item.of('minecraft:yellow_dye', NBT_FRAGIL), ['FG', 'GF'], {
      F: Item.of('minecraft:pink_dye', NBT_FRAGMENTO).weakNBT(), G: 'minecraft:gold_ingot'
    }).id('starvios:corazon_fragil');
  }
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

// paraElite = true: excluye los premios marcados soloCapitan (diamantes, etc.)
let stPremioAleatorio = (paraElite) => {
  let lista = global.STARVIOS.elites.premios.filter(p => !(paraElite && p.soloCapitan));
  let total = lista.reduce((s, p) => s + p.peso, 0);
  let r = Math.random() * total;
  for (let i = 0; i < lista.length; i++) {
    r -= lista[i].peso;
    if (r <= 0) return lista[i];
  }
  return lista[0];
};

global.stPremioAleatorio = stPremioAleatorio;

// Botín especial: devuelve la lista de {id, cantidad} que tocan en 'n' tiradas
global.stBotinEspecial = (n) => {
  let b = global.STARVIOS.botinEspecial, sale = [];
  if (!b) return sale;
  for (let i = 0; i < n; i++) {
    let r = Math.random();
    if (r < b.probValioso) sale.push(b.valiosos[Math.floor(Math.random() * b.valiosos.length)]);
    else if (r < b.probValioso + b.probBasura) sale.push(b.basura[Math.floor(Math.random() * b.basura.length)]);
  }
  return sale;
};

// ---------- Muerte de élites y jefes ----------
EntityEvents.death(event => {
  let e = event.entity;
  if (!e || e.isPlayer()) return;
  let tags = e.getTags();
  let esElite = tags.contains('starvios_elite');
  let esJefe = tags.contains('starvios_jefe');
  if (!esElite && !esJefe) return;
  if (tags.contains('starvios_borrado')) return;   // eliminado con /starvios jefe borrar

  let server = e.server;
  let enMob = global.stComoEntidad(e);   // comandos en la posición del mob
  let soltar = (id, cantidad, nbt) => {
    let tag = nbt ? `,tag:${nbt}` : '';
    enMob(`summon minecraft:item ~ ~0.5 ~ {PickupDelay:10s,Motion:[${(Math.random() * 0.2 - 0.1).toFixed(2)},0.25,${(Math.random() * 0.2 - 0.1).toFixed(2)}],Item:{id:"${id}",Count:${cantidad}b${tag}}}`);
  };
  let killer = event.source.player;
  let quien = killer ? killer.getName().getString() : null;

  if (esElite) {
    if (!killer) return; // solo premia si lo mata un jugador
    let el = global.STARVIOS.elites;
    let n = stAzar(el.fragmentos[0], el.fragmentos[1]);
    if (global.stEf && global.stEf(server, '8b')) n += stAzar(0, 1);   // anomalía día 8: hasta 2 fragmentos
    if (n > 0) soltar('minecraft:pink_dye', n, NBT_FRAGMENTO);
    if (Math.random() < (el.probPremio == null ? 1 : el.probPremio)) {
      let p = stPremioAleatorio(true);
      soltar(p.id, stAzar(p.min, p.max), p.nbt || null);
    }
    let tirEl = global.STARVIOS.botinEspecial.tiradas.elite;
    if (global.stEf && global.stEf(server, '24b')) tirEl = Math.max(1, tirEl * 2);   // anomalía día 24
    global.stBotinEspecial(tirEl).forEach(it => soltar(it.id, it.cantidad, null));
    if (global.stDarDinero) global.stDarDinero(server, quien, global.STARVIOS.economia.ganancias.elite * (global.stEfMultDinero ? global.stEfMultDinero(server, 'elite') : 1), 'Élite');
    enMob(`particle minecraft:totem_of_undying ~ ~1 ~ 0.4 0.6 0.4 0.3 40`);
    server.runCommandSilent(`tellraw @a ["",{"text":"☠ ","color":"dark_purple"},{"text":"${quien}","color":"yellow"},{"text":" ha derrotado a un ","color":"gray"},{"text":"${(el.tipos[String(e.type)] || 'Mob')} Élite","color":"dark_purple","bold":true}]`);
  }

  if (esJefe) {
    let cant = global.STARVIOS.corazonesExtra.porJefe;
    for (let i = 0; i < cant; i++) {
      soltar('minecraft:red_dye', 1, NBT_VITAL);
    }
    let tirJefe = global.STARVIOS.botinEspecial.tiradas.jefe;
    if (global.stEf && global.stEf(server, '24b')) tirJefe = tirJefe * 2;   // anomalía día 24
    let especiales = global.stBotinEspecial(tirJefe);
    especiales.forEach(it => soltar(it.id, it.cantidad, null));
    if (global.stRecompensaJefe) global.stRecompensaJefe(server);
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
  let server = p.server;
  let n = p.getName().getString();
  let mapa = global.stCorazonesExtra(server);
  let max = global.STARVIOS.corazonesExtra.maximo;
  if (max > 0 && (mapa[n] || 0) >= max) {
    server.runCommandSilent(`title ${n} actionbar {"text":"Ya tienes el máximo de corazones extra (${max})","color":"red"}`);
    event.cancel();
  }
  mapa[n] = (mapa[n] || 0) + 1;
  server.persistentData.putString('starvios_corazones', JSON.stringify(mapa));
  p.mainHandItem.shrink(1);
  server.runCommandSilent(`attribute ${n} minecraft:generic.max_health base set ${global.stVidaMax(server, n)}`);
  server.scheduleInTicks(2, () => server.runCommandSilent(`effect give ${n} minecraft:instant_health 1 0 true`));
  server.runCommandSilent(`execute at ${n} run particle minecraft:heart ~ ~1.5 ~ 0.5 0.5 0.5 0 15`);
  server.runCommandSilent(`execute at ${n} run playsound minecraft:entity.player.levelup master @a ~ ~ ~ 1 1.2`);
  server.runCommandSilent(`title ${n} actionbar {"text":"❤ +1 corazón máximo (${mapa[n]}${max > 0 ? '/' + max : ''} extra)","color":"red","bold":true}`);
  event.cancel();   // siempre al final: en KubeJS 1.20 cancel() detiene el resto del código
});

// ---------- Usar el Corazón Frágil (corazón dorado = absorción que no se regenera) ----------
ItemEvents.rightClicked(event => {
  if (String(event.hand) !== 'MAIN_HAND') return;
  let p = event.player;
  if (!p || !stTag(p.mainHandItem, 'starvios_corazon_fragil')) return;
  let server = p.server, n = p.getName().getString();
  let max = ((global.STARVIOS.corazonFragil || {}).maximo || 7) * 2;
  let ahora = 0;
  try { ahora = Number(p.getAbsorptionAmount()); } catch (e) {}
  if (ahora >= max - 0.01) {
    server.runCommandSilent(`title ${n} actionbar {"text":"Ya tienes el máximo de corazones frágiles (${max / 2})","color":"red"}`);
    event.cancel();
  }
  let nuevo = Math.min(max, ahora + 2);
  p.setAbsorptionAmount(nuevo);
  p.mainHandItem.shrink(1);
  server.runCommandSilent(`execute at ${n} run particle minecraft:wax_on ~ ~1.2 ~ 0.4 0.5 0.4 0 15`);
  server.runCommandSilent(`execute at ${n} run playsound minecraft:block.amethyst_block.chime master @a[distance=..12] ~ ~ ~ 1 1.3`);
  server.runCommandSilent(`title ${n} actionbar {"text":"💛 +1 corazón frágil (${Math.round(nuevo / 2)}/${max / 2})","color":"gold","bold":true}`);
  event.cancel();   // siempre al final
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
  ['fragmento', 'corazon', 'fragil', 'resurreccion'].forEach(cosa => {
    darNodo = darNodo.then(Commands.literal(cosa).then(
      Commands.argument('cantidad', Arguments.INTEGER.create(event)).executes(ctx => dar(ctx, cosa))));
  });

  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(darNodo)
    // /starvios elite -> invoca un Zombi Élite 5 bloques delante de ti
    .then(Commands.literal('elite').executes(ctx => {
      let p = ctx.source.player;
      if (!p) return ok(ctx, 'Usa este comando dentro del juego.');
      let server = ctx.source.server;
      let n = p.getName().getString();
      server.runCommandSilent(`kill @e[tag=starvios_elite_nuevo]`);
      server.runCommandSilent(`execute at ${n} rotated ~ 0 positioned ^ ^ ^5 run summon minecraft:zombie ~ ~ ~ {Tags:["starvios_elite_nuevo"],PersistenceRequired:1b}`);
      global.stHacerEliteSel(server, '@e[tag=starvios_elite_nuevo]', 'minecraft:zombie');
      server.runCommandSilent(`tag @e[tag=starvios_elite_nuevo] remove starvios_elite_nuevo`);
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
