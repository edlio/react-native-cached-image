'use strict';

const _ = require('lodash');

const RNFatchBlob = require('react-native-fetch-blob').default;

const {
    fs
} = RNFatchBlob;

const {
    DocumentDir: DocumentDirectoryPath
} = fs.dirs;

const SHA1 = require("crypto-js/sha1");
const URL = require('url-parse');

const defaultHeaders = {};
const defaultResolveHeaders = _.constant(defaultHeaders);

const SUB_DIR_PATH = 'subDirPath';

const defaultOptions = {
    useQueryParamsInCacheKey: false
};

const activeDownloads = {};

function serializeObjectKeys(obj) {
    return _(obj)
        .toPairs()
        .sortBy(a => a[0])
        .map(a => a[1])
        .value();
}

function getQueryForCacheKey(url, useQueryParamsInCacheKey) {
    if (_.isArray(useQueryParamsInCacheKey)) {
        return serializeObjectKeys(_.pick(url.query, useQueryParamsInCacheKey));
    }
    if (useQueryParamsInCacheKey) {
        return serializeObjectKeys(url.query);
    }
    return '';
}

function generateCacheKey(url, options) {
    const parsedUrl = new URL(url, null, true);

    const pathParts = parsedUrl.pathname.split('/');

    // last path part is the file name
    const fileName = pathParts.pop();
    const filePath = pathParts.join('/');

    const parts = fileName.split('.');
    // TODO - try to figure out the file type or let the user provide it, for now use jpg as default
    const type = parts.length > 1 ? parts.pop() : 'jpg';

    const cacheable = filePath + fileName + type + getQueryForCacheKey(parsedUrl, options.useQueryParamsInCacheKey);
    return SHA1(cacheable) + '.' + type;
}

function getCachePath(url, options) {
    if (options.cacheGroup) {
        return options.cacheGroup;
    }
    const parsedUrl = new URL(url);
    return parsedUrl.host;
}

function getCachedImageFilePath(url, options) {
    const cacheKey = generateCacheKey(url, options);
    const cachePath = getCachePath(url, options);

    const dirPath = getBaseDirPath() + '/' + cachePath;
    return dirPath + '/' + cacheKey;
}

function deleteFile(filePath) {
    return fs.stat(filePath)
        .then(res => res && res.type === 'file')
        .then(exists => exists && fs.unlink(filePath))
        .catch((err) => {
            // swallow error to always resolve
        });
}

function getBaseDirPath(){
    return DocumentDirectoryPath + '/' + SUB_DIR_PATH;
}

function ensurePath(filePath) {
    const parts = filePath.split('/');
    const dirPath = _.initial(parts).join('/');
    return fs.isDir(dirPath)
        .then(exists =>
            !exists && fs.mkdir(dirPath)
        );
}

/**
 * returns a promise that is resolved when the download of the requested file
 * is complete and the file is saved.
 * if the download fails, or was stopped the partial file is deleted, and the
 * promise is rejected
 * @param fromUrl   String source url
 * @param toFile    String destination path
 * @param headers   Object headers to use when downloading the file
 * @returns {Promise}
 */
function downloadImage(fromUrl, toFile, headers = {}) {
    // use toFile as the key as is was created using the cacheKey
    if (!_.has(activeDownloads, toFile)) {
        // create an active download for this file
        activeDownloads[toFile] = new Promise((resolve, reject) => {
            RNFatchBlob
                .config({path: toFile})
                .fetch('GET', fromUrl, headers)
                .then(res => resolve(toFile))
                .catch(err =>
                    deleteFile(toFile)
                        .then(() => reject(err))
                )
                .finally(() => {
                    // cleanup
                    delete activeDownloads[toFile];
                });
        });
    }
    return activeDownloads[toFile];
}

function createPrefetcer(list) {
    const urls = _.clone(list);
    return {
        next() {
            return urls.shift();
        }
    };
}

function runPrefetchTask(prefetcher, options) {
    const url = prefetcher.next();
    if (!url) {
        return Promise.resolve();
    }
    // if url is cacheable - cache it
    if (isCacheable(url)) {
        // check cache
        return getCachedImagePath(url, options)
        // if not found download
            .catch(() => cacheImage(url, options))
            // then run next task
            .then(() => runPrefetchTask(prefetcher, options));
    }
    // else get next
    return runPrefetchTask(prefetcher, options);
}

// API

function isCacheable(url) {
    return _.isString(url) && (_.startsWith(url, 'http://') || _.startsWith(url, 'https://'));
}

function getCachedImagePath(url, options = defaultOptions) {
    const filePath = getCachedImageFilePath(url, options);
    return fs.stat(filePath)
        .then(res => {
            if (res.type !== 'file') {
                // reject the promise if res is not a file
                throw new Error('Failed to get image from cache');
            }
            if (!res.size) {
                // something went wrong with the download, file size is 0, remove it
                return deleteFile(filePath)
                    .then(() => {
                        throw new Error('Failed to get image from cache');
                    });
            }
            return filePath;
        })
        .catch(err => {
            throw err;
        })
}

function cacheImage(url, options = defaultOptions, resolveHeaders = defaultResolveHeaders) {
    const filePath = getCachedImageFilePath(url, options);
    return ensurePath(filePath)
        .then(() => resolveHeaders())
        .then(headers => downloadImage(url, filePath, headers));
}

function deleteCachedImage(url, options = defaultOptions) {
    const filePath = getCachedImageFilePath(url, options);
    return deleteFile(filePath);
}

function cacheMultipleImages(urls, options = defaultOptions) {
    const prefetcher = createPrefetcer(urls);
    const numberOfWorkers = urls.length;
    const promises = _.times(numberOfWorkers, () =>
        runPrefetchTask(prefetcher, options)
    );
    return Promise.all(promises);
}

function deleteMultipleCachedImages(urls, options = defaultOptions) {
    return _.reduce(urls, (p, url) =>
            p.then(() => deleteCachedImage(url, options)),
        Promise.resolve()
    );
}

function clearCache() {
    deleteFile(getBaseDirPath());
    ensurePath(getBaseDirPath());
}

module.exports = {
    isCacheable,
    getCachedImagePath,
    cacheImage,
    deleteCachedImage,
    cacheMultipleImages,
    deleteMultipleCachedImages,
    clearCache
};
