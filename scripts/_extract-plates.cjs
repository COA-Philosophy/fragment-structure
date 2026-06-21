const fs = require('fs');
const src = 'C:/Development/fragment-structure/works/almana-12types-v2.html';
const txt = fs.readFileSync(src, 'utf8');
const line = txt.split(/\r?\n/).find(l => l.includes('window.__PLATES__'));
if (!line) { console.error('NO __PLATES__ line'); process.exit(1); }
const window = {};
eval(line);
const P = window.__PLATES__;
const allBases = Object.keys(P);
console.log('total bases:', allBases.length);
console.log('sample base keys of first:', Object.keys(P[allBases[0]]));

const want = {
  Artist:     'Artist_mark_dejong_-1.46_2.53_-0.90_1.20_g0.74',
  Guardian:   'Guardian_mark_dejong_1.14_1.30_0.01_-2.91_g0.84',
  FlowWalker: 'FlowWalker_mark_dejong_0.36_2.86_0.76_1.18_g0.78',
  Seeker:     'Seeker_mark_dejong_2.08_-1.36_2.20_-1.28_g0.36',
  Sage:       'Sage_mark_dejong_1.63_-2.06_2.34_-1.39_g0.40',
};
const out = {};
for (const [k, base] of Object.entries(want)) {
  if (!P[base]) { console.error('MISSING base:', base); continue; }
  out[k] = P[base].paper;
}
const js = 'window.__CARDPLATES__=' + JSON.stringify(out) + ';\n';
fs.writeFileSync('C:/Development/fragment-structure/works/almana-card-plates.js', js);
console.log('wrote almana-card-plates.js with', Object.keys(out));
console.log('sizes(KB):', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Math.round(v.length / 1024)])));
