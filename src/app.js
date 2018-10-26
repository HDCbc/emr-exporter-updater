const { spawn } = require('child_process');
const {
  API_URL, KEY_URL, EXE_FILENAME, SIG_FILENAME, LOG_CONFIG,
} = require('./config');
const configureLogger = require('./configureLogger');
const { update } = require('./updater');

let logger;

const runProcess = (exePath, args) => {
  logger.debug({ exePath }, 'Run process');
  spawn(exePath, args, { stdio: 'inherit', shell: true });
};

const run = () => {
  configureLogger(LOG_CONFIG);
  logger = require('winston');
  logger.info('=================================================================================X');

  // Pass any command line arguments into the new process.
  // Note that we ignore the first two (execPath and javascript file).
  const args = process.argv.slice(2);

  update(API_URL, KEY_URL, EXE_FILENAME, SIG_FILENAME, (err) => {
    if (err) {
      return logger.fatal({ err }, 'Update failed');
    }
    runProcess(EXE_FILENAME, args);
  });
};

module.exports = {
  run,
};
