// Rulebooks in English (original text).
import type { ManualBook } from './types';

const book: ManualBook = {
  manuals: {
    base: {
      id: 'base',
      title: 'Base game',
      summary: 'You settle an island made of hexes. The dice decide which land produces; with those resources you build roads, settlements and cities, and you trade with everyone else. The first to reach 10 points on their own turn wins.',
      meta: ['3–4 players (2 works too)', '60–90 minutes', 'Goal: 10 points'],
      sections: [
        {
          id: 'idea',
          title: 'The idea',
          blocks: [
            { t: 'p', text: 'Every game builds a new island of 19 tiles. Each tile except the desert carries a number from 2 to 12. At the start of your turn you roll two dice: every tile with that number produces for every settlement and city touching it, whoever owns them.' },
            { t: 'p', text: 'You build with the resources. Each settlement is worth 1 point and each city 2. There are two awards worth 2 points (longest trade route and largest army) and cards worth a point.' },
            { t: 'fig', id: 'terrains', caption: 'Five kinds of land produce one resource each. The desert produces nothing.' },
          ],
        },
        {
          id: 'pieces',
          title: 'Land, cards and pieces',
          blocks: [
            { t: 'table', head: ['Land', 'Produces', 'On the island'], rows: [
              ['Forest', 'Lumber', '4'],
              ['Hills', 'Brick', '3'],
              ['Pasture', 'Wool', '4'],
              ['Fields', 'Grain', '4'],
              ['Mountains', 'Ore', '3'],
              ['Desert', 'Nothing', '1'],
            ] },
            { t: 'p', text: 'Numbers are placed so that 6 and 8, the most frequent rolls, are never side by side. The dots under each number show how likely it is: more dots, more often.' },
            { t: 'p', text: 'Each player has 15 roads, 5 settlements and 4 cities. When a city replaces a settlement, the settlement goes back to your supply. The bank holds 19 cards of each resource and 25 development cards.' },
            { t: 'p', text: 'Nine harbors ring the island: 4 generic ones and one for each resource.' },
          ],
        },
        {
          id: 'setup',
          title: 'Setup',
          blocks: [
            { t: 'steps', items: [
              'Draw lots for who starts.',
              'In turn order, everyone places a settlement on a free intersection and a road right next to it.',
              'Then in reverse order (whoever placed last goes first) everyone places a second settlement with its road.',
              'The second settlement takes one card for each tile it touches. Then the first turn begins.',
            ] },
            { t: 'fig', id: 'setup', caption: 'A settlement with its road. The three neighboring intersections are now closed to any building.' },
            { t: 'note', text: 'Look for different numbers and different land: 6 and 8 pay well, but if everything depends on one number, a bad streak leaves you empty-handed.' },
          ],
        },
        {
          id: 'turn',
          title: 'Your turn',
          blocks: [
            { t: 'steps', items: [
              '**Roll the dice.** Everyone collects: each settlement next to a tile with that number gets 1 card of its resource; each city gets 2.',
              '**Trade** with the other players or with the bank.',
              '**Build** whatever you can pay for.',
              '**End your turn.** The player to your left goes next.',
            ] },
            { t: 'p', text: 'After rolling you may trade and build in any order, as often as you like. You may play a development card at any time during your turn, even before rolling.' },
            { t: 'fig', id: 'production', caption: 'An 8 is rolled: the settlement gets 1 wool and the city 2.' },
            { t: 'note', text: 'If the bank cannot pay everyone who should receive a resource, nobody gets it. If only one player was due to receive it, they take what is left.' },
          ],
        },
        {
          id: 'seven',
          title: 'Sevens and the robber',
          blocks: [
            { t: 'p', text: 'Seven is the most common roll and produces nothing. Instead:' },
            { t: 'list', items: [
              'Anyone holding more than 7 cards discards half of them, rounded down.',
              'The player who rolled moves the robber to another tile.',
              'Then they steal a random card from a player with a building next to that tile.',
            ] },
            { t: 'p', text: 'While the robber sits on a tile, that tile produces nothing. The robber starts in the desert.' },
            { t: 'fig', id: 'robber', caption: 'The robber blocks the tile and steals from one of the two neighbors.' },
          ],
        },
        {
          id: 'trade',
          title: 'Trading',
          blocks: [
            { t: 'p', text: 'On your turn you may offer cards to everyone or just to some players. Each one accepts, declines or proposes a different deal; you choose who to close with. The others do not trade among themselves, and cards are never given away.' },
            { t: 'p', text: 'With the bank you trade 4 matching cards for 1 of your choice. A settlement or city on a harbor improves the rate:' },
            { t: 'list', items: [
              '**3:1 harbor**: 3 matching cards for 1.',
              '**2:1 harbor**: 2 cards of the harbor’s resource for 1.',
            ] },
            { t: 'fig', id: 'harbors', caption: 'The upper settlement uses the generic harbor; the lower one trades wool 2:1.' },
          ],
        },
        {
          id: 'build',
          title: 'Building',
          blocks: [
            { t: 'costs', rows: [
              { icon: 'road', label: 'Road', cost: { lumber: 1, brick: 1 }, note: 'Next to one of your roads, settlements or cities.' },
              { icon: 'settlement', label: 'Settlement', cost: { lumber: 1, brick: 1, wool: 1, grain: 1 }, note: 'Next to one of your roads, keeping the distance rule.' },
              { icon: 'city', label: 'City', cost: { grain: 2, ore: 3 }, note: 'Replaces one of your settlements.' },
              { icon: 'dev', label: 'Development card', cost: { wool: 1, grain: 1, ore: 1 }, note: 'Drawn at random.' },
            ] },
            { t: 'p', text: 'Distance rule: there is always at least one free intersection between two buildings, whoever owns them. A road cannot continue past an intersection with an opponent’s building.' },
            { t: 'fig', id: 'distance', caption: 'The intersections marked ✕ are too close. The new settlement two segments away is fine.' },
          ],
        },
        {
          id: 'dev',
          title: 'Development cards',
          blocks: [
            { t: 'p', text: 'You may play one per turn, never the one you bought that same turn. Point cards stay hidden until you win.' },
            { t: 'devCards' },
          ],
        },
        {
          id: 'points',
          title: 'Points and awards',
          blocks: [
            { t: 'table', head: ['What', 'Points'], rows: [
              ['Settlement', '1'],
              ['City', '2'],
              ['Longest trade route', '2'],
              ['Largest army', '2'],
              ['Victory point card', '1'],
            ] },
            { t: 'p', text: '**Longest trade route**: goes to the first player with 5 or more connected roads. To take it you must have a longer one. An opponent’s building in the middle breaks a route. If the holder’s route is broken and others tie for longest, the award stays free until someone pulls ahead.' },
            { t: 'p', text: '**Largest army**: goes to the first player to play 3 soldiers. To take it you must play more soldiers than the holder.' },
            { t: 'fig', id: 'longest', caption: 'This route is 6 long: count the longest connected stretch without reusing a road.' },
          ],
        },
        {
          id: 'end',
          title: 'End of the game',
          blocks: [
            { t: 'p', text: 'You win when you have 10 points (or the chosen goal) during your own turn, counting your point cards. If you reach the goal during someone else’s turn, you win as soon as yours begins.' },
            { t: 'p', text: 'At the end everyone’s points, the hidden cards and a count of every roll are shown.' },
          ],
        },
        {
          id: 'options',
          title: 'Room options',
          blocks: [
            { t: 'list', items: [
              '**Friendly robber**: the robber may not go to a tile touching a player with 2 visible points or fewer.',
              '**Points to win**: from 6 to 18. Automatic uses each version’s goal.',
              'With 2 players the rules are the same.',
            ] },
          ],
        },
        {
          id: 'ref',
          title: 'Quick reference',
          blocks: [
            { t: 'steps', items: ['Roll: everyone collects (on a 7: discards and the robber).', 'Trade: players, bank 4:1, harbors 3:1 and 2:1.', 'Build and play a development card.', 'End the turn.'] },
            { t: 'costs', rows: [
              { icon: 'road', label: 'Road', cost: { lumber: 1, brick: 1 } },
              { icon: 'settlement', label: 'Settlement', cost: { lumber: 1, brick: 1, wool: 1, grain: 1 } },
              { icon: 'city', label: 'City', cost: { grain: 2, ore: 3 } },
              { icon: 'dev', label: 'Development', cost: { wool: 1, grain: 1, ore: 1 } },
            ] },
          ],
        },
      ],
    },

    big: {
      id: 'big',
      title: '5 and 6 players',
      summary: 'For big tables: an island of 30 tiles, more cards and a rule so nobody waits around.',
      meta: ['5–6 players', '90–120 minutes', 'Goal: 10 points'],
      sections: [
        {
          id: 'changes',
          title: 'What changes',
          blocks: [
            { t: 'p', text: 'Play with the base game rules plus these changes:' },
            { t: 'list', items: [
              'An island of 30 tiles: 6 forests, 6 pastures, 6 fields, 5 hills, 5 mountains and 2 deserts.',
              '28 number tokens and 11 harbors (5 generic and 6 for resources, two of them for wool).',
              'The bank holds 24 cards of each resource.',
              '34 development cards: 20 soldiers, 5 points and 3 of each of the others.',
              'The robber starts in one of the deserts.',
            ] },
            { t: 'p', text: 'To keep the wait between turns short, the room picks one of these two rules.' },
          ],
        },
        {
          id: 'special',
          title: 'Special building phase',
          blocks: [
            { t: 'p', text: 'When the active player finishes, everyone else in turn may build and buy development cards with the cards in hand. During this phase there is no trading (not even with the bank) and no playing cards. Each player passes whenever they like.' },
            { t: 'note', text: 'It is the best way to spend cards before a 7 on someone else’s turn forces you to discard.' },
          ],
        },
        {
          id: 'paired',
          title: 'Paired turns',
          blocks: [
            { t: 'p', text: 'Two people play each turn. First the active player, fully. Then the player three seats further along plays their part: they do not roll or trade with players, but they may build, trade with the bank and play a development card.' },
            { t: 'p', text: 'Either of them can win during that turn. So every player plays twice per round: on their own turn and alongside someone else.' },
          ],
        },
      ],
    },

    sea: {
      id: 'sea',
      title: 'Open Sea',
      summary: 'The island is no longer alone: there is open water, ships, islands to discover, gold fields and a pirate. Nine scenarios with a fresh map every game: five for exploring and four with special rules.',
      meta: ['3–6 players', '90–120 minutes', 'Goal: 10 to 14 points by scenario'],
      sections: [
        {
          id: 'changes',
          title: 'What changes',
          blocks: [
            { t: 'p', text: 'Play with the base game rules. The map has several islands and a lot of sea, crossed by ships. Reaching a new island first scores extra points, and gold fields let you choose which resource to take.' },
            { t: 'fig', id: 'ships', caption: 'A chain of ships leaves the coastal settlement and crosses to another island.' },
          ],
        },
        {
          id: 'ships',
          title: 'Ships',
          blocks: [
            { t: 'costs', rows: [
              { icon: 'ship', label: 'Ship', cost: { lumber: 1, wool: 1 }, note: 'On an edge with sea, joined to your coastal building or to one of your ships.' },
            ] },
            { t: 'list', items: [
              'A ship sits on the edge between two tiles, at least one of them sea.',
              'A chain of ships starts at one of your coastal settlements or cities, or continues one of your ships.',
              'Roads and ships only connect at a building: to switch from road to ship you need a settlement or city on the coast.',
              'You may found a settlement at the end of a chain of ships, just like at the end of a road.',
              'Each player has 15 ships.',
            ] },
          ],
        },
        {
          id: 'moving',
          title: 'Moving ships',
          blocks: [
            { t: 'p', text: 'Once per turn you may move a ship at the end of an open route, that is, a route that does not end at one of your buildings. Put it anywhere you could build a ship.' },
            { t: 'p', text: 'You cannot move a ship built this turn or one touching the pirate.' },
            { t: 'fig', id: 'shipMove', caption: 'The ship at the end leaves its spot and extends the route toward another coast.' },
          ],
        },
        {
          id: 'pirate',
          title: 'The pirate',
          blocks: [
            { t: 'p', text: 'On a 7 or a soldier you choose: move the robber (on land) or the pirate (at sea). The pirate steals a card from a player with a ship next to its tile.' },
            { t: 'p', text: 'While it is there, nobody builds or moves ships on the edges of that tile.' },
            { t: 'fig', id: 'pirate', caption: 'The pirate blocks all six edges of its tile.' },
          ],
        },
        {
          id: 'gold',
          title: 'Gold fields',
          blocks: [
            { t: 'p', text: 'A gold field has no resource of its own: when its number comes up, each settlement next to it picks 1 resource from the bank and each city picks 2. During setup, the second settlement also picks one for each gold field it touches.' },
            { t: 'fig', id: 'gold', caption: 'A 9 is rolled: the settlement picks whatever resource it wants.' },
          ],
        },
        {
          id: 'islands',
          title: 'New islands',
          blocks: [
            { t: 'p', text: 'Your first settlement on an island or area other than where you started scores extra points: 2 in almost every scenario. Each island gives the bonus once to each player, and more than one player can earn it.' },
          ],
        },
        {
          id: 'fog',
          title: 'Fog',
          blocks: [
            { t: 'p', text: 'In the Sea of Fog scenario everything beyond your island is covered. When one of your roads or ships reaches a fog tile, it is revealed. If it is land, you take a card of its resource (for gold, you choose). If it is sea, you can keep sailing.' },
            { t: 'fig', id: 'fog', caption: 'The ship reaches the fog and finds a forest: +1 lumber.' },
          ],
        },
        {
          id: 'route',
          title: 'Trade route',
          blocks: [
            { t: 'p', text: 'The longest trade route counts roads and ships together, as long as the switch between them happens at one of your buildings. The Road Building card lets you place ships instead of roads.' },
          ],
        },
        {
          id: 'scenarios',
          title: 'Scenarios',
          blocks: [
            { t: 'p', text: 'Maps are generated at the start, so no two games are alike. Each scenario sets what the sea looks like, where you start and how many points you need. These five use the rules above as they are; the next four add rules of their own and can’t be combined with Guilds and Guardians.' },
            { t: 'h3', text: 'Outer Isles' },
            { t: 'p', text: 'A large island ringed by small ones. Everyone starts on the large island; each small island gives 2 extra points to whoever gets there. Goal: 13.' },
            { t: 'h3', text: 'Archipelago' },
            { t: 'p', text: 'Four to six mid-sized islands. Everyone chooses where to start. Founding on an island where you had no building at the end of setup gives 2 points. Goal: 12.' },
            { t: 'h3', text: 'Sea of Fog' },
            { t: 'p', text: 'A home island surrounded by fog. The hidden islands give no extra points, but discovering land gives resources. Goal: 12.' },
            { t: 'h3', text: 'Beyond the Desert' },
            { t: 'p', text: 'A strip of desert cuts the home area off from a far region; there are also small islands. Reaching the far region or a small island gives 2 points. Gold fields never carry a 6 or an 8. Goal: 12.' },
            { t: 'h3', text: 'Random Isles' },
            { t: 'p', text: 'Three to six islands of random size. Start wherever you like; islands where you did not start give 2 points. Goal: 12.' },
          ],
        },
        {
          id: 'tribe',
          title: 'The island folk',
          blocks: [
            {
              t: 'p',
              text: 'One large island for everyone, and around it the islets of the island folk. They have no numbers and nobody builds there, but their shores hold **18 gifts**: 8 points, 4 development cards and 6 harbors (22 with 5–6 players).',
            },
            {
              t: 'list',
              items: [
                'Everyone starts on the large island. There are no harbors at first: all of them are gifts.',
                'Whoever builds or moves a ship onto the edge with a gift takes it.',
                '**Point**: worth 1 point. **Card**: a face-down development card; like bought ones, it can be played from your next turn.',
                '**Harbor**: goes onto the coast right away, on an edge next to one of your settlements or cities and not touching another harbor. If you have no spot yet, you keep it until you build on the coast.',
                'A 7 or a soldier moves the robber or the pirate. The robber never enters the islets and, once it leaves the desert, never goes back.',
                'Goal: 13 points.',
              ],
            },
            { t: 'fig', id: 'tribe', caption: 'One more ship and the gift on that edge is yours: a point.' },
          ],
        },
        {
          id: 'looms',
          title: 'Weaver villages',
          blocks: [
            {
              t: 'p',
              text: 'Two large islands and, between them, islets with two villages each (eight villages; ten with 5–6 players). Each village is an intersection with its own number and **five bolts of cloth**.',
            },
            {
              t: 'list',
              items: [
                'Setup: three settlements each. After the usual two rounds comes a third in the order of the first, and the **third** settlement gives the starting resources.',
                'Nobody builds on the islets. When your shipping route reaches a village, you take one bolt from it.',
                'Each time a village’s number comes up, everyone who reached it gets one bolt. If the village runs short, the rest comes from the reserve; an empty village gives nothing more.',
                'Two bolts are worth 1 point; a single bolt is worth nothing.',
                'Routes that reach a village are closed: their ships no longer move.',
                'Only someone who already reached a village may move the pirate, which takes a card **or a bolt** from a player with ships next to it. The robber never enters the islets.',
                'There is no award for the longest trade route.',
                'End: 14 points on your turn, or when 3 villages or fewer still have cloth. Then whoever has the most points wins; on a tie, the most cloth.',
              ],
            },
            { t: 'fig', id: 'looms', caption: 'A 5 comes up: the village gives a bolt to whoever sailed up to it.' },
          ],
        },
        {
          id: 'bastions',
          title: 'Corsair strongholds',
          blocks: [
            {
              t: 'p',
              text: 'Everyone starts on the eastern island. To the west lie the corsair isles, with an enemy stronghold for each player; in between, a corsair fleet circles a rock.',
            },
            {
              t: 'list',
              items: [
                'Everyone starts with a settlement on the coast and a first ship, and places two more settlements with roads during setup (no ships).',
                'You have **a single shipping route** with no branches: it leaves your home port, passes your landing (pennant) and ends at your stronghold. Each new ship goes at the tip, along the shortest way. Ships don’t move.',
                'You may found a settlement on your landing: the only spot on the corsair isles where that is allowed.',
                'On every roll, first of all, the fleet sails as many hexes as the **lower die**. If it stops next to your buildings, that die is compared with your warships: if it is higher, you lose a card plus one more for each of your cities there; if it is lower, you pick a resource; on a tie nothing happens.',
                'A soldier card turns the ship of your route closest to your home port into a **warship**. There are no point cards: there are more soldiers instead.',
                'There is no robber: on a 7, players discard as usual and the roller takes a card from anyone they like.',
                'With your route at your stronghold you may **attack** it, and that ends your turn: roll one die. More warships than the roll removes a notch; fewer loses the two ships closest to the stronghold; a tie loses one. At the third notch the stronghold is yours and becomes a settlement (you need one in reserve).',
                'No longest route, no largest army. Whoever has taken their stronghold and has 10 points wins.',
              ],
            },
            { t: 'fig', id: 'bastions', caption: 'Two warships on the way. The fleet circles the rock; the stronghold has already lost a notch.' },
          ],
        },
        {
          id: 'works',
          title: 'Great works',
          blocks: [
            {
              t: 'p',
              text: 'A large island with a **wasteland** of three deserts, islets around it and a **strait** between the large island and one of them. A settlement on an islet gives 1 point. During setup you can’t build at the strait or in the wasteland; afterwards you can.',
            },
            { t: 'fig', id: 'worksMap', caption: 'The wasteland between the three deserts and both shores of the strait.' },
            {
              t: 'p',
              text: 'There are five works with four levels. Each player can raise **only one**: whoever first meets its requirement and pays for level 1 starts it, and from then on it is theirs. Every level costs the same, and you may build several in one turn.',
            },
            {
              t: 'costs',
              rows: [
                {
                  icon: 'w-tower',
                  label: 'Signal tower',
                  cost: { brick: 2, ore: 2, wool: 1 },
                  note: 'Requirement: a city on a harbor and a trade route of 5 or more.',
                },
                { icon: 'w-library', label: 'Library', cost: { lumber: 2, wool: 2, grain: 1 }, note: 'Requirement: a city and 6 points.' },
                { icon: 'w-lock', label: 'Sea lock', cost: { lumber: 2, brick: 2, ore: 1 }, note: 'Requirement: a settlement or city at the strait.' },
                { icon: 'w-mills', label: 'Windmills', cost: { grain: 2, lumber: 2, wool: 1 }, note: 'Requirement: a settlement or city in the wasteland.' },
                { icon: 'w-observatory', label: 'Observatory', cost: { ore: 2, grain: 2, brick: 1 }, note: 'Requirement: two cities.' },
              ],
            },
            { t: 'fig', id: 'works', caption: 'Finished levels are drawn in full; missing ones, dashed.' },
            {
              t: 'list',
              items: [
                'The pirate is not used.',
                'Whoever finishes level 4 of their work wins, or whoever has 10 points and a higher level than every other player.',
              ],
            },
          ],
        },
      ],
    },

    guilds: {
      id: 'guilds',
      title: 'Guilds & Guardians',
      summary: 'Cities grow: they produce commodities, improve along three lines and found metropolises. In exchange, barbarians arrive by sea now and then, and the island is defended by knights.',
      meta: ['3–6 players', '2 hours', 'Goal: 13 points'],
      sections: [
        {
          id: 'changes',
          title: 'What changes',
          blocks: [
            { t: 'p', text: 'Play with the base game rules plus these changes:' },
            { t: 'list', items: [
              'Your second placement during setup is a city.',
              'There are no development cards and no largest army. Instead there are 54 progress cards in three decks.',
              'Besides the two production dice (one red) you roll the event die.',
              'The robber stays off the board until the first barbarian attack.',
              'Goal: 13 points.',
            ] },
          ],
        },
        {
          id: 'commodities',
          title: 'Commodities',
          blocks: [
            { t: 'p', text: 'A city on forest gets 1 lumber and 1 paper; on pasture, 1 wool and 1 cloth; on mountains, 1 ore and 1 coin. On hills and fields it still gets 2 of the resource.' },
            { t: 'fig', id: 'commodities', caption: 'The three commodities and the land that yields them.' },
            { t: 'p', text: 'Commodities are cards in your hand: they count on a 7, can be stolen, and trade with the bank at 4:1 or at a generic harbor at 3:1.' },
          ],
        },
        {
          id: 'improve',
          title: 'City improvements',
          blocks: [
            { t: 'p', text: 'There are three lines: science (paid with paper), trade (cloth) and politics (coin). Reaching level n of a line costs n commodities of that line, up to level 5. You need at least one city.' },
            { t: 'table', head: ['Line', 'Paid with', 'At level 3'], rows: [
              ['Science', 'Paper', 'Aqueduct: if a roll gives you nothing, you pick a resource.'],
              ['Trade', 'Cloth', 'Trading house: you trade commodities 2:1 with the bank.'],
              ['Politics', 'Coin', 'Fortress: you may promote knights to level 3.'],
            ] },
            { t: 'p', text: '**Metropolis**: the first to reach level 4 in a line turns one of their cities into a metropolis. It is worth 2 more points and the barbarians never sack it. If someone else reaches level 5 before the holder, they take it. There is one metropolis per line and a city can hold only one.' },
            { t: 'note', text: 'To reach level 4 or 5 you need a city without a metropolis, unless you already own that line’s metropolis.' },
          ],
        },
        {
          id: 'event',
          title: 'The event die',
          blocks: [
            { t: 'p', text: 'The event happens before production:' },
            { t: 'list', items: [
              '**Ship** (three faces): the barbarian ship moves one step. When it reaches the seventh, they attack.',
              '**Science, trade or politics gate**: every player with level 1 or more in that line draws a progress card of that color if the red die is at most their level plus 1. The active player goes first.',
            ] },
          ],
        },
        {
          id: 'progress',
          title: 'Progress cards',
          blocks: [
            { t: 'p', text: 'Play them on your turn after rolling (the Alchemist, before rolling), as many as you like. You may hold 4: if you get a fifth outside your turn you discard right away; on your turn, when it ends. Point cards go face up as soon as they are drawn.' },
            { t: 'h3', text: 'Science' },
            { t: 'progressCards', track: 'science' },
            { t: 'h3', text: 'Trade' },
            { t: 'progressCards', track: 'trade' },
            { t: 'h3', text: 'Politics' },
            { t: 'progressCards', track: 'politics' },
          ],
        },
        {
          id: 'barbarians',
          title: 'The barbarians',
          blocks: [
            { t: 'fig', id: 'barbarians', caption: 'The ship advances on each ship face; on step 7 it lands.' },
            { t: 'list', items: [
              '**Barbarian strength**: one for each city on the island, metropolises included.',
              '**Defense**: the sum of the levels of all active knights.',
              'If the defense is equal or greater, the defenders win. Whoever contributed most earns a defender point; on a tie, each tied player draws a progress card from the deck of their choice.',
              'If the barbarians win, whoever contributed least among those with non-metropolis cities loses a city: it becomes a settlement again. With no settlements left in supply, the city stays damaged: it counts as a settlement and must be repaired (at the cost of a city) before founding new settlements.',
              'After the attack every knight becomes inactive and the ship returns to the start. After the first attack, the robber enters the board.',
            ] },
          ],
        },
        {
          id: 'knights',
          title: 'Knights',
          blocks: [
            { t: 'costs', rows: [
              { icon: 'knight', label: 'Recruit', cost: { wool: 1, ore: 1 }, note: 'On a free intersection next to your roads. Starts inactive.' },
              { icon: 'activate', label: 'Activate', cost: { grain: 1 } },
              { icon: 'promote', label: 'Promote', cost: { wool: 1, ore: 1 }, note: 'From level 2 to 3 only with politics 3.' },
            ] },
            { t: 'p', text: 'Each player has two knights of each level. An active knight may, once per turn and not on the turn it was activated:' },
            { t: 'list', items: [
              'move along your roads to a free intersection;',
              'displace a weaker opposing knight: its owner moves it to another free intersection on their network, or it goes back to supply;',
              'chase the robber off a tile it touches, moving it as on a 7.',
            ] },
            { t: 'p', text: 'Afterwards it is inactive. Knights break opposing routes and nobody builds on their intersection. A knight cannot be promoted twice in the same turn.' },
            { t: 'fig', id: 'knights', caption: 'Knights of level 1, 2 and 3. The one on the left is inactive.' },
          ],
        },
        {
          id: 'walls',
          title: 'City walls',
          blocks: [
            { t: 'costs', rows: [{ icon: 'wall', label: 'City wall', cost: { brick: 2 }, note: 'On one of your cities.' }] },
            { t: 'p', text: 'Each wall raises your hand limit for a 7 by 2. Each player has 3. If the city is sacked, the wall is lost.' },
          ],
        },
        {
          id: 'points',
          title: 'Points',
          blocks: [
            { t: 'table', head: ['What', 'Points'], rows: [
              ['Settlement', '1'],
              ['City', '2'],
              ['Metropolis', '+2'],
              ['Longest trade route', '2'],
              ['Defender of the island', '1 each'],
              ['Printing Press, Constitution', '1 each'],
              ['Merchant', '1'],
            ] },
          ],
        },
        {
          id: 'ref',
          title: 'Quick reference',
          blocks: [
            { t: 'steps', items: ['Roll all three dice: the event first, then production.', 'Trade and build; play progress cards; use knights.', 'End the turn (with more than 4 progress cards, discard).'] },
            { t: 'costs', rows: [
              { icon: 'road', label: 'Road', cost: { lumber: 1, brick: 1 } },
              { icon: 'settlement', label: 'Settlement', cost: { lumber: 1, brick: 1, wool: 1, grain: 1 } },
              { icon: 'city', label: 'City', cost: { grain: 2, ore: 3 } },
              { icon: 'wall', label: 'City wall', cost: { brick: 2 } },
              { icon: 'knight', label: 'Knight', cost: { wool: 1, ore: 1 } },
              { icon: 'activate', label: 'Activate', cost: { grain: 1 } },
              { icon: 'promote', label: 'Promote', cost: { wool: 1, ore: 1 } },
            ] },
          ],
        },
      ],
    },

    combo: {
      id: 'combo',
      title: 'Open Sea with Guilds',
      summary: 'Both expansions together: ships and knights, gold and commodities, the pirate and the barbarians.',
      meta: ['3–6 players', '2 to 3 hours', 'Goal: the scenario’s + 2'],
      sections: [
        {
          id: 'rules',
          title: 'How they combine',
          blocks: [
            { t: 'p', text: 'Use every rule of Open Sea and of Guilds & Guardians, with these adjustments:' },
            { t: 'list', items: [
              'The scenario goal goes up by 2 points (Outer Isles, for example: 15).',
              'Knights also move along your ships and can chase the pirate from an intersection next to its tile.',
              'A gold field gives only resources, cities included: a city picks 2.',
              'The merchant cannot go on a gold field.',
              'Before the first barbarian attack, a 7 moves neither the robber nor the pirate.',
              'The Road Crew allows ships; the Diplomat removes roads only.',
              'Your own knight at the end of a ship route closes it: that ship can no longer be moved.',
            ] },
          ],
        },
      ],
    },

    shires: {
      id: 'shires',
      title: 'Hinterlands',
      summary: 'Variants and scenarios for the base island: harbors that bring prestige, a chronicle deck instead of dice, rules for two, and scenarios with fishing, rivers, caravans, a raid from the sea and trading wagons.',
      meta: ['2–6 players', '60–120 minutes', 'Goal: 10 to 13 by scenario'],
      sections: [
        {
          id: 'about',
          title: 'What it adds',
          blocks: [
            { t: 'p', text: 'Hinterlands gathers rules that add to the base game. The **variants** (Wharf Lord, chronicle deck, duel) combine freely; the Wharf Lord also works with Open Sea and with Guilds. The **scenarios** change the island and are played one at a time, also with the Wharf Lord and the chronicle deck.' },
          ],
        },
        {
          id: 'harbor',
          title: 'Wharf Lord',
          blocks: [
            { t: 'list', items: [
              'A settlement on a harbor is worth 1 harbor point; a city, 2. A building counts once even if it touches two harbors.',
              'The first to reach 3 harbor points becomes Wharf Lord and earns 2 victory points.',
              'To take the title you need more harbor points than the holder.',
              'The goal goes up by 1 point: 11 on the base island.',
            ] },
            { t: 'fig', id: 'harbors', caption: 'Two settlements on harbors: 2 harbor points. A city on either one makes it 3.' },
          ],
        },
        {
          id: 'chronicle',
          title: 'Chronicle deck',
          blocks: [
            { t: 'p', text: 'Instead of rolling, the active player draws a card. There are 36 cards with numbers in the same proportion as two dice (one 2, two 3s, and so on up to six 7s), so in every pass through the deck each number comes up as often as it should.' },
            { t: 'p', text: 'The new year card hides 5 cards above the bottom: when it comes up, everything is reshuffled and another card is drawn. That way nobody can count down the last cards.' },
            { t: 'fig', id: 'chronicle', caption: 'Some cards carry an event on the bottom band. Sevens are red.' },
            { t: 'p', text: 'Twenty cards carry an event, resolved before production:' },
            { t: 'table', head: ['Event', 'Number', 'What happens'], rows: [
              ['Bumper year', '2', 'Every player takes a resource of their choice from the bank.'],
              ['Feud', '3', 'Whoever played the most soldiers (no tie) steals a card from anyone they choose.'],
              ['The robber hides', '4 (two cards)', 'The robber goes back to the desert.'],
              ['Tournament', '5', 'Whoever played the most soldiers takes a resource of their choice.'],
              ['Tailwind', '5', 'The holder of the longest trade route steals a card from anyone they choose.'],
              ['Earthquake', '6', 'Everyone damages one of their roads: it does not count toward the route and no new roads can be built until it is repaired (lumber and brick).'],
              ['Good neighbors', '6', 'Everyone gives one resource to the next player.'],
              ['Plague', '6 and 8', 'For this production, cities yield like settlements.'],
              ['The robber strikes', '7 (six cards)', 'An ordinary 7: discards, the robber and a steal.'],
              ['Calm sea', '9 and 12', 'Whoever has buildings on the most harbors takes a resource of their choice.'],
              ['Helping hand', '10 and 11', 'The points leader gives one resource to someone with fewer points.'],
            ] },
            { t: 'note', text: 'It cannot be combined with Guilds & Guardians, which needs its three dice.' },
          ],
        },
        {
          id: 'duel',
          title: 'Duel (2 players)',
          blocks: [
            { t: 'p', text: 'For two-player games on the base island. Two neutral colors join the table without playing: they take up space, break routes and fill the island as a four-player game would.' },
            { t: 'list', items: [
              '**Neutrals**: at the start each gets two settlements with a road in random spots. They produce nothing, hold no cards and win no awards.',
              'Every time you build a road, you also build one for a neutral, wherever you like as long as it joins its network. Every time you found a settlement, you found one for a neutral; if there is no room, you give it a road.',
              '**Two rolls**: each turn the dice are rolled twice and both rolls produce. The second must give a different number from the first.',
              '**Trade tokens**: each player starts with 5 (there are 20 in all). Once per turn you can spend them on a **forced trade** (take 2 random cards from your rival and give back 2 of your choice) or to send the **robber to the desert**. It costs 1 token if you are level or behind on points and 2 if you are ahead.',
              'You earn tokens by founding settlements: 1 on the coast, 2 next to the desert, 3 for both. You can also return a played soldier for 2 tokens.',
            ] },
          ],
        },
        {
          id: 'fishers',
          title: 'Scenario: Fishing Waters',
          blocks: [
            { t: 'p', text: 'The desert becomes a lake in the middle of the island, and six fishing grounds numbered 4 to 10 line the coast (eight with 5 or 6 players). The robber starts on the lake. Goal: 10 points.' },
            { t: 'fig', id: 'fishers', caption: 'A 9 is rolled: the settlement by the fishing ground draws a token. The city by the lake fishes on 2, 3, 11 and 12.' },
            { t: 'list', items: [
              '**Fishing**: when a fishing ground’s number comes up, each settlement on its three intersections draws a token from the pile; each city draws two. The lake fishes on 2, 3, 11 and 12 for the buildings around it, unless the robber is on it.',
              'Tokens are worth 1, 2 or 3 fish and stay face down: the others only see how many you hold. They are not cards, so they do not count on a 7 and cannot be stolen. You may hold up to 7.',
              'During setup, the second settlement next to a fishing ground or the lake draws a token.',
              '**Spending**, on your turn and with no change given: 2 fish take the robber off the board until the next 7; 3 steal a random resource from anyone you choose; 4 bring a resource from the bank; 5 a free road; 7 a development card. Spent tokens go back into the pile.',
              '**The old boot** hides in the pile. Whoever draws it needs one more point to win; on their turn they may pass it to someone with as many visible points or more.',
            ] },
          ],
        },
        {
          id: 'rivers',
          title: 'Scenario: Golden Rivers',
          blocks: [
            { t: 'p', text: 'Two rivers (three with 5 or 6 players) run from the interior to the sea. Two swamps (three with 5 or 6 players) replace the desert and a pasture: they produce nothing, and the robber starts in one. Goal: 10 points.' },
            { t: 'fig', id: 'rivers', caption: 'The bridge crosses the river and earns 3 coins; the riverside settlement earned 1.' },
            { t: 'list', items: [
              'No road crosses a river: on the edges where the water runs only a **bridge** fits (2 brick and 1 lumber). A bridge counts as a road and earns **3 coins**. Each player can build 3.',
              'A road along a riverbank, or a settlement next to a river, earns **1 coin**.',
              'On your turn you may trade **2 coins for a resource** of your choice, up to twice. You can also buy a coin with cards, at your bank or harbor rate.',
              'Coins are not cards. Whoever has the most, with no tie, gains **1 point**; those with the fewest lose **2**. If everyone has the same, nobody gains or loses.',
            ] },
          ],
        },
        {
          id: 'caravans',
          title: 'Scenario: Camel Road',
          blocks: [
            { t: 'p', text: 'An oasis sits in the middle, and three caravans set out from it. Goal: 12 points.' },
            { t: 'fig', id: 'caravans', caption: 'The settlement between two camels is worth a point more.' },
            { t: 'list', items: [
              'After a turn in which someone founded a settlement or built a city, there is a **vote** at the start of the next one: everyone secretly offers wool and grain cards (each card is one vote). The highest offer wins; on a tie, the first from the active player on. Everyone pays what they offered.',
              'The winner places a **camel** at the end of a caravan, on a land edge, without turning back to the oasis or crossing another caravan. There are 22 camels (28 with 5 or 6 players).',
              'Each building on an intersection between **two camels** is worth **1 point more**.',
              'A road under a camel counts **double** toward the longest trade route.',
            ] },
          ],
        },
        {
          id: 'raid',
          title: 'Scenario: Raid on the Coast',
          blocks: [
            { t: 'p', text: 'A castle stands on the edge of the island, with the desert beside it. The other edge hexes form the coast, with each number from 2 to 12 once (with 5 or 6 players, four repeat). There is no robber. Goal: 12 points.' },
            { t: 'fig', id: 'raid', caption: 'Three barbarians have taken the 10: it produces nothing and the city on its shore doesn’t count. On the 5, three knights beat two barbarians when the turn ends.' },
            { t: 'list', items: [
              'During setup your second piece is a **city**. At the start, one barbarian already waits on the 2 and another on the 12.',
              '**Landing**: every time someone founds a settlement or builds a city, roll the dice three times, never repeating a number and rerolling 7s. For each number a barbarian lands on the coastal hex with that number (if there are two, on the one with fewer). There are 30 barbarians (40 with 5 or 6 players); once they run out, no more land.',
              'With **three barbarians** a hex is **taken**: it produces nothing, receives no more barbarians, and no settlements or roads can be built next to it. A building whose land hexes are all taken scores no points and can’t use its harbor while that lasts.',
              '**Cards** cost the usual and take effect as soon as you buy them. **Knighting** (14) places one of your knights on a free edge next to the castle; **swift knight** (4), on any free edge; **intrigue** (4) takes one barbarian from the coast as your prisoner; **treason** (4) gives 2 gold and moves two barbarians to other coastal hexes that aren’t taken. The deck is reshuffled when it runs out.',
              '**Knights**: everyone has 6. On your turn each knight may move once, up to 3 edges or up to 5 for one grain, without ending on an occupied edge or next to the castle. You can’t end your turn with a knight next to the castle if it can leave.',
              '**Battle**: at the end of your turn, on every coastal hex with barbarians, count the knights on its six edges, in any color. If they outnumber the barbarians, they win: each barbarian becomes the prisoner of a player with knights there, one at a time, starting with whoever has the most; extras go to that same player, and anyone left without one gets 3 gold. Then a die picks a pair of opposite edges: the knights there go back to their owners, who get 3 gold each.',
              'Every **two prisoners** are worth **1 point**.',
              '**Gold** is not a resource: it isn’t discarded on a 7 and can’t be stolen. On your turn 2 gold buys a resource of your choice, up to twice; and 4 matching cards (3 with a 3:1 harbor) trade for 1 gold.',
              'On a 7, discard as usual, and whoever rolled draws a card from anyone they like.',
            ] },
          ],
        },
        {
          id: 'traders',
          title: 'Scenario: Wagons and Tolls',
          blocks: [
            { t: 'p', text: 'There is no desert: three markets stand on the coast (six with 5 or 6 players), the castle, the quarry and the glassworks, and they produce nothing. With fewer hexes, the 2 and 12 number tokens are left out. There is no robber and no award for the longest trade route. Goal: 13 points.' },
            { t: 'fig', id: 'traders', caption: 'The red wagon is taking marble to the castle. On its own road each edge costs 1 movement and across country 2; on the blue road it pays 1 gold in tolls, and the barbarian makes its edge dearer.' },
            { t: 'list', items: [
              'During setup your second piece is a **city**, and your **wagon** starts there. Everyone starts with 5 gold.',
              '**Goods**: each market has a stack with two kinds of goods, and the top one is visible. The castle supplies tools and sand; the quarry, marble and sand; the glassworks, glass and tools. Marble and glass go to the castle, tools to the quarry and sand to the glassworks.',
              '**Travel**: on your turn, after rolling, the wagon spends its movement edge by edge: 2 without a road and 1 along a road. For each edge of someone else’s road you pay its owner 1 gold; without gold you can’t pass. A barbarian on the edge costs 2 more. Once per turn, 1 grain gives 2 more movement.',
              '**Loading and delivering**: if the wagon is empty and ends on an intersection of a market with goods, it loads the top one. If it carries goods and ends at a market of their destination, it delivers them: you earn **1 point** and your level’s gold, and load the next goods of that market. After loading or delivering, the wagon stays put until your next turn.',
              '**Levels**: the wagon starts at level 1 and moves up by paying resources (table). The level sets movement, gold per delivery and the chance to drive off barbarians; level 5 is worth 1 point. New movement applies from your next turn.',
              '**Barbarians**: three stand on edges (four with 5 or 6 players). On a 7, after discarding, whoever rolled moves one to any free edge; if it lands on someone else’s road, they draw a card from its owner. From level 2 your wagon may try to drive off a barbarian on an edge of its intersection: roll a die and, if it shows one of your level’s numbers, move it wherever you like (without drawing). Once per barbarian per turn.',
              '**Cards**: the scenario’s own deck has 15 knights (they move a barbarian like a 7, card included), 3 road building, 3 fast haul (the wagon gets all its movement back, even after delivering) and 3 victory points. One per turn, as usual. With 5 or 6 players there are more.',
              '**Gold** is not a resource, so it is never discarded or stolen. On your turn, 2 gold buys a resource of your choice (up to twice), and 4 matching cards (3 with a 3:1 harbor) trade for 1 gold.',
            ] },
            { t: 'table', head: ['Level', 'To move up', 'Movement', 'Gold per delivery', 'Drives off on'], rows: [
              ['1', '—', '4', '1', '—'],
              ['2', '1 lumber, 1 wool and 1 grain', '5', '2', '6'],
              ['3', '1 lumber, 1 brick and 1 ore', '6', '2', '5 or 6'],
              ['4', '1 wool, 1 grain and 2 ore', '7', '3', '4 to 6'],
              ['5', '2 brick, 1 grain and 2 ore', '7', '4', '3 to 6 (and worth 1 point)'],
            ] },
          ],
        },
      ],
    },
  },

  app: [
    {
      id: 'online',
      title: 'Playing online',
      blocks: [
        { t: 'steps', items: [
          'Type your name and tap **Create a room**. The game runs in your browser: a computer with the tab left open works best.',
          'Tap **Copy link** and send it. Whoever opens it types a name and shows up in the room.',
          'Choose the version and settings, add bots if you are short of players and tap **Start game**.',
        ] },
        { t: 'p', text: 'If someone loses their connection, they open the same link again and get their seat back. If the host closes the tab, the game stays saved in their browser and **Resume room** appears with the same code next time.' },
      ],
    },
    {
      id: 'local',
      title: 'On a single device',
      blocks: [
        { t: 'p', text: 'With **Play on this device** you pass the phone or computer around: before each turn a screen appears so nobody sees anyone else’s hand. You can also play against bots.' },
      ],
    },
  ],
};

export default book;
