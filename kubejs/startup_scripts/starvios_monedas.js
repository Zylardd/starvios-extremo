// ============================================================
//  STARVIOS - Monedas Starcoin (para el mod Lightman's Currency)
//  El valor de cada moneda se define en config/lightmanscurrency/MasterCoinList.json
//  Starcoin = 1 ✦ · de plata = 10 ✦ · de oro = 100 ✦ · de diamante = 1000 ✦
//  Texturas: kubejs/assets/kubejs/textures/item/<id>.png
//  (Los startup_scripts solo se cargan al ARRANCAR el juego/servidor)
// ============================================================
StartupEvents.registry('item', event => {
  event.create('starcoin').displayName('Starcoin').rarity('common');
  event.create('starcoin_plata').displayName('Starcoin de plata').rarity('uncommon');
  event.create('starcoin_oro').displayName('Starcoin de oro').rarity('rare');
  event.create('starcoin_diamante').displayName('Starcoin de diamante').rarity('epic').glow(true);
});
