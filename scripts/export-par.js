import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_FILE = join(ROOT, 'site', 'public', 'data.json');
const OUTPUT_DIR = join(ROOT, 'reports', 'par');

// Namespace required for compatibility with par_to_xhtml_1.xsl
// (from https://github.com/Peeragogy/PeeragogicalActionReviews)
const PAR_NS = 'htx-scheme-id://org.peeragogy.20120221/patterns/peeragogical-action-review.20200511T003600Z';

function xmlEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function block(label, text) {
  return `  <${label}>
${String(text).split('\n').map(l => '    ' + l).join('\n')}
  </${label}>`;
}

function generatePAR(cycleId, reports) {
  // intention-review: each partaker's intent, clearly attributed
  const intentionReview = reports
    .map(r => `${xmlEsc(r.display_name)} (${xmlEsc(r.role_this_cycle)}):\n${xmlEsc(r.intent)}`)
    .join('\n\n');

  // what-happened: contribution summaries per partaker
  const whatHappened = reports
    .map(r => `${xmlEsc(r.display_name)} (@${xmlEsc(r.partaker_id)}):\n${xmlEsc(r.contribution_summary)}`)
    .join('\n\n');

  // what-happened-perspectives: sovereign learning blocks — never blended
  // This is the core P2R→PAR mapping: each partaker's learning stays atomic and attributed.
  const perspectives = reports
    .map(r => `--- ${xmlEsc(r.display_name)} (@${xmlEsc(r.partaker_id)}) ---\n${xmlEsc(r.learning)}`)
    .join('\n\n');

  // learnings-changes: aggregated pattern refs across all partakers
  const allSelected = [...new Set(reports.flatMap(r => r.pattern_refs?.selected ?? []))];
  const allRevised  = [...new Set(reports.flatMap(r => r.pattern_refs?.revised  ?? []))];
  const learningsChanges = [
    allSelected.length ? `Patterns applied:\n${allSelected.map(p => `  - ${xmlEsc(p)}`).join('\n')}` : '',
    allRevised.length  ? `Patterns revised:\n${allRevised.map(p  => `  - ${xmlEsc(p)}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n') || '(none recorded)';

  // what-else-should-change-going-forward: proposed patterns + precision rationales
  const allProposed = [...new Set(reports.flatMap(r => r.pattern_refs?.proposed ?? []))];
  const rationales  = reports
    .filter(r => r.precision_update?.rationale)
    .map(r => `${xmlEsc(r.display_name)}:\n${xmlEsc(r.precision_update.rationale)}`);
  const goingForward = [
    allProposed.length ? `Proposed patterns:\n${allProposed.map(p => `  - ${xmlEsc(p)}`).join('\n')}` : '',
    rationales.length  ? `Precision updates:\n${rationales.join('\n\n')}` : '',
  ].filter(Boolean).join('\n\n') || '(none recorded)';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- Generated from P2R reports for cycle: ${xmlEsc(cycleId)} -->`,
    `<!-- Compatible with par_to_xhtml_1.xsl from https://github.com/Peeragogy/PeeragogicalActionReviews -->`,
    `<peeragogical-action-review`,
    `  title="${xmlEsc(cycleId)}"`,
    `  xmlns="${PAR_NS}"`,
    `  xmlns:html="http://www.w3.org/1999/xhtml">`,
    '',
    block('intention-review',               intentionReview),
    '',
    block('what-happened',                  whatHappened),
    '',
    block('what-happened-perspectives',     perspectives),
    '',
    block('learnings-changes',              learningsChanges),
    '',
    block('what-else-should-change-going-forward', goingForward),
    '',
    '</peeragogical-action-review>',
  ].join('\n');
}

function main() {
  if (!existsSync(DATA_FILE)) {
    console.error('data.json not found — run npm run build:data first');
    process.exit(1);
  }

  const reports = JSON.parse(readFileSync(DATA_FILE, 'utf8'));

  const cycles = reports.reduce((acc, r) => {
    (acc[r.cycle_id] = acc[r.cycle_id] ?? []).push(r);
    return acc;
  }, {});

  mkdirSync(OUTPUT_DIR, { recursive: true });

  let count = 0;
  for (const [cycleId, cycleReports] of Object.entries(cycles)) {
    const xml = generatePAR(cycleId, cycleReports);
    const filename = `${cycleId}.xml`;
    writeFileSync(join(OUTPUT_DIR, filename), xml);
    console.log(`  Exported ${filename} (${cycleReports.length} partaker(s))`);
    count++;
  }

  console.log(`Exported ${count} PAR file(s) to reports/par/`);
}

main();
