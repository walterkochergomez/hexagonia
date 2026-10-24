// Manuales en español (texto propio).
import type { ManualBook } from './types';

const book: ManualBook = {
  manuals: {
    base: {
      id: 'base',
      title: 'Juego base',
      summary: 'Colonizas una isla de hexágonos. Los dados deciden qué terrenos producen; con esos recursos construyes caminos, poblados y ciudades, y comercias con los demás. Gana quien llega primero a 10 puntos en su propio turno.',
      meta: ['3–4 jugadores (también 2)', '60–90 minutos', 'Meta: 10 puntos'],
      sections: [
        {
          id: 'idea',
          title: 'La idea',
          blocks: [
            { t: 'p', text: 'Cada partida arma una isla distinta con 19 terrenos. Cada terreno, salvo el desierto, lleva una ficha con un número del 2 al 12. Al comienzo de tu turno tiras dos dados: los terrenos con ese número producen para todos los poblados y ciudades que los tocan, sean de quien sean.' },
            { t: 'p', text: 'Con los recursos construyes. Cada poblado vale 1 punto y cada ciudad 2. Hay dos premios de 2 puntos (la ruta comercial más larga y el mayor ejército) y cartas que valen un punto.' },
            { t: 'fig', id: 'terrains', caption: 'Cinco terrenos producen un recurso cada uno. El desierto no produce.' },
          ],
        },
        {
          id: 'pieces',
          title: 'Terrenos, cartas y piezas',
          blocks: [
            { t: 'table', head: ['Terreno', 'Produce', 'En la isla'], rows: [
              ['Bosque', 'Madera', '4'],
              ['Colinas', 'Ladrillo', '3'],
              ['Pastos', 'Lana', '4'],
              ['Campos', 'Trigo', '4'],
              ['Montañas', 'Mineral', '3'],
              ['Desierto', 'Nada', '1'],
            ] },
            { t: 'p', text: 'Los números se reparten para que el 6 y el 8, que son los que más salen, nunca queden juntos. Los puntitos bajo cada número muestran cuán probable es: más puntitos, más seguido sale.' },
            { t: 'p', text: 'Cada jugador tiene 15 caminos, 5 poblados y 4 ciudades. Cuando una ciudad reemplaza a un poblado, el poblado vuelve a tu reserva. El banco tiene 19 cartas de cada recurso y 25 cartas de desarrollo.' },
            { t: 'p', text: 'Alrededor de la isla hay 9 puertos: 4 genéricos y uno para cada recurso.' },
          ],
        },
        {
          id: 'setup',
          title: 'Preparación',
          blocks: [
            { t: 'steps', items: [
              'Se sortea quién empieza.',
              'En orden, cada uno coloca un poblado en un cruce libre y un camino pegado a él.',
              'Luego en orden inverso (el último en colocar empieza) cada uno coloca su segundo poblado con su camino.',
              'El segundo poblado entrega una carta por cada terreno que toca. Después empieza el primer turno.',
            ] },
            { t: 'fig', id: 'setup', caption: 'Un poblado con su camino. Los tres cruces vecinos quedan prohibidos para cualquier edificio.' },
            { t: 'note', text: 'Busca números distintos y terrenos variados: el 6 y el 8 rinden mucho, pero si todo depende de un número, una mala racha te deja sin nada.' },
          ],
        },
        {
          id: 'turn',
          title: 'Tu turno',
          blocks: [
            { t: 'steps', items: [
              '**Tira los dados.** Todos cobran: cada poblado junto a un terreno con ese número recibe 1 carta de su recurso; cada ciudad, 2.',
              '**Comercia** con los demás jugadores o con el banco.',
              '**Construye** todo lo que puedas pagar.',
              '**Termina el turno.** Sigue el jugador de tu izquierda.',
            ] },
            { t: 'p', text: 'Después de tirar puedes comerciar y construir en el orden que quieras, y repetir. Puedes jugar una carta de desarrollo en cualquier momento de tu turno, también antes de tirar.' },
            { t: 'fig', id: 'production', caption: 'Sale 8: el poblado recibe 1 lana y la ciudad 2.' },
            { t: 'note', text: 'Si el banco no alcanza para todos los que deben recibir un recurso, nadie lo recibe. Si sólo un jugador debía recibirlo, se lleva lo que quede.' },
          ],
        },
        {
          id: 'seven',
          title: 'El siete y el ladrón',
          blocks: [
            { t: 'p', text: 'El 7 es el resultado más común y no produce nada. Cuando sale:' },
            { t: 'list', items: [
              'Quien tenga más de 7 cartas en la mano descarta la mitad, redondeando hacia abajo.',
              'Quien tiró mueve el ladrón a otro terreno.',
              'Luego le roba una carta al azar a un jugador con edificio junto a ese terreno.',
            ] },
            { t: 'p', text: 'Mientras el ladrón está en un terreno, ese terreno no produce. Al empezar, el ladrón está en el desierto.' },
            { t: 'fig', id: 'robber', caption: 'El ladrón bloquea el terreno y roba a uno de los dos vecinos.' },
          ],
        },
        {
          id: 'trade',
          title: 'Comercio',
          blocks: [
            { t: 'p', text: 'En tu turno puedes ofrecer cartas a todos o sólo a algunos. Cada uno acepta, rechaza o propone otro cambio; tú eliges con quién cierras el trato. Los demás no comercian entre sí, y no se regalan cartas.' },
            { t: 'p', text: 'Con el banco cambias 4 cartas iguales por 1 a elección. Con un poblado o ciudad en un puerto, el cambio mejora:' },
            { t: 'list', items: [
              '**Puerto 3:1**: 3 cartas iguales por 1.',
              '**Puerto 2:1**: 2 cartas del recurso del puerto por 1.',
            ] },
            { t: 'fig', id: 'harbors', caption: 'El poblado de arriba usa el puerto genérico; el de abajo cambia lana 2:1.' },
          ],
        },
        {
          id: 'build',
          title: 'Construir',
          blocks: [
            { t: 'costs', rows: [
              { icon: 'road', label: 'Camino', cost: { lumber: 1, brick: 1 }, note: 'Junto a otro camino, poblado o ciudad tuyos.' },
              { icon: 'settlement', label: 'Poblado', cost: { lumber: 1, brick: 1, wool: 1, grain: 1 }, note: 'Junto a un camino tuyo y respetando la distancia.' },
              { icon: 'city', label: 'Ciudad', cost: { grain: 2, ore: 3 }, note: 'Reemplaza a uno de tus poblados.' },
              { icon: 'dev', label: 'Carta de desarrollo', cost: { wool: 1, grain: 1, ore: 1 }, note: 'Se roba al azar.' },
            ] },
            { t: 'p', text: 'Regla de distancia: entre dos edificios siempre queda al menos un cruce libre, sin importar de quién sean. Un camino no puede seguir más allá de un cruce con un edificio rival.' },
            { t: 'fig', id: 'distance', caption: 'Los cruces marcados con ✕ están demasiado cerca. El poblado nuevo, dos tramos más allá, sí vale.' },
          ],
        },
        {
          id: 'dev',
          title: 'Cartas de desarrollo',
          blocks: [
            { t: 'p', text: 'Puedes jugar una por turno, nunca la que compraste en ese mismo turno. Las de punto quedan ocultas hasta que ganas.' },
            { t: 'devCards' },
          ],
        },
        {
          id: 'points',
          title: 'Puntos y premios',
          blocks: [
            { t: 'table', head: ['Qué', 'Puntos'], rows: [
              ['Poblado', '1'],
              ['Ciudad', '2'],
              ['Ruta comercial más larga', '2'],
              ['Mayor ejército', '2'],
              ['Carta de punto de victoria', '1'],
            ] },
            { t: 'p', text: '**Ruta comercial más larga**: la tiene el primero con 5 o más caminos seguidos. Para quitársela hay que superarlo. Un edificio rival en medio corta la ruta. Si a quien la tiene le cortan la ruta y quedan otros empatados en la más larga, el premio queda libre hasta que alguien la supere.' },
            { t: 'p', text: '**Mayor ejército**: lo tiene el primero en jugar 3 soldados. Para quitárselo hay que jugar más soldados que él.' },
            { t: 'fig', id: 'longest', caption: 'Esta ruta mide 6: se cuenta el tramo continuo más largo, sin repetir caminos.' },
          ],
        },
        {
          id: 'end',
          title: 'Fin de la partida',
          blocks: [
            { t: 'p', text: 'Gana quien tiene 10 puntos (o la meta elegida) durante su propio turno, contando sus cartas de punto. Si llegas a la meta en el turno de otro, ganas apenas empieza el tuyo.' },
            { t: 'p', text: 'Al terminar se ven los puntos de todos, las cartas que estaban ocultas y cuántas veces salió cada número.' },
          ],
        },
        {
          id: 'options',
          title: 'Opciones de la sala',
          blocks: [
            { t: 'list', items: [
              '**Ladrón amistoso**: el ladrón no puede ir a un terreno que toque a un jugador con 2 puntos visibles o menos.',
              '**Puntos para ganar**: entre 6 y 18. En automático se usa la meta de la versión.',
              'Con 2 jugadores se juega con las mismas reglas.',
            ] },
          ],
        },
        {
          id: 'ref',
          title: 'Resumen para tener a mano',
          blocks: [
            { t: 'steps', items: ['Tirar: todos cobran (con 7, descartes y ladrón).', 'Comerciar: jugadores, banco 4:1, puertos 3:1 y 2:1.', 'Construir y jugar una carta de desarrollo.', 'Terminar el turno.'] },
            { t: 'costs', rows: [
              { icon: 'road', label: 'Camino', cost: { lumber: 1, brick: 1 } },
              { icon: 'settlement', label: 'Poblado', cost: { lumber: 1, brick: 1, wool: 1, grain: 1 } },
              { icon: 'city', label: 'Ciudad', cost: { grain: 2, ore: 3 } },
              { icon: 'dev', label: 'Desarrollo', cost: { wool: 1, grain: 1, ore: 1 } },
            ] },
          ],
        },
      ],
    },

    big: {
      id: 'big',
      title: '5 y 6 jugadores',
      summary: 'Para mesas grandes: una isla de 30 terrenos, más cartas y una regla para que nadie espere de brazos cruzados.',
      meta: ['5–6 jugadores', '90–120 minutos', 'Meta: 10 puntos'],
      sections: [
        {
          id: 'changes',
          title: 'Qué cambia',
          blocks: [
            { t: 'p', text: 'Se juega con las reglas del juego base y estos cambios:' },
            { t: 'list', items: [
              'Isla de 30 terrenos: 6 bosques, 6 pastos, 6 campos, 5 colinas, 5 montañas y 2 desiertos.',
              '28 fichas de número y 11 puertos (5 genéricos y 6 de recurso, dos de ellos de lana).',
              'El banco tiene 24 cartas de cada recurso.',
              '34 cartas de desarrollo: 20 soldados, 5 de punto y 3 de cada una de las demás.',
              'El ladrón empieza en uno de los desiertos.',
            ] },
            { t: 'p', text: 'Para que la espera entre turnos no sea larga, la sala elige una de estas dos reglas.' },
          ],
        },
        {
          id: 'special',
          title: 'Fase especial de construcción',
          blocks: [
            { t: 'p', text: 'Cuando el jugador del turno termina, los demás, uno por uno y en orden, pueden construir y comprar cartas de desarrollo con lo que tengan en la mano. En esa fase no se comercia (ni con el banco) y no se juegan cartas. Cada uno pasa cuando quiere.' },
            { t: 'note', text: 'Es la mejor forma de gastar cartas antes de que un 7 en el turno de otro te obligue a descartar.' },
          ],
        },
        {
          id: 'paired',
          title: 'Turno en pareja',
          blocks: [
            { t: 'p', text: 'En cada turno juegan dos personas. Primero el jugador del turno, completo. Después, el que está tres lugares más allá en la mesa juega su parte: no tira los dados ni comercia con jugadores, pero puede construir, comerciar con el banco y jugar una carta de desarrollo.' },
            { t: 'p', text: 'Cualquiera de los dos puede ganar en ese turno. Así cada jugador juega dos veces por vuelta: en su propio turno y acompañando a otro.' },
          ],
        },
      ],
    },

    sea: {
      id: 'sea',
      title: 'Mar Abierto',
      summary: 'La isla deja de estar sola: hay mar navegable, barcos, islas por descubrir, campos de oro y un pirata. Cinco escenarios con un mapa nuevo en cada partida.',
      meta: ['3–6 jugadores', '90–120 minutos', 'Meta: 12 o 13 puntos'],
      sections: [
        {
          id: 'changes',
          title: 'Qué cambia',
          blocks: [
            { t: 'p', text: 'Se juega con las reglas del juego base. El mapa trae varias islas y mucho mar; por el mar se avanza con barcos. Llegar primero a una isla nueva da puntos extra, y los campos de oro dejan elegir qué recurso cobrar.' },
            { t: 'fig', id: 'ships', caption: 'Del poblado en la costa sale una cadena de barcos que cruza hasta otra isla.' },
          ],
        },
        {
          id: 'ships',
          title: 'Barcos',
          blocks: [
            { t: 'costs', rows: [
              { icon: 'ship', label: 'Barco', cost: { lumber: 1, wool: 1 }, note: 'En un lado con mar, unido a tu edificio de la costa o a otro barco tuyo.' },
            ] },
            { t: 'list', items: [
              'Un barco va en el lado entre dos hexágonos, al menos uno de ellos de mar.',
              'Una cadena de barcos sale de un poblado o ciudad tuyo en la costa, o sigue a un barco tuyo.',
              'Caminos y barcos sólo se unen en un edificio: para pasar de camino a barco necesitas un poblado o ciudad en la costa.',
              'Al final de una cadena de barcos puedes fundar un poblado, igual que al final de un camino.',
              'Cada jugador tiene 15 barcos.',
            ] },
          ],
        },
        {
          id: 'moving',
          title: 'Mover barcos',
          blocks: [
            { t: 'p', text: 'Una vez por turno puedes mover un barco que esté en el extremo de una ruta abierta, es decir, una ruta que no termina en un edificio tuyo. Lo pones en cualquier lugar donde podrías construir un barco.' },
            { t: 'p', text: 'No se mueve el barco construido en ese mismo turno ni uno que toque al pirata.' },
            { t: 'fig', id: 'shipMove', caption: 'El barco del extremo deja su lugar y sigue la ruta hacia otra costa.' },
          ],
        },
        {
          id: 'pirate',
          title: 'El pirata',
          blocks: [
            { t: 'p', text: 'Con un 7 o un soldado eliges: mover el ladrón (en tierra) o el pirata (en el mar). El pirata roba una carta a un jugador que tenga un barco junto a su hexágono.' },
            { t: 'p', text: 'Mientras está ahí, nadie construye ni mueve barcos en los lados de ese hexágono.' },
            { t: 'fig', id: 'pirate', caption: 'El pirata bloquea los seis lados de su hexágono.' },
          ],
        },
        {
          id: 'gold',
          title: 'Campos de oro',
          blocks: [
            { t: 'p', text: 'Un campo de oro no tiene recurso propio: cuando sale su número, cada poblado junto a él elige 1 recurso del banco y cada ciudad, 2. En la preparación, el segundo poblado también elige uno por cada campo de oro que toca.' },
            { t: 'fig', id: 'gold', caption: 'Sale 9: el poblado elige el recurso que quiera.' },
          ],
        },
        {
          id: 'islands',
          title: 'Islas nuevas',
          blocks: [
            { t: 'p', text: 'El primer poblado que fundas en una isla o zona distinta de donde empezaste te da puntos extra: 2 en casi todos los escenarios. Cada isla da el bono una sola vez a cada jugador, y lo puede ganar más de un jugador.' },
          ],
        },
        {
          id: 'fog',
          title: 'Niebla',
          blocks: [
            { t: 'p', text: 'En el escenario Mar de niebla, fuera de tu isla todo está tapado. Cuando un camino o barco tuyo llega junto a un hexágono con niebla, se descubre. Si es un terreno, recibes una carta de su recurso (en oro, eliges). Si es mar, puedes seguir navegando.' },
            { t: 'fig', id: 'fog', caption: 'El barco llega a la niebla y descubre un bosque: +1 madera.' },
          ],
        },
        {
          id: 'route',
          title: 'Ruta comercial',
          blocks: [
            { t: 'p', text: 'La ruta comercial más larga cuenta caminos y barcos juntos, siempre que el paso de camino a barco ocurra en un edificio tuyo. La carta Construcción de caminos permite poner barcos en vez de caminos.' },
          ],
        },
        {
          id: 'scenarios',
          title: 'Escenarios',
          blocks: [
            { t: 'p', text: 'Los mapas se generan al empezar, así que ninguna partida se repite. Cada escenario fija cómo es el mar, dónde se empieza y cuántos puntos se necesitan.' },
            { t: 'h3', text: 'Islas exteriores' },
            { t: 'p', text: 'Una isla grande y varias islitas alrededor. Todos empiezan en la isla grande; cada islita da 2 puntos extra a quien llega. Meta: 13.' },
            { t: 'h3', text: 'Archipiélago' },
            { t: 'p', text: 'Cuatro a seis islas medianas. Cada uno elige dónde empezar. Fundar en una isla donde no tenías edificios al terminar la preparación da 2 puntos. Meta: 12.' },
            { t: 'h3', text: 'Mar de niebla' },
            { t: 'p', text: 'Una isla de inicio rodeada de niebla. Las islas escondidas no dan puntos extra, pero descubrir terrenos da recursos. Meta: 12.' },
            { t: 'h3', text: 'Tras el desierto' },
            { t: 'p', text: 'Una franja de desierto separa la zona de inicio de una zona lejana; también hay islitas. Llegar a la zona lejana o a una islita da 2 puntos. En los campos de oro nunca hay un 6 ni un 8. Meta: 12.' },
            { t: 'h3', text: 'Islas al azar' },
            { t: 'p', text: 'Entre 3 y 6 islas de tamaños al azar. Se empieza donde se quiera, y las islas donde no empezaste dan 2 puntos. Meta: 12.' },
          ],
        },
      ],
    },

    guilds: {
      id: 'guilds',
      title: 'Gremios y Guardianes',
      summary: 'Las ciudades crecen: producen mercancías, se mejoran en tres ramas y fundan metrópolis. A cambio, cada tanto llegan los bárbaros por mar y la isla se defiende con caballeros.',
      meta: ['3–6 jugadores', '2 horas', 'Meta: 13 puntos'],
      sections: [
        {
          id: 'changes',
          title: 'Qué cambia',
          blocks: [
            { t: 'p', text: 'Se juega con las reglas del juego base y estos cambios:' },
            { t: 'list', items: [
              'La segunda colocación de la preparación es una ciudad.',
              'No hay cartas de desarrollo ni mayor ejército. En su lugar hay 54 cartas de progreso en tres mazos.',
              'Además de los dos dados de producción (uno rojo) se tira el dado de eventos.',
              'El ladrón no entra al tablero hasta el primer ataque bárbaro.',
              'Meta: 13 puntos.',
            ] },
          ],
        },
        {
          id: 'commodities',
          title: 'Mercancías',
          blocks: [
            { t: 'p', text: 'Una ciudad en bosque recibe 1 madera y 1 papel; en pastos, 1 lana y 1 tela; en montañas, 1 mineral y 1 moneda. En colinas y campos sigue recibiendo 2 del recurso.' },
            { t: 'fig', id: 'commodities', caption: 'Las tres mercancías y el terreno que las da.' },
            { t: 'p', text: 'Las mercancías son cartas de la mano: cuentan para el 7, se pueden robar y se cambian con el banco 4:1 o en un puerto genérico 3:1.' },
          ],
        },
        {
          id: 'improve',
          title: 'Mejoras de ciudad',
          blocks: [
            { t: 'p', text: 'Hay tres ramas: ciencia (se paga con papel), comercio (tela) y política (moneda). Subir al nivel n de una rama cuesta n mercancías de esa rama, hasta el nivel 5. Necesitas tener al menos una ciudad.' },
            { t: 'table', head: ['Rama', 'Se paga con', 'Al llegar al nivel 3'], rows: [
              ['Ciencia', 'Papel', 'Acueducto: si una tirada no te da nada, eliges un recurso.'],
              ['Comercio', 'Tela', 'Casa de comercio: cambias mercancías 2:1 con el banco.'],
              ['Política', 'Moneda', 'Fortaleza: puedes ascender caballeros a nivel 3.'],
            ] },
            { t: 'p', text: '**Metrópolis**: el primero en llegar al nivel 4 de una rama convierte una de sus ciudades en metrópolis. Vale 2 puntos más y los bárbaros no la saquean. Si otro llega al nivel 5 antes que él, se la lleva. Hay una metrópolis por rama y una ciudad no puede tener dos.' },
            { t: 'note', text: 'Para subir al nivel 4 o 5 necesitas una ciudad sin metrópolis, salvo que ya tengas la metrópolis de esa rama.' },
          ],
        },
        {
          id: 'event',
          title: 'El dado de eventos',
          blocks: [
            { t: 'p', text: 'El evento se resuelve antes de la producción:' },
            { t: 'list', items: [
              '**Barco** (tres caras): el barco bárbaro avanza un paso. Cuando llega al séptimo, atacan.',
              '**Puerta de ciencia, comercio o política**: cada jugador con nivel 1 o más en esa rama roba una carta de progreso de ese color si el dado rojo es menor o igual a su nivel más 1. Empieza el jugador del turno.',
            ] },
          ],
        },
        {
          id: 'progress',
          title: 'Cartas de progreso',
          blocks: [
            { t: 'p', text: 'Se juegan en tu turno después de tirar (el Alquimista, antes de tirar), tantas como quieras. Puedes tener 4 en la mano: si recibes una quinta fuera de tu turno descartas de inmediato; en tu turno, al terminarlo. Las de punto se ponen a la vista apenas se roban.' },
            { t: 'h3', text: 'Ciencia' },
            { t: 'progressCards', track: 'science' },
            { t: 'h3', text: 'Comercio' },
            { t: 'progressCards', track: 'trade' },
            { t: 'h3', text: 'Política' },
            { t: 'progressCards', track: 'politics' },
          ],
        },
        {
          id: 'barbarians',
          title: 'Los bárbaros',
          blocks: [
            { t: 'fig', id: 'barbarians', caption: 'El barco avanza con cada cara de barco; en el paso 7 desembarca.' },
            { t: 'list', items: [
              '**Fuerza bárbara**: una por cada ciudad en la isla, metrópolis incluidas.',
              '**Defensa**: la suma de los niveles de todos los caballeros activos.',
              'Si la defensa es igual o mayor, ganan los defensores. Quien más aportó recibe un punto de defensor; si hay empate, cada empatado roba una carta de progreso del mazo que elija.',
              'Si ganan los bárbaros, quien aportó menos entre los que tienen ciudades que no son metrópolis pierde una ciudad: vuelve a ser poblado. Si no le quedan poblados en la reserva, la ciudad queda dañada: vale como poblado y hay que repararla (al costo de una ciudad) antes de fundar poblados nuevos.',
              'Después del ataque todos los caballeros quedan inactivos y el barco vuelve al inicio. Tras el primer ataque, el ladrón entra al tablero.',
            ] },
          ],
        },
        {
          id: 'knights',
          title: 'Caballeros',
          blocks: [
            { t: 'costs', rows: [
              { icon: 'knight', label: 'Reclutar', cost: { wool: 1, ore: 1 }, note: 'En un cruce libre junto a tus caminos. Empieza inactivo.' },
              { icon: 'activate', label: 'Activar', cost: { grain: 1 } },
              { icon: 'promote', label: 'Ascender', cost: { wool: 1, ore: 1 }, note: 'Del nivel 2 al 3, sólo con política 3.' },
            ] },
            { t: 'p', text: 'Cada jugador tiene dos caballeros de cada nivel. Un caballero activo puede, una vez por turno y no en el turno en que se activó:' },
            { t: 'list', items: [
              'moverse por tus caminos a un cruce libre;',
              'desplazar a un caballero rival de nivel menor: el rival lo mueve a otro cruce libre de su red, o vuelve a la reserva si no hay;',
              'ahuyentar al ladrón de un terreno que toque, moviéndolo como con un 7.',
            ] },
            { t: 'p', text: 'Después de actuar queda inactivo. Los caballeros cortan las rutas rivales y nadie construye en su cruce. Un caballero no asciende dos veces en el mismo turno.' },
            { t: 'fig', id: 'knights', caption: 'Caballeros de nivel 1, 2 y 3. El de la izquierda está inactivo.' },
          ],
        },
        {
          id: 'walls',
          title: 'Murallas',
          blocks: [
            { t: 'costs', rows: [{ icon: 'wall', label: 'Muralla', cost: { brick: 2 }, note: 'En una de tus ciudades.' }] },
            { t: 'p', text: 'Cada muralla sube en 2 tu límite de mano para el 7. Hay 3 por jugador. Si la ciudad es saqueada, la muralla se pierde.' },
          ],
        },
        {
          id: 'points',
          title: 'Puntos',
          blocks: [
            { t: 'table', head: ['Qué', 'Puntos'], rows: [
              ['Poblado', '1'],
              ['Ciudad', '2'],
              ['Metrópolis', '+2'],
              ['Ruta comercial más larga', '2'],
              ['Defensor de la isla', '1 cada uno'],
              ['Imprenta, Constitución', '1 cada una'],
              ['Mercader', '1'],
            ] },
          ],
        },
        {
          id: 'ref',
          title: 'Resumen para tener a mano',
          blocks: [
            { t: 'steps', items: ['Tirar los tres dados: primero el evento, después la producción.', 'Comerciar y construir; jugar cartas de progreso; usar caballeros.', 'Terminar el turno (con más de 4 cartas de progreso, descartar).'] },
            { t: 'costs', rows: [
              { icon: 'road', label: 'Camino', cost: { lumber: 1, brick: 1 } },
              { icon: 'settlement', label: 'Poblado', cost: { lumber: 1, brick: 1, wool: 1, grain: 1 } },
              { icon: 'city', label: 'Ciudad', cost: { grain: 2, ore: 3 } },
              { icon: 'wall', label: 'Muralla', cost: { brick: 2 } },
              { icon: 'knight', label: 'Caballero', cost: { wool: 1, ore: 1 } },
              { icon: 'activate', label: 'Activar', cost: { grain: 1 } },
              { icon: 'promote', label: 'Ascender', cost: { wool: 1, ore: 1 } },
            ] },
          ],
        },
      ],
    },

    combo: {
      id: 'combo',
      title: 'Mar Abierto con Gremios',
      summary: 'Las dos expansiones juntas: barcos y caballeros, oro y mercancías, pirata y bárbaros.',
      meta: ['3–6 jugadores', '2 a 3 horas', 'Meta: la del escenario + 2'],
      sections: [
        {
          id: 'rules',
          title: 'Cómo se combinan',
          blocks: [
            { t: 'p', text: 'Se usan todas las reglas de Mar Abierto y de Gremios y Guardianes, con estos ajustes:' },
            { t: 'list', items: [
              'La meta del escenario sube 2 puntos (por ejemplo, Islas exteriores: 15).',
              'Los caballeros también se mueven por tus barcos y pueden ahuyentar al pirata desde un cruce junto a su hexágono.',
              'Un campo de oro da sólo recursos, también a las ciudades: una ciudad elige 2.',
              'El mercader no puede ir en un campo de oro.',
              'Antes del primer ataque bárbaro, un 7 no mueve ni el ladrón ni el pirata.',
              'La Cuadrilla de caminos permite barcos; el Diplomático sólo quita caminos.',
              'Un caballero propio en el extremo de una ruta de barcos la cierra: ese barco ya no se puede mover.',
            ] },
          ],
        },
      ],
    },

    shires: {
      id: 'shires',
      title: 'Comarcas',
      summary: 'Variantes para la isla base que se suman a cualquier partida: puertos que dan prestigio, un mazo de sucesos en vez de dados y reglas para jugar de a dos.',
      meta: ['2–6 jugadores', '60–90 minutos', 'Meta: 10, o 11 con el señor de los muelles'],
      sections: [
        {
          id: 'about',
          title: 'Qué trae',
          blocks: [
            { t: 'p', text: 'Comarcas reúne reglas que se agregan al juego base. Se activan en la sala, en **Variantes**, y se combinan entre sí. El señor de los muelles funciona también con Mar Abierto y con Gremios.' },
          ],
        },
        {
          id: 'harbor',
          title: 'Señor de los muelles',
          blocks: [
            { t: 'list', items: [
              'Un poblado junto a un puerto vale 1 punto de puerto; una ciudad, 2. Un edificio cuenta una vez aunque toque dos puertos.',
              'El primero en llegar a 3 puntos de puerto es señor de los muelles y gana 2 puntos de victoria.',
              'Para quitárselo hay que tener más puntos de puerto que él.',
              'La meta sube 1 punto: 11 en la isla base.',
            ] },
            { t: 'fig', id: 'harbors', caption: 'Dos poblados en puertos: 2 puntos de puerto. Con una ciudad en cualquiera de los dos, llegan a 3.' },
          ],
        },
        {
          id: 'chronicle',
          title: 'Mazo de sucesos',
          blocks: [
            { t: 'p', text: 'En vez de tirar los dados, quien juega saca una carta. Hay 36 cartas con los números en la misma proporción que dos dados (un 2, dos 3, y así hasta seis 7), de modo que en cada vuelta del mazo cada número sale las veces que le toca.' },
            { t: 'p', text: 'La carta de año nuevo está escondida 5 cartas antes del fondo: cuando sale se baraja todo y se saca otra. Así nadie puede contar las que quedan.' },
            { t: 'fig', id: 'chronicle', caption: 'Algunas cartas traen un suceso en la franja de abajo. Los 7 son rojos.' },
            { t: 'p', text: 'Veinte cartas traen un suceso, que se resuelve antes de la producción:' },
            { t: 'table', head: ['Suceso', 'Número', 'Qué pasa'], rows: [
              ['Año de cosecha', '2', 'Cada jugador elige un recurso del banco.'],
              ['Riña', '3', 'Quien jugó más soldados, si no hay empate, le roba una carta a quien quiera.'],
              ['El ladrón se esconde', '4 (dos cartas)', 'El ladrón vuelve al desierto.'],
              ['Torneo', '5', 'Quienes jugaron más soldados eligen un recurso cada uno.'],
              ['Viento a favor', '5', 'Quien tiene la ruta comercial más larga le roba una carta a quien quiera.'],
              ['Temblor', '6', 'Cada uno daña uno de sus caminos: no cuenta para la ruta y no se construyen caminos nuevos hasta repararlo (madera y ladrillo).'],
              ['Buenos vecinos', '6', 'Cada uno regala un recurso al jugador siguiente.'],
              ['Peste', '6 y 8', 'En esta producción las ciudades dan como poblados.'],
              ['El ladrón ataca', '7 (seis cartas)', 'Un 7 de siempre: descartes, ladrón y robo.'],
              ['Mar en calma', '9 y 12', 'Quienes tienen edificios en más puertos eligen un recurso cada uno.'],
              ['Ayuda vecinal', '10 y 11', 'Quien va primero en puntos regala un recurso a alguien con menos.'],
            ] },
            { t: 'note', text: 'No se combina con Gremios y Guardianes, que necesita sus tres dados.' },
          ],
        },
        {
          id: 'duel',
          title: 'Duelo (2 jugadores)',
          blocks: [
            { t: 'p', text: 'Para partidas de a dos en la isla base. Se suman dos colores neutrales que no juegan: ocupan lugar, cortan caminos y hacen que la isla se llene como en una mesa de cuatro.' },
            { t: 'list', items: [
              '**Neutrales**: al empezar, cada uno recibe dos poblados con su camino en lugares al azar. No producen, no tienen cartas y no ganan premios.',
              'Cada vez que construyes un camino, construyes otro para un neutral, donde quieras, unido a su red. Cada vez que fundas un poblado, fundas uno para un neutral; si no hay lugar, le das un camino.',
              '**Dos tiradas**: en cada turno se tira dos veces y las dos producen. La segunda tiene que dar un número distinto de la primera.',
              '**Fichas de comercio**: cada uno empieza con 5 (hay 20 en total). Una vez por turno puedes usarlas para un **cambio forzado** (tomas 2 cartas al azar del rival y le devuelves 2 a elección) o para mandar el **ladrón al desierto**. Cuesta 1 ficha si vas igual o atrás en puntos y 2 si vas adelante.',
              'Las fichas se ganan fundando poblados: 1 en la costa, 2 junto al desierto, 3 si cumple ambas. También puedes devolver un soldado jugado a cambio de 2 fichas.',
            ] },
          ],
        },
      ],
    },
  },

  app: [
    {
      id: 'online',
      title: 'Jugar en línea',
      blocks: [
        { t: 'steps', items: [
          'Escribe tu nombre y toca **Crear sala**. La partida corre en tu navegador: conviene usar un computador y dejar la pestaña abierta.',
          'Toca **Copiar link** y mándalo. Quien lo abre escribe su nombre y aparece en la sala.',
          'Elige versión y ajustes, añade bots si faltan jugadores y toca **Iniciar partida**.',
        ] },
        { t: 'p', text: 'Si alguien pierde la conexión, vuelve a abrir el mismo link y recupera su lugar. Si el anfitrión cierra la pestaña, la partida queda guardada en su navegador y al volver aparece **Continuar sala** con el mismo código.' },
      ],
    },
    {
      id: 'local',
      title: 'En un solo dispositivo',
      blocks: [
        { t: 'p', text: 'En **Jugar en este dispositivo** se pasa el teléfono o el computador de mano en mano: antes de cada turno aparece una pantalla para que nadie vea la mano de otro. También se puede jugar contra bots.' },
      ],
    },
  ],
};

export default book;
