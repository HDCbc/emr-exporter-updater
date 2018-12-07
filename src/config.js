const API_URL = 'https://api.github.com/repos/HDCbc/emr-exporter/releases/latest';
const KEY_URL = 'https://s3.ca-central-1.amazonaws.com/shared.hdcbc.ca/emr-exporter.asc';
const DEFAULT_OS = 'win';

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
  DEFAULT_OS,
  KEY_URL,
  LOG_CONFIG,
};
