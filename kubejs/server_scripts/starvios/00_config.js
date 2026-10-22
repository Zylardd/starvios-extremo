// priority: 1000
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
  spawn: { x: -1384, y: 94, z: -1284 },

  // Centro de la arena de jefes (donde aparecen con /starvios jefe). PENDIENTE: pon aquí tu arena.
  arena: { x: -1383, y: 104, z: -1337 },

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
    vida: 8.0,                // multiplicador de vida
    daño: 1.5,                // multiplicador de daño (encima del x2 general de los mobs)
    fragmentos: [0, 1],       // fragmentos de corazón que suelta (mínimo, máximo)
    probPremio: 0.35,         // probabilidad de que suelte además un premio de la lista
    tipos: {                  // qué mobs pueden ser élite y cómo se llaman
      'minecraft:zombie': 'Zombi', 'minecraft:husk': 'Momia', 'minecraft:drowned': 'Ahogado',
      'minecraft:skeleton': 'Esqueleto', 'minecraft:stray': 'Errante', 'minecraft:spider': 'Araña',
      'minecraft:vindicator': 'Vindicador', 'minecraft:pillager': 'Saqueador', 'minecraft:witch': 'Bruja',
      'minecraft:wither_skeleton': 'Esqueleto Wither', 'minecraft:piglin_brute': 'Bruto'
    },
    // Premio aleatorio (uno por élite). peso = cuánto sale (más alto = más común).
    // soloCapitan: true = solo sale en el cofre del Capitán y de las criptas, nunca de un élite normal.
    // Puedes añadir armaduras de Immersive Armors: mira su ID en el juego con F3+H.
    premios: [
      { id: 'minecraft:diamond', min: 1, max: 3, peso: 6, soloCapitan: true },
      { id: 'minecraft:golden_apple', min: 1, max: 2, peso: 6 },
      { id: 'minecraft:experience_bottle', min: 5, max: 12, peso: 5 },
      { id: 'minecraft:emerald', min: 3, max: 8, peso: 5 },
      { id: 'minecraft:iron_chestplate', min: 1, max: 1, peso: 3, nbt: '{Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:2s}]}' },
      { id: 'minecraft:iron_helmet', min: 1, max: 1, peso: 3, nbt: '{Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:2s}]}' },
      { id: 'minecraft:diamond_leggings', min: 1, max: 1, peso: 2, nbt: '{Enchantments:[{id:"minecraft:protection",lvl:2s}]}', soloCapitan: true },
      { id: 'minecraft:diamond_boots', min: 1, max: 1, peso: 2, nbt: '{Enchantments:[{id:"minecraft:feather_falling",lvl:4s},{id:"minecraft:protection",lvl:2s}]}', soloCapitan: true },
      { id: 'minecraft:diamond_sword', min: 1, max: 1, peso: 2, nbt: '{Enchantments:[{id:"minecraft:sharpness",lvl:3s}]}', soloCapitan: true },
      { id: 'minecraft:totem_of_undying', min: 1, max: 1, peso: 1, soloCapitan: true },
      { id: 'minecraft:enchanted_golden_apple', min: 1, max: 1, peso: 1, soloCapitan: true },
      { id: 'minecraft:netherite_scrap', min: 1, max: 1, peso: 1, soloCapitan: true }
    ]
  },

  // ----------------------------------------------------------
  //  MAZMORRAS ALEATORIAS  (/starvios mazmorra)
  //  Elige un punto al azar en tierra firme, genera una estructura, pone
  //  guardianes élite y un cofre de botín, y anuncia las coordenadas.
  // ----------------------------------------------------------
  mazmorras: {
    distanciaMin: 1200,       // bloques mínimos desde el spawn
    distanciaMax: 4500,       // bloques máximos desde el spawn (el borde está a 7000; las arenas en las esquinas)
    guardianes: [3, 5],       // cuántos élites la protegen (mínimo, máximo)
    radioCorrea: 40,          // si persiguen a alguien más lejos de esto (desde el centro), vuelven a su puesto
    tiposGuardian: ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:vindicator', 'minecraft:husk'],
    // Ya no hay cofre a la vista: lo suelta el CAPITÁN (un élite más fuerte) al morir.
    cofre: { fragmentos: [1, 2], premios: 2, valiososGarantizados: 0, tiradasEspeciales: 1 },
    capitan: { vidaExtra: 3.0, nombre: 'Capitán de la mazmorra' },   // vidaExtra = ×3 sobre un élite normal
    escoltaCapitan: 3,        // élites que custodian al Capitán en la sala del trono
    estilo: 'laberinto',      // 'laberinto' = fortaleza-laberinto generada · 'estructura' = las estructuras de abajo (antiguo)
    laberintoCfg: {
      profundidad: 3,         // escalones que baja desde la superficie
      laberinto: 7,           // celdas por lado (7 = 29x29 bloques)
      mobs: ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:vindicator', 'minecraft:husk', 'minecraft:pillager', 'minecraft:spider'],
      generadores: ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider'],
      cantidadMobs: { base: 14, porDia: 1.0, maximo: 45 },
      probEliteMob: { base: 0.25, porDia: 0.015, maximo: 0.6 }
    },
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
  //  CRIPTAS SUBTERRÁNEAS  (/starvios cripta)
  //  Una escalera baja desde la superficie a un laberinto de salas con monstruos
  //  y generadores. Al final, el Señor de la Cripta. Cuando muere aparece su cofre.
  // ----------------------------------------------------------
  criptas: {
    profundidad: 24,          // bloques bajo la superficie
    distanciaMin: 1200,       // bloques mínimos desde el spawn (punto al azar)
    distanciaMax: 4500,       // bloques máximos (el borde está a 7000; las arenas en las esquinas)
    laberinto: 9,             // celdas por lado (9 = laberinto de 37x37 bloques)
    // Jefes de mods (se prueba uno al azar; si el ID no existe se prueba el siguiente).
    // vida/daño/armadura son valores absolutos (no multiplicadores).
    jefes: [
      { nombre: 'Gólem del Vacío',      id: 'cataclysm:ender_golem',       vida: 450, daño: 18, armadura: 14 },
      { nombre: 'Revenant Ígneo',       id: 'cataclysm:ignited_revenant',  vida: 380, daño: 14, armadura: 16 },
      { nombre: 'El Merodeador',        id: 'cataclysm:the_prowler',       vida: 420, daño: 16, armadura: 18 },
      { nombre: 'Kobolediator',         id: 'cataclysm:kobolediator',      vida: 400, daño: 17, armadura: 14 },
      { nombre: 'Wadjet',               id: 'cataclysm:wadjet',            vida: 360, daño: 15, armadura: 12 }
    ],
    // Si ningún jefe de mod se puede invocar, sale este
    jefeRespaldo: { nombre: 'Señor de la Cripta', id: 'minecraft:wither_skeleton', vida: 300, daño: 14, armadura: 14, arma: 'minecraft:netherite_sword' },
    // Monstruos repartidos por el laberinto
    mobs: ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider', 'minecraft:cave_spider', 'minecraft:stray',
           'minecraft:husk', 'minecraft:skeleton', 'minecraft:zombie', 'minecraft:witch', 'minecraft:vindicator'],
    cantidadMobs: { base: 30, porDia: 2.0, maximo: 90 },   // monstruos en el laberinto (sube cada día)
    probEliteMob: { base: 0.20, porDia: 0.015, maximo: 0.6 }, // probabilidad de que cada uno sea élite
    generadores: ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:cave_spider', 'minecraft:spider', 'minecraft:zombie',
                  'minecraft:skeleton', 'minecraft:witch', 'minecraft:cave_spider'],
    cofre: { fragmentos: [3, 5], premios: 4, monedas: 150 }
  },

  // ----------------------------------------------------------
  //  RECETAS BLOQUEADAS
  //  Cualquier receta cuyo RESULTADO encaje con alguno de estos patrones desaparece.
  //  Para ver el ID de un objeto: pásale el ratón en JEI con F3+H activado.
  // ----------------------------------------------------------
  recetasBloqueadas: [
    '^immersive_armors:',                                            // todas las armaduras de Immersive Armors
    '^cataclysm:.*_(helmet|chestplate|leggings|boots)$',             // armaduras de Cataclysm (solo por jefes)
    '^cataclysm:(ignitium|cursium|bone_reptile).*',                  // equipo de jefes de Cataclysm
    '^securitycraft:(.*mine|bouncing_betty|claymore|ims)$',          // minas explosivas de SecurityCraft (todas)
    '^cataclysm:(gauntlet_of_guard|meat_shredder|the_incinerator)$', // armas de premio de misión (solo por misiones)
    '^mowziesmobs:(blowgun|spear|naga_fang_dagger|earthrend_gauntlet|wrought_axe)$'
    // , '^securitycraft:reinforced_'   // quita las 2 barras del principio para prohibir bloques reforzados (bases blindadas)
  ],

  // ----------------------------------------------------------
  //  GENERACIÓN AUTOMÁTICA (solo con el evento activo y jugadores conectados)
  //  0 = desactivado. En minutos de juego real.
  // ----------------------------------------------------------
  automatico: { mazmorraCadaMin: 45, criptaCadaMin: 90 },

  // ----------------------------------------------------------
  //  BOTÍN ESPECIAL (jefes semanales, élites y señores de las criptas)
  //  En cada tirada: 30% sale algo valioso; si no, 10% sale algo poco útil.
  // ----------------------------------------------------------
  botinEspecial: {
    probValioso: 0.30,
    probBasura: 0.10,
    tiradas: { jefe: 6, elite: 0, cripta: 3 },   // cuántas veces se tira por cada tipo de enemigo
    valiosos: [
      { id: 'minecraft:totem_of_undying', cantidad: 1 },
      { id: 'minecraft:enchanted_golden_apple', cantidad: 1 },
      { id: 'minecraft:heart_of_the_sea', cantidad: 1 }
    ],
    basura: [
      { id: 'minecraft:rotten_flesh', cantidad: 8 }, { id: 'minecraft:stick', cantidad: 5 },
      { id: 'minecraft:bowl', cantidad: 3 }, { id: 'minecraft:poisonous_potato', cantidad: 2 },
      { id: 'minecraft:dead_bush', cantidad: 2 }, { id: 'minecraft:string', cantidad: 4 },
      { id: 'minecraft:feather', cantidad: 3 }, { id: 'minecraft:flower_pot', cantidad: 1 },
      { id: 'minecraft:wooden_shovel', cantidad: 1 }, { id: 'minecraft:leather_boots', cantidad: 1 }
    ]
  },

  // ----------------------------------------------------------
  //  ECONOMÍA
  //  Saldo personal (se ve en la lista TAB). Se gana matando élites, jefes,
  //  señores de cripta y, a veces, monstruos normales. Se gasta en /tienda.
  // ----------------------------------------------------------
  economia: {
    nombre: 'Starcoins',
    simbolo: '✦',
    saldoInicial: 50,
    // Moneda física con el mod Lightman's Currency (si está instalado). Las Starcoins viven en la cuenta
    // del banco de cada jugador: se sacan/meten en monedas en un CAJERO (ATM) o con la billetera.
    // Monedas: Starcoin (1) · de plata (10) · de oro (100) · de diamante (1000)
    monedaMod: true,
    tiendaSoloEnSpawn: true,           // /tienda y /vender solo dentro de la isla
    ganancias: {
      elite: 10,                       // al que lo mata
      jefe: 300,                       // a CADA jugador vivo y conectado
      mobNormal: { prob: 0.20, min: 1, max: 3 }
    },
    // clave = lo que se escribe en /comprar <clave>
    tienda: [
      { clave: 'pan',        nombre: 'Pan x8',                 id: 'minecraft:bread',              cantidad: 8,  precio: 10 },
      { clave: 'filete',     nombre: 'Filete asado x8',        id: 'minecraft:cooked_beef',        cantidad: 8,  precio: 20 },
      { clave: 'antorchas',  nombre: 'Antorchas x32',          id: 'minecraft:torch',              cantidad: 32, precio: 8 },
      { clave: 'flechas',    nombre: 'Flechas x32',            id: 'minecraft:arrow',              cantidad: 32, precio: 15 },
      { clave: 'escudo',     nombre: 'Escudo',                 id: 'minecraft:shield',             cantidad: 1,  precio: 25 },
      { clave: 'cama',       nombre: 'Cama',                   id: 'minecraft:white_bed',          cantidad: 1,  precio: 30 },
      { clave: 'cubo',       nombre: 'Cubo de agua',           id: 'minecraft:water_bucket',       cantidad: 1,  precio: 20 },
      { clave: 'curacion',   nombre: 'Poción de curación',     id: 'minecraft:potion',             cantidad: 1,  precio: 35, nbt: '{Potion:"minecraft:strong_healing"}' },
      { clave: 'perlas',     nombre: 'Perlas de Ender x2',     id: 'minecraft:ender_pearl',        cantidad: 2,  precio: 40 },
      { clave: 'experiencia',nombre: 'Botellas de XP x10',     id: 'minecraft:experience_bottle',  cantidad: 10, precio: 60 },
      { clave: 'manzana',    nombre: 'Manzana dorada',         id: 'minecraft:golden_apple',       cantidad: 1,  precio: 120 },
      { clave: 'fragmento',  nombre: 'Fragmento de Corazón',   especial: 'fragmento',              cantidad: 1,  precio: 250 },
      { clave: 'totem',      nombre: 'Tótem de inmortalidad',  id: 'minecraft:totem_of_undying',   cantidad: 1,  precio: 800 }
    ],
    // Precio por unidad al usar /vender con el objeto en la mano
    venta: {
      'minecraft:diamond': 25, 'minecraft:emerald': 10, 'minecraft:gold_ingot': 6, 'minecraft:iron_ingot': 3,
      'minecraft:netherite_scrap': 120, 'minecraft:ender_pearl': 8, 'minecraft:blaze_rod': 10, 'minecraft:gunpowder': 2,
      'minecraft:bone': 1, 'minecraft:string': 1, 'minecraft:spider_eye': 1, 'minecraft:leather': 2,
      'minecraft:coal': 1, 'minecraft:redstone': 1, 'minecraft:lapis_lazuli': 1, 'minecraft:amethyst_shard': 2
    }
  },

  // ----------------------------------------------------------
  //  CASINO  (/duelo  /ruleta  /loteria)  -  sin límites de apuesta
  //  Admin: /starvios casino abrir|cerrar · /starvios loteria sortear
  // ----------------------------------------------------------
  casino: {
    comisionDuelo: 0.05,     // la casa se queda con el 5% del bote del duelo
    pagoColor: 2,            // ruleta: rojo/negro paga x2
    pagoVerde: 14,           // ruleta: verde (el 0) paga x14
    pagoNumero: 36,          // ruleta: número exacto paga x36
    precioBoleto: 20,        // lotería: precio de cada boleto
    premioLoteria: 0.9       // lotería: el ganador se lleva el 90% del bote (el resto es de la casa)
  },

  // ----------------------------------------------------------
  //  EQUIPOS  (/equipo ...)  -  sin fuego amigo, chat privado con /eq
  // ----------------------------------------------------------
  equipos: {
    maxMiembros: 4,
    colores: ['red', 'blue', 'green', 'yellow', 'aqua', 'light_purple', 'gold', 'dark_green', 'dark_aqua', 'dark_purple']
  },

  // ----------------------------------------------------------
  //  CORAZONES EXTRA PERMANENTES
  //  4 Fragmentos de Corazón (2x2 en la mesa) = 1 Corazón Vital.
  //  Clic derecho con el Corazón Vital = +1 corazón máximo para siempre (hasta el límite).
  // ----------------------------------------------------------
  corazonesExtra: {
    activa: true,
    maximo: 0,                // corazones extra máximos por jugador (0 = SIN LÍMITE)
    porJefe: 2                // Corazones Vitales que suelta cada jefe semanal al morir
  },

  // Corazón Frágil: clic derecho = +1 corazón DORADO que no se regenera (si te golpean, se pierde).
  // Receta 2x2: 2 Fragmentos de Corazón + 2 lingotes de oro (en diagonal).
  corazonFragil: { activa: true, maximo: 7 },   // máximo de corazones frágiles a la vez

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
    maxPorJugador: 0,          // veces que se puede revivir a cada jugador (0 = SIN LÍMITE)
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
    // vida y daño son MULTIPLICADORES sobre los valores normales del mod (15 = quince veces).
    // Pensado para hasta 20 jugadores a la vez. velocidad: 1 = normal. armadura: puntos extra (0-30).
    // IMPORTANTE: Minecraft limita la vida a 1024 sin el mod AttributeFix (ver guía).
    // Comprueba los IDs en el juego con /summon <mod>: y TAB.
    { nombre: 'Ferrous Wroughtnaut',        id: 'mowziesmobs:ferrous_wroughtnaut',  vida: 2,  daño: 2.5, velocidad: 1.0,  armadura: 8,  color: 'gray',
      esbirros: ['minecraft:zombie', 'minecraft:vindicator', 'minecraft:skeleton'] },
    { nombre: 'Frostmaw',                   id: 'mowziesmobs:frostmaw',             vida: 12, daño: 2.5, velocidad: 1.0,  armadura: 8,  color: 'aqua',
      esbirros: ['minecraft:stray', 'minecraft:stray', 'minecraft:skeleton'] },
    { nombre: 'Umvuthi',                    id: 'mowziesmobs:umvuthi',              vida: 18, daño: 2.8, velocidad: 1.0,  armadura: 10, color: 'gold',
      esbirros: ['mowziesmobs:barakoa', 'minecraft:husk', 'minecraft:husk'] },
    { nombre: 'Monstruosidad de Netherita', id: 'cataclysm:netherite_monstrosity',  vida: 12, daño: 3.0, velocidad: 1.0,  armadura: 12, color: 'dark_red',
      esbirros: ['minecraft:blaze', 'minecraft:wither_skeleton', 'minecraft:magma_cube'] },
    { nombre: 'Ignis, el Señor de las Llamas', id: 'cataclysm:ignis',               vida: 15, daño: 3.5, velocidad: 1.05, armadura: 15, color: 'red',
      esbirros: ['minecraft:blaze', 'cataclysm:ignited_berserker', 'minecraft:wither_skeleton'] }
  ],

  // Más monstruos en la superficie: cada "cada" segundos, junto a cada jugador al aire libre
  // aparecen "cantidad" monstruos a ~25 bloques, si cerca hay menos de "maximo".
  mobsSuperficie: {
    activa: true, cada: 20,
    dia:   { cantidad: 2, maximo: 6,  tipos: ['minecraft:husk', 'minecraft:spider', 'minecraft:creeper', 'minecraft:zombie'] },
    noche: { cantidad: 3, maximo: 12, tipos: ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider', 'minecraft:creeper', 'minecraft:witch'] }
  },

  // Élites y Capitanes de mazmorra rompen los bloques que les cierran el paso hacia su objetivo
  // (y el bloque bajo los pies de quien se suba a un pilar). Nunca en el spawn ni en las arenas.
  rompeBloques: { activa: true, noRompe: ['minecraft:bedrock', 'minecraft:obsidian', 'minecraft:crying_obsidian', 'minecraft:barrier',
    'minecraft:reinforced_deepslate', 'minecraft:spawner', 'minecraft:end_portal_frame', 'minecraft:chest', 'minecraft:lectern'] },

  // Esbirros: cada "cada" segundos, mientras viva un jefe semanal, aparecen "cantidad" monstruos
  // de su lista (esbirros) a su alrededor, hasta "maximo" a la vez. Si un ID no existe, sale un zombi.
  esbirros: { cada: 20, cantidad: 3, maximo: 10 },

  // Misión diaria: llevar TODO lo que pide al ATRIL del spawn y hacer clic derecho (se saca del inventario).
  // Una vez por día y jugador. Ver lo de hoy: /mision
  //  pide:   [ID del objeto (o #etiqueta), cantidad, nombre en español]
  //  premio: monedas · fragmentos (Fragmentos de Corazón) · fragiles (Corazones Frágiles) · vitales (Corazones Vitales)
  //          items: [[ID, cantidad], ...]
  // 'tener' = basta con tener lo que pide (puesto o en el inventario) y NO se gasta · 'entregar' = se lo quita
  // (cada misión puede cambiarlo con  entregar: true / false)
  misionesModo: 'tener',
  // Premio de tipo buff:  buff: ['minecraft:strength', 0, 'Fuerza I', 3]   -> efecto, nivel (0 = I), nombre, días que dura
  misionEquipo: { fragiles: 1 },
  // 2º buff para quien completa la misión del día: dura hasta que cambia el día. Se repite en este orden.
  // [efecto, nivel (0 = I), nombre en español]
  buffMision: [
    ['minecraft:haste', 0, 'Prisa minera I'],
    ['minecraft:speed', 0, 'Velocidad I'],
    ['minecraft:resistance', 0, 'Resistencia I'],
    ['minecraft:strength', 0, 'Fuerza I'],
    ['minecraft:night_vision', 0, 'Visión nocturna']
  ],   // si TODOS los vivos de un equipo completan la misión del día: premio extra a cada uno
  misiones: {
    1: { texto: 'Bien protegido', pide: [['@armadura:iron_', 4, 'armadura de hierro completa (puesta)']],
          premio: { monedas: 50, fragiles: 1 } },
    2: { texto: 'El herrero', pide: [['@armadura:iron_', 4, 'armadura de hierro completa (puesta)'], ['minecraft:iron_sword', 1, 'espada de hierro'], ['minecraft:iron_pickaxe', 1, 'pico de hierro']],
          premio: { monedas: 60, items: [['immersive_armors:warrior_helmet', 1, 'Casco de Guerrero']] } },
    3: { texto: 'El arquero', pide: [['@armadura:iron_', 4, 'armadura de hierro completa (puesta)'], ['minecraft:shield', 1, 'escudo'], ['minecraft:bow', 1, 'arco'], ['minecraft:arrow', 32, 'flechas']],
          premio: { monedas: 70, items: [['mowziesmobs:blowgun', 1, 'Cerbatana'], ['mowziesmobs:dart', 32, 'dardos']] } },
    4: { texto: 'Brillo azul', pide: [['minecraft:diamond_pickaxe', 1, 'pico de diamante']],
          premio: { monedas: 80, buff: ['minecraft:haste', 0, 'Prisa minera I', 2], items: [['immersive_armors:warrior_boots', 1, 'Botas de Guerrero']] } },
    5: { texto: 'Filo de diamante', pide: [['minecraft:diamond_sword', 1, 'espada de diamante']],
          premio: { monedas: 90, items: [['mowziesmobs:spear', 1, 'Lanza']] } },
    6: { texto: 'Preparados para el jefe', pide: [['@armadura:diamond_', 2, '2 piezas de diamante (puestas)'], ['minecraft:golden_apple', 2, 'manzanas doradas']],
          premio: { monedas: 100, fragiles: 2, buff: ['minecraft:strength', 0, 'Fuerza I', 1] } },
    7: { texto: 'Diamante completo', pide: [['@armadura:diamond_', 4, 'armadura de diamante completa (puesta)']],
          premio: { monedas: 120, fragmentos: 1, items: [['immersive_armors:warrior_chestplate', 1, 'Peto de Guerrero']] } },
    8: { texto: 'El arsenal de diamante', pide: [['@armadura:diamond_', 4, 'armadura de diamante completa (puesta)'], ['minecraft:diamond_sword', 1, 'espada de diamante'], ['minecraft:diamond_axe', 1, 'hacha de diamante']],
          premio: { monedas: 130, items: [['mowziesmobs:naga_fang_dagger', 1, 'Daga de Colmillo de Naga']] } },
    9: { texto: 'Listos para todo', pide: [['@armadura:diamond_', 4, 'armadura de diamante completa (puesta)'], ['minecraft:crossbow', 1, 'ballesta'], ['minecraft:potion{Potion:"minecraft:healing"}', 3, 'pociones de curación']],
          premio: { monedas: 140, buff: ['minecraft:resistance', 0, 'Resistencia I', 2], items: [['immersive_armors:warrior_leggings', 1, 'Grebas de Guerrero']] } },
    10: { texto: 'Del inframundo', pide: [['@armadura:netherite_', 1, 'una pieza de netherita (puesta)']],
          premio: { monedas: 150, items: [['immersive_armors:heavy_helmet', 1, 'Casco Pesado']] } },
    11: { texto: 'Filo negro', pide: [['minecraft:netherite_sword', 1, 'espada de netherita']],
          premio: { monedas: 160, items: [['mowziesmobs:earthrend_gauntlet', 1, 'Guantelete Desgarratierra']] } },
    12: { texto: 'Doble netherita', pide: [['@armadura:netherite_', 2, '2 piezas de netherita (puestas)']],
          premio: { monedas: 170, buff: ['minecraft:speed', 0, 'Velocidad I', 3], items: [['immersive_armors:heavy_chestplate', 1, 'Peto Pesado']] } },
    13: { texto: 'Ruge el invierno', pide: [['minecraft:potion{Potion:"minecraft:fire_resistance"}', 4, 'pociones de resistencia al fuego'], ['minecraft:golden_apple', 3, 'manzanas doradas']],
          premio: { monedas: 200, fragiles: 2, buffs: [['minecraft:strength', 0, 'Fuerza I', 1], ['minecraft:resistance', 0, 'Resistencia I', 1]] } },
    14: { texto: 'Casi invencible', pide: [['@armadura:netherite_', 3, '3 piezas de netherita (puestas)']],
          premio: { monedas: 200, items: [['mowziesmobs:wrought_axe', 1, 'Hacha de los Mil Metales']] } },
    15: { texto: 'Netherita completa', pide: [['@armadura:netherite_', 4, 'armadura de netherita completa (puesta)']],
          premio: { monedas: 220, fragmentos: 1, items: [['immersive_armors:heavy_leggings', 1, 'Grebas Pesadas']] } },
    16: { texto: 'Señor de los mares', pide: [['minecraft:trident', 1, 'tridente']],
          premio: { monedas: 230, buff: ['minecraft:haste', 1, 'Prisa minera II', 2], items: [['immersive_armors:heavy_boots', 1, 'Botas Pesadas']] } },
    17: { texto: 'El arsenal negro', pide: [['@armadura:netherite_', 4, 'armadura de netherita completa (puesta)'], ['minecraft:netherite_sword', 1, 'espada de netherita'], ['minecraft:netherite_axe', 1, 'hacha de netherita']],
          premio: { monedas: 250, items: [['immersive_armors:divine_helmet', 1, 'Casco Divino']] } },
    18: { texto: 'Cazador de wither', pide: [['minecraft:wither_skeleton_skull', 4, 'cráneos de esqueleto wither']],
          premio: { monedas: 270, items: [['immersive_armors:divine_chestplate', 1, 'Peto Divino']] } },
    19: { texto: 'Dos vidas', pide: [['minecraft:totem_of_undying', 2, 'tótems']],
          premio: { monedas: 300, items: [['cataclysm:gauntlet_of_guard', 1, 'Guantelete de Guardia']] } },
    20: { texto: 'Ofrenda al Inti', pide: [['minecraft:enchanted_golden_apple', 1, 'manzana dorada encantada']],
          premio: { monedas: 300, fragiles: 3, buff: ['minecraft:regeneration', 0, 'Regeneración I', 1] } },
    21: { texto: 'Domar la tormenta', pide: [['minecraft:creeper_head', 1, 'cabeza de creeper'], ['minecraft:lightning_rod', 16, 'pararrayos']],
          premio: { monedas: 320, items: [['cataclysm:ignitium_helmet', 1, 'Casco de Ignitium']] } },
    22: { texto: 'Tres vidas', pide: [['minecraft:totem_of_undying', 3, 'tótems']],
          premio: { monedas: 340, items: [['cataclysm:ignitium_boots', 1, 'Botas de Ignitium']] } },
    23: { texto: 'Fortaleza andante', pide: [['@armadura:netherite_', 4, 'armadura de netherita completa (puesta)'], ['minecraft:totem_of_undying', 2, 'tótems']],
          premio: { monedas: 360, items: [['cataclysm:meat_shredder', 1, 'El Triturador de Carne']] } },
    24: { texto: 'El banquete dorado', pide: [['minecraft:golden_carrot', 64, 'zanahorias doradas'], ['minecraft:golden_apple', 8, 'manzanas doradas']],
          premio: { monedas: 380, items: [['cataclysm:ignitium_leggings', 1, 'Grebas de Ignitium']] } },
    25: { texto: 'Fuego en la piel', pide: [['@armadura:ignitium_', 2, '2 piezas de Ignitium (puestas)']],
          premio: { monedas: 400, items: [['cataclysm:ignitium_chestplate', 1, 'Peto de Ignitium']] } },
    26: { texto: 'Hijo del fuego', pide: [['@armadura:ignitium_', 4, 'armadura de Ignitium completa (puesta)']],
          premio: { monedas: 450, items: [['cataclysm:the_incinerator', 1, 'El Incinerador']] } },
    27: { texto: 'Arena en el infierno', pide: [['@armadura:ignitium_', 4, 'armadura de Ignitium completa (puesta)'], ['minecraft:totem_of_undying', 2, 'tótems']],
          premio: { monedas: 500, vitales: 1, buff: ['minecraft:strength', 1, 'Fuerza II', 1] } },
    28: { texto: 'La batalla final', pide: [['@armadura:ignitium_', 4, 'armadura de Ignitium completa (puesta)'], ['cataclysm:the_incinerator', 1, 'El Incinerador']],
          premio: { monedas: 1000, vitales: 1, buffs: [['minecraft:strength', 1, 'Fuerza II', 1], ['minecraft:resistance', 1, 'Resistencia II', 1]] } }
  },



  // Animación de entrada: el jefe cae del cielo con estela de fuego y un impacto al tocar el suelo
  animacionJefes: { activa: true, altura: 35, segundosCaida: 3, cinematica: true },   // cinematica: todos ven la llegada del jefe en modo espectador

  // Entidades que NUNCA reciben los multiplicadores (jefes, para que no sean imposibles)
  sinMultiplicador: [
    'mowziesmobs:ferrous_wroughtnaut', 'mowziesmobs:frostmaw',
    'mowziesmobs:umvuthi', 'mowziesmobs:sculptor', 'minecraft:wither', 'minecraft:ender_dragon',
    'cataclysm:netherite_monstrosity', 'cataclysm:ignis', 'cataclysm:ender_guardian', 'cataclysm:the_harbinger',
    'cataclysm:the_leviathan', 'cataclysm:ancient_remnant', 'cataclysm:maledictus', 'cataclysm:scylla'
  ],

  // ----------------------------------------------------------
  //  ESCALAS: cada lista es [ [díaDesde, valor], ... ]
  //  Se usa el valor del último "díaDesde" alcanzado.
  // ----------------------------------------------------------
  escalas: {
    vidaJugador:        [[1, 20], [8, 18], [15, 16], [22, 14], [28, 12]],   // puntos (20 = 10 corazones)
    vidaMobs:           [[1, 1.0], [7, 1.2], [16, 1.5], [26, 2.0]],         // multiplicador
    dañoMobs:           [[1, 2.0], [5, 2.2], [12, 2.5], [24, 3.0]],         // multiplicador (x2 desde el día 1)
    creeperCargado:     [[1, 0], [3, 0.10], [9, 0.25], [23, 0.50]],         // probabilidad
    zombiArmaduraMalla: [[1, 0], [2, 0.20]],                                // probabilidad
    zombiArmaduraHierro:[[1, 0], [18, 0.40]],                               // probabilidad
    mobsResistencia:    [[1, 0], [25, 0.30]],                               // probabilidad
    probElite:          [[1, 0.03], [5, 0.05], [10, 0.08], [15, 0.11], [22, 0.15]],   // probabilidad de mini-jefe
    // Refuerzos: monstruos EXTRA que aparecen junto a cada monstruo natural (media). 1 = el doble de mobs.
    mobsExtra:          [[1, 0.3], [2, 0.4], [4, 0.6], [7, 0.8], [10, 1.0], [14, 1.3], [18, 1.6], [22, 2.0], [26, 2.5]]
  },

  // Reglas de activación única (desde ese día en adelante)
  desde: {
    arañaVeneno:         4,
    zombisRapidos:      10,
    esqueletosFuego:    11,
    hambreCada10Min:    17,
    sinQuemarseAlSol:    7,
    arañaCeguera:       19,
    sinRegeneracion:    21,
    mobsConFuerza:      28
  },

  // Anuncio del día: barra pequeña arriba ("DÍA N · Título") + descripción en el chat + voz
  anuncioDia: { barraSegundos: 20, voz: true },   // barraSegundos: 0 = la barra se queda todo el día
  prologoSegundos: 180,   // duración del prólogo narrado (generar_prologo.bat te dice cuánto dura)
  // Texto del prólogo (lo narra la voz y sale en subtítulos). Si cambias el texto, vuelve a generar el audio
  // con generar_prologo.bat: además crea kubejs/config/starvios_prologo.json con los tiempos exactos.
  prologoSubtitulos: true,
  prologoDesfase: 0,      // si los subtítulos van ADELANTADOS pon un número positivo (ej. 0.5); si van ATRASADOS, negativo
  prologo: [
    "Buenas tardes, viajeros. Mi nombre es Liz, y seré su voz en este valle. Estén donde estén… escuchen con atención.",
    "Lo que voy a contarles no está escrito en ningún libro. Pasó de boca en boca, de abuelos a nietos, en las noches más frías de los Andes.",
    "Es la leyenda de Starvios… el valle que el Sol olvidó.",
    "Hace mucho tiempo, Starvios era la tierra más fértil bajo la mirada del Inti, el Sol. Sus campos daban maíz y papa todo el año, y sus ríos bajaban limpios desde las cumbres.",
    "Los pueblos del valle tenían un pacto con el Sol: ellos le ofrecían su trabajo y su canto, y el Inti les regalaba calor, cosechas y días largos.",
    "Para cuidar ese pacto, el Sol dejó a sus guardianes más pequeños y sagrados: los Cuyes. Nadie se atrevía a tocarlos, porque hablaban en nombre del Inti.",
    "Pero la abundancia despertó la ambición. Cuatro señores del valle quisieron para sí el poder del Sol… y rompieron el pacto.",
    "El primero fue un caballero orgulloso, que encerró la fuerza del valle en su armadura. La armadura se cerró sobre él para siempre, y hoy lo llaman el Guardián de Hierro.",
    "El segundo fue una bestia de las cumbres, Frostmaw, que congeló los picos para que nadie pudiera escapar.",
    "El tercero, el chamán Umvuthi, trepó hasta el cielo y le arrancó un pedazo al Sol. Lo guarda en su pecho, y baila con él en su templo.",
    "Y el cuarto, el más terrible, Ignis, encendió una forja en las entrañas del inframundo. Con ella quiere apagar al Inti… y ocupar su lugar.",
    "Desde aquel día, el valle se pudre. Los muertos ya no descansan en sus criptas, los ejércitos de los Tiranos saquean cada rincón, y cada noche las bestias crecen un poco más.",
    "El Sol se debilita. Le quedan apenas veintiocho días de luz.",
    "Pero los ancianos guardaron una última profecía: cuando lleguen forasteros capaces de resistir veintiocho días y derribar a los cuatro Tiranos, el Inti volverá a brillar.",
    "Los Cuyes esperaron generaciones… hasta hoy. Porque esos forasteros… son ustedes.",
    "Yo los he traído hasta la última ciudad en pie. Aquí se guarda la luz que queda. Afuera, solo hay oscuridad.",
    "Recuerden bien: en Starvios, quien cae, no vuelve a levantarse. Cuiden su vida, cuiden a los suyos… y no confíen en la noche.",
    "Bienvenidos a Starvios, forasteros. Que el Sol los acompañe. La leyenda… comienza ahora."
  ],

  // Texto que se anuncia cada día (título + descripción). Edítalos a tu gusto.
  // No hace falta poner "Dia N," en el título: la barra ya muestra el número.
  anuncios: {
    1:  ['Mortalidad',             'Si mueres, quedas eliminado. Sin segundas oportunidades.'],
    2:  ['Zombis acorazados',      'Los zombis pueden aparecer con armadura de malla.'],
    3:  ['Tormenta estática',      'Algunos creepers aparecen cargados (10%).'],
    4:  ['Colmillos venenosos',    'Las arañas envenenan con cada mordida.'],
    5:  ['Furia',                  'Los mobs hostiles pegan aún más fuerte (x2,2).'],
    6:  ['Mordisquitos',           'Hoy despierta el Ferrous Wroughtnaut en la arena.'],
    7:  ['Piel Dura',              'Los mobs tienen un 20% más de vida y ya NO se queman al sol.'],
    8:  ['Cuerpo Frágil',          'Pierdes 1 corazón de vida máxima.'],
    9:  ['Sobrecarga',             'Un 25% de los creepers aparecen cargados.'],
    10: ['Hordas veloces',         'Los zombis se mueven más rápido.'],
    11: ['Flechas ardientes',      'Los esqueletos disparan flechas de fuego.'],
    12: ['Sed de sangre',          'Los mobs pegan x2,5.'],
    13: ['Ruge el invierno',       'Frostmaw ruge en la arena.'],
    14: ['Cazadores de élite',     'Los mini-jefes aparecen el doble. Más peligro, más recompensas.'],
    15: ['Debilidad',              'Pierdes otro corazón de vida máxima.'],
    16: ['Bestias',                'Los mobs tienen un 50% más de vida.'],
    17: ['Hambruna',               'Cada 10 minutos sufres hambre durante 30 segundos.'],
    18: ['Legión de hierro',       'Los zombis pueden llevar armadura de hierro.'],
    19: ['Oscuridad',              'Las arañas también ciegan.'],
    20: ['La Luz del Inti',        'Umvuthi invoca al sol en la arena.'],
    21: ['Heridas abiertas',       'La regeneración natural se desactiva.'],
    22: ['Al límite',              'Pierdes otro corazón de vida máxima.'],
    23: ['Apocalipsis eléctrico',  'La mitad de los creepers aparecen cargados.'],
    24: ['Carnicería',             'Los mobs pegan el triple (x3).'],
    25: ['Blindados',              'Un 30% de los mobs tienen Resistencia.'],
    26: ['Titanes',                'Los mobs tienen el doble de vida.'],
    27: ['Arena en el infierno',   'La Monstruosidad de Netherita despierta en la arena.'],
    28: ['La batalla final',       'Ignis desciende entre llamas. 6 corazones, mobs con Fuerza. Sobrevive.']
  }
};
