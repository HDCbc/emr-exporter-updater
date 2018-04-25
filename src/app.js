const bunyan = require('bunyan');
const { spawn } = require('child_process');
const {
  API_URL, KEY_URL, EXE_FILENAME, SIG_FILENAME,
} = require('./config');
const { update } = require('./updater');

const logger = bunyan.createLogger({ name: 'app', level: 'debug' });

const runProcess = (exePath) => {
  logger.debug({ exePath }, 'Run process');

  const process = spawn(exePath);

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

  update(API_URL, KEY_URL, EXE_FILENAME, SIG_FILENAME, (err, res) => {
    if (err) {
      return logger.fatal({ err }, 'Update failed');
    }

    runProcess(EXE_FILENAME);
  });
};

module.exports = {
  run,
};

