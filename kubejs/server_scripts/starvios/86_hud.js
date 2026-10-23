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

let hudN = 0;
let HUD_IDS = [];
// lineas: [[texto, '§x'], ...]  bordeHex: '#RRGGBB'
global.stAvisoHud = (server, cabecera, subtitulo, cuerpo, bordeHex) => {
  let lineas = [[cabecera, '§l']];
  if (subtitulo) hudCortar(subtitulo, HUD_CHARS).forEach(l => lineas.push([l, '§7§o']));
  hudCortar(cuerpo, HUD_CHARS).forEach(l => lineas.push([l, '§f']));
  let alto = 8 + lineas.length * 10;
  let izq = `$screenW - ${HUD_ANCHO + HUD_MARGEN}`;
  let obj = {};
  // limpiar líneas de un aviso anterior más largo
  HUD_IDS.forEach(id => { obj[id] = { remove: true }; });
  obj.st_hud_fondo = { type: 'rectangle', x: izq, y: HUD_MARGEN, w: HUD_ANCHO, h: alto, color: '#101018', alpha: 200, draw: 'ingame' };
  obj.st_hud_borde = { type: 'rectangle', x: izq, y: HUD_MARGEN, w: 2, h: alto, color: bordeHex, draw: 'ingame' };
  HUD_IDS = [];
  lineas.forEach((l, i) => {
    let id = 'st_hud_l' + i;
    HUD_IDS.push(id);
    obj[id] = { type: 'text', x: `$screenW - ${HUD_ANCHO + HUD_MARGEN - 7}`, y: HUD_MARGEN + 5 + i * 10, text: l[1] + l[0], shadow: true, draw: 'ingame' };
  });
  server.players.forEach(p => { try { p.paint(obj); } catch (e) { console.warn('[Starvios] HUD: ' + e); } });
  let yo = ++hudN;
  server.scheduleInTicks(HUD_SEGUNDOS * 20, () => {
    if (yo !== hudN) return;   // llegó otro aviso después: ese se encarga
    let quitar = { st_hud_fondo: { remove: true }, st_hud_borde: { remove: true } };
    HUD_IDS.forEach(id => { quitar[id] = { remove: true }; });
    server.players.forEach(p => { try { p.paint(quitar); } catch (e) {} });
  });
};

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2))
    .then(Commands.literal('hud').then(Commands.literal('prueba').executes(ctx => {
      global.stAvisoHud(ctx.source.server, '§c⚠ NUEVA ANOMALÍA §8· §7Prueba', 'Se descubrió una nueva anomalía…',
        'Las herramientas de madera y piedra se gastan el doble.', '#E03030');
      return 1;
    }))));
});
