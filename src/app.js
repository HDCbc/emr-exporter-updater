const bunyan = require('bunyan');
const { spawn } = require('child_process');
const {
  API_URL, KEY_URL, EXE_FILENAME, SIG_FILENAME,
} = require('./config');
const { update } = require('./updater');

const logger = bunyan.createLogger({ name: 'app', level: 'debug' });

const runProcess = (exePath, args) => {
  logger.debug({ exePath }, 'Run process');

  const process = spawn(exePath, args, { stdio: 'inherit' });

  process.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  process.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  process.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
};

const run = () => {
  logger.info('==================================================================================');

  // Pass any command line arguments into the new process.
  // Note that we ignore the first two (execPath and javascript file).
  const args = process.argv.slice(2);

  update(API_URL, KEY_URL, EXE_FILENAME, SIG_FILENAME, (err, res) => {
    if (err) {
      return logger.fatal({ err }, 'Update failed');
    }

    runProcess(EXE_FILENAME, args);
  });
};

module.exports = {
  run,
};

