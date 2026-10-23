import fs from 'fs';
import path from 'path';
import type { Reporter, FullResult, TestCase, TestResult } from '@playwright/test/reporter';

// Collects the request/response JSON attached by the API tests (see the get() helper in
// tests/api/nhs-website.api.spec.ts) and writes it all to one file at the end of the run.

const outputFile = path.resolve(__dirname, '..', 'api-results', 'api-log.json');

type Entry = {
  test: string;
  file: string;
  line: number;
  status: TestResult['status'];
  calls: unknown[];
};

class ApiLogReporter implements Reporter {
  // Keyed by test so a retried test only appears once, with its final attempt
  private entries = new Map<string, Entry>();

  onTestEnd(test: TestCase, result: TestResult) {
    if (test.parent.project()?.name !== 'api') return;

    const calls = result.attachments
      .filter(a => a.contentType === 'application/json' && a.name.startsWith('GET ') && a.body)
      .map(a => JSON.parse(a.body!.toString('utf8')));

    this.entries.set(test.id, {
      test: test.titlePath().slice(3).join(' > '),
      file: path.relative(process.cwd(), test.location.file),
      line: test.location.line,
      status: result.status,
      calls,
    });
  }

  onEnd(result: FullResult) {
    if (this.entries.size === 0) return;

    // Tests finish in any order when run in parallel - list them in file order instead
    const tests = [...this.entries.values()].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

    const log = {
      generated: new Date().toISOString(),
      runStatus: result.status,
      totalTests: tests.length,
      totalCalls: tests.reduce((sum, e) => sum + e.calls.length, 0),
      tests,
    };

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(log, null, 2));
    console.log(`\nAPI request/response log written to ${path.relative(process.cwd(), outputFile)}`);
  }

  printsToStdio() {
    return false;
  }
}

export default ApiLogReporter;
