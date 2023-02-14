const CACHE = "app-cache-v1";

const files = [
    // This list can be created by looking at the list on the inspector app cache that is created after loading the app 2 times
    // On Chrome: Inspector -> Application -> Cache -> Cache Storage -> Your App Cache
    // Tvery file in the list with Response-Type = basic must be put here to make it work offline on the first load
    // The app will work offline even if this list is empty but will require it to be loaded 2 times, since the first only the files in this list
    // are actually precached
];

// This force using the cache first if the network is failing for cached resources
var forceTryCacheFirst = false;

self.addEventListener("install", evt => {
    evt.waitUntil(precache());
});

self.addEventListener("fetch", (event) => {
    event.respondWith(getResource(event.request, true));
});

async function precache() {
    let cache = await caches.open(CACHE);

    for (let file of files) {
        try {
            await cache.add(file);
        } catch (error) {
            console.error("Can't precache " + file);
        }
    }
}

// With tryCacheFirst you can specify if you want to first try the cache or always check the network for updates
// If cache is checked first, you could have an updated resources not being downloaded until cache is cleaned
async function getResource(request, tryCacheFirst = true, disableForceTryCacheFirst = false) {
    if (tryCacheFirst || (forceTryCacheFirst && !disableForceTryCacheFirst)) {
        // Try to get the resource from the cache
        const responseFromCache = await getFromCache(request.url);
        if (responseFromCache) {
            return responseFromCache;
        }
    }

    // Try to get the resource from the network
    try {
        const responseFromNetwork = await fetch(request);

        // response may be used only once
        // we need to save clone to put one copy in cache
        // and serve second one
        await putInCache(request, responseFromNetwork.clone());
        return responseFromNetwork;
    } catch (error) {
        if (!tryCacheFirst) {
            const responseFromCache = await getFromCache(request.url);
            if (responseFromCache) {
                if (!forceTryCacheFirst) {
                    console.error("Forcing cache first because of possible network issues");
                    forceTryCacheFirst = true;
                }

                return responseFromCache;
            }
        }

        // WLE use ? url params to make it so the bundle is not cached
        // but if network fails we can still try to use the cached one
        if (request.url != null) {
            let requestWithoutParamsURL = request.url.split("?")[0];

            const responseFromCacheWithoutParams = await getFromCache(requestWithoutParamsURL);
            if (responseFromCacheWithoutParams) {
                return responseFromCacheWithoutParams;
            }
        }

        return new Response("Network error happened", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
        });
    }
}

async function getFromCache(requestURL) {
    return await caches.match(requestURL);
}

async function putInCache(request, response) {
    // return if request is not GET
    if (request.method !== "GET") return;

    const cache = await caches.open(CACHE);
    await cache.put(request, response);
}
