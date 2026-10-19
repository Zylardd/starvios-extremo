// priority: 40
// ============================================================
//  STARVIOS - COMERCIO SEGURO ENTRE JUGADORES (con Starcoins)
//  /comercio ofrecer <jugador> <precio>   ofrece lo que tienes en la mano
//  /comercio aceptar                      paga y recibe el objeto
//  /comercio rechazar                     el objeto vuelve al vendedor
//  /comercio cancelar                     (vendedor) retira su oferta
//  El objeto queda "en depósito" mientras dura la oferta (60 s): nadie puede estafar.
//  Si el vendedor está desconectado cuando se le devuelve, lo recibe al entrar.
// ============================================================

global.stOfertas = global.stOfertas || {};          // comprador -> oferta

let coDevolverPendiente = (server, n, oferta) => {
  let s = server.persistentData.getString('starvios_devoluciones');
  let m = {};
  try { m = s ? JSON.parse(s) : {}; } catch (e) { m = {}; }
  m[n] = (m[n] || []).concat([oferta]);
  server.persistentData.putString('starvios_devoluciones', JSON.stringify(m));
};

let coDar = (server, n, of) => server.runCommandSilent(`give ${n} ${of.id}${of.nbt || ''} ${of.cant}`);

let coDevolver = (server, of, motivo) => {
  if (server.getPlayer(of.vendedor)) {
    coDar(server, of.vendedor, of);
    server.runCommandSilent(`tellraw ${of.vendedor} {"text":"↩ Tu oferta a ${of.comprador} ${motivo}. Te devolvemos el objeto.","color":"gray"}`);
  } else {
    coDevolverPendiente(server, of.vendedor, of);
  }
};

PlayerEvents.loggedIn(event => {
  let server = event.server, n = event.player.getName().getString();
  let s = server.persistentData.getString('starvios_devoluciones');
  if (!s) return;
  let m = {};
  try { m = JSON.parse(s); } catch (e) { return; }
  if (!m[n]) return;
  server.scheduleInTicks(40, () => {
    m[n].forEach(of => coDar(server, n, of));
    server.runCommandSilent(`tellraw ${n} {"text":"↩ Has recibido objetos de ofertas que no se completaron.","color":"gray"}`);
    delete m[n];
    server.persistentData.putString('starvios_devoluciones', JSON.stringify(m));
  });
});

ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  let sim = () => global.STARVIOS.economia.simbolo;

  let ofrecer = ctx => {
    let server = ctx.source.server, d = decir(ctx);
    let p = ctx.source.player; if (!p) return 0;
    let n = p.getName().getString();
    let otro = String(Arguments.STRING.getResult(ctx, 'jugador'));
    let precio = Arguments.INTEGER.getResult(ctx, 'precio');
    if (precio < 0) { d('§cEl precio no puede ser negativo.'); return 0; }
    if (otro === n) { d('§cNo puedes comerciar contigo mismo.'); return 0; }
    if (!server.getPlayer(otro)) { d(`§c${otro} no está conectado.`); return 0; }
    if (global.stOfertas[otro]) { d(`§c${otro} ya tiene una oferta pendiente. Espera unos segundos.`); return 0; }

    let it = p.mainHandItem, id = null, cant = 0, nbt = '';
    try { id = String(it.getId()); } catch (e) { try { id = String(it.id); } catch (e2) {} }
    try { cant = Number(it.getCount()); } catch (e) { cant = Number(it.count); }
    try { if (it.nbt) nbt = String(it.nbt); } catch (e) {}
    if (!id || id === 'minecraft:air' || !cant) { d('§cSujeta en la mano lo que quieras ofrecer.'); return 0; }
    if (nbt.indexOf('starvios_moneda') !== -1) { d('§cPara pasar monedas usa /pagar.'); return 0; }

    // Depósito: el objeto sale de la mano del vendedor
    server.runCommandSilent(`item replace entity ${n} weapon.mainhand with minecraft:air`);
    let of = { vendedor: n, comprador: otro, id: id, cant: cant, nbt: nbt, precio: precio, hora: Date.now() };
    global.stOfertas[otro] = of;

    let nombreItem = id.replace(/^[a-z0-9_]+:/, '').replace(/_/g, ' ');
    server.runCommandSilent(`tellraw ${otro} ["",{"text":"⇄ ${n} te ofrece ","color":"gray"},{"text":"${cant}× ${nombreItem}","color":"aqua","bold":true},` +
      `{"text":" por ","color":"gray"},{"text":"${precio} ${sim()}","color":"yellow","bold":true},{"text":"  "},` +
      `{"text":"[Aceptar]","color":"green","bold":true,"clickEvent":{"action":"run_command","value":"/comercio aceptar"}},{"text":" "},` +
      `{"text":"[Rechazar]","color":"red","bold":true,"clickEvent":{"action":"run_command","value":"/comercio rechazar"}}]`);
    d(`§6Oferta enviada a §e${otro}§6: ${cant}× ${nombreItem} por §e${precio} ${sim()}§6. Caduca en 60 s.`);

    // Caduca a los 60 s
    let hora = of.hora;
    server.scheduleInTicks(1200, () => {
      let actual = global.stOfertas[otro];
      if (!actual || actual.hora !== hora) return;
      delete global.stOfertas[otro];
      coDevolver(server, actual, 'ha caducado');
    });
    return 1;
  };

  let aceptar = ctx => {
    let server = ctx.source.server, d = decir(ctx);
    let p = ctx.source.player; if (!p) return 0;
    let n = p.getName().getString();
    let of = global.stOfertas[n];
    if (!of) { d('§cNo tienes ofertas pendientes.'); return 0; }
    if (global.stSaldo(server, n) < of.precio) { d(`§cTe faltan monedas: cuesta ${of.precio} ${sim()}.`); return 0; }
    delete global.stOfertas[n];
    if (of.precio > 0) {
      if (!global.stQuitarDinero(server, n, of.precio)) { global.stOfertas[n] = of; d('§cTe faltan monedas.'); return 0; }
      global.stDarDinero(server, of.vendedor, of.precio, `venta a ${n}`);
    }
    coDar(server, n, of);
    server.runCommandSilent(`execute at ${n} run playsound minecraft:entity.villager.yes master ${n} ~ ~ ~ 0.7 1`);
    d(`§aTrato hecho. Pagaste ${of.precio} ${sim()} a ${of.vendedor}.`);
    return 1;
  };

  let rechazar = ctx => {
    let server = ctx.source.server, d = decir(ctx);
    let n = ctx.source.player ? ctx.source.player.getName().getString() : null; if (!n) return 0;
    let of = global.stOfertas[n];
    if (!of) { d('§cNo tienes ofertas pendientes.'); return 0; }
    delete global.stOfertas[n];
    coDevolver(server, of, 'ha sido rechazada');
    d('§7Oferta rechazada.');
    return 1;
  };

  let cancelar = ctx => {
    let server = ctx.source.server, d = decir(ctx);
    let n = ctx.source.player ? ctx.source.player.getName().getString() : null; if (!n) return 0;
    let k = Object.keys(global.stOfertas).filter(c => global.stOfertas[c].vendedor === n)[0];
    if (!k) { d('§cNo tienes ofertas enviadas.'); return 0; }
    let of = global.stOfertas[k];
    delete global.stOfertas[k];
    coDevolver(server, of, 'ha sido cancelada');
    if (server.getPlayer(k)) server.runCommandSilent(`tellraw ${k} {"text":"⇄ ${n} ha retirado su oferta.","color":"gray"}`);
    return 1;
  };

  event.register(Commands.literal('comercio')
    .then(Commands.literal('ofrecer').then(Commands.argument('jugador', Arguments.STRING.create(event))
      .then(Commands.argument('precio', Arguments.INTEGER.create(event)).executes(ofrecer))))
    .then(Commands.literal('aceptar').executes(aceptar))
    .then(Commands.literal('rechazar').executes(rechazar))
    .then(Commands.literal('cancelar').executes(cancelar)));
});
