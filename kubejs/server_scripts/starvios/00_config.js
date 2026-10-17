// ============================================================
//  STARVIOS EXTREMO - CONFIGURACIÓN DEL EVENTO
//  Edita SOLO este archivo para cambiar reglas, coordenadas y días.
//  Tras editar: en el servidor ejecuta /reload (o reinicia).
// ============================================================

global.STARVIOS = {
  // Los días NO avanzan solos: los controlas tú con /starvios activar, desactivar, dia y siguiente.

  // Duración total del evento en días
  diasTotales: 28,

  // Punto donde estabas parado al hacer //paste del schematic (= punto de aparición).
  // Se usa para devolver al spawn a quien entre al End.
  spawn: { x: -1383, y: 104, z: -1338 },

  // Centro de la arena de jefes (donde aparecen con /starvios jefe). PENDIENTE: pon aquí tu arena.
  arena: { x: -1383, y: 104, z: -1338 },

  // Zona protegida del spawn (la isla): nadie rompe/coloca bloques y no aparecen mobs hostiles.
  // Coordenadas ABSOLUTAS del mundo (dos esquinas opuestas, da igual el orden). Protege toda la altura.
  // Los OP pueden construir igualmente.
  zonaProtegida: { activa: true, x1: -1237, z1: -1180, x2: -1487, z2: -1450 },

  // ----------------------------------------------------------
  //  MINI-JEFES (ÉLITES)
  //  Algunos mobs aparecen como "Élite": nombre visible, mucha más vida y daño,
  //  armadura encantada. Al matarlos sueltan Fragmentos de Corazón y un premio.
  //  La probabilidad por día está en escalas.probElite.
  // ----------------------------------------------------------
  elites: {
    activa: true,
    vida: 4.0,                // multiplicador de vida
    daño: 1.6,                // multiplicador de daño
    fragmentos: [1, 2],       // fragmentos de corazón que suelta (mínimo, máximo)
    tipos: {                  // qué mobs pueden ser élite y cómo se llaman
      'minecraft:zombie': 'Zombi', 'minecraft:husk': 'Momia', 'minecraft:drowned': 'Ahogado',
      'minecraft:skeleton': 'Esqueleto', 'minecraft:stray': 'Errante', 'minecraft:spider': 'Araña',
      'minecraft:vindicator': 'Vindicador', 'minecraft:pillager': 'Saqueador', 'minecraft:witch': 'Bruja',
      'minecraft:wither_skeleton': 'Esqueleto Wither', 'minecraft:piglin_brute': 'Bruto'
    },
    // Premio aleatorio (uno por élite). peso = cuánto sale (más alto = más común).
    // Puedes añadir armaduras de Immersive Armors: mira su ID en el juego con F3+H.
    premios: [
      { id: 'minecraft:diamond', min: 1, max: 3, peso: 6 },
      { id: 'minecraft:golden_apple', min: 1, max: 2, peso: 6 },
      { id: 'minecraft:experience_bottle', min: 5, max: 12, peso: 5 },
      { id: 'minecraft:emerald', min: 3, max: 8, peso: 5 },
      { id: 'minecraft:iron_chestplate', min: 1, max: 1, peso: 3, nbt: '{Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:2s}]}' },
      { id: 'minecraft:iron_helmet', min: 1, max: 1, peso: 3, nbt: '{Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:2s}]}' },
      { id: 'minecraft:diamond_leggings', min: 1, max: 1, peso: 2, nbt: '{Enchantments:[{id:"minecraft:protection",lvl:2s}]}' },
      { id: 'minecraft:diamond_boots', min: 1, max: 1, peso: 2, nbt: '{Enchantments:[{id:"minecraft:feather_falling",lvl:4s},{id:"minecraft:protection",lvl:2s}]}' },
      { id: 'minecraft:diamond_sword', min: 1, max: 1, peso: 2, nbt: '{Enchantments:[{id:"minecraft:sharpness",lvl:3s}]}' },
      { id: 'minecraft:totem_of_undying', min: 1, max: 1, peso: 1 },
      { id: 'minecraft:enchanted_golden_apple', min: 1, max: 1, peso: 1 },
      { id: 'minecraft:netherite_scrap', min: 1, max: 1, peso: 1 }
    ]
  },

  // ----------------------------------------------------------
  //  MAZMORRAS ALEATORIAS  (/starvios mazmorra)
  //  Elige un punto al azar en tierra firme, genera una estructura, pone
  //  guardianes élite y un cofre de botín, y anuncia las coordenadas.
  // ----------------------------------------------------------
  mazmorras: {
    distanciaMin: 600,        // bloques mínimos desde el spawn
    distanciaMax: 3000,       // bloques máximos desde el spawn (el borde está a 7000)
    guardianes: [3, 5],       // cuántos élites la protegen (mínimo, máximo)
    tiposGuardian: ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:vindicator', 'minecraft:husk'],
    cofre: { fragmentos: [2, 4], premios: 3 },
    // Estructuras que se intentan (cada una solo sale en sus biomas; si ninguna cabe, sale un portal en ruinas).
    // Con mods de mazmorras puedes añadir las suyas: escribe /place structure y pulsa TAB para ver los IDs.
    estructuras: [
      { id: 'minecraft:pillager_outpost', nombre: 'Puesto de saqueadores' },
      { id: 'minecraft:desert_pyramid',   nombre: 'Pirámide del desierto' },
      { id: 'minecraft:jungle_pyramid',   nombre: 'Templo de la jungla' },
      { id: 'minecraft:swamp_hut',        nombre: 'Cabaña de la bruja' },
      { id: 'minecraft:igloo',            nombre: 'Iglú' },
      { id: 'minecraft:trail_ruins',      nombre: 'Ruinas antiguas' },
      { id: 'minecraft:mansion',          nombre: 'Mansión del bosque' }
    ],
    respaldo: { id: 'minecraft:ruined_portal', nombre: 'Portal en ruinas' }
  },

  // ----------------------------------------------------------
  //  CORAZONES EXTRA PERMANENTES
  //  4 Fragmentos de Corazón (2x2 en la mesa) = 1 Corazón Vital.
  //  Clic derecho con el Corazón Vital = +1 corazón máximo para siempre (hasta el límite).
  // ----------------------------------------------------------
  corazonesExtra: {
    activa: true,
    maximo: 5,                // corazones extra máximos por jugador
    porJefe: 2                // Corazones Vitales que suelta cada jefe semanal al morir
  },

  // ----------------------------------------------------------
  //  RESURRECCIÓN
  //  Empieza OCULTA: tú la revelas cuando quieras con /starvios resurreccion revelar
  //  (sale la receta en el chat para todos). Las Almas se sueltan desde el día 1.
  //  Al morir, el jugador suelta su "Alma" (su cabeza, brilla y no se destruye).
  //  Un compañero fabrica un "Corazón de Resurrección" y, con el Corazón en la mano
  //  principal y el Alma en la otra mano, hace clic derecho para revivirlo.
  // ----------------------------------------------------------
  resurreccion: {
    activa: true,
    maxPorJugador: 1,          // cuántas veces puede ser revivido cada jugador (0 = sin límite)
    vidaAlRevivir: 6,          // puntos de vida con los que vuelve (6 = 3 corazones)
    // Receta (mesa de crafteo). Letras de la cuadrícula y qué ítem es cada una.
    receta: ['DGD', 'GHG', 'DGD'],
    ingredientes: { D: 'minecraft:diamond', G: 'minecraft:gold_block', H: 'minecraft:heart_of_the_sea' }
  },

  // Jugadores que NO se eliminan al morir (admins / staff)
  exentos: ['Zylardd'],

  // Mensaje que ve el jugador eliminado al ser expulsado
  mensajeExpulsion: '§4§lHAS SIDO ELIMINADO\n\n§7Tu aventura en §cStarvios Extremo §7terminó.\n§8Gracias por jugar.',

  // Contador: true = los últimos 10 segundos salen en grande en pantalla con sonido.
  // false = solo se ve la barra de arriba.
  contadorNumerosEnPantalla: false,

  // Mensaje que ven todos cuando el servidor se cierra con /starvios cuenta <tiempo> cerrar
  mensajeCierre: '§6§lSTARVIOS EXTREMO\n\n§7Fin de la sesión de hoy.\n§7¡Nos vemos en el próximo día!',

  // Segundos entre la muerte y la expulsión
  segundosHastaExpulsion: 5,

  // Jefes de cada sábado (semana 1..4). Comprueba los IDs con /summon mowziesmobs: + TAB
  jefes: [
    // vida y daño son MULTIPLICADORES sobre los valores normales del mod (3 = el triple).
    // velocidad: 1 = normal, 1.2 = 20% más rápido. armadura: puntos extra (0-30).
    { nombre: 'Ferrous Wroughtnaut', id: 'mowziesmobs:ferrous_wroughtnaut', vida: 3.0, daño: 1.8, velocidad: 1.0, armadura: 6 },
    { nombre: 'Frostmaw',            id: 'mowziesmobs:frostmaw',            vida: 3.0, daño: 1.8, velocidad: 1.0, armadura: 6 },
    { nombre: 'Umvuthi',             id: 'mowziesmobs:umvuthi',             vida: 3.5, daño: 2.0, velocidad: 1.0, armadura: 8 },
    { nombre: 'La Escultora',        id: 'mowziesmobs:sculptor',            vida: 4.0, daño: 2.2, velocidad: 1.0, armadura: 10 }
  ],

  // Entidades que NUNCA reciben los multiplicadores (jefes, para que no sean imposibles)
  sinMultiplicador: [
    'mowziesmobs:ferrous_wroughtnaut', 'mowziesmobs:frostmaw',
    'mowziesmobs:umvuthi', 'mowziesmobs:sculptor', 'minecraft:wither', 'minecraft:ender_dragon'
  ],

  // ----------------------------------------------------------
  //  ESCALAS: cada lista es [ [díaDesde, valor], ... ]
  //  Se usa el valor del último "díaDesde" alcanzado.
  // ----------------------------------------------------------
  escalas: {
    vidaJugador:        [[1, 20], [8, 18], [15, 16], [22, 14], [28, 12]],   // puntos (20 = 10 corazones)
    vidaMobs:           [[1, 1.0], [7, 1.2], [16, 1.5], [26, 2.0]],         // multiplicador
    dañoMobs:           [[1, 1.0], [5, 1.15], [12, 1.35], [24, 1.6]],       // multiplicador
    creeperCargado:     [[1, 0], [3, 0.10], [9, 0.25], [23, 0.50]],         // probabilidad
    zombiArmaduraMalla: [[1, 0], [2, 0.20]],                                // probabilidad
    zombiArmaduraHierro:[[1, 0], [18, 0.40]],                               // probabilidad
    mobsResistencia:    [[1, 0], [25, 0.30]],                               // probabilidad
    probElite:          [[1, 0.015], [8, 0.025], [14, 0.05], [22, 0.07]]    // probabilidad de mini-jefe
  },

  // Reglas de activación única (desde ese día en adelante)
  desde: {
    arañaVeneno:         4,
    zombisRapidos:      10,
    esqueletosFuego:    11,
    hambreCada10Min:    17,
    arañaCeguera:       19,
    sinRegeneracion:    21,
    mobsConFuerza:      28
  },

  // Texto que se anuncia cada día (título + descripción). Edítalos a tu gusto.
  anuncios: {
    1:  ['Comienza Starvios',      'Si mueres, quedas eliminado. Sin segundas oportunidades.'],
    2:  ['Zombis acorazados',      'Los zombis pueden aparecer con armadura de malla.'],
    3:  ['Tormenta estática',      'Algunos creepers aparecen cargados (10%).'],
    4:  ['Colmillos venenosos',    'Las arañas envenenan con cada mordida.'],
    5:  ['Furia',                  'Los mobs hostiles hacen un 15% más de daño.'],
    6:  ['Primer jefe',            'Hoy despierta el Ferrous Wroughtnaut en la arena.'],
    7:  ['Piel dura',              'Los mobs hostiles tienen un 20% más de vida.'],
    8:  ['Cuerpo frágil',          'Pierdes 1 corazón de vida máxima.'],
    9:  ['Sobrecarga',             'Un 25% de los creepers aparecen cargados.'],
    10: ['Hordas veloces',         'Los zombis se mueven más rápido.'],
    11: ['Flechas ardientes',      'Los esqueletos disparan flechas de fuego.'],
    12: ['Sed de sangre',          'Los mobs hacen un 35% más de daño.'],
    13: ['Segundo jefe',           'Frostmaw ruge en la arena.'],
    14: ['Cazadores de élite',     'Los mini-jefes aparecen el doble. Más peligro, más recompensas.'],
    15: ['Debilidad',              'Pierdes otro corazón de vida máxima.'],
    16: ['Bestias',                'Los mobs tienen un 50% más de vida.'],
    17: ['Hambruna',               'Cada 10 minutos sufres hambre durante 30 segundos.'],
    18: ['Legión de hierro',       'Los zombis pueden llevar armadura de hierro.'],
    19: ['Oscuridad',              'Las arañas también ciegan.'],
    20: ['Tercer jefe',            'Umvuthi invoca al sol en la arena.'],
    21: ['Heridas abiertas',       'La regeneración natural se desactiva.'],
    22: ['Al límite',              'Pierdes otro corazón de vida máxima.'],
    23: ['Apocalipsis eléctrico',  'La mitad de los creepers aparecen cargados.'],
    24: ['Carnicería',             'Los mobs hacen un 60% más de daño.'],
    25: ['Blindados',              'Un 30% de los mobs tienen Resistencia.'],
    26: ['Titanes',                'Los mobs tienen el doble de vida.'],
    27: ['Jefe final',             'La Escultora espera en la arena.'],
    28: ['Último día',             '6 corazones y mobs con Fuerza. Sobrevive.']
  }
};
