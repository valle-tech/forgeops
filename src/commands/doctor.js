import { run, whichAvailable } from '../lib/exec.js';

function line(ok, label, detail = '') {
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ''}`);
}

export function registerDoctorCommands(program) {
  program
    .command('doctor')
    .description('Validate environment: Node, Docker, Compose, Git (gh optional)')
    .action(async () => {
      let failed = 0;

      const major = Number(process.versions.node.split('.')[0]);
      const nodeOk = major >= 18;
      if (!nodeOk) failed++;
      line(nodeOk, 'Node.js', process.version);

      const docker = await whichAvailable('docker');
      if (!docker) failed++;
      line(docker, 'docker');

      let composeOk = false;
      if (docker) {
        try {
          await run('docker', ['compose', 'version'], { stdio: 'ignore' });
          composeOk = true;
        } catch {
          composeOk = await whichAvailable('docker-compose');
        }
      }
      if (docker && !composeOk) failed++;
      if (!docker) {
        line(false, 'Docker Compose', 'skipped (no docker)');
      } else {
        line(composeOk, 'Docker Compose', composeOk ? 'ok' : 'install Compose v2 or docker-compose v1');
      }

      const git = await whichAvailable('git');
      if (!git) failed++;
      line(git, 'git');

      const gh = await whichAvailable('gh');
      line(gh, 'GitHub CLI (optional)', gh ? 'gh found' : 'not installed');

      if (failed) {
        console.log(`\n${failed} required check(s) failed.`);
        process.exitCode = 1;
      } else {
        console.log('\nAll required checks passed.');
      }
    });
}
