/**
 * Coverage Check Script
 *
 * Checks that code coverage meets minimum thresholds.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CoverageData {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

const THRESHOLDS = {
  lines: 70,
  statements: 70,
  functions: 60,
  branches: 50,
};

function main() {
  const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');

  if (!fs.existsSync(coveragePath)) {
    console.error('Coverage file not found. Run `npm run test:coverage` first.');
    process.exit(1);
  }

  const coverage: CoverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
  const { total } = coverage;

  console.log('📊 Coverage Report\n');
  console.log('Metric       | Actual | Threshold | Status');
  console.log('-------------|--------|-----------|-------');

  let failed = false;

  for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
    const actual = total[metric as keyof typeof total].pct;
    const passed = actual >= threshold;

    if (!passed) {
      failed = true;
    }

    const status = passed ? '✅ Pass' : '❌ Fail';
    console.log(
      `${metric.padEnd(12)} | ${actual.toFixed(1).padStart(5)}% | ${threshold.toString().padStart(8)}% | ${status}`,
    );
  }

  console.log('');

  if (failed) {
    console.error('❌ Coverage check failed. Some metrics are below threshold.');
    process.exit(1);
  } else {
    console.log('✅ Coverage check passed!');
  }
}

main();

