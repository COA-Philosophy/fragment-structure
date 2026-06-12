#!/usr/bin/env node
// register-design.mjs
// デザイン案を「コード素材集」(fragment-structure) に登録する。
//   1) デザインHTML(+ローカル依存)を works/ にコピー集約
//   2) index.html の WORKS 配列に1エントリ追記（F番号は自動採番 or 指定）
//   3) git push すれば https://coa-philosophy.github.io/fragment-structure/ に表示
//
// 使い方:
//   node scripts/register-design.mjs --src <abs.html> --project ALMANA \
//        --use "LP / Landing" --ja "三台並べ" --en "Three Phones" [--no F031] \
//        [--version v1] [--status current] [--file basename.html] \
//        [--still works/thumbs/x.png] [--archive-no F029] [--dry]
//
// 依存検出: iframe/script/link/img の src|href のうち、ローカル相対の
//   .html/.css/.js/.png/.jpg/.jpeg/.svg/.webp/.json/.woff2? を works/ へコピー。
//   .html はさらに再帰的に依存を辿る（?query は除去して解決）。

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = 'C:/Development/fragment-structure';
const WORKS_DIR = path.join(REPO_ROOT, 'works');
const INDEX = path.join(REPO_ROOT, 'index.html');

// ---- args ----
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const key = t.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { a[key] = true; }
      else { a[key] = next; i++; }
    }
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));
function need(k) { if (!args[k]) { console.error(`ERROR: --${k} は必須です`); process.exit(1); } return args[k]; }

const srcAbs = path.resolve(need('src'));
if (!fs.existsSync(srcAbs)) { console.error(`ERROR: src が見つかりません: ${srcAbs}`); process.exit(1); }
const DRY = !!args.dry;

// ---- dep copy ----
const DEP_RE = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const COPY_EXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.json', '.woff', '.woff2', '.ttf']);
const copied = [];
const seen = new Set();

function isLocalRef(ref) {
  if (!ref) return false;
  if (/^(https?:)?\/\//i.test(ref)) return false;       // http(s) / protocol-relative
  if (/^(data:|mailto:|tel:|#|javascript:)/i.test(ref)) return false;
  return true;
}
function stripQuery(ref) { return ref.split('#')[0].split('?')[0]; }

function copyWithDeps(absFile) {
  const base = path.basename(absFile);
  if (seen.has(absFile)) return;
  seen.add(absFile);
  const dest = path.join(WORKS_DIR, base);
  if (path.resolve(dest) !== path.resolve(absFile)) {
    if (!DRY) { fs.mkdirSync(WORKS_DIR, { recursive: true }); fs.copyFileSync(absFile, dest); }
    copied.push(`works/${base}`);
  }
  // .html/.css 内の依存を辿る
  const ext = path.extname(absFile).toLowerCase();
  if (ext !== '.html' && ext !== '.htm' && ext !== '.css') return;
  const text = fs.readFileSync(absFile, 'utf8');
  const dir = path.dirname(absFile);
  let m;
  while ((m = DEP_RE.exec(text)) !== null) {
    const ref = stripQuery(m[1]);
    if (!isLocalRef(ref)) continue;
    const refExt = path.extname(ref).toLowerCase();
    if (!COPY_EXT.has(refExt)) continue;
    const depAbs = path.resolve(dir, ref);
    if (fs.existsSync(depAbs)) copyWithDeps(depAbs);
  }
}

copyWithDeps(srcAbs);

// --deps: 動的(JS生成)などで静的検出に乗らない依存を明示（srcからの相対 or 絶対、カンマ区切り）
if (args.deps) {
  const srcDir = path.dirname(srcAbs);
  for (const d of String(args.deps).split(',').map(s => s.trim()).filter(Boolean)) {
    const depAbs = path.isAbsolute(d) ? d : path.resolve(srcDir, stripQuery(d));
    if (fs.existsSync(depAbs)) copyWithDeps(depAbs);
    else console.error(`WARN: --deps が見つかりません: ${depAbs}`);
  }
}

const fileName = args.file ? String(args.file) : path.basename(srcAbs);
const fileRel = `works/${fileName}`;

// ---- WORKS 配列に追記 ----
let index = fs.readFileSync(INDEX, 'utf8');
const worksStart = index.indexOf('const WORKS = [');
if (worksStart < 0) { console.error('ERROR: WORKS 配列が index.html に見つかりません'); process.exit(1); }
const closeRel = index.indexOf('\n  ];', worksStart);
if (closeRel < 0) { console.error('ERROR: WORKS 配列の閉じ ];" が見つかりません'); process.exit(1); }

// 次のF番号（指定が無ければ max+1）
let no = args.no ? String(args.no) : null;
if (!no) {
  const nums = [...index.matchAll(/no:\s*'F(\d+)'/g)].map(m => parseInt(m[1], 10));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  no = 'F' + String(next).padStart(3, '0');
}
const version = args.version ? String(args.version) : 'v1';
const status = args.status ? String(args.status) : 'current';
const project = need('project');
const use = need('use');
const ja = need('ja');
const en = need('en');
const still = args.still ? String(args.still) : '';
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// --archive-no: 同 no の current を archived に
let archivedCount = 0;
if (args['archive-no']) {
  const an = String(args['archive-no']);
  const region = index.slice(worksStart, closeRel);
  const updated = region.replace(
    new RegExp(`(no:\\s*'${an}'[^}]*?status:\\s*')current(')`, 'g'),
    (full, a, b) => { archivedCount++; return a + 'archived' + b; }
  );
  index = index.slice(0, worksStart) + updated + index.slice(closeRel);
}

const entry =
`    {
      no: '${esc(no)}', version: '${esc(version)}', status: '${esc(status)}',
      project: '${esc(project)}',
      use: '${esc(use)}',
      ja: '${esc(ja)}',
      en: '${esc(en)}',
      file: '${esc(fileRel)}',
      still: '${esc(still)}'
    },
`;

const closeIdx = index.indexOf('\n  ];', index.indexOf('const WORKS = ['));
const out = index.slice(0, closeIdx + 1) + entry + index.slice(closeIdx + 1);
if (!DRY) fs.writeFileSync(INDEX, out, 'utf8');

console.log(JSON.stringify({
  dry: DRY, no, version, status, project, use, ja, en,
  file: fileRel, copied, archivedPrev: archivedCount
}, null, 2));
