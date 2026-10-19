// priority: 700
// ============================================================
//  STARVIOS - ELIMINACIÓN AL MORIR, JEFES Y COMANDOS DE ADMIN
// ============================================================

// Muerte = espectador -> 5 s -> expulsión + fuera de la whitelist.
// El mensaje de muerte normal del juego sale en el chat como siempre.
EntityEvents.death(event => {
  let p = event.entity;
  if (!p || !p.isPlayer()) return;
  let server = p.server;
  let n = p.getName().getString();
  if (global.STARVIOS.exentos.indexOf(n) !== -1) return;
  if (global.stDia(server) <= 0) return; // con el evento desactivado no se elimina a nadie

  // Guardar dónde murió para dejarlo ahí como espectador al reaparecer
  global.stMuertes = global.stMuertes || {};
  let pos = global.stXYZ(p);
  global.stMuertes[n] = pos ? { x: pos.x, y: pos.y, z: pos.z, dim: global.stDimDe(p) } : { sinPos: true };

  global.stCmd(server, `gamemode spectator ${n}`);

  let lista = global.stEliminados(server);
  if (lista.indexOf(n) === -1) { lista.push(n); global.stGuardarEliminados(server, lista); }

  // Suelta el "Alma" del jugador para que su equipo pueda revivirlo (50_resurreccion.js)
  if (global.stSoltarAlma) global.stSoltarAlma(server, n, p);

  server.scheduleInTicks(global.STARVIOS.segundosHastaExpulsion * 20, () => {
    // Si lo revivieron en estos segundos, no se le expulsa
    if (global.stEliminados(server).indexOf(n) === -1) return;
    global.stCmd(server, `whitelist remove ${n}`);
    let jugador = server.getPlayer(n);
    if (!jugador) return;
    try {
      // Pantalla de expulsión con varias líneas
      jugador.connection.disconnect(Text.of(global.STARVIOS.mensajeExpulsion));
    } catch (err) {
      global.stCmd(server, `kick ${n} ${global.STARVIOS.mensajeExpulsion.replace(/\n/g, ' ')}`);
    }
  });
});

// Reaparición inmediata (sin pantalla de "Has muerto"): queda de espectador donde murió
PlayerEvents.respawned(event => {
  let p = event.player;
  let n = p.getName().getString();
  let m = (global.stMuertes || {})[n];
  if (!m) return;
  let server = p.server;
  global.stCmd(server, `gamemode spectator ${n}`);
  if (!m.sinPos) global.stCmd(server, `execute in ${m.dim} run tp ${n} ${m.x.toFixed(1)} ${m.y.toFixed(1)} ${m.z.toFixed(1)}`);
  delete global.stMuertes[n];
});

// Invoca un jefe y le aplica la vida, daño, velocidad y armadura del config.
// donde = parte de /execute que fija la posición, p. ej. "in minecraft:overworld positioned 10 70 10"
//         o "at Zylardd rotated ~ 0 positioned ^ ^ ^6" (delante de un jugador)
global.stInvocarJefe = (server, jefe, donde) => {
  let cmd = (c) => global.stCmd(server, c);
  let anim = global.STARVIOS.animacionJefes || { activa: false };
  let alto = anim.activa ? anim.altura : 0;
  let segs = anim.activa ? anim.segundosCaida : 0;

  cmd(`kill @e[tag=starvios_jefe_nuevo]`);
  cmd(`tag @e[tag=st_cine_jefe] remove st_cine_jefe`);
  let r = cmd(`execute ${donde} run summon ${jefe.id} ~ ~${alto} ~ {Tags:["starvios_jefe","starvios_jefe_nuevo","starvios_jefe_cayendo","st_cine_jefe"],PersistenceRequired:1b}`);
  let sel = '@e[tag=starvios_jefe_nuevo]';
  let mod = (attr, uuid, nombre, valor, op) =>
    cmd(`execute as ${sel} run attribute @s ${attr} modifier add ${uuid} ${nombre} ${valor} ${op}`);
  if (jefe.vida && jefe.vida !== 1) mod('minecraft:generic.max_health', '5a7c1e00-0000-4000-8000-0000000000b1', 'starvios_jefe_vida', (jefe.vida - 1).toFixed(2), 'multiply');
  if (jefe.daño && jefe.daño !== 1) mod('minecraft:generic.attack_damage', '5a7c1e00-0000-4000-8000-0000000000b2', 'starvios_jefe_dano', (jefe.daño - 1).toFixed(2), 'multiply');
  if (jefe.velocidad && jefe.velocidad !== 1) mod('minecraft:generic.movement_speed', '5a7c1e00-0000-4000-8000-0000000000b3', 'starvios_jefe_veloc', (jefe.velocidad - 1).toFixed(2), 'multiply');
  if (jefe.armadura) mod('minecraft:generic.armor', '5a7c1e00-0000-4000-8000-0000000000b4', 'starvios_jefe_armadura', jefe.armadura, 'add');
  cmd(`execute as ${sel} run attribute @s minecraft:generic.knockback_resistance base set 1`);
  // Vida llena hasta el nuevo máximo
  cmd(`execute as ${sel} run data merge entity @s {Health:1000000f}`);
  cmd(`tag @e[tag=starvios_jefe_nuevo] remove starvios_jefe_nuevo`);

  if (!anim.activa) { cmd(`tag @e[tag=starvios_jefe_cayendo] remove starvios_jefe_cayendo`); return r; }

  // --- Animación: cae del cielo ---
  let caen = '@e[tag=starvios_jefe_cayendo]';
  cmd(`effect give ${caen} minecraft:resistance ${segs + 4} 4 true`);   // inmune al golpe de la caída
  cmd(`effect give ${caen} minecraft:glowing ${segs + 2} 0 true`);
  cmd(`execute as @a at @s run playsound minecraft:entity.wither.spawn master @s ~ ~ ~ 0.7 0.6`);
  let ticksCaida = segs * 20;
  for (let t = 0; t < ticksCaida; t += 4) {
    server.scheduleInTicks(t, () => {
      cmd(`execute at ${caen} run particle minecraft:flame ~ ~1 ~ 0.6 1.2 0.6 0.03 40 force`);
      cmd(`execute at ${caen} run particle minecraft:large_smoke ~ ~2 ~ 0.4 0.8 0.4 0.02 15 force`);
    });
  }
  server.scheduleInTicks(ticksCaida, () => {
    cmd(`execute at ${caen} run particle minecraft:explosion_emitter ~ ~ ~ 0 0 0 0 1 force`);
    cmd(`execute at ${caen} run particle minecraft:lava ~ ~0.5 ~ 3 0.3 3 1 120 force`);
    cmd(`execute at ${caen} run particle minecraft:campfire_signal_smoke ~ ~0.5 ~ 2 0.5 2 0.02 60 force`);
    cmd(`execute at ${caen} run playsound minecraft:entity.generic.explode master @a ~ ~ ~ 4 0.6`);
    cmd(`execute at ${caen} run playsound minecraft:entity.ender_dragon.growl master @a ~ ~ ~ 4 0.7`);
    cmd(`tag @e[tag=starvios_jefe_cayendo] remove starvios_jefe_cayendo`);
  });
  return r;
};

// Título para todos al aparecer un jefe
global.stAnunciarJefe = (server, jefe) => {
  let cmd = (c) => global.stCmd(server, c);
  // Con cinemática (94_intro.js) el nombre sale dentro de ella
  if (global.stCineJefe && global.stCineJefe(server, jefe)) return;
  cmd(`title @a times 10 80 20`);
  cmd(`title @a title {"text":"${jefe.nombre.toUpperCase()}","color":"${jefe.color || 'dark_red'}","bold":true}`);
  cmd(`title @a subtitle {"text":"desciende sobre la arena","color":"gray"}`);
};

global.stDondeArena = (jefe, server) => {
  // Si su arena temática está construida (/starvios arena construir), cae allí
  try { if (jefe && server && global.stArenaDeJefe) { let b = global.stArenaDeJefe(server, jefe); if (b) return b; } } catch (e) {}
  let a = global.STARVIOS.arena;
  return `in minecraft:overworld positioned ${a.x} ${a.y} ${a.z}`;
};

// ---------------- COMANDOS ----------------
ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;

  let ok = (ctx, txt) => {
    ctx.source.sendSystemMessage(Text.of(txt).gold());
    return 1;
  };

  event.register(
    Commands.literal('starvios')
      .requires(src => src.hasPermission(2))

      // /starvios activar  -> enciende el evento (si no había día, empieza en el 1)
      .then(Commands.literal('activar').executes(ctx => {
        let server = ctx.source.server;
        if (global.stDiaGuardado(server) < 1) global.stDatos(server).putInt('starvios_dia', 1);
        global.stDatos(server).putBoolean('starvios_activo', true);
        global.stDatos(server).putInt('starvios_ultimo_dia', 0); // fuerza el anuncio
        global.stAplicarJugadores(server);
        return ok(ctx, `[Starvios] Evento ACTIVADO en el día ${global.stDia(server)}.`);
      }))

      // /starvios desactivar  -> apaga todas las reglas (mobs normales, vida normal, nadie es eliminado)
      .then(Commands.literal('desactivar').executes(ctx => {
        let server = ctx.source.server;
        global.stDatos(server).putBoolean('starvios_activo', false);
        global.stAplicarJugadores(server);
        global.stCmd(server, `tellraw @a {"text":"[Starvios] El evento está en pausa.","color":"gray"}`);
        return ok(ctx, '[Starvios] Evento DESACTIVADO. El día guardado se conserva.');
      }))

      // /starvios dia <n>  -> pone el día que quieras
      .then(Commands.literal('dia').then(
        Commands.argument('n', Arguments.INTEGER.create(event)).executes(ctx => {
          let server = ctx.source.server;
          let n = Arguments.INTEGER.getResult(ctx, 'n');
          global.stDatos(server).putInt('starvios_dia', Math.max(1, Math.min(n, global.STARVIOS.diasTotales)));
          global.stDatos(server).putInt('starvios_ultimo_dia', 0);
          global.stAplicarJugadores(server);
          return ok(ctx, `[Starvios] Día fijado en ${global.stDiaGuardado(server)}${global.stActivo(server) ? '' : ' (el evento está desactivado)'}.`);
        })
      ))

      // /starvios siguiente  -> pasa al día siguiente
      .then(Commands.literal('siguiente').executes(ctx => {
        let server = ctx.source.server;
        let n = Math.min(global.stDiaGuardado(server) + 1, global.STARVIOS.diasTotales);
        global.stDatos(server).putInt('starvios_dia', n);
        global.stDatos(server).putInt('starvios_ultimo_dia', 0);
        global.stAplicarJugadores(server);
        return ok(ctx, `[Starvios] Ahora es el día ${n}${global.stActivo(server) ? '' : ' (el evento está desactivado)'}.`);
      }))

      // /starvios reiniciar  -> vuelve al día 1, desactivado y sin eliminados
      .then(Commands.literal('reiniciar').executes(ctx => {
        let server = ctx.source.server;
        global.stDatos(server).putInt('starvios_dia', 1);
        global.stDatos(server).putBoolean('starvios_activo', false);
        global.stDatos(server).putInt('starvios_ultimo_dia', 0);
        global.stDatos(server).putString('starvios_eliminados', '');
        global.stDatos(server).putString('starvios_corazones', '');
        global.stDatos(server).putString('starvios_revividas', '');
        global.stDatos(server).putString('starvios_pendientes', '');
        global.stDatos(server).putBoolean('starvios_resurreccion_revelada', false);
        global.stDatos(server).putString('starvios_dinero', '');
        global.stDatos(server).putString('starvios_mazmorras', '');
        global.stCmd(server, 'scoreboard players reset * st_dinero');
        global.stAplicarJugadores(server);
        return ok(ctx, '[Starvios] Reiniciado: día 1, desactivado, sin eliminados, sin corazones extra, resurrección oculta, dinero y mazmorras a cero (los equipos se mantienen).');
      }))

      // /starvios info
      .then(Commands.literal('info').executes(ctx => {
        let server = ctx.source.server;
        let dia = global.stDia(server);
        let el = global.stEliminados(server);
        ok(ctx, `[Starvios] ${global.stActivo(server) ? 'ACTIVO' : 'DESACTIVADO'} - Día ${global.stDiaGuardado(server)}/${global.STARVIOS.diasTotales}`);
        ok(ctx, ` Vida jugador: ${global.stEscala('vidaJugador', Math.max(dia, 1))} | Vida mobs x${global.stEscala('vidaMobs', Math.max(dia, 1))} | Daño mobs x${global.stEscala('dañoMobs', Math.max(dia, 1))}`);
        return ok(ctx, ` Eliminados (${el.length}): ${el.join(', ') || 'nadie'}`);
      }))

      // /starvios jefe <1-5>        -> invoca el jefe de esa semana en la arena (con anuncio)
      // /starvios jefe <1-5> aqui   -> lo invoca 6 bloques delante de ti, sin anuncio (para pruebas)
      // /starvios jefe borrar       -> elimina todos los jefes invocados
      .then(Commands.literal('jefe')
        .then(Commands.literal('borrar').executes(ctx => {
          global.stCmd(ctx.source.server, `tag @e[tag=starvios_jefe] add starvios_borrado`);
          global.stCmd(ctx.source.server, `kill @e[tag=starvios_jefe]`);
          return ok(ctx, '[Starvios] Jefes eliminados.');
        }))
        .then(Commands.argument('semana', Arguments.INTEGER.create(event))
          .executes(ctx => {
            let server = ctx.source.server;
            let s = Arguments.INTEGER.getResult(ctx, 'semana');
            let jefe = global.STARVIOS.jefes[s - 1];
            if (!jefe) return ok(ctx, 'Número de jefe inválido (1-5).');
            global.stInvocarJefe(server, jefe, global.stDondeArena(jefe, server));
            global.stAnunciarJefe(server, jefe);
            return ok(ctx, `[Starvios] ${jefe.nombre} invocado en la arena.`);
          })
          .then(Commands.literal('aqui').executes(ctx => {
            let src = ctx.source;
            let s = Arguments.INTEGER.getResult(ctx, 'semana');
            let jefe = global.STARVIOS.jefes[s - 1];
            if (!jefe) return ok(ctx, 'Número de jefe inválido (1-5).');
            let p = src.player;
            if (!p) return ok(ctx, 'Usa este comando dentro del juego.');
            let r = global.stInvocarJefe(src.server, jefe, `at ${p.getName().getString()} rotated ~ 0 positioned ^ ^ ^6`);
            if (r === 0) return ok(ctx, `[Starvios] No se pudo invocar ${jefe.id}. Comprueba el ID con /summon y TAB (mowziesmobs: o cataclysm:).`);
            return ok(ctx, `[Starvios] ${jefe.nombre} invocado delante de ti (vida x${jefe.vida}, daño x${jefe.daño}).`);
          }))
        )
      )

      // /starvios revivir <jugador>  -> lo vuelve a meter en la whitelist
      .then(Commands.literal('revivir').then(
        Commands.argument('jugador', Arguments.STRING.create(event)).executes(ctx => {
          let server = ctx.source.server;
          let escrito = String(Arguments.STRING.getResult(ctx, 'jugador'));
          // Sin importar mayúsculas: usa el nombre tal como quedó guardado al eliminarlo
          let lista = global.stEliminados(server);
          let n = lista.filter(x => x.toLowerCase() === escrito.toLowerCase())[0] || escrito;
          global.stGuardarEliminados(server, lista.filter(x => x.toLowerCase() !== n.toLowerCase()));
          global.stCmd(server, `whitelist add ${n}`);
          // Al entrar: modo supervivencia y junto a quien lo revivió (o al spawn)
          let quien = ctx.source.player ? ctx.source.player.getName().getString() : null;
          let pend = {};
          try { pend = JSON.parse(server.persistentData.getString('starvios_pendientes') || '{}'); } catch (e) {}
          pend[n] = { por: quien };
          server.persistentData.putString('starvios_pendientes', JSON.stringify(pend));
          if (server.getPlayer(n) && global.stAplicarResurreccion) global.stAplicarResurreccion(server, n);
          global.stCmd(server, `tellraw @a ["",{"text":"✦ ","color":"gold"},{"text":"${n}","color":"aqua","bold":true},{"text":" ha sido revivido. Ya puede volver a entrar.","color":"gold"}]`);
          return ok(ctx, `[Starvios] ${n} revivido: al entrar aparecerá en supervivencia junto a ${quien || 'el spawn'}.`);
        })
      ))

      // /starvios aplicar  -> re-aplica vida máxima y gamerules a todos
      .then(Commands.literal('aplicar').executes(ctx => {
        global.stAplicarJugadores(ctx.source.server);
        return ok(ctx, '[Starvios] Reglas re-aplicadas.');
      }))
  );
});
