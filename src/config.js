const API_URL = 'https://api.github.com/repos/HDCbc/emr-exporter/releases/latest';
const KEY_URL = 'https://s3.ca-central-1.amazonaws.com/shared.hdcbc.ca/emr-exporter.asc';
const EXE_FILENAME = 'emr-exporter-win.exe';
const SIG_FILENAME = `${EXE_FILENAME}.sig`;

const LOG_CONFIG = {
  level: 'info',
  filename: './logs/updater.log',
  maxsize: 1048576, // 1 MB
  maxFiles: 10,
  zippedArchive: true,
  tailable: true,
};

module.exports = {
  API_URL,
  KEY_URL,
  EXE_FILENAME,
  SIG_FILENAME,
  LOG_CONFIG,
};
