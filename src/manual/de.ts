// Spielanleitungen auf Deutsch (eigener Text).
import type { ManualBook } from './types';

const book: ManualBook = {
  manuals: {
    base: {
      id: 'base',
      title: 'Grundspiel',
      summary: 'Ihr besiedelt eine Insel aus Sechsecken. Die Würfel bestimmen, welche Felder Rohstoffe liefern; damit baust du Straßen, Siedlungen und Städte und handelst mit den anderen. Wer im eigenen Zug als Erste:r 10 Punkte hat, gewinnt.',
      meta: ['3–4 Personen (auch 2)', '60–90 Minuten', 'Ziel: 10 Punkte'],
      sections: [
        {
          id: 'idea',
          title: 'Worum es geht',
          blocks: [
            { t: 'p', text: 'Jede Partie baut eine neue Insel aus 19 Feldern. Jedes Feld außer der Wüste trägt eine Zahl von 2 bis 12. Zu Beginn deines Zuges würfelst du mit zwei Würfeln: Alle Felder mit dieser Zahl liefern an alle Siedlungen und Städte, die daran grenzen, egal wem sie gehören.' },
            { t: 'p', text: 'Mit den Rohstoffen baust du. Jede Siedlung zählt 1 Punkt, jede Stadt 2. Dazu gibt es zwei Sonderkarten zu je 2 Punkten (längste Handelsstraße und größte Rittermacht) und Karten, die einen Punkt wert sind.' },
            { t: 'fig', id: 'terrains', caption: 'Fünf Landschaften liefern je einen Rohstoff. Die Wüste liefert nichts.' },
          ],
        },
        {
          id: 'pieces',
          title: 'Felder, Karten und Figuren',
          blocks: [
            { t: 'table', head: ['Feld', 'Liefert', 'Auf der Insel'], rows: [
              ['Wald', 'Holz', '4'],
              ['Hügel', 'Lehm', '3'],
              ['Weide', 'Wolle', '4'],
              ['Acker', 'Getreide', '4'],
              ['Gebirge', 'Erz', '3'],
              ['Wüste', 'Nichts', '1'],
            ] },
            { t: 'p', text: 'Die Zahlen werden so verteilt, dass 6 und 8, die am häufigsten fallen, nie nebeneinander liegen. Die Punkte unter jeder Zahl zeigen, wie wahrscheinlich sie ist: mehr Punkte, häufiger.' },
            { t: 'p', text: 'Jede Person hat 15 Straßen, 5 Siedlungen und 4 Städte. Ersetzt eine Stadt eine Siedlung, geht die Siedlung in deinen Vorrat zurück. Die Bank hat 19 Karten jedes Rohstoffs und 25 Entwicklungskarten.' },
            { t: 'p', text: 'Rund um die Insel liegen 9 Häfen: 4 allgemeine und je einer pro Rohstoff.' },
          ],
        },
        {
          id: 'setup',
          title: 'Aufbau',
          blocks: [
            { t: 'steps', items: [
              'Es wird ausgelost, wer beginnt.',
              'Reihum setzt jede Person eine Siedlung auf eine freie Kreuzung und eine Straße direkt daneben.',
              'Danach in umgekehrter Reihenfolge (wer zuletzt gesetzt hat, beginnt) die zweite Siedlung mit Straße.',
              'Die zweite Siedlung bringt eine Karte pro angrenzendem Feld. Dann beginnt der erste Zug.',
            ] },
            { t: 'fig', id: 'setup', caption: 'Eine Siedlung mit Straße. Die drei Nachbarkreuzungen sind für alle Gebäude gesperrt.' },
            { t: 'note', text: 'Achte auf verschiedene Zahlen und Rohstoffe: 6 und 8 bringen viel, aber wenn alles an einer Zahl hängt, lässt dich eine Pechsträhne leer ausgehen.' },
          ],
        },
        {
          id: 'turn',
          title: 'Dein Zug',
          blocks: [
            { t: 'steps', items: [
              '**Würfeln.** Alle kassieren: Jede Siedlung an einem Feld mit dieser Zahl bekommt 1 Karte dieses Rohstoffs, jede Stadt 2.',
              '**Handeln** mit den anderen oder mit der Bank.',
              '**Bauen**, was du bezahlen kannst.',
              '**Zug beenden.** Die Person links von dir ist dran.',
            ] },
            { t: 'p', text: 'Nach dem Würfeln darfst du Handeln und Bauen beliebig mischen. Eine Entwicklungskarte darfst du jederzeit in deinem Zug spielen, auch vor dem Würfeln.' },
            { t: 'fig', id: 'production', caption: 'Es fällt eine 8: Die Siedlung bekommt 1 Wolle, die Stadt 2.' },
            { t: 'note', text: 'Reicht die Bank nicht für alle, die einen Rohstoff bekommen müssten, bekommt ihn niemand. Müsste nur eine Person ihn bekommen, erhält sie den Rest.' },
          ],
        },
        {
          id: 'seven',
          title: 'Die Sieben und der Räuber',
          blocks: [
            { t: 'p', text: 'Die 7 fällt am häufigsten und bringt keine Rohstoffe. Stattdessen:' },
            { t: 'list', items: [
              'Wer mehr als 7 Karten auf der Hand hat, wirft die Hälfte ab (abgerundet).',
              'Wer gewürfelt hat, versetzt den Räuber auf ein anderes Feld.',
              'Dann zieht er oder sie eine zufällige Karte bei einer Person mit Gebäude an diesem Feld.',
            ] },
            { t: 'p', text: 'Solange der Räuber auf einem Feld steht, liefert es nichts. Zu Beginn steht er in der Wüste.' },
            { t: 'fig', id: 'robber', caption: 'Der Räuber blockiert das Feld und bestiehlt einen der beiden Nachbarn.' },
          ],
        },
        {
          id: 'trade',
          title: 'Handel',
          blocks: [
            { t: 'p', text: 'In deinem Zug darfst du allen oder nur einigen Karten anbieten. Jede Person nimmt an, lehnt ab oder macht ein Gegenangebot; du entscheidest, mit wem du tauschst. Die anderen handeln nicht untereinander, und verschenkt wird nichts.' },
            { t: 'p', text: 'Mit der Bank tauschst du 4 gleiche Karten gegen 1 beliebige. Mit einer Siedlung oder Stadt an einem Hafen wird es günstiger:' },
            { t: 'list', items: [
              '**Hafen 3:1**: 3 gleiche Karten gegen 1.',
              '**Hafen 2:1**: 2 Karten des Hafen-Rohstoffs gegen 1.',
            ] },
            { t: 'fig', id: 'harbors', caption: 'Die obere Siedlung nutzt den allgemeinen Hafen, die untere tauscht Wolle 2:1.' },
          ],
        },
        {
          id: 'build',
          title: 'Bauen',
          blocks: [
            { t: 'costs', rows: [
              { icon: 'road', label: 'Straße', cost: { lumber: 1, brick: 1 }, note: 'An eine eigene Straße, Siedlung oder Stadt.' },
              { icon: 'settlement', label: 'Siedlung', cost: { lumber: 1, brick: 1, wool: 1, grain: 1 }, note: 'An eine eigene Straße, mit Abstand.' },
              { icon: 'city', label: 'Stadt', cost: { grain: 2, ore: 3 }, note: 'Ersetzt eine deiner Siedlungen.' },
              { icon: 'dev', label: 'Entwicklungskarte', cost: { wool: 1, grain: 1, ore: 1 }, note: 'Wird zufällig gezogen.' },
            ] },
            { t: 'p', text: 'Abstandsregel: Zwischen zwei Gebäuden bleibt immer mindestens eine Kreuzung frei, egal wem sie gehören. Eine Straße führt nicht über eine Kreuzung mit fremdem Gebäude hinaus.' },
            { t: 'fig', id: 'distance', caption: 'Die mit ✕ markierten Kreuzungen sind zu nah. Die neue Siedlung zwei Abschnitte weiter ist erlaubt.' },
          ],
        },
        {
          id: 'dev',
          title: 'Entwicklungskarten',
          blocks: [
            { t: 'p', text: 'Du darfst eine pro Zug spielen, nie die im selben Zug gekaufte. Siegpunktkarten bleiben verdeckt, bis du gewinnst.' },
            { t: 'devCards' },
          ],
        },
        {
          id: 'points',
          title: 'Punkte und Sonderkarten',
          blocks: [
            { t: 'table', head: ['Was', 'Punkte'], rows: [
              ['Siedlung', '1'],
              ['Stadt', '2'],
              ['Längste Handelsstraße', '2'],
              ['Größte Rittermacht', '2'],
              ['Siegpunktkarte', '1'],
            ] },
            { t: 'p', text: '**Längste Handelsstraße**: bekommt, wer als Erste:r 5 oder mehr zusammenhängende Straßen hat. Um sie abzunehmen, muss man länger sein. Ein fremdes Gebäude dazwischen unterbricht die Straße. Wird die Straße der Besitzer:in unterbrochen und sind andere gleich lang, bleibt die Karte frei, bis jemand länger ist.' },
            { t: 'p', text: '**Größte Rittermacht**: bekommt, wer als Erste:r 3 Soldaten gespielt hat. Um sie abzunehmen, braucht man mehr Soldaten.' },
            { t: 'fig', id: 'longest', caption: 'Diese Straße ist 6 lang: Es zählt der längste zusammenhängende Weg ohne doppelte Abschnitte.' },
          ],
        },
        {
          id: 'end',
          title: 'Spielende',
          blocks: [
            { t: 'p', text: 'Es gewinnt, wer in seinem eigenen Zug 10 Punkte (oder das gewählte Ziel) hat, Siegpunktkarten mitgezählt. Erreichst du das Ziel im Zug einer anderen Person, gewinnst du, sobald dein Zug beginnt.' },
            { t: 'p', text: 'Am Ende sieht man alle Punkte, die verdeckten Karten und wie oft jede Zahl gefallen ist.' },
          ],
        },
        {
          id: 'options',
          title: 'Optionen im Raum',
          blocks: [
            { t: 'list', items: [
              '**Freundlicher Räuber**: Der Räuber darf nicht an ein Feld, das an eine Person mit 2 sichtbaren Punkten oder weniger grenzt.',
              '**Punkte zum Sieg**: zwischen 6 und 18. Automatisch gilt das Ziel der jeweiligen Version.',
              'Zu zweit wird mit denselben Regeln gespielt.',
            ] },
          ],
        },
        {
          id: 'ref',
          title: 'Kurzübersicht',
          blocks: [
            { t: 'steps', items: ['Würfeln: alle kassieren (bei 7: abwerfen und Räuber).', 'Handeln: Mitspielende, Bank 4:1, Häfen 3:1 und 2:1.', 'Bauen und eine Entwicklungskarte spielen.', 'Zug beenden.'] },
            { t: 'costs', rows: [
              { icon: 'road', label: 'Straße', cost: { lumber: 1, brick: 1 } },
              { icon: 'settlement', label: 'Siedlung', cost: { lumber: 1, brick: 1, wool: 1, grain: 1 } },
              { icon: 'city', label: 'Stadt', cost: { grain: 2, ore: 3 } },
              { icon: 'dev', label: 'Entwicklung', cost: { wool: 1, grain: 1, ore: 1 } },
            ] },
          ],
        },
      ],
    },

    big: {
      id: 'big',
      title: '5 und 6 Personen',
      summary: 'Für große Runden: eine Insel aus 30 Feldern, mehr Karten und eine Regel, damit niemand lange wartet.',
      meta: ['5–6 Personen', '90–120 Minuten', 'Ziel: 10 Punkte'],
      sections: [
        {
          id: 'changes',
          title: 'Was sich ändert',
          blocks: [
            { t: 'p', text: 'Es gelten die Regeln des Grundspiels mit diesen Änderungen:' },
            { t: 'list', items: [
              'Insel aus 30 Feldern: 6 Wälder, 6 Weiden, 6 Äcker, 5 Hügel, 5 Gebirge und 2 Wüsten.',
              '28 Zahlenchips und 11 Häfen (5 allgemeine und 6 für Rohstoffe, zwei davon für Wolle).',
              'Die Bank hat 24 Karten jedes Rohstoffs.',
              '34 Entwicklungskarten: 20 Soldaten, 5 Siegpunkte und je 3 der übrigen.',
              'Der Räuber beginnt in einer der Wüsten.',
            ] },
            { t: 'p', text: 'Damit die Wartezeit kurz bleibt, wählt der Raum eine dieser beiden Regeln.' },
          ],
        },
        {
          id: 'special',
          title: 'Sonderbauphase',
          blocks: [
            { t: 'p', text: 'Wenn die Person am Zug fertig ist, dürfen die anderen nacheinander mit ihren Handkarten bauen und Entwicklungskarten kaufen. In dieser Phase wird nicht gehandelt (auch nicht mit der Bank) und keine Karte gespielt. Jede:r passt, wann er oder sie will.' },
            { t: 'note', text: 'So wirst du Karten los, bevor dich eine 7 im Zug einer anderen Person zum Abwerfen zwingt.' },
          ],
        },
        {
          id: 'paired',
          title: 'Paarzug',
          blocks: [
            { t: 'p', text: 'In jedem Zug spielen zwei Personen. Zuerst die Person am Zug, vollständig. Danach spielt die Person drei Plätze weiter ihren Teil: Sie würfelt nicht und handelt nicht mit Mitspielenden, darf aber bauen, mit der Bank handeln und eine Entwicklungskarte spielen.' },
            { t: 'p', text: 'Beide können in diesem Zug gewinnen. So spielt jede Person pro Runde zweimal: im eigenen Zug und als Begleitung.' },
          ],
        },
      ],
    },

    sea: {
      id: 'sea',
      title: 'Offene See',
      summary: 'Die Insel ist nicht mehr allein: Es gibt befahrbares Meer, Schiffe, Inseln zum Entdecken, Goldfelder und einen Piraten. Fünf Szenarien mit einer neuen Karte in jeder Partie.',
      meta: ['3–6 Personen', '90–120 Minuten', 'Ziel: 12 oder 13 Punkte'],
      sections: [
        {
          id: 'changes',
          title: 'Was sich ändert',
          blocks: [
            { t: 'p', text: 'Es gelten die Regeln des Grundspiels. Die Karte hat mehrere Inseln und viel Meer, über das man mit Schiffen fährt. Wer als Erste:r eine neue Insel erreicht, bekommt Extrapunkte, und auf Goldfeldern wählt man den Rohstoff selbst.' },
            { t: 'fig', id: 'ships', caption: 'Von der Siedlung an der Küste führt eine Schiffskette zu einer anderen Insel.' },
          ],
        },
        {
          id: 'ships',
          title: 'Schiffe',
          blocks: [
            { t: 'costs', rows: [
              { icon: 'ship', label: 'Schiff', cost: { lumber: 1, wool: 1 }, note: 'Auf einer Kante mit Meer, an deinem Küstengebäude oder einem deiner Schiffe.' },
            ] },
            { t: 'list', items: [
              'Ein Schiff liegt auf der Kante zwischen zwei Feldern, mindestens eines davon Meer.',
              'Eine Schiffskette beginnt an deiner Siedlung oder Stadt an der Küste oder setzt eines deiner Schiffe fort.',
              'Straßen und Schiffe verbinden sich nur an einem Gebäude: Für den Wechsel brauchst du eine Siedlung oder Stadt an der Küste.',
              'Am Ende einer Schiffskette darfst du eine Siedlung gründen, wie am Ende einer Straße.',
              'Jede Person hat 15 Schiffe.',
            ] },
          ],
        },
        {
          id: 'moving',
          title: 'Schiffe versetzen',
          blocks: [
            { t: 'p', text: 'Einmal pro Zug darfst du ein Schiff versetzen, das am Ende einer offenen Route liegt, also einer Route, die nicht an deinem Gebäude endet. Du stellst es dorthin, wo du ein Schiff bauen dürftest.' },
            { t: 'p', text: 'Nicht versetzt werden dürfen das im selben Zug gebaute Schiff und Schiffe, die am Piraten liegen.' },
            { t: 'fig', id: 'shipMove', caption: 'Das letzte Schiff verlässt seinen Platz und setzt die Route zur anderen Küste fort.' },
          ],
        },
        {
          id: 'pirate',
          title: 'Der Pirat',
          blocks: [
            { t: 'p', text: 'Bei einer 7 oder einem Soldaten wählst du: den Räuber (an Land) oder den Piraten (auf dem Meer) versetzen. Der Pirat zieht eine Karte bei einer Person mit Schiff an seinem Feld.' },
            { t: 'p', text: 'Solange er dort steht, baut und versetzt niemand Schiffe an den Kanten dieses Feldes.' },
            { t: 'fig', id: 'pirate', caption: 'Der Pirat sperrt alle sechs Kanten seines Feldes.' },
          ],
        },
        {
          id: 'gold',
          title: 'Goldfelder',
          blocks: [
            { t: 'p', text: 'Ein Goldfeld hat keinen eigenen Rohstoff: Fällt seine Zahl, wählt jede angrenzende Siedlung 1 Rohstoff aus der Bank, jede Stadt 2. Beim Aufbau wählt die zweite Siedlung ebenfalls einen pro angrenzendem Goldfeld.' },
            { t: 'fig', id: 'gold', caption: 'Es fällt eine 9: Die Siedlung wählt den Rohstoff, den sie will.' },
          ],
        },
        {
          id: 'islands',
          title: 'Neue Inseln',
          blocks: [
            { t: 'p', text: 'Deine erste Siedlung auf einer Insel oder in einem Gebiet, wo du nicht begonnen hast, bringt Extrapunkte: in fast allen Szenarien 2. Jede Insel gibt jeder Person den Bonus nur einmal, aber mehrere Personen können ihn bekommen.' },
          ],
        },
        {
          id: 'fog',
          title: 'Nebel',
          blocks: [
            { t: 'p', text: 'Im Szenario Nebelmeer ist außerhalb deiner Insel alles verdeckt. Erreicht eine deiner Straßen oder Schiffe ein Nebelfeld, wird es aufgedeckt. Ist es Land, bekommst du eine Karte seines Rohstoffs (bei Gold wählst du). Ist es Meer, kannst du weitersegeln.' },
            { t: 'fig', id: 'fog', caption: 'Das Schiff erreicht den Nebel und entdeckt einen Wald: +1 Holz.' },
          ],
        },
        {
          id: 'route',
          title: 'Handelsstraße',
          blocks: [
            { t: 'p', text: 'Die längste Handelsstraße zählt Straßen und Schiffe zusammen, solange der Wechsel zwischen beiden an einem deiner Gebäude passiert. Die Karte Straßenbau erlaubt Schiffe statt Straßen.' },
          ],
        },
        {
          id: 'scenarios',
          title: 'Szenarien',
          blocks: [
            { t: 'p', text: 'Die Karten entstehen beim Start, keine Partie gleicht der anderen. Jedes Szenario legt fest, wie das Meer aussieht, wo man beginnt und wie viele Punkte man braucht.' },
            { t: 'h3', text: 'Äußere Inseln' },
            { t: 'p', text: 'Eine große Insel und kleine Inseln rundherum. Alle beginnen auf der großen Insel; jede kleine Insel gibt 2 Extrapunkte. Ziel: 13.' },
            { t: 'h3', text: 'Archipel' },
            { t: 'p', text: 'Vier bis sechs mittelgroße Inseln. Jede:r wählt den Start selbst. Eine Siedlung auf einer Insel, auf der du nach dem Aufbau kein Gebäude hattest, gibt 2 Punkte. Ziel: 12.' },
            { t: 'h3', text: 'Nebelmeer' },
            { t: 'p', text: 'Eine Startinsel, umgeben von Nebel. Die versteckten Inseln geben keine Extrapunkte, aber entdeckte Felder bringen Rohstoffe. Ziel: 12.' },
            { t: 'h3', text: 'Jenseits der Wüste' },
            { t: 'p', text: 'Ein Wüstenstreifen trennt das Startgebiet von einem fernen Gebiet; dazu gibt es kleine Inseln. Das ferne Gebiet oder eine kleine Insel zu erreichen gibt 2 Punkte. Auf Goldfeldern liegt nie eine 6 oder 8. Ziel: 12.' },
            { t: 'h3', text: 'Zufallsinseln' },
            { t: 'p', text: 'Drei bis sechs Inseln zufälliger Größe. Man beginnt, wo man will; Inseln ohne eigenen Start geben 2 Punkte. Ziel: 12.' },
          ],
        },
      ],
    },

    guilds: {
      id: 'guilds',
      title: 'Gilden & Wächter',
      summary: 'Die Städte wachsen: Sie liefern Waren, werden in drei Bereichen ausgebaut und gründen Metropolen. Dafür kommen von Zeit zu Zeit Barbaren übers Meer, und die Insel wird mit Rittern verteidigt.',
      meta: ['3–6 Personen', '2 Stunden', 'Ziel: 13 Punkte'],
      sections: [
        {
          id: 'changes',
          title: 'Was sich ändert',
          blocks: [
            { t: 'p', text: 'Es gelten die Regeln des Grundspiels mit diesen Änderungen:' },
            { t: 'list', items: [
              'Beim Aufbau ist das zweite Gebäude eine Stadt.',
              'Es gibt keine Entwicklungskarten und keine größte Rittermacht, dafür 54 Fortschrittskarten in drei Stapeln.',
              'Neben den beiden Ertragswürfeln (einer rot) wird der Ereigniswürfel geworfen.',
              'Der Räuber kommt erst nach dem ersten Barbarenangriff ins Spiel.',
              'Ziel: 13 Punkte.',
            ] },
          ],
        },
        {
          id: 'commodities',
          title: 'Waren',
          blocks: [
            { t: 'p', text: 'Eine Stadt am Wald bekommt 1 Holz und 1 Papier, an der Weide 1 Wolle und 1 Tuch, am Gebirge 1 Erz und 1 Münze. An Hügel und Acker bekommt sie weiterhin 2 des Rohstoffs.' },
            { t: 'fig', id: 'commodities', caption: 'Die drei Waren und die Landschaft, die sie liefert.' },
            { t: 'p', text: 'Waren sind Handkarten: Sie zählen bei der 7, können gezogen werden und werden mit der Bank 4:1 oder am allgemeinen Hafen 3:1 getauscht.' },
          ],
        },
        {
          id: 'improve',
          title: 'Stadtausbauten',
          blocks: [
            { t: 'p', text: 'Es gibt drei Bereiche: Wissenschaft (bezahlt mit Papier), Handel (Tuch) und Politik (Münze). Stufe n eines Bereichs kostet n Waren dieses Bereichs, bis Stufe 5. Du brauchst mindestens eine Stadt.' },
            { t: 'table', head: ['Bereich', 'Bezahlt mit', 'Ab Stufe 3'], rows: [
              ['Wissenschaft', 'Papier', 'Aquädukt: Bringt dir ein Wurf nichts, wählst du einen Rohstoff.'],
              ['Handel', 'Tuch', 'Handelshaus: Du tauschst Waren 2:1 mit der Bank.'],
              ['Politik', 'Münze', 'Festung: Du darfst Ritter auf Stufe 3 befördern.'],
            ] },
            { t: 'p', text: '**Metropole**: Wer als Erste:r Stufe 4 eines Bereichs erreicht, macht eine eigene Stadt zur Metropole. Sie zählt 2 Punkte mehr und wird von den Barbaren nicht geplündert. Erreicht eine andere Person früher Stufe 5, nimmt sie die Metropole ab. Es gibt eine Metropole pro Bereich, und eine Stadt kann nur eine tragen.' },
            { t: 'note', text: 'Für Stufe 4 oder 5 brauchst du eine Stadt ohne Metropole, außer du hast die Metropole dieses Bereichs schon.' },
          ],
        },
        {
          id: 'event',
          title: 'Der Ereigniswürfel',
          blocks: [
            { t: 'p', text: 'Das Ereignis wird vor dem Ertrag ausgeführt:' },
            { t: 'list', items: [
              '**Schiff** (drei Seiten): Das Barbarenschiff rückt ein Feld vor. Erreicht es das siebte, greifen die Barbaren an.',
              '**Tor der Wissenschaft, des Handels oder der Politik**: Wer in diesem Bereich mindestens Stufe 1 hat, zieht eine Fortschrittskarte dieser Farbe, wenn der rote Würfel höchstens die eigene Stufe plus 1 zeigt. Die Person am Zug beginnt.',
            ] },
          ],
        },
        {
          id: 'progress',
          title: 'Fortschrittskarten',
          blocks: [
            { t: 'p', text: 'Sie werden in deinem Zug nach dem Würfeln gespielt (der Alchemist davor), so viele du willst. Du darfst 4 auf der Hand haben: Bekommst du außerhalb deines Zuges eine fünfte, wirfst du sofort ab; in deinem Zug am Ende. Siegpunktkarten werden sofort offen ausgelegt.' },
            { t: 'h3', text: 'Wissenschaft' },
            { t: 'progressCards', track: 'science' },
            { t: 'h3', text: 'Handel' },
            { t: 'progressCards', track: 'trade' },
            { t: 'h3', text: 'Politik' },
            { t: 'progressCards', track: 'politics' },
          ],
        },
        {
          id: 'barbarians',
          title: 'Die Barbaren',
          blocks: [
            { t: 'fig', id: 'barbarians', caption: 'Das Schiff rückt bei jeder Schiffsseite vor; auf Feld 7 landet es.' },
            { t: 'list', items: [
              '**Stärke der Barbaren**: eins pro Stadt auf der Insel, Metropolen eingeschlossen.',
              '**Verteidigung**: die Summe der Stufen aller aktiven Ritter.',
              'Ist die Verteidigung gleich groß oder größer, gewinnen die Verteidiger:innen. Wer am meisten beigetragen hat, bekommt einen Verteidigungspunkt; bei Gleichstand zieht jede:r Beteiligte eine Fortschrittskarte vom gewünschten Stapel.',
              'Gewinnen die Barbaren, verliert, wer unter denen mit Städten ohne Metropole am wenigsten beigetragen hat, eine Stadt: Sie wird wieder zur Siedlung. Ohne Siedlungen im Vorrat bleibt die Stadt beschädigt: Sie zählt wie eine Siedlung und muss (zum Preis einer Stadt) repariert werden, bevor du neue Siedlungen gründest.',
              'Nach dem Angriff werden alle Ritter inaktiv und das Schiff kehrt an den Start zurück. Nach dem ersten Angriff kommt der Räuber ins Spiel.',
            ] },
          ],
        },
        {
          id: 'knights',
          title: 'Ritter',
          blocks: [
            { t: 'costs', rows: [
              { icon: 'knight', label: 'Anwerben', cost: { wool: 1, ore: 1 }, note: 'Auf eine freie Kreuzung an deinen Straßen. Beginnt inaktiv.' },
              { icon: 'activate', label: 'Aktivieren', cost: { grain: 1 } },
              { icon: 'promote', label: 'Befördern', cost: { wool: 1, ore: 1 }, note: 'Von Stufe 2 auf 3 nur mit Politik 3.' },
            ] },
            { t: 'p', text: 'Jede Person hat zwei Ritter jeder Stufe. Ein aktiver Ritter darf einmal pro Zug, aber nicht im Zug seiner Aktivierung:' },
            { t: 'list', items: [
              'über deine Straßen auf eine freie Kreuzung ziehen;',
              'einen schwächeren fremden Ritter vertreiben: Dessen Besitzer:in stellt ihn auf eine andere freie Kreuzung des eigenen Netzes, oder er geht zurück in den Vorrat;',
              'den Räuber von einem angrenzenden Feld verjagen und ihn wie bei einer 7 versetzen.',
            ] },
            { t: 'p', text: 'Danach ist er inaktiv. Ritter unterbrechen fremde Straßen, und auf ihrer Kreuzung baut niemand. Ein Ritter wird nicht zweimal im selben Zug befördert.' },
            { t: 'fig', id: 'knights', caption: 'Ritter der Stufen 1, 2 und 3. Der linke ist inaktiv.' },
          ],
        },
        {
          id: 'walls',
          title: 'Stadtmauern',
          blocks: [
            { t: 'costs', rows: [{ icon: 'wall', label: 'Stadtmauer', cost: { brick: 2 }, note: 'An einer deiner Städte.' }] },
            { t: 'p', text: 'Jede Mauer erhöht dein Handkartenlimit bei der 7 um 2. Jede Person hat 3. Wird die Stadt geplündert, ist die Mauer weg.' },
          ],
        },
        {
          id: 'points',
          title: 'Punkte',
          blocks: [
            { t: 'table', head: ['Was', 'Punkte'], rows: [
              ['Siedlung', '1'],
              ['Stadt', '2'],
              ['Metropole', '+2'],
              ['Längste Handelsstraße', '2'],
              ['Verteidigungspunkt', 'je 1'],
              ['Druckerei, Verfassung', 'je 1'],
              ['Händler', '1'],
            ] },
          ],
        },
        {
          id: 'ref',
          title: 'Kurzübersicht',
          blocks: [
            { t: 'steps', items: ['Drei Würfel werfen: zuerst das Ereignis, dann der Ertrag.', 'Handeln und bauen, Fortschrittskarten spielen, Ritter einsetzen.', 'Zug beenden (mit mehr als 4 Fortschrittskarten abwerfen).'] },
            { t: 'costs', rows: [
              { icon: 'road', label: 'Straße', cost: { lumber: 1, brick: 1 } },
              { icon: 'settlement', label: 'Siedlung', cost: { lumber: 1, brick: 1, wool: 1, grain: 1 } },
              { icon: 'city', label: 'Stadt', cost: { grain: 2, ore: 3 } },
              { icon: 'wall', label: 'Stadtmauer', cost: { brick: 2 } },
              { icon: 'knight', label: 'Ritter', cost: { wool: 1, ore: 1 } },
              { icon: 'activate', label: 'Aktivieren', cost: { grain: 1 } },
              { icon: 'promote', label: 'Befördern', cost: { wool: 1, ore: 1 } },
            ] },
          ],
        },
      ],
    },

    combo: {
      id: 'combo',
      title: 'Offene See mit Gilden',
      summary: 'Beide Erweiterungen zusammen: Schiffe und Ritter, Gold und Waren, Pirat und Barbaren.',
      meta: ['3–6 Personen', '2 bis 3 Stunden', 'Ziel: das des Szenarios + 2'],
      sections: [
        {
          id: 'rules',
          title: 'Wie sie zusammenspielen',
          blocks: [
            { t: 'p', text: 'Es gelten alle Regeln von Offene See und Gilden & Wächter, mit diesen Anpassungen:' },
            { t: 'list', items: [
              'Das Ziel des Szenarios steigt um 2 Punkte (zum Beispiel Äußere Inseln: 15).',
              'Ritter ziehen auch über deine Schiffe und können den Piraten von einer Kreuzung an seinem Feld verjagen.',
              'Ein Goldfeld liefert nur Rohstoffe, auch an Städte: Eine Stadt wählt 2.',
              'Der Händler darf nicht auf ein Goldfeld.',
              'Vor dem ersten Barbarenangriff versetzt eine 7 weder Räuber noch Piraten.',
              'Der Straßenbautrupp erlaubt Schiffe; der Diplomat entfernt nur Straßen.',
              'Ein eigener Ritter am Ende einer Schiffsroute schließt sie: Dieses Schiff lässt sich nicht mehr versetzen.',
            ] },
          ],
        },
      ],
    },

    shires: {
      id: 'shires',
      title: 'Landstriche',
      summary: 'Varianten für die Grundinsel, die sich zu jeder Partie dazunehmen lassen: Häfen, die Ansehen bringen, Chronik-Karten statt Würfeln und Regeln für zwei.',
      meta: ['2–6 Personen', '60–90 Minuten', 'Ziel: 10, oder 11 mit dem Herrn der Kais'],
      sections: [
        {
          id: 'about',
          title: 'Was drin ist',
          blocks: [
            { t: 'p', text: 'Landstriche sammelt Regeln, die zum Grundspiel dazukommen. Sie werden im Raum unter **Varianten** eingeschaltet und lassen sich kombinieren. Der Herr der Kais funktioniert auch mit Offene See und mit Gilden.' },
          ],
        },
        {
          id: 'harbor',
          title: 'Herr der Kais',
          blocks: [
            { t: 'list', items: [
              'Eine Siedlung an einem Hafen zählt 1 Hafenpunkt, eine Stadt 2. Ein Gebäude zählt einmal, auch wenn es an zwei Häfen liegt.',
              'Wer als Erste:r 3 Hafenpunkte hat, wird Herr der Kais und bekommt 2 Siegpunkte.',
              'Um den Titel abzunehmen, braucht man mehr Hafenpunkte.',
              'Das Ziel steigt um 1 Punkt: 11 auf der Grundinsel.',
            ] },
            { t: 'fig', id: 'harbors', caption: 'Zwei Siedlungen an Häfen: 2 Hafenpunkte. Mit einer Stadt an einem der beiden werden es 3.' },
          ],
        },
        {
          id: 'chronicle',
          title: 'Chronik-Karten',
          blocks: [
            { t: 'p', text: 'Statt zu würfeln zieht die Person am Zug eine Karte. Es gibt 36 Karten mit den Zahlen im selben Verhältnis wie bei zwei Würfeln (eine 2, zwei 3 und so weiter bis sechs 7), daher fällt in jedem Durchgang jede Zahl so oft, wie sie soll.' },
            { t: 'p', text: 'Die Neujahrskarte steckt 5 Karten über dem Boden: Kommt sie, wird alles neu gemischt und eine weitere Karte gezogen. So kann niemand die letzten Karten abzählen.' },
            { t: 'fig', id: 'chronicle', caption: 'Manche Karten bringen unten ein Ereignis. Die 7 sind rot.' },
            { t: 'p', text: 'Zwanzig Karten bringen ein Ereignis, das vor dem Ertrag ausgeführt wird:' },
            { t: 'table', head: ['Ereignis', 'Zahl', 'Was passiert'], rows: [
              ['Erntejahr', '2', 'Jede Person nimmt einen Rohstoff aus der Bank.'],
              ['Händel', '3', 'Wer die meisten Soldaten gespielt hat (ohne Gleichstand), zieht bei einer Person nach Wahl eine Karte.'],
              ['Der Räuber versteckt sich', '4 (zwei Karten)', 'Der Räuber kehrt in die Wüste zurück.'],
              ['Turnier', '5', 'Wer die meisten Soldaten gespielt hat, nimmt je einen Rohstoff.'],
              ['Rückenwind', '5', 'Wer die längste Handelsstraße hat, zieht bei einer Person nach Wahl eine Karte.'],
              ['Erdbeben', '6', 'Jede:r beschädigt eine eigene Straße: Sie zählt nicht für die Handelsstraße, und neue Straßen gibt es erst nach der Reparatur (Holz und Lehm).'],
              ['Gute Nachbarn', '6', 'Jede:r schenkt der nächsten Person einen Rohstoff.'],
              ['Seuche', '6 und 8', 'Bei diesem Ertrag liefern Städte wie Siedlungen.'],
              ['Der Räuber schlägt zu', '7 (sechs Karten)', 'Eine normale 7: abwerfen, Räuber versetzen, Karte ziehen.'],
              ['Ruhige See', '9 und 12', 'Wer an den meisten Häfen Gebäude hat, nimmt je einen Rohstoff.'],
              ['Nachbarschaftshilfe', '10 und 11', 'Wer bei den Punkten vorne liegt, schenkt jemandem mit weniger Punkten einen Rohstoff.'],
            ] },
            { t: 'note', text: 'Nicht mit Gilden & Wächter kombinierbar, das seine drei Würfel braucht.' },
          ],
        },
        {
          id: 'duel',
          title: 'Duell (2 Personen)',
          blocks: [
            { t: 'p', text: 'Für Partien zu zweit auf der Grundinsel. Dazu kommen zwei neutrale Farben, die nicht spielen: Sie nehmen Platz weg, unterbrechen Straßen und füllen die Insel wie bei einer Runde zu viert.' },
            { t: 'list', items: [
              '**Neutrale**: Zu Beginn bekommt jede zwei Siedlungen mit Straße an zufälligen Stellen. Sie liefern nichts, haben keine Karten und gewinnen keine Sonderkarten.',
              'Jedes Mal, wenn du eine Straße baust, baust du auch eine für eine neutrale Farbe, wo du willst, an ihr Netz angeschlossen. Jedes Mal, wenn du eine Siedlung gründest, gründest du eine für eine neutrale Farbe; ist kein Platz, gibst du ihr eine Straße.',
              '**Zwei Würfe**: In jedem Zug wird zweimal gewürfelt, und beide Würfe bringen Erträge. Der zweite muss eine andere Zahl ergeben als der erste.',
              '**Handelsmarken**: Jede:r beginnt mit 5 (insgesamt gibt es 20). Einmal pro Zug kannst du sie für einen **Zwangstausch** einsetzen (du ziehst 2 zufällige Karten der anderen Person und gibst 2 deiner Wahl zurück) oder um den **Räuber in die Wüste** zu schicken. Das kostet 1 Marke, wenn du gleichauf oder hinten liegst, und 2, wenn du vorne liegst.',
              'Marken bekommst du für neue Siedlungen: 1 an der Küste, 2 an der Wüste, 3 für beides. Außerdem kannst du einen gespielten Soldaten gegen 2 Marken abgeben.',
            ] },
          ],
        },
      ],
    },
  },

  app: [
    {
      id: 'online',
      title: 'Online spielen',
      blocks: [
        { t: 'steps', items: [
          'Gib deinen Namen ein und tippe auf **Raum erstellen**. Die Partie läuft in deinem Browser: am besten am Computer und mit offenem Tab.',
          'Tippe auf **Link kopieren** und schick ihn weiter. Wer ihn öffnet, gibt einen Namen ein und erscheint im Raum.',
          'Wähle Version und Einstellungen, füge Bots hinzu, wenn Leute fehlen, und tippe auf **Partie starten**.',
        ] },
        { t: 'p', text: 'Bricht bei jemandem die Verbindung ab, öffnet er oder sie denselben Link wieder und bekommt den Platz zurück. Schließt die Gastgeber:in den Tab, bleibt die Partie im Browser gespeichert, und beim nächsten Besuch erscheint **Raum fortsetzen** mit demselben Code.' },
      ],
    },
    {
      id: 'local',
      title: 'An einem Gerät',
      blocks: [
        { t: 'p', text: 'Unter **Auf diesem Gerät spielen** wird das Handy oder der Computer weitergereicht: Vor jedem Zug erscheint ein Bildschirm, damit niemand die Hand der anderen sieht. Man kann auch gegen Bots spielen.' },
      ],
    },
  ],
};

export default book;
