# History

The files within this directory were originally part of an open-source repository on bitbucket, no longer available:
https://bitbucket.org/clcorpdevelopment/react-native-casher
This code was provided by "Clcorp" under ISC license. We've incorporated into our react-native-cached-image
library so that we can fork the code and provide maintenance as the codebase ages.

# MemoryCache

Extended AsyncStorage with expiration check

AsyncStorage can only save data forever. If you want save data for some period of time and clean outdated data - 
use following API:

- `set(key: string, value?: mixed, expires?: seconds)` - Stores data by key and expiration time in seconds
- `get(key: string)` - Returns stored data by key
- `remove(key: string)` - Clear data by key
- `multiGet(keys: array)` - Get data by keys
- `multiSet(values: object, expires?: seconds)` - Store multiple data with expiration time in seconds 
- `multiRemove(keys: array)` - Clears storage by specified keys
- `flush()` - Clear storage
- `isExpired(key: string)` - Checks of data expiration 
- `getAllKeys()` - Returns all stored keys
- `getAllValues()` - Returns all stored serialized values

## Installation

```
npm install --save react-native-clcasher
```

## Usage

```
const MemoryCache = require('react-native-clcasher/MemoryCache').default;

MemoryCache.set(url, headers, maxAge)
```
