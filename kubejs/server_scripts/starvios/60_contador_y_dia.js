// priority: 400
// ============================================================
//  STARVIOS - CONTADOR ARRIBA DE LA PANTALLA + COMANDO /dia
//
//  /starvios cuenta <tiempo> <acción>   (tiempo: 5m, 30s, 1m30s ...)
//     acciones:  iniciar    -> al terminar COMIENZA LA SERIE (día 1, sin eliminados)
//                siguiente  -> al terminar pasa al día siguiente
//                jefe1..jefe5 -> al terminar invoca ese jefe en la arena
//                cerrar     -> al terminar guarda el mundo, saca a todos y apaga el servidor
//                nada       -> solo cuenta atrás
//  /starvios cuenta cancelar
//  /dia  (todos)  -> resumen corto del día y las reglas activas
// ============================================================

let BARRA = 'starvios:cuenta';

let stTextoAccion = {
  iniciar:   ['Comenzamos en', 'yellow'],
  siguiente: ['El siguiente día empieza en', 'red'],
  jefe1: ['El primer jefe despierta en', 'purple'],
  jefe2: ['El segundo jefe despierta en', 'purple'],
  jefe3: ['El tercer jefe despierta en', 'purple'],
  jefe4: ['El cuarto jefe despierta en', 'purple'],
  jefe5: ['El JEFE FINAL desciende en', 'red'],
  cerrar: ['El servidor se cierra en', 'red'],
  nada:  ['Tiempo restante', 'white']
};

// "5m" -> 300, "1m30s" -> 90, "45s" -> 45, "5" -> 300 (solo número = minutos)
let stParseTiempo = (s) => {
  s = String(s).toLowerCase().trim();
  if (/^\d+$/.test(s)) return parseInt(s) * 60;
  let m = s.match(/^(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || (!m[1] && !m[2])) return -1;
  return (parseInt(m[1] || '0') * 60) + parseInt(m[2] || '0');
};
let stMMSS = (t) => `${Math.floor(t / 60)}:${('0' + (t % 60)).slice(-2)}`;

let stQuitarBarra = (server) => server.runCommandSilent(`bossbar remove ${BARRA}`);

// Lo que pasa cuando el contador llega a 0
let stFinCuenta = (server, accion) => {
  let cmd = (c) => server.runCommandSilent(c);
  if (accion === 'iniciar') {
    let d = server.persistentData;
    d.putInt('starvios_dia', 1);
    d.putBoolean('starvios_activo', true);
    d.putInt('starvios_ultimo_dia', 0);       // el anuncio del día 1 sale enseguida
    d.putString('starvios_eliminados', '');
    global.stAplicarJugadores(server);
    // Suena el prólogo enseguida (sin títulos en pantalla) y, cuando termina, sale el anuncio del día 1
    let espera = 100;
    if (global.STARVIOS.introDia1 !== false && global.stPrologoAudio) {
      global.stPrologoAudio(server);
      d.putBoolean('starvios_intro_vista', true);
      espera = Math.round((Number(global.STARVIOS.prologoSegundos) || 90) * 20) + 20;   // duración del prólogo + 1 s
    }
    d.putInt('starvios_ultimo_dia', 1);       // el anuncio lo hacemos nosotros al terminar el prólogo
    server.scheduleInTicks(espera, () => global.stAnunciar(server, 1));
  } else if (accion === 'siguiente') {
    let d = server.persistentData;
    d.putInt('starvios_dia', Math.min(d.getInt('starvios_dia') + 1, global.STARVIOS.diasTotales));
    d.putInt('starvios_ultimo_dia', 0);
    global.stAplicarJugadores(server);
  } else if (accion.indexOf('jefe') === 0) {
    let n = parseInt(accion.replace('jefe', ''));
    let jefe = global.STARVIOS.jefes[n - 1];
    let a = global.STARVIOS.arena;
    if (jefe) {
      global.stInvocarJefe(server, jefe, global.stDondeArena(jefe, server));
      global.stAnunciarJefe(server, jefe);
    }
  } else if (accion === 'cerrar') {
    // Guardar el mundo, sacar a todos con un mensaje bonito y apagar
    cmd(`save-all flush`);
    let msg = global.STARVIOS.mensajeCierre || '§6§lSTARVIOS EXTREMO\n\n§7El servidor se ha cerrado por hoy.';
    server.scheduleInTicks(20, () => {
      server.players.forEach(p => {
        try { p.connection.disconnect(Text.of(msg)); }
        catch (err) { cmd(`kick ${p.getName().getString()} ${msg.replace(/\n/g, ' ')}`); }
      });
    });
    server.scheduleInTicks(60, () => cmd('stop'));
  } else {
    cmd(`title @a title {"text":"¡TIEMPO!","color":"gold","bold":true}`);
  }
};

// El estado vive en global para que un /reload no corte la cuenta
ServerEvents.tick(event => { global.stSeguro('60_contador', () => {
  let c = global.stCuenta;
  if (!c) return;
  let server = event.server;
  c.ticks++;
  if (c.ticks % 20 !== 0) return;
  c.restante--;

  let info = stTextoAccion[c.accion] || stTextoAccion.nada;
  server.runCommandSilent(`bossbar set ${BARRA} value ${Math.max(c.restante, 0)}`);
  if (c.texto) {
    server.runCommandSilent(`bossbar set ${BARRA} name {"text":"⏳ ${c.texto}  ${stMMSS(Math.max(c.restante, 0))}","color":"white"}`);
  } else {
    server.runCommandSilent(`bossbar set ${BARRA} name {"text":"⏳ ${info[0]} ${stMMSS(Math.max(c.restante, 0))}","color":"gold","bold":true}`);
  }

  // Últimos 10 segundos: números grandes en pantalla
  if (global.STARVIOS.contadorNumerosEnPantalla && !c.texto && c.restante > 0 && c.restante <= 10) {
    server.runCommandSilent(`title @a times 0 25 5`);
    server.runCommandSilent(`title @a title {"text":"${c.restante}","color":"${c.restante <= 3 ? 'red' : 'yellow'}","bold":true}`);
    server.runCommandSilent(`execute as @a at @s run playsound minecraft:block.note_block.pling master @s ~ ~ ~ 1 ${c.restante <= 3 ? 2 : 1}`);
  }
  // Avisos en el chat a falta de 1 minuto
  if (c.accion === 'cerrar' && (c.restante === 300 || c.restante === 30)) {
    server.runCommandSilent(`tellraw @a {"text":"⚠ El servidor se cierra en ${c.restante === 300 ? '5 minutos' : '30 segundos'}. Busca un lugar seguro.","color":"red","bold":true}`);
  }
  if (c.restante === 60 && !c.texto) {
    server.runCommandSilent(`tellraw @a {"text":"⏳ ${info[0]} 1 minuto.","color":"gold"}`);
  }

  if (c.restante <= 0 && c.texto) {
    global.stCuenta = false;   // nunca null: KubeJS no deja guardar null en global
    stQuitarBarra(server);
    server.runCommandSilent(`title @a actionbar {"text":"⏳ ${c.texto}: ¡tiempo!","color":"white"}`);
    server.runCommandSilent(`execute as @a at @s run playsound minecraft:block.note_block.chime master @s ~ ~ ~ 0.6 1`);
    return;
  }
  if (c.restante <= 0) {
    global.stCuenta = false;   // nunca null: KubeJS no deja guardar null en global
    stQuitarBarra(server);
    stFinCuenta(server, c.accion);
  }
}); });

// La barra se ve también para quien entre a mitad de la cuenta
PlayerEvents.loggedIn(event => {
  if (global.stCuenta) event.server.runCommandSilent(`bossbar set ${BARRA} players @a`);
});

ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let ok = (ctx, txt) => { ctx.source.sendSystemMessage(Text.of(txt).gold()); return 1; };

  let empezar = (ctx, accion) => {
    let server = ctx.source.server;
    let seg = stParseTiempo(Arguments.STRING.getResult(ctx, 'tiempo'));
    if (seg <= 0) return ok(ctx, 'Tiempo inválido. Ejemplos: 5m, 30s, 1m30s');
    let info = stTextoAccion[accion];
    stQuitarBarra(server);
    server.runCommandSilent(`bossbar add ${BARRA} {"text":"⏳"}`);
    server.runCommandSilent(`bossbar set ${BARRA} color ${info[1]}`);
    server.runCommandSilent(`bossbar set ${BARRA} style notched_10`);
    server.runCommandSilent(`bossbar set ${BARRA} max ${seg}`);
    server.runCommandSilent(`bossbar set ${BARRA} value ${seg}`);
    server.runCommandSilent(`bossbar set ${BARRA} name {"text":"⏳ ${info[0]} ${stMMSS(seg)}","color":"gold","bold":true}`);
    server.runCommandSilent(`bossbar set ${BARRA} players @a`);
    server.runCommandSilent(`execute as @a at @s run playsound minecraft:block.bell.use master @s ~ ~ ~ 1 1`);
    global.stCuenta = { restante: seg, accion: accion, ticks: 0 };
    return ok(ctx, `[Starvios] Cuenta atrás de ${stMMSS(seg)} → ${accion}.`);
  };

  // Temporizador tranquilo: solo la barra blanca arriba, con tu propio texto, sin efectos
  let temporizador = Commands.literal('temporizador')
    .then(Commands.literal('cancelar').executes(ctx => {
      global.stCuenta = false;   // nunca null: KubeJS no deja guardar null en global
      stQuitarBarra(ctx.source.server);
      return ok(ctx, '[Starvios] Temporizador cancelado.');
    }))
    .then(Commands.argument('tiempo', Arguments.STRING.create(event))
      .then(Commands.argument('texto', Arguments.GREEDY_STRING.create(event)).executes(ctx => {
        let server = ctx.source.server;
        let seg = stParseTiempo(Arguments.STRING.getResult(ctx, 'tiempo'));
        if (seg <= 0) return ok(ctx, 'Tiempo inválido. Ejemplos: 5m, 30s, 1m30s');
        let texto = String(Arguments.GREEDY_STRING.getResult(ctx, 'texto')).replace(/"/g, "'");
        stQuitarBarra(server);
        server.runCommandSilent(`bossbar add ${BARRA} {"text":"⏳"}`);
        server.runCommandSilent(`bossbar set ${BARRA} color white`);
        server.runCommandSilent(`bossbar set ${BARRA} style progress`);
        server.runCommandSilent(`bossbar set ${BARRA} max ${seg}`);
        server.runCommandSilent(`bossbar set ${BARRA} value ${seg}`);
        server.runCommandSilent(`bossbar set ${BARRA} name {"text":"⏳ ${texto}  ${stMMSS(seg)}","color":"white"}`);
        server.runCommandSilent(`bossbar set ${BARRA} players @a`);
        global.stCuenta = { restante: seg, accion: 'nada', ticks: 0, texto: texto };
        return ok(ctx, `[Starvios] Temporizador "${texto}" de ${stMMSS(seg)}.`);
      })));
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2)).then(temporizador));

  let cuenta = Commands.literal('cuenta')
    .then(Commands.literal('cancelar').executes(ctx => {
      global.stCuenta = false;   // nunca null: KubeJS no deja guardar null en global
      stQuitarBarra(ctx.source.server);
      return ok(ctx, '[Starvios] Cuenta atrás cancelada.');
    }));
  let conTiempo = Commands.argument('tiempo', Arguments.STRING.create(event));
  Object.keys(stTextoAccion).forEach(accion => {
    conTiempo = conTiempo.then(Commands.literal(accion).executes(ctx => empezar(ctx, accion)));
  });
  cuenta = cuenta.then(conTiempo);

  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2)).then(cuenta));

  // ---------- /dia (para todos) ----------
  event.register(Commands.literal('dia').executes(ctx => {
    let src = ctx.source;
    let server = src.server;
    let msg = (t) => src.sendSystemMessage(Text.of(t));
    if (!global.stActivo(server)) { msg('§7La serie todavía no ha empezado (o está en pausa).'); return 1; }
    let dia = global.stDia(server);
    let a = global.STARVIOS.anuncios[dia];
    let e = (n) => global.stEscala(n, dia);
    let act = (r) => global.stActiva(r, dia);
    msg(`§4§l━━━ DÍA ${dia} de ${global.STARVIOS.diasTotales} ━━━`);
    if (a) msg(`§6✦ Hoy: §e${a[0]} §7- ${a[1]}`);
    let extra = global.stCorazonesExtra(server)[src.player ? src.player.getName().getString() : ''] || 0;
    msg(`§7❤ Tu vida máxima: §f${e('vidaJugador') / 2 + extra} corazones${extra ? ` §a(+${extra} extra)` : ''}`);
    msg(`§5☠ Mini-jefes: §f${(e('probElite') * 100).toFixed(1)}%§7 de los mobs (sueltan Fragmentos de Corazón)`);
    msg(`§7☠ Mobs: §f${Math.round((e('vidaMobs') - 1) * 100)}%§7 más vida, §f${Math.round((e('dañoMobs') - 1) * 100)}%§7 más daño`);
    let extras = [];
    if (e('creeperCargado') > 0) extras.push(`creepers cargados ${Math.round(e('creeperCargado') * 100)}%`);
    if (e('zombiArmaduraHierro') > 0) extras.push('zombis con hierro');
    else if (e('zombiArmaduraMalla') > 0) extras.push('zombis con malla');
    if (act('zombisRapidos')) extras.push('zombis rápidos');
    if (act('esqueletosFuego')) extras.push('flechas de fuego');
    if (act('arañaVeneno')) extras.push(act('arañaCeguera') ? 'arañas: veneno y ceguera' : 'arañas venenosas');
    if (e('mobsResistencia') > 0) extras.push('mobs con Resistencia');
    if (act('mobsConFuerza')) extras.push('mobs con Fuerza');
    if (extras.length) msg(`§7⚠ ${extras.join('§8, §7')}`);
    let prohib = [];
    if (act('sinRegeneracion')) prohib.push('regeneración natural');
    if (act('hambreCada10Min')) prohib.push('comida tranquila (hambre cada 10 min)');
    if (prohib.length) msg(`§c✖ Sin: §7${prohib.join(', ')}`);
    return 1;
  }));
});
