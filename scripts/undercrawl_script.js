// undercrawl_script.js
// 3x5 Undercrawl Generator — standalone page (undercrawl.html).
// Generates Undercrawls per the "Making Crawls" procedure in
// Undercrawl: Travel Rules for Dungeon Games (3x5 Arcana).
//
// ARCHITECTURE NOTES (vs dungeon_script.js, which this page does NOT load):
//   - Layout and the connection graph are DECOUPLED. Nodes are placed on a
//     grid for layout only; edges are wired separately so each area's degree
//     can literally match its rolled die face (1-6). The dungeon generator's
//     grid-adjacency model caps degree at 4 structurally; this avoids that.
//   - Edges have 3 states: open (solid) → secret (dotted) → deleted (removed).
//   - Depth Levels are draggable multi-point dividers; depth reassignment and
//     card updates commit on drag RELEASE, not on pointermove.
//   - Area Numbers are permanent once assigned at generation. Depth edits
//     never renumber areas, so Adjacent cross-references stay valid.
//   - Persistence is file-based Save/Load JSON (same pattern as the dungeon
//     generator). No localStorage.
//   - Print reuses window.printCardsToPDF from card_print.js. Cards carry NO
//     data-card-type="dungeon" attribute, so the generic extractor walks
//     .card-body children in DOM order (book order), preserving <b> labels.
//     The button row uses class "card-actions" so the extractor skips it.

// ── HELPERS ───────────────────────────────────────────────────────────────────

function d6() { return Math.floor(Math.random() * 6) + 1; }
function d66pick(table) { return table[(d6() - 1) * 6 + (d6() - 1)]; }
function pick(table) { return table[Math.floor(Math.random() * table.length)]; }

function ucSvgEl(tag, attrs = {}, children = []) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) el.appendChild(c);
  return el;
}

// ── TABLES (Undercrawl playtest doc, "Making Crawls" pp. 26-31) ──────────────

// Area Types d66. First d6 = category (6 → refer to Caves), second d6 = entry.
// Each entry: [type name, landmark descriptor (2nd column of the book table)].
const UC_AREA_TYPES = [
  { category: 'Caves', entries: [
    ['Crystal Caves', 'Dazzling otherworldly formations'],
    ['Limestone Caverns', 'Stalagmites, always wet'],
    ['Cenote', 'White-skinned eyeless things'],
    ['Carved by water', 'Smooth walls, sloping down'],
    ['Fractured by earthquake', 'Sharp edges, precipitous chasms'],
    ['Glacial Caves', 'Ice. Precarious, cracking.'],
  ]},
  { category: 'Mines', entries: [
    ['Coal Mine', 'Awful, cramped, black'],
    ['Metal Mine', 'Ventilation shafts'],
    ['Dwarven Mine', 'Strongholds and living spaces'],
    ['Salt Mine', 'Rapid dehydration'],
    ['Gemstone Mine', 'Blasted-out chambers, rubble'],
    ['Gold Mine', 'Guard stations, infrastructure'],
  ]},
  { category: 'Living Spaces', entries: [
    ['Underground City', 'Thoughtful layout'],
    ['Built as hideaway', 'Chokepoints, narrow passages'],
    ['Dwarves!', 'Beautiful, geometric'],
    ['Strange civilization', 'Bizarre logic of layout'],
    ['Goblins!', 'Practical. Low ceilings.'],
    ['Built over centuries by many', 'Haphazard, meandering'],
  ]},
  { category: 'Excavated Chambers', entries: [
    ['A wizard did it', 'Non-euclidean geometry, sickening'],
    ['Religious Origin', 'Beautiful, sculptures and frescoes'],
    ['Purple Worms', 'Huge, rough spherical tunnels'],
    ['Necropolis or Catacomb', 'Religious artifacts, dead-end rooms'],
    ['Unknowable Horrors', 'Dripping with slime, sentient walls'],
    ['Sewer or storage', 'Utilitarian, rooms and narrow tunnels'],
  ]},
  { category: 'Tunnels', entries: [
    ['Dug by creatures', 'Sized for one creature at a time'],
    ['Lava Tubes', 'Smooth tunnels, descending maze'],
    ['Eaten away', 'Tight, twisting, often too narrow'],
    ['Extraplanar origins', 'Vast, howling with dark wind'],
    ['Underground river', 'Lakes, low ceilings, strange creatures'],
    ['Built to link distant spaces', 'Worn track, diverse stone types'],
  ]},
];

// Hidden Feature type d6: 1-2 Mapper, 3-4 Keeper, 5-6 Seeker.
function rollHiddenType() {
  const r = d6();
  return r <= 2 ? 'Mapper' : r <= 4 ? 'Keeper' : 'Seeker';
}

// Something Here Is d6
const UC_SOMETHING_HERE = ['Hungry', 'Grieving', 'Lost', 'In Need', 'Incomplete', 'Missing'];

// Something There Is d66
const UC_SOMETHING_THERE = [
  'wildly out of place', 'half buried', 'bricked up on purpose', 'undead now', 'behind bars', 'broken in half',
  'inside a circle of candles', 'lovingly protected', 'its face is erased', 'at the bottom of a pit', 'stuck partway in an anvil', 'magically guarded',
  'blighted', 'cursed', 'bathed in magical terror', 'starved to death', 'was sacrificed on an altar', 'inverted from its purpose',
  'alien life depends on it', 'mindlessly worships now', 'a fungal colony worships it', 'weird fish people love it', 'horrifying bats live in it', 'bugs are rebuilding it',
  'turned to stone', 'made of blood now', 'intermittently corporeal', 'gone mad with darkness', 'electric now', 'inversely affected by gravity',
  'encased in amber', 'howling', 'suspended over lava', 'multiplying slowly', 'melting', 'having an absolute ball',
];

// THIS AREA... history columns (d66 each). "Roll on any 2-5 columns" — the
// History button rolls all 5 per Samuel's spec.
const UC_WAS = [
  'hopefully', 'famously', 'lovingly', 'suddenly', 'thoroughly', 'hastily',
  'intentionally', 'carefully', 'fearfully', 'slowly', 'gently', 'terrifyingly',
  'callously', 'vengefully', 'steadily', 'haphazardly', 'spiritually', 'greedily',
  'studiously', 'strictly', 'brutally', 'peacefully', 'unevenly', 'cheaply',
  'peacefully', 'poorly', 'incompletely', 'cheerfully', 'rapidly', 'heroically',
  'partially', 'religiously', 'audaciously', 'secretly', 'blithely', 'horrifically',
];
const UC_ONCE = [
  'inhabited', 'visited', 'built', 'destroyed', 'flooded', 'evacuated',
  'ruined', 'preserved', 'sealed', 'abandoned', 'holy', 'unholy',
  'colonized', 'cursed', 'nourished', 'commanded', 'revived', 'mined',
  'hidden', 'forbidden', 'conquered', 'farmed', 'tamed', 'bought',
  'overthrown', 'excavated', 'explored', 'developed', 'expanded', 'reversed',
  'submerged', 'rebuilt', 'mapped', 'stolen', 'blessed', 'loved',
];
const UC_BYWITH = [
  'dwarves', 'elves', 'orcs', 'dragons', 'fungus', 'goblins',
  'fairies', 'insects', 'water', 'sand', 'time', 'death itself',
  'a powerful god', 'a forgotten god', 'a powerful demon', 'a jilted demon', 'fire', 'stone beings',
  'trolls', 'basilisks', 'lava', 'earthquakes', 'wizards', 'an undead being',
  'shadows that speak', 'ice', 'oozes', 'a dream', 'evil roots', 'miners',
  'eyeless things', 'fear', 'the obsidian king', 'druids', 'the Wandering Merchant', 'Shune the Vile',
];
const UC_BECAME = [
  'permanently dry', 'permanently wet', 'upside down', 'haunted', 'inaccessible', 'profoundly empty',
  'permanently silenced', 'twice as large', 'a mausoleum', 'permanently hot', 'filled with glass', 'beautiful',
  'horrifying', 'a wellspring of sadness', 'a corrupting influence', 'a wellspring of power', 'full of the dead', 'legendary',
  'the site of several battles', 'crystalline', 'fragile beyond belief', 'sundered', 'a tomb complex', 'a thin place',
  'infested with ants', 'a tourist attraction, briefly', 'a secret bunker', 'a hideout for outlaws', 'a religious sanctuary', 'a haven for the persecuted',
  "a powerful monster's den", 'a thoroughfare', 'bleak as death', 'depressingly common', 'shockingly beautiful', 'persistently nauseating',
];
const UC_SHOWNBY = [
  'a fresco', 'a faded tapestry', 'carvings on the wall', 'the bones of the dead', 'a statue', 'a thing that should not still be alive',
  'graffiti scrawled on a wall', 'very strange architecture', 'runes on a broken blade', 'a very specific fabric', 'a shard of a solidified dream', 'a smell that gives visions',
  'a sentient, lonesome stone', 'the mad carvings of someone trapped', 'harmless undead, reenacting forever', 'the buildings that still stand', 'a tiled floor', 'a tidy shrine, offerings intact',
  'a mosaic', 'a magic mouth on a door', 'a programmed illusion', 'a glitching illusion hiding the truth', "a material that shouldn't be here", 'a chronicle in six hands, 1/3 readable',
  'the distinct artwork of a lost age', 'arms or armor left behind', 'the trash that no one removed', 'a heap of bones', 'the solitary figure who lives here still', 'a story you took to be mad ravings',
  'an intelligent household object', 'a colony of psychic tardigrades', 'a corpse untouched by time', 'a sarcophagus carven with a story', 'a statue with a plaque', 'carvings on a series of gravestones',
];

// ── STATE ─────────────────────────────────────────────────────────────────────

let crawlCount = 0;
const crawlAreas = {};   // idx → array of area objects
const crawlState = {};   // idx → { edges: Map, nodeRatios, dividers, depthCount }
const dirtyCrawlIds = new Set();
const ucZoomControls = {};
let fullscreenCrawlIdx = null;

// Map render constants (shared scale with dungeon generator visuals)
const UC_CELL_W = 280, UC_CELL_H = 168, UC_PAD = 2, UC_MARGIN = 14;

function markDirty(idx) { dirtyCrawlIds.add(String(idx)); }

// ── GENERATION ────────────────────────────────────────────────────────────────

// Roll one area per the book: die face = target degree, Area Type d66
// (6X refers to Caves), Hidden Feature type d6.
function buildAreas(count) {
  const areas = [];
  for (let i = 0; i < count; i++) {
    const face = d6();
    let cat = d6();
    if (cat === 6) cat = 1;             // "6X Refer to Caves."
    const catObj = UC_AREA_TYPES[cat - 1];
    const [typeName, landmark] = catObj.entries[d6() - 1];
    areas.push({
      face,
      typeName,
      landmark,
      category: catObj.category,
      hiddenType: rollHiddenType(),
      roomNum: 0,      // assigned after depth banding; permanent thereafter
      depth: 1,
    });
  }
  return areas;
}

// ── GRAPH FIRST, LAYOUT SECOND ───────────────────────────────────────────────
// The book's rule is that each Area connects to a number of Areas equal to its
// rolled face. That is a statement about the GRAPH, not about the drawing, so
// the graph is built first and honoured exactly. Finding a readable picture of
// it is a separate problem, solved afterwards by the force layout below.

// Erdős–Gallai: is a degree sequence buildable as a simple graph at all?
// Some rolls simply aren't — e.g. 6,6,5,2,2,1,1,1,1,1 asks for three hubs
// wanting five or six connections each, with nothing but dead ends to attach
// to. No amount of cleverness draws that; the sequence has to change.
function isGraphical(degs) {
  const d = [...degs].sort((a, b) => b - a);
  const n = d.length;
  if (d.reduce((s, x) => s + x, 0) % 2) return false;
  if (d[0] > n - 1 || d[n - 1] < 0) return false;
  let lhs = 0;
  for (let k = 1; k <= n; k++) {
    lhs += d[k - 1];
    let rhs = k * (k - 1);
    for (let i = k; i < n; i++) rhs += Math.min(d[i], k);
    if (lhs > rhs) return false;
  }
  return true;
}

// The rolled faces are a degree sequence, and not every sequence can be built.
// Four things have to hold, so they're enforced here — minimally, by editing
// the faces themselves. This is exactly what a GM does at the table: if the
// dice ask for something the map can't have, you erase the 4 and write a 5.
// The fudged face IS the face from here on, so the pips on the card can never
// disagree with the lines on the map.
//   1. No area can connect to more areas than exist  → cap at n-1 (and at 6,
//      since no d6 can ask for more than that).
//   2. A connected graph needs at least n-1 edges → sum ≥ 2(n-1).
//   3. Handshake lemma: every edge adds 2 to the total degree, so the sum must
//      be even. An odd sum is unsatisfiable no matter how you draw it — and
//      the sum of N d6 is odd half the time, so this is the common case.
//   4. The sequence must be graphical (above). Repaired by moving a connection
//      from the greediest area to the neediest, which leaves the total — and so
//      the parity and the edge count — untouched.
function fixDegreeSequence(areas) {
  const n = areas.length;
  const MAXFACE = Math.min(6, n - 1);

  areas.forEach(a => { a.face = Math.min(a.face, MAXFACE); });

  const sum = () => areas.reduce((s, a) => s + a.face, 0);

  // 2 — enough degree to span. Raise the lowest degrees first.
  while (sum() < 2 * (n - 1)) {
    const a = areas.filter(x => x.face < MAXFACE).sort((x, y) => x.face - y.face)[0];
    if (!a) break;
    a.face++;
  }

  // 3 — parity.
  if (sum() % 2 === 1) {
    const up = areas.filter(a => a.face < MAXFACE);
    if (up.length) {
      up[Math.floor(Math.random() * up.length)].face++;
    } else {
      const a = areas.filter(x => x.face > 1)[0];
      if (a) a.face--;
    }
  }

  // 4 — graphical. Transfer degree from the greediest to the neediest: the sum
  // never changes, so this can't undo steps 2 or 3, and the sequence walks
  // steadily toward something buildable.
  let guard = 0;
  while (!isGraphical(areas.map(a => a.face)) && guard++ < n * 8) {
    const sorted = [...areas].sort((a, b) => b.face - a.face);
    const hi = sorted[0], lo = sorted[sorted.length - 1];
    if (hi.face - lo.face < 2) break;
    hi.face--; lo.face++;
  }
}

// Havel–Hakimi: repeatedly take the neediest area and wire it to the next
// neediest. Guaranteed to realise the sequence exactly if it is graphical.
// Ties are broken randomly so repeated rolls don't produce the same shape.
function realizeDegrees(areas) {
  const n = areas.length;
  const rem = areas.map(a => a.face);
  const edges = new Map();
  const keyOf = (i, j) => `${Math.min(i, j)}-${Math.max(i, j)}`;

  for (let guard = 0; guard < n + 2; guard++) {
    const live = [...Array(n).keys()].filter(i => rem[i] > 0)
      .sort((a, b) => (rem[b] - rem[a]) || (Math.random() - 0.5));
    if (!live.length) break;
    const v = live[0];
    const targets = live.slice(1).filter(u => !edges.has(keyOf(v, u)));
    if (targets.length < rem[v]) return null;      // not graphical
    for (let t = 0; t < rem[v]; t++) {
      const u = targets[t];
      edges.set(keyOf(v, u), { i: Math.min(v, u), j: Math.max(v, u), state: 'open' });
      rem[u]--;
    }
    rem[v] = 0;
  }
  return edges;
}

function componentsOf(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const e of edges.values()) { adj[e.i].push(e.j); adj[e.j].push(e.i); }
  const seen = new Set(), comps = [];
  for (let s = 0; s < n; s++) {
    if (seen.has(s)) continue;
    const comp = [], q = [s];
    seen.add(s);
    while (q.length) {
      const u = q.shift();
      comp.push(u);
      for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); q.push(v); }
    }
    comps.push(comp);
  }
  return comps;
}

// Havel–Hakimi can leave the graph in pieces. Merge them with degree-preserving
// 2-swaps: delete a-b and c-d from two components, add a-c and b-d. Every
// area's connection count is unchanged, so the rolled degrees survive intact —
// this is why connectivity costs nothing here.
function makeConnected(n, edges) {
  const keyOf = (i, j) => `${Math.min(i, j)}-${Math.max(i, j)}`;
  for (let guard = 0; guard < n * 4; guard++) {
    const comps = componentsOf(n, edges);
    if (comps.length <= 1) return true;
    const A = new Set(comps[0]), B = new Set(comps[1]);
    const eA = [...edges.values()].filter(e => A.has(e.i));
    const eB = [...edges.values()].filter(e => B.has(e.i));
    let done = false;
    outer:
    for (const x of eA) {
      for (const y of eB) {
        for (const [p, q] of [[x.i, y.i], [x.i, y.j]]) {
          const r = p === x.i ? x.j : x.i;
          const s = q === y.i ? y.j : y.i;
          if (p === q || r === s) continue;
          if (edges.has(keyOf(p, q)) || edges.has(keyOf(r, s))) continue;
          edges.delete(keyOf(x.i, x.j));
          edges.delete(keyOf(y.i, y.j));
          edges.set(keyOf(p, q), { i: Math.min(p, q), j: Math.max(p, q), state: 'open' });
          edges.set(keyOf(r, s), { i: Math.min(r, s), j: Math.max(r, s), state: 'open' });
          done = true;
          break outer;
        }
      }
    }
    if (!done) return false;
  }
  return componentsOf(n, edges).length <= 1;
}

// Build the graph: every area gets exactly as many connections as its face
// shows. fixDegreeSequence has already nudged any face the dice got wrong, so
// "exact" here is exact — degree always equals face. Retries cover the rare
// non-graphical sequence.
function wireGraphExact(areas) {
  const n = areas.length;
  if (n < 2) return new Map();
  fixDegreeSequence(areas);
  for (let attempt = 0; attempt < 40; attempt++) {
    const edges = realizeDegrees(areas);
    if (edges && makeConnected(n, edges)) return edges;
  }
  return realizeDegrees(areas) || new Map();
}

// ── FORCE-DIRECTED LAYOUT + UNTANGLING ───────────────────────────────────────
// Fruchterman–Reingold: edges are springs pulling their areas together, all
// areas repel each other, and the system cools like annealing metal.
//
// Two departures from textbook FR, both earning their keep:
//   - Work in CELL units (1 unit = one card slot) instead of pixels. Cards are
//     wider than they are tall, so isotropic repulsion in cell space becomes
//     elliptical in real space — packing cards the shape they actually are.
//   - A depth bias pulls each area toward a y set by its BFS distance from the
//     entrance. Undercrawl is a descent; plain FR returns a directionless blob.
//     It also makes Depth Levels mean something: deeper really is further in.
//
// Layout alone is NOT enough, and this is the crux of the whole problem. A
// graph has an intrinsic crossing number — Havel–Hakimi wires high-degree areas
// to other high-degree areas, and the resulting hub graph simply cannot be
// drawn cleanly by any algorithm. So the graph itself has to move too, which is
// what untanglePass does: it searches the space of graphs that have the exact
// same degree sequence, looking for one that happens to draw well.

function bfsLevels(n, edges, start) {
  const adj = Array.from({ length: n }, () => []);
  for (const e of edges.values()) { adj[e.i].push(e.j); adj[e.j].push(e.i); }
  const lv = new Array(n).fill(-1);
  lv[start] = 0;
  const q = [start];
  while (q.length) {
    const u = q.shift();
    for (const v of adj[u]) if (lv[v] === -1) { lv[v] = lv[u] + 1; q.push(v); }
  }
  for (let i = 0; i < n; i++) if (lv[i] === -1) lv[i] = 0;
  return lv;
}

const UC_K = 1.85;          // ideal edge length, in cells
const UC_LEVEL_GAP = 1.45;  // vertical spacing between BFS levels
const UC_BIAS = 0.28;       // strength of the descent pull
// Repulsion only acts within this radius (in units of UC_K). Textbook FR
// confines the graph to a frame and normalises the ideal distance to that
// frame's area; this code has no frame, so without a cutoff every area shoves
// every other area forever and the map inflates until attraction catches up —
// 25 cards sprawling over 27 cells, ~5 cells apart, when their edges only want
// 1.85. Spacing is a local concern: areas need room from their NEIGHBOURS, not
// from a card thirty cells away. Cutting it off costs nothing (crossings are
// unchanged or slightly better, since a compact graph has less room to tangle)
// and roughly doubles how large the cards render.
const UC_REPEL_CUTOFF = 2;

function runFR(areas, edges, P, levels, iterations, startTemp) {
  const n = areas.length;
  const list = [...edges.values()];
  const maxRepel = UC_REPEL_CUTOFF * UC_K;
  let temp = startTemp;
  for (let it = 0; it < iterations; it++) {
    const disp = P.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
        let d2 = dx * dx + dy * dy;
        if (d2 > maxRepel * maxRepel) continue;
        if (d2 < 1e-6) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = dx * dx + dy * dy; }
        const d = Math.sqrt(d2);
        const f = (UC_K * UC_K) / d;
        disp[i].x += (dx / d) * f; disp[i].y += (dy / d) * f;
        disp[j].x -= (dx / d) * f; disp[j].y -= (dy / d) * f;
      }
    }
    for (const e of list) {
      const dx = P[e.i].x - P[e.j].x, dy = P[e.i].y - P[e.j].y;
      const d = Math.max(Math.hypot(dx, dy), 1e-3);
      const f = (d * d) / UC_K;
      disp[e.i].x -= (dx / d) * f; disp[e.i].y -= (dy / d) * f;
      disp[e.j].x += (dx / d) * f; disp[e.j].y += (dy / d) * f;
    }
    for (let i = 0; i < n; i++) disp[i].y += (levels[i] * UC_LEVEL_GAP - P[i].y) * UC_BIAS;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(disp[i].x, disp[i].y);
      if (d > 1e-9) {
        const step = Math.min(d, temp);
        P[i].x += (disp[i].x / d) * step;
        P[i].y += (disp[i].y / d) * step;
      }
    }
    temp *= 0.985;
  }
  return P;
}

// Count crossings between one edge and every other edge.
function edgeCrossings(e, list, P, skip) {
  let c = 0;
  for (const m of list) {
    if (m === skip || m === e) continue;
    if (m.i === e.i || m.i === e.j || m.j === e.i || m.j === e.j) continue;
    if (segsCross(P[e.i], P[e.j], P[m.i], P[m.j])) c++;
  }
  return c;
}
function pairCross(a, b, P) {
  if (a.i === b.i || a.i === b.j || a.j === b.i || a.j === b.j) return 0;
  return segsCross(P[a.i], P[a.j], P[b.i], P[b.j]) ? 1 : 0;
}

// 2-opt on the graph. Two edges cross; delete both and reconnect their four
// endpoints the other way round. Every endpoint keeps the same number of
// connections, so the rolled degrees are untouched — but the tangle is gone.
// This is the move that buys 100% degree fidelity AND a clean map: it changes
// WHICH areas connect, never HOW MANY.
function untanglePass(areas, edges, P) {
  const n = areas.length;
  const keyOf = (i, j) => `${Math.min(i, j)}-${Math.max(i, j)}`;
  let list = [...edges.values()];
  let accepted = 0;

  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const e1 = list[a], e2 = list[b];
      if (!pairCross(e1, e2, P)) continue;

      const before = edgeCrossings(e1, list, P, e2) + edgeCrossings(e2, list, P, e1) + 1;

      // The two alternative rewirings of the same four endpoints.
      const opts = [
        [[e1.i, e2.i], [e1.j, e2.j]],
        [[e1.i, e2.j], [e1.j, e2.i]],
      ];
      let done = false;
      for (const [[p, q], [r, s]] of opts) {
        if (p === q || r === s) continue;
        if (edges.has(keyOf(p, q)) || edges.has(keyOf(r, s))) continue;

        const f1 = { i: Math.min(p, q), j: Math.max(p, q), state: 'open' };
        const f2 = { i: Math.min(r, s), j: Math.max(r, s), state: 'open' };
        const rest = list.filter(x => x !== e1 && x !== e2);
        const after = edgeCrossings(f1, rest, P) + edgeCrossings(f2, rest, P) + pairCross(f1, f2, P);
        if (after >= before) continue;

        // Commit, but only if the crawl stays in one piece.
        edges.delete(keyOf(e1.i, e1.j));
        edges.delete(keyOf(e2.i, e2.j));
        edges.set(keyOf(p, q), f1);
        edges.set(keyOf(r, s), f2);
        if (componentsOf(n, edges).length > 1) {
          edges.delete(keyOf(p, q));
          edges.delete(keyOf(r, s));
          edges.set(keyOf(e1.i, e1.j), e1);
          edges.set(keyOf(e2.i, e2.j), e2);
          continue;
        }
        list = [...edges.values()];
        accepted++;
        done = true;
        break;
      }
      if (done) break;   // list mutated; restart the scan
    }
  }
  return accepted;
}

function forceLayout(areas, edges) {
  const n = areas.length;
  if (n === 1) return { nodeRatios: [{ rx: 0.5, ry: 0.5 }], cols: 1, rows: 1 };

  // Entrance: a low-degree area, i.e. something that reads as a way in.
  const minFace = Math.min(...areas.map(a => a.face));
  const pool = [...Array(n).keys()].filter(i => areas[i].face === minFace);
  const entrance = pool[Math.floor(Math.random() * pool.length)];

  let levels = bfsLevels(n, edges, entrance);
  let P = areas.map((a, i) => ({
    x: (Math.random() - 0.5) * Math.sqrt(n) * 1.6,
    y: levels[i] * UC_LEVEL_GAP + (Math.random() - 0.5) * 0.6,
  }));

  // Alternate between moving the cards and rewiring the graph. Each informs
  // the other: the layout reveals which connections are tangled, the rewiring
  // removes them, and the next layout settles into the slack that creates.
  // Untangling runs to convergence each round — measurably better than a
  // single pass, since one swap often exposes the next.
  P = runFR(areas, edges, P, levels, 300, Math.sqrt(n) * 0.35);
  for (let round = 0; round < 8; round++) {
    let acc = 0, guard = 0;
    while (guard++ < 12 && untanglePass(areas, edges, P)) acc++;
    if (!acc) break;
    levels = bfsLevels(n, edges, entrance);
    P = runFR(areas, edges, P, levels, 90, 0.35);
  }
  P = runFR(areas, edges, P, levels, 90, 0.25);

  // Cards must not overlap, which FR doesn't guarantee. Separate on the
  // shallower axis until clear — same AABB push the dungeon map uses.
  const MIN_DX = 1.06, MIN_DY = 1.06;
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = P[j].x - P[i].x, dy = P[j].y - P[i].y;
        const ox = MIN_DX - Math.abs(dx), oy = MIN_DY - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          const sx = dx >= 0 ? 1 : -1, sy = dy >= 0 ? 1 : -1;
          if (ox < oy) { P[i].x -= ox / 2 * sx; P[j].x += ox / 2 * sx; }
          else         { P[i].y -= oy / 2 * sy; P[j].y += oy / 2 * sy; }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of P) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const cols = Math.max(1, Math.ceil(maxX - minX) + 1);
  const rows = Math.max(1, Math.ceil(maxY - minY) + 1);
  const baseW = (cols + UC_PAD * 2) * UC_CELL_W;
  const baseH = (rows + UC_PAD * 2) * UC_CELL_H;

  const nodeRatios = P.map(p => ({
    rx: ((p.x - minX) + UC_PAD + 0.5) * UC_CELL_W / baseW,
    ry: ((p.y - minY) + UC_PAD + 0.5) * UC_CELL_H / baseH,
  }));
  return { nodeRatios, cols, rows };
}


// ── GEOMETRY: crossing tests ─────────────────────────────────────────────────
// Readability of the map is dominated by two things: lines crossing each other,
// and lines running underneath area cards. Both are tested here in pixel space
// (same space the map renders in), so what the algorithm optimizes is exactly
// what the GM sees.

function orient(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

// Proper intersection only. Segments sharing an endpoint (edges meeting at a
// node) are not crossings and must not be counted as such.
function segsCross(p1, p2, p3, p4) {
  const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
// Total crossings in a drawing. Used to pick the best of several attempts.
function countCrossings(edges, nodeRatios, baseW, baseH) {
  const P = nodeRatios.map(r => ({ x: r.rx * baseW, y: r.ry * baseH }));
  const L = [...edges.values()];
  let c = 0;
  for (let a = 0; a < L.length; a++)
    for (let b = a + 1; b < L.length; b++)
      c += pairCross(L[a], L[b], P);
  return c;
}

// Both the graph realisation and the layout are randomised, so attempts differ.
// Roll the dice ONCE, then try a few different ways of building and drawing
// that same roll, and keep the cleanest. The faces, area types and hidden
// features are fixed by the dice; only which areas connect and where the cards
// sit are free to vary — so this costs nothing in fidelity to the roll.
const UC_ATTEMPTS = 3;

function generateCrawl(count) {
  const rolled = buildAreas(count);
  let best = null;
  for (let attempt = 0; attempt < UC_ATTEMPTS; attempt++) {
    const areas = rolled.map(a => ({ ...a }));
    const edges = wireGraphExact(areas);
    const { nodeRatios, cols, rows } = forceLayout(areas, edges);
    const baseW = (cols + UC_PAD * 2) * UC_CELL_W;
    const baseH = (rows + UC_PAD * 2) * UC_CELL_H;
    const crossings = countCrossings(edges, nodeRatios, baseW, baseH);
    // Validity outranks beauty. Without this, a broken attempt wins on
    // crossings precisely BECAUSE it's broken — no edges, nothing to cross.
    const valid = count < 2 || (edges.size > 0 && componentsOf(count, edges).length === 1);
    const cand = { areas, edges, nodeRatios, cols, rows, crossings, valid };
    if (!best || (valid && !best.valid) ||
        (valid === best.valid && crossings < best.crossings)) best = cand;
    if (valid && crossings === 0) break;
  }
  return best;
}


// Band areas into depth levels by relaxed y-position (proportional counts),
// then place each divider polyline midway between adjacent bands.
// Assign permanent Area Numbers: sorted by (depth, y, x), numbered 1..N.
function assignDepthsAndNumbers(areas, nodeRatios, depthCount) {
  const n = areas.length;
  const D = Math.max(1, Math.min(depthCount, n));
  const order = [...Array(n).keys()].sort((a, b) => nodeRatios[a].ry - nodeRatios[b].ry);

  const bands = [];
  let cursor = 0;
  for (let k = 0; k < D; k++) {
    const size = Math.floor(n / D) + (k < n % D ? 1 : 0);
    bands.push(order.slice(cursor, cursor + size));
    cursor += size;
  }
  bands.forEach((band, k) => band.forEach(i => { areas[i].depth = k + 1; }));

  // Dividers: one polyline between consecutive bands, 6 evenly spaced handles.
  const dividers = [];
  const HANDLES = 6;
  for (let k = 0; k < D - 1; k++) {
    const above = bands[k], below = bands[k + 1];
    if (!above.length || !below.length) continue;
    const yA = Math.max(...above.map(i => nodeRatios[i].ry));
    const yB = Math.min(...below.map(i => nodeRatios[i].ry));
    const y = (yA + yB) / 2;
    const pts = [];
    for (let h = 0; h < HANDLES; h++) pts.push({ rx: h / (HANDLES - 1), ry: y });
    dividers.push(pts);
  }

  // Permanent numbering
  const numOrder = [...Array(n).keys()].sort((a, b) =>
    (areas[a].depth - areas[b].depth) ||
    (nodeRatios[a].ry - nodeRatios[b].ry) ||
    (nodeRatios[a].rx - nodeRatios[b].rx));
  numOrder.forEach((i, rank) => { areas[i].roomNum = rank + 1; });

  return dividers;
}

// Depth of a point: 1 + number of dividers above it. Piecewise-linear
// interpolation of each divider polyline at the point's x. Works entirely in
// ratio space so it is render-size invariant.
function dividerYAt(pts, rx) {
  if (rx <= pts[0].rx) return pts[0].ry;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    if (rx <= b.rx) {
      const t = (rx - a.rx) / (b.rx - a.rx || 1e-9);
      return a.ry + t * (b.ry - a.ry);
    }
  }
  return pts[pts.length - 1].ry;
}

function depthOfRatio(state, rx, ry) {
  let d = 1;
  for (const pts of state.dividers) if (dividerYAt(pts, rx) < ry) d++;
  return d;
}

// Commit depth reassignment after a divider or node drag RELEASE:
// recompute all depths, update card depth labels and Adjacent arrows.
function commitDepths(idx) {
  const areas = crawlAreas[idx], state = crawlState[idx];
  if (!areas || !state) return;
  let changed = false;
  areas.forEach((a, i) => {
    const d = depthOfRatio(state, state.nodeRatios[i].rx, state.nodeRatios[i].ry);
    if (d !== a.depth) { a.depth = d; changed = true; }
  });
  areas.forEach(a => {
    const span = document.querySelector(`#uccard-${idx}-${a.roomNum} .uc-depth`);
    if (span) span.textContent = `| D${a.depth}`;
  });
  syncAdjacent(idx);
  return changed;
}

// ── ADJACENT LINE SYNC ────────────────────────────────────────────────────────

// Live landmark text for area index i: read from its card if present
// (so GM edits propagate), else the generated landmark.
function liveLandmark(idx, i) {
  const areas = crawlAreas[idx];
  const card = document.getElementById(`uccard-${idx}-${areas[i].roomNum}`);
  if (card) {
    const el = card.querySelector('[data-uc="landmark"] .editable');
    if (el) {
      const t = el.textContent.replace(/^\s*Landmark\.?\s*/i, '').trim();
      if (t) return t;
    }
  }
  return areas[i].landmark;
}

function arrowFor(depthFrom, depthTo) {
  if (depthTo < depthFrom) return '↗';
  if (depthTo > depthFrom) return '↘';
  return '→';
}

// Rebuild the auto-managed Adjacent lines on every card in the crawl.
// Book notation: →3 (tunnel paved with bricks). One line per connection.
// A card whose Adjacent lines the GM has hand-edited (data-adj-manual="1")
// is left alone from then on.
function syncAdjacent(idx) {
  const areas = crawlAreas[idx], state = crawlState[idx];
  if (!areas || !state) return;

  const neighborsOf = areas.map(() => []);
  for (const e of state.edges.values()) {
    neighborsOf[e.i].push(e.j);
    neighborsOf[e.j].push(e.i);
  }

  areas.forEach((a, i) => {
    const card = document.getElementById(`uccard-${idx}-${a.roomNum}`);
    if (!card || card.dataset.adjManual === '1') return;
    card.querySelectorAll('[data-uc="adjacent"]').forEach(el => el.remove());

    const btnRow = card.querySelector('.uc-btn-row');
    const entries = neighborsOf[i]
      .map(j => ({ j, num: areas[j].roomNum }))
      .sort((x, y) => x.num - y.num);

    const rows = entries.length
      ? entries.map(({ j, num }, k) => ({
          to: num,
          html: `${k === 0 ? '<b>Adjacent.</b>&nbsp;' : ''}<span class="pdf-blue">${arrowFor(a.depth, areas[j].depth)}</span><b class="pdf-red">${num}</b> <span class="uc-adj-lm">(${escapeUC(liveLandmark(idx, j))})</span>`,
        }))
      : [{ to: '', html: '<b>Adjacent.</b>&nbsp;—' }];

    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'key-line';
      line.dataset.uc = 'adjacent';
      if (row.to !== '') line.dataset.adjTo = row.to;
      line.innerHTML = `<div class="editable" contenteditable="true" spellcheck="false">${row.html}</div>`;
      card.querySelector('.card-body').insertBefore(line, btnRow);
    }
  });
}

// Push one area's landmark out to every card that quotes it. Targeted rather
// than a full syncAdjacent rebuild: this fires on every keystroke, and
// rebuilding every Adjacent line on 50 cards per character would crawl — and
// would blow away the caret if the GM were editing one of those lines.
function updateAdjacentRefs(idx, areaIdx) {
  const areas = crawlAreas[idx];
  if (!areas || !areas[areaIdx]) return;
  const text = `(${liveLandmark(idx, areaIdx)})`;
  document.querySelectorAll(
    `#block-uc-${idx} [data-uc="adjacent"][data-adj-to="${areas[areaIdx].roomNum}"] .uc-adj-lm`
  ).forEach(el => {
    if (el.closest('.card')?.dataset.adjManual === '1') return;
    if (el.textContent !== text) el.textContent = text;
  });
}

function ucAreaIndexOfCard(idx, card) {
  const areas = crawlAreas[idx];
  if (!areas) return -1;
  return areas.findIndex(a => String(a.roomNum) === String(card.dataset.roomNum));
}

// ── SVG MAP ───────────────────────────────────────────────────────────────────

function zoomUC(idx, fullscreen, delta) {
  const key = idx + (fullscreen ? '-fs' : '');
  if (ucZoomControls[key]) ucZoomControls[key](delta);
}

function buildUCMap(idx, fullscreen = false) {
  const areas = crawlAreas[idx];
  const state = crawlState[idx];
  const svgId = `ucmap-${idx}${fullscreen ? '-fs' : ''}`;

  const cols = state.cols, rows = state.rows;
  const W = (cols + UC_PAD * 2) * UC_CELL_W;
  const H = (rows + UC_PAD * 2) * UC_CELL_H;
  const nodePos = state.nodeRatios.map(r => ({ x: r.rx * W, y: r.ry * H }));
  const divPx = () => state.dividers.map(pts => pts.map(p => ({ x: p.rx * W, y: p.ry * H })));

  const svg = ucSvgEl('svg', {
    id: svgId, width: W, height: H, viewBox: `0 0 ${W} ${H}`,
    style: 'display:block;width:100%;height:auto;font-family:"National Park",sans-serif;user-select:none;cursor:default;',
  });

  const MIN_W = W / 10, MAX_W = W / 0.3;
  const vb = { x: 0, y: 0, w: W, h: H };
  let contentMinX = 0, contentMinY = 0, contentMaxX = W, contentMaxY = H;

  function applyViewBox() {
    const PEEK = UC_CELL_H * 0.6;
    vb.x = Math.min(contentMaxX - PEEK, Math.max(contentMinX - vb.w + PEEK, vb.x));
    vb.y = Math.min(contentMaxY - PEEK, Math.max(contentMinY - vb.h + PEEK, vb.y));
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }
  function toSVGCoords(cx, cy) {
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  }

  const bgRect = ucSvgEl('rect', { width: W, height: H, fill: '#fff9f5' });
  svg.appendChild(bgRect);
  const dotGroup = ucSvgEl('g', { opacity: '0.35' });
  for (let c = 0; c < cols + UC_PAD * 2; c++)
    for (let r = 0; r < rows + UC_PAD * 2; r++)
      dotGroup.appendChild(ucSvgEl('circle', { cx: c * UC_CELL_W + UC_CELL_W / 2, cy: r * UC_CELL_H + UC_CELL_H / 2, r: 1.5, fill: '#9ecee6' }));
  svg.appendChild(dotGroup);

  const dividerLayer = ucSvgEl('g');
  const edgeLayer = ucSvgEl('g');
  svg.appendChild(dividerLayer);
  svg.appendChild(edgeLayer);

  const ghostLine = ucSvgEl('line', { stroke: '#3fb5cc', 'stroke-width': '1.5', 'stroke-dasharray': '5,3', opacity: '0', 'pointer-events': 'none' });
  svg.appendChild(ghostLine);

  const nodeLayer = ucSvgEl('g');
  svg.appendChild(nodeLayer);

  let connectMode = false, connectFrom = null;
  let dragging = null;        // node drag
  let dividerDrag = null;     // { d, p } divider handle drag
  let highlightedNode = null;

  function boxEdgePoint(cx, cy, tx, ty, hw, hh) {
    const dx = tx - cx, dy = ty - cy;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };
    const tX = Math.abs(dx) > 0.001 ? hw / Math.abs(dx) : Infinity;
    const tY = Math.abs(dy) > 0.001 ? hh / Math.abs(dy) : Infinity;
    const t = Math.min(tX, tY);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  // ── Edges: 3-state cycle. open (solid double line) → secret (dotted) →
  //    deleted (removed). Right-click deletes directly.
  function drawEdges() {
    edgeLayer.innerHTML = '';
    for (const [key, edge] of state.edges) {
      const ax = nodePos[edge.i].x, ay = nodePos[edge.i].y;
      const bx = nodePos[edge.j].x, by = nodePos[edge.j].y;
      const dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      const px = -dy / len * 9, py = dx / len * 9;

      const isSecret = edge.state === 'secret';
      const edgeG = ucSvgEl('g', { style: 'cursor:pointer' });
      const lineAttrs = isSecret ? { 'stroke-dasharray': '2,5' } : {};
      edgeG.appendChild(ucSvgEl('line', { x1: ax + px, y1: ay + py, x2: bx + px, y2: by + py, stroke: '#9ecee6', 'stroke-width': '1', 'stroke-linecap': 'round', ...lineAttrs }));
      edgeG.appendChild(ucSvgEl('line', { x1: ax - px, y1: ay - py, x2: bx - px, y2: by - py, stroke: '#9ecee6', 'stroke-width': '1', 'stroke-linecap': 'round', ...lineAttrs }));
      edgeG.appendChild(ucSvgEl('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: 'transparent', 'stroke-width': '16' }));

      if (isSecret) {
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        const badge = ucSvgEl('g');
        badge.appendChild(ucSvgEl('circle', { cx: mx, cy: my, r: 13, fill: '#fff9f5', stroke: '#9ecee6', 'stroke-width': '0.75' }));
        const t = ucSvgEl('text', { x: mx, y: my, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': '11', 'font-weight': 'bold', 'font-family': '"National Park",sans-serif', fill: '#262626' });
        t.textContent = 'S';
        badge.appendChild(t);
        edgeG.appendChild(badge);
      }

      edgeG.addEventListener('mouseenter', () => {
        if (connectMode || dragging || dividerDrag) return;
        edgeG.querySelectorAll('line[stroke="#9ecee6"]').forEach(l => l.setAttribute('stroke', '#3fb5cc'));
      });
      edgeG.addEventListener('mouseleave', () => {
        edgeG.querySelectorAll('line[stroke="#3fb5cc"]').forEach(l => l.setAttribute('stroke', '#9ecee6'));
      });
      edgeG.addEventListener('click', (e) => {
        if (connectMode || dragging || dividerDrag) return;
        e.stopPropagation();
        if (edge.state === 'open') edge.state = 'secret';
        else state.edges.delete(key);                 // secret → deleted (fully removed)
        markDirty(idx);
        syncAdjacent(idx);
        drawEdges();
      });
      edgeG.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        state.edges.delete(key);
        markDirty(idx);
        syncAdjacent(idx);
        drawEdges();
      });

      edgeLayer.appendChild(edgeG);
    }
  }

  // ── Depth dividers: draggable polylines (handles move vertically only;
  //    depth reassignment commits on RELEASE, drag is visual-only preview).
  function drawDividers() {
    dividerLayer.innerHTML = '';
    const dpx = divPx();
    const x0 = -UC_CELL_W * 0.5, x1 = W + UC_CELL_W * 0.5;

    dpx.forEach((pts, dIdx) => {
      const path = ['M', x0, pts[0].y];
      pts.forEach(p => path.push('L', p.x, p.y));
      path.push('L', x1, pts[pts.length - 1].y);
      dividerLayer.appendChild(ucSvgEl('path', {
        d: path.join(' '), fill: 'none', stroke: '#fa8072', 'stroke-width': '1.5',
        'stroke-dasharray': '8,5', opacity: '0.75', 'pointer-events': 'none',
      }));
      pts.forEach((p, pIdx) => {
        const h = ucSvgEl('circle', {
          cx: p.x, cy: p.y, r: 8, fill: '#fff9f5', stroke: '#fa8072',
          'stroke-width': '1.5', style: 'cursor:ns-resize',
        });
        h.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          dividerDrag = { d: dIdx, p: pIdx };
        });
        dividerLayer.appendChild(h);
      });
    });

    // Depth labels down the left edge
    const D = state.dividers.length + 1;
    for (let k = 0; k < D; k++) {
      const yTop = k === 0 ? contentMinY : dividerYAt(state.dividers[k - 1], 0) * H;
      const yBot = k === D - 1 ? contentMaxY : dividerYAt(state.dividers[k], 0) * H;
      const label = ucSvgEl('text', {
        x: contentMinX - 26, y: (yTop + yBot) / 2,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': '20', 'font-weight': 'bold', fill: '#fa8072', opacity: '0.6',
        'font-family': '"National Park",sans-serif', 'pointer-events': 'none',
      });
      label.textContent = `D${k + 1}`;
      dividerLayer.appendChild(label);
    }
  }

  // ── Nodes
  function drawNodes() {
    nodeLayer.innerHTML = '';
    areas.forEach((a, i) => {
      const cx = nodePos[i].x, cy = nodePos[i].y;
      const boxW = UC_CELL_W - UC_MARGIN * 2;
      const boxH = UC_CELL_H - UC_MARGIN * 2;
      const x = cx - boxW / 2, y = cy - boxH / 2;
      const isHi = highlightedNode === i;

      const g = ucSvgEl('g', { style: 'cursor:grab' });
      g.appendChild(ucSvgEl('rect', { x: x + 3, y: y + 3, width: boxW, height: boxH, rx: 5, fill: 'rgba(0,0,0,0.08)' }));
      g.appendChild(ucSvgEl('rect', {
        x, y, width: boxW, height: boxH, rx: 5,
        fill: isHi ? '#e8f8fc' : '#fffefd',
        stroke: isHi ? '#3fb5cc' : '#9ecee6',
        'stroke-width': isHi ? '1.5' : '0.75',
      }));

      // Header: permanent number + live name (falls back to type name)
      const card = document.getElementById(`uccard-${idx}-${a.roomNum}`);
      const liveName = card ? (card.querySelector('.uc-name')?.textContent.trim() || '') : '';
      const header = ucSvgEl('text', {
        x: x + 12, y: y + 22, 'text-anchor': 'start', 'font-size': '18',
        'font-weight': 'bold', fill: '#262626', 'font-family': '"National Park",sans-serif',
        'pointer-events': 'none',
      });
      header.textContent = `${a.roomNum}. ${liveName || a.category}`.slice(0, 26);
      g.appendChild(header);

      // Depth tag, top right
      const depthT = ucSvgEl('text', {
        x: x + boxW - 10, y: y + 22, 'text-anchor': 'end', 'font-size': '14',
        'font-weight': 'bold', fill: '#fa8072', 'font-family': '"National Park",sans-serif',
        'pointer-events': 'none',
      });
      depthT.textContent = `D${a.depth}`;
      g.appendChild(depthT);

      // Landmark
      const lm = ucSvgEl('text', {
        x: x + 12, y: y + 46, 'text-anchor': 'start', 'font-size': '13',
        fill: '#555', 'font-family': '"National Park",sans-serif', 'pointer-events': 'none',
      });
      lm.textContent = liveLandmark(idx, i).slice(0, 34);
      g.appendChild(lm);

      // Die face pips, bottom left. The face always equals this area's
      // connection count — fixDegreeSequence guarantees it.
      const pipMap = {
        1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
        4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
        6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
      };
      const pcx = x + 24, pcy = y + boxH - 20, sp = 6;
      g.appendChild(ucSvgEl('rect', { x: pcx - 13, y: pcy - 13, width: 26, height: 26, rx: 5, fill: 'none', stroke: '#9ecee6', 'stroke-width': '0.75' }));
      for (const [px2, py2] of (pipMap[a.face] || []))
        g.appendChild(ucSvgEl('circle', { cx: pcx + px2 * sp, cy: pcy + py2 * sp, r: 2.2, fill: '#262626' }));

      // Hidden Feature type tag, bottom right
      const ht = ucSvgEl('text', {
        x: x + boxW - 10, y: y + boxH - 14, 'text-anchor': 'end', 'font-size': '12',
        fill: '#3fb5cc', 'font-family': '"National Park",sans-serif', 'pointer-events': 'none',
      });
      ht.textContent = `Hidden: ${a.hiddenType}`;
      g.appendChild(ht);

      // Interactions
      g.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (connectMode) {
          e.stopPropagation();
          if (connectFrom !== null && connectFrom !== i) {
            const key = `${Math.min(connectFrom, i)}-${Math.max(connectFrom, i)}`;
            if (!state.edges.has(key)) {
              state.edges.set(key, { i: Math.min(connectFrom, i), j: Math.max(connectFrom, i), state: 'open' });
              markDirty(idx);
              syncAdjacent(idx);
            }
            exitConnectMode();
            drawEdges();
          }
          return;
        }
        e.stopPropagation();
        const { x: sx, y: sy } = toSVGCoords(e.clientX, e.clientY);
        dragging = { nodeIdx: i, startX: sx, startY: sy, origX: nodePos[i].x, origY: nodePos[i].y, moved: false };
        g.style.cursor = 'grabbing';
      });
      g.addEventListener('click', (e) => {
        if (dragging === null && !connectMode) {
          e.stopPropagation();
          enterConnectMode(i);
        }
      });

      nodeLayer.appendChild(g);
    });
  }

  function enterConnectMode(fromIdx) {
    connectMode = true;
    connectFrom = fromIdx;
    svg.style.cursor = 'crosshair';
    highlightedNode = fromIdx;
    hintText.setAttribute('opacity', '1');
    drawNodes();
  }
  function exitConnectMode() {
    connectMode = false;
    connectFrom = null;
    svg.style.cursor = 'default';
    ghostLine.setAttribute('opacity', '0');
    highlightedNode = null;
    hintText.setAttribute('opacity', '0');
    drawNodes();
  }

  const onKeyDown = (e) => { if (e.key === 'Escape' && connectMode && svg.isConnected) exitConnectMode(); };
  document.addEventListener('keydown', onKeyDown);

  svg.addEventListener('mousemove', (e) => {
    const { x: mx, y: my } = toSVGCoords(e.clientX, e.clientY);

    if (dividerDrag) {
      // Visual-only preview: move the handle, redraw dividers. Depth commit
      // happens on mouseup.
      const pts = state.dividers[dividerDrag.d];
      pts[dividerDrag.p].ry = Math.min(Math.max(my / H, -0.1), 1.1);
      drawDividers();
      return;
    }
    if (dragging) {
      const dx = mx - dragging.startX, dy = my - dragging.startY;
      nodePos[dragging.nodeIdx].x = dragging.origX + dx;
      nodePos[dragging.nodeIdx].y = dragging.origY + dy;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragging.moved = true;
      drawEdges();
      drawNodes();
      return;
    }
    if (connectMode && connectFrom !== null) {
      ghostLine.setAttribute('x1', nodePos[connectFrom].x);
      ghostLine.setAttribute('y1', nodePos[connectFrom].y);
      ghostLine.setAttribute('x2', mx);
      ghostLine.setAttribute('y2', my);
      ghostLine.setAttribute('opacity', '0.7');
    }
  });

  svg.addEventListener('mouseup', () => {
    if (dividerDrag) {
      dividerDrag = null;
      markDirty(idx);
      commitDepths(idx);     // commit on release
      drawDividers();
      drawNodes();           // depth tags may have changed
      return;
    }
    if (dragging) {
      const ni = dragging.nodeIdx;
      const moved = dragging.moved;
      if (moved) {
        state.nodeRatios[ni] = { rx: nodePos[ni].x / W, ry: nodePos[ni].y / H };
        markDirty(idx);
        commitDepths(idx);   // node may have crossed a divider
        drawDividers();
        drawNodes();
      }
      const wasMoved = moved;
      dragging = null;
      // Suppress the click-to-connect that follows a real drag
      if (wasMoved) {
        const swallow = (e) => { e.stopPropagation(); svg.removeEventListener('click', swallow, true); };
        svg.addEventListener('click', swallow, true);
        setTimeout(() => svg.removeEventListener('click', swallow, true), 0);
      }
    }
  });

  svg.addEventListener('click', () => { if (connectMode) exitConnectMode(); });
  svg.addEventListener('contextmenu', (e) => {
    if (connectMode) { e.preventDefault(); exitConnectMode(); }
  });

  // Pan + zoom (same pattern as the dungeon map)
  let panning = false, panStart = null;
  svg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const onBg = e.target === svg || e.target === bgRect || dotGroup.contains(e.target);
    if (!onBg) return;
    panning = true;
    panStart = { clientX: e.clientX, clientY: e.clientY, vbx: vb.x, vby: vb.y };
    svg.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!panning || !svg.isConnected) return;
    const rect = svg.getBoundingClientRect();
    vb.x = panStart.vbx - (e.clientX - panStart.clientX) / rect.width * vb.w;
    vb.y = panStart.vby - (e.clientY - panStart.clientY) / rect.height * vb.h;
    applyViewBox();
  });
  window.addEventListener('mouseup', () => {
    if (panning) { panning = false; svg.style.cursor = connectMode ? 'crosshair' : 'default'; }
  });
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    if (e.ctrlKey) {
      const { x: mx, y: my } = toSVGCoords(e.clientX, e.clientY);
      const scale = 1 / (1 - e.deltaY * 0.01);
      const newW = Math.min(MAX_W, Math.max(MIN_W, vb.w * scale));
      if (newW === vb.w) return;
      const s = newW / vb.w;
      vb.x -= (mx - vb.x) * (s - 1);
      vb.y -= (my - vb.y) * (s - 1);
      vb.w = newW;
      vb.h = vb.w * H / W;
    } else {
      vb.x += e.deltaX / rect.width * vb.w;
      vb.y += e.deltaY / rect.height * vb.h;
    }
    applyViewBox();
  }, { passive: false });

  const hintText = ucSvgEl('text', {
    x: W / 2, y: 18, 'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-size': '14', fill: '#3fb5cc', 'font-weight': 'bold',
    'font-family': '"National Park",sans-serif', opacity: '0', 'pointer-events': 'none',
  });
  hintText.textContent = 'Click an area to connect — right-click or click background to cancel';
  svg.appendChild(hintText);

  drawEdges();
  drawDividers();
  drawNodes();

  // Fit view to content
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  areas.forEach((a, i) => {
    const hw = UC_CELL_W / 2 - UC_MARGIN, hh = UC_CELL_H / 2 - UC_MARGIN;
    minX = Math.min(minX, nodePos[i].x - hw);
    maxX = Math.max(maxX, nodePos[i].x + hw);
    minY = Math.min(minY, nodePos[i].y - hh);
    maxY = Math.max(maxY, nodePos[i].y + hh);
  });
  contentMinX = minX; contentMinY = minY; contentMaxX = maxX; contentMaxY = maxY;
  const FIT_PAD = 60;
  const fitZoom = Math.min(W / (maxX - minX + FIT_PAD * 2), H / (maxY - minY + FIT_PAD * 2), W / MIN_W);
  vb.w = W / fitZoom;
  vb.h = vb.w * H / W;
  vb.x = (minX + maxX) / 2 - vb.w / 2;
  vb.y = (minY + maxY) / 2 - vb.h / 2;
  applyViewBox();
  drawDividers(); // depth labels use content bounds; redraw once bounds known

  const key = idx + (fullscreen ? '-fs' : '');
  ucZoomControls[key] = (delta) => {
    const scale = 1 / (1 + delta);
    const newW = Math.min(MAX_W, Math.max(MIN_W, vb.w * scale));
    const s = newW / vb.w;
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
    vb.x -= (cx - vb.x) * (s - 1);
    vb.y -= (cy - vb.y) * (s - 1);
    vb.w = newW;
    vb.h = vb.w * H / W;
    applyViewBox();
  };

  return svg;
}

function refreshUCMap(idx) {
  const wrap = document.querySelector(`#ucmapcard-${idx} .map-tile-wrap`);
  if (wrap) {
    wrap.innerHTML = '';
    wrap.appendChild(buildUCMap(idx, false));
  }
}

// ── CARDS ─────────────────────────────────────────────────────────────────────

// Appended to every generated description. The Area Design guide at the top of
// the page explains what belongs here; this is the nudge to go do it.
const UC_DESC_PLACEHOLDER = '(replace this text with your area description)';

function escapeUC(str) {
  return String(str).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function ucLineHTML(uc, html, isDesc = false) {
  return `<div class="key-line${isDesc ? ' key-desc' : ''}" data-uc="${uc}"><div class="editable${isDesc ? ' desc-input' : ''}" contenteditable="true" spellcheck="false">${html}</div></div>`;
}

// Every book field is present as a line; the GM deletes what they don't want.
// No bullets — bold labels, matching the book's card layout. Lines are direct
// children of .card-body so card_print.js's generic extractor prints them in
// order with bold preserved.
function buildAreaCard(idx, area) {
  const card = document.createElement('div');
  card.className = 'card expanded';
  card.id = `uccard-${idx}-${area.roomNum}`;
  card.dataset.ucCard = '1';
  card.dataset.roomNum = area.roomNum;

  // data-pdf-rich-title opts this card into coloured title rendering in
  // card_print.js. Without it, titles print plain — which is what every other
  // page on the site wants.
  card.dataset.pdfRichTitle = '1';

  // Book layout (see the HELLIRGULL example): the name sits left, the area
  // number and depth sit right. The name defaults to the Area Type's category
  // — deliberately flavourless, because it's meant to be typed over.
  card.innerHTML = `
    <div class="card-header" onclick="toggleUCCard('${card.id}')" style="cursor:pointer">
      <span class="card-title"><span class="editable uc-name" contenteditable="true" spellcheck="false" onclick="event.stopPropagation()">${escapeUC(area.category)}</span></span>
      <span class="uc-level"><b class="pdf-red">${area.roomNum}</b> <b class="uc-depth pdf-blue">| D${area.depth}</b></span>
    </div>
    <div class="card-body">
      ${ucLineHTML('desc', `${escapeUC(area.typeName)}. ${UC_DESC_PLACEHOLDER}`, true)}
      ${ucLineHTML('landmark', `<b>Landmark</b>&nbsp;${escapeUC(area.landmark)}`)}
      ${ucLineHTML('hidden', `<b>Hidden</b> <span class="pdf-blue">(${area.hiddenType})</span>&nbsp;`)}
      ${ucLineHTML('secret', `<b>Secret</b>&nbsp;`)}
      ${ucLineHTML('encounter', `<b>Encounter.</b>&nbsp;`)}
      <div class="card-actions uc-btn-row">
        <button class="uc-btn" onclick="rollHistory(${idx}, ${area.roomNum})">⟳ History</button>
        <button class="uc-btn" onclick="rollHereThere(${idx}, ${area.roomNum})">⟳ Here &amp; There</button>
      </div>
    </div>
  `;
  return card;
}

function toggleUCCard(id) {
  const card = document.getElementById(id);
  if (card) card.classList.toggle('expanded');
}

function toggleUCMapCard(id) {
  const mapCard = document.getElementById(id);
  if (!mapCard) return;
  const body = mapCard.querySelector('.map-card-body');
  const open = mapCard.classList.toggle('expanded');
  body.style.display = open ? 'block' : 'none';
}

function insertLineAfter(card, refSelector, lineEl) {
  const body = card.querySelector('.card-body');
  const ref = card.querySelector(refSelector);
  if (ref && ref.nextSibling) body.insertBefore(lineEl, ref.nextSibling);
  else body.insertBefore(lineEl, card.querySelector('.uc-btn-row'));
}

function makeUCLine(uc, html, extraData = {}, isDesc = false) {
  const div = document.createElement('div');
  div.className = 'key-line' + (isDesc ? ' key-desc' : '');
  div.dataset.uc = uc;
  for (const [k, v] of Object.entries(extraData)) div.dataset[k] = v;
  div.innerHTML = `<div class="editable${isDesc ? ' desc-input' : ''}" contenteditable="true" spellcheck="false">${html}</div>`;
  return div;
}

// "Generate History": rolls all 5 THIS AREA columns. Replaces the existing
// History line if present (no stacking). Own line, styled like description.
function rollHistory(idx, num) {
  const card = document.getElementById(`uccard-${idx}-${num}`);
  if (!card) return;
  const html = `<b>History.</b>&nbsp;Was ${d66pick(UC_WAS)} ${d66pick(UC_ONCE)} by ${d66pick(UC_BYWITH)}; became ${d66pick(UC_BECAME)} — as shown by ${d66pick(UC_SHOWNBY)}.`;
  const existing = card.querySelector('[data-uc="history"]');
  if (existing) {
    existing.querySelector('.editable').innerHTML = html;
  } else {
    insertLineAfter(card, '[data-uc="encounter"]', makeUCLine('history', html, {}, true));
  }
  markDirty(idx);
}

// "Something Here & There": paired cross-referencing roll. Target is picked
// from areas within 2 moves over LIVE connections (post-edit). Reroll removes
// the previous pair's line on the old target before creating a new pair.
function reachableWithin2(idx, areaIdx) {
  const state = crawlState[idx];
  const areas = crawlAreas[idx];
  const nbrs = areas.map(() => []);
  for (const e of state.edges.values()) { nbrs[e.i].push(e.j); nbrs[e.j].push(e.i); }
  const found = new Set();
  for (const j of nbrs[areaIdx]) {
    found.add(j);
    for (const k of nbrs[j]) if (k !== areaIdx) found.add(k);
  }
  return [...found];
}

// The paired text lives INSIDE each description rather than on its own line —
// it's part of what the players notice about the area, not a separate field.
// Each fragment is a tagged span so a reroll can find and replace exactly its
// own text, leaving anything the GM typed around it untouched.
function ucDescOf(idx, num) {
  return document.querySelector(`#uccard-${idx}-${num} [data-uc="desc"] .editable`);
}

function rollHereThere(idx, num) {
  const areas = crawlAreas[idx];
  const srcIdx = areas.findIndex(a => a.roomNum === num);
  if (srcIdx === -1) return;
  const srcDesc = ucDescOf(idx, num);
  const srcCard = document.getElementById(`uccard-${idx}-${num}`);
  if (!srcDesc || !srcCard) return;

  const targets = reachableWithin2(idx, srcIdx);
  if (!targets.length) {
    alert('No connected areas within 2 moves of this one.');
    return;
  }

  // Clear the previous pair before making a new one, so a reroll never leaves
  // an orphaned "See area N" pointing at a card that no longer answers.
  const oldTargetNum = srcCard.dataset.pairTarget;
  if (oldTargetNum) {
    ucDescOf(idx, oldTargetNum)?.querySelector(`[data-uc-frag="there"][data-src="${num}"]`)?.remove();
  }
  srcDesc.querySelector('[data-uc-frag="here"]')?.remove();

  const tgtIdx = targets[Math.floor(Math.random() * targets.length)];
  const tgtNum = areas[tgtIdx].roomNum;
  const tgtDesc = ucDescOf(idx, tgtNum);

  const here = UC_SOMETHING_HERE[d6() - 1];
  const there = d66pick(UC_SOMETHING_THERE);

  srcDesc.insertAdjacentHTML('beforeend',
    ` <span data-uc-frag="here">Something here is <b>${here.toLowerCase()}</b>. See area <b class="pdf-red">${tgtNum}</b>.</span>`);
  srcCard.dataset.pairTarget = tgtNum;

  if (tgtDesc) {
    tgtDesc.insertAdjacentHTML('beforeend',
      ` <span data-uc-frag="there" data-src="${num}">Something there is <b>${there}</b>. See area <b class="pdf-red">${num}</b>.</span>`);
  }
  markDirty(idx);
}

// ── ROLL A CRAWL ──────────────────────────────────────────────────────────────

function setAreaPreset(btn) {
  document.querySelectorAll('.uc-preset').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('areaCount').value = btn.dataset.count;
}
function clearAreaPreset() {
  document.querySelectorAll('.uc-preset').forEach(b => b.classList.remove('selected'));
}

function rollCrawl() {
  crawlCount++;
  const idx = crawlCount;
  const name = document.getElementById('crawlName').value.trim() || `Undercrawl ${idx}`;
  const count = Math.max(2, Math.min(99, parseInt(document.getElementById('areaCount').value, 10) || 25));
  const depthCount = Math.max(1, Math.min(12, parseInt(document.getElementById('depthCount').value, 10) || 4));

  // Graph first, drawing second. wireGraphExact honours the rolled faces
  // exactly (see fixDegreeSequence for the three cases where the dice ask for
  // something unbuildable); forceLayout then finds a readable picture of it,
  // rewiring which-connects-to-what as needed without ever changing how-many.
  // Depths and Area Numbers are assigned last — they depend on final positions,
  // and numbers are permanent from that point on.
  const { areas, edges, nodeRatios, cols, rows } = generateCrawl(count);
  const dividers = assignDepthsAndNumbers(areas, nodeRatios, depthCount);

  crawlAreas[idx] = areas;
  crawlState[idx] = { edges, nodeRatios, dividers, depthCount, cols, rows };

  renderCrawlBlock(idx, name, null);
  syncAdjacent(idx);
  document.getElementById(`block-uc-${idx}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Builds the block DOM: header, map card, area cards (sorted by roomNum).
// cardSnaps (from a save file) restores edited card content when present.
function renderCrawlBlock(idx, name, cardSnaps) {
  const out = document.getElementById('output');
  const empty = out.querySelector('.empty-state');
  if (empty) empty.remove();

  const block = document.createElement('div');
  block.className = 'cluster-block uc-block';
  block.id = `block-uc-${idx}`;
  block.dataset.crawlIdx = idx;

  const hdr = document.createElement('div');
  hdr.className = 'cluster-header';
  hdr.innerHTML = `
    <span contenteditable="true" class="cluster-name-edit" spellcheck="false">${name}</span>
    <span style="display:flex;align-items:center;gap:8px">
      <button class="cluster-print-btn" onclick="printCrawl(${idx})" style="background:none;border:1px solid rgba(255,255,255,0.5);border-radius:3px;color:var(--grey-lightest);font-size:0.75em;padding:2px 7px;cursor:pointer;font-family:'National Park',sans-serif;text-transform:uppercase;letter-spacing:1px">⎙ Print</button>
      <button onclick="confirmDeleteCrawl('block-uc-${idx}')" style="background:none;border:1px solid rgba(255,255,255,0.5);border-radius:3px;color:var(--grey-lightest);font-size:0.75em;padding:2px 7px;cursor:pointer;font-family:'National Park',sans-serif;text-transform:uppercase;letter-spacing:1px">✕</button>
    </span>
  `;
  block.appendChild(hdr);

  const mapCardId = `ucmapcard-${idx}`;
  const mapCard = document.createElement('div');
  mapCard.className = 'map-card expanded';
  mapCard.id = mapCardId;
  mapCard.innerHTML = `
    <div class="map-card-header" onclick="toggleUCMapCard('${mapCardId}')">
      <span style="cursor:pointer;flex:1">Map <span class="map-chevron">▼</span></span>
      <span style="display:flex;align-items:center;gap:4px" onclick="event.stopPropagation()">
        <button onclick="zoomUC('${idx}', false, -0.2)" style="background:var(--grey-lightest);border:none;border-radius:3px;font-size:0.85em;padding:1px 7px;cursor:pointer;font-family:'National Park',sans-serif;color:var(--grey-darkest);line-height:1.4">−</button>
        <button onclick="zoomUC('${idx}', false, 0.2)" style="background:var(--grey-lightest);border:none;border-radius:3px;font-size:0.85em;padding:1px 7px;cursor:pointer;font-family:'National Park',sans-serif;color:var(--grey-darkest);line-height:1.4">+</button>
        <button onclick="openUCFullscreen('${idx}')" style="background:none;border:1px solid var(--blue-light);border-radius:3px;font-size:0.75em;padding:2px 8px;cursor:pointer;font-family:'National Park',sans-serif;text-transform:uppercase;letter-spacing:1px;color:var(--grey-darkest);">⛶ Fullscreen</button>
      </span>
    </div>
    <div class="map-card-body" style="display:block"><div class="map-tile-wrap"></div></div>
  `;
  mapCard.querySelector('.map-tile-wrap').appendChild(buildUCMap(idx, false));
  block.appendChild(mapCard);

  const areas = crawlAreas[idx];
  const sorted = [...areas].sort((a, b) => a.roomNum - b.roomNum);
  for (const area of sorted) {
    const card = buildAreaCard(idx, area);
    if (cardSnaps && cardSnaps[area.roomNum]) applyCardSnap(idx, card, cardSnaps[area.roomNum]);
    block.appendChild(card);
  }

  out.appendChild(block);
}

// ── EDIT TRACKING (delegated once) ────────────────────────────────────────────

document.addEventListener('input', (e) => {
  const block = e.target.closest?.('.uc-block');
  if (!block) return;
  const idx = block.dataset.crawlIdx;
  markDirty(idx);

  // GM hand-edited an Adjacent line: stop auto-syncing that card's Adjacent.
  const adjLine = e.target.closest('[data-uc="adjacent"]');
  if (adjLine) adjLine.closest('.card').dataset.adjManual = '1';

  // A landmark is quoted by every neighbouring area's Adjacent line, so an
  // edit here has to travel. Rename area 2's landmark to "a big red bounce
  // house" and every card pointing at 2 says so immediately.
  const lmLine = e.target.closest('[data-uc="landmark"]');
  if (lmLine) {
    const card = lmLine.closest('.card');
    const areaIdx = ucAreaIndexOfCard(idx, card);
    if (areaIdx !== -1) updateAdjacentRefs(idx, areaIdx);
  }
});

// Enter commits a new line rather than letting contenteditable inject its own
// markup. Shift+Enter still gives a soft break inside the current line.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const ed = e.target.closest?.('.uc-block .editable');
  if (!ed) return;

  // Enter in the title just commits it — a card has one name.
  if (ed.classList.contains('uc-name')) {
    e.preventDefault();
    ed.blur();
    return;
  }

  const line = ed.closest('.card-body .key-line');
  if (!line) return;
  e.preventDefault();
  const fresh = makeUCLine('custom', '');
  line.parentNode.insertBefore(fresh, line.nextSibling);
  fresh.querySelector('.editable').focus();
  const block = ed.closest('.uc-block');
  if (block) markDirty(block.dataset.crawlIdx);
});

// The map quotes names and landmarks too, but redrawing it per keystroke is
// wasteful — commit on blur.
document.addEventListener('focusout', (e) => {
  const t = e.target;
  if (!t.classList?.contains('uc-name') && !t.closest?.('[data-uc="landmark"]')) return;
  const block = t.closest('.uc-block');
  if (block) refreshUCMap(block.dataset.crawlIdx);
});

// ── DELETE (confirm gated on edits, like the dungeon generator) ───────────────

function confirmDeleteCrawl(blockId) {
  const idx = blockId.replace('block-uc-', '');
  if (dirtyCrawlIds.has(idx)) {
    if (!confirm('This Undercrawl has edits. Delete it anyway?')) return;
  }
  deleteCrawl(blockId);
}

function deleteCrawl(blockId) {
  const idx = blockId.replace('block-uc-', '');
  document.getElementById(blockId)?.remove();
  delete crawlAreas[idx];
  delete crawlState[idx];
  dirtyCrawlIds.delete(idx);
}

// ── FULLSCREEN ────────────────────────────────────────────────────────────────

function openUCFullscreen(idx) {
  if (!crawlAreas[idx]) return;
  const overlay = document.getElementById('map-fullscreen-overlay');
  const body = document.getElementById('map-fullscreen-body');
  const title = document.getElementById('map-fullscreen-title');
  const block = document.getElementById(`block-uc-${idx}`);
  title.textContent = block?.querySelector('.cluster-name-edit')?.textContent || 'Map';
  body.innerHTML = '';
  const svg = buildUCMap(idx, true);
  svg.style.width = '100%';
  svg.style.height = '100%';
  body.appendChild(svg);
  fullscreenCrawlIdx = idx;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeUCFullscreen() {
  document.getElementById('map-fullscreen-overlay').classList.remove('active');
  document.body.style.overflow = '';
  if (fullscreenCrawlIdx !== null) {
    refreshUCMap(fullscreenCrawlIdx);
    fullscreenCrawlIdx = null;
  }
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeUCFullscreen(); });

// ── SAVE / LOAD (file-based, same pattern as the dungeon generator) ───────────

function snapUCCard(card) {
  const snap = {
    name: card.querySelector('.uc-name')?.innerHTML || '',
    adjManual: card.dataset.adjManual === '1',
    pairTarget: card.dataset.pairTarget || '',
    lines: [],
  };
  card.querySelectorAll('.card-body > .key-line').forEach(lineEl => {
    const uc = lineEl.dataset.uc || 'custom';
    if (uc === 'adjacent' && !snap.adjManual) return; // regenerated on load
    snap.lines.push({
      uc,
      src: lineEl.dataset.src || '',
      adjTo: lineEl.dataset.adjTo || '',
      html: lineEl.querySelector('.editable')?.innerHTML || '',
    });
  });
  return snap;
}

function applyCardSnap(idx, card, snap) {
  if (snap.name !== undefined) card.querySelector('.uc-name').innerHTML = snap.name;
  if (snap.adjManual) card.dataset.adjManual = '1';
  if (snap.pairTarget) card.dataset.pairTarget = snap.pairTarget;

  // Replace generated body lines with the saved set, preserving order.
  const body = card.querySelector('.card-body');
  const btnRow = card.querySelector('.uc-btn-row');
  body.querySelectorAll('.key-line').forEach(el => el.remove());
  for (const l of snap.lines) {
    const isDesc = l.uc === 'desc' || l.uc === 'history';
    const div = document.createElement('div');
    div.className = 'key-line' + (isDesc ? ' key-desc' : '');
    div.dataset.uc = l.uc;
    if (l.src) div.dataset.src = l.src;
    if (l.adjTo) div.dataset.adjTo = l.adjTo;
    div.innerHTML = `<div class="editable${isDesc ? ' desc-input' : ''}" contenteditable="true" spellcheck="false">${l.html}</div>`;
    body.insertBefore(div, btnRow);
  }
}

async function saveCrawls() {
  const blocks = [...document.querySelectorAll('.uc-block')];
  if (!blocks.length) { alert('No Undercrawls to save!'); return; }

  const payload = blocks.map(block => {
    const idx = block.dataset.crawlIdx;
    const areas = crawlAreas[idx];
    const state = crawlState[idx];
    const cardSnaps = {};
    block.querySelectorAll('[data-uc-card]').forEach(card => {
      cardSnaps[card.dataset.roomNum] = snapUCCard(card);
    });
    return {
      idx,
      name: block.querySelector('.cluster-name-edit')?.textContent.trim() || '',
      areas: areas.map(a => ({ ...a })),
      state: {
        edges: [...state.edges.entries()],
        nodeRatios: state.nodeRatios,
        dividers: state.dividers,
        depthCount: state.depthCount,
        cols: state.cols,
        rows: state.rows,
      },
      cardSnaps,
    };
  });

  const json = JSON.stringify({ version: 1, app: 'undercrawl', crawls: payload }, null, 2);
  const defaultName = `3x5Undercrawl-${new Date().toISOString().slice(0, 10)}.json`;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{ description: '3x5 Undercrawl File', accept: { 'application/json': ['.json'] } }],
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

function loadCrawls(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.crawls) throw new Error('Not an Undercrawl file');
      restoreCrawls(data.crawls);
    } catch (err) {
      alert('Could not load file: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function restoreCrawls(crawls) {
  const out = document.getElementById('output');
  out.innerHTML = '';
  for (const k in crawlAreas) delete crawlAreas[k];
  for (const k in crawlState) delete crawlState[k];
  dirtyCrawlIds.clear();
  crawlCount = 0;

  crawls.forEach(saved => {
    crawlCount++;
    const idx = crawlCount;
    dirtyCrawlIds.add(String(idx)); // loaded crawls carry user data worth protecting

    crawlAreas[idx] = saved.areas;
    crawlState[idx] = {
      edges: new Map(saved.state.edges || []),
      nodeRatios: saved.state.nodeRatios,
      dividers: saved.state.dividers,
      depthCount: saved.state.depthCount,
      cols: saved.state.cols,
      rows: saved.state.rows,
    };

    renderCrawlBlock(idx, saved.name || `Undercrawl ${idx}`, saved.cardSnaps || null);
    syncAdjacent(idx);
  });
}

// ── PRINT ─────────────────────────────────────────────────────────────────────

// Uses window.printCardsToPDF (card_print.js). The generic extractor walks
// .card-body children in DOM order, preserves <b>, skips .card-actions, and
// paginates overflow onto "(cont'd)" pages.
async function printCrawl(idx) {
  if (typeof jspdf === 'undefined') {
    alert('jsPDF library not loaded. Please refresh and try again.');
    return;
  }
  const block = document.getElementById(`block-uc-${idx}`);
  if (!block) return;
  const cards = Array.from(block.querySelectorAll('[data-uc-card]'));
  if (!cards.length) { alert('No cards to print.'); return; }

  const btn = block.querySelector('.cluster-print-btn');
  let originalHTML;
  if (btn) { originalHTML = btn.innerHTML; btn.innerHTML = 'generating...'; btn.disabled = true; }

  try {
    const name = block.querySelector('.cluster-name-edit')?.textContent.trim() || `undercrawl-${idx}`;
    await window.printCardsToPDF(cards, `${name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'undercrawl'}.pdf`);
  } catch (error) {
    console.error('printCrawl error:', error);
    alert('Failed to generate PDF. Check console for details.');
  } finally {
    if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
  }
}
