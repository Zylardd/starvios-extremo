// priority: 59
// ============================================================
//  STARVIOS - ANUNCIOS PERSONALIZADOS (con trompeta)
//  /starvios anuncio <texto>          anuncio dorado en el chat + en pantalla
//  /starvios anuncio rojo <texto>     estilos: dorado, rojo, verde, azul, morado, arcoiris
//  Colores dentro del texto con & (como en los carteles):
//    &c rojo  &6 dorado  &e amarillo  &a verde  &b celeste  &9 azul  &d rosa  &5 morado  &f blanco  &7 gris
//    &l negrita  &o cursiva  &n subrayado  &r normal
//  Ejemplo: /starvios anuncio arcoiris &e¡Hoy a las &c9 PM &edespierta el &l&5JEFE&r&e!
// ============================================================

let AN_ESTILOS = {
  dorado:   { borde: '#FFAA00', titulo: ['#FFD700', '#FFC300', '#FFAA00', '#FF8C00'], icono: '📢' },
  rojo:     { borde: '#FF4040', titulo: ['#FF7070', '#FF4040', '#E01010', '#B00000'], icono: '⚠' },
  verde:    { borde: '#3DDC84', titulo: ['#A8FF60', '#55FF55', '#3DDC84', '#00B060'], icono: '✔' },
  azul:     { borde: '#40A0FF', titulo: ['#9FD8FF', '#55CCFF', '#40A0FF', '#2060E0'], icono: '✉' },
  morado:   { borde: '#B060FF', titulo: ['#E0A0FF', '#D070FF', '#B060FF', '#8030D0'], icono: '✦' },
  arcoiris: { borde: '#FFFFFF', titulo: ['#FF5555', '#FFAA00', '#FFFF55', '#55FF55', '#55FFFF', '#5599FF', '#FF55FF'], icono: '🎉' }
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
  // Chat
  cmd(`tellraw @a ""`);
  cmd(`tellraw @a ${linea}`);
  cmd(`tellraw @a ["",{"text":"   ${E.icono}  "},${anLetras('A N U N C I O', E.titulo).replace(/\{"text":" "\},/g, '')},{"text":"  ${E.icono}"}]`);
  cmd(`tellraw @a ""`);
  cmd(`tellraw @a ["",{"text":"   "},{"text":"${cuerpo}","color":"white"}]`);
  cmd(`tellraw @a ${linea}`);
  cmd(`tellraw @a ""`);
  // Pantalla
  let sub = anCodigos(texto).replace(/§[0-9a-fk-or]/gi, '');
  if (sub.length > 60) sub = sub.slice(0, 57) + '…';
  cmd(`title @a times 10 80 20`);
  cmd(`title @a subtitle {"text":"${anEsc(sub)}","color":"white"}`);
  cmd(`title @a title ["",${anLetras(E.icono + ' ANUNCIO ' + E.icono, E.titulo)}]`);
  // Trompeta (cuerno de cabra) + campanita
  cmd(`execute as @a at @s run playsound minecraft:item.goat_horn.sound.1 master @s ~ ~ ~ 2 1`);
  server.scheduleInTicks(14, () => cmd(`execute as @a at @s run playsound minecraft:item.goat_horn.sound.1 master @s ~ ~ ~ 2 1.25`));
  server.scheduleInTicks(30, () => cmd(`execute as @a at @s run playsound minecraft:block.note_block.chime master @s ~ ~ ~ 1 1.5`));
  server.scheduleInTicks(34, () => cmd(`execute as @a at @s run playsound minecraft:block.note_block.chime master @s ~ ~ ~ 1 2`));
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
