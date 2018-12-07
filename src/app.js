const { spawn } = require('child_process');

const { API_URL, KEY_URL, LOG_CONFIG, DEFAULT_EXE_FILE } = require('./config');
const configureLogger = require('./configureLogger');
const { update } = require('./updater');

let logger;

/**
 * Determine the name of the executable file.
 *
 * The executable file is the file whose signature will be checked,
 * and then executed after ensuring it is updated.
 *
 * @param {} override - A possible override parameter (needs to be exe=exenamehere)
 * @param {} defaultFile - If an override parameter is not valid/specified then use this value.
 */
const getExecutableFilename = (override, defaultFile) => {
  // If an override parameter exists (exe=exenamehere) then use that.
  if (override) {
    const tokens = override.split('=');

    if (tokens.length === 2 && tokens[0] === 'exe') {
      return tokens[1].trim();
    }
  }

  // Otherwise, default to "emr-exporter-win.exe";
  return defaultFile;
};

const runProcess = (exePath, args) => {
  logger.debug({ exePath }, 'Run process');
  spawn(exePath, args, { stdio: 'inherit', shell: true });
};

const run = () => {
  configureLogger(LOG_CONFIG);
  logger = require('winston');
  logger.info('=================================================================================X');

  const exeFile = getExecutableFilename(process.argv[2], DEFAULT_EXE_FILE);
  const sigFile = `${exeFile}.sig`;

  // Pass any command line arguments into the new process.
  // Note that we ignore the first two (execPath and javascript file).
  const args = process.argv.slice(2);

  update(API_URL, KEY_URL, exeFile, sigFile, (err) => {
    if (err) {
      return logger.error({ err }, 'Update failed');
    }
    runProcess(exeFile, args);
  });
};

module.exports = {
  run,
};
