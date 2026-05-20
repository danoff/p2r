import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPORTS_DIR = join(ROOT, 'reports', 'p2r');
const OUTPUT_DIR = join(ROOT, 'site', 'public');
const OUTPUT_FILE = join(OUTPUT_DIR, 'data.json');

const REQUIRED_FIELDS = [
  'p2r_version', 'p2r_id', 'cycle_id', 'timestamp',
  'partaker_id', 'type', 'display_name', 'model_version',
  'role_this_cycle', 'intent', 'action_type',
  'contribution_summary', 'learning', 'pattern_refs',
  'precision_update', 'sovereignty_attestation', 'attestation_text',
];

function validate(report, filename) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in report)) errors.push(`Missing required field: ${field}`);
  }
  if (report.sovereignty_attestation !== true) {
    errors.push('sovereignty_attestation must be true');
  }
  if (report.learning) {
    const suspicious = [
      /\bwe\s+learned\b/i,
      /\bthey\s+learned\b/i,
      /\bour\s+team\s+learned\b/i,
    ];
    for (const pattern of suspicious) {
      if (pattern.test(report.learning)) {
        errors.push('learning block may not be sovereign (collective/third-person language detected)');
        break;
      }
    }
  }
  return errors;
}

function main() {
  let files = [];
  try {
    files = readdirSync(REPORTS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    console.log('No reports directory found — generating empty dataset.');
  }

  const reports = [];
  const buildErrors = [];

  for (const file of files) {
    let report;
    try {
      report = parse(readFileSync(join(REPORTS_DIR, file), 'utf8'));
    } catch (e) {
      buildErrors.push(`${file}: YAML parse error — ${e.message}`);
      continue;
    }
    const errors = validate(report, file);
    if (errors.length) {
      buildErrors.push(`${file}: ${errors.join('; ')}`);
    } else {
      reports.push(report);
    }
  }

  if (buildErrors.length) {
    console.error('Build failed — validation errors:');
    buildErrors.forEach(e => console.error('  x', e));
    process.exit(1);
  }

  reports.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(reports, null, 2));
  console.log(`Built data.json with ${reports.length} report(s).`);
}

main();
