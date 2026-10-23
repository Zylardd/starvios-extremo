// priority: 59
// ============================================================
//  STARVIOS - ANUNCIOS PERSONALIZADOS (recuadro arriba a la derecha + tintineo)
//  /starvios anuncio <texto>          anuncio dorado en el recuadro arriba a la derecha (no sale en el chat)
//  /starvios anuncio rojo <texto>     estilos: dorado, rojo, verde, azul, morado, arcoiris
//  Colores dentro del texto con & (como en los carteles):
//    &c rojo  &6 dorado  &e amarillo  &a verde  &b celeste  &9 azul  &d rosa  &5 morado  &f blanco  &7 gris
//    &l negrita  &o cursiva  &n subrayado  &r normal
//  Ejemplo: /starvios anuncio arcoiris &e¡Hoy a las &c9 PM &edespierta el &l&5JEFE&r&e!
// ============================================================

let AN_ESTILOS = {
  dorado:   { borde: '#FFAA00', titulo: ['#FFD700', '#FFC300', '#FFAA00', '#FF8C00'], icono: '✦', cod: '§6' },
  rojo:     { borde: '#FF4040', titulo: ['#FF7070', '#FF4040', '#E01010', '#B00000'], icono: '⚠', cod: '§c' },
  verde:    { borde: '#3DDC84', titulo: ['#A8FF60', '#55FF55', '#3DDC84', '#00B060'], icono: '✔', cod: '§a' },
  azul:     { borde: '#40A0FF', titulo: ['#9FD8FF', '#55CCFF', '#40A0FF', '#2060E0'], icono: '✉', cod: '§9' },
  morado:   { borde: '#B060FF', titulo: ['#E0A0FF', '#D070FF', '#B060FF', '#8030D0'], icono: '✦', cod: '§5' },
  arcoiris: { borde: '#FFFFFF', titulo: ['#FF5555', '#FFAA00', '#FFFF55', '#55FF55', '#55FFFF', '#5599FF', '#FF55FF'], icono: '★', cod: '§d' }
};

let anEsc = (t) => String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
let anCodigos = (t) => String(t).replace(/&([0-9a-fk-or])/gi, '§$1');
let anLetras = (texto, colores) => {
  let partes = [], j = 0;
  for (let i = 0; i < texto.length; i++) {
    let ch = texto.charAt(i);
    if (ch === ' ') { partes.push('{"text":" "}'); continue; }
    partes.push(`{"text":"${anEsc(ch)}","color":"${colores[j % colores.length]}","bold":true}`);
    j++;
  }
  return partes.join(',');
};

let anAnunciar = (server, estilo, texto) => {
  let E = AN_ESTILOS[estilo] || AN_ESTILOS.dorado;
  let cuerpo = anEsc(anCodigos(texto));
  let linea = `{"text":"${'━'.repeat(32)}","color":"${E.borde}"}`;
  let cmd = (c) => server.runCommandSilent(c);
  // Recuadro arriba a la derecha (igual que los nerfs y buffs: 86_hud.js)
  if (global.stHudActivo && global.stHudActivo()) {
    global.stAvisoHud(server, `${E.cod}§l${E.icono} ANUNCIO ${E.icono}`, null, anCodigos(texto), E.borde);
  } else {
    let sub = anCodigos(texto).replace(/§[0-9a-fk-or]/gi, '');
    if (sub.length > 60) sub = sub.slice(0, 57) + '…';
    cmd(`title @a actionbar {"text":"${anEsc(sub)}","color":"white"}`);
  }
  // Tintineo suave (campanitas)
  cmd(`execute as @a at @s run playsound minecraft:block.note_block.chime master @s ~ ~ ~ 1 1.5`);
  server.scheduleInTicks(4, () => cmd(`execute as @a at @s run playsound minecraft:block.note_block.chime master @s ~ ~ ~ 1 2`));
  server.scheduleInTicks(8, () => cmd(`execute as @a at @s run playsound minecraft:block.amethyst_block.chime master @s ~ ~ ~ 1 1.2`));
};
global.stAnuncioBonito = anAnunciar;

ServerEvents.commandRegistry(event => {
  let { commands: Commands, arguments: Arguments } = event;
  let nodo = Commands.literal('anuncio')
    .then(Commands.argument('texto', Arguments.GREEDY_STRING.create(event)).executes(ctx => {
      let t = String(Arguments.GREEDY_STRING.getResult(ctx, 'texto'));
      let pal = t.split(' ')[0].toLowerCase();
      if (AN_ESTILOS[pal] && t.indexOf(' ') !== -1) anAnunciar(ctx.source.server, pal, t.slice(t.indexOf(' ') + 1));
      else anAnunciar(ctx.source.server, 'dorado', t);
      return 1;
    }));
  event.register(Commands.literal('starvios').requires(s => s.hasPermission(2)).then(nodo));
});
