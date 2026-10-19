// priority: 50
// ============================================================
//  STARVIOS - EQUIPOS
//  /equipo crear <nombre>      crea tu equipo (eres el líder)
//  /equipo invitar <jugador>   (líder) invita a alguien
//  /equipo aceptar | rechazar  responder a una invitación
//  /equipo salir               dejar el equipo (si sale el líder, pasa al siguiente)
//  /equipo expulsar <jugador>  (líder)
//  /equipo info                miembros, conectados y dónde están
//  /equipo lista               todos los equipos
//  /eq <mensaje>               chat privado del equipo (también vale /teammsg)
//  Admin: /starvios equipo borrar <nombre>
//  Sin fuego amigo entre compañeros. El nombre del equipo sale delante del nick.
// ============================================================

let EQ = () => global.STARVIOS.equipos;
global.stInvitaciones = global.stInvitaciones || {};

let eqLeer = (server) => {
  let s = server.persistentData.getString('starvios_equipos');
  if (!s) return {};
  try { return JSON.parse(s); } catch (e) { return {}; }
};
let eqGuardar = (server, m) => server.persistentData.putString('starvios_equipos', JSON.stringify(m));
let eqClave = (nombre) => 'st_' + String(nombre).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 12);
let eqDe = (m, n) => {
  let ks = Object.keys(m);
  for (let i = 0; i < ks.length; i++) if (m[ks[i]].miembros.indexOf(n) !== -1) return ks[i];
  return null;
};
global.stEquipoDe = (server, n) => { let m = eqLeer(server); let k = eqDe(m, n); return k ? m[k] : null; };

// Equipo vanilla (prefijo de color, sin fuego amigo)
let eqVanilla = (server, k, eq) => {
  let c = (x) => server.runCommandSilent(x);
  c(`team add ${k}`);
  c(`team modify ${k} displayName {"text":"${eq.nombre}","color":"${eq.color}"}`);
  c(`team modify ${k} color ${eq.color}`);
  c(`team modify ${k} prefix {"text":"[${eq.nombre}] ","color":"${eq.color}"}`);
  c(`team modify ${k} friendlyFire false`);
  c(`team modify ${k} seeFriendlyInvisibles true`);
};

let eqAvisarEquipo = (server, eq, texto) => {
  eq.miembros.forEach(n => { if (server.getPlayer(n)) server.runCommandSilent(`tellraw ${n} ${texto}`); });
};

ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  let yo = (ctx) => ctx.source.player ? ctx.source.player.getName().getString() : null;

  let crear = ctx => {
    let server = ctx.source.server, d = decir(ctx), n = yo(ctx); if (!n) return 0;
    let nombreEq = String(Arguments.STRING.getResult(ctx, 'nombre')).slice(0, 16);
    let k = eqClave(nombreEq);
    let m = eqLeer(server);
    if (k === 'st_') { d('§cUsa letras o números en el nombre.'); return 0; }
    if (eqDe(m, n)) { d('§cYa estás en un equipo. Sal primero con /equipo salir.'); return 0; }
    if (m[k]) { d('§cYa existe un equipo con ese nombre.'); return 0; }
    let usados = Object.keys(m).map(x => m[x].color);
    let libres = EQ().colores.filter(c => usados.indexOf(c) === -1);
    let color = libres.length ? libres[0] : EQ().colores[Object.keys(m).length % EQ().colores.length];
    m[k] = { nombre: nombreEq, lider: n, miembros: [n], color: color };
    eqGuardar(server, m);
    eqVanilla(server, k, m[k]);
    server.runCommandSilent(`team join ${k} ${n}`);
    server.runCommandSilent(`tellraw @a ["",{"text":"⚑ ","color":"${color}"},{"text":"${n}","color":"yellow"},{"text":" ha fundado el equipo ","color":"gray"},{"text":"${nombreEq}","color":"${color}","bold":true}]`);
    d('§7Invita a tus compañeros con §f/equipo invitar <jugador>§7. Habla en privado con §f/eq <mensaje>§7.');
    return 1;
  };

  let invitar = ctx => {
    let server = ctx.source.server, d = decir(ctx), n = yo(ctx); if (!n) return 0;
    let otro = String(Arguments.STRING.getResult(ctx, 'jugador'));
    let m = eqLeer(server), k = eqDe(m, n);
    if (!k) { d('§cNo tienes equipo. Crea uno con /equipo crear <nombre>.'); return 0; }
    if (m[k].lider !== n) { d('§cSolo el líder puede invitar.'); return 0; }
    if (m[k].miembros.length >= EQ().maxMiembros) { d(`§cEl equipo ya tiene el máximo (${EQ().maxMiembros}).`); return 0; }
    if (!server.getPlayer(otro)) { d(`§c${otro} no está conectado.`); return 0; }
    if (eqDe(m, otro)) { d(`§c${otro} ya está en un equipo.`); return 0; }
    global.stInvitaciones[otro] = k;
    let eq = m[k];
    server.runCommandSilent(`tellraw ${otro} ["",{"text":"⚑ ${n} te invita al equipo ","color":"gray"},{"text":"${eq.nombre}","color":"${eq.color}","bold":true},{"text":"  "},` +
      `{"text":"[Aceptar]","color":"green","bold":true,"clickEvent":{"action":"run_command","value":"/equipo aceptar"}},{"text":" "},` +
      `{"text":"[Rechazar]","color":"red","bold":true,"clickEvent":{"action":"run_command","value":"/equipo rechazar"}}]`);
    d(`§6Invitación enviada a §e${otro}§6.`);
    return 1;
  };

  let aceptar = ctx => {
    let server = ctx.source.server, d = decir(ctx), n = yo(ctx); if (!n) return 0;
    let k = global.stInvitaciones[n];
    let m = eqLeer(server);
    if (!k || !m[k]) { d('§cNo tienes invitaciones pendientes.'); return 0; }
    if (eqDe(m, n)) { d('§cYa estás en un equipo.'); return 0; }
    if (m[k].miembros.length >= EQ().maxMiembros) { d('§cEse equipo ya está lleno.'); return 0; }
    m[k].miembros.push(n);
    eqGuardar(server, m);
    delete global.stInvitaciones[n];
    server.runCommandSilent(`team join ${k} ${n}`);
    eqAvisarEquipo(server, m[k], `["",{"text":"⚑ ","color":"${m[k].color}"},{"text":"${n}","color":"yellow"},{"text":" se ha unido al equipo.","color":"gray"}]`);
    return 1;
  };

  let rechazar = ctx => {
    let n = yo(ctx); if (!n) return 0;
    delete global.stInvitaciones[n];
    decir(ctx)('§7Invitación rechazada.');
    return 1;
  };

  let sacar = (server, m, k, n) => {
    let eq = m[k];
    eq.miembros = eq.miembros.filter(x => x !== n);
    server.runCommandSilent(`team leave ${n}`);
    if (!eq.miembros.length) {
      delete m[k];
      server.runCommandSilent(`team remove ${k}`);
      server.runCommandSilent(`tellraw @a {"text":"⚑ El equipo ${eq.nombre} se ha disuelto.","color":"gray"}`);
    } else if (eq.lider === n) {
      eq.lider = eq.miembros[0];
      eqAvisarEquipo(server, eq, `{"text":"⚑ ${eq.lider} es el nuevo líder del equipo.","color":"gold"}`);
    }
    eqGuardar(server, m);
  };

  let salir = ctx => {
    let server = ctx.source.server, d = decir(ctx), n = yo(ctx); if (!n) return 0;
    let m = eqLeer(server), k = eqDe(m, n);
    if (!k) { d('§cNo estás en ningún equipo.'); return 0; }
    let eq = m[k];
    sacar(server, m, k, n);
    if (m[k]) eqAvisarEquipo(server, m[k], `{"text":"⚑ ${n} ha dejado el equipo.","color":"gray"}`);
    d(`§7Has dejado el equipo ${eq.nombre}.`);
    return 1;
  };

  let expulsar = ctx => {
    let server = ctx.source.server, d = decir(ctx), n = yo(ctx); if (!n) return 0;
    let otro = String(Arguments.STRING.getResult(ctx, 'jugador'));
    let m = eqLeer(server), k = eqDe(m, n);
    if (!k || m[k].lider !== n) { d('§cSolo el líder puede expulsar.'); return 0; }
    if (m[k].miembros.indexOf(otro) === -1 || otro === n) { d(`§c${otro} no es miembro de tu equipo.`); return 0; }
    sacar(server, m, k, otro);
    eqAvisarEquipo(server, m[k], `{"text":"⚑ ${otro} ha sido expulsado del equipo.","color":"gray"}`);
    if (server.getPlayer(otro)) server.runCommandSilent(`tellraw ${otro} {"text":"Te han expulsado del equipo.","color":"red"}`);
    return 1;
  };

  let info = ctx => {
    let server = ctx.source.server, d = decir(ctx), n = yo(ctx); if (!n) return 0;
    let m = eqLeer(server), k = eqDe(m, n);
    if (!k) { d('§7No estás en ningún equipo. Crea uno con /equipo crear <nombre>.'); return 0; }
    let eq = m[k];
    d(`§6§l━━ Equipo ${eq.nombre} ━━`);
    eq.miembros.forEach(x => {
      let p = server.getPlayer(x);
      let estado = global.stEliminados(server).indexOf(x) !== -1 ? '§4☠ eliminado' : p ? '§aconectado' : '§7desconectado';
      let donde = '';
      if (p) { let pos = global.stXYZ(p); if (pos) donde = ` §8(${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)})`; }
      d(`${x === eq.lider ? '§e★ ' : '§f• '}§f${x} ${estado}${donde}`);
    });
    return 1;
  };

  let lista = ctx => {
    let m = eqLeer(ctx.source.server), d = decir(ctx);
    let ks = Object.keys(m);
    if (!ks.length) { d('§7Todavía no hay equipos.'); return 1; }
    d('§6§l━━ Equipos ━━');
    ks.forEach(k => d(`§f${m[k].nombre} §7(${m[k].miembros.length}/${EQ().maxMiembros}) §8- ${m[k].miembros.join(', ')}`));
    return 1;
  };

  event.register(Commands.literal('equipo')
    .then(Commands.literal('crear').then(Commands.argument('nombre', Arguments.STRING.create(event)).executes(crear)))
    .then(Commands.literal('invitar').then(Commands.argument('jugador', Arguments.STRING.create(event)).executes(invitar)))
    .then(Commands.literal('aceptar').executes(aceptar))
    .then(Commands.literal('rechazar').executes(rechazar))
    .then(Commands.literal('salir').executes(salir))
    .then(Commands.literal('expulsar').then(Commands.argument('jugador', Arguments.STRING.create(event)).executes(expulsar)))
    .then(Commands.literal('info').executes(info))
    .then(Commands.literal('lista').executes(lista)));

  // /eq <mensaje> : chat del equipo
  event.register(Commands.literal('eq').then(Commands.argument('mensaje', Arguments.GREEDY_STRING.create(event)).executes(ctx => {
    let server = ctx.source.server, n = yo(ctx); if (!n) return 0;
    let eq = global.stEquipoDe(server, n);
    if (!eq) { decir(ctx)('§cNo estás en ningún equipo.'); return 0; }
    let texto = String(Arguments.GREEDY_STRING.getResult(ctx, 'mensaje')).replace(/\\/g, '').replace(/"/g, "'");
    eqAvisarEquipo(server, eq, `["",{"text":"[${eq.nombre}] ","color":"${eq.color}","bold":true},{"text":"${n}: ","color":"white"},{"text":"${texto}","color":"gray"}]`);
    return 1;
  })));

  // Admin
  event.register(Commands.literal('starvios').requires(x => x.hasPermission(2))
    .then(Commands.literal('equipo').then(Commands.literal('borrar').then(Commands.argument('nombre', Arguments.STRING.create(event)).executes(ctx => {
      let server = ctx.source.server;
      let k = eqClave(String(Arguments.STRING.getResult(ctx, 'nombre')));
      let m = eqLeer(server);
      if (!m[k]) { decir(ctx)('§cNo existe ese equipo.'); return 0; }
      server.runCommandSilent(`team remove ${k}`);
      delete m[k];
      eqGuardar(server, m);
      decir(ctx)('§6[Starvios] Equipo borrado.');
      return 1;
    })))));
});
