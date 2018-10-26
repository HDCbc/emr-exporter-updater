const async = require('async');
const logger = require('winston');
const fs = require('fs');
const openpgp = require('openpgp');
const request = require('request');

const UPDATED_ERR = 'Remote and local signatures match. Update not required.';

/**
 * Fetch a remote url (GET).
 *
 * @param {*} url The url to retrieve.
 * @param {*} encoding The encoding to be used on the response data. (null = binary).
 * @param {*} cb
 */
const get = (url, encoding, cb) => {
  logger.debug({ url, encoding }, 'Get url');

  request.get(url, {
    // http://developer.github.com/v3/#user-agent-required
    headers: { 'user-agent': 'node.js' },
    encoding,
  }, (err, response, body) => {
    if (err) {
      return cb(err);
    }
    const { statusCode } = response;

    if (statusCode !== 200) {
      // Don't debug the body if it is binary
      if (encoding === null) {
        logger.debug({ statusCode }, 'Get Url Failed');
      } else {
        logger.debug({ statusCode, body }, 'Get Url Failed');
      }
      return cb(`Response Code ${statusCode}`);
    }

    // Dont trace the body if it is binary.
    if (encoding !== null) {
      logger.silly(body);
    }

    return cb(null, body);
  });
};

/**
 * Fetch the content of a file on the local filesystem.
 *
 * @param {*} filepath The filepath of the file.
 * @param {*} encoding The encoding to be used on the file data..
 * @param {*} notFoundValue If the file does not exist, this content will be returned instead.
 * @param {*} cb
 */
const readFile = (filepath, encoding, notFoundValue, cb) => {
  logger.debug({ filepath, encoding }, 'Read file');

  fs.readFile(filepath, encoding, (err, res) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return cb(null, notFoundValue);
      }

      return cb(err);
    }
    logger.silly(res);
    return cb(null, res);
  });
};

/**
 * Parse an asset url from the GitHub Api meta data based on the asset name.
 *
 * @param {*} meta The meta data for the release as per https://developer.github.com/v3/repos/releases/#get-the-latest-release
 * @param {*} assetName The name of the asset to retrieve the url for.
 * @param {*} cb
 */
const parseAssetUrl = (meta, assetName, cb) => {
  logger.debug({ assetName }, 'Parsing asset url');

  const asset = meta.assets.find(e => e.name === assetName);

  if (!asset) {
    return cb(`Asset ${assetName} not found`);
  }

  const url = asset.browser_download_url;
  logger.debug({ url }, 'Parsed Asset Url');

  return cb(null, url);
};

/**
 * Compare two signatures. If they are the same then callback an error.
 *
 * @param {*} remoteSig
 * @param {*} localSig
 * @param {*} cb
 */
const compareSignatures = (remoteSig, localSig, cb) => {
  logger.debug('Comparing remote and local signatures');

  if (remoteSig === localSig) {
    logger.info(UPDATED_ERR);
    return cb(UPDATED_ERR);
  }

  logger.info('Remote and local signatures differ. Update required.');
  return cb(null);
};

/**
 * Verify that the content and signature match the key.
 *
 * @param {*} sigString - The signature.
 * @param {*} contentBinary - The content.
 * @param {*} keyString - The key.
 * @param {*} cb
 */
const verify = (sigString, contentBinary, keyString, cb) => {
  logger.debug('Verification started');

  const options = {
    message: openpgp.message.fromBinary(Uint8Array.from(contentBinary)),
    signature: openpgp.signature.readArmored(sigString),
    publicKeys: openpgp.key.readArmored(keyString).keys,
  };

  openpgp.verify(options).then((verified) => {
    const { valid } = verified.signatures[0];

    if (valid) {
      const signedBy = `Verification signed by ${verified.signatures[0].keyid.toHex()}`;
      logger.debug(signedBy);
      return cb(null, signedBy);
    }
    return cb('Unable to verify signature');
  }).catch(err => cb(err));
};

/**
 * Write a file to the local filesystem.
 *
 * @param {*} filepath The filepath of the file.
 * @param {*} content The content to write into the file.
 * @param {*} cb
 */
const writeFile = (filepath, content, cb) => {
  logger.debug(`Write File ${filepath}`);
  fs.writeFile(filepath, content, cb);
};

const update = (apiUrl, keyUrl, exeFileName, sigFileName, callback) => {
  async.auto({
    // Download the GitHub API metadata for the release (string).
    metaString: cb => get(apiUrl, 'utf8', cb),
    // Convert the metadata to a Javascript Object.
    meta: ['metaString', (params, cb) => async.asyncify(JSON.parse)(params.metaString, cb)],
    // Parse the Signature download url from the meta data.
    remoteSigUrl: ['metaString', (params, cb) => parseAssetUrl(params.meta, sigFileName, cb)],
    // Parse the Executable download url from the meta data.
    remoteExeUrl: ['remoteSigUrl', 'meta', (params, cb) => parseAssetUrl(params.meta, exeFileName, cb)],
    // Download the Remote Signature.
    remoteSig: ['remoteExeUrl', 'remoteSigUrl', (params, cb) => get(params.remoteSigUrl, 'utf8', cb)],
    // Read the Local Signature from the filesystem.
    localSig: ['remoteSig', (params, cb) => readFile(sigFileName, 'utf8', '', cb)],
    // Compare the remote and local signature. (Fails on match).
    sigComparison: ['remoteSig', 'localSig', (params, cb) => compareSignatures(params.remoteSig, params.localSig, cb)],
    // Download the executable into memory (null encoding for binary).
    exeContent: ['sigComparison', 'remoteExeUrl', (params, cb) => get(params.remoteExeUrl, null, cb)],
    // Download the public key for verification.
    publicKey: ['sigComparison', (params, cb) => get(keyUrl, 'utf8', cb)],
    // Verify the executable/signature against the public key.
    verified: ['remoteSig', 'exeContent', 'publicKey', (params, cb) =>
      verify(params.remoteSig, params.exeContent, params.publicKey, cb)],
    // Save the signature to the local filesystem.
    saveSig: ['verified', 'remoteSig', (params, cb) => writeFile(sigFileName, params.remoteSig, cb)],
    // Save the executable to the local filesystem.
    saveExe: ['verified', 'exeContent', (params, cb) => writeFile(exeFileName, params.exeContent, cb)],
  }, (err) => {
    if (err) {
      if (err !== UPDATED_ERR) {
        // If there is a "real error" then exit (dont run the process).
        return callback(err);
      }

      // The application was already up to date. Run the existing exporter.
      return callback(null, 'Update Skipped');
    }

    // The application was updated. Run the new exporter.
    return callback(null, 'Update Success');
  });
};

module.exports = {
  update,
};
