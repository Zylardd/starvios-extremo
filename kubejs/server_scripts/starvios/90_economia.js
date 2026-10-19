// priority: 100
// ============================================================
//  STARVIOS - ECONOMÍA (Starcoins)
//  Jugadores:  /dinero  /pagar <jugador> <cantidad>  /tienda  /comprar <clave> [veces]
//              /vender  (lo que tienes en la mano)  /retirar <cantidad>  /top
//  Admin:      /starvios dinero ver|dar|quitar|poner <jugador> [cantidad]
//  Las monedas físicas (/retirar) se depositan con clic derecho.
// ============================================================

let EC = () => global.STARVIOS.economia;
let NBT_MONEDA = () => `{starvios_moneda:1b,Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],HideFlags:1,` +
  `display:{Name:'{"text":"${EC().simbolo} ${EC().nombre}","color":"gold","italic":false}',` +
  `Lore:['{"text":"Clic derecho para guardarla en tu saldo.","color":"gray","italic":false}']}}`;

// ---------- Saldo ----------
// Con Lightman's Currency instalado, el saldo ES la cuenta del banco del mod (moneda kubejs:starcoin).
// Sin el mod, se usa el sistema antiguo (saldo guardado en el mundo).
let LC_MONEDA = 'kubejs:starcoin';
let ecLC = () => { try { return EC().monedaMod !== false && Platform.isLoaded('lightmanscurrency'); } catch (e) { return false; } };
global.stMonedaMod = ecLC;
let lcValor = (c) => `${Math.floor(c)}-${LC_MONEDA}`;

let ecLeer = (server) => {
  let s = server.persistentData.getString('starvios_dinero');
  if (!s) return {};
  try { return JSON.parse(s); } catch (e) { return {}; }
};
let ecGuardar = (server, m) => server.persistentData.putString('starvios_dinero', JSON.stringify(m));
let ecJson = (server, k) => { try { return JSON.parse(server.persistentData.getString(k) || '{}'); } catch (e) { return {}; } };

let PBR = null;
let lcSaldoJava = (p) => {
  if (PBR === false) return null;
  try {
    if (!PBR) PBR = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.bank.reference.builtin.PlayerBankReference');
    let acc = PBR.of(p).get();
    if (!acc) return 0;
    let tot = 0;
    acc.getMoneyStorage().allValues().forEach(v => { tot += Number(v.getCoreValue()); });
    return tot;
  } catch (e) { PBR = false; console.warn(`[Starvios] No pude leer el banco por Java, uso comandos: ${e}`); return null; }
};
// Lectura por comandos (vale también desconectado): búsqueda binaria con /lcbank check
let lcSaldoCmd = (server, n) => {
  let tiene = (c) => Number(server.runCommandSilent(`lcbank check player offline ${n} ${lcValor(c)}`)) > 0;
  if (!tiene(1)) return 0;
  let lo = 1, hi = 2;
  while (hi < 1000000000 && tiene(hi)) { lo = hi; hi *= 2; }
  while (hi - lo > 1) { let m = Math.floor((lo + hi) / 2); if (tiene(m)) lo = m; else hi = m; }
  return lo;
};

global.stSaldo = (server, n) => {
  if (!ecLC()) {
    let m = ecLeer(server);
    if (m[n] == null) { m[n] = EC().saldoInicial; ecGuardar(server, m); }
    return m[n];
  }
  let p = server.getPlayer(n);
  if (p) { let v = lcSaldoJava(p); if (v != null) return v; }
  return lcSaldoCmd(server, n);
};
let ecMarcador = (server, n) => {
  try { server.runCommandSilent(`scoreboard players set ${n} st_dinero ${global.stSaldo(server, n)}`); } catch (e) {}
};

// Suma dinero (si está desconectado, se le deposita al entrar)
let ecSumar = (server, n, c) => {
  if (c <= 0) return true;
  if (!ecLC()) { let m = ecLeer(server); m[n] = Math.max(0, Math.floor(global.stSaldo(server, n) + c)); ecGuardar(server, m); return true; }
  if (server.getPlayer(n)) return Number(server.runCommandSilent(`lcbank give players ${n} ${lcValor(c)} false`)) > 0;
  let pend = ecJson(server, 'starvios_lc_pend');
  pend[n] = (pend[n] || 0) + Math.floor(c);
  server.persistentData.putString('starvios_lc_pend', JSON.stringify(pend));
  return true;
};
let ecQuitar = (server, n, cantidad) => {
  if (cantidad <= 0) return true;
  if (!ecLC()) {
    let s = global.stSaldo(server, n);
    if (s < cantidad) return false;
    let m = ecLeer(server); m[n] = s - cantidad; ecGuardar(server, m);
    ecMarcador(server, n);
    return true;
  }
  if (!server.getPlayer(n)) return false;
  if (Number(server.runCommandSilent(`lcbank check player online ${n} ${lcValor(cantidad)}`)) <= 0) return false;
  server.runCommandSilent(`lcbank take players ${n} ${lcValor(cantidad)} false`);
  ecMarcador(server, n);
  return true;
};
let ecPoner = (server, n, v) => {
  let actual = global.stSaldo(server, n);
  v = Math.max(0, Math.floor(v));
  if (v > actual) ecSumar(server, n, v - actual);
  else if (v < actual) {
    if (ecLC()) server.runCommandSilent(`lcbank take players ${n} ${lcValor(actual - v)} false`);
    else { let m = ecLeer(server); m[n] = v; ecGuardar(server, m); }
  }
  ecMarcador(server, n);
  return v;
};
let ecTexto = (v) => `${v} ${EC().simbolo}`;

// Da dinero y avisa encima del inventario
global.stDarDinero = (server, n, cantidad, motivo) => {
  if (!n || !cantidad) return;
  ecSumar(server, n, cantidad);
  if (!server.getPlayer(n)) return;
  let v = global.stSaldo(server, n);
  server.runCommandSilent(`scoreboard players set ${n} st_dinero ${v}`);
  server.runCommandSilent(`title ${n} actionbar {"text":"+${cantidad} ${EC().simbolo} ${motivo ? '(' + motivo + ')' : ''}  ·  Banco: ${v} ${EC().simbolo}","color":"gold"}`);
  server.runCommandSilent(`execute at ${n} run playsound minecraft:entity.experience_orb.pickup master ${n} ~ ~ ~ 0.6 1.4`);
};

// Recompensa de jefe: a todos los jugadores vivos (supervivencia) conectados
global.stRecompensaJefe = (server) => {
  let c = EC().ganancias.jefe;
  server.players.forEach(p => {
    let n = p.getName().getString();
    if (global.stEliminados(server).indexOf(n) !== -1) return;
    global.stDarDinero(server, n, c, 'Jefe derrotado');
  });
};

global.stQuitarDinero = ecQuitar;

// Al entrar: saldo inicial / lo que tenía en el sistema antiguo / depósitos pendientes
PlayerEvents.loggedIn(event => {
  let server = event.server, n = event.player.getName().getString();
  if (!ecLC()) return;
  server.scheduleInTicks(80, () => {
    let ini = ecJson(server, 'starvios_lc_ini');
    if (!ini[n]) {
      let viejo = ecLeer(server)[n];
      let c = viejo != null ? viejo : EC().saldoInicial;
      ini[n] = true;
      server.persistentData.putString('starvios_lc_ini', JSON.stringify(ini));
      if (c > 0) ecSumar(server, n, c);
    }
    let pend = ecJson(server, 'starvios_lc_pend');
    if (pend[n]) {
      let c = pend[n]; delete pend[n];
      server.persistentData.putString('starvios_lc_pend', JSON.stringify(pend));
      global.stDarDinero(server, n, c, 'mientras no estabas');
    }
    ecMarcador(server, n);
  });
});

// Con el mod: el marcador del TAB se actualiza cada 30 s (por si usan el cajero)
global.stEcoTick = 0;
ServerEvents.tick(event => { global.stSeguro('90_economia (marcador banco)', () => {
  global.stEcoTick = (global.stEcoTick || 0) + 1;
  if (global.stEcoTick % 600 !== 0 || !ecLC()) return;
  event.server.players.forEach(p => ecMarcador(event.server, p.getName().getString()));
}); });

// Marcador en la lista TAB
global.stEcoListo = false;
ServerEvents.tick(event => { global.stSeguro('90_economia (marcador)', () => {
  if (global.stEcoListo) return;
  global.stEcoListo = true;
  let server = event.server;
  server.runCommandSilent(`scoreboard objectives add st_dinero dummy {"text":"${EC().simbolo}","color":"gold"}`);
  server.runCommandSilent(`scoreboard objectives setdisplay list st_dinero`);
  if (ecLC()) return;
  let m = ecLeer(server);
  Object.keys(m).forEach(n => server.runCommandSilent(`scoreboard players set ${n} st_dinero ${m[n]}`));
}); });

PlayerEvents.loggedIn(event => {
  if (ecLC()) return;
  let n = event.player.getName().getString();
  let v = global.stSaldo(event.server, n);
  event.server.runCommandSilent(`scoreboard players set ${n} st_dinero ${v}`);
});

// Monedas al matar monstruos normales
EntityEvents.death(event => { global.stSeguro('90_economia (muerte)', () => {
  let e = event.entity;
  if (!e || e.isPlayer() || !e.isMonster()) return;
  let tags = String(e.getTags());
  if (tags.indexOf('starvios_elite') !== -1 || tags.indexOf('starvios_jefe') !== -1 || tags.indexOf('starvios_cripta_jefe') !== -1) return;
  let k = event.source.player;
  if (!k) return;
  let g = EC().ganancias.mobNormal;
  if (Math.random() >= g.prob) return;
  let n = g.min + Math.floor(Math.random() * (g.max - g.min + 1));
  if (global.stEfMultDinero) n = n * global.stEfMultDinero(e.server, 'mob');   // anomalía día 5
  global.stDarDinero(e.server, k.getName().getString(), n, null);
}); });

// Depositar monedas físicas con clic derecho
ItemEvents.rightClicked(event => {
  if (String(event.hand) !== 'MAIN_HAND') return;
  let p = event.player;
  if (!p) return;
  let it = p.mainHandItem;
  let nbt = null;
  try { nbt = it.nbt; } catch (err) {}
  if (!nbt || !nbt.contains('starvios_moneda')) return;
  let cant = 0;
  try { cant = Number(it.getCount()); } catch (err) { cant = Number(it.count); }
  let n = p.getName().getString();
  p.server.runCommandSilent(`item replace entity ${n} weapon.mainhand with minecraft:air`);
  global.stDarDinero(p.server, n, cant, 'depósito');
  event.cancel();   // siempre al final
});

// ---------- Utilidades de comandos ----------
let ecPuedeComerciar = (ctx, avisar) => {
  if (!EC().tiendaSoloEnSpawn) return true;
  let p = ctx.source.player;
  if (p && (p.hasPermissions(2) || global.stObjEnSpawn(p))) return true;
  avisar('§cSolo puedes comerciar dentro de la ciudad del spawn.');
  return false;
};

// Precio con anomalías (día 17: la comida cuesta la mitad)
let ecPrecio = (server, t) => {
  if (global.stEf && global.stEf(server, '17b')) {
    let comida = false;
    try { comida = !!Item.of(t.id).isEdible(); } catch (e) {}
    if (comida) return Math.max(1, Math.ceil(t.precio / 2));
  }
  return t.precio;
};

let ecIdEnMano = (p) => {
  let it = p.mainHandItem;
  let id = null, cant = 0;
  try { id = String(it.getId()); } catch (err) { try { id = String(it.id); } catch (e2) {} }
  try { cant = Number(it.getCount()); } catch (err) { cant = Number(it.count); }
  return { id: id, cant: cant, item: it };
};

ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let decir = (ctx) => (t) => ctx.source.sendSystemMessage(Text.of(t));
  let nombre = (ctx) => ctx.source.player ? ctx.source.player.getName().getString() : null;
  let s = EC;

  // /dinero
  event.register(Commands.literal('dinero').executes(ctx => {
    let n = nombre(ctx); if (!n) return 0;
    decir(ctx)(`§6Tu saldo en el banco: §e${ecTexto(global.stSaldo(ctx.source.server, n))}`);
    if (ecLC()) decir(ctx)('§7Saca o mete monedas físicas en un cajero (ATM) del spawn.');
    return 1;
  }));

  // /pagar <jugador> <cantidad>
  event.register(Commands.literal('pagar').then(Commands.argument('jugador', Arguments.STRING.create(event))
    .then(Commands.argument('cantidad', Arguments.INTEGER.create(event)).executes(ctx => {
      let server = ctx.source.server, d = decir(ctx);
      let n = nombre(ctx); if (!n) return 0;
      let otro = String(Arguments.STRING.getResult(ctx, 'jugador'));
      let c = Arguments.INTEGER.getResult(ctx, 'cantidad');
      if (c <= 0) { d('§cLa cantidad debe ser mayor que 0.'); return 0; }
      if (otro === n) { d('§cNo puedes pagarte a ti mismo.'); return 0; }
      if (!server.getPlayer(otro)) { d(`§c${otro} no está conectado.`); return 0; }
      if (!ecQuitar(server, n, c)) { d(`§cNo tienes suficiente. Saldo: ${ecTexto(global.stSaldo(server, n))}`); return 0; }
      global.stDarDinero(server, otro, c, `de ${n}`);
      d(`§6Has pagado §e${ecTexto(c)}§6 a §e${otro}§6. Saldo: §e${ecTexto(global.stSaldo(server, n))}`);
      return 1;
    }))));

  // /tienda
  event.register(Commands.literal('tienda').executes(ctx => {
    let server = ctx.source.server;
    let n = nombre(ctx); if (!n) return 0;
    server.runCommandSilent(`tellraw ${n} {"text":"━━━ Tienda Starvios ━━━  (saldo: ${ecTexto(global.stSaldo(server, n))})","color":"gold","bold":true}`);
    s().tienda.forEach(t => {
      server.runCommandSilent(`tellraw ${n} ["",{"text":"[Comprar] ","color":"green","bold":true,` +
        `"clickEvent":{"action":"run_command","value":"/comprar ${t.clave}"},"hoverEvent":{"action":"show_text","contents":"Comprar ${t.nombre}"}},` +
        `{"text":"${t.nombre}","color":"white"},{"text":"  ${ecPrecio(server, t)} ${s().simbolo}","color":"yellow"},{"text":"  (/comprar ${t.clave})","color":"dark_gray"}]`);
    });
    server.runCommandSilent(`tellraw ${n} {"text":"Vende lo que tengas en la mano con /vender. Retira monedas con /retirar <cantidad>.","color":"gray"}`);
    return 1;
  }));

  // /comprar <clave> [veces]
  let comprar = (ctx, veces) => {
    let server = ctx.source.server, d = decir(ctx);
    let n = nombre(ctx); if (!n) return 0;
    if (!ecPuedeComerciar(ctx, d)) return 0;
    if (global.stEf && global.stEf(server, '1n2') && global.stDia(server) === 1) { d('§cHoy la tienda está cerrada. Vuelve mañana.'); return 0; }
    let clave = String(Arguments.STRING.getResult(ctx, 'clave')).toLowerCase();
    let t = s().tienda.filter(x => x.clave === clave)[0];
    if (!t) { d('§cEse objeto no está en la tienda. Escribe /tienda.'); return 0; }
    veces = Math.max(1, Math.min(veces, 64));
    let total = ecPrecio(server, t) * veces;
    if (!ecQuitar(server, n, total)) { d(`§cTe faltan monedas. Cuesta ${ecTexto(total)}, tienes ${ecTexto(global.stSaldo(server, n))}.`); return 0; }
    let id = t.id, nbt = t.nbt || '';
    if (t.especial) { let e = global.stItemsEspeciales[t.especial]; id = e[0]; nbt = e[1]; }
    server.runCommandSilent(`give ${n} ${id}${nbt} ${t.cantidad * veces}`);
    server.runCommandSilent(`execute at ${n} run playsound minecraft:entity.villager.yes master ${n} ~ ~ ~ 0.7 1`);
    d(`§6Compraste §e${t.nombre}${veces > 1 ? ' ×' + veces : ''}§6 por §e${ecTexto(total)}§6. Saldo: §e${ecTexto(global.stSaldo(server, n))}`);
    return 1;
  };
  event.register(Commands.literal('comprar').then(Commands.argument('clave', Arguments.STRING.create(event))
    .executes(ctx => comprar(ctx, 1))
    .then(Commands.argument('veces', Arguments.INTEGER.create(event)).executes(ctx => comprar(ctx, Arguments.INTEGER.getResult(ctx, 'veces'))))));

  // /vender
  event.register(Commands.literal('vender').executes(ctx => {
    let server = ctx.source.server, d = decir(ctx);
    let p = ctx.source.player; if (!p) return 0;
    if (!ecPuedeComerciar(ctx, d)) return 0;
    let n = p.getName().getString();
    let m = ecIdEnMano(p);
    if (!m.id || m.id === 'minecraft:air' || !m.cant) { d('§cSujeta en la mano lo que quieras vender.'); return 0; }
    let precio = s().venta[m.id];
    if (!precio) { d('§cLa tienda no compra ese objeto.'); return 0; }
    server.runCommandSilent(`item replace entity ${n} weapon.mainhand with minecraft:air`);
    global.stDarDinero(server, n, precio * m.cant, `venta ×${m.cant}`);
    return 1;
  }));

  // /retirar <cantidad>
  event.register(Commands.literal('retirar').then(Commands.argument('cantidad', Arguments.INTEGER.create(event)).executes(ctx => {
    let server = ctx.source.server, d = decir(ctx);
    let n = nombre(ctx); if (!n) return 0;
    let c = Arguments.INTEGER.getResult(ctx, 'cantidad');
    if (ecLC()) { d('§eLas Starcoins ahora son monedas físicas: retíralas en un cajero (ATM) del spawn.'); return 0; }
    if (c <= 0 || c > 640) { d('§cPuedes retirar entre 1 y 640 monedas a la vez.'); return 0; }
    if (!ecQuitar(server, n, c)) { d(`§cNo tienes suficiente. Saldo: ${ecTexto(global.stSaldo(server, n))}`); return 0; }
    server.runCommandSilent(`give ${n} minecraft:gold_nugget${NBT_MONEDA()} ${c}`);
    d(`§6Retiraste §e${ecTexto(c)}§6 en monedas. Saldo: §e${ecTexto(global.stSaldo(server, n))}`);
    return 1;
  })));

  // /top
  event.register(Commands.literal('top').executes(ctx => {
    let m = ecLeer(ctx.source.server), d = decir(ctx);
    if (ecLC()) { d('§6Usa §e/lcbaltop§6 para ver los más ricos.'); return 1; }
    let lista = Object.keys(m).map(k => [k, m[k]]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    d('§6§l━━ Los más ricos ━━');
    lista.forEach((x, i) => d(`§e${i + 1}. §f${x[0]} §7- §e${ecTexto(x[1])}`));
    return 1;
  }));

  // /starvios dinero ...
  let adm = (accion) => Commands.literal(accion).then(Commands.argument('jugador', Arguments.STRING.create(event))
    .then(Commands.argument('cantidad', Arguments.INTEGER.create(event)).executes(ctx => {
      let server = ctx.source.server;
      let n = String(Arguments.STRING.getResult(ctx, 'jugador'));
      let c = Arguments.INTEGER.getResult(ctx, 'cantidad');
      let actual = global.stSaldo(server, n);
      let nuevo = accion === 'dar' ? actual + c : accion === 'quitar' ? actual - c : c;
      ecPoner(server, n, nuevo);
      decir(ctx)(`§6[Starvios] Saldo de ${n}: ${ecTexto(global.stSaldo(server, n))}`);
      return 1;
    })));
  event.register(Commands.literal('starvios').requires(x => x.hasPermission(2))
    .then(Commands.literal('dinero')
      .then(adm('dar')).then(adm('quitar')).then(adm('poner'))
      .then(Commands.literal('ver').then(Commands.argument('jugador', Arguments.STRING.create(event)).executes(ctx => {
        let n = String(Arguments.STRING.getResult(ctx, 'jugador'));
        decir(ctx)(`§6[Starvios] Saldo de ${n}: ${ecTexto(global.stSaldo(ctx.source.server, n))}`);
        return 1;
      })))));
});
