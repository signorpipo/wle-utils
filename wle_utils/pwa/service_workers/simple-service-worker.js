// #region Service Worker Setup

let _myAppName = "app";
let _myServiceWorkerVersion = 1;
let _myCacheVersion = 1;



let _myResourceURLsToPrecache = [];



// If u are not sure if it is a good idea to cache resources which are not coming from your own location,
// which basically means the ones uploaded by u on your domain,
// u can enable this to cache only the ones coming from the current location
let _myCacheOnlyResourcesFromCurrentLocation = false;

// Try the cache first, and only if it fails fetch from the network
let _myTryCacheFirst = false;

// When fetching from the cache first, the resource is never updated again
// If u want to fetch from the cache to quickly serve the request, but still want to update the cached resource by fetching from the network,
// u can enable this
let _myUpdateCacheInBackground = false;

// Ignore URL params when trying to get from the cache, but only if the network fails,
// since the params might be used to fetch a different resource
let _myTryCacheIgnoringURLParamsForResourcesFromCurrentLocationAsFallback = false;

// If u are not using @_myTryCacheFirst, when the network fails for the current location it will take a lot to serve the requests from the cache,
// since every request needs to fail first
// U can enable this to make it so that on the first network error from the current location u switch to use the cache first
let _myForceTryCacheFirstOnNetworkErrorFromCurrentLocation = false;



// This will avoid installing the service worker on localhost,
// since it might be annoying while developing your app
let _myRejectServiceWorkerOnLocalhost = false;



let _myLogEnabled = false;

// #endregion Service Worker Setup



// #region Known Issues
//
// - If a service worker only partially manage to cache the data (both during precache or normal fetch phase),
//   and u update both your app and the service worker, in a way to clean the cache, while the new service worker install itself,
//   the old service worker might start to use the new data while serving some of the old one too, mixing the 2 versions
//   As soon as the new service worker is activated the app will be fixed, so it's not permanent, but in the meantime u could have errors
//   in your app due to this

//   If u always fetch first from the network, it should not be an issue, but if u try the cache first, then u can have this
//   You should not worry too much about this tho, since it should not be a real issue happening often, and eventually fix itself
//
//   The easiest way to avoid having this, if u are really worried about it, is to have an empty @_myResourceURLsToPrecache list,
//   so to complete the install as fast as possible, enable @_myImmediatelyActivateNewServiceWorker
//   and reload the page when the service worker change
//   This will basically switch to the new service worker as soon as possible, therefore fetching the new version of your app
//
//   If u instead care about precaching, an idea would be to find out that a new service worker is trying to install inside your app code,
//   and prevent using it until the installation has been completed, but I think this would be an overkill unless it's really important, for example
//   for a multiplayer experience where a glitch could give an advantage
//
// #endregion Known Issues






// #region Service Worker Constants

let _ANY_RESOURCE = [".*"];
let _NO_RESOURCE = [];

let _ANY_RESOURCE_FROM_CURRENT_LOCATION = ["^" + _escapeRegexSpecialCharacters(_getCurrentLocation()) + ".*"];
let _ANY_RESOURCE_FROM_CURRENT_ORIGIN = ["^" + _escapeRegexSpecialCharacters(_getCurrentOrigin()) + ".*"];

let _LOCALHOST = ["localhost:8080"];
let _NO_LOCATION = [];

// #endregion Service Worker Constants



// #region Service Worker Variables

let _myForceTryCacheFirstOnNetworkErrorEnabled = false; // As of now this is not reset on page reload, but only when using a new tab

// #endregion Service Worker Variables



// #region Service Worker Events

self.addEventListener("install", function (event) {
    event.waitUntil(_install());
});

self.addEventListener("activate", function (event) {
    event.waitUntil(_activate());
});

self.addEventListener("fetch", function (event) {
    event.respondWith(fetchFromServiceWorker(event.request));
});

// #endregion Service Worker Events



// #region Service Worker Public Functions

async function fetchFromServiceWorker(request) {
    if (!_shouldHandleRequest(request)) {
        return fetch(request);
    }

    let cacheAlreadyTried = false;
    if (_myTryCacheFirst || _myForceTryCacheFirstOnNetworkErrorEnabled) {
        cacheAlreadyTried = true;

        // Try to get the resource from the cache
        try {
            let responseFromCache = await fetchFromCache(request.url);
            if (responseFromCache != null) {
                if (_myUpdateCacheInBackground) {
                    _fetchFromNetworkAndPutInCache(request);
                }

                return responseFromCache;
            }
        } catch (error) {
            // Do nothing, possibly get from cache failed so we should go on and try with the network
        }
    }

    // Try to get the resource from the network
    let [responseFromNetwork, responseHasBeenCached] = await _fetchFromNetworkAndPutInCache(request, true);
    if (isResponseOk(responseFromNetwork) || isResponseOpaque(responseFromNetwork)) {
        return responseFromNetwork;
    } else {
        if (!_myForceTryCacheFirstOnNetworkErrorEnabled) {
            let enableForceTryCacheFirstOnNetworkError = _myForceTryCacheFirstOnNetworkErrorFromCurrentLocation && _shouldResourceURLBeIncluded(request.url, _ANY_RESOURCE_FROM_CURRENT_LOCATION, _NO_RESOURCE);
            if (enableForceTryCacheFirstOnNetworkError) {
                _myForceTryCacheFirstOnNetworkErrorEnabled = true;

                if (_myLogEnabled) {
                    console.warn("Force try cache on network error enabled");
                }
            }
        }

        if (!cacheAlreadyTried) {
            let responseFromCache = await fetchFromCache(request.url);
            if (responseFromCache != null) {
                return responseFromCache;
            }
        }


        let ignoreURLParamsAsFallback = _myTryCacheIgnoringURLParamsForResourcesFromCurrentLocationAsFallback && _shouldResourceURLBeIncluded(request.url, _ANY_RESOURCE_FROM_CURRENT_LOCATION, _NO_RESOURCE);
        if (ignoreURLParamsAsFallback) {
            let responseFromCache = await fetchFromCache(request.url, ignoreURLParamsAsFallback);
            if (responseFromCache != null) {
                return responseFromCache;
            }
        }

        if (responseFromNetwork != null) {
            return responseFromNetwork;
        } else {
            return new Response("Invalid response for " + request.url, {
                status: 404,
                headers: { "Content-Type": "text/plain" },
            });
        }
    }
}

async function cacheResourcesToPrecache(allowRejectOnPrecacheFail = false) {
    return await _cacheResourcesToPrecache(allowRejectOnPrecacheFail, false);
}

async function fetchFromNetworkAndPutInCache(request, awaitOnlyFetchFromNetwork = false) {
    return await _fetchFromNetworkAndPutInCache(request, awaitOnlyFetchFromNetwork);
}

async function fetchFromNetwork(request) {
    let networkResponse = null;

    try {
        networkResponse = await fetch(request);
    } catch (error) {
        networkResponse = null;

        if (_myLogEnabled) {
            console.error("An error occurred when trying to fetch from the network: " + request.url);
        }
    }

    return networkResponse;
}

async function fetchFromCache(resourceURL, ignoreURLParams = false, ignoreVaryHeader = false) {
    let responseFromCache = null;

    try {
        let currentCacheID = _getCacheID();
        let hasCache = await caches.has(currentCacheID); // Avoid creating the cache when opening it if it has not already been created
        if (hasCache) {
            let currentCache = await caches.open(currentCacheID);
            responseFromCache = await currentCache.match(resourceURL, { ignoreSearch: ignoreURLParams, ignoreVary: ignoreVaryHeader });
        }
    } catch (error) {
        responseFromCache = null;

        if (_myLogEnabled) {
            console.error("An error occurred when trying to get from the cache: " + resourceURL);
        }
    }

    return responseFromCache;
}

async function putInCache(request, response) {
    return await _putInCache(request, response);
}

async function hasInCache(resourceURL, ignoreURLParams = false, ignoreVaryHeader = false) {
    let responseFromCache = await fetchFromCache(resourceURL, ignoreURLParams, ignoreVaryHeader);
    return responseFromCache != null;
}

async function hasInCacheAllResourcesToPrecache(ignoreURLParams = false, ignoreVaryHeader = false) {
    let allResourcesToPreacheAreCached = true;

    let resourceURLsToPrecache = getResourceURLsToPrecache();
    if (resourceURLsToPrecache.length > 0) {
        try {
            let currentCacheID = _getCacheID();
            let hasCache = await caches.has(currentCacheID); // Avoid creating the cache when opening it if it has not already been created
            if (hasCache) {
                let currentCache = await caches.open(currentCacheID);

                allResourcesToPreacheAreCached = true;
                for (let resourceURLToPrecache of resourceURLsToPrecache) {
                    let resourceCompleteURLToPrecache = new Request(resourceURLToPrecache).url;

                    responseFromCache = await currentCache.match(resourceCompleteURLToPrecache, { ignoreSearch: ignoreURLParams, ignoreVary: ignoreVaryHeader });

                    if (responseFromCache == null) {
                        allResourcesToPreacheAreCached = false;
                    }
                }
            } else {
                allResourcesToPreacheAreCached = false;
            }
        } catch (error) {
            allResourcesToPreacheAreCached = false;
        }
    }

    return allResourcesToPreacheAreCached;
}

function getResourceURLsToPrecache() {
    return _myResourceURLsToPrecache;
}

// #endregion Service Worker Public Functions



// #region Service Worker Public Utils

function isResponseOk(response) {
    return response != null && response.status == 200;
}

function isResponseOpaque(response) {
    return response != null && response.status == 0 && response.type.includes("opaque");
}

function shouldResourceBeCached(request, response) {
    let cacheResource = !_myCacheOnlyResourcesFromCurrentLocation || _shouldResourceURLBeIncluded(request.url, _ANY_RESOURCE_FROM_CURRENT_LOCATION, _NO_RESOURCE);
    return cacheResource && (request.method == "GET" && isResponseOk(response));
}

// #endregion Service Worker Public Utils



// #region Service Worker Private Functions

async function _install() {
    if (_myRejectServiceWorkerOnLocalhost) {
        let rejectServiceWorker = _shouldResourceURLBeIncluded(_getCurrentLocation(), _LOCALHOST, _NO_LOCATION);
        if (rejectServiceWorker) {
            throw new Error("The service worker is not allowed to be installed on the current location: " + _getCurrentLocation());
        }
    }

    await _cacheResourcesToPrecache(true, true);
}

async function _activate() {
    await _copyTempCacheToCurrentCache();

    await _deletePreviousCaches();
}

async function _cacheResourcesToPrecache(allowRejectOnPrecacheFail = true, useTemps = false) {
    if (getResourceURLsToPrecache().length == 0) return;

    let currentCache = null;

    try {
        let cacheAlreadyExists = await caches.has(_getCacheID());
        if (cacheAlreadyExists) {
            currentCache = await caches.open(_getCacheID());
        }
    } catch (error) {
        currentCache = null;
    }

    let currentTempCache = null;
    if (useTemps) {
        try {
            let tempCacheAlreadyExists = await caches.has(_getTempCacheID());
            if (tempCacheAlreadyExists) {
                currentTempCache = await caches.open(_getTempCacheID());
            }
        } catch (error) {
            currentTempCache = null;
        }
    }

    let promisesToAwait = [];
    for (let resourceURLToPrecache of getResourceURLsToPrecache()) {
        let resourceCompleteURLToPrecache = new Request(resourceURLToPrecache).url;

        promisesToAwait.push(new Promise(async function (resolve, reject) {
            let resourceHasBeenPrecached = false;

            try {
                let resourceHaveToBeCached = false;

                let resourceAlreadyInCache = false;
                if (currentCache != null) {
                    resourceAlreadyInCache = await currentCache.match(resourceCompleteURLToPrecache) != null;
                }

                if (!resourceAlreadyInCache) {
                    if (!useTemps) {
                        resourceHaveToBeCached = true;
                    } else {
                        let resourceAlreadyInTempCache = false;
                        if (currentTempCache != null) {
                            resourceAlreadyInTempCache = await currentTempCache.match(resourceCompleteURLToPrecache) != null;
                        }

                        if (!resourceAlreadyInTempCache) {
                            resourceHaveToBeCached = true;
                        }
                    }
                }

                if (resourceHaveToBeCached) {
                    let [responseFromNetwork, responseHasBeenCached] = await _fetchFromNetworkAndPutInCache(new Request(resourceCompleteURLToPrecache), false, useTemps);
                    resourceHasBeenPrecached = responseHasBeenCached;
                } else {
                    resourceHasBeenPrecached = true; // The resource has been already precached
                }
            } catch (error) {
                if (_myLogEnabled) {
                    console.error("Failed to fetch resource to precache: " + resourceCompleteURLToPrecache);
                }
            }

            resolve();
        }));
    }

    await Promise.all(promisesToAwait);
}

async function _fetchFromNetworkAndPutInCache(request, awaitOnlyFetchFromNetwork = false, useTemps = false) {
    let responseFromNetwork = await fetchFromNetwork(request);
    let responseHasBeenCached = false;

    if (isResponseOk(responseFromNetwork) || isResponseOpaque(responseFromNetwork)) {
        if (shouldResourceBeCached(request, responseFromNetwork)) {
            if (!awaitOnlyFetchFromNetwork) {
                responseHasBeenCached = await _putInCache(request, responseFromNetwork, useTemps);
            } else {
                _putInCache(request, responseFromNetwork, useTemps);

                responseHasBeenCached = null; // Not awaiting so we can't know
            }
        }
    }

    return [responseFromNetwork, responseHasBeenCached];
}

async function _putInCache(request, response, useTempCache = false) {
    let putInCacheSucceeded = false;

    try {
        let clonedResponse = response.clone();
        let currentCacheID = (useTempCache) ? _getTempCacheID() : _getCacheID();
        let currentCache = await caches.open(currentCacheID);
        await currentCache.put(request, clonedResponse);
        putInCacheSucceeded = true;
    } catch (error) {
        putInCacheSucceeded = false;

        if (_myLogEnabled) {
            console.error("An error occurred when trying to put the response in the cache: " + request.url);
        }
    }

    return putInCacheSucceeded;
}

async function _deletePreviousCaches() {
    let cachesIDs = await caches.keys();

    for (let cacheID of cachesIDs) {
        try {
            if (_shouldDeleteCacheID(cacheID)) {
                await caches.delete(cacheID);
            }
        } catch (error) {
            // Do nothing
        }
    }
}

async function _copyTempCacheToCurrentCache() {
    let currentTempCacheID = _getTempCacheID();

    try {
        let hasTempCache = await caches.has(currentTempCacheID);

        if (hasTempCache) {
            let currentTempCache = await caches.open(currentTempCacheID);
            let currentCache = await caches.open(_getCacheID());

            let currentTempCachedResourceRequests = await currentTempCache.keys();
            for (let currentTempCachedResourceRequest of currentTempCachedResourceRequests) {
                let currentTempCachedResource = await currentTempCache.match(currentTempCachedResourceRequest);
                await currentCache.put(currentTempCachedResourceRequest, currentTempCachedResource);
            }
        }
    } catch (error) {
        // Do nothing
    }

    let cachesIDs = await caches.keys();
    for (let cacheID of cachesIDs) {
        try {
            if (_shouldDeleteTempCacheID(cacheID)) {
                await caches.delete(cacheID);
            }
        } catch (error) {
            // Do nothing
        }
    }
}

// #endregion Service Worker Private Functions



// #region Service Worker Private Utils

function _shouldHandleRequest(request) {
    return request != null && request.url != null && request.method != null && request.method == "GET";
}

function _getCacheID(cacheVersion = _myCacheVersion) {
    return _myAppName + "_cache_v" + cacheVersion.toFixed(0);
}

function _getTempCacheID(cacheVersion = _myCacheVersion, serviceWorkerVersion = _myServiceWorkerVersion) {
    return _getCacheID(cacheVersion) + "_temp_v" + serviceWorkerVersion.toFixed(0);
}

function _isCacheID(cacheID) {
    let matchCacheID = new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName) + "_cache_v\\d+$");
    return cacheID.match(matchCacheID) != null;
}

function _isTempCacheID(tempCacheID) {
    let matchTempCacheID = new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName) + "_cache_v\\d+_temp_v\\d+$");
    return tempCacheID.match(matchTempCacheID) != null;
}

function _shouldDeleteCacheID(cacheID) {
    let deleteCacheID = false;

    let validCacheID = _isCacheID(cacheID);
    if (validCacheID) {
        let cacheIDWithoutAppName = cacheID.replace(new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName)), "");

        let versions = cacheIDWithoutAppName.match(new RegExp("(?<=_v)\\d+(?=_|$)", "g"));

        deleteCacheID = parseInt(versions[0]) < _myCacheVersion;
    }

    return deleteCacheID;
}

function _shouldDeleteTempCacheID(tempCacheID) {
    let deleteTempCacheID = false;

    let validTempCacheID = _isTempCacheID(tempCacheID);
    if (validTempCacheID) {
        let tempCacheIDWithoutAppName = tempCacheID.replace(new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName)), "");

        let versions = tempCacheIDWithoutAppName.match(new RegExp("(?<=_v)\\d+(?=_|$)", "g"));

        deleteTempCacheID =
            parseInt(versions[0]) < _myCacheVersion ||
            (parseInt(versions[0]) == _myCacheVersion && parseInt(versions[1]) <= _myServiceWorkerVersion);
    }

    return deleteTempCacheID;
}

// #endregion Service Worker Private Utils



// #region Cauldron Private Utils

function _shouldResourceURLBeIncluded(resourceURL, includeList, excludeList) {
    let includeResourseURL = false;
    for (let includeURL of includeList) {
        if (resourceURL.match(includeURL) != null) {
            includeResourseURL = true;
            break;
        }
    }

    if (includeResourseURL) {
        for (let excludeURL of excludeList) {
            if (resourceURL.match(excludeURL) != null) {
                includeResourseURL = false;
                break;
            }
        }
    }

    return includeResourseURL;
}

function _getCurrentLocation() {
    return self.location.href.slice(0, self.location.href.lastIndexOf("/"));
}

function _getCurrentOrigin() {
    return self.location.origin;
}

function _escapeRegexSpecialCharacters(regexToEscape) {
    let escapeSpecialCharacters = new RegExp("[/\\-\\\\^$*+?.()|[\\]{}]", "g");
    return regexToEscape.replace(escapeSpecialCharacters, "\\$&");
}

// #endregion Cauldron Private Utils