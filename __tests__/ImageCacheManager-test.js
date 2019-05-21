'use strict';

jest.mock('rn-fetch-blob', () => ({default: {fs: {}}}));

import ImageCacheManager from '../ImageCacheManager';
import SimpleMemoryCache from './SimpleMemoryCache';
import SimpleMemoryFs from './SimpleMemoryFs';

const icm = ImageCacheManager({}, SimpleMemoryCache, SimpleMemoryFs);

describe('ImageCacheManager', () => {

    beforeEach(() => icm.clearCache());

    describe('downloadAndCacheUrl', () => {

        it('should fail if URL is not cacheable', () => {
            return icm.getCacheInfo()
                .then(res => console.log(res))
                .then(() => {
                    return expect(icm.downloadAndCacheUrl('not a real url')).rejects.toBeDefined();
                });
        });

        it('should download a file when not in cache', () => {
            return icm.getCacheInfo()
                .then(res => console.log(res))
                .then(() => icm.downloadAndCacheUrl('https://example.com/image.jpg'))
                .then(() => icm.getCacheInfo())
                .then(res => console.log(res))
        });

    });

});