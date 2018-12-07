const { spawn } = require('child_process');

const { API_URL, KEY_URL, LOG_CONFIG, DEFAULT_OS } = require('./config');
const configureLogger = require('./configureLogger');
const { update } = require('./updater');

let logger;

/**
 * Get the parameters that are based on the operating system.
 *
 * @param {} paramOs - A possible override parameter (needs to be os=win or os=linux)
 * @param {} defaultOs - If an override parameter is not valid/specified then use this value.
 */
const getOsParameters = (paramOs, defaultOs) => {
  let os = defaultOs;
  // If an override parameter exists (exe=exenamehere) then use that.
  if (paramOs) {
    const tokens = paramOs.split('=');

    if (tokens.length === 2 && tokens[0] === 'os') {
      os = tokens[1].trim();
    }
  }

  if (os === 'win') {
    return {
      exeFile: 'emr-exporter-win.exe',
      spawnCmd: 'emr-exporter-win.exe',
      sigFile: 'emr-exporter-win.exe.sig',
    };
  }
  if (os === 'linux') {
    return {
      exeFile: 'emr-exporter-linux',
      spawnCmd: './emr-exporter-linux',
      sigFile: 'emr-exporter-linux.sig',
    };
  }

  console.log(`Unknown OS parameter (${os})`);
  process.exit(1);
};

const runProcess = (spawnCmd, args) => {
  logger.debug({ spawnCmd }, 'Run process');
  spawn(spawnCmd, args, { stdio: 'inherit', shell: true });
};

const run = () => {
  configureLogger(LOG_CONFIG);
  logger = require('winston');
  logger.info('=================================================================================X');

  const { exeFile, sigFile, spawnCmd } = getOsParameters(process.argv[2], DEFAULT_OS);

  // Pass any command line arguments into the new process.
  // Note that we ignore the first two (execPath and javascript file).
  const args = process.argv.slice(2);

  update(API_URL, KEY_URL, exeFile, sigFile, (err) => {
    if (err) {
      return logger.error({ err }, 'Update failed');
    }
    runProcess(spawnCmd, args);
  });
};

module.exports = {
  run,
};
