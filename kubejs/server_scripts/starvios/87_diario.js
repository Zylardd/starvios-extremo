// priority: 40
// ============================================================
//  STARVIOS - DIARIO DE STARVIOS (libro que se actualiza solo)
//  Cada jugador recibe un libro "📖 Diario de Starvios" al entrar. Al abrirlo (clic derecho) ve:
//   · el día actual y su descripción
//   · su misión del día (qué pide, premio y si ya la cumplió)
//   · los nerfs y buffs activos
//   · un PANEL con botones: equipo, dinero, casino, emotes... (clic = se ejecuta el comando)
//  Se actualiza cada 10 segundos. Si lo pierdes: /diario
// ============================================================

let DI_TAG = 'starvios_diario';
let diUltimo = {};   // último contenido por jugador (para no reescribir el libro si no cambió)

let diJ = (t) => JSON.stringify(String(t));                        // texto JSON seguro
let diTxt = (t, color, extra) => `{"text":${diJ(t)}${color ? `,"color":"${color}"` : ''}${extra || ''}}`;
let diBoton = (texto, color, cmd, ayuda, sugerir) =>
  `{"text":${diJ(texto)},"color":"${color}","bold":true,"clickEvent":{"action":"${sugerir ? 'suggest_command' : 'run_command'}","value":${diJ(cmd)}},"hoverEvent":{"action":"show_text","contents":${diJ(ayuda || cmd)}}}`;
let diPagina = (partes) => `[""${partes.length ? ',' + partes.join(',') : ''}]`;
let diBR = '{"text":"\\n"}';

// Corta una lista de líneas en páginas de ~13 líneas (unos 19 caracteres por línea)
let diPaginar = (titulo, color, lineas) => {
  let paginas = [], actual = [], usadas = 2;
  let nueva = () => { paginas.push(diPagina([diTxt(titulo, color, ',"bold":true'), diBR, diBR].concat(actual))); actual = []; usadas = 2; };
  lineas.forEach(l => {
    let alto = Math.ceil(String(l.t).length / 19) || 1;
    if (usadas + alto > 13 && actual.length) nueva();
    actual.push(diTxt(l.t + '\n', l.c || 'black'));
    usadas += alto;
  });
  nueva();
  return paginas;
};

let diPaginas = (server, n) => {
  let pags = [];
  let dia = global.stDia(server);
  let an = dia > 0 ? global.STARVIOS.anuncios[dia] : null;
  // 1) Día
  if (an) {
    pags.push(diPagina([
      diTxt('✦ STARVIOS ✦', 'dark_red', ',"bold":true'), diBR, diBR,
      diTxt(`Día ${dia} de ${global.STARVIOS.diasTotales}`, 'gold', ',"bold":true'), diBR,
      diTxt(global.stTituloDia(an[0]), 'dark_purple', ',"bold":true'), diBR, diBR,
      diTxt(an[1], 'black'), diBR, diBR,
      diBoton('[Reglas activas]', 'dark_aqua', '/dia', 'Todas las reglas del día en el chat')
    ]));
  } else {
    pags.push(diPagina([diTxt('✦ STARVIOS ✦', 'dark_red', ',"bold":true'), diBR, diBR, diTxt('La serie todavía no ha comenzado.', 'gray')]));
  }
  // 2) Misión del día
  let mi = global.stMisionInfo ? global.stMisionInfo(server, n) : null;
  if (mi) {
    let partes = [diTxt('📜 Misión del día', 'dark_aqua', ',"bold":true'), diBR,
      diTxt(mi.nombre, 'dark_purple', ',"bold":true'), diBR, diBR,
      diTxt(mi.entregar ? 'Trae al atril:' : 'Ten contigo (no se gasta):', 'dark_gray'), diBR];
    mi.pide.forEach(p => { partes.push(diTxt('• ' + p, 'black')); partes.push(diBR); });
    partes.push(diBR, diTxt('Premio: ', 'dark_green', ',"bold":true'), diTxt(mi.premio, 'dark_green'), diBR, diBR);
    partes.push(mi.hecha ? diTxt('✔ Completada' + (mi.buff2 ? ` (+${mi.buff2} hoy)` : ''), 'dark_green', ',"bold":true')
                         : diTxt('✘ Pendiente: ve al atril del spawn', 'red', ',"bold":true'));
    pags.push(diPagina(partes));
  }
  // 3) Nerfs y buffs activos
  let act = global.stEfActivas ? global.stEfActivas(server) : [];
  let nN = act.filter(a => a.tipo !== 'b').length, nB = act.length - nN;
  pags.push(diPagina([diTxt('⚠ Nerfs y buffs', 'dark_red', ',"bold":true'), diBR, diBR,
    diTxt(act.length ? `Activos: ${nN} nerf(s) y ${nB} buff(s).` : 'Ninguno por ahora.', 'black'), diBR, diBR,
    diTxt('Míralos ordenados en tu Tableta, categoría ', 'dark_gray'), diTxt('Hoy en Starvios', 'dark_purple', ',"bold":true'), diTxt('.', 'dark_gray'), diBR, diBR,
    diBoton('[No tengo tableta]', 'dark_purple', '/tableta', 'Te da una si la perdiste'), diBR,
    diBoton('[Verlos en el chat]', 'dark_red', '/anomalias')]));
  // 4) Equipo
  let eq = global.stEquipoDe ? global.stEquipoDe(server, n) : null;
  let pe = [diTxt('⚑ Equipo', 'dark_blue', ',"bold":true'), diBR, diBR];
  if (eq) {
    pe.push(diTxt(eq.nombre, 'dark_purple', ',"bold":true'), diBR, diTxt(eq.miembros.join(', '), 'black'), diBR, diBR);
    pe.push(diBoton('[Dónde están]', 'dark_aqua', '/equipo info', 'Miembros y coordenadas'), diBR);
    pe.push(diBoton('[Hablar al equipo]', 'dark_green', '/eq ', 'Escribe tu mensaje', true), diBR);
    pe.push(diBoton('[Invitar]', 'blue', '/equipo invitar ', 'Escribe el nombre (solo el líder)', true), diBR);
    pe.push(diBoton('[Salir del equipo]', 'red', '/equipo salir', 'Te sales de tu equipo', true), diBR);
  } else {
    pe.push(diTxt('No tienes equipo.', 'gray'), diBR, diBR);
    pe.push(diBoton('[Crear equipo]', 'dark_green', '/equipo crear ', 'Escribe el nombre del equipo', true), diBR);
    pe.push(diBoton('[Aceptar invitación]', 'blue', '/equipo aceptar', 'Unirte al equipo que te invitó'), diBR);
    pe.push(diBoton('[Rechazar invitación]', 'red', '/equipo rechazar'), diBR);
  }
  pe.push(diBR, diBoton('[Panel de equipo]', 'gold', '/equipo', 'Crear, invitar y expulsar con botones'), diBR);
  pe.push(diBR, diBoton('[Ver equipos]', 'dark_gray', '/equipo lista'));
  pags.push(diPagina(pe));
  // 5) Atajos
  pags.push(diPagina([diTxt('⚙ Atajos', 'dark_gray', ',"bold":true'), diBR, diBR,
    diBoton('[Mi dinero]', 'gold', '/dinero'), diBR,
    diBoton('[Pagar]', 'gold', '/pagar ', 'Escribe jugador y cantidad', true), diBR,
    diBoton('[Vender lo de la mano]', 'gold', '/vender'), diBR,
    diBoton('[Misión en el chat]', 'dark_aqua', '/mision'), diBR,
    diBoton('[Mazmorras activas]', 'dark_purple', '/mazmorras'), diBR,
    diBoton('[Resurrección]', 'light_purple', '/resurreccion'), diBR, diBR,
    diTxt('Casino: ', 'black'), diBoton('[Ruleta]', 'red', '/ruleta'), diTxt(' '), diBoton('[Lotería]', 'gold', '/loteria'), diBR,
    diBoton('[Retar a duelo]', 'dark_red', '/duelo ', 'Escribe jugador y cantidad', true)]));
  // 6) Emotes
  let em = [['saludo', '👋'], ['baile', '💃'], ['giro', '🌀'], ['celebrar', '🎉'], ['corazones', '❤'], ['triste', '😢'], ['enojado', '😠'], ['dormir', '💤']];
  let pem = [diTxt('☺ Emotes', 'dark_green', ',"bold":true'), diBR, diBR];
  em.forEach(e => { pem.push(diBoton(`[${e[1]} ${e[0]}]`, 'dark_green', `/emote ${e[0]}`)); pem.push(diBR); });
  pags.push(diPagina(pem));
  return pags;
};

let diSnbt = (pags) => {
  let lista = pags.map(p => "'" + p.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'").join(',');
  return `{${DI_TAG}:1b,title:"Diario de Starvios",author:"Liz",resolved:1b,generation:0,` +
    `display:{Name:'{"text":"📖 Diario de Starvios","color":"gold","italic":false}',Lore:['{"text":"Clic derecho: día, misión, nerfs y atajos","color":"gray","italic":false}']},pages:[${lista}]}`;
};

let diEsDiario = (it) => {
  if (!it || it.isEmpty()) return false;
  try { let t = it.getTag(); return !!(t && t.contains(DI_TAG)); } catch (e) { return false; }
};

// Actualiza (o entrega) el diario de un jugador
let diActualizar = (server, p, forzar) => {
  let n = p.getName().getString();
  let inv = null;
  try { inv = p.getInventory(); } catch (e) { return; }
  let snbt = diSnbt(diPaginas(server, n));
  let slot = -1;
  for (let i = 0; i < 41; i++) { let it = null; try { it = inv.getItem(i); } catch (e) {} if (diEsDiario(it)) { slot = i; break; } }
  if (slot < 0) {
    let dados = [];
    try { dados = JSON.parse(server.persistentData.getString('starvios_diario_dado') || '[]'); } catch (e) {}
    if (dados.indexOf(n) !== -1 && !forzar) return;     // ya se lo dimos una vez (si lo tiró, que use /diario)
    if (dados.indexOf(n) === -1) { dados.push(n); server.persistentData.putString('starvios_diario_dado', JSON.stringify(dados)); }
    p.give(Item.of('minecraft:written_book', snbt));
    diUltimo[n] = snbt;
    return;
  }
  if (!forzar && diUltimo[n] === snbt) return;
  inv.setItem(slot, Item.of('minecraft:written_book', snbt));
  diUltimo[n] = snbt;
};
// ------------------------------------------------------------
//  EL DIARIO YA NO SE USA: todo está en la Tableta.
//  Se quitan los diarios que queden en los inventarios y /diario lleva a la tableta.
// ------------------------------------------------------------
let DI_ACTIVO = false;   // pon true para volver a usar el Diario
let diQuitar = (server, n) => server.runCommandSilent(`clear ${n} minecraft:written_book{${DI_TAG}:1b}`);
global.stDiarioActualizar = (server) => server.players.forEach(p => {
  try { if (DI_ACTIVO) diActualizar(server, p, false); else diQuitar(server, p.getName().getString()); } catch (e) {}
});

global.stDiTick = 0;
ServerEvents.tick(event => { global.stSeguro('87_diario', () => {
  global.stDiTick = (global.stDiTick || 0) + 1;
  if (global.stDiTick % 200 !== 0) return;
  global.stDiarioActualizar(event.server);
}); });

PlayerEvents.loggedIn(event => {
  let server = event.server, p = event.player;
  server.scheduleInTicks(120, () => { try { if (DI_ACTIVO) diActualizar(server, p, false); else diQuitar(server, p.getName().getString()); } catch (e) { console.warn(`[Starvios] Diario: ${e}`); } });
});

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  event.register(Commands.literal('diario').executes(ctx => {
    let p = ctx.source.player;
    if (!p) return 0;
    if (DI_ACTIVO) {
      diUltimo[p.getName().getString()] = '';
      diActualizar(ctx.source.server, p, true);
      ctx.source.sendSystemMessage(Text.of('§6📖 Tu Diario de Starvios está al día. Ábrelo con clic derecho.'));
    } else ctx.source.sendSystemMessage(Text.of('§6📱 Todo está ahora en tu Tableta de Starvios (categoría "Hoy en Starvios"). Si la perdiste: /tableta'));
    return 1;
  }));
});

// ============================================================
//  TABLETA DE STARVIOS (guía con el mod Patchouli): reglas, misiones, corazones, dinero,
//  equipos, peligros, mods y comandos. Se entrega una vez al entrar; si la pierdes: /tableta
//  Libro y contenido: carpeta patchouli_books/tableta/ (en la raíz del modpack y del servidor)
// ============================================================
let TB_ITEM = 'patchouli:guide_book{"patchouli:book":"patchouli:tableta"}';
let tbDar = (server, n, forzar) => {
  let dados = [];
  try { dados = JSON.parse(server.persistentData.getString('starvios_tableta_dada') || '[]'); } catch (e) {}
  if (!forzar && dados.indexOf(n) !== -1) return;
  if (dados.indexOf(n) === -1) { dados.push(n); server.persistentData.putString('starvios_tableta_dada', JSON.stringify(dados)); }
  server.runCommandSilent(`give ${n} ${TB_ITEM}`);
};
// Cambia las tabletas viejas (starvios:tableta, no funcionan) por la nueva
let tbCambiarViejas = (server, n) => {
  let viejas = Number(server.runCommandSilent(`clear ${n} patchouli:guide_book{"patchouli:book":"starvios:tableta"}`)) > 0;
  if (viejas) server.runCommandSilent(`give ${n} ${TB_ITEM}`);
  return viejas;
};
PlayerEvents.loggedIn(event => {
  let server = event.server, n = event.player.getName().getString();
  server.scheduleInTicks(140, () => { tbCambiarViejas(server, n); tbDar(server, n, false); });
});
ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  event.register(Commands.literal('tableta').executes(ctx => {
    let p = ctx.source.player;
    if (!p) return 0;
    let n = p.getName().getString();
    if (tbCambiarViejas(ctx.source.server, n)) { ctx.source.sendSystemMessage(Text.of('§6📱 Tu tableta vieja se cambió por la nueva.')); return 1; }
    let tiene = Number(ctx.source.server.runCommandSilent(`clear ${n} patchouli:guide_book{"patchouli:book":"patchouli:tableta"} 0`)) > 0;
    if (tiene) { ctx.source.sendSystemMessage(Text.of('§7Ya tienes tu Tableta de Starvios.')); return 1; }
    tbDar(ctx.source.server, n, true);
    ctx.source.sendSystemMessage(Text.of('§6📱 Aquí tienes tu Tableta de Starvios.'));
    return 1;
  }));
});
