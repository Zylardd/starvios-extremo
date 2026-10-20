// priority: 90
// ============================================================
//  STARVIOS - CASINO (cobra y paga en Starcoins, del banco)
//  /duelo <jugador> <cantidad>     reta a otro jugador a cara o cruz (el ganador se lleva el bote)
//  /duelo aceptar | rechazar
//  /ruleta                         ver cómo apostar
//  /ruleta <rojo|negro|verde|0-36> <cantidad>
//  /loteria                        bote actual y tus boletos
//  /loteria comprar <boletos>      el sorteo es cada amanecer
//  Admin: /starvios casino abrir | cerrar     /starvios loteria sortear
//  La tragamonedas y la gacha son máquinas del mod Lightman's Currency.
// ============================================================

let CS = () => global.STARVIOS.casino || {};
let csSim = () => global.STARVIOS.economia.simbolo;
let csTxt = (v) => `${v} ${csSim()}`;
let csAbierto = (server) => !server.persistentData.getBoolean('starvios_casino_cerrado');
let csNombre = (p) => p.getName().getString();
let csCmd = (server, c) => server.runCommandSilent(c);
let csSonido = (server, n, s, vol, tono) => csCmd(server, `execute at ${n} run playsound ${s} master ${n} ~ ~ ~ ${vol || 1} ${tono || 1}`);

global.stDuelos = global.stDuelos || {};
global.stRuletaOcupado = global.stRuletaOcupado || {};

// ============================================================
//  DUELO DE MONEDA
// ============================================================
let duRetar = (ctx, d, otro, c) => {
  let server = ctx.source.server, p = ctx.source.player;
  if (!p) return 0;
  let n = csNombre(p);
  if (!csAbierto(server)) { d('§cEl casino está cerrado.'); return 0; }
  otro = String(otro);
  if (c <= 0) { d('§cLa apuesta debe ser mayor que 0.'); return 0; }
  if (otro.toLowerCase() === n.toLowerCase()) { d('§cNo puedes retarte a ti mismo.'); return 0; }
  let po = server.getPlayer(otro);
  if (!po) { d(`§c${otro} no está conectado.`); return 0; }
  otro = csNombre(po);
  if (global.stSaldo(server, n) < c) { d(`§cNo tienes ${csTxt(c)} en el banco.`); return 0; }
  global.stDuelos[otro] = { de: n, cantidad: c, hora: Date.now() };
  d(`§6Retaste a §e${otro}§6 a un duelo de moneda por §e${csTxt(c)}§6. Tiene 30 segundos para aceptar.`);
  csCmd(server, `tellraw ${otro} ["",{"text":"🪙 ","color":"gold"},{"text":"${n}","color":"yellow","bold":true},{"text":" te reta a un duelo de moneda por ","color":"gold"},{"text":"${csTxt(c)}","color":"yellow","bold":true},{"text":"  "},` +
    `{"text":"[Aceptar]","color":"green","bold":true,"clickEvent":{"action":"run_command","value":"/duelo aceptar"},"hoverEvent":{"action":"show_text","contents":"Apostar ${csTxt(c)}"}},{"text":" "},` +
    `{"text":"[Rechazar]","color":"red","bold":true,"clickEvent":{"action":"run_command","value":"/duelo rechazar"}}]`);
  csSonido(server, otro, 'minecraft:block.note_block.bell', 1, 1.2);
  return 1;
};

let duAceptar = (ctx, d) => {
  let server = ctx.source.server, p = ctx.source.player;
  if (!p) return 0;
  let n = csNombre(p);
  let r = global.stDuelos[n];
  if (!r) { d('§cNo tienes ningún reto pendiente.'); return 0; }
  delete global.stDuelos[n];
  if (Date.now() - r.hora > 30000) { d('§cEl reto ya expiró.'); return 0; }
  if (!server.getPlayer(r.de)) { d(`§c${r.de} ya no está conectado.`); return 0; }
  if (!csAbierto(server)) { d('§cEl casino está cerrado.'); return 0; }
  let c = r.cantidad;
  if (!global.stQuitarDinero(server, r.de, c)) {
    d(`§c${r.de} ya no tiene ${csTxt(c)}. Duelo cancelado.`);
    csCmd(server, `tellraw ${r.de} {"text":"Duelo cancelado: no tienes ${csTxt(c)} en el banco.","color":"red"}`);
    return 0;
  }
  if (!global.stQuitarDinero(server, n, c)) {
    global.stDarDinero(server, r.de, c, 'duelo cancelado');
    d(`§cNo tienes ${csTxt(c)} en el banco. Duelo cancelado.`);
    return 0;
  }
  let a = r.de, b = n;
  // a = cara, b = cruz
  let gana = Math.random() < 0.5 ? a : b;
  let lado = gana === a ? 'CARA' : 'CRUZ';
  let premio = Math.floor(c * 2 * (1 - (CS().comisionDuelo || 0)));
  let ambos = (cmd) => [a, b].forEach(x => csCmd(server, cmd.replace(/@J/g, x)));
  ambos(`title @J times 0 20 10`);
  ambos(`title @J subtitle {"text":"${a} (cara) vs ${b} (cruz) · ${csTxt(c * 2)}","color":"gray"}`);
  let frames = 14;
  for (let i = 0; i < frames; i++) {
    let t = Math.floor(2 * i + i * i * 0.25);
    let cara = i % 2 === 0;
    server.scheduleInTicks(t, () => {
      ambos(`title @J title {"text":"${cara ? '🪙 CARA' : '🪙 CRUZ'}","color":"${cara ? 'yellow' : 'white'}"}`);
      ambos(`execute at @J run playsound minecraft:block.note_block.hat master @J ~ ~ ~ 0.8 ${(1 + i * 0.05).toFixed(2)}`);
    });
  }
  let fin = Math.floor(2 * frames + frames * frames * 0.25) + 6;
  server.scheduleInTicks(fin, () => {
    ambos(`title @J times 5 50 15`);
    ambos(`title @J subtitle {"text":"¡Gana ${gana}! (+${csTxt(premio)})","color":"gold"}`);
    ambos(`title @J title {"text":"🪙 ${lado}","color":"gold","bold":true}`);
    global.stDarDinero(server, gana, premio, 'duelo ganado');
    let pierde = gana === a ? b : a;
    csSonido(server, gana, 'minecraft:entity.player.levelup', 1, 1);
    csSonido(server, pierde, 'minecraft:entity.villager.no', 1, 0.8);
    csCmd(server, `tellraw @a ["",{"text":"🪙 ","color":"gold"},{"text":"${gana}","color":"yellow","bold":true},{"text":" le ganó un duelo de moneda a ","color":"gray"},{"text":"${pierde}","color":"yellow"},{"text":" y se llevó ${csTxt(premio)}.","color":"gray"}]`);
  });
  return 1;
};

// ============================================================
//  RULETA (europea: 0-36)
// ============================================================
let RU_ROJOS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
let ruColor = (x) => x === 0 ? 'verde' : RU_ROJOS.indexOf(x) !== -1 ? 'rojo' : 'negro';
let ruMc = (col) => col === 'verde' ? 'green' : col === 'rojo' ? 'red' : 'dark_gray';

let ruAyuda = (server, n) => {
  csCmd(server, `tellraw ${n} {"text":"━━ 🎡 Ruleta ━━","color":"gold","bold":true}`);
  csCmd(server, `tellraw ${n} {"text":"Rojo o negro paga x${CS().pagoColor || 2} · Verde (0) paga x${CS().pagoVerde || 14} · Número exacto paga x${CS().pagoNumero || 36}","color":"gray"}`);
  csCmd(server, `tellraw ${n} ["",{"text":"[Rojo] ","color":"red","bold":true,"clickEvent":{"action":"suggest_command","value":"/ruleta rojo "}},` +
    `{"text":"[Negro] ","color":"dark_gray","bold":true,"clickEvent":{"action":"suggest_command","value":"/ruleta negro "}},` +
    `{"text":"[Verde] ","color":"green","bold":true,"clickEvent":{"action":"suggest_command","value":"/ruleta verde "}},` +
    `{"text":"[Número] ","color":"white","bold":true,"clickEvent":{"action":"suggest_command","value":"/ruleta 17 "}},` +
    `{"text":"← clic y escribe cuánto apuestas","color":"dark_gray"}]`);
};

let ruJugar = (ctx, d, eleccion, c) => {
  let server = ctx.source.server, p = ctx.source.player;
  if (!p) return 0;
  let n = csNombre(p);
  if (!csAbierto(server)) { d('§cEl casino está cerrado.'); return 0; }
  eleccion = String(eleccion).toLowerCase();
  let num = null;
  if (/^\d+$/.test(eleccion)) {
    num = parseInt(eleccion);
    if (num < 0 || num > 36) { d('§cEl número debe ser de 0 a 36.'); return 0; }
  } else if (['rojo', 'negro', 'verde'].indexOf(eleccion) === -1) { ruAyuda(server, n); return 0; }
  if (c <= 0) { d('§cLa apuesta debe ser mayor que 0.'); return 0; }
  if (global.stRuletaOcupado[n]) { d('§cEspera a que termine tu tirada.'); return 0; }
  if (!global.stQuitarDinero(server, n, c)) { d(`§cNo tienes ${csTxt(c)} en el banco.`); return 0; }
  global.stRuletaOcupado[n] = true;

  let sale = Math.floor(Math.random() * 37);
  let col = ruColor(sale);
  let gana = 0;
  if (num !== null) { if (sale === num) gana = c * (CS().pagoNumero || 36); }
  else if (eleccion === 'verde') { if (sale === 0) gana = c * (CS().pagoVerde || 14); }
  else if (eleccion === col) gana = c * (CS().pagoColor || 2);
  let apuestaTxt = num !== null ? `al ${num}` : `al ${eleccion}`;

  csCmd(server, `title ${n} times 0 20 10`);
  csCmd(server, `title ${n} subtitle {"text":"Apostaste ${csTxt(c)} ${apuestaTxt}","color":"gray"}`);
  let frames = 18, t = 0;
  for (let i = 0; i < frames; i++) {
    t += 2 + Math.floor(i * 0.6);
    let x = i === frames - 1 ? sale : Math.floor(Math.random() * 37);
    let ultimo = i === frames - 1;
    server.scheduleInTicks(t, () => {
      csCmd(server, `title ${n} title {"text":"🎡 ${x}","color":"${ruMc(ruColor(x))}","bold":${ultimo}}`);
      csSonido(server, n, 'minecraft:block.note_block.hat', 0.8, ultimo ? 0.6 : 1.4);
    });
  }
  server.scheduleInTicks(t + 15, () => {
    global.stRuletaOcupado[n] = false;
    csCmd(server, `title ${n} times 5 50 15`);
    csCmd(server, `title ${n} title {"text":"🎡 ${sale} ${col.toUpperCase()}","color":"${ruMc(col)}","bold":true}`);
    if (gana > 0) {
      csCmd(server, `title ${n} subtitle {"text":"¡Ganaste ${csTxt(gana)}!","color":"gold"}`);
      global.stDarDinero(server, n, gana, 'ruleta');
      csSonido(server, n, 'minecraft:entity.player.levelup', 1, 1);
      if (gana >= c * 10) csCmd(server, `tellraw @a ["",{"text":"🎡 ","color":"gold"},{"text":"${n}","color":"yellow","bold":true},{"text":" acertó el ${sale} en la ruleta y ganó ${csTxt(gana)}!","color":"gold"}]`);
    } else {
      csCmd(server, `title ${n} subtitle {"text":"Perdiste ${csTxt(c)}","color":"red"}`);
      csSonido(server, n, 'minecraft:block.note_block.bass', 1, 0.5);
    }
  });
  return 1;
};

// ============================================================
//  LOTERÍA DIARIA (sorteo al amanecer)
// ============================================================
let loLeer = (server) => {
  let o = {};
  try { o = JSON.parse(server.persistentData.getString('starvios_loteria') || '{}'); } catch (e) {}
  if (!o.bote) o.bote = 0;
  if (!o.boletos) o.boletos = {};
  return o;
};
let loGuardar = (server, o) => server.persistentData.putString('starvios_loteria', JSON.stringify(o));
let loTotal = (o) => Object.keys(o.boletos).reduce((s, k) => s + o.boletos[k], 0);

let loInfo = (server, n) => {
  let o = loLeer(server);
  let mios = o.boletos[n] || 0, tot = loTotal(o);
  csCmd(server, `tellraw ${n} {"text":"━━ 🎟 Lotería diaria ━━","color":"gold","bold":true}`);
  csCmd(server, `tellraw ${n} ["",{"text":"Bote: ","color":"gray"},{"text":"${csTxt(o.bote)}","color":"yellow","bold":true},{"text":"  ·  Boletos vendidos: ${tot}  ·  Tuyos: ${mios}${tot ? ' (' + Math.round(mios * 100 / tot) + '%)' : ''}","color":"gray"}]`);
  csCmd(server, `tellraw ${n} ["",{"text":"El sorteo es al amanecer. Cada boleto cuesta ${csTxt(CS().precioBoleto || 20)}.  ","color":"gray"},` +
    `{"text":"[Comprar 1]","color":"green","bold":true,"clickEvent":{"action":"run_command","value":"/loteria comprar 1"}},{"text":" "},` +
    `{"text":"[Comprar 5]","color":"green","bold":true,"clickEvent":{"action":"run_command","value":"/loteria comprar 5"}},{"text":" "},` +
    `{"text":"[Otra cantidad]","color":"aqua","clickEvent":{"action":"suggest_command","value":"/loteria comprar "}}]`);
};

let loComprar = (ctx, d, cant) => {
  let server = ctx.source.server, p = ctx.source.player;
  if (!p) return 0;
  let n = csNombre(p);
  if (!csAbierto(server)) { d('§cEl casino está cerrado.'); return 0; }
  if (cant <= 0) { d('§cCompra al menos 1 boleto.'); return 0; }
  let precio = (CS().precioBoleto || 20) * cant;
  if (!global.stQuitarDinero(server, n, precio)) { d(`§cNo tienes ${csTxt(precio)} en el banco.`); return 0; }
  let o = loLeer(server);
  o.bote += precio;
  o.boletos[n] = (o.boletos[n] || 0) + cant;
  loGuardar(server, o);
  d(`§6Compraste §e${cant}§6 boleto(s). Tienes §e${o.boletos[n]}§6. Bote: §e${csTxt(o.bote)}`);
  csSonido(server, n, 'minecraft:entity.villager.yes', 0.8, 1.2);
  if (cant >= 10) csCmd(server, `tellraw @a ["",{"text":"🎟 ","color":"gold"},{"text":"${n}","color":"yellow"},{"text":" compró ${cant} boletos. ¡El bote ya va en ${csTxt(o.bote)}!","color":"gray"}]`);
  return 1;
};

let loSortear = (server) => {
  let o = loLeer(server);
  let nombres = Object.keys(o.boletos), tot = loTotal(o);
  if (!tot) {
    if (o.bote > 0) csCmd(server, `tellraw @a ["",{"text":"🎟 Lotería: ","color":"gold","bold":true},{"text":"nadie compró boletos. El bote de ${csTxt(o.bote)} se acumula para mañana.","color":"gray"}]`);
    return;
  }
  let r = Math.random() * tot, gana = nombres[0];
  for (let i = 0; i < nombres.length; i++) { r -= o.boletos[nombres[i]]; if (r <= 0) { gana = nombres[i]; break; } }
  let premio = Math.floor(o.bote * (CS().premioLoteria == null ? 0.9 : CS().premioLoteria));
  let mios = o.boletos[gana];
  loGuardar(server, { bote: 0, boletos: {} });
  csCmd(server, `title @a times 0 20 10`);
  csCmd(server, `title @a subtitle {"text":"Sorteo de la lotería · Bote ${csTxt(o.bote)}","color":"gray"}`);
  let t = 0;
  for (let i = 0; i < 16; i++) {
    t += 3 + Math.floor(i * 0.5);
    let x = nombres[Math.floor(Math.random() * nombres.length)];
    server.scheduleInTicks(t, () => {
      csCmd(server, `title @a title {"text":"🎟 ${x}","color":"white"}`);
      csCmd(server, `execute as @a at @s run playsound minecraft:block.note_block.chime master @s ~ ~ ~ 0.5 ${(1 + i * 0.05).toFixed(2)}`);
    });
  }
  server.scheduleInTicks(t + 12, () => {
    csCmd(server, `title @a times 5 60 20`);
    csCmd(server, `title @a title {"text":"🎟 ${gana}","color":"gold","bold":true}`);
    csCmd(server, `title @a subtitle {"text":"¡Gana la lotería! +${csTxt(premio)}","color":"yellow"}`);
    csCmd(server, `execute as @a at @s run playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 0.8 1`);
    csCmd(server, `tellraw @a ["",{"text":"🎟 ","color":"gold"},{"text":"${gana}","color":"yellow","bold":true},{"text":" ganó la lotería con ${mios} de ${tot} boletos y se lleva ${csTxt(premio)}.","color":"gold"}]`);
    global.stDarDinero(server, gana, premio, 'lotería');
  });
};

// Sorteo automático al amanecer
global.stLotTick = 0;
global.stLotHoraAnt = -1;
ServerEvents.tick(event => { global.stSeguro('91_casino (lotería)', () => {
  global.stLotTick = (global.stLotTick || 0) + 1;
  if (global.stLotTick % 20 !== 0) return;
  let server = event.server;
  let lv = server.getLevel('minecraft:overworld');
  if (!lv) return;
  let t = 0;
  try { t = Number(lv.getDayTime()) % 24000; } catch (e) { return; }
  let ant = global.stLotHoraAnt;
  global.stLotHoraAnt = t;
  if (ant < 0 || !(ant > t)) return;   // solo cuando el reloj vuelve a 0 (amanecer, también al dormir)
  if (!global.stActivo(server) || !csAbierto(server)) return;
  loSortear(server);
}); });

// ============================================================
//  Comandos
// ============================================================
ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));

  event.register(Commands.literal('duelo')
    .then(Commands.literal('aceptar').executes(ctx => duAceptar(ctx, decir(ctx))))
    .then(Commands.literal('rechazar').executes(ctx => {
      let p = ctx.source.player; if (!p) return 0;
      let n = csNombre(p), r = global.stDuelos[n];
      if (!r) { decir(ctx)('§cNo tienes ningún reto pendiente.'); return 0; }
      delete global.stDuelos[n];
      decir(ctx)('§7Rechazaste el duelo.');
      ctx.source.server.runCommandSilent(`tellraw ${r.de} {"text":"${n} rechazó tu duelo de moneda.","color":"red"}`);
      return 1;
    }))
    .then(Commands.argument('jugador', Arguments.STRING.create(event))
      .then(Commands.argument('cantidad', Arguments.INTEGER.create(event)).executes(ctx => {
        return duRetar(ctx, decir(ctx), Arguments.STRING.getResult(ctx, 'jugador'), Arguments.INTEGER.getResult(ctx, 'cantidad'));
      }))));

  event.register(Commands.literal('ruleta')
    .executes(ctx => { let p = ctx.source.player; if (p) ruAyuda(ctx.source.server, csNombre(p)); return 1; })
    .then(Commands.argument('apuesta', Arguments.STRING.create(event))
      .executes(ctx => { let p = ctx.source.player; if (p) ruAyuda(ctx.source.server, csNombre(p)); return 1; })
      .then(Commands.argument('cantidad', Arguments.INTEGER.create(event)).executes(ctx =>
        ruJugar(ctx, decir(ctx), Arguments.STRING.getResult(ctx, 'apuesta'), Arguments.INTEGER.getResult(ctx, 'cantidad'))))));

  event.register(Commands.literal('loteria')
    .executes(ctx => { let p = ctx.source.player; if (p) loInfo(ctx.source.server, csNombre(p)); return 1; })
    .then(Commands.literal('comprar').then(Commands.argument('boletos', Arguments.INTEGER.create(event)).executes(ctx =>
      loComprar(ctx, decir(ctx), Arguments.INTEGER.getResult(ctx, 'boletos'))))));

  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('casino')
      .then(Commands.literal('abrir').executes(ctx => {
        ctx.source.server.persistentData.putBoolean('starvios_casino_cerrado', false);
        ctx.source.server.runCommandSilent(`tellraw @a {"text":"🎰 ¡El casino está abierto! /ruleta · /duelo · /loteria","color":"gold","bold":true}`);
        return 1;
      }))
      .then(Commands.literal('cerrar').executes(ctx => {
        ctx.source.server.persistentData.putBoolean('starvios_casino_cerrado', true);
        ctx.source.server.runCommandSilent(`tellraw @a {"text":"🎰 El casino está cerrado.","color":"red"}`);
        return 1;
      })))
    .then(Commands.literal('loteria').then(Commands.literal('sortear').executes(ctx => { loSortear(ctx.source.server); return 1; }))));
});
