// priority: 900
// ============================================================
//  STARVIOS - CONTADOR DE DÍAS Y UTILIDADES
// ============================================================

global.stDatos = (server) => server.persistentData;

// Ejecuta f y, si falla, lo dice UNA sola vez en el log (en vez de llenarlo cada tick)
global.stErroresVistos = {};
global.stSeguro = (donde, f) => {
  try { f(); }
  catch (err) {
    if (!global.stErroresVistos[donde]) {
      global.stErroresVistos[donde] = true;
      console.error(`[Starvios] Error en ${donde}: ${err}` + (err && err.stack ? `\n${err.stack}` : ''));
    }
  }
};

// ---------- Utilidades seguras (KubeJS 1.20 no siempre expone .x/.y/.z ni .level.dimension) ----------
// Coordenadas de una entidad, bloque o evento -> {x, y, z} o null
global.stXYZ = (e) => {
  if (!e) return null;
  let intentos = [
    () => [e.getX(), e.getY(), e.getZ()],
    () => { let v = e.position(); return [v.x(), v.y(), v.z()]; },
    () => [e.x, e.y, e.z],
    () => { let b = e.blockPosition(); return [b.getX(), b.getY(), b.getZ()]; }
  ];
  for (let i = 0; i < intentos.length; i++) {
    try {
      let r = intentos[i]();
      let x = Number(r[0]), y = Number(r[1]), z = Number(r[2]);
      if (isFinite(x) && isFinite(y) && isFinite(z)) return { x: x, y: y, z: z };
    } catch (err) {}
  }
  return null;
};

// Texto "minecraft:overworld" a partir de lo que devuelva Minecraft (ResourceKey, ResourceLocation, texto)
let stLimpiarDim = (v) => {
  if (v == null) return null;
  let m = String(v).match(/([a-z0-9_.\-]+:[a-z0-9_.\/\-]+)\]?$/);
  return m ? m[1] : null;
};
// Dimensión de una entidad, bloque, evento o nivel. Por defecto el overworld.
global.stDimDe = (o) => {
  if (!o) return 'minecraft:overworld';
  let niveles = [];
  try { let lv = o.level; if (typeof lv === 'function') lv = o.level(); if (lv) niveles.push(lv); } catch (err) {}
  try { if (typeof o.getLevel === 'function') niveles.push(o.getLevel()); } catch (err) {}
  niveles.push(o);
  for (let i = 0; i < niveles.length; i++) {
    let lv = niveles[i];
    let intentos = [
      () => { let d = lv.dimension; return typeof d === 'function' ? lv.dimension() : d; },
      () => lv.dimension().location(),
      () => lv.getDimension()
    ];
    for (let j = 0; j < intentos.length; j++) {
      try { let d = stLimpiarDim(intentos[j]()); if (d) return d; } catch (err) {}
    }
  }
  return 'minecraft:overworld';
};

// Ejecuta comandos "como" una entidad y en su posición (para usar ~ ~ ~)
global.stComoEntidad = (e) => {
  let server = e.server;
  let uuid = null;
  try { uuid = String(e.getStringUUID()); } catch (err) {}
  if (!uuid || !/^[0-9a-f-]{36}$/.test(uuid)) { try { uuid = String(e.uuid); } catch (err) {} }
  if (uuid && /^[0-9a-f-]{36}$/.test(uuid) && server) {
    return (c) => server.runCommandSilent(`execute as ${uuid} at @s run ${c}`);
  }
  return (c) => e.runCommandSilent(c);
};


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

// Texto seguro para JSON (comillas, barras)
global.stEsc = (t) => String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
// "Dia 1, Mortalidad" -> "Mortalidad" (por si el título ya trae el número)
global.stTituloDia = (t) => String(t || '').replace(/^\s*d[ií]a\s*\d+\s*[,:·.\-]?\s*/i, '').replace(/^["“]|["”]$/g, '');

// Anuncio discreto: barra pequeña arriba con "DÍA N · Título"; la descripción va solo al chat
global.stAnunciar = (server, dia) => {
  let a = global.STARVIOS.anuncios[dia];
  if (!a) return;
  let cfg = global.STARVIOS.anuncioDia || { barraSegundos: 20, voz: true };
  let titulo = global.stEsc(global.stTituloDia(a[0]));
  let BAR = 'starvios:dia';
  global.stCmd(server, `bossbar remove ${BAR}`);
  global.stCmd(server, `bossbar add ${BAR} ["",{"text":"DÍA ${dia}","color":"red","bold":true},{"text":"  ·  ","color":"dark_gray"},{"text":"${titulo}","color":"gold"}]`);
  global.stCmd(server, `bossbar set ${BAR} color red`);
  global.stCmd(server, `bossbar set ${BAR} max ${global.STARVIOS.diasTotales}`);
  global.stCmd(server, `bossbar set ${BAR} value ${Math.min(dia, global.STARVIOS.diasTotales)}`);
  global.stCmd(server, `bossbar set ${BAR} players @a`);
  global.stBarraDia = { hora: Date.now() };
  if (cfg.barraSegundos > 0) {
    let hora = global.stBarraDia.hora;
    server.scheduleInTicks(cfg.barraSegundos * 20, () => {
      if (!global.stBarraDia || global.stBarraDia.hora !== hora) return;
      global.stBarraDia = false;
      global.stCmd(server, `bossbar remove ${BAR}`);
    });
  }
  // Chat: la descripción del día
  global.stCmd(server, `tellraw @a {"text":"━━━━━━━━ DÍA ${dia} · ${titulo} ━━━━━━━━","color":"dark_red","bold":true}`);
  global.stCmd(server, `tellraw @a {"text":"${global.stEsc(a[1])}","color":"gray"}`);
  global.stCmd(server, `tellraw @a ["",{"text":"Escribe ","color":"dark_gray"},{"text":"/dia","color":"aqua","clickEvent":{"action":"run_command","value":"/dia"},"hoverEvent":{"action":"show_text","contents":"Ver todas las reglas activas"}},{"text":" para ver todas las reglas activas.","color":"dark_gray"}]`);
  global.stCmd(server, `execute as @a at @s run playsound minecraft:entity.wither.spawn master @s ~ ~ ~ 4 0.8`);
  // Misión del día (92_extras.js)
  if (global.stAnunciarMision) server.scheduleInTicks(60, () => global.stAnunciarMision(server));
  // Voz del narrador (necesita el paquete de voces en kubejs/assets del modpack)
  if (cfg.voz !== false) {
    server.scheduleInTicks(30, () => global.stCmd(server, `execute as @a at @s run playsound starvios:dia.${dia} master @s ~ ~ ~ 8 1`));
  }
};

// ---------- Revisión periódica ----------
global.stTick = 0;
global.stReglasOk = false;
ServerEvents.tick(event => { global.stSeguro('10_dias', () => {
  global.stTick = (global.stTick || 0) + 1;
  let stTick = global.stTick;
  let server = event.server;

  // Al cargar (o tras /reload): reglas del juego que siempre deben estar
  if (!global.stReglasOk) {
    global.stReglasOk = true;
    server.runCommandSilent('gamerule doImmediateRespawn true');
    server.runCommandSilent('gamerule spawnRadius 0');
    server.runCommandSilent('scoreboard objectives add st_tmp dummy');
    let sp = global.STARVIOS.spawn;
    server.runCommandSilent(`execute in minecraft:overworld run setworldspawn ${sp.x} ${sp.y} ${sp.z}`);
  }

  // Cada 5 s: ¿cambió el día? / End bloqueado
  if (stTick % 100 === 0 && !global.stCine && !(global.stPrologoSonando && global.stPrologoSonando())) {   // espera a la cinemática o al prólogo
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

    if (global.stBarraDia) global.stCmd(server, `bossbar set starvios:dia players @a`);

    // End desactivado: quien entre vuelve al spawn
    let s = global.STARVIOS.spawn;
    global.stCmd(server, `execute in minecraft:the_end as @a[distance=0..] in minecraft:overworld run tp @s ${s.x} ${s.y} ${s.z}`);

  }

  // Cada 10 min: hambre
  if (stTick % 12000 === 0 && global.stActiva('hambreCada10Min', global.stDia(server))) {
    global.stCmd(server, `effect give @a[gamemode=survival] minecraft:hunger 30 1`);
  }
}); });


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
      global.stCmd(server, `tellraw ${n} ["",{"text":"[Starvios] ","color":"dark_red","bold":true},{"text":"Día ${dia} de ${global.STARVIOS.diasTotales}","color":"gold"}${a ? `,{"text":" - ${global.stEsc(global.stTituloDia(a[0]))}: ${global.stEsc(a[1])}","color":"gray"}` : ''}]`);
    });
  }
});


// ---------- Punto de aparición exacto ----------
// Minecraft pone a los jugadores encima del bloque más alto (tejados, árboles).
// La primera vez que alguien entra, y cuando reaparece sin cama, lo llevamos al spawn exacto.
global.stIrAlSpawn = (server, n) => {
  let s = global.STARVIOS.spawn;
  server.runCommandSilent(`execute in minecraft:overworld run tp ${n} ${s.x + 0.5} ${s.y} ${s.z + 0.5}`);
};

PlayerEvents.loggedIn(event => {
  let p = event.player;
  let n = p.getName().getString();
  if (p.persistentData.getBoolean('starvios_visto')) return;
  p.persistentData.putBoolean('starvios_visto', true);
  event.server.scheduleInTicks(5, () => global.stIrAlSpawn(event.server, n));
});

PlayerEvents.respawned(event => {
  let p = event.player;
  let n = p.getName().getString();
  if ((global.stMuertes || {})[n]) return;          // eliminado: lo gestiona 30_eliminacion
  let tieneCama = false;
  try { tieneCama = p.getRespawnPosition() != null; } catch (err) {}
  if (!tieneCama) event.server.scheduleInTicks(1, () => global.stIrAlSpawn(event.server, n));
});
