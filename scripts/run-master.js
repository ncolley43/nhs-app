// Ad hoc run of the whole test pack from the latest master on GitHub.
// master is checked out into .master-run/ (a git worktree), so your current branch
// and any uncommitted work are left alone. At the end you're asked whether to open the report.
// Extra options are passed to Playwright, e.g. npm run test:master -- --project=chromium
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const root = path.resolve(__dirname, '..');
const runDir = path.join(root, '.master-run');
const reportDir = path.join(runDir, 'playwright-report');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true, cwd: root, ...options });
  return result.status ?? 1;
}

function mustRun(command, args, options) {
  if (run(command, args, options) !== 0) {
    console.error(`\nFailed: ${command} ${args.join(' ')}`);
    process.exit(1);
  }
}

// 1. Get the latest master from GitHub
console.log('Fetching the latest master from GitHub...');
mustRun('git', ['fetch', 'origin', 'master']);

// 2. Check it out into .master-run/ (created the first time, refreshed after that)
if (fs.existsSync(path.join(runDir, '.git'))) {
  mustRun('git', ['checkout', '--detach', '--force', 'origin/master'], { cwd: runDir });
} else {
  run('git', ['worktree', 'prune']);
  mustRun('git', ['worktree', 'add', '--detach', '.master-run', 'origin/master']);
}
console.log(`\nRunning tests from master @ ${spawnSync('git', ['rev-parse', '--short', 'origin/master'], { cwd: root }).stdout.toString().trim()}\n`);

// 3. Run every test headless except the login test. node_modules is found in the
//    project folder above, so nothing needs installing. The report opens only if asked.
const status = run('npx', ['playwright', 'test', '--grep-invert', '@login', ...process.argv.slice(2)], {
  cwd: runDir,
  env: { ...process.env, PLAYWRIGHT_HTML_OPEN: 'never' },
});
console.log(status === 0 ? '\nAll tests passed.' : '\nSome tests failed.');

// 4. Offer the report
function finish() {
  process.exit(status);
}
if (!process.stdin.isTTY) {
  console.log(`Report saved to ${reportDir}`);
  finish();
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Open the HTML report? (y/n) ', answer => {
  rl.close();
  if (/^y/i.test(answer.trim())) {
    console.log('Opening the report - press Ctrl+C to close it.');
    run('npx', ['playwright', 'show-report', `"${reportDir}"`]);
  } else {
    console.log(`Report saved to ${reportDir} - open it later with: npx playwright show-report .master-run/playwright-report`);
  }
  finish();
});
