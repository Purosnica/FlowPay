import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(e.name)) {
        out.push(...walk(p, exts));
      }
    } else if (exts.some((x) => e.name.endsWith(x))) {
      out.push(p);
    }
  }
  return out;
}

function normPath(p: string): string {
  return p.replace(/\\/g, '/');
}

// 1. Duplicate GraphQL resolver field names
const resolverFiles = walk('src/lib/graphql/resolvers', ['.ts']);
const fieldMap = new Map<string, string[]>();
for (const f of resolverFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const re = /(?:queryField|mutationField)\s*\(\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const name = m[1];
    const arr = fieldMap.get(name) ?? [];
    arr.push(normPath(f));
    fieldMap.set(name, arr);
  }
}
const dupFields = [...fieldMap.entries()].filter(
  ([, files]) => new Set(files).size > 1,
);

// 2. Duplicate exported function names in cobranza
const serviceFiles = walk('src/lib/cobranza', ['.ts']);
const funcMap = new Map<string, string[]>();
const exportRe = /export\s+(?:async\s+)?function\s+(\w+)/g;
for (const f of serviceFiles) {
  const content = fs.readFileSync(f, 'utf8');
  let m: RegExpExecArray | null;
  while ((m = exportRe.exec(content))) {
    const name = m[1];
    const arr = funcMap.get(name) ?? [];
    arr.push(normPath(f));
    funcMap.set(name, arr);
  }
}
const dupFuncs = [...funcMap.entries()].filter(
  ([, files]) => new Set(files).size > 1,
);

// 3. Duplicate Zod schema export names
const schemaMap = new Map<string, string[]>();
const schemaRe = /export\s+const\s+(\w+Schema)\s*=/g;
const allTs = walk('src', ['.ts', '.tsx']);
for (const f of allTs) {
  const content = fs.readFileSync(f, 'utf8');
  let m: RegExpExecArray | null;
  while ((m = schemaRe.exec(content))) {
    const name = m[1];
    const arr = schemaMap.get(name) ?? [];
    arr.push(normPath(f));
    schemaMap.set(name, arr);
  }
}
const dupSchemas = [...schemaMap.entries()].filter(
  ([, files]) => new Set(files).size > 1,
);

// 4. Frontend GQL query duplicates
const queryFiles = walk('src/lib/graphql/queries', ['.ts']);
const gqlMap = new Map<string, string[]>();
for (const f of queryFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const re = /export\s+const\s+(\w+)\s*=\s*`([\s\S]*?)`;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const norm = m[2].replace(/\s+/g, ' ').trim();
    const arr = gqlMap.get(norm) ?? [];
    arr.push(`${m[1]} @ ${normPath(f)}`);
    gqlMap.set(norm, arr);
  }
}
const dupGql = [...gqlMap.entries()].filter(([, names]) => names.length > 1);

// 5. Exported functions potentially unused (cobranza only, quick heuristic)
const allSource = walk('src', ['.ts', '.tsx']);
const allContent = allSource.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const cobranzaExports: { name: string; file: string }[] = [];
for (const f of serviceFiles) {
  const content = fs.readFileSync(f, 'utf8');
  let m: RegExpExecArray | null;
  const re = /export\s+(?:async\s+)?function\s+(\w+)/g;
  while ((m = re.exec(content))) {
    cobranzaExports.push({ name: m[1], file: normPath(f) });
  }
}
const unusedExports: { name: string; file: string; refs: number }[] = [];
for (const { name, file } of cobranzaExports) {
  const defRe = new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`, 'g');
  const useRe = new RegExp(`\\b${name}\\b`, 'g');
  let defCount = 0;
  let totalRefs = 0;
  for (const src of allSource) {
    const c = fs.readFileSync(src, 'utf8');
    defCount += (c.match(defRe) ?? []).length;
    totalRefs += (c.match(useRe) ?? []).length;
  }
  const refsExcludingDef = totalRefs - defCount;
  if (refsExcludingDef === 0) {
    unusedExports.push({ name, file, refs: refsExcludingDef });
  }
}

// 6. Duplicate type/interface export names
const typeMap = new Map<string, string[]>();
const typeRe = /export\s+(?:type|interface)\s+(\w+)/g;
for (const f of allTs) {
  const content = fs.readFileSync(f, 'utf8');
  let m: RegExpExecArray | null;
  while ((m = typeRe.exec(content))) {
    const name = m[1];
    const arr = typeMap.get(name) ?? [];
    arr.push(normPath(f));
    typeMap.set(name, arr);
  }
}
const dupTypes = [...typeMap.entries()].filter(
  ([, files]) => new Set(files).size > 1,
);

console.log('=== DUPLICATE RESOLVER FIELDS ===');
if (dupFields.length === 0) console.log('(none)');
dupFields.forEach(([name, files]) =>
  console.log(`${name}: ${[...new Set(files)].join(', ')}`),
);

console.log('\n=== DUPLICATE SERVICE FUNCTIONS (cobranza) ===');
if (dupFuncs.length === 0) console.log('(none)');
dupFuncs.forEach(([name, files]) =>
  console.log(`${name}: ${[...new Set(files)].join(', ')}`),
);

console.log('\n=== DUPLICATE SCHEMA NAMES ===');
if (dupSchemas.length === 0) console.log('(none)');
dupSchemas.forEach(([name, files]) =>
  console.log(`${name}: ${[...new Set(files)].join(', ')}`),
);

console.log('\n=== DUPLICATE TYPE/INTERFACE NAMES ===');
const significantDupTypes = dupTypes.filter(
  ([name]) => !name.endsWith('Props') && name !== 'Metadata',
);
significantDupTypes.slice(0, 30).forEach(([name, files]) =>
  console.log(`${name}: ${[...new Set(files)].join(', ')}`),
);
console.log(`Total duplicate type names: ${significantDupTypes.length}`);

console.log('\n=== DUPLICATE FRONTEND GQL QUERIES ===');
if (dupGql.length === 0) console.log('(none)');
dupGql.forEach(([, names]) => console.log(names.join(' | ')));

console.log('\n=== POTENTIALLY UNUSED COBRANZA EXPORTS ===');
if (unusedExports.length === 0) console.log('(none)');
unusedExports.forEach((u) => console.log(`${u.name} @ ${u.file}`));
console.log(`Total potentially unused: ${unusedExports.length}`);
