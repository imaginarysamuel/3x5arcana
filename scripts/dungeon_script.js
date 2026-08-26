// dungeon_script.js
// Extracted from 3x5Tomb_Beta_0_14.html for integration into dungeon.html.
//
// CONFLICT RESOLUTION:
//   - toggleCard(id): Prototype calls toggleCard('clusterIdx-roomId') with a string ID.
//     list_script.js defines toggleCard(card) with a DOM element. This file redefines
//     toggleCard to handle the string-ID calling convention used by dungeon.html.
//     list_script.js's version is never called on dungeon.html, so the override is safe.
//   - All other functions are dungeon-specific and do not conflict with shared scripts.
//
// Phase 4: printCluster(clusterIdx, extraCards) — implemented at bottom of file.

// ── HELPERS ───────────────────────────────────────────────────────────────────

// fmtContent: bolds the item name up to the first period.
// If no period exists, bolds the whole string and appends one.
function fmtContent(str) {
  if (!str) return '';
  const s = str.trim().replace(/^<b>[^<]*<\/b>\s*(<span[^>]*>\s*<\/span>)?\s*/, '');
  const cap = s.charAt(0).toUpperCase() + s.slice(1);
  const periodIdx = cap.indexOf('.');
  if (periodIdx === -1) {
    return `<b>${cap}.</b>\u00A0`;
  }
  const boldPart = cap.slice(0, periodIdx + 1);
  const rest = cap.slice(periodIdx + 1).trimStart();
  return rest ? `<b>${boldPart}</b>\u00A0${rest}` : `<b>${boldPart}</b>\u00A0`;
}

// Reads innerHTML preserving <b> tags, strips everything else including &nbsp;
function cleanHTML(el) {
  if (el.tagName === 'INPUT') return el.value.trim();
  return el.innerHTML
    .replace(/<span[^>]*>\s*<\/span>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<(?!\/?(b)>)[^>]+>/g, '')
    .trim();
}

// ── TABLES ────────────────────────────────────────────────────────────────────

const ROOM_TYPE_TABLE = [
  'Abbatoir','Animal Pen','Armory','Bakery','Cabinets','Cavern',
  'Tunnel','Cistern','Clothier','Courtyard','Drug Den','Workshop',
  'Gallery','Game Room','Guard Room','Jail','Kitchen','Laboratory',
  'Labyrinth','Latrine','Library','Mechanical Room','Torture Chamber','Mill',
  'Mine','Mushroom Farm','Nursery','Observatory','Orrery','Quarters',
  'Sacresty','Shrine','Storeroom','Tomb','Bridge','Warren',
];

const ROOM_FEATURE_TABLE = [
  'A recent campsite','Altar','Barrels and Crates','Blood Stains','Bones','Brewing Equipment',
  'Chains','Chalk Markings','Collapsing Wall','Misty','Crystal Growth','Dead Adventurer',
  'Dice','Eggs','Food Scent','Fragmentary map on the wall','Furnishings','Glowing Fungus',
  'Herbs','Humble Tools','Impossible Vegetation','Lewd Graffiti','Obscure Writings','Sacred Art',
  'Scrawled Warning',"Scribe's desk, with equipment",'Secret Exit','Sewing tables, a loom, spinning wheels','Sofa','Tapestry',
  'Throne','Trap Door','Underground River','Wall Carvings','Waterfall or Fountain','Wrecked Furniture',
];

const ROOM_SHAPE = ['Dead End','Passage','Fork','Crossroads','Tower','Hall'];
const ROOM_SIZE  = ['Close','Near','Near','Near','Double Near','Far'];

const ENC_TYPES = [
  null,
  {name:'Social',          cls:'enc-social',      kind:'social'},
  {name:'Clue',            cls:'enc-clue',         kind:'clue'},
  {name:'Trap',            cls:'enc-trap',          kind:'trap'},
  {name:'Obstacle',        cls:'enc-obstacle',      kind:'obstacle'},
  {name:'Obstacle & Boon', cls:'enc-opportunity',   kind:'opportunity'},
  {name:'Trap & Boon',     cls:'enc-trapboon',      kind:'trapboon'},
];

const SCORE_TABLE = [
  null, null, null,
  'Cursed or Haunted',
  'Breaking or Broken',
  'Wet or Underwater',
  'Horrifying or Awful',
  'Derelict or Empty',
  'Loud or Bright',
  'Incomplete or Wrong',
  'Changing or Changed',
  'Hungry or In Need',
  'Clean or Perfect',
  'Filthy or Loathsome',
  'Stinking or Slimy',
  'Deceiving or Unreal',
  'Dead or Dying',
  'Impossible or Magical',
  'Blessed or Holy',
];

const SOCIAL_TABLE = [
  'Fighting','Arguing','Chasing','Murdering','Cursing','Guarding',
  'Destroying','Defacing','Mourning','Giving up','somewhere else','Robbing',
  'Bargaining','Begging','Weeping','Dying','Escaping','Sacrificing',
  'Collecting','Organizing','Learning','Planning','left alone','Building',
  'Sleeping','Eating','Cooking','Mending','Tending','Trading',
  'Celebrating','Laughing','Pretending','Competing','Making Out','Sleeping',
];

const CLUE_TABLE = [
  'a burning scent','a rotting scent','a food scent','a dung scent','a vegetal scent','a moldy scent',
  'something recently placed','something recently broken','something recently removed or obviously missing','something exactly like something else in another room','something that can\'t be understood without seeing something in another room','something that belongs in another room',
  'a sound like footsteps','a sound like scraping','a sound like a thud','a sound like metal clanging','a sound like voices','a sound like shouting, or singing',
  'something written','a set of tracks','an obvious sign of struggle','a claw or weapon mark','a strange symbol','a key',
  'something wet','something slimy or oily for some reason','something still hot','something colder than it should be','something that should be locked','something floating or suspended',
  'something out of context','something from another age or culture','something old','something new','something borrowed','something blue',
];

const STATS = ['STR','DEX','CON','INT','WIS','CHA'];

const BOON_TABLE = [
  'Knucklebones','Broken Weapon','Weapon in good repair','Armor Item','Musical Instrument','Dungeon denizen clothing or armor',
  'A barrel of salted meat','d4 rations in good order','1d4 gear items','Shield','Empty Sack','2d20 silver',
  'Gold Medallion','Jewelry','Book','d4 torches','lantern','Gems',
  'filler boon','Art Object','A map!','Gold!','Silver!','filler boon',
  'Blessing: Luck Token','Blessing: Healing','Blessing: Omen','filler boon','filler boon','filler boon',
  'Potion','Potion','Spell Scroll','Spell Scroll','Durable Magic item','Durable Magic item',
];

const OBSTACLE_TABLE = [
  'A river runs through it','A Yawning Chasm blocks your path, too wide to jump.','Anything that stays in this room will quickly get full of lice.','Choking Dust. Easily stirred up','Cliff Face (must be traversed to progress.)','Flooded',
  'Heavily Trafficked Room','Hot Beverage. It\'s clear someone will be back very soon.','Laughing Gas','Magnietic Field. Metal can\'t pass through this room.','Noxious Stench','Contagious Disease. There is an obvious source.',
  'Opening the door to this room dislodges an unstable shelf full of glass. The shattering sound is very loud.','Sticky ooze covers everything','The floor is a Bounce-House','The floor is lava.','The Floor is magically frictionless.','The floor is sharp.',
  'The floor isn\'t real: Hallucinatory Terrain','Weak Floor','Whispers. Staying here will slowly drive you mad.','Wind Tunnel','Very Cold','Very Hot',
  'Crushing','Thick Fog','Smoke','Heavy Stone Door','Regenerating Severed Troll Leg','Angry Prisoner',
  'Evil Runes','Memory Loss','Magical Silence','Magical Darkness','Rubble blocks one exit. It will take an hour without tools to clear.','Inexplicably, it is raining in this room. Equipment will be soaked unless precautions are taken.',
];

const TRAP_TABLE = [
  'Open pit onto deadly spikes. Both sides of the pit are sloped into it and greased up.','Concealed pit into piranha-filled water.','Metal sword audibly humming, hooked up to electric charge.','Green Devil Face with gaping mouth. Anything going into the mouth is annihilated.','A fishing rod propped up and cast into a lake. The rod is covered in fast-acting glue and tension on the line triggers a springboard beneath the victim, casting them into the lake.','A column of light. When a being enters they are frozen, and an evil duplicate of them is conjured. The victim is only freed when the duplicate is killed.',
  'Walls dotted with arrow-slots. Any movement in front of them fires the arrow, but each hole only has one arrow.','Upside-down spiked pit on the ceiling. Gravity is reversed under the pit.','Clusters of bright orange fungus growing on one or more corpses. Any disturbance triggers a deadly spore explosion.','Glass vials of green slime hung from a ceiling, a guard with a crossbow watching from behind a barricade.','Two panes of glass blocking passage, filled with deadly bugs.','Shimmering, thick air that slows all movement down to a quarter of normal. Guards with missile weapons waiting around the corner.',
  'Glossy, friction-less floor and spiked walls.','A metal room filled with crushed remains, visible moving parts to floor, and a sealed door leading forward. Two buttons. One opens the door, the other seals all doors and commences the crushing process.','A peephole blocked up with glass fragments. Breaking the fragments releases a toxic gas.','Giant chomping blade that must be passed through to progress. Visible pressure plate on either side. Blades are triggered when a pressure plate is released, unless the other plate is also depressed. Going slow poses no risk.','Stuck door with a gold snake-head handle. The handle will bite and poison anybody putting their hand near, unless they slip a coin into its mouth, allowing safe passage through the door.','Disguised springboard, launching the victim straight up into the air. There is a hanging bar they can grab to avoid the fall, but weight on the bar triggers the release of giant spiders onto it, and rained down onto anyone below.',
  'Room dusted with a deadly white powder. Any rapid movement disturbs the powder, sending it into the air and then the lungs of anybody breathing nearby. Hidden pressure plate in the center of the room triggers a loud siren, alerting any nearby threats.','Locked door, key visible in a stinky fountain. The liquid is fast-acting acid, the key made from a special resistant ceramic.','Rope bridge primed to split in the middle when the majority of the crossing weight has passed the mid-point. The characters can grab their half of the bridge and climb back up easily enough.','Damp, underwater tunnel with glowing treasure at a visible dead end. A pressure plate halfway through triggers flooding of the tunnel. A normal human could get back to the tunnel exit with breath to spare, but not if they try to grab the treasure first.','Two doors in sequence. First sprays anybody passing through with highly flammable liquid. Second spits out a flash of flame, harmless on its own but enough to ignite the liquid.','Sloped walkway in a freezing cold room. Pressure plate halfway up releases a flood of water down the slope, freezing near instantly.',
  'Haunted pots, audible screaming within, placed on wobbly plinths on an uneven floor. Any sort of weight on the floor is sure to release at least one angry wraith.','Pool of lava, a metal idol partially submerged in the center. It\'s glowing hot, but valuable.','Big metal skull with a gem in its open, toothy mouth. Obviously it bites anything put inside.','Quicksand, just like in cartoons.','Giant spider lair, huge boulders suspended in the highest webs. Too much disturbance might release a boulder, fire will definitely release them all.','Bear trap. Something is trapped in it.',
  'Sealed door with two identical handles on the adjacent wall. One releases snakes from above, the other opens the door.','Hidden jet spraying you with disgusting smelling liquid. Not harmful in itself, but might attract scent-based creatures or warn inhabitants that you\'ve been poking around where you shouldn\'t have.','Pressure plate triggers part of the floor to move down, slowly transporting the victim into the now-visible lair of a horrible monster.','Giant cauldron filled with treasure. Any weight added to the cauldron causes the lid to slam shut and a fire to spark to life underneath it.','Long access ladder, wasp-nest visible - and audible - halfway down.','Room where gravity is reversed for every second entrant. Ceiling by the door is cushioned, but the ladder is out.',
];

// Monster tables: 12 environments, each 36 entries (d66)
const MONSTER_TABLES = {
  'Standard': ['Animated Armor', 'Bandit', 'Beastman', 'Cave Brute', 'Cave Creeper', 'Cloaker', 'Cultist', 'Darkmantle', 'Dragon, Fire', 'Dung Beetle, Giant', 'Gelatinous Cube', 'Gnome, Deep', 'Goblin', 'Golem, Stone', 'Gray Ooze', 'Grick', 'Hag, Weald', 'Hobgoblin', 'Kobold', 'Mimic', 'Naga, Bone', 'Ochre Jelly', 'Ogre', 'Owlbear', 'Purple Worm', 'Roper', 'Shadow', 'Skeleton', 'Spider, Giant', 'Spider, Swarm', 'Stingbat', 'Strangler', 'The Wandering Merchant', 'Troll', 'Violet Fungus', 'Will-O\'-Wisp'],
  'Cave': ['Ankheg','Bat, Giant','Bat, Swarm','Brain Eater','Bulette','Cave Brute','Cave Creeper','Centipede, Giant','Centipede, Swarm','Cloaker','Darkmantle','Dragon, Forest','Drow, Drider','Duergar','Ettercap','Gelatinous Cube','Ghoul','Goblin','Goblin, Boss','Goblin, Shaman','Gray Ooze','Grick','Kobold','Kobold, Sorcerer','Manticore','Mushroomfolk','Ochre Jelly','Orc','Roper','Spider, Giant','Spider, Swarm','Stingbat','The Wandering Merchant','Troll','Violet Fungus','Wyvern'],
  'Tomb': ['Acolyte','Angel, Seraph','Animated Armor','Assassin','Black Pudding','Dragon, Forest','Ghast','Ghost','Ghoul','Golem, Flesh','Golem, Iron','Golem, Stone','Lich','Mage','Mimic','Mummy','Naga, Bone','Oni','Rat','Rat, Dire','Rat, Swarm','Scarab, Swarm','Shadow','Skeleton','Spider, Giant','Spider, Swarm','Stingbat','The Wandering Merchant','Vampire','Vampire Spawn','Violet Fungus','Wererat','Wight','Wraith','Zombie','The Wandering Merchant'],
  'Deep Tunnels': ['Bat, Giant','Beastman','Brain Eater','Cave Brute','Centipede, Giant','Centipede, Swarm','Cloaker','Darkmantle','Deep One','Dragon, Forest','Drow','Drow, Drider','Drow, Priestess','Duergar','Gelatinous Cube','Gibbering Mouther','Gnome, Deep','Goblin','Gray Ooze','Grick','Hell Hound','Mimic','Minotaur','Mushroomfolk','Naga, Bone','Ochre Jelly','Outsider, Primordial Slime','Outsider, Void Spawn','Outsider, Void Spider','Purple Worm','Roper','Spider, Giant','Stingbat','Strangler','The Ten-Eyed Oracle','Violet Fungus'],
  'Ruins': ['Animated Armor','Bandit','Beastman','Cave Creeper','Cultist','Darkmantle','Dragon, Forest','Dryad','Dung Beetle, Giant','Ettercap','Gargoyle','Gelatinous Cube','Gnome, Deep','Goblin','Golem, Stone','Grick','Hag, Weald','Hobgoblin','Kobold','Mimic','Minotaur','Ogre','Owlbear','Rust Monster','Skeleton','Spider, Swarm','Stingbat','Strangler','The Wandering Merchant','Thug','Vampire','Wasp, Giant','Wight','Zombie','Zombie','Zombie'],
  'Desert': ['Ankheg','Bandit','Basilisk','Berserker','Bulette','Centaur','Cockatrice','Dragon, Forest','Efreeti','Elemental, Fire','Elf','Gladiator','Golem, Iron','Harpy','Hobgoblin','Kobold, Sorcerer','Lion','Lizardfolk','Mage','Manticore','Mummy','Naga, Bone','Peasant','Phoenix','Purple Worm','Rust Monster','Salamander','Scarab, Swarm','Scorpion, Giant','Shadow','Snake, Cobra','Sphinx','Stingbat','The Wandering Merchant','Vulture','Stingbat'],
  'Forest': ['Badger','Bear, Brown','Boar','Cave Creeper','Centaur','Centipede, Swarm','Cockatrice','Dragon, Forest','Dragon, Forest','Druid','Dryad','Elf','Fairy','Frog, Giant','Giant, Hill','Goblin','Hag, Weald','Hag, Weald','Knight','Kobold','Leprechaun','Ogre','Orc, Chieftain','Otyugh','Owlbear','Panther','Rot Flower','Shambling Mound','Snake, Giant','Spider, Giant','Stingbat','The Wandering Merchant','Treant','Troll','Unicorn','Violet Fungus'],
  'Grassland': ['Angel, Principi','Ankheg','Bandit','Basilisk','Berserkers','Boar','Bugbear','Centaur','Chimera','Cyclops','Dinosaur, Tyrannosaurus','Dinosaur, Velociraptor','Dragon, Forest','Druid','Dung Beetle, Giant','Elephant','Gnoll','Golem, Stone','Griffon','Hippogriff','Horse','Kobold','Lion','Mammoth','Orc','Peasant','Pegasus','Rhinoceros','Rhinoceros','Roc','Smilodon','Stingbat','The Wandering Merchant','Wyvern','Wyvern','Stingbat'],
  'Jungle': ['Ape','Basilisk','Berserker','Centipede, Giant','Couatl','Crocodile','Dinosaur, Brachiosaurus','Dinosaur, Pterodactyl','Dinosaur, Tyrannosaurus','Dinosaur, Velociraptor','Dragon, Forest','Drow','Drow, Drider','Druid','Dryad','Fairy','Frog, Giant','Gorilla','Hippopotamus','Kobold','Lizardfolk','Medusa','Mushroomfolk','Naga','Panther','Piranha (Swarm)','Piranha, Swarm','Shambling Mound','Snake, Giant','Sphinx','Stingbat','The Wandering Merchant','Treant','Troll','Viperian, Ophid','Zombie'],
  'Mountain': ['Ape, Snow','Bandit','Bat, Swarm','Berserker','Cockatrice','Cyclops','Dragon, Fire','Duergar','Ettercap','Giant, Fire','Giant, Frost','Goblin','Golem (Clay)','Griffon','Harpy','Hobgoblin','Knight','Kobold','Mage','Manticore','Minotaur','Ogre','Orc','Orc, Chieftain','Pegasus','Phoenix','Rathgamnon','Reaver','Roc','Salamander','Smilodon','Stingbat','The Wandering Merchant','Troll','Will-O\'-Wisp','Wyvern'],
  'River and Coast': ['Aboleth','Ape','Basilisk','Black Pudding','Chuul','Crab, Giant','Crocodile','Crocodile','Dinosaur, Plesiosaurus','Dragon (Sea)','Elephant','Fairy','Frog, Giant','Gladiator','Goblin','Hag, Sea','Hippopotamus','Horse','Hydra','Jellyfish','Kobold','Leech, Giant','Lizardfolk','Manta Ray, Giant','Merfolk','Octopus, Giant','Piranha, Swarm','Pirate','Sahuagin','Siren','Snake, Giant','Stingbat','The Wandering Merchant','Treant','Wasp, Giant','The Wandering Merchant'],
  'Temple': ['Acolyte','Angel, Domini','Angel, Seraph','Animated Armor','Archmage','Assassin','Bandit','Cultist','Demon, Balor','Demon, Dretch','Demon, Marilith','Demon, Vrock','Devil, Barbed','Devil, Erinyes','Doppelganger','Dragon, Forest','Elemental, Fire','Gargoyle','Ghost','Golem, Clay','Golem, Stone','Guard','Invisible Stalker','Knight','Kobold, Sorcerer','Mage','Medusa','Naga','Naga, Bone','Oni','Priest','Rakshasa','Shadow','Skeleton','Stingbat','The Wandering Merchant'],
};

const ENVIRONMENT_NAMES = Object.keys(MONSTER_TABLES);

// ── Spark helpers ─────────────────────────────────────────────────────────────

function getSparks(id) {
  return [...document.querySelectorAll(`#${id} input`)]
    .map(i => i.value.trim()).filter(Boolean);
}

function sparkOrTable(sparks, table, d1, d3) {
  if (sparks.length > 0) return sparks.shift();
  const idx = (d1 - 1) * 6 + (d3 - 1);
  return table[idx] || '—';
}

// ── Dice ──────────────────────────────────────────────────────────────────────

function d6() { return Math.floor(Math.random() * 6) + 1; }

// ── Build rooms ───────────────────────────────────────────────────────────────

function buildRooms(sparks, environment) {
  const rolls = Array.from({length: 6}, () => [d6(), d6(), d6()]);
  const rooms = [];

  const towerRolls = rolls.filter(r => r[0] === 5);
  const hallRolls  = rolls.filter(r => r[0] === 6);
  const regular    = rolls.filter(r => r[0] >= 1 && r[0] <= 4);

  for (const [d1, d2, d3] of regular) {
    const sum = d1 + d2 + d3;
    const rtIdx = (d2 - 1) * 6 + (d3 - 1);
    const rfIdx = (d3 - 1) * 6 + (d1 - 1);
    const encType = ENC_TYPES[d3];
    const size = ROOM_SIZE[d2 - 1];
    const scoreDesc = SCORE_TABLE[sum] || '';

    let encContent = '', obstacleContent = '', boonContent = '';
    if (encType.kind === 'social') {
      encContent = sparkOrTable(sparks.socials || [], SOCIAL_TABLE, d1, d2);
    } else if (encType.kind === 'clue') {
      encContent = sparkOrTable(sparks.clues || [], CLUE_TABLE, d1, d2);
    } else if (encType.kind === 'obstacle') {
      encContent = sparkOrTable(sparks.obstacles, OBSTACLE_TABLE, d1, d2);
    } else if (encType.kind === 'trap') {
      encContent = sparkOrTable(sparks.traps, TRAP_TABLE, d1, d2);
    } else if (encType.kind === 'boon') {
      encContent = sparkOrTable(sparks.boons, BOON_TABLE, d1, d2);
    } else if (encType.kind === 'opportunity') {
      obstacleContent = sparkOrTable(sparks.obstacles, OBSTACLE_TABLE, d1, d2);
      boonContent     = sparkOrTable(sparks.boons, BOON_TABLE, d1, d2);
    } else if (encType.kind === 'trapboon') {
      encContent  = sparkOrTable(sparks.traps, TRAP_TABLE, d1, d2);
      boonContent = sparkOrTable(sparks.boons, BOON_TABLE, d1, d2);
    }

    let monster = '';
    if (sum >= 14) {
      const monTable = MONSTER_TABLES[environment] || MONSTER_TABLES['Cave'];
      const mIdx = (d1 - 1) * 6 + (d2 - 1);
      monster = sparks.monsters.shift() || monTable[mIdx] || '—';
    }

    rooms.push({
      kind: 'room', d1, d2, d3, sum, face: d1,
      scoreDesc,
      roomType: sparks.roomTypes.shift() || (ROOM_TYPE_TABLE[rtIdx] || 'Chamber'),
      roomFeature: sparks.features.shift() || (ROOM_FEATURE_TABLE[rfIdx] || '—'),
      encType, encContent, obstacleContent, boonContent,
      size, monster,
    });
  }

  // Tower: one card per floor
  if (towerRolls.length > 0) {
    const floors = towerRolls.map(([d1, d2, d3]) => {
      const sum = d1 + d2 + d3;
      const encType = ENC_TYPES[d3];
      const size = ROOM_SIZE[d2 - 1];
      const scoreDesc = SCORE_TABLE[sum] || '';
      let encContent = '', obstacleContent = '', boonContent = '';
      if (encType.kind === 'social') encContent = sparkOrTable(sparks.socials || [], SOCIAL_TABLE, d1, d2);
      else if (encType.kind === 'clue') encContent = sparkOrTable(sparks.clues || [], CLUE_TABLE, d1, d2);
      else if (encType.kind === 'obstacle') encContent = sparkOrTable(sparks.obstacles, OBSTACLE_TABLE, d1, d2);
      else if (encType.kind === 'trap') encContent = sparkOrTable(sparks.traps, TRAP_TABLE, d1, d2);
      else if (encType.kind === 'boon') encContent = sparkOrTable(sparks.boons, BOON_TABLE, d1, d2);
      else if (encType.kind === 'opportunity') {
        obstacleContent = sparkOrTable(sparks.obstacles, OBSTACLE_TABLE, d1, d2);
        boonContent = sparkOrTable(sparks.boons, BOON_TABLE, d1, d2);
      } else if (encType.kind === 'trapboon') {
        encContent  = sparkOrTable(sparks.traps, TRAP_TABLE, d1, d2);
        boonContent = sparkOrTable(sparks.boons, BOON_TABLE, d1, d2);
      }
      let monster = '';
      if (sum >= 14) {
        const monTable = MONSTER_TABLES[environment] || MONSTER_TABLES['Cave'];
        const mIdx = (d1 - 1) * 6 + (d2 - 1);
        monster = sparks.monsters.shift() || monTable[mIdx] || '—';
      }
      return { d1, d2, d3, sum, face: d1, scoreDesc,
        roomType: sparks.roomTypes.shift() || 'Tower',
        roomFeature: sparks.features.shift() || (ROOM_FEATURE_TABLE[(d3-1)*6+(d1-1)] || '—'),
        encType, encContent, obstacleContent, boonContent, size, monster };
    }).sort((a, b) => a.sum - b.sum);

    rooms.push({ kind: 'tower', face: 5, floors, diceCount: towerRolls.length });
  }

  // Hall: one card, grouped lines
  if (hallRolls.length > 0) {
    const sections = hallRolls.map(([d1, d2, d3]) => {
      const sum = d1 + d2 + d3;
      const encType = ENC_TYPES[d3];
      const size = ROOM_SIZE[d2 - 1];
      const rfIdx = (d3 - 1) * 6 + (d1 - 1);
      const scoreDesc = SCORE_TABLE[sum] || '';
      let encContent = '', obstacleContent = '', boonContent = '';
      if (encType.kind === 'social') encContent = sparkOrTable(sparks.socials || [], SOCIAL_TABLE, d1, d2);
      else if (encType.kind === 'clue') encContent = sparkOrTable(sparks.clues || [], CLUE_TABLE, d1, d2);
      else if (encType.kind === 'obstacle') encContent = sparkOrTable(sparks.obstacles, OBSTACLE_TABLE, d1, d2);
      else if (encType.kind === 'trap') encContent = sparkOrTable(sparks.traps, TRAP_TABLE, d1, d2);
      else if (encType.kind === 'boon') encContent = sparkOrTable(sparks.boons, BOON_TABLE, d1, d2);
      else if (encType.kind === 'opportunity') {
        obstacleContent = sparkOrTable(sparks.obstacles, OBSTACLE_TABLE, d1, d2);
        boonContent = sparkOrTable(sparks.boons, BOON_TABLE, d1, d2);
      } else if (encType.kind === 'trapboon') {
        encContent  = sparkOrTable(sparks.traps, TRAP_TABLE, d1, d2);
        boonContent = sparkOrTable(sparks.boons, BOON_TABLE, d1, d2);
      }
      let monster = '';
      if (sum >= 14) {
        const monTable = MONSTER_TABLES[environment] || MONSTER_TABLES['Cave'];
        const mIdx = (d1 - 1) * 6 + (d2 - 1);
        monster = sparks.monsters.shift() || monTable[mIdx] || '—';
      }
      return { d1, d2, d3, sum, encType, encContent, obstacleContent, boonContent, size, scoreDesc, monster,
        feature: sparks.features.shift() || (ROOM_FEATURE_TABLE[rfIdx] || '—') };
    });
    const hallSize = hallRolls.length >= 3 ? 'Far' : 'Double Near';
    rooms.push({ kind: 'hall', face: 6, sections, hallSize,
      diceCount: hallRolls.length,
      roomType: sparks.roomTypes.shift() || 'Hall' });
  }

  return rooms;
}

// ── Map layout ────────────────────────────────────────────────────────────────

function maxNeighbors(face) { return Math.min(face, 4); }
function nodeFootprint(node) {
  if (node.kind === 'hall') return {cols: Math.min(node.diceCount, 2), rows: 1};
  return {cols: 1, rows: 1};
}
function footprintCells(col, row, fp) {
  const cells = [];
  for (let dc = 0; dc < fp.cols; dc++)
    for (let dr = 0; dr < fp.rows; dr++)
      cells.push({col: col+dc, row: row+dr});
  return cells;
}
function footprintEdgeCells(col, row, fp) {
  const inner = new Set(footprintCells(col,row,fp).map(c=>`${c.col},${c.row}`));
  const edge = [], seen = new Set();
  for (let dc = 0; dc < fp.cols; dc++)
    for (let dr = 0; dr < fp.rows; dr++)
      for (const [nc,nr] of [[col+dc-1,row+dr],[col+dc+1,row+dr],[col+dc,row+dr-1],[col+dc,row+dr+1]]) {
        const k = `${nc},${nr}`;
        if (!inner.has(k) && !seen.has(k)) { seen.add(k); edge.push({col:nc,row:nr}); }
      }
  return edge;
}

function placeNodes(nodes) {
  const n = nodes.length;
  if (n === 0) return [];
  if (n === 1) { nodes[0].pos={col:0,row:0}; nodes[0].fp=nodeFootprint(nodes[0]); nodes[0].neighbors=[]; return nodes; }
  const anchorPos = new Array(n);
  const adj = Array.from({length:n}, () => new Set());
  const occupied = new Map();

  function placeAt(i, col, row) {
    anchorPos[i] = {col, row};
    for (const c of footprintCells(col, row, nodeFootprint(nodes[i])))
      occupied.set(`${c.col},${c.row}`, i);
  }
  function canPlace(i, col, row) {
    for (const c of footprintCells(col, row, nodeFootprint(nodes[i])))
      if (occupied.has(`${c.col},${c.row}`)) return false;
    return true;
  }
  function registerAdjacency(i) {
    const fp = nodeFootprint(nodes[i]);
    const {col, row} = anchorPos[i];
    for (const ec of footprintEdgeCells(col, row, fp)) {
      const k = `${ec.col},${ec.row}`;
      if (occupied.has(k)) { const j = occupied.get(k); if (j!==i) { adj[i].add(j); adj[j].add(i); } }
    }
  }

  placeAt(0, 0, 0);
  let lastDir = null;

  for (let i = 1; i < n; i++) {
    const fpI = nodeFootprint(nodes[i]);
    const limI = maxNeighbors(nodes[i].face);
    const candidates = [];
    const anchors = [...Array(i).keys()].sort(() => Math.random() - 0.5);

    for (const j of anchors) {
      if (adj[j].size >= maxNeighbors(nodes[j].face)) continue;
      const fpJ = nodeFootprint(nodes[j]);
      const {col:jc, row:jr} = anchorPos[j];
      const edgesJ = footprintEdgeCells(jc, jr, fpJ).sort(() => Math.random() - 0.5);
      for (const ec of edgesJ) {
        const placements = [];
        for (let dc = 0; dc < fpI.cols; dc++)
          for (let dr = 0; dr < fpI.rows; dr++)
            placements.push({col: ec.col-dc, row: ec.row-dr});
        for (const p of placements) {
          if (!canPlace(i, p.col, p.row)) continue;
          const testEdges = footprintEdgeCells(p.col, p.row, nodeFootprint(nodes[i]));
          const wouldNeighbor = new Set();
          let blocked = false;
          for (const te of testEdges) {
            const k = `${te.col},${te.row}`;
            if (occupied.has(k)) {
              const ni = occupied.get(k);
              wouldNeighbor.add(ni);
              if (adj[ni].size >= maxNeighbors(nodes[ni].face)) { blocked = true; break; }
            }
          }
          if (blocked || wouldNeighbor.size > limI) continue;
          const jCx = jc+fpJ.cols/2, jCy = jr+fpJ.rows/2;
          const iCx = p.col+fpI.cols/2, iCy = p.row+fpI.rows/2;
          const dir = [Math.sign(iCx-jCx), Math.sign(iCy-jCy)];
          let score = Math.random() * 0.8;
          if (lastDir && !(dir[0]===lastDir[0] && dir[1]===lastDir[1])) score += 2.5;
          if (wouldNeighbor.size >= 2) score += 0.6;
          candidates.push({col:p.col, row:p.row, dir, score});
        }
      }
    }

    if (candidates.length === 0) {
      const prev = anchorPos[i-1];
      const fpPrev = nodeFootprint(nodes[i-1]);
      let fc = prev.col + fpPrev.cols, fr = prev.row;
      while (!canPlace(i, fc, fr)) fc++;
      placeAt(i, fc, fr);
    } else {
      candidates.sort((a,b) => b.score - a.score);
      placeAt(i, candidates[0].col, candidates[0].row);
      lastDir = candidates[0].dir;
    }
    registerAdjacency(i);
  }

  // Post-placement loop-closing pass
  for (let i = 0; i < n; i++) {
    const fp = nodeFootprint(nodes[i]);
    const {col, row} = anchorPos[i];
    for (const ec of footprintEdgeCells(col, row, fp)) {
      const k = `${ec.col},${ec.row}`;
      if (!occupied.has(k)) continue;
      const j = occupied.get(k);
      if (j === i || adj[i].has(j)) continue;
      if (adj[i].size < maxNeighbors(nodes[i].face) && adj[j].size < maxNeighbors(nodes[j].face)) {
        adj[i].add(j); adj[j].add(i);
      }
    }
  }

  const allCols = [], allRows = [];
  for (let i = 0; i < n; i++) { allCols.push(anchorPos[i].col); allRows.push(anchorPos[i].row); }
  const minC = Math.min(...allCols), minR = Math.min(...allRows);
  for (let i = 0; i < n; i++) {
    nodes[i].pos = {col: anchorPos[i].col - minC, row: anchorPos[i].row - minR};
    nodes[i].fp = nodeFootprint(nodes[i]);
    nodes[i].neighbors = [...adj[i]];
  }
  return nodes;
}

function finalizeRooms(nodes) {
  const terminals = nodes.filter(n => n.neighbors.length <= 1);
  const pool = terminals.length ? terminals : nodes;
  const entrance = pool.reduce((a, b) => {
    const sa = a.kind==='room' ? a.sum : a.total||99;
    const sb = b.kind==='room' ? b.sum : b.total||99;
    return sa < sb ? a : b;
  });
  entrance.isEntrance = true;

  const entranceIdx = nodes.indexOf(entrance);
  const roomNum = new Array(nodes.length).fill(null);
  const queue = [entranceIdx];
  const visited = new Set([entranceIdx]);
  let num = 1;
  while (queue.length) {
    const idx = queue.shift();
    roomNum[idx] = num++;
    for (const j of nodes[idx].neighbors)
      if (!visited.has(j)) { visited.add(j); queue.push(j); }
  }
  nodes.forEach((n, i) => { n.roomNum = roomNum[i]; });
  return nodes;
}

// ── SVG Interactive Map ────────────────────────────────────────────────────────

const CELL_W = 280, CELL_H = 168, PAD = 2, MARGIN = 14;
const CELL = CELL_W;

const CONN_ICONS = ['', 'O', 'UL', 'L', 'T', 'S', '✕'];
const CONN_NAMES = ['Fully Open', 'Open Doorway', 'Unlocked Door', 'Locked Door', 'Trapped Door', 'Hidden Door', 'Gone'];

function svgEl(tag, attrs = {}, children = []) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) el.appendChild(c);
  return el;
}

function pipPositions(face) {
  return {
    1:[[0,0]], 2:[[-1,-1],[1,1]], 3:[[-1,-1],[0,0],[1,1]],
    4:[[-1,-1],[1,-1],[-1,1],[1,1]], 5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],
    6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]],
  }[face] || [];
}

// Shared state store: clusterState[idx] = { edges, nodeRatios }
const clusterState = {};

// Registry of zoom functions keyed by clusterIdx+fullscreen
const svgZoomControls = {};

// Active floor index per tower node in fullscreen: key = `${clusterIdx}-${nodeIdx}`
const towerActiveFloor = {};

function zoomSVG(clusterIdx, fullscreen, delta) {
  const key = clusterIdx + (fullscreen ? '-fs' : '');
  if (svgZoomControls[key]) svgZoomControls[key](delta);
}

// Per-floor detail line builder — used by rollCluster and syncDetailLinesFromCards
function buildFloorLines(f) {
  const lines = [];
  if (f.size) lines.push({ text: 'Size: ' + f.size, bullet: 'none' });
  if (f.roomFeature) lines.push({ text: fmtContent(f.roomFeature), bullet: 'arrow' });
  if (f.encType.kind === 'trap' || f.encType.kind === 'trapboon') lines.push({ text: f.encContent, bullet: 'T' });
  if (f.encType.kind === 'obstacle') lines.push({ text: fmtContent(f.obstacleContent || f.encContent), bullet: 'O' });
  if (f.encType.kind === 'opportunity') lines.push({ text: fmtContent(f.obstacleContent), bullet: 'O' });
  if (f.monster) lines.push({ text: fmtContent(f.monster), bullet: 'M' });
  if (f.encType.kind === 'boon' || f.encType.kind === 'trapboon') lines.push({ text: fmtContent(f.boonContent || f.encContent), bullet: 'B' });
  if (f.encType.kind === 'opportunity') lines.push({ text: fmtContent(f.boonContent), bullet: 'B' });
  return lines;
}

// Cycle active floor for a tower node in fullscreen and redraw
function cycleTowerFloor(clusterIdx, nodeIdx, floorIdx) {
  towerActiveFloor[`${clusterIdx}-${nodeIdx}`] = floorIdx;
  const rooms = clusterRooms[clusterIdx];
  if (!rooms) return;
  syncDetailLinesFromCards(clusterIdx, rooms);
  const body = document.getElementById('map-fullscreen-body');
  if (body) {
    // Preserve current viewBox before rebuild
    const existingSvg = body.querySelector('svg');
    const savedViewBox = existingSvg ? existingSvg.getAttribute('viewBox') : null;

    body.innerHTML = '';
    const svg = buildSVGMap(rooms, clusterIdx, true);
    svg.style.width = '100%';
    svg.style.height = '100%';
    body.appendChild(svg);

    // Restore viewBox so pan/zoom position is unchanged
    if (savedViewBox) {
      const [x, y, w, h] = savedViewBox.split(' ').map(Number);
      const restoreFn = svgZoomControls[`${clusterIdx}-fs-restore`];
      if (restoreFn) restoreFn(x, y, w, h);
      else svg.setAttribute('viewBox', savedViewBox);
    }

    // Fade in the new front card content immediately
    const nodeG = svg.querySelector(`.node-group[data-idx="${nodeIdx}"]`);
    if (nodeG) {
      const fo = nodeG.querySelector('foreignObject');
      const headerText = nodeG.querySelector('[data-front-card] text');
      [fo && fo.firstChild, headerText].forEach(el => {
        if (!el) return;
        el.style.opacity = '0';
        requestAnimationFrame(() => {
          el.style.transition = 'opacity 0.15s ease';
          el.style.opacity = '1';
        });
      });
    }
  }
}

function buildSVGMap(nodes, clusterIdx, fullscreen = false) {
  const svgId = `svgmap-${clusterIdx}${fullscreen ? '-fs' : ''}`;

  const TILE_H = fullscreen ? CELL_H * 2.5 : CELL_H;
  let maxC = 0, maxR = 0;
  for (const n of nodes) { maxC = Math.max(maxC, n.pos.col+n.fp.cols-1); maxR = Math.max(maxR, n.pos.row+n.fp.rows-1); }
  const cols = maxC+1+PAD*2, rows = maxR+1+PAD*2;
  const W = cols*CELL_W, H = rows * (fullscreen ? TILE_H : CELL_H);

  function nodeCx(node) { return (node.pos.col+PAD+node.fp.cols/2)*CELL_W; }
  function nodeCy(node) { return (node.pos.row+PAD+0.5)*TILE_H; }

  const baseH = CELL_H;
  const baseW = W;

  if (!clusterState[clusterIdx]) {
    const edges = new Map();
    const seen = new Set();
    for (let i = 0; i < nodes.length; i++) {
      for (const j of nodes[i].neighbors) {
        const key = [Math.min(i,j),Math.max(i,j)].join('-');
        if (seen.has(key)) continue; seen.add(key);
        const diff = Math.min(Math.abs(nodes[i].face - nodes[j].face), 5);
        edges.set(key, { i, j, level: diff });
      }
    }
    const nodeRatios = nodes.map(n => ({
      rx: (nodeCx(n) + (Math.random() - 0.5) * CELL_W * 0.28) / baseW,
      ry: (nodeCy(n) + (Math.random() - 0.5) * CELL_H * 0.28) / (rows * baseH),
    }));

    const MIN_DIST_X = CELL_W * 1.05;
    const MIN_DIST_Y = CELL_H * 1.05;
    const totalH = rows * baseH;
    for (let iter = 0; iter < 40; iter++) {
      let moved = false;
      for (let i = 0; i < nodeRatios.length; i++) {
        for (let j = i + 1; j < nodeRatios.length; j++) {
          const niW = nodes[i].fp.cols * CELL_W, njW = nodes[j].fp.cols * CELL_W;
          const minDx = (niW + njW) / 2 + 20;
          const minDy = MIN_DIST_Y;
          const ax = nodeRatios[i].rx * baseW, ay = nodeRatios[i].ry * totalH;
          const bx = nodeRatios[j].rx * baseW, by = nodeRatios[j].ry * totalH;
          const dx = bx - ax, dy = by - ay;
          const overlapX = minDx - Math.abs(dx);
          const overlapY = minDy - Math.abs(dy);
          if (overlapX > 0 && overlapY > 0) {
            const pushX = overlapX < overlapY ? overlapX / 2 : 0;
            const pushY = overlapX < overlapY ? 0 : overlapY / 2;
            const signX = dx >= 0 ? 1 : -1;
            const signY = dy >= 0 ? 1 : -1;
            nodeRatios[i].rx -= pushX * signX / baseW;
            nodeRatios[j].rx += pushX * signX / baseW;
            nodeRatios[i].ry -= pushY * signY / totalH;
            nodeRatios[j].ry += pushY * signY / totalH;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    clusterState[clusterIdx] = { edges, nodeRatios, neighbors: nodes.map(n => [...n.neighbors]) };
  }

  const state = clusterState[clusterIdx];
  const { edges } = state;

  nodes.forEach((n, i) => { n.neighbors = [...state.neighbors[i]]; });

  const renderH = rows * TILE_H;
  const nodePos = state.nodeRatios.map(r => ({
    x: r.rx * baseW,
    y: r.ry * renderH,
  }));

  const svg = svgEl('svg', {
    id: svgId,
    width: W, height: H,
    viewBox: `0 0 ${W} ${H}`,
    style: `display:block;width:100%;height:auto;font-family:"National Park",sans-serif;user-select:none;cursor:default;`
  });

  const EXTRA_W = fullscreen ? 336 : 0;
  const MIN_W = W / (fullscreen ? H / TILE_H : 10);
  const MAX_W = W / 0.3;
  const vb = { x: 0, y: 0, w: W, h: H };

  let contentMinX = 0, contentMinY = 0, contentMaxX = W, contentMaxY = H;

  function applyViewBox() {
    const PEEK = TILE_H * 0.6;
    vb.x = Math.min(contentMaxX - PEEK, Math.max(contentMinX - vb.w + PEEK, vb.x));
    vb.y = Math.min(contentMaxY - PEEK, Math.max(contentMinY - vb.h + PEEK, vb.y));
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }

  function toSVGCoords(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: svgP.x, y: svgP.y };
  }

  function getZoom() { return W / vb.w; }

  const bgRect = svgEl('rect', { width: W, height: H, fill: '#fff9f5' });
  svg.appendChild(bgRect);
  const dotGroup = svgEl('g', { opacity: '0.35' });
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    dotGroup.appendChild(svgEl('circle', { cx: c*CELL_W+CELL_W/2, cy: r*TILE_H+TILE_H/2, r: 1.5, fill: '#9ecee6' }));
  }
  svg.appendChild(dotGroup);

  const edgeLayer = svgEl('g', { id: `${svgId}-edges` });
  svg.appendChild(edgeLayer);

  const ghostLine1 = svgEl('line', { stroke: '#3fb5cc', 'stroke-width': '1', 'stroke-dasharray': '5,3', opacity: '0', 'pointer-events': 'none' });
  const ghostLine2 = svgEl('line', { stroke: '#3fb5cc', 'stroke-width': '1', 'stroke-dasharray': '5,3', opacity: '0', 'pointer-events': 'none' });
  svg.appendChild(ghostLine1);
  svg.appendChild(ghostLine2);

  const nodeLayer = svgEl('g', { id: `${svgId}-nodes` });
  svg.appendChild(nodeLayer);

  let connectMode = false;
  let connectFrom = null;
  let dragging = null;
  let highlightedNode = null;

  function boxEdgePoint(cx, cy, tx, ty, hw, hh) {
    const dx = tx - cx, dy = ty - cy;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };
    const tX = Math.abs(dx) > 0.001 ? hw / Math.abs(dx) : Infinity;
    const tY = Math.abs(dy) > 0.001 ? hh / Math.abs(dy) : Infinity;
    const t = Math.min(tX, tY);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  function drawEdges() {
    edgeLayer.innerHTML = '';
    for (const [key, edge] of edges) {
      if (edge.level < 0) continue;
      const ax = nodePos[edge.i].x, ay = nodePos[edge.i].y;
      const bx = nodePos[edge.j].x, by = nodePos[edge.j].y;
      const dx = bx-ax, dy = by-ay, len = Math.sqrt(dx*dx+dy*dy);
      if (len < 1) continue;
      const px = -dy/len*9, py = dx/len*9;

      const niA = nodes[edge.i], niB = nodes[edge.j];
      const hwA = niA.fp.cols*CELL_W/2 - MARGIN, hhA = TILE_H/2 - MARGIN;
      const hwB = niB.fp.cols*CELL_W/2 - MARGIN, hhB = TILE_H/2 - MARGIN;
      const edgeA = boxEdgePoint(ax, ay, bx, by, hwA, hhA);
      const edgeB = boxEdgePoint(bx, by, ax, ay, hwB, hhB);
      const mx = (edgeA.x + edgeB.x) / 2, my = (edgeA.y + edgeB.y) / 2;

      const isGone = edge.level === 6;
      const isSecret = edge.level === 5;
      const edgeG = svgEl('g', { class: 'edge-group', 'data-key': key, style: 'cursor:pointer' });

      const lineStroke = isGone ? '#fa8072' : '#9ecee6';
      const lineAttrs = isGone ? { 'stroke-dasharray': '6,4', opacity: '0.5' }
                      : isSecret ? { 'stroke-dasharray': '2,4' } : {};
      edgeG.appendChild(svgEl('line', {
        x1: ax+px, y1: ay+py, x2: bx+px, y2: by+py,
        stroke: lineStroke, 'stroke-width': '1', 'stroke-linecap': 'round', ...lineAttrs
      }));
      edgeG.appendChild(svgEl('line', {
        x1: ax-px, y1: ay-py, x2: bx-px, y2: by-py,
        stroke: lineStroke, 'stroke-width': '1', 'stroke-linecap': 'round', ...lineAttrs
      }));
      edgeG.appendChild(svgEl('line', {
        x1: ax, y1: ay, x2: bx, y2: by,
        stroke: 'transparent', 'stroke-width': '16'
      }));

      const icon = CONN_ICONS[edge.level];
      const badgeR = 14;
      if (isGone) {
        const badgeG = svgEl('g');
        badgeG.appendChild(svgEl('circle', { cx: mx, cy: my, r: badgeR, fill: '#fff9f5', stroke: '#fa8072', 'stroke-width': '1' }));
        const xt = svgEl('text', {
          x: mx, y: my, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': '13', 'font-weight': 'bold', 'font-family': '"National Park",sans-serif', fill: '#fa8072'
        });
        xt.textContent = '✕';
        badgeG.appendChild(xt);
        edgeG.appendChild(badgeG);
      } else if (icon !== '') {
        const isTrapped = edge.level === 4;
        const badgeG = svgEl('g');
        badgeG.appendChild(svgEl('circle', { cx: mx, cy: my, r: badgeR, fill: '#fff9f5', stroke: isTrapped ? '#fa8072' : '#9ecee6', 'stroke-width': '0.75' }));
        badgeG.appendChild(svgEl('text', {
          x: mx, y: my, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': '11', 'font-weight': 'bold', 'font-family': '"National Park",sans-serif', fill: isTrapped ? '#fa8072' : '#262626'
        }));
        badgeG.querySelector('text').textContent = icon;
        edgeG.appendChild(badgeG);
      }

      edgeG.addEventListener('mouseenter', () => {
        if (connectMode || dragging) return;
        edgeG.querySelectorAll('line[stroke="#9ecee6"]').forEach(l => l.setAttribute('stroke', '#3fb5cc'));
        edgeG.querySelectorAll('circle[stroke="#9ecee6"]').forEach(c => c.setAttribute('stroke', '#3fb5cc'));
      });
      edgeG.addEventListener('mouseleave', () => {
        edgeG.querySelectorAll('line[stroke="#3fb5cc"]').forEach(l => l.setAttribute('stroke', '#9ecee6'));
        edgeG.querySelectorAll('circle[stroke="#3fb5cc"]').forEach(c => c.setAttribute('stroke', '#9ecee6'));
      });

      edgeG.addEventListener('click', (e) => {
        if (connectMode || dragging) return;
        e.stopPropagation();
        if (edge.level === 6) {
          edges.delete(key);
          nodes[edge.i].neighbors = nodes[edge.i].neighbors.filter(x => x !== edge.j);
          nodes[edge.j].neighbors = nodes[edge.j].neighbors.filter(x => x !== edge.i);
          state.neighbors[edge.i] = [...nodes[edge.i].neighbors];
          state.neighbors[edge.j] = [...nodes[edge.j].neighbors];
        } else {
          edge.level = edge.level + 1;
        }
        drawEdges();
        drawNodes();
      });
      edgeG.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        edges.delete(key);
        nodes[edge.i].neighbors = nodes[edge.i].neighbors.filter(x => x !== edge.j);
        nodes[edge.j].neighbors = nodes[edge.j].neighbors.filter(x => x !== edge.i);
        state.neighbors[edge.i] = [...nodes[edge.i].neighbors];
        state.neighbors[edge.j] = [...nodes[edge.j].neighbors];
        drawEdges();
        drawNodes();
      });

      edgeLayer.appendChild(edgeG);
    }
  }

  function drawNodes() {
    nodeLayer.innerHTML = '';
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const cx = nodePos[i].x, cy = nodePos[i].y;
      const boxW = (fullscreen ? node.fp.cols*CELL_W : CELL_W) - MARGIN*2;
      const boxH = TILE_H - MARGIN*2;
      const x = cx - boxW/2, y = cy - boxH/2;
      const HEADER_H = 28;
      const isHighlighted = highlightedNode === i;

      // Tower stack setup (fullscreen only)
      const isTowerStack = fullscreen && node.kind === 'tower' && node.floors && node.floors.length > 1;
      const stackKey = `${clusterIdx}-${i}`;
      const activeFloorIdx = isTowerStack ? (towerActiveFloor[stackKey] || 0) : 0;
      const peekCount = isTowerStack ? node.floors.length - 1 : 0;
      const peekH = peekCount * HEADER_H;
      // Peek tabs sit above the front card: total visual top = y - peekH
      const totalVisualH = boxH + peekH;

      const g = svgEl('g', {
        class: 'node-group',
        'data-idx': i,
        style: 'cursor:grab'
      });

      // Shadow — covers full visual height including peek tabs
      g.appendChild(svgEl('rect', {
        x: x+3, y: y - peekH + 3, width: boxW, height: totalVisualH, rx: 5,
        fill: 'rgba(0,0,0,0.08)'
      }));

      const fillColor = isHighlighted ? '#e8f8fc' : '#fffefd';
      const strokeColor = isHighlighted ? '#3fb5cc' : '#9ecee6';
      const strokeW = isHighlighted ? '1.5' : '0.75';
      const letters = 'abcdefghij';

      // ── Peek tabs (rendered before front card so front card paints over the bottom of each tab) ──
      if (isTowerStack) {
        // Collect non-active floors in order, assign tab slots top-to-bottom
        const otherFloors = node.floors.map((f, fi) => ({ f, fi })).filter(({ fi }) => fi !== activeFloorIdx);
        otherFloors.forEach(({ f, fi }, tabSlot) => {
          const tabY = y - peekH + tabSlot * HEADER_H;
          // Wrap visual elements so animateTransform moves them together
          const tabVisualGroup = svgEl('g');
          // Tab background — full card height, no border at rest
          tabVisualGroup.appendChild(svgEl('rect', {
            x, y: tabY, width: boxW, height: boxH, rx: 5,
            fill: '#f0f4f6', stroke: 'none'
          }));
          // Tab label
          const tabLabel = svgEl('text', {
            x: x + 10, y: tabY + HEADER_H / 2 + 1,
            'text-anchor': 'start', 'dominant-baseline': 'central',
            'font-size': fullscreen ? '14' : '22', 'font-weight': 'bold', fill: '#999',
            'font-family': '"National Park",sans-serif',
            'pointer-events': 'none'
          });
          tabLabel.textContent = `${node.roomNum}${letters[fi]}. ${f.roomType}`;
          tabVisualGroup.appendChild(tabLabel);
          g.appendChild(tabVisualGroup);
          // Clickable hit target — stopPropagation prevents connect-mode trigger
          const tabHit = svgEl('rect', {
            x, y: tabY, width: boxW, height: HEADER_H,
            fill: 'transparent', style: 'cursor:pointer'
          });
          // Hover: show blue border and whiten fill
          tabHit.addEventListener('mouseenter', () => {
            const r = tabVisualGroup.querySelector('rect');
            if (r) {
              r.setAttribute('fill', '#ffffff');
              r.setAttribute('stroke', strokeColor);
              r.setAttribute('stroke-width', '0.75');
            }
          });
          tabHit.addEventListener('mouseleave', () => {
            const r = tabVisualGroup.querySelector('rect');
            if (r) {
              r.setAttribute('fill', '#f0f4f6');
              r.setAttribute('stroke', 'none');
            }
          });
          tabHit.addEventListener('click', (e) => {
            e.stopPropagation();

            const PHASE1_DUR = 80;
            const PHASE2_DUR = 200;

            const PEEK_LEFT = boxW * 0.45;
            const slideDownY = peekH - tabSlot * HEADER_H;

            // On click: swap borders immediately
            const tabRect = tabVisualGroup.querySelector('rect');
            if (tabRect) tabRect.setAttribute('stroke', strokeColor);
            const frontRect = frontCardGroup.querySelector('rect');
            if (frontRect) frontRect.setAttribute('stroke', '#d0dde5');

            // Fade out front card content AND header text
            const fo = frontCardGroup.querySelector('foreignObject');
            if (fo && fo.firstChild) {
              fo.firstChild.style.transition = 'opacity 0.08s ease';
              fo.firstChild.style.opacity = '0';
            }
            const frontHeaderText = frontCardGroup.querySelector('text');
            if (frontHeaderText) {
              frontHeaderText.style.transition = 'opacity 0.08s ease';
              frontHeaderText.style.opacity = '0';
            }

            function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
            function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

            // Phase 1: incoming tab slides left only
            const p1Start = performance.now();
            function phase1(now) {
              const t = Math.min((now - p1Start) / PHASE1_DUR, 1);
              const e = easeOut(t);
              tabVisualGroup.setAttribute('transform', `translate(${-PEEK_LEFT * e} 0)`);
              if (t < 1) {
                requestAnimationFrame(phase1);
              } else {
                // Phase 1 done — start phase 2
                const p2Start = performance.now();
                function phase2(now) {
                  const t = Math.min((now - p2Start) / PHASE2_DUR, 1);
                  const e = easeInOut(t);

                  // Incoming: from (-PEEK_LEFT, 0) arc diagonally to (0, slideDownY)
                  const inX = -PEEK_LEFT * (1 - e);
                  const inY = slideDownY * e;
                  tabVisualGroup.setAttribute('transform', `translate(${inX} ${inY})`);

                  // Outgoing: slides straight up by slideDownY to its new peek slot
                  const outY = -slideDownY * e;
                  frontCardGroup.setAttribute('transform', `translate(0 ${outY})`);

                  if (t < 1) {
                    requestAnimationFrame(phase2);
                  } else {
                    cycleTowerFloor(clusterIdx, i, fi);
                  }
                }
                requestAnimationFrame(phase2);
              }
            }
            requestAnimationFrame(phase1);
          });
          g.appendChild(tabHit);
        });
      }

      // ── Front card ──
      // Wrap in a group so rAF animation can transform it as one unit
      const frontCardGroup = svgEl('g', isTowerStack ? { 'data-front-card': '1' } : {});

      // Main rect — sits at normal y, covers boxH (peek tabs extend above it)
      frontCardGroup.appendChild(svgEl('rect', {
        x, y, width: boxW, height: boxH, rx: 5,
        fill: fillColor, stroke: strokeColor, 'stroke-width': strokeW
      }));

      // Header divider
      frontCardGroup.appendChild(svgEl('line', {
        x1: x+5, y1: y+HEADER_H, x2: x+boxW-5, y2: y+HEADER_H,
        stroke: 'rgba(250,128,114,0.5)', 'stroke-width': '0.75'
      }));

      // Header label — shows active floor for tower stacks
      let headerLabel;
      if (isTowerStack) {
        const af = node.floors[activeFloorIdx];
        headerLabel = `${node.roomNum}${letters[activeFloorIdx]}. ${af.roomType}${node.isEntrance && activeFloorIdx === 0 ? ' ▲' : ''}`;
      } else {
        const nodeRoomType = node.roomType || (node.kind === 'tower' ? 'Tower' : node.kind === 'hall' ? 'Hall' : '');
        headerLabel = `${node.roomNum ? node.roomNum + '. ' : ''}${nodeRoomType}${node.isEntrance ? ' ▲' : ''}`;
      }
      const headerText = svgEl('text', {
        x: x+7, y: y+HEADER_H/2+1,
        'text-anchor': 'start', 'dominant-baseline': 'central',
        'font-size': fullscreen ? '14' : '22', 'font-weight': 'bold', fill: '#262626',
        'font-family': '"National Park",sans-serif'
      });
      headerText.textContent = headerLabel;
      frontCardGroup.appendChild(headerText);

      if (fullscreen) {
        // EDIT button links to active floor for tower stacks
        const editCardId = isTowerStack
          ? `card-${clusterIdx}-${i}-f${activeFloorIdx}`
          : node.kind === 'tower'
            ? `card-${clusterIdx}-${i}-f0`
            : `card-${clusterIdx}-${i}`;
        const btnW = 36, btnH = 16, btnX = x + boxW - btnW - 6, btnY = y + (HEADER_H - btnH) / 2;
        const editBtn = svgEl('g', { style: 'cursor:pointer', onclick: `scrollToCard('${editCardId}')` });
        editBtn.appendChild(svgEl('rect', {
          x: btnX, y: btnY, width: btnW, height: btnH, rx: 3,
          fill: 'none', stroke: 'var(--blue-light)', 'stroke-width': '0.75'
        }));
        const editLabel = svgEl('text', {
          x: btnX + btnW/2, y: btnY + btnH/2 + 1,
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': '9', 'font-weight': 'bold', 'letter-spacing': '0.5',
          fill: '#7d7d7d', 'font-family': '"National Park",sans-serif'
        });
        editLabel.textContent = 'EDIT';
        editBtn.appendChild(editLabel);
        frontCardGroup.appendChild(editBtn);
      }

      g.appendChild(frontCardGroup);

      const lines = [];

      const ICON_COLORS = { T: '#fa8072', O: '#262626', M: '#fa8072', B: '#3fb5cc' };
      const TOMB_ORDER = { T: 0, O: 1, M: 2, B: 3 };
      function scanIconsFromCard(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;
        const found = [];
        card.querySelectorAll('.key-line[data-bullet]').forEach(line => {
          const b = line.dataset.bullet;
          if (b && ICON_COLORS[b]) found.push({ tombIcon: b, color: ICON_COLORS[b] });
        });
        found.sort((a, b) => TOMB_ORDER[a.tombIcon] - TOMB_ORDER[b.tombIcon]);
        lines.push(...found);
      }

      function extractCompact(src) {
        if (src.encType) {
          if (src.encType.kind === 'trap' || src.encType.kind === 'trapboon') lines.push({ tombIcon: 'T', color: '#fa8072' });
          if (src.encType.kind === 'obstacle')    lines.push({ tombIcon: 'O', color: '#262626' });
          if (src.encType.kind === 'opportunity') lines.push({ tombIcon: 'O', color: '#262626' });
        }
        if (src.monster) lines.push({ tombIcon: 'M', color: '#fa8072' });
        if (src.encType) {
          if (src.encType.kind === 'boon' || src.encType.kind === 'trapboon') lines.push({ tombIcon: 'B', color: '#3fb5cc' });
          if (src.encType.kind === 'opportunity') lines.push({ tombIcon: 'B', color: '#3fb5cc' });
        }
      }

      if (fullscreen) {
        if (isTowerStack) {
          // Show only the active floor's lines
          const floorLines = node._floorDetailLines && node._floorDetailLines[activeFloorIdx];
          if (floorLines && floorLines.length > 0) {
            lines.push(...floorLines);
          } else {
            extractCompact(node.floors[activeFloorIdx]);
          }
        } else if (node._detailLines && node._detailLines.length > 0) {
          lines.push(...node._detailLines);
        } else {
          if (node.kind === 'hall') node.sections.forEach(s => extractCompact(s));
          else if (node.kind === 'tower') node.floors.forEach(f => extractCompact(f));
          else extractCompact(node);
        }
      } else {
        const nodeIdx = nodes.indexOf(node);
        if (node.kind === 'tower') {
          node.floors.forEach((f, fi) => {
            if (fi > 0) lines.push({ redDivider: true });
            const cardId = `card-${clusterIdx}-${nodeIdx}-f${fi}`;
            const card = document.getElementById(cardId);
            if (card) scanIconsFromCard(cardId);
            else extractCompact(f);
          });
        } else {
          const cardId = `card-${clusterIdx}-${nodeIdx}`;
          const card = document.getElementById(cardId);
          if (card) scanIconsFromCard(cardId);
          else if (node.kind === 'hall') node.sections.forEach(s => extractCompact(s));
          else extractCompact(node);
        }
      }

      const LINE_H = fullscreen ? 18 : 21, PAD_X = 10;
      const maxLineW = boxW - PAD_X * 2;
      const fontSize = fullscreen ? 13 : 14;

      const _measureCanvas = document.createElement('canvas');
      const _mCtx = _measureCanvas.getContext('2d');
      function measureText(str, bold) {
        _mCtx.font = `${bold ? 'bold ' : ''}${fontSize}px "National Park", sans-serif`;
        return _mCtx.measureText(str).width;
      }

      function wrapLine(str, bold, maxW) {
        const w = maxW || maxLineW;
        const words = str.split(' ');
        const out = [];
        let cur = '';
        for (const wd of words) {
          const test = cur ? cur + ' ' + wd : wd;
          if (measureText(test, bold) > w && cur) { out.push(cur); cur = wd; }
          else { cur = test; }
        }
        if (cur) out.push(cur);
        return out.length ? out : [str];
      }

      if (!fullscreen) {
        // Mini-map: stacked TOMB icons
        const ICON_SIZE = 16, ICON_GAP = 3;
        const iconSet = lines.filter(l => l.tombIcon);
        if (iconSet.length > 0) {
          const totalIconW = iconSet.length * ICON_SIZE + (iconSet.length - 1) * ICON_GAP;
          const iconStartX = cx - totalIconW / 2;
          const iconY = y + HEADER_H + (boxH - HEADER_H) / 2 - ICON_SIZE / 2;
          iconSet.forEach((ic, ii) => {
            const ix = iconStartX + ii * (ICON_SIZE + ICON_GAP);
            const iconG = svgEl('g');
            iconG.appendChild(svgEl('rect', {
              x: ix, y: iconY, width: ICON_SIZE, height: ICON_SIZE, rx: 3,
              fill: 'none', stroke: ic.color, 'stroke-width': '0.75'
            }));
            const iconT = svgEl('text', {
              x: ix + ICON_SIZE/2, y: iconY + ICON_SIZE/2 + 1,
              'text-anchor': 'middle', 'dominant-baseline': 'central',
              'font-size': '9', 'font-weight': '300', fill: ic.color,
              'font-family': '"National Park",sans-serif'
            });
            iconT.textContent = ic.tombIcon;
            iconG.appendChild(iconT);
            g.appendChild(iconG);
          });
        }
      } else {
        // Fullscreen detail lines via foreignObject
        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('x', x + PAD_X);
        fo.setAttribute('y', y + HEADER_H + 4);
        fo.setAttribute('width', boxW - PAD_X * 2);
        fo.setAttribute('height', boxH - HEADER_H - 8);

        const BULLET_SIZE = 16;
        const BULLET_COLORS = { T: '#fa8072', O: '#262626', M: '#fa8072', B: '#3fb5cc', arrow: '#9ecee6' };

        const wrap = document.createElement('div');
        wrap.style.cssText = `font-size:${fontSize}px; font-family:"National Park",sans-serif; color:#262626; line-height:1.3; overflow:hidden; height:100%;`;

        for (const line of lines) {
          if (line.redDivider) {
            const div = document.createElement('div');
            div.style.cssText = `height:11px; display:flex; align-items:center; padding:0;`;
            const hr = document.createElement('div');
            hr.style.cssText = `flex:1; height:0.75px; background:rgba(250,128,114,0.5);`;
            div.appendChild(hr);
            wrap.appendChild(div);
            continue;
          }
          if (line.text === '───') {
            const div = document.createElement('div');
            div.style.cssText = `height:11px; display:flex; align-items:center; padding:0;`;
            const hr = document.createElement('div');
            hr.style.cssText = `flex:1; height:0.5px; background:#9ecee6;`;
            div.appendChild(hr);
            wrap.appendChild(div);
            continue;
          }

          const bullet = line.bullet;
          const isTOMB = bullet && 'TOMB'.includes(bullet);
          const isArrow = bullet === 'arrow';
          const isFloorLabel = bullet === 'none' && line.bold;
          const isDesc = line.isDesc;

          const row = document.createElement('div');
          row.style.cssText = `
            display:flex; align-items:flex-start; min-height:${LINE_H}px;
            border-bottom:0.5px solid rgba(158,206,230,0.5);
            padding: 2px 0;
          `;

          if (isFloorLabel) {
            const tCell = document.createElement('div');
            tCell.style.cssText = `flex:1; font-weight:bold; word-wrap:break-word; min-width:0;`;
            tCell.textContent = line.text || '';
            row.appendChild(tCell);
            wrap.appendChild(row);
            continue;
          }

          if (isDesc) {
            const tCell = document.createElement('div');
            tCell.style.cssText = `flex:1; word-wrap:break-word; min-width:0;`;
            tCell.textContent = line.text || '';
            row.appendChild(tCell);
            wrap.appendChild(row);
            continue;
          }

          const bCell = document.createElement('div');
          bCell.style.cssText = `
            flex-shrink:0; width:${BULLET_SIZE}px; height:${BULLET_SIZE}px;
            display:flex; align-items:center; justify-content:center;
            margin-right:6px; margin-top:1px;
          `;
          if (isTOMB) {
            bCell.style.cssText += `
              border:1px solid ${BULLET_COLORS[bullet]}; border-radius:3px;
              font-size:11px; font-weight:300; color:${BULLET_COLORS[bullet]};
            `;
            bCell.textContent = bullet;
          } else if (isArrow) {
            bCell.style.cssText += `font-size:9px; color:${BULLET_COLORS.arrow}; opacity:0.6;`;
            bCell.textContent = '▶';
          }
          row.appendChild(bCell);

          const tCell = document.createElement('div');
          tCell.style.cssText = `flex:1; word-wrap:break-word; overflow-wrap:break-word; min-width:0;`;
          const safeText = (line.text || '')
            .replace(/&nbsp;/g, ' ')
            .replace(/(<\/?(b)>)/g, '$1')
            .trim();
          tCell.innerHTML = safeText;
          row.appendChild(tCell);
          wrap.appendChild(row);
        }

        fo.appendChild(wrap);
        frontCardGroup.appendChild(fo);
      }

      // Drag interaction
      g.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (connectMode) {
          e.stopPropagation();
          if (connectFrom !== null && connectFrom !== i) {
            const key = [Math.min(connectFrom,i), Math.max(connectFrom,i)].join('-');
            if (!edges.has(key)) {
              edges.set(key, { i: connectFrom, j: i, level: 0 });
              nodes[connectFrom].neighbors.push(i);
              nodes[i].neighbors.push(connectFrom);
              state.neighbors[connectFrom] = [...nodes[connectFrom].neighbors];
              state.neighbors[i] = [...nodes[i].neighbors];
            }
            exitConnectMode();
            drawEdges();
            drawNodes();
          }
          return;
        }
        e.stopPropagation();
        const { x: sx, y: sy } = toSVGCoords(e.clientX, e.clientY);
        dragging = {
          nodeIdx: i,
          startX: sx, startY: sy,
          origX: nodePos[i].x, origY: nodePos[i].y
        };
        g.style.cursor = 'grabbing';
      });

      let didDrag = false;
      g.addEventListener('click', (e) => {
        if (didDrag) { didDrag = false; return; }
        if (connectMode) return;
        e.stopPropagation();
        enterConnectMode(i);
      });

      nodeLayer.appendChild(g);
    }
  }

  function enterConnectMode(fromIdx) {
    connectMode = true;
    connectFrom = fromIdx;
    svg.style.cursor = 'crosshair';
    highlightedNode = fromIdx;
    document.getElementById(`${svgId}-hint`).setAttribute('opacity', '1');
    drawNodes();
  }

  function exitConnectMode() {
    connectMode = false;
    connectFrom = null;
    svg.style.cursor = 'default';
    ghostLine1.setAttribute('opacity', '0');
    ghostLine2.setAttribute('opacity', '0');
    highlightedNode = null;
    document.getElementById(`${svgId}-hint`).setAttribute('opacity', '0');
    drawNodes();
  }

  const onKeyDown = (e) => { if (e.key === 'Escape' && connectMode) { exitConnectMode(); } };
  document.addEventListener('keydown', onKeyDown);

  svg.addEventListener('mousemove', (e) => {
    const { x: mx, y: my } = toSVGCoords(e.clientX, e.clientY);

    if (dragging) {
      const dx = mx - dragging.startX;
      const dy = my - dragging.startY;
      nodePos[dragging.nodeIdx].x = dragging.origX + dx;
      nodePos[dragging.nodeIdx].y = dragging.origY + dy;
      drawEdges();
      drawNodes();
      return;
    }

    if (connectMode && connectFrom !== null) {
      const ax = nodePos[connectFrom].x, ay = nodePos[connectFrom].y;
      const off = 4.5;
      const len = Math.sqrt((mx-ax)**2+(my-ay)**2);
      if (len > 1) {
        const px = -(my-ay)/len*off, py = (mx-ax)/len*off;
        ghostLine1.setAttribute('x1', ax+px); ghostLine1.setAttribute('y1', ay+py);
        ghostLine1.setAttribute('x2', mx+px); ghostLine1.setAttribute('y2', my+py);
        ghostLine1.setAttribute('opacity', '0.7');
        ghostLine2.setAttribute('x1', ax-px); ghostLine2.setAttribute('y1', ay-py);
        ghostLine2.setAttribute('x2', mx-px); ghostLine2.setAttribute('y2', my-py);
        ghostLine2.setAttribute('opacity', '0.7');
      }
    }
  });

  svg.addEventListener('mouseup', (e) => {
    if (dragging) {
      const g = nodeLayer.querySelector(`[data-idx="${dragging.nodeIdx}"]`);
      if (g) g.style.cursor = 'grab';
      const dist = Math.sqrt(
        (nodePos[dragging.nodeIdx].x - dragging.origX)**2 +
        (nodePos[dragging.nodeIdx].y - dragging.origY)**2
      );
      if (dist > 5) {
        const nodeEl = nodeLayer.querySelectorAll('.node-group')[dragging.nodeIdx];
        if (nodeEl) nodeEl._didDrag = true;
        const ni = dragging.nodeIdx;
        state.nodeRatios[ni] = { rx: nodePos[ni].x / baseW, ry: nodePos[ni].y / renderH };
      }
      dragging = null;
    }
  });

  svg.addEventListener('click', (e) => {
    if (connectMode) {
      exitConnectMode();
      drawNodes();
    }
  });

  svg.addEventListener('contextmenu', (e) => {
    if (connectMode) {
      e.preventDefault();
      exitConnectMode();
      drawNodes();
    }
  });

  let panning = false, panStart = null;

  svg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const onBackground = e.target === svg || e.target === bgRect || dotGroup.contains(e.target);
    if (!onBackground) return;
    panning = true;
    panStart = { clientX: e.clientX, clientY: e.clientY, vbx: vb.x, vby: vb.y };
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!panning) return;
    const rect = svg.getBoundingClientRect();
    vb.x = panStart.vbx - (e.clientX - panStart.clientX) / rect.width  * vb.w;
    vb.y = panStart.vby - (e.clientY - panStart.clientY) / rect.height * vb.h;
    applyViewBox();
  });

  window.addEventListener('mouseup', () => {
    if (panning) { panning = false; svg.style.cursor = connectMode ? 'crosshair' : 'default'; }
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      const { x: mx, y: my } = toSVGCoords(e.clientX, e.clientY);
      const delta = -e.deltaY * 0.01;
      const scale = 1 / (1 + delta);
      const newW = Math.min(MAX_W, Math.max(MIN_W, vb.w * scale));
      if (newW === vb.w) return;
      const actualScale = newW / vb.w;
      vb.x -= (mx - vb.x) * (actualScale - 1);
      vb.y -= (my - vb.y) * (actualScale - 1);
      vb.w  = newW;
      vb.h  = vb.w * H / W;
    } else {
      vb.x += e.deltaX / rect.width  * vb.w;
      vb.y += e.deltaY / rect.height * vb.h;
    }
    applyViewBox();
  }, { passive: false });

  const hintText = svgEl('text', {
    id: `${svgId}-hint`,
    x: W/2, y: 18,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-size': '14', fill: '#3fb5cc', 'font-weight': 'bold',
    'font-family': '"National Park",sans-serif',
    opacity: '0', 'pointer-events': 'none'
  });
  hintText.textContent = 'Click a room to connect — right-click or click background to cancel';
  svg.appendChild(hintText);

  drawEdges();
  drawNodes();

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const hw = (fullscreen ? nodes[i].fp.cols * CELL_W : CELL_W) / 2 - MARGIN;
    const hh = TILE_H / 2 - MARGIN;
    minX = Math.min(minX, nodePos[i].x - hw);
    maxX = Math.max(maxX, nodePos[i].x + hw);
    minY = Math.min(minY, nodePos[i].y - hh);
    maxY = Math.max(maxY, nodePos[i].y + hh);
  }
  const contentW = maxX - minX, contentH = maxY - minY;
  contentMinX = minX; contentMinY = minY; contentMaxX = maxX; contentMaxY = maxY;
  const FIT_PAD = 40;
  const fitZoom = Math.min(W / (contentW + FIT_PAD * 2), H / (contentH + FIT_PAD * 2), W / MIN_W);
  const fitW = W / fitZoom, fitH = H / fitZoom;
  const contentCx = (minX + maxX) / 2, contentCy = (minY + maxY) / 2;
  vb.x = contentCx - fitW / 2;
  vb.y = contentCy - fitH / 2;
  vb.w = fitW;
  vb.h = fitH;
  applyViewBox();

  const svgKey = clusterIdx + (fullscreen ? '-fs' : '');
  svgZoomControls[svgKey] = (delta) => {
    const scale = 1 / (1 + delta);
    const newW = Math.min(MAX_W, Math.max(MIN_W, vb.w * scale));
    const actualScale = newW / vb.w;
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
    vb.x -= (cx - vb.x) * (actualScale - 1);
    vb.y -= (cy - vb.y) * (actualScale - 1);
    vb.w = newW;
    vb.h = vb.w * H / W;
    applyViewBox();
  };
  svgZoomControls[svgKey + '-restore'] = (x, y, w, h) => {
    vb.x = x; vb.y = y; vb.w = w; vb.h = h;
    applyViewBox();
  };

  return svg;
}

// ── Render ─────────────────────────────────────────────────────────────────────

let clusterCount = 0;

// Store rooms per cluster for fullscreen re-render
const clusterRooms = {};

function rollCluster() {
  clusterCount++;
  const clusterName = document.getElementById('clusterName').value.trim() || `Cluster ${clusterCount}`;
  const environment = (document.getElementById('envSelect') || {value: 'Standard'}).value;

  const sparks = {
    roomTypes: getSparks('sparkRoomTypes'),
    features:  getSparks('sparkFeatures'),
    traps:     getSparks('sparkTraps'),
    obstacles: getSparks('sparkObstacles'),
    boons:     getSparks('sparkBoons'),
    monsters:  getSparks('sparkMonsters'),
  };

  let rooms = buildRooms(sparks, environment);
  rooms = placeNodes(rooms);
  rooms = finalizeRooms(rooms);

  const out = document.getElementById('output');
  const empty = out.querySelector('.empty-state');
  if (empty) empty.remove();

  const block = document.createElement('div');
  block.className = 'cluster-block';

  const hdr = document.createElement('div');
  hdr.className = 'cluster-header';
  const blockId = `block-${clusterCount}`;
  block.id = blockId;
  hdr.innerHTML = `
    <span contenteditable="true" class="cluster-name-edit" spellcheck="false">${clusterName}</span>
    <span style="display:flex;align-items:center;gap:8px">
      <button class="cluster-print-btn" onclick="printCluster(${clusterCount})" style="background:none;border:1px solid rgba(255,255,255,0.5);border-radius:3px;color:var(--grey-lightest);font-size:0.75em;padding:2px 7px;cursor:pointer;font-family:'National Park',sans-serif;text-transform:uppercase;letter-spacing:1px">⎙ Print</button>
      <button onclick="confirmDeleteCluster('${blockId}')" style="background:none;border:1px solid rgba(255,255,255,0.5);border-radius:3px;color:var(--grey-lightest);font-size:0.75em;padding:2px 7px;cursor:pointer;font-family:'National Park',sans-serif;text-transform:uppercase;letter-spacing:1px">✕</button>
    </span>
  `;
  block.appendChild(hdr);

  const mapCardId = `mapcard-${clusterCount}`;
  const mapCard = document.createElement('div');
  mapCard.className = 'map-card';
  mapCard.id = mapCardId;
  mapCard.innerHTML = `
    <div class="map-card-header" onclick="toggleMapCard('${mapCardId}')">
      <span style="cursor:pointer;flex:1">Map</span>
      <span style="display:flex;align-items:center;gap:4px" onclick="event.stopPropagation()">
        <button onclick="zoomSVG('${clusterCount}', false, -0.2)" style="background:var(--grey-lightest);border:none;border-radius:3px;font-size:0.85em;padding:1px 7px;cursor:pointer;font-family:'National Park',sans-serif;color:var(--grey-darkest);line-height:1.4">−</button>
        <button onclick="zoomSVG('${clusterCount}', false, 0.2)" style="background:var(--grey-lightest);border:none;border-radius:3px;font-size:0.85em;padding:1px 7px;cursor:pointer;font-family:'National Park',sans-serif;color:var(--grey-darkest);line-height:1.4">+</button>
        <button onclick="openFullscreen('${mapCardId}')" style="background:none;border:1px solid var(--blue-light);border-radius:3px;font-size:0.75em;padding:2px 8px;cursor:pointer;font-family:'National Park',sans-serif;text-transform:uppercase;letter-spacing:1px;color:var(--grey-darkest);">⛶ Fullscreen</button>
      </span>
    </div>
    <div class="map-card-body"><div class="map-tile-wrap"></div></div>
  `;

  clusterRooms[clusterCount] = rooms;
  mapCard.querySelector('.map-tile-wrap').appendChild(buildSVGMap(rooms, clusterCount, false));
  block.appendChild(mapCard);
  toggleMapCard(mapCardId); // open on load; must be in DOM for scrollHeight to be readable

  block.appendChild(buildNotesCard(clusterCount, null));

  // Card rendering helpers (scoped to this cluster)
  function makeDescLine(enc, encContent, scoreDesc, size) {
    let text = size ? `Size: <em>${size}</em>.<br>` : '';
    if (scoreDesc) text += ` Something <em>${scoreDesc}</em>.<br>`;
    if (enc.kind === 'social' && encContent)
      text += ` NPC <em>${encContent}</em>.<br>`;
    else if (enc.kind === 'clue' && encContent)
      text += ` Spoor: <em>${encContent}</em>.`;
    return `<div class="key-line key-desc"><div class="editable desc-input" contenteditable="true">${text}</div></div>`;
  }

  function encLines(enc, encContent, obstacleContent, boonContent, monster, monStat, monD1, monD2) {
    const obsContent = (enc.kind === 'opportunity') ? obstacleContent : encContent;
    const bnContent  = (enc.kind === 'opportunity' || enc.kind === 'trapboon') ? boonContent : encContent;
    const obstacleLine = (enc.kind === 'obstacle' || enc.kind === 'opportunity') && obsContent
      ? `<div class="key-line" data-bullet="O" data-tags="obstacle"><span class="key-bullet bullet-o">O</span><div class="editable enc-obstacle" contenteditable="true">${fmtContent(obsContent)}</div></div>` : '';
    const trapLine = (enc.kind === 'trap' || enc.kind === 'trapboon') && encContent
      ? `<div class="key-line" data-bullet="T" data-tags="trap"><span class="key-bullet bullet-t">T</span><div class="editable enc-trap" contenteditable="true">${encContent}</div></div>` : '';
    const mLine = monster ? monsterLine(monster, monStat, monD1, monD2) : '';
    const boonLine = (enc.kind === 'boon' || enc.kind === 'opportunity' || enc.kind === 'trapboon') && bnContent
      ? `<div class="key-line" data-bullet="B" data-tags="boon"><span class="key-bullet bullet-b">B</span><div class="editable enc-boon" contenteditable="true">${fmtContent(bnContent)}</div></div>` : '';
    return `${trapLine}${obstacleLine}${mLine}${boonLine}`;
  }

  function monsterLine(monster, stat, d1, d3) {
    if (!monster) return '';
    return `<div class="key-line monster-line" data-bullet="M" data-tags="monster" data-d1="${d1||0}" data-d3="${d3||0}"><span class="key-bullet bullet-m">M</span><div class="editable enc-threat" contenteditable="true">${fmtContent(monster)}</div><span class="stat-tag">${stat}</span></div>`;
  }

  function roomCard(id, titleNum, roomType, isEntrance, diceHTML, bodyHTML) {
    return buildRoomCard(clusterCount, id, titleNum, roomType, isEntrance, diceHTML, bodyHTML);
  }

  const sorted = [...rooms].sort((a,b) => (a.roomNum||99)-(b.roomNum||99));

  const cardEntries = [];
  for (const room of sorted) {
    if (room.kind === 'tower') {
      for (let fi = 0; fi < room.floors.length; fi++)
        cardEntries.push({isTowerFloor: true, floor: room.floors[fi], parentRoom: room, floorIdx: fi});
    } else if (room.kind === 'hall') {
      for (let si = 0; si < room.sections.length; si++)
        cardEntries.push({isHallSection: true, section: room.sections[si], parentRoom: room, sectionIdx: si, isFirst: si === 0});
    } else {
      cardEntries.push({isTowerFloor: false, isHallSection: false, room});
    }
  }

  const entryStats = cardEntries.map((_, i) => STATS[i % 6]);

  // Attach detail lines for fullscreen rendering
  cardEntries.forEach((entry, globalIdx) => {
    const stat = entryStats[globalIdx];
    if (entry.isTowerFloor) {
      const room = entry.parentRoom;
      if (!room._detailLines) room._detailLines = [];
      if (!room._floorDetailLines) room._floorDetailLines = [];
      if (entry.floorIdx > 0) room._detailLines.push({ text: '───', color: '#9ecee6' });
      room._detailLines.push({ text: 'Floor ' + (entry.floorIdx+1), color: '#262626', bold: true, bullet: 'none' });
      const f = entry.floor;
      if (f.size) room._detailLines.push({ text: 'Size: ' + f.size, bullet: 'none' });
      if (f.roomFeature) room._detailLines.push({ text: fmtContent(f.roomFeature), bullet: 'arrow' });
      if (f.encType.kind === 'trap' || f.encType.kind === 'trapboon') room._detailLines.push({ text: f.encContent, bullet: 'T' });
      if (f.encType.kind === 'obstacle') room._detailLines.push({ text: fmtContent(f.obstacleContent||f.encContent), bullet: 'O' });
      if (f.encType.kind === 'opportunity') { room._detailLines.push({ text: fmtContent(f.obstacleContent), bullet: 'O' }); }
      if (f.monster) room._detailLines.push({ text: fmtContent(f.monster), bullet: 'M' });
      if (f.encType.kind === 'boon' || f.encType.kind === 'trapboon') room._detailLines.push({ text: fmtContent(f.boonContent || f.encContent), bullet: 'B' });
      if (f.encType.kind === 'opportunity') room._detailLines.push({ text: fmtContent(f.boonContent), bullet: 'B' });
      // Per-floor lines for tower stack UI
      room._floorDetailLines[entry.floorIdx] = buildFloorLines(f);
    } else if (entry.isHallSection && entry.isFirst) {
      const room = entry.parentRoom;
      room._detailLines = [];
      const hallBaseIdx = globalIdx;
      room.sections.forEach((s, si) => {
        const ss = entryStats[hallBaseIdx + si];
        if (si > 0) room._detailLines.push({ text: '───', color: '#9ecee6' });
        room._detailLines.push({ text: 'Section ' + (si+1), color: '#262626', bold: true, bullet: 'none' });
        if (s.size) room._detailLines.push({ text: 'Size: ' + s.size, bullet: 'none' });
        if (s.feature) room._detailLines.push({ text: fmtContent(s.feature), bullet: 'arrow' });
        if (s.encType.kind === 'trap' || s.encType.kind === 'trapboon') room._detailLines.push({ text: s.encContent, bullet: 'T' });
        if (s.encType.kind === 'obstacle') room._detailLines.push({ text: fmtContent(s.obstacleContent||s.encContent), bullet: 'O' });
        if (s.encType.kind === 'opportunity') room._detailLines.push({ text: fmtContent(s.obstacleContent), bullet: 'O' });
        if (s.monster) room._detailLines.push({ text: fmtContent(s.monster), bullet: 'M' });
        if (s.encType.kind === 'boon' || s.encType.kind === 'trapboon') room._detailLines.push({ text: fmtContent(s.boonContent || s.encContent), bullet: 'B' });
        if (s.encType.kind === 'opportunity') room._detailLines.push({ text: fmtContent(s.boonContent), bullet: 'B' });
      });
    } else if (!entry.isTowerFloor && !entry.isHallSection) {
      const room = entry.room;
      room._detailLines = [];
      if (room.size) room._detailLines.push({ text: 'Size: ' + room.size, bullet: 'none' });
      if (room.roomFeature) room._detailLines.push({ text: fmtContent(room.roomFeature), bullet: 'arrow' });
      if (room.encType.kind === 'trap' || room.encType.kind === 'trapboon') room._detailLines.push({ text: room.encContent, bullet: 'T' });
      if (room.encType.kind === 'obstacle') room._detailLines.push({ text: fmtContent(room.obstacleContent||room.encContent), bullet: 'O' });
      if (room.encType.kind === 'opportunity') room._detailLines.push({ text: fmtContent(room.obstacleContent), bullet: 'O' });
      if (room.monster) room._detailLines.push({ text: fmtContent(room.monster), bullet: 'M' });
      if (room.encType.kind === 'boon' || room.encType.kind === 'trapboon') room._detailLines.push({ text: fmtContent(room.boonContent || room.encContent), bullet: 'B' });
      if (room.encType.kind === 'opportunity') room._detailLines.push({ text: fmtContent(room.boonContent), bullet: 'B' });
    }
  });

  // Render cards
  cardEntries.forEach((entry, globalIdx) => {
    const stat = entryStats[globalIdx];

    if (entry.isTowerFloor) {
      const f = entry.floor;
      const room = entry.parentRoom;
      const idx = rooms.indexOf(room);
      const letters = 'abcdefghij';
      const titleNum = `${room.roomNum}${letters[entry.floorIdx]}`;
      const floorId = `${idx}-f${entry.floorIdx}`;
      const diceHTML = `<div class="card-dice">
        <div class="die-pip">${f.d1}</div>
        <div class="die-pip">${f.d2}</div>
        <div class="die-pip">${f.d3}</div>
        <span class="die-sum">=${f.sum}</span>
        <span class="stat-tag"${f.monster ? ' style="color:var(--red);border-color:var(--red);background:rgba(250,128,114,0.12)"' : ''}>${stat}</span>
      </div>`;
      const bodyHTML = `
        ${makeDescLine(f.encType, f.encContent, f.scoreDesc, f.size)}
        <div class="key-line" data-bullet="arrow" data-tags=""><span class="key-bullet bullet-arrow">▶︎</span><div class="editable" contenteditable="true">${fmtContent(f.roomFeature)}</div></div>
        ${encLines(f.encType, f.encContent, f.obstacleContent, f.boonContent, f.monster, 'Unusually high ' + stat, f.d1, f.d2)}
      `;
      block.appendChild(roomCard(floorId, titleNum, f.roomType, entry.floorIdx === 0 && room.isEntrance, diceHTML, bodyHTML));

    } else if (entry.isHallSection) {
      if (!entry.isFirst) return;
      const room = entry.parentRoom;
      const idx = rooms.indexOf(room);
      const hallBaseIdx = globalIdx;
      const sectionStats = room.sections.map((_, si) => entryStats[hallBaseIdx + si]);

      const dicePairs = room.sections.map((s, si) => `
        <div class="card-dice" style="gap:3px">
          <div class="die-pip">${s.d1}</div>
          <div class="die-pip">${s.d2}</div>
          <div class="die-pip">${s.d3}</div>
          <span class="die-sum">=${s.sum}</span>
          <span class="stat-tag"${s.monster ? ' style="color:var(--red);border-color:var(--red);background:rgba(250,128,114,0.12)"' : ''}>${sectionStats[si]}</span>
        </div>`).join('');
      const diceHTML = `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">${dicePairs}</div>`;

      const allFeatures  = room.sections.filter(s => s.feature).map(s =>
        `<div class="key-line" data-bullet="arrow" data-tags=""><span class="key-bullet bullet-arrow">▶︎</span><div class="editable" contenteditable="true">${fmtContent(s.feature)}</div></div>`);
      const allTraps = room.sections.filter(s => s.encType.kind === 'trap' || s.encType.kind === 'trapboon').map(s =>
        `<div class="key-line" data-bullet="T" data-tags="trap"><span class="key-bullet bullet-t">T</span><div class="editable enc-trap" contenteditable="true">${s.encContent}</div></div>`);
      const allObstacles = room.sections.filter(s => s.encType.kind === 'obstacle' || s.encType.kind === 'opportunity').map(s =>
        `<div class="key-line" data-bullet="O" data-tags="obstacle"><span class="key-bullet bullet-o">O</span><div class="editable enc-obstacle" contenteditable="true">${fmtContent(s.obstacleContent || s.encContent)}</div></div>`);
      const allMonsters = room.sections.filter(s => s.monster).map(s =>
        monsterLine(s.monster, 'Unusually high ' + sectionStats[room.sections.indexOf(s)], s.d1, s.d3));
      const allBoons = room.sections.filter(s => s.encType.kind === 'boon' || s.encType.kind === 'opportunity' || s.encType.kind === 'trapboon').map(s =>
        `<div class="key-line" data-bullet="B" data-tags="boon"><span class="key-bullet bullet-b">B</span><div class="editable enc-boon" contenteditable="true">${fmtContent(s.boonContent || s.encContent)}</div></div>`);

      const sectionBlocks = [...allFeatures, ...allObstacles, ...allTraps, ...allMonsters, ...allBoons].join('');
      const bodyHTML = `${makeDescLine({kind:'none'}, '', (room.sections && room.sections[0] ? room.sections[0].scoreDesc : '') || '', room.hallSize)}${sectionBlocks}`;
      block.appendChild(roomCard(idx, room.roomNum, room.roomType, room.isEntrance, diceHTML, bodyHTML));

    } else {
      const room = entry.room;
      const idx = rooms.indexOf(room);

      if (room.kind === 'room') {
        const diceHTML = `<div class="card-dice">
          <div class="die-pip">${room.d1}</div>
          <div class="die-pip">${room.d2}</div>
          <div class="die-pip">${room.d3}</div>
          <span class="die-sum">=${room.sum}</span>
          <span class="stat-tag"${room.monster ? ' style="color:var(--red);border-color:var(--red);background:rgba(250,128,114,0.12)"' : ''}>${stat}</span>
        </div>`;
        const bodyHTML = `
          ${makeDescLine(room.encType, room.encContent, room.scoreDesc, room.size)}
          <div class="key-line" data-bullet="arrow" data-tags=""><span class="key-bullet bullet-arrow">▶︎</span><div class="editable" contenteditable="true">${fmtContent(room.roomFeature)}</div></div>
          ${encLines(room.encType, room.encContent, room.obstacleContent, room.boonContent, room.monster, 'Unusually high ' + stat, room.d1, room.d2)}
        `;
        block.appendChild(roomCard(idx, room.roomNum, room.roomType, room.isEntrance, diceHTML, bodyHTML));
      }
    }
  });

  out.appendChild(block);
  block.scrollIntoView({behavior:'smooth', block:'start'});
}

function readLineTags(card, room) {
  const tagEntries = [];
  card.querySelectorAll('.key-line[data-tags]').forEach(line => {
    const tags = (line.dataset.tags || '').split(',').filter(Boolean);
    for (const t of tags) {
      if (t === 'trap')     tagEntries.push({ tombIcon: 'T', color: '#fa8072' });
      if (t === 'obstacle') tagEntries.push({ tombIcon: 'O', color: '#262626' });
      if (t === 'monster')  tagEntries.push({ tombIcon: 'M', color: '#fa8072' });
      if (t === 'boon')     tagEntries.push({ tombIcon: 'B', color: '#3fb5cc' });
    }
  });
  if (room) room._tombTags = tagEntries;
  return tagEntries;
}

function syncDetailLinesFromCards(idx, rooms) {
  const block = document.getElementById(`block-${idx}`);
  if (!block) return;

  rooms.forEach((room, roomIdx) => {
    if (room.kind === 'tower') {
      room._detailLines = [];
      room._floorDetailLines = [];
      room.floors.forEach((floor, fi) => {
        const cardId = `card-${idx}-${roomIdx}-f${fi}`;
        const card = document.getElementById(cardId);
        if (!card) return;
        if (fi > 0) room._detailLines.push({ text: '───' });
        room._detailLines.push({ text: 'Floor ' + (fi + 1), bold: true, bullet: 'none' });
        const descEl = card.querySelector('.card-body .desc-input');
        const descText = descEl ? (descEl.tagName === 'INPUT' ? descEl.value : descEl.textContent).trim() : '';
        if (descText) room._detailLines.push({ text: descText, isDesc: true, bullet: "none" });
        const floorLines = [];
        if (descText) floorLines.push({ text: descText, isDesc: true, bullet: 'none' });
        card.querySelectorAll('.card-body .key-line:not(.key-desc)').forEach(line => {
          const el = line.querySelector('.editable');
          if (!el) return;
          const text = cleanHTML(el);
          if (!text) return;
          const bullet = line.dataset.bullet || 'arrow';
          room._detailLines.push({ text, bullet });
          floorLines.push({ text, bullet });
        });
        room._floorDetailLines[fi] = floorLines;
        room._detailLines.push(...readLineTags(card, room));
      });
    } else if (room.kind === 'hall') {
      const cardId = `card-${idx}-${roomIdx}`;
      const card = document.getElementById(cardId);
      if (!card) return;
      room._detailLines = [];
      room.sections.forEach((s, si) => {
        if (si > 0) room._detailLines.push({ text: '───', color: '#9ecee6' });
        room._detailLines.push({ text: 'Section ' + (si + 1), color: '#262626', bold: true });
      });
      room._detailLines = [];
      const hallDescEl = card.querySelector('.card-body .desc-input');
      const hallDescText = hallDescEl ? (hallDescEl.tagName === 'INPUT' ? hallDescEl.value : hallDescEl.textContent).trim() : '';
      if (hallDescText) room._detailLines.unshift({ text: hallDescText, isDesc: true, bullet: "none" });
      card.querySelectorAll('.card-body .key-line:not(.key-desc)').forEach(line => {
        const el = line.querySelector('.editable');
        if (!el) return;
        const text = cleanHTML(el);
        if (!text) return;
        const bullet = line.dataset.bullet || 'arrow';
        room._detailLines.push({ text, bullet });
      });
      room._detailLines.push(...readLineTags(card, room));
    } else {
      const cardId = `card-${idx}-${roomIdx}`;
      const card = document.getElementById(cardId);
      if (!card) return;
      room._detailLines = [];
      const roomDescEl = card.querySelector('.card-body .desc-input');
      const roomDescText = roomDescEl ? (roomDescEl.tagName === 'INPUT' ? roomDescEl.value : roomDescEl.textContent).trim() : '';
      if (roomDescText) room._detailLines.push({ text: roomDescText, isDesc: true, bullet: "none" });
      card.querySelectorAll('.card-body .key-line:not(.key-desc)').forEach(line => {
        const el = line.querySelector('.editable');
        if (!el) return;
        const text = cleanHTML(el);
        if (!text) return;
        const bullet = line.dataset.bullet || 'arrow';
        room._detailLines.push({ text, bullet });
      });
      room._detailLines.push(...readLineTags(card, room));
    }
  });
}

function openFullscreen(mapCardId) {
  const idx = mapCardId.replace('mapcard-', '');
  const rooms = clusterRooms[idx];
  if (!rooms) return;
  const isMobile = window.innerWidth < 700;
  const overlay = document.getElementById('map-fullscreen-overlay');
  const body = document.getElementById('map-fullscreen-body');
  const title = document.getElementById('map-fullscreen-title');
  const block = document.getElementById(`block-${idx}`);
  const clusterName = block ? block.querySelector('.cluster-name-edit')?.textContent || 'Map' : 'Map';
  title.textContent = clusterName;

  syncDetailLinesFromCards(idx, rooms);

  body.innerHTML = '';
  const svg = buildSVGMap(rooms, idx, !isMobile);
  svg.style.width = '100%';
  svg.style.height = '100%';
  body.appendChild(svg);
  fullscreenClusterIdx = idx;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

let fullscreenClusterIdx = null;

function closeFullscreen() {
  document.getElementById('map-fullscreen-overlay').classList.remove('active');
  document.body.style.overflow = '';
  if (fullscreenClusterIdx !== null) {
    const rooms = clusterRooms[fullscreenClusterIdx];
    if (rooms) {
      syncDetailLinesFromCards(fullscreenClusterIdx, rooms);
      const wrap = document.querySelector('#mapcard-' + fullscreenClusterIdx + ' .map-tile-wrap');
      if (wrap) {
        wrap.innerHTML = '';
        wrap.appendChild(buildSVGMap(rooms, fullscreenClusterIdx, false));
      }
    }
    fullscreenClusterIdx = null;
  }
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFullscreen(); });

function toggleSpark(id) {
  const group = document.getElementById(id);
  const plus = group.querySelector('.spark-plus');
  const isOpen = group.classList.contains('open');

  plus.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(45deg)';
  plus.textContent = isOpen ? '+' : '−';

  group.classList.toggle('open');
}

// toggleCard: shadows list_script.js's version on dungeon.html (this file loads
// last), so BOTH calling conventions land here and both must work:
//   - a string 'clusterIdx-roomId', from card header onclick attributes
//   - a DOM element, from list_script.js's initStaticCards — which binds every
//     .card[data-static], including the License card injected by script.js
// Passing an element to the string form silently no-ops (getElementById on
// "card-[object HTMLDivElement]"), which is what used to leave the License
// card unexpandable here. Each branch keeps its own original behaviour:
// dungeon cards toggle the class only (their height comes from CSS), static
// cards get the scrollHeight sizing list_script applies elsewhere.
function toggleCard(idOrCard) {
  if (typeof idOrCard === 'string' || typeof idOrCard === 'number') {
    const card = document.getElementById(`card-${idOrCard}`);
    if (card) card.classList.toggle('expanded');
    return;
  }
  const card = idOrCard;
  if (!card || typeof card.querySelector !== 'function') return;
  const body = card.querySelector('.card-body');
  if (!body) return;
  if (card.classList.contains('expanded')) {
    body.style.maxHeight = null;
    card.classList.remove('expanded');
  } else {
    body.style.maxHeight = body.scrollHeight + 'px';
    card.classList.add('expanded');
  }
}

const BULLET_CYCLE = ['arrow', 'T', 'O', 'M', 'B', 'blank'];
const BULLET_DISPLAY = { arrow: '▶︎', T: 'T', O: 'O', M: 'M', B: 'B', blank: '·', none: '' };
const BULLET_CLASSES = { arrow: 'bullet-arrow', T: 'bullet-t', O: 'bullet-o', M: 'bullet-m', B: 'bullet-b', blank: 'bullet-blank', none: 'bullet-none' };
const BULLET_CYCLE_FROM_NONE = ['none', 'arrow', 'T', 'O', 'M', 'B', 'blank'];

// Delegated: clicking a bullet cycles through TOMB states
document.addEventListener('mousedown', function(e) {
  const bullet = e.target.closest('.key-bullet');
  if (!bullet) return;
  e.preventDefault();
  const line = bullet.closest('.key-line');
  if (!line) return;

  const current = line.dataset.bullet || 'arrow';
  const activeCycle = line.dataset.bulletCycle === 'none' ? BULLET_CYCLE_FROM_NONE : BULLET_CYCLE;
  const currentIdx = activeCycle.indexOf(current);
  const nextState = activeCycle[(currentIdx + 1) % activeCycle.length];

  line.dataset.bullet = nextState;
  bullet.textContent = BULLET_DISPLAY[nextState] || '';
  bullet.className = 'key-bullet';
  const cls = BULLET_CLASSES[nextState];
  if (cls) bullet.classList.add(cls);

  const kindMap = { arrow: '', T: 'trap', O: 'obstacle', M: 'monster', B: 'boon', blank: '', none: '' };
  line.dataset.tags = kindMap[nextState] || '';

  const block = line.closest('.cluster-block');
  if (!block) return;
  const idx = block.id.replace('block-', '');
  const rooms = clusterRooms[idx];
  if (rooms) {
    syncDetailLinesFromCards(idx, rooms);
    const svgWrap = block.querySelector('.map-tile-wrap');
    if (svgWrap) {
      svgWrap.innerHTML = '';
      svgWrap.appendChild(buildSVGMap(rooms, idx, false));
    }
  }
});

// Backspace/Delete on empty editable line → remove the whole line
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Backspace' && e.key !== 'Delete') return;
  const el = e.target;
  if (!el.classList.contains('editable') || el.classList.contains('desc-input')) return;
  const line = el.closest('.key-line');
  if (!line) return;
  const rawText = el.tagName === 'INPUT' ? el.value : el.innerHTML.replace(/<[^>]*>/g, '').trim();
  if (rawText === '') { e.preventDefault(); line.remove(); }
}, true);

function placeCursorAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Tracks which cluster indices have had text edits
const dirtyClusterIds = new Set();

// Delegated input listener — marks a cluster dirty when any contenteditable is changed
document.addEventListener('input', function(e) {
  if (!e.target.matches('[contenteditable]')) return;
  const block = e.target.closest('.cluster-block');
  if (!block) return;
  const idx = block.id.replace('block-', '');
  dirtyClusterIds.add(idx);
});

function confirmDeleteCluster(blockId) {
  const idx = blockId.replace('block-', '');
  if (dirtyClusterIds.has(idx)) {
    const result = confirm('Are you sure you want to delete this dungeon? You will lose your work.');
    if (!result) return;
  }
  deleteCluster(blockId);
}

function deleteCluster(blockId) {
  const block = document.getElementById(blockId);
  if (block) {
    const idx = blockId.replace('block-', '');
    dirtyClusterIds.delete(idx);
    block.remove();
  }
}

function scrollToCard(cardId) {
  const overlay = document.getElementById('map-fullscreen-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (fullscreenClusterIdx !== null) {
      const rooms = clusterRooms[fullscreenClusterIdx];
      if (rooms) {
        syncDetailLinesFromCards(fullscreenClusterIdx, rooms);
        const wrap = document.querySelector('#mapcard-' + fullscreenClusterIdx + ' .map-tile-wrap');
        if (wrap) { wrap.innerHTML = ''; wrap.appendChild(buildSVGMap(rooms, fullscreenClusterIdx, false)); }
      }
      fullscreenClusterIdx = null;
    }
  }
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.add('expanded');
  setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}

function addBullet(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const body = card.querySelector('.card-body');
  const btn = body.querySelector('.add-bullet-btn');
  const line = document.createElement('div');
  line.className = 'key-line';
  line.dataset.bullet = 'arrow';
  line.dataset.tags = '';
  line.innerHTML = `<span class="key-bullet bullet-arrow">▶︎</span><div class="editable" contenteditable="true"></div>`;
  body.insertBefore(line, btn);
  line.querySelector('.editable').focus();
}

// ── Save / Load ───────────────────────────────────────────────────────────────

function readCardEditables(idx, rooms) {
  const snapshots = [];
  rooms.forEach((room, roomIdx) => {
    if (room.kind === 'tower') {
      const floorSnaps = room.floors.map((_, fi) => {
        const card = document.getElementById(`card-${idx}-${roomIdx}-f${fi}`);
        return card ? snapCard(card) : { desc: '', lines: [] };
      });
      snapshots.push({ kind: 'tower', floorSnaps });
    } else {
      const card = document.getElementById(`card-${idx}-${roomIdx}`);
      snapshots.push({ kind: room.kind, ...snapCard(card) });
    }
  });
  return snapshots;
}

function snapCard(card) {
  if (!card) return { desc: '', lines: [] };
  const descEl = card.querySelector('.card-body .desc-input');
  const desc = descEl ? (descEl.tagName === 'INPUT' ? descEl.value.trim() : descEl.innerHTML.trim()) : '';
  const lines = [];
  card.querySelectorAll('.card-body .key-line:not(.key-desc)').forEach(lineEl => {
    const el = lineEl.querySelector('.editable');
    if (!el) return;
    const text = cleanHTML(el);
    const rawHTML = el.tagName === 'INPUT' ? el.value.trim() : el.innerHTML
      .replace(/<span[^>]*>\s*<\/span>/g, '')
      .replace(/&nbsp;/g, '\u00A0')
      .trim();
    if (!text) return;
    const cls = ['enc-obstacle','enc-trap','enc-boon','enc-threat','enc-opportunity']
      .find(c => el.classList.contains(c)) || '';
    const bullet = lineEl.dataset.bullet || 'arrow';
    const tags = lineEl.dataset.tags || '';
    const bulletCycle = lineEl.dataset.bulletCycle || '';
    lines.push({ text: rawHTML, cls, bullet, tags, bulletCycle });
  });
  return { desc, lines };
}

async function saveDungeons() {
  const blocks = [...document.querySelectorAll('.cluster-block')];
  if (!blocks.length) { alert('No dungeons to save!'); return; }

  const payload = blocks.map(block => {
    const idx = block.id.replace('block-', '');
    const rooms = clusterRooms[idx];
    const state = clusterState[idx];

    const name    = block.querySelector('.cluster-name-edit')?.textContent.trim() || '';
    const env     = block.querySelector('.cluster-env-select')?.value || '';
    const mapOpen = block.querySelector('.map-card')?.classList.contains('expanded') || false;
    const cardSnaps = readCardEditables(idx, rooms);

    const notesCardEl = block.querySelector('[id^="notescard-"]');
    const notes = notesCardEl ? {
      open:  notesCardEl.classList.contains('expanded'),
      desc:  notesCardEl.querySelector('.notes-desc')?.innerHTML || '',
      line1: notesCardEl.querySelector('.notes-line-1')?.innerHTML || '',
      line2: notesCardEl.querySelector('.notes-line-2')?.innerHTML || '',
      line3: notesCardEl.querySelector('.notes-line-3')?.innerHTML || '',
      line4: notesCardEl.querySelector('.notes-line-4')?.innerHTML || '',
      line5: notesCardEl.querySelector('.notes-line-5')?.innerHTML || '',
      line6: notesCardEl.querySelector('.notes-line-6')?.innerHTML || '',
    } : null;

    return { idx, name, env, mapOpen, rooms,
             state: { ...state, edges: [...state.edges.entries()] },
             cardSnaps, notes };
  });

  const json = JSON.stringify({ version: 1, clusters: payload }, null, 2);
  const defaultName = `3x5Dungeon-${new Date().toISOString().slice(0,10)}.json`;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{ description: '3x5 Dungeon File', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = defaultName;
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadDungeons(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.clusters) throw new Error('Invalid file');
      restoreDungeons(data.clusters);
    } catch(err) {
      alert('Could not load file: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function restoreDungeons(clusters) {
  const out = document.getElementById('output');
  out.innerHTML = '';
  for (const k in clusterRooms) delete clusterRooms[k];
  for (const k in clusterState) delete clusterState[k];
  dirtyClusterIds.clear();
  clusterCount = 0;

  clusters.forEach(saved => {
    clusterCount++;
    const idx = clusterCount;
    dirtyClusterIds.add(String(idx)); // loaded clusters have user data worth protecting

    clusterRooms[idx] = saved.rooms;
    const rawEdges = saved.state.edges || [];
    const edgesMap = Array.isArray(rawEdges)
      ? new Map(rawEdges)
      : new Map(Object.entries(rawEdges));
    clusterState[idx] = { ...saved.state, edges: edgesMap };

    const block = document.createElement('div');
    block.className = 'cluster-block';
    const blockId = `block-${idx}`;
    block.id = blockId;
    const hdr = document.createElement('div');
    hdr.className = 'cluster-header';
    hdr.innerHTML = `
      <span contenteditable="true" class="cluster-name-edit" spellcheck="false">${saved.name}</span>
      <span style="display:flex;align-items:center;gap:8px">
        <button class="cluster-print-btn" onclick="printCluster(${idx})" style="background:none;border:1px solid rgba(255,255,255,0.5);border-radius:3px;color:var(--grey-lightest);font-size:0.75em;padding:2px 7px;cursor:pointer;font-family:'National Park',sans-serif;text-transform:uppercase;letter-spacing:1px">⎙ Print</button>
        <button onclick="confirmDeleteCluster('${blockId}')" style="background:none;border:1px solid rgba(255,255,255,0.5);border-radius:3px;color:var(--grey-lightest);font-size:0.75em;padding:2px 7px;cursor:pointer;font-family:'National Park',sans-serif;text-transform:uppercase;letter-spacing:1px">✕ Delete</button>
      </span>
    `;
    block.appendChild(hdr);
    const mapCardId = `mapcard-${idx}`;
    const mapCard = document.createElement('div');
    mapCard.className = 'map-card' + (saved.mapOpen ? ' expanded' : '');
    mapCard.id = mapCardId;
    mapCard.innerHTML = `
          <div class="map-card-header" onclick="toggleMapCard('${mapCardId}')">
      <span style="cursor:pointer;flex:1">Map <span class="map-chevron">▼</span></span>
      <span style="display:flex;align-items:center;gap:4px" onclick="event.stopPropagation()">
        <button onclick="zoomSVG('${idx}', false, -0.2)" style="background:var(--grey-lightest);border:none;border-radius:3px;font-size:0.85em;padding:1px 7px;cursor:pointer;font-family:'National Park',sans-serif;color:var(--grey-darkest);line-height:1.4">−</button>
        <button onclick="zoomSVG('${idx}', false, 0.2)" style="background:var(--grey-lightest);border:none;border-radius:3px;font-size:0.85em;padding:1px 7px;cursor:pointer;font-family:'National Park',sans-serif;color:var(--grey-darkest);line-height:1.4">+</button>
        <button onclick="openFullscreen('${mapCardId}')" style="background:none;border:1px solid var(--blue-light);border-radius:3px;font-size:0.75em;padding:2px 8px;cursor:pointer;font-family:'National Park',sans-serif;text-transform:uppercase;letter-spacing:1px;color:var(--grey-darkest);">⛶ Fullscreen</button>
      </span>
    </div>
    <div class="map-card-body" style="display:block"><div class="map-tile-wrap"></div></div>
    `;
    mapCard.querySelector('.map-tile-wrap').appendChild(buildSVGMap(saved.rooms, idx, false));
    block.appendChild(mapCard);

    const notesCard = buildNotesCard(idx, saved.notes || null);
    if (saved.notes && saved.notes.open) notesCard.classList.add('expanded');
    block.appendChild(notesCard);

    renderRoomCards(block, idx, saved.rooms, saved.cardSnaps);

    out.appendChild(block);
  });

  clusterCount = Math.max(clusterCount, clusters.length);
}

function renderRoomCards(block, idx, rooms, cardSnaps) {
  function makeDescLine(enc, encContent, scoreDesc, size) {
    let text = size ? `Size: ${size} — Description:` : 'Description:';
    if (scoreDesc) text += ` Something <em>${scoreDesc}</em>.`;
    if (enc.kind === 'social' && encContent)
      text += ` Someone potentially <em>${encContent}</em>.`;
    else if (enc.kind === 'clue' && encContent)
      text += ` Spoor: <em>${encContent}</em>.`;
    return `<div class="key-line key-desc"><div class="editable desc-input" contenteditable="true">${text}</div></div>`;
  }

  function encLines(enc, encContent, obstacleContent, boonContent, monster, monStat, monD1, monD2) {
    const obsContent = (enc.kind === 'opportunity') ? obstacleContent : encContent;
    const bnContent  = (enc.kind === 'opportunity' || enc.kind === 'trapboon') ? boonContent : encContent;
    const obstacleLine = (enc.kind === 'obstacle' || enc.kind === 'opportunity') && obsContent
      ? `<div class="key-line" data-bullet="O" data-tags="obstacle"><span class="key-bullet bullet-o">O</span><div class="editable enc-obstacle" contenteditable="true">${fmtContent(obsContent)}</div></div>` : '';
    const trapLine = (enc.kind === 'trap' || enc.kind === 'trapboon') && encContent
      ? `<div class="key-line" data-bullet="T" data-tags="trap"><span class="key-bullet bullet-t">T</span><div class="editable enc-trap" contenteditable="true">${encContent}</div></div>` : '';
    const mLine = monster ? monsterLine(monster, monStat, monD1, monD2) : '';
    const boonLine = (enc.kind === 'boon' || enc.kind === 'opportunity' || enc.kind === 'trapboon') && bnContent
      ? `<div class="key-line" data-bullet="B" data-tags="boon"><span class="key-bullet bullet-b">B</span><div class="editable enc-boon" contenteditable="true">${fmtContent(bnContent)}</div></div>` : '';
    return `${trapLine}${obstacleLine}${mLine}${boonLine}`;
  }

  function monsterLine(monster, stat, d1, d3) {
    if (!monster) return '';
    return `<div class="key-line monster-line" data-bullet="M" data-tags="monster" data-d1="${d1||0}" data-d3="${d3||0}"><span class="key-bullet bullet-m">M</span><div class="editable enc-threat" contenteditable="true">${fmtContent(monster)}</div><span class="stat-tag">${stat}</span></div>`;
  }

  function roomCard(id, titleNum, roomType, isEntrance, diceHTML, bodyHTML) {
    return buildRoomCard(idx, id, titleNum, roomType, isEntrance, diceHTML, bodyHTML);
  }

  const sorted = [...rooms].sort((a,b) => (a.roomNum||99)-(b.roomNum||99));
  const cardEntries = [];
  for (const room of sorted) {
    if (room.kind === 'tower') {
      for (let fi = 0; fi < room.floors.length; fi++)
        cardEntries.push({isTowerFloor: true, floor: room.floors[fi], parentRoom: room, floorIdx: fi});
    } else if (room.kind === 'hall') {
      for (let si = 0; si < room.sections.length; si++)
        cardEntries.push({isHallSection: true, section: room.sections[si], parentRoom: room, sectionIdx: si, isFirst: si === 0});
    } else {
      cardEntries.push({isTowerFloor: false, isHallSection: false, room});
    }
  }
  const entryStats = cardEntries.map((_, i) => STATS[i % 6]);

  cardEntries.forEach((entry, globalIdx) => {
    const stat = entryStats[globalIdx];
    if (entry.isTowerFloor) {
      const f = entry.floor, room = entry.parentRoom;
      const roomIdx = rooms.indexOf(room);
      const letters = 'abcdefghij';
      const titleNum = `${room.roomNum}${letters[entry.floorIdx]}`;
      const floorId = `${roomIdx}-f${entry.floorIdx}`;
      const diceHTML = `<div class="card-dice"><div class="die-pip">${f.d1}</div><div class="die-pip">${f.d2}</div><div class="die-pip">${f.d3}</div><span class="die-sum">=${f.sum}</span><span class="stat-tag"${f.monster?' style="color:var(--red);border-color:var(--red);background:rgba(250,128,114,0.12)"':''}>${stat}</span></div>`;
      const bodyHTML = `${makeDescLine(f.encType, f.encContent, f.scoreDesc, f.size)}${encLines(f.encType, f.encContent, f.obstacleContent, f.boonContent, f.monster, stat, f.d1, f.d2)}`;
      if (entry.floorIdx === 0) {
        block.appendChild(roomCard(floorId, titleNum, room.roomType || 'Tower', room.isEntrance, diceHTML, bodyHTML));
      } else {
        block.appendChild(roomCard(floorId, titleNum, `Floor ${entry.floorIdx+1}`, false, diceHTML, bodyHTML));
      }
    } else if (entry.isHallSection) {
      if (!entry.isFirst) return;
      const room = entry.parentRoom;
      const roomIdx = rooms.indexOf(room);
      const hallBaseIdx = globalIdx;
      const sectionStats = room.sections.map((_, si) => entryStats[hallBaseIdx + si]);
      const dicePairs = room.sections.map((s, si) => `<div class="card-dice" style="gap:3px"><div class="die-pip">${s.d1}</div><div class="die-pip">${s.d2}</div><div class="die-pip">${s.d3}</div><span class="die-sum">=${s.sum}</span><span class="stat-tag"${s.monster?' style="color:var(--red);border-color:var(--red);background:rgba(250,128,114,0.12)"':''}>${sectionStats[si]}</span></div>`).join('');
      const diceHTML = `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">${dicePairs}</div>`;
      const allFeatures  = room.sections.filter(s => s.feature).map(s => `<div class="key-line" data-bullet="arrow" data-tags=""><span class="key-bullet bullet-arrow">▶︎</span><div class="editable" contenteditable="true">${fmtContent(s.feature)}</div></div>`);
      const allTraps     = room.sections.filter(s => s.encType.kind === 'trap' || s.encType.kind === 'trapboon').map(s => `<div class="key-line" data-bullet="T" data-tags="trap"><span class="key-bullet bullet-t">T</span><div class="editable enc-trap" contenteditable="true">${s.encContent}</div></div>`);
      const allObstacles = room.sections.filter(s => s.encType.kind === 'obstacle' || s.encType.kind === 'opportunity').map(s => `<div class="key-line" data-bullet="O" data-tags="obstacle"><span class="key-bullet bullet-o">O</span><div class="editable enc-obstacle" contenteditable="true">${fmtContent(s.obstacleContent || s.encContent)}</div></div>`);
      const allMonsters  = room.sections.filter(s => s.monster).map(s => monsterLine(s.monster, 'Unusually high ' + sectionStats[room.sections.indexOf(s)], s.d1, s.d3));
      const allBoons     = room.sections.filter(s => s.encType.kind === 'boon' || s.encType.kind === 'opportunity' || s.encType.kind === 'trapboon').map(s => `<div class="key-line" data-bullet="B" data-tags="boon"><span class="key-bullet bullet-b">B</span><div class="editable enc-boon" contenteditable="true">${fmtContent(s.boonContent || s.encContent)}</div></div>`);
      const bodyHTML = `${makeDescLine({kind:'none'}, '', (room.sections && room.sections[0] ? room.sections[0].scoreDesc : '') || '', room.hallSize)}${[...allFeatures,...allObstacles,...allTraps,...allMonsters,...allBoons].join('')}`;
      block.appendChild(roomCard(roomIdx, room.roomNum, room.roomType, room.isEntrance, diceHTML, bodyHTML));
    } else {
      const room = entry.room;
      const roomIdx = rooms.indexOf(room);
      const diceHTML = `<div class="card-dice"><div class="die-pip">${room.d1}</div><div class="die-pip">${room.d2}</div><div class="die-pip">${room.d3}</div><span class="die-sum">=${room.sum}</span><span class="stat-tag"${room.monster?' style="color:var(--red);border-color:var(--red);background:rgba(250,128,114,0.12)"':''}>${stat}</span></div>`;
      const bodyHTML = `${makeDescLine(room.encType, room.encContent, room.scoreDesc, room.size)}${encLines(room.encType, room.encContent, room.obstacleContent, room.boonContent, room.monster, stat, room.d1, room.d2)}`;
      block.appendChild(roomCard(roomIdx, room.roomNum, room.roomType, room.isEntrance, diceHTML, bodyHTML));
    }
  });

  if (cardSnaps) {
    rooms.forEach((room, roomIdx) => {
      const snap = cardSnaps[roomIdx];
      if (!snap) return;
      if (room.kind === 'tower') {
        (snap.floorSnaps || []).forEach((floorSnap, fi) => {
          const card = block.querySelector(`#card-${idx}-${roomIdx}-f${fi}`);
          if (card) applyCardSnap(card, floorSnap);
        });
      } else {
        const card = block.querySelector(`#card-${idx}-${roomIdx}`);
        if (card) applyCardSnap(card, snap);
      }
    });
  }
}

function applyCardSnap(card, snap) {
  if (!snap) return;
  const descEl = card.querySelector('.card-body .desc-input');
  if (descEl && snap.desc) {
    if (descEl.tagName === 'INPUT') descEl.value = snap.desc;
    else descEl.innerHTML = snap.desc;
  }
  const keyLines = [...card.querySelectorAll('.card-body .key-line:not(.key-desc)')];
  snap.lines.forEach((line, i) => {
    if (i < keyLines.length) {
      const lineEl = keyLines[i];
      const el = lineEl.querySelector('.editable');
      if (el) {
        if (el.tagName === 'INPUT') el.value = line.text;
        else el.innerHTML = line.text;
      }
      const bulletState = line.bullet || 'arrow';
      lineEl.dataset.bullet = bulletState;
      if (line.bulletCycle) lineEl.dataset.bulletCycle = line.bulletCycle;
      lineEl.dataset.tags = line.tags || '';
      const bulletEl = lineEl.querySelector('.key-bullet');
      if (bulletEl) {
        bulletEl.textContent = BULLET_DISPLAY[bulletState] || '';
        bulletEl.className = 'key-bullet';
        const cls = BULLET_CLASSES[bulletState];
        if (cls) bulletEl.classList.add(cls);
      }
    } else {
      const btn = card.querySelector('.add-bullet-btn');
      const div = document.createElement('div');
      const bulletState = line.bullet || 'arrow';
      div.className = 'key-line';
      div.dataset.bullet = bulletState;
      if (line.bulletCycle) div.dataset.bulletCycle = line.bulletCycle;
      div.dataset.tags = line.tags || '';
      const bulletDisplay = BULLET_DISPLAY[bulletState] || '';
      const bCls = BULLET_CLASSES[bulletState] || 'bullet-arrow';
      div.innerHTML = `<span class="key-bullet ${bCls}">${bulletDisplay}</span><div class="editable${line.cls ? ' '+line.cls : ''}" contenteditable="true">${line.text}</div>`;
      card.querySelector('.card-body').insertBefore(div, btn);
    }
  });
}

function buildRoomCard(clusterIdx, id, titleNum, roomType, isEntrance, diceHTML, bodyHTML) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.cardType = 'dungeon';
  const cardId = `card-${clusterIdx}-${id}`;
  card.id = cardId;
  card.innerHTML = `
    <div class="card-header" onclick="toggleCard('${clusterIdx}-${id}')" style="cursor:pointer">
      <span class="card-title">${titleNum}. <span class="editable room-type-edit" contenteditable="true" spellcheck="false" onclick="event.stopPropagation()">${roomType}</span>${isEntrance ? ' ▲' : ''}</span>
      ${diceHTML}
    </div>
    <div class="card-body">${bodyHTML}<button class="add-bullet-btn" onclick="addBullet('${cardId}')"><span class="add-icon">▶︎</span></button></div>
  `;
  return card;
}

function buildNotesCard(idx, savedNotes) {
  const cardId = `notescard-${idx}`;
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.cardType = 'dungeon';
  card.id = cardId;

  const sn = savedNotes || {};
  const descText  = sn.desc  !== undefined ? sn.desc  : 'This dungeon is like a <em>[choose an archetype based on your stat rolls].</em>';
  const line1Text = sn.line1 !== undefined ? sn.line1 : 'It wants';
  const line2Text = sn.line2 !== undefined ? sn.line2 : 'It believes';
  const line3Text = sn.line3 !== undefined ? sn.line3 : '<b>Unless otherwise noted, it is dark. Also\u2026</b>\u00A0';
  const line4Text = sn.line4 !== undefined ? sn.line4 : 'Ceilings are';
  const line5Text = sn.line5 !== undefined ? sn.line5 : 'Rooms are';
  const line6Text = sn.line6 !== undefined ? sn.line6 : 'Hallways are';

  card.innerHTML = `
    <div class="card-header" onclick="this.closest('.card').classList.toggle('expanded')" style="cursor:pointer">      <span class="card-title">Notes</span>
    </div>
    <div class="card-body">
      <div class="key-line key-desc" style="margin-top:4px">
        <div class="editable desc-input notes-desc" contenteditable="true">${descText}</div>
      </div>
      <div class="key-line" data-bullet="none" data-tags=""><span class="key-bullet bullet-none">·</span><div class="editable notes-line notes-line-1" contenteditable="true">${line1Text}</div></div>
      <div class="key-line" data-bullet="none" data-tags=""><span class="key-bullet bullet-none">·</span><div class="editable notes-line notes-line-2" contenteditable="true">${line2Text}</div></div>
      <div class="key-line" data-bullet="none" data-tags=""><span class="key-bullet bullet-none">·</span><div class="editable notes-line notes-line-3" contenteditable="true">${line3Text}</div></div>
      <div class="key-line" data-bullet="none" data-tags=""><span class="key-bullet bullet-none">·</span><div class="editable notes-line notes-line-4" contenteditable="true">${line4Text}</div></div>
      <div class="key-line" data-bullet="none" data-tags=""><span class="key-bullet bullet-none">·</span><div class="editable notes-line notes-line-5" contenteditable="true">${line5Text}</div></div>
      <div class="key-line" data-bullet="none" data-tags=""><span class="key-bullet bullet-none">·</span><div class="editable notes-line notes-line-6" contenteditable="true">${line6Text}</div></div>
      <button class="add-bullet-btn" onclick="addBullet('notescard-${idx}')"><span class="add-icon">▶︎</span></button>
    </div>
  `;
  return card;
}

function toggleMapCard(id) {
  const card = document.getElementById(id);
  if (!card) return;
  const body = card.querySelector('.map-card-body');
  if (!body) return;
  const isExpanded = card.classList.contains('expanded');
  if (isExpanded) {
    body.style.maxHeight = null;
    card.classList.remove('expanded');
  } else {
    const h = body.scrollHeight;
    body.style.maxHeight = (h > 50 ? h : 2000) + 'px';
    card.classList.add('expanded');
  }
}

// ── Phase 4: printCluster ─────────────────────────────────────────────────────
// Prints all dungeon cards in a cluster to a single PDF.
// extraCards is reserved for the future Favorites panel feature (see roadmap).
async function printCluster(clusterIdx, extraCards = []) {
  if (typeof jspdf === 'undefined') {
    alert('jsPDF library not loaded. Please refresh and try again.');
    return;
  }

  const block = document.getElementById(`block-${clusterIdx}`);
  if (!block) {
    console.warn('printCluster: no block found for cluster', clusterIdx);
    return;
  }

  const dungeonCards = Array.from(block.querySelectorAll('.card[data-card-type="dungeon"]'));
  const allCards = [...dungeonCards, ...extraCards];

  if (allCards.length === 0) {
    alert('No cards to print in this cluster.');
    return;
  }

  const btn = block.querySelector('.cluster-print-btn');
  let originalHTML;
  if (btn) {
    originalHTML = btn.innerHTML;
    btn.innerHTML = 'generating...';
    btn.disabled = true;
  }

  try {
    await window.printCardsToPDF(allCards, `dungeon-cluster-${clusterIdx}.pdf`);
  } catch (error) {
    console.error('printCluster error:', error);
    alert('Failed to generate PDF. Check console for details.');
  } finally {
    if (btn) {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }
}
