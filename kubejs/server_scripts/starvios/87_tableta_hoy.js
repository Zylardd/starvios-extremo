// priority: 0
// ============================================================
//  TABLETA - "HOY EN STARVIOS"
//  La tableta (Patchouli) muestra el día actual y los nerfs/buffs activos.
//  Cada página está bloqueada por un logro oculto (kubejs/data/starvios/advancements/tableta/).
//  Este script da y quita esos logros según el día y las anomalías activas.
//  Revisa cada 5 s; solo toca a un jugador si algo cambió para él.
// ============================================================
let TH_TIPOS = ['n1', 'n2', 'b'];
let thFirma = {};   // nombre -> firma ya aplicada

let thQueToca = (server) => {
  let r = [];
  let d = global.stDia(server);
  if (d > 0) r.push('dia_' + d);
  try { global.stEfActivas(server).forEach(a => { if (TH_TIPOS.indexOf(a.tipo) !== -1) r.push(a.tipo + '_' + a.dia); }); } catch (e) {}
  return r;
};

let thAplicar = (server, n, lista) => {
  // quitar todos los de la tableta y dar solo los que tocan
  server.runCommandSilent(`advancement revoke ${n} from starvios:tableta/raiz`);
  lista.forEach(a => server.runCommandSilent(`advancement grant ${n} only starvios:tableta/${a}`));
};

global.stTabletaSync = (server, forzar) => {
  let lista = thQueToca(server);
  let firma = lista.join(',');
  server.players.forEach(p => {
    let n = p.getName().getString();
    if (!forzar && thFirma[n] === firma) return;
    thFirma[n] = firma;
    thAplicar(server, n, lista);
  });
};

let thTick = 0;
ServerEvents.tick(event => {
  if (++thTick % 100 !== 0) return;
  global.stSeguro('87_tableta_hoy', () => global.stTabletaSync(event.server, false));
});
PlayerEvents.loggedIn(event => {
  let server = event.server, n = event.player.getName().getString();
  delete thFirma[n];
  server.scheduleInTicks(60, () => global.stSeguro('87_tableta_hoy (login)', () => global.stTabletaSync(server, false)));
});
