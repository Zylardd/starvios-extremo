// ============================================================
//  STARVIOS - CONTADOR DE DÍAS Y UTILIDADES
// ============================================================

global.stDatos = (server) => server.persistentData;

// ¿El evento está activo? (lo enciendes/apagas con /starvios activar | desactivar)
global.stActivo = (server) => global.stDatos(server).getBoolean('starvios_activo');

// Día guardado (lo cambias con /starvios dia <n> o /starvios siguiente)
global.stDiaGuardado = (server) => global.stDatos(server).getInt('starvios_dia');

// Día que cuenta para las reglas: 0 si el evento está desactivado
global.stDia = (server) => {
  if (!global.stActivo(server)) return 0;
  let d = global.stDiaGuardado(server);
  return Math.max(1, Math.min(d, global.STARVIOS.diasTotales));
};

// Valor de una escala [[desde, valor], ...] para el día dado
global.stEscala = (nombre, dia) => {
  let tabla = global.STARVIOS.escalas[nombre];
  let v = tabla[0][1];
  for (let i = 0; i < tabla.length; i++) {
    if (dia >= tabla[i][0]) v = tabla[i][1];
  }
  return v;
};

global.stActiva = (regla, dia) => dia > 0 && dia >= global.STARVIOS.desde[regla];

global.stCmd = (server, cmd) => server.runCommandSilent(cmd);

// Corazones extra ganados por cada jugador (Corazón Vital)
global.stCorazonesExtra = (server) => {
  let s = server.persistentData.getString('starvios_corazones');
  if (!s) return {};
  try { return JSON.parse(s); } catch (e) { return {}; }
};
// Vida máxima de un jugador = vida del día + corazones extra
global.stVidaMax = (server, n) => {
  let dia = global.stDia(server);
  let base = dia > 0 ? global.stEscala('vidaJugador', dia) : 20;
  return base + (global.stCorazonesExtra(server)[n] || 0) * 2;
};

// Lista de eliminados guardada como "a,b,c"
global.stEliminados = (server) => {
  let s = global.stDatos(server).getString('starvios_eliminados');
  return s ? s.split(',') : [];
};
global.stGuardarEliminados = (server, lista) => {
  global.stDatos(server).putString('starvios_eliminados', lista.join(','));
};

// Aplica a TODOS los jugadores conectados lo que depende del día
global.stAplicarJugadores = (server) => {
  let dia = global.stDia(server);
  server.players.forEach(p => {
    let n = p.getName().getString();
    global.stCmd(server, `attribute ${n} minecraft:generic.max_health base set ${global.stVidaMax(server, n)}`);
  });
  global.stCmd(server, `gamerule doImmediateRespawn true`);
  global.stCmd(server, `gamerule naturalRegeneration ${global.stActiva('sinRegeneracion', dia) ? 'false' : 'true'}`);
};

// Anuncio grande en pantalla
global.stAnunciar = (server, dia) => {
  let a = global.STARVIOS.anuncios[dia];
  if (!a) return;
  global.stCmd(server, `title @a times 10 80 20`);
  global.stCmd(server, `title @a title {"text":"DÍA ${dia}","color":"dark_red","bold":true}`);
  global.stCmd(server, `title @a subtitle {"text":"${a[0]}","color":"gold"}`);
  // Mensaje corto en el chat con la novedad del día
  global.stCmd(server, `tellraw @a {"text":"━━━━━━━━ DÍA ${dia} ━━━━━━━━","color":"dark_red","bold":true}`);
  global.stCmd(server, `tellraw @a ["",{"text":"✦ Novedad: ","color":"gold","bold":true},{"text":"${a[0]}","color":"yellow"}]`);
  global.stCmd(server, `tellraw @a {"text":"${a[1]}","color":"gray"}`);
  global.stCmd(server, `tellraw @a ["",{"text":"Escribe ","color":"dark_gray"},{"text":"/dia","color":"aqua","clickEvent":{"action":"run_command","value":"/dia"},"hoverEvent":{"action":"show_text","contents":"Ver todas las reglas activas"}},{"text":" para ver todas las reglas activas.","color":"dark_gray"}]`);
  global.stCmd(server, `execute as @a at @s run playsound minecraft:entity.wither.spawn master @s ~ ~ ~ 0.6 0.8`);
};

// ---------- Revisión periódica ----------
let stTick = 0;
let stReglasOk = false;
ServerEvents.tick(event => {
  stTick++;
  let server = event.server;

  // Al cargar (o tras /reload): reglas del juego que siempre deben estar
  if (!stReglasOk) {
    stReglasOk = true;
    server.runCommandSilent('gamerule doImmediateRespawn true');
  }

  // Cada 5 s: ¿cambió el día? / End bloqueado
  if (stTick % 100 === 0) {
    let dia = global.stDia(server);
    let ultimo = global.stDatos(server).getInt('starvios_ultimo_dia');
    if (dia > 0 && dia !== ultimo) {
      global.stDatos(server).putInt('starvios_ultimo_dia', dia);
      global.stAplicarJugadores(server);
      global.stAnunciar(server, dia);
      if (dia >= global.STARVIOS.diasTotales) {
        global.stCmd(server, `tellraw @a {"text":"Es el último día de Starvios Extremo. Quien siga vivo a medianoche, gana.","color":"gold","bold":true}`);
      }
    }

    // End desactivado: quien entre vuelve al spawn
    let s = global.STARVIOS.spawn;
    global.stCmd(server, `execute in minecraft:the_end as @a[distance=0..] in minecraft:overworld run tp @s ${s.x} ${s.y} ${s.z}`);

  }

  // Cada 10 min: hambre
  if (stTick % 12000 === 0 && global.stActiva('hambreCada10Min', global.stDia(server))) {
    global.stCmd(server, `effect give @a[gamemode=survival] minecraft:hunger 30 1`);
  }
});


PlayerEvents.loggedIn(event => {
  let server = event.server;
  let p = event.player;
  let n = p.getName().getString();

  // Seguridad extra: si está eliminado y entró (p. ej. whitelist apagada), fuera.
  if (global.stEliminados(server).indexOf(n) !== -1 && global.STARVIOS.exentos.indexOf(n) === -1) {
    server.scheduleInTicks(20, () => global.stCmd(server, `kick ${n} Fuiste eliminado de Starvios Extremo.`));
    return;
  }

  let dia = global.stDia(server);
  global.stCmd(server, `attribute ${n} minecraft:generic.max_health base set ${global.stVidaMax(server, n)}`);

  if (dia > 0) {
    let a = global.STARVIOS.anuncios[dia];
    server.scheduleInTicks(40, () => {
      global.stCmd(server, `tellraw ${n} ["",{"text":"[Starvios] ","color":"dark_red","bold":true},{"text":"Día ${dia} de ${global.STARVIOS.diasTotales}","color":"gold"}${a ? `,{"text":" - ${a[0]}: ${a[1]}","color":"gray"}` : ''}]`);
    });
  }
});
