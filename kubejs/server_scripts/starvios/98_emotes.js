// priority: 30
// ============================================================
//  STARVIOS - EMOTES QUE FUNCIONAN AUNQUE ESTÉS TRANSFORMADO (cuy, rata...)
//  /emote saludo | baile | giro | celebrar | corazones | triste | enojado | dormir
//  Se ven en el servidor (partículas, sonidos, giros y saltitos), sin mods en el cliente.
// ============================================================

let EMOTES_SOLO_ADMINS = false;   // true = solo los OP pueden usar /emote
let EMOTES_ESPERA_MS = 4000;      // espera entre emotes por jugador

global.stEmoteHora = global.stEmoteHora || {};

ServerEvents.commandRegistry(event => {
  let { commands: Commands } = event;

  // pasos: [tick, comando-con-@s]  (se ejecutan "as <jugador> at @s")
  let giro = (desde, vueltas, paso) => {
    let r = [];
    for (let i = 0; i < vueltas * (360 / paso); i++) r.push([desde + i * 2, `tp @s ~ ~ ~ ~${paso} ~`]);
    return r;
  };
  let salto = (t) => [[t, 'effect give @s minecraft:levitation 1 6 true'], [t + 4, 'effect clear @s minecraft:levitation']];

  let EMOTES = {
    saludo: [].concat(
      salto(0),
      [[0, 'playsound minecraft:entity.villager.ambient player @a ~ ~ ~ 1 1.6'],
       [0, 'particle minecraft:happy_villager ~ ~1.2 ~ 0.4 0.4 0.4 0 15'],
       [6, 'tp @s ~ ~ ~ ~-25 ~'], [10, 'tp @s ~ ~ ~ ~50 ~'], [14, 'tp @s ~ ~ ~ ~-50 ~'], [18, 'tp @s ~ ~ ~ ~25 ~']]),
    baile: (() => {
      let r = [];
      for (let k = 0; k < 4; k++) {
        let t = k * 20;
        r = r.concat(salto(t), giro(t + 2, 1, 45));
        r.push([t, 'particle minecraft:note ~ ~1.6 ~ 0.6 0.3 0.6 1 6']);
        r.push([t, `playsound minecraft:block.note_block.bell player @a ~ ~ ~ 1 ${[1, 1.26, 1.5, 2][k]}`]);
      }
      return r;
    })(),
    giro: [].concat(giro(0, 2, 30), [[0, 'playsound minecraft:entity.player.attack.sweep player @a ~ ~ ~ 0.8 1.5'],
      [22, 'particle minecraft:cloud ~ ~0.3 ~ 0.4 0.1 0.4 0.02 15']]),
    celebrar: [].concat(salto(0), salto(12), salto(24),
      [[0, 'particle minecraft:firework ~ ~1 ~ 0.3 0.6 0.3 0.15 40'],
       [0, 'playsound minecraft:entity.firework_rocket.twinkle player @a ~ ~ ~ 1 1'],
       [12, 'particle minecraft:totem_of_undying ~ ~1 ~ 0.4 0.6 0.4 0.4 30'],
       [24, 'playsound minecraft:entity.player.levelup player @a ~ ~ ~ 1 1.4']]),
    corazones: [[0, 'particle minecraft:heart ~ ~1.4 ~ 0.6 0.4 0.6 0 12'],
      [0, 'playsound minecraft:entity.cat.purr player @a ~ ~ ~ 1 1.2'],
      [15, 'particle minecraft:heart ~ ~1.4 ~ 0.6 0.4 0.6 0 12']],
    triste: [[0, 'particle minecraft:falling_water ~ ~1.3 ~ 0.3 0.2 0.3 0 25'],
      [0, 'tp @s ~ ~ ~ ~ 60'], [0, 'playsound minecraft:entity.wolf.whine player @a ~ ~ ~ 1 1.3'],
      [40, 'tp @s ~ ~ ~ ~ 0']],
    enojado: [[0, 'particle minecraft:angry_villager ~ ~1.3 ~ 0.4 0.3 0.4 0 8'],
      [0, 'playsound minecraft:entity.pig.ambient player @a ~ ~ ~ 1 0.6'],
      [4, 'tp @s ~ ~ ~ ~-20 ~'], [8, 'tp @s ~ ~ ~ ~40 ~'], [12, 'tp @s ~ ~ ~ ~-40 ~'], [16, 'tp @s ~ ~ ~ ~20 ~']],
    dormir: [[0, 'tp @s ~ ~ ~ ~ 50'], [0, 'playsound minecraft:entity.fox.sleep player @a ~ ~ ~ 1 1'],
      [0, 'title @s actionbar {"text":"Zzz...","color":"gray"}'],
      [10, 'particle minecraft:cloud ~ ~1.4 ~ 0.1 0.1 0.1 0.01 3'], [30, 'particle minecraft:cloud ~ ~1.6 ~ 0.1 0.1 0.1 0.01 3'],
      [50, 'particle minecraft:cloud ~ ~1.8 ~ 0.1 0.1 0.1 0.01 3'], [60, 'tp @s ~ ~ ~ ~ 0']]
  };

  let hacer = (ctx, nombre) => {
    let p = ctx.source.player;
    if (!p) return 0;
    let server = ctx.source.server, n = p.getName().getString();
    let ahora = Date.now();
    if (ahora - (global.stEmoteHora[n] || 0) < EMOTES_ESPERA_MS) {
      server.runCommandSilent(`title ${n} actionbar {"text":"Espera un momento antes de otro emote","color":"gray"}`);
      return 0;
    }
    global.stEmoteHora[n] = ahora;
    EMOTES[nombre].forEach(paso => {
      let cmd = `execute as ${n} at @s run ${paso[1]}`;
      if (paso[0] === 0) server.runCommandSilent(cmd);
      else server.scheduleInTicks(paso[0], () => server.runCommandSilent(cmd));
    });
    return 1;
  };

  let nodo = Commands.literal('emote');
  if (EMOTES_SOLO_ADMINS) nodo = nodo.requires(s => s.hasPermission(2));
  Object.keys(EMOTES).forEach(nombre => {
    nodo = nodo.then(Commands.literal(nombre).executes(ctx => hacer(ctx, nombre)));
  });
  event.register(nodo);
});
