// priority: 0
// ============================================================
//  AVISO EN PANTALLA (arriba a la derecha, estilo mensaje de chat)
//  Lo usan los nerfs y buffs (93_anomalias.js).
//  Se dibuja con el "Painter" de KubeJS: no necesita mods extra.
//  Si en algún momento no se ve, pon HUD_ACTIVO = false y vuelven los toasts.
//  Prueba: /starvios hud prueba
// ============================================================
let HUD_ACTIVO = true;
let HUD_ANCHO = 230;        // ancho del recuadro (px de interfaz)
let HUD_MARGEN = 6;         // separación del borde de la pantalla
let HUD_SEGUNDOS = 9;       // tiempo en pantalla
let HUD_CHARS = 40;         // letras por línea antes de cortar
global.stHudActivo = () => HUD_ACTIVO;

let hudCortar = (texto, max) => {
  let out = [], linea = '';
  String(texto).split(' ').forEach(pal => {
    if ((linea + ' ' + pal).trim().length > max && linea) { out.push(linea); linea = pal; }
    else linea = (linea + ' ' + pal).trim();
  });
  if (linea) out.push(linea);
  return out;
};

let hudN = {};       // por destinatario: número del último aviso
let HUD_MAX_L = 14;  // líneas que se limpian siempre (por si el aviso anterior era más largo)
// quien: nombre de un jugador, o vacío / '@a' para todos.  bordeHex: '#RRGGBB'
global.stAvisoHud = (server, cabecera, subtitulo, cuerpo, bordeHex, quien) => {
  let lineas = [[cabecera, '§l']];
  if (subtitulo) hudCortar(subtitulo, HUD_CHARS).forEach(l => lineas.push([l, '§7§o']));
  String(cuerpo).split('\n').forEach(par => hudCortar(par, HUD_CHARS).forEach(l => lineas.push([l, '§f'])));
  if (lineas.length > HUD_MAX_L) lineas = lineas.slice(0, HUD_MAX_L);
  let alto = 8 + lineas.length * 10;
  let izq = `$screenW - ${HUD_ANCHO + HUD_MARGEN}`;
  let obj = {};
  for (let i = 0; i < HUD_MAX_L; i++) obj['st_hud_l' + i] = { remove: true };
  obj.st_hud_fondo = { type: 'rectangle', x: izq, y: HUD_MARGEN, w: HUD_ANCHO, h: alto, color: '#101018', alpha: 200, draw: 'ingame' };
  obj.st_hud_borde = { type: 'rectangle', x: izq, y: HUD_MARGEN, w: 2, h: alto, color: bordeHex, draw: 'ingame' };
  lineas.forEach((l, i) => {
    obj['st_hud_l' + i] = { type: 'text', x: `$screenW - ${HUD_ANCHO + HUD_MARGEN - 7}`, y: HUD_MARGEN + 5 + i * 10, text: l[1] + l[0], shadow: true, draw: 'ingame' };
  });
  let clave = (quien && quien !== '@a') ? String(quien) : '@a';
  let destino = () => {
    let r = [];
    server.players.forEach(p => { if (clave === '@a' || p.getName().getString() === clave) r.push(p); });
    return r;
  };
  destino().forEach(p => { try { p.paint(obj); } catch (e) { console.warn('[Starvios] HUD: ' + e); } });
  let yo = (hudN[clave] || 0) + 1; hudN[clave] = yo;
  if (clave !== '@a') hudN['@a'] = (hudN['@a'] || 0);     // un aviso a todos posterior también lo reemplaza
  server.scheduleInTicks(HUD_SEGUNDOS * 20, () => {
    if (yo !== hudN[clave]) return;   // llegó otro aviso después: ese se encarga
    let quitar = { st_hud_fondo: { remove: true }, st_hud_borde: { remove: true } };
    for (let i = 0; i < HUD_MAX_L; i++) quitar['st_hud_l' + i] = { remove: true };
    destino().forEach(p => { try { p.paint(quitar); } catch (e) {} });
  });
};
global.stHudSegundos = () => HUD_SEGUNDOS;

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('hud').then(Commands.literal('prueba').executes(ctx => {
      global.stAvisoHud(ctx.source.server, '§c⚠ NUEVA ANOMALÍA §8· §7Prueba', 'Se descubrió una nueva anomalía…',
        'Las herramientas de madera y piedra se gastan el doble.', '#E03030');
      return 1;
    }))));
});
