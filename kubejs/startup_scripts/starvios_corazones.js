// ============================================================
//  STARVIOS - Objetos de corazón con diseño propio
//  Texturas: kubejs/assets/kubejs/textures/item/<id>.png
//  (el nombre y la descripción que se ven en el juego los pone 70_recompensas.js)
// ============================================================
StartupEvents.registry('item', event => {
  event.create('fragmento_corazon').displayName('Fragmento de Corazón').rarity('uncommon');
  event.create('corazon_vital').displayName('Corazón Vital').rarity('epic');
  event.create('corazon_fragil').displayName('Corazón Frágil').rarity('rare');
  event.create('corazon_resurreccion').displayName('Corazón de Resurrección').rarity('epic').glow(true);
});
