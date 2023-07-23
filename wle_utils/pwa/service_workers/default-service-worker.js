// #region Service Worker Constants

let _EVERY_RESOURCE = [".*"];
let _NO_RESOURCE = [];

let _EVERY_RESOURCE_FROM_CURRENT_LOCATION = ["^" + _escapeRegexSpecialCharacters(_getCurrentLocation()) + ".*"];
let _EVERY_RESOURCE_FROM_CURRENT_ORIGIN = ["^" + _escapeRegexSpecialCharacters(_getCurrentOrigin()) + ".*"];

let _EVERY_LOCATION = [".*"];
let _NO_LOCATION = [];
let _LOCALHOST = ["localhost:8080"];

// #endregion Service Worker Constants



// #region Service Worker Setup

// #region BASE SETUP -----------------------------------------------------------------------------------------------------------



// The app name, used, for example, to identify the caches
//
// This should not be changed after u have released your app, since it could be used, for example, to look for previous caches
// It's not an issue if u change it, it will just not be able to clean previous caches or use them,
// since it will basically behave like a completely new service worker
let _myAppName = "app";



// U should increment this everytime u update the service worker, since it is used by some features to not collide
// with other service workers, especially during the installation and activation phases
//
// It must be an incremental integer greater than 0
let _myServiceWorkerVersion = 1;



// The cache version
//
// U can increment this when the previous cache is no longer valid due to some changes to your app,
// which might not be compatible anymore with the previous version and could create unpredictable behaviors,
// since u could get a mix of old (from the cache) and new (from the network) resources
//
// It must be an incremental integer greater than 0
let _myCacheVersion = 1;



// This is the list of the resources u want to precache, that means they will be cached on the first load,
// when the service worker is installing and can't catch the fetch events yet
//
// Properly filling this list can potentially make it so your app is ready to work offline on first load,
// otherwise it might require at least a second load, where the service worker will be able to actually catch
// the fetch events and cache the responses itself
// In general, u should precache at least every static resource u have in your app if u want to make it work offline after the first load
//
// The resources URLs can be relative to the service worker location, so, for example,
// for "https://signor-pipo.itch.io/assets/wondermelon.png" u can just specify "assets/wondermelon.png"
// The resources URLs can't be a regex in this case, since it needs to know the specific resource to fetch
let _myResourceURLsToPrecache = [];



// Which resources can be cached
// Note that, as of now, only requests made with a GET method can be cached
//
// The resources URLs can also be a regex
let _myPutInCacheResourceURLsToInclude = _EVERY_RESOURCE;
let _myPutInCacheResourceURLsToExclude = _NO_RESOURCE;



// Used to specify if you want to first try the cache or always check the network for updates
//
// The resources URLs can also be a regex
let _myTryCacheFirstResourceURLsToInclude = _NO_RESOURCE;
let _myTryCacheFirstResourceURLsToExclude = _NO_RESOURCE;



// If the request tries the cache first, this make it so the cache will be updated (even thought the old cached resource is returned)
// It's important to note that the updated changes will be available starting from the next page load
//
// Beware that this should not be used if the new resources might not be compatible with the old ones, since u could end up
// with a mix of both
// If this is the case, it's better to just increase the cache version, which will cache the new version from scratch
//
// The resources URLs can also be a regex
let _myUpdateCacheInBackgroundResourceURLsToInclude = _NO_RESOURCE;
let _myUpdateCacheInBackgroundResourceURLsToExclude = _NO_RESOURCE;



// If a service worker is being installed in one of these locations, it will be rejected
//
// This is especially useful to avoid using a service worker on development locations like "localhost"
//
// The locations URLs can also be a regex
let _myRejectServiceWorkerLocationURLsToInclude = _NO_LOCATION;
let _myRejectServiceWorkerLocationURLsToExclude = _NO_LOCATION;



// Enable some extra logs to better understand what's going on and why things might not be working
//
// Note that some of the logs, in particular the ones that just log once, will be logged anyway
//
// The resources URLs can also be a regex
let _myLogEnabledLocationURLsToInclude = _NO_LOCATION;
let _myLogEnabledLocationURLsToExclude = _NO_LOCATION;



// #endregion BASE SETUP --------------------------------------------------------------------------------------------------------



// #region ADVANCED SETUP -------------------------------------------------------------------------------------------------------



// Which resources can be fetched from the network
// Usually u should always allow every resource, but can be useful if u want to use a resource
// only if it was precached
//
// The resources URLs can also be a regex
let _myFetchFromNetworkAllowedResourceURLsToInclude = _EVERY_RESOURCE;
let _myFetchFromNetworkAllowedResourceURLsToExclude = _NO_RESOURCE;



// Which resources can be fetched from the cache
//
// Usually, this should just include every resource, since u can control the ones that are cached with @_myPutInCacheResourceURLsToInclude
// There are some cases where u might want to use this anyway
// For example, if u want to update the service worker to avoid fetching a specific resource, but do not want to update the cache version,
// since the resources have not been updated, u can use this to avoid fetching that specific resource,
// which could have been already cached by a previous service worker
//
// If u, at some point, update the cache version, u can remove the resource URL from here and exclude it directly from the cached ones
//
// The resources URLs can also be a regex
let _myFetchFromCacheAllowedResourceURLsToInclude = _EVERY_RESOURCE;
let _myFetchFromCacheAllowedResourceURLsToExclude = _NO_RESOURCE;



// If a network error happens on any request, this enables the force try cache first on network error feature
//
// The resources URLs can also be a regex
let _myEnableForceTryCacheFirstOnNetworkErrorResourceURLsToInclude = _NO_RESOURCE;
let _myEnableForceTryCacheFirstOnNetworkErrorResourceURLsToExclude = _NO_RESOURCE;



// If a network error happens on any request, this make it so
// that the cache will be tried first by default for these resources
// Useful as a fallback to avoid waiting for all the requests to fail and instead starting to use the cache
//
// The resources URLs can also be a regex
let _myForceTryCacheFirstOnNetworkErrorResourceURLsToInclude = _NO_RESOURCE;
let _myForceTryCacheFirstOnNetworkErrorResourceURLsToExclude = _NO_RESOURCE;



// This is a bit specific, but, for example, even if with wonderland u can cache the bundle.js file and the wonderland.min.js file,
// wonderland normally try to fetch it using URL params and the time of the deploy (possibly to force a cache reload for a new version)
//
// This make it so that u can't precache those files (even if they will be cached on the second load anyway),
// but since u can precache the bundle.js / wonderland.min.js anyway without URL params,
// if u put the bundle.js/wonderland.min.js URLs here, the service worker will try to look in the cache for the requested URL ignoring the URL params
//
// Beware that using this could make u use an old resource which might not be compatible with the new ones
// U should use this only when u know it would not make a difference to use the URL params or if the old resource
// is still ok to use and better than a network error
//
// If u want to use this just to fix the precache issue, but are afraid of the issues related to this feature,
// it might be better to just specify in the precache resource URL the URL params that u know will be used for that resource,
// if that is possible to know (for bundle.s / wonderland.min.js u just have to check out the index.html file)
//
// The resources URLs can also be a regex
let _myTryCacheIgnoringURLParamsResourceURLsToInclude = _NO_RESOURCE;
let _myTryCacheIgnoringURLParamsResourceURLsToExclude = _NO_RESOURCE;



// A vary header is used to specify that the resource might be different based on some factors,
// like if the resource is being requested from desktop or mobile
// This could prevent those resources to be retrieved from the cache, since the vary header of the request
// and the cached resource might not match
//
// If u are sure that this does not matter, u can use this to ignore the vary header
//
// The resources URLs can also be a regex
let _myTryCacheIgnoringVaryHeaderResourceURLsToInclude = _NO_RESOURCE;
let _myTryCacheIgnoringVaryHeaderResourceURLsToExclude = _NO_RESOURCE;



// This is the same as @_myTryCacheIgnoringURLParamsAsFallbackResourceURLsToInclude but as a fallback
// for when the requested URL can't be found in any other way
//
// One of the reasons to use @_myTryCacheIgnoringURLParamsAsFallbackResourceURLsToInclude instead of the fallback version,
// is that if u use it as fallback u first have to wait for the fetch to fail, while otherwise it can get it from the cache "instantly",
// even though it is unsafer, due to not even checking if a properly matching version could be fetched from the network
//
// The resources URLs can also be a regex
let _myTryCacheIgnoringURLParamsAsFallbackResourceURLsToInclude = _NO_RESOURCE;
let _myTryCacheIgnoringURLParamsAsFallbackResourceURLsToExclude = _NO_RESOURCE;



// This is the same as @_myTryCacheIgnoringVaryHeaderResourceURLsToInclude but as a fallback
// for when the requested URL can't be found in any other way
//
// One of the reasons to use @_myTryCacheIgnoringVaryHeaderResourceURLsToInclude instead of the fallback version,
// is that if u use it as fallback u first have to wait for the fetch to fail, while otherwise it can get it from the cache "instantly",
// even though it is unsafer, due to not even checking if a properly matching version could be fetched from the network
//
// The resources URLs can also be a regex
let _myTryCacheIgnoringVaryHeaderAsFallbackResourceURLsToInclude = _NO_RESOURCE;
let _myTryCacheIgnoringVaryHeaderAsFallbackResourceURLsToExclude = _NO_RESOURCE;



// Used to cache opaque responses
// Caching opaque responses can lead to a number of issues so use this with caution
// I also advise u to enable the cache update in background when caching opaque responses,
// so to avoid caching a bad opaque response forever
//
// The resources URLs can also be a regex
let _myPutInCacheAllowedForOpaqueResponsesResourceURLsToInclude = _NO_RESOURCE;
let _myPutInCacheAllowedForOpaqueResponsesResourceURLsToExclude = _NO_RESOURCE;



// Enable this to allow HEAD request to be handled by the service worker
//
// Note that HEAD requests are NOT cached, they will just check if there is a cached response that was made with a GET,
// and will return that response
// This means that the the returned response will actually have a body, even though HEAD request should not have it
//
// The resources URLs can also be a regex
let _myHandleHEADRequestsResourceURLsToInclude = _NO_RESOURCE;
let _myHandleHEADRequestsResourceURLsToExclude = _NO_RESOURCE;



// Enable this to allow HEAD request to update the cache in background after fetching from the cache
//
// Normally, only when a GET request fetches from the cache it will trigger a cache update in background,
// if @_myUpdateCacheInBackgroundResourceURLsToInclude is enabled for that resource
// This make it so that cached resources will be updated in background even for HEAD requests
//
// Note that the GET request to update the cache in background is created from the HEAD one through the following js code
//
// new Request(headRequest, { method: "GET" })
//
// This should be safe, but it could potentially create a slightly different GET request,
// which could create issues if cached
//
// Use this with caution
//
// The resources URLs can also be a regex
let _myUpdateCacheInBackgroundAllowedForHEADRequestsResourceURLsToInclude = _NO_RESOURCE;
let _myUpdateCacheInBackgroundAllowedForHEADRequestsResourceURLsToExclude = _NO_RESOURCE;



// Use this if u:
// - have updated your app
// - are trying cache first
// - do not feel the need to update the cache version since the new update is compatible with the previous version
// - would like the new resources to be available as soon as possible, without waiting for the cache to be updated in background
// or
// - u are not updating the cache in background, which would mean the new resources will never be fetched again
//
// This feature makes it so that when the new service worker is installed, these resources will not try the cache first
// until they have been fetched again from the network and cached with success
// Basically, this is a way to avoid trying the cache first as long as the resources have not been updated, but still give u
// the chance to use the cache if the fetch fails, since u are not updating the cache version
//
// In general, u should just update the cache version, but if just a few resources have been updated, u don't want
// to make the user wait for everything to be fetched again, and u want the new resources to be available as soon as possible,
// u might want to use this
//
// This is safe to use as long as the new resources are compatible with the current cached ones
//
// Beware that, until u increase the cache version, the included resource URLs should only "grow",
// because a user might be coming from an even older service worker version which still has the same cache version,
// and should therefore able to refetch every needed resources, not just the one changed between the current and the very last version
//
// When u update the cache version, u should instead clean this list
// This is not mandatory, but makes it easier to keep track of the resources that should actually be refetched since the last cache version update
//
// The resources URLs can also be a regex
let _myRefetchFromNetworkResourceURLsToInclude = _NO_RESOURCE;
let _myRefetchFromNetworkResourceURLsToExclude = _NO_RESOURCE;

// U should increment this everytime u want to make the service worker refetch all the resource URLs
// specified through @_myRefetchFromNetworkResourceURLsToInclude again
// Normally, the service worker keeps track of which resource have already been refetched,
// and, if u add some URLs to the list, will just refetch the new ones,
// but if u want the service worker to refetch every resource URL again, u have to increment the refetch version
//
// The complete refetch version is tied to the current cache, this means that every time the cache version is updated,
// it's also like updating the refetch version, which will not cause any issue anyway, since every resource needs to be fetched anyway
// when the cache version is updated
// This means, that, if u want, when updating the cache version u can reset the @_myRefetchFromNetworkVersion to 1
// 
//
// It must be an incremental integer greater than 0
let _myRefetchFromNetworkVersion = 1;



// If some resources must be precached for your service worker to work properly,
// u can specify them here so that the installation will fail if their precache fails
//
// When using this u should also enable @_myRejectServiceWorkerOnActivationFail, since a failure in the activation phase
// might mean that the resources u needed to be precached might not be available
// It is not automatically done since enabling it will make all the pages reload if the activation fails, and u might prefer
// to have a "precache error" than a page reload
//
// The resources URLs can also be a regex
let _myRejectServiceWorkerOnPrecacheFailResourceURLsToInclude = _NO_RESOURCE;
let _myRejectServiceWorkerOnPrecacheFailResourceURLsToExclude = _NO_RESOURCE;



// If the activation phase fail, normally the service worker is activated anyway
//
// Usually it's not an issue, but since the precached resources are actually made available during the activation phase,
// if it fails u might not have those resources precached
// This should not be an issue, since they will be cached anyway the first time they are fetched normally by your app,
// but if it's important that everything is properly precached, u can enable this to reject the service worker if an error happens
//
// Note that it should be very unlikely that the activation phase fails, but I can't say for sure it is impossible
//
// Another thing to note is that this will make every pages reload, because it's the only way I've found to actually reject
// the service worker on activation, which would control the page anyway otherwise
let _myRejectServiceWorkerOnActivationFail = false;



// The install phase might not have managed to precache every resource due to network errors
//
// Use this to check that the resoruces have been precached on the first fetch of the current service worker session
// If some resources have not been precached, a fetch request will be performed to cache them in background
let _myCheckResourcesHaveBeenPrecachedOnFirstFetch = false;



// If the service worker installation fails or do not manage to complete, for example because the tab is closed while installing,
// on the next page load the service worker will attempt to install again
//
// This make it so that the installation can recover from the last attempt, so that, for example, it will not fetch the data
// that was already fetched the last time and has been already cached in a temporary cache
//
// The main reason to disable this is because u want to be 100% sure that the data
// that will be precached belongs to the same version of your app, which might not be true if the precache happens at different time
// Note that this is useful only if u want to try the cache first and never update it in background, otherwise there is no point
// in being sure it's the same version, since the resources will be updated anyway
//
// Besides, even in that case, it might not be needed anyway, since with this setup u usually update the service worker version together with
// the app, which should install the new service worker instead of recovering from the previous one
// On this last thing though, I'm not sure about the actual flow of the service worker installation
// and if the previous one installation is actually aborted if a new one is found, or if the previous one can manage to complete
// If that can happen (and is not considered a bug), than this would prevent getting a mix of old and new resources
// Otherwise there is honestly no point in setting this to false
let _myRecoverInstallationFromLastAttempt = true;



// Usually a new service worker is activated when there are no more tabs using the previous one
// This generally happens if the user closes all the tabs or the browser (just refreshing the page does not seem to work)
//
// This flag make it so the service worker is immediately (as soon as possible) activated (without the need to refresh the page), but can cause issues
// due to the fact that the new service worker might be working with data fetched by the previous one in the same session
//
// Beside, when enabling this it would probably be better to also trigger a page reload
// To do this, the easiest way is to enable @_myReloadAllPagesOnServiceWorkerActivation
//
// If you instead want to have more control over the reload, for example to show a confirm dialog warning the user
// that the page will be reloaded, you can add the following js code to your app:
//
// window.navigator.serviceWorker?.addEventListener("controllerchange", function () {
//     window.location.reload();
// });
//
// Note that this js code should be put in your app so that it is executed as soon as possible (for example in the first lines of your index.html),
// so to avoid missing the controller change event
// To be as safe as possible, u should put this before the line where u register
// the service worker inside your app (window.navigator.serviceWorker.register)
//
// Be aware that the reload might happen while the user is using your app and not just at the beginning,
// which could be annoying (but I'm not sure what the chances are of this actually happening or how to reproduce it)
// Be also aware that this will make every opened page related to this service worker reload, not just the current focused one!
//
// As u can see, handling a service worker activation is a complex topic!
// You might want to look on the internet for solutions that best fit your needs,
// like, for example, asking the user if they want to reload or not
//
// Use this with caution
let _myImmediatelyActivateNewServiceWorker = false;

// Normally, a service worker can activate itself only when there is no page left currently using the old one
// This means that it's not important to use this normally, because it would not do anything
//
// This is mostly useful when used in combo with @_myImmediatelyActivateNewServiceWorker since it will make it so
// the pages are reloaded when the new service worker is activated
//
// U might also enable this anyway just to be sure that every time a new service worker is activated every page is reloaded,
// but do this only if u know what u are doing
//
// Note that this will only make the page reload if it was already controlled by a service worker
let _myReloadAllPagesOnServiceWorkerActivation = false;



// When a page is not controlled (usually on the first load), even though the service worker is activated
// it does not actually starts to control the page until it's loaded again,
// since a service worker has to take care of a page from the start
//
// This make it so that the service worker will immediately (as soon as possible) take control over the pages,
// even when they were not being controlled yet (which basically means that they will be controlled even on the first load)
//
// There might also be another edge case where one of the pages might have an older service worker controlling it,
// which should only happen if u manually unregister it on a page and reload it, but the others are not reloaded
// This will make the new service worker control those pages too
// This might not be intended, and u might only would like to do this only for uncontrolled pages, 
// but sadly I don't know if there is a way to achieve that, and this is just an edge case which should be very unlikely to happen
//
// As for @_myImmediatelyActivateNewServiceWorker, this can potentially cause issues
// due to the fact that the service worker might be fetching the data in a different way compared to not having it,
// and the page fetched at least a bit of data without the service worker, since it was started as soon as possible, but not
// from the beginning
//
// The advantages of using this are:
// 1. If the page goes offline on the first load and u need to fetch data, the service worker can already try to use the cache
// 2. The service worker can already cache some data on first load, which might be hard (if not impossible) to precache otherwise
//    This is kind of useful, but not reliable, so u still have to properly fill the precache resource URL list yourself if u want your app
//    to work offline even after the first load
//
// If u want to be 100% sure, u can always add the same js code used for @_myImmediatelyActivateNewServiceWorker to reload the page
// when a new service worker takes control of the page, but, in this case, it will reload the page 100% even for the very first load,
// which is annoying but is also what u are trying to achieve with it in this case
//
// window.navigator.serviceWorker?.addEventListener("controllerchange", function () {
//     window.location.reload();
// });
//
// If u don't feel the need to reload the page if it was not initially controlled (and don't want to make the page reload everytime on first load),
// but still would like to enable @_myImmediatelyActivateNewServiceWorker,
// and would like to reload the page when a new service worker is activated,
// u need to specify a different js code to reload the page,
// so to avoid reloading it when it was not initially controlled
//
// let isBeingControlled = window.navigator.serviceWorker?.controller != null;
// window.navigator.serviceWorker?.addEventListener("controllerchange", function () {
//     if (isBeingControlled) {
//         window.location.reload();
//     } else {
//         isBeingControlled = true;
//     }
// });
//
// Note that this js code should be put in your app so that it is executed as soon as possible (for example in the first lines of your index.html),
// so to avoid missing the controller change event
// To be as safe as possible, u should put this before the line where u register
// the service worker inside your app (window.navigator.serviceWorker.register)
//
// Be aware that the reload might happen while the user is using your app and not just at the beginning,
// which could be annoying (but I'm not sure what the chances are of this actually happening or how to reproduce it)
// Be also aware that this will make every opened page related to this service worker reload, not just the current focused one!
//
// As u can see, again, handling a service worker activation is a complex topic!
// You might want to look on the internet for solutions that best fit your needs,
// like, for example, asking the user if they want to reload or not
//
// Use this with caution
let _myImmediatelyTakeControlOfAllPages = false;

// This will reload every page that the service worker will start to control due to @_myImmediatelyTakeControlOfAllPages
//
// The reason why there is not just one variable for this, that is @_myReloadAllPagesOnServiceWorkerActivation, is because this way
// u can decide if u want to reload even pages that were not previously controlled by any service worker or not
//
// This is due to the fact that @_myReloadAllPagesOnServiceWorkerActivation can only reload pages already controlled, while
// this flag let you also reload the pages that will be controlled thanks to @ _myImmediatelyTakeControlOfAllPages
let _myReloadAllPagesAfterImmediatelyTakingControlOfThem = false;



// Normally, every service worker (defined by its version) works on its own temp data, for example when
// installing or activating
// This make it so there is no collision between service workers
//
// The downside is that, if u keep updating the service worker, a user might find themselves having to get every resource from scratch,
// because the new service worker can't resume from where the previous service worker left
// Enabling this make this possible, at least when the temp data is actually compatible (for example the cache version is the same),
// which will result in avoiding getting from the network some precache resource which was already being partially fetched by a previous service worker
//
// In general, I don't think it should cause too many issues, but I'm not sure about the actual flow of service workers regarding the
// installation and activation phases, and there might be issues if 2 service workers are installing at the same time, or one is activating
// while another is installing, and they share temp data
//
// This is actually useful only if u are updating your service worker very often, otherwise it's not worth the risk
//
// Use this with caution
let _myInstallationTemporaryDataSharingEnabled = false;



// #endregion ADVANCED SETUP ----------------------------------------------------------------------------------------------------

// #endregion Service Worker Setup



// #region Known Issues
//
// - If a service worker only partially manage to cache the data (both during precache or normal fetch phase),
//   and u update both your app and the service worker (to clean the current cache and build a new one),
//   while the new service worker install itself the current service worker might start to use the new data while serving
//   some of the current cached one too, mixing the 2 versions
//   As soon as the new service worker is activated the app will be fixed, so it's not permanent, but in the meantime u could have errors
//   in your app due to this
//   You should not worry too much about this tho, since it should not be an issue happening often, especially if you are not
//   updating your app every other day, and also eventually fix itself
//
//   The easiest way to avoid having this, if u are really worried about it, is to have an empty @_myResourceURLsToPrecache list,
//   so to complete the install as fast as possible, and enable @_myImmediatelyActivateNewServiceWorker and @_myReloadAllPagesOnServiceWorkerActivation
//   This will basically switch to the new service worker as soon as possible, therefore fetching the new version of your app
//
//   If u instead care about precaching, an idea would be to find out that a new service worker is trying to install inside your app code,
//   and "block" your app (possibly displaying a banner saying that the new version is been downloaded) until the installation has been completed
//   U should also enable @_myImmediatelyActivateNewServiceWorker and @_myReloadAllPagesOnServiceWorkerActivation
//   I honestly think this would be an overkill unless it's really important, for example for a multiplayer experience where a glitch could give an advantage
//
//   // This should be done before window.navigator.serviceWorker.register
//   window.navigator.serviceWorker?.getRegistration().then(function (registration) {
//      if(registration != null) {
//          registration.addEventListener("updatefound", function () {
//              // Block your app, when the new service worker will finish install the controller change event
//              // will then make your page reload
//              // Check @_myImmediatelyActivateNewServiceWorker to see how u can reload the page on controller change
//          });
//      }
//   });
//
//   Another solution, if u want to precache, is to unregister the current service worker when a new one is trying to install and reload the page
//   The main difference here is that u don't have to wait for the new service worker to complete, since, by unregistering the current service worker,
//   on reload u will get the new data immediately, while the new service worker is installing
//
//   // This should be done before window.navigator.serviceWorker.register
//   // I'm not 100% sure about the behavior of the unregister function, so use this with caution, even though it seems to work
//   window.navigator.serviceWorker?.getRegistration().then(function (registration) {
//      if(registration != null) {
//          registration.addEventListener("updatefound", function () {
//              registration.unregister().then(function () {
//                  window.location.reload();
//              });
//          });
//      }
//   });
//
//   Yet another solution would be to disable @_myRecoverInstallationFromLastAttempt (or at least disable @_myInstallationTemporaryDataSharingEnabled),
//   and enable @_myRejectServiceWorkerOnPrecacheFailResourceURLsToInclude on every resource, then disable @_myFetchFromCacheAllowedResourceURLsToInclude for every resource
//   that has been precached, so that there is no way they will be fetched again, and, as last, enable @_myRejectServiceWorkerOnActivationFail, so that only when
//   even the activation phase is properly completed the service worker can actually start
//   This will make it so that, only when all the precached resources have been precached during the same session, the service worker is activated
//   If all the cachable resources (or at least the core ones) are in the precache list, and the fetch from network is disabled for those resources,
//   then your app will not be updated until a new service worker is activated
//   This will make your app basically feel like an offline app that needs to be installed more than a web page, even though, if the service worker fails
//   your app will still be able to run by fetching from the network, but of course every resource will be the latest one in that case
//
//   As last, if u want to make your app work only when controlled by a service worker, u can check that
//   window.navigator.serviceWorker?.controller != null, and display a dialog saying your app is installing otherwise, preventing your
//   app from being used in the meantime
//   U will also have to enable @_myImmediatelyTakeControlOfAllPages, and either enable @_myReloadAllPagesAfterImmediatelyTakingControlOfThem,
//   or reload on controller change yourself (check @_myImmediatelyActivateNewServiceWorker to see how u can reload the page on controller change)
//   Since the installation might fail, u should also check every X seconds if the registration does actually contain a controller,
//   and display that the installation failed otherwise
//
//   let serviceWorkerInstallResults = { installing: false, installFailed: window.navigator.serviceWorker == null };
//
//   window.navigator.serviceWorker?.register("service-worker.js").then(function () {
//       serviceWorkerInstallResults.installing = true;
//   }).catch(function () {
//       serviceWorkerInstallResults.installFailed = true;
//   });
//
//   ...
//
//   // Every X seconds perform these checks
//
//   window.navigator.serviceWorker?.getRegistration().then(function (registration) {
//       if (serviceWorkerInstallResults.installing) {
//           if (registration != null) {
//               serviceWorkerInstallResults.installFailed = true;
//           }
//       }
//   });
//
//   if (serviceWorkerInstallResults.installFailed) {
//       // Display a dialog saying the installation failed and reload or whatever u prefer
//   } else if (window.navigator.serviceWorker?.controller == null) {
//       // Display a dialog saying the installation is in progress
//   } else {
//       // Display a dialog saying the app has been installed and reload the page or whatever u prefer
//   }
//
//   As always, this is just an example to give u an idea on how to achieve that, and u might have to adjust this to your needs
//   
//   A thing to note is that u might think that if u always fetch first from the network, or update the cache in background,
//   u should not have this issue, but this is not correct
//   For example, even if u always fetch from network first and u might manage to fetch new resources,
//   u might also fail to fetch some of them (due to network issue for example), fallbacking to the cache,
//   resulting in a mix of old and new resources
//   This means that, if u want to be sure to not have this issue, even when u are using these kinds of setups u have to use one of the above solutions,
//   or another one that better fits your needs
//
//   I'm also not sure if the browser own cache can also mess up with this and serve an older resource when fetching it from network
//   I don't know how u could handle this case or if it is even something to worry about, but the issue here is that even when installing a new service worker
//   and precaching the new resources, if a resource is fetched from the browser cache the service worker will think it's the latest one, even though it's not,
//   leading to a mix of old and new resources
//   It seems like the service worker fetch actually bypass the browser cache, so it should not be an issue, but I'm not 100% sure about it
//   Beside, I don't know if there could also be other things intercepting your network request, like the service hosting your app,
//   which could use their own cache to serve you the resources u are trying to fetch
//   I'm not sure if this is even possible, but if it was, this would mean that, even if the service worker can actually 
//   bypass the browser cache, something else might give u a cached resource anyway
//
//   As u can see, this is a complex issue, so if for u this is really important I advise u to also do your own research on this topic,
//   and use this more as a starting point than an actual complete solution to your problem
//
// #endregion Known Issues






// #region Service Worker Variables

let _myCheckResourcesHaveBeenPrecachedOnFirstFetchPerformed = false; // As of now this is not reset on page reload, but only when using a new tab

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
    event.respondWith(_fetchFromServiceWorker(event.request));
});

// #endregion Service Worker Events



// #region Service Worker Functions

async function _install() {
    let rejectServiceWorker = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myRejectServiceWorkerLocationURLsToInclude, _myRejectServiceWorkerLocationURLsToExclude);
    if (rejectServiceWorker) {
        throw new Error("The service worker is not allowed to be installed on the current location: " + _getCurrentLocation());
    }

    await _cacheResourcesToPrecache(true, true, true);

    if (_myImmediatelyActivateNewServiceWorker) {
        self.skipWaiting();
    }
}

async function _activate() {
    try {
        await _copyTempCacheToCurrentCache();

        await _copyTempRefetchFromNetworkChecklistToCurrentRefetchFromNetworkChecklist();

        await _deletePreviousCaches();

        await _deletePreviousRefetchFromNetworkChecklists();

        if (_myReloadAllPagesOnServiceWorkerActivation) {
            let clients = await self.clients.matchAll();
            clients.forEach(client => client.navigate(client.url));
        }

        if (_myImmediatelyTakeControlOfAllPages) {
            self.clients.claim();

            if (_myReloadAllPagesAfterImmediatelyTakingControlOfThem) {
                let clients = await self.clients.matchAll();
                clients.forEach(client => client.navigate(client.url));
            }
        }
    } catch (error) {
        if (_myRejectServiceWorkerOnActivationFail) {
            // #WARNING This should unregister the current service worker and reload all the pages, but I'm not
            // 100% this will actually make sure that this service worker will not be used
            // Sadly, I've not found a more reliable way to remove the service worker during the activation phase
            //
            // It also seems to be a bug in the service worker itself
            // It is easy to repro on Chrome, u just have to open two tabs controlled by the same service worker, open the inspector,
            // unregister the service worker and just reload one of the page
            // Even if the service worker was tagged as deleted, it seems that, since a page was still controlled by it,
            // when the other page is reloaded the service worker is "resurrected", which should not happen for what I can understand
            //
            // By reloading all the pages at the same time this seems to not happen, but I'm not sure if a slight delay in the reloads could
            // make this bug happen anyway

            let clients = await self.clients.matchAll();
            await self.registration.unregister();
            clients.forEach(client => client.navigate(client.url));

            console.error("An error occurred while activating the service worker");
        }
    }
}

async function _fetchFromServiceWorker(request) {
    try {
        if (_myCheckResourcesHaveBeenPrecachedOnFirstFetch && !_myCheckResourcesHaveBeenPrecachedOnFirstFetchPerformed) {
            _myCheckResourcesHaveBeenPrecachedOnFirstFetchPerformed = true;
            _cacheResourcesToPrecache(false, false, false); // Do not await for this, just do it in background
        }

        if (!_shouldHandleRequest(request)) {
            return fetch(request);
        }

        let cacheAlreadyTried = false;

        let refetchFromNetwork = await _shouldResourceBeRefetchedFromNetwork(request.url);
        let fetchFromCacheAllowed = _shouldResourceURLBeIncluded(request.url, _myFetchFromCacheAllowedResourceURLsToInclude, _myFetchFromCacheAllowedResourceURLsToExclude);

        if (!refetchFromNetwork && fetchFromCacheAllowed) {
            let tryCacheFirst = _shouldResourceURLBeIncluded(request.url, _myTryCacheFirstResourceURLsToInclude, _myTryCacheFirstResourceURLsToExclude);
            let forceTryCacheFirstOnNetworkError = _myForceTryCacheFirstOnNetworkErrorEnabled && _shouldResourceURLBeIncluded(request.url, _myForceTryCacheFirstOnNetworkErrorResourceURLsToInclude, _myForceTryCacheFirstOnNetworkErrorResourceURLsToExclude);

            if (tryCacheFirst || forceTryCacheFirstOnNetworkError) {
                cacheAlreadyTried = true;

                // Try to get the resource from the cache
                let ignoreURLParams = _shouldResourceURLBeIncluded(request.url, _myTryCacheIgnoringURLParamsResourceURLsToInclude, _myTryCacheIgnoringURLParamsResourceURLsToExclude);
                let ignoreVaryHeader = _shouldResourceURLBeIncluded(request.url, _myTryCacheIgnoringVaryHeaderResourceURLsToInclude, _myTryCacheIgnoringVaryHeaderResourceURLsToExclude);
                let responseFromCache = await _fetchFromCache(request.url, ignoreURLParams, ignoreVaryHeader);
                if (responseFromCache != null) {
                    let updateCacheInBackground = _shouldResourceURLBeIncluded(request.url, _myUpdateCacheInBackgroundResourceURLsToInclude, _myUpdateCacheInBackgroundResourceURLsToExclude);
                    if (updateCacheInBackground) {
                        let updateCacheInBackgroundAllowedForHEADRequests = _shouldResourceURLBeIncluded(request.url, _myUpdateCacheInBackgroundAllowedForHEADRequestsResourceURLsToInclude, _myUpdateCacheInBackgroundAllowedForHEADRequestsResourceURLsToExclude);
                        if (request.method == "GET" || (request.method == "HEAD" && updateCacheInBackgroundAllowedForHEADRequests)) {
                            if (request.method == "GET") {
                                _fetchFromNetworkAndPutInCache(request);
                            } else if (request.method == "HEAD") {
                                _fetchFromNetworkAndPutInCache(new Request(request, { method: "GET" }));
                            }
                        }
                    }

                    return responseFromCache;
                }
            }
        }

        // Try to get the resource from the network
        let [responseFromNetwork, responseHasBeenCached] = await _fetchFromNetworkAndPutInCache(request, true, refetchFromNetwork);
        if (_isResponseOk(responseFromNetwork) || _isResponseOpaque(responseFromNetwork)) {
            return responseFromNetwork;
        } else {
            if (!_myForceTryCacheFirstOnNetworkErrorEnabled) {
                let enableForceTryCacheFirstOnNetworkError = _shouldResourceURLBeIncluded(request.url, _myEnableForceTryCacheFirstOnNetworkErrorResourceURLsToInclude, _myEnableForceTryCacheFirstOnNetworkErrorResourceURLsToExclude);
                if (enableForceTryCacheFirstOnNetworkError) {
                    _myForceTryCacheFirstOnNetworkErrorEnabled = true;

                    let logEnabled = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myLogEnabledLocationURLsToInclude, _myLogEnabledLocationURLsToExclude);
                    if (logEnabled) {
                        console.warn("Force try cache on network error enabled");
                    }
                }
            }

            if (fetchFromCacheAllowed) {
                if (!cacheAlreadyTried) {
                    let ignoreURLParams = _shouldResourceURLBeIncluded(request.url, _myTryCacheIgnoringURLParamsResourceURLsToInclude, _myTryCacheIgnoringURLParamsResourceURLsToExclude);
                    let ignoreVaryHeader = _shouldResourceURLBeIncluded(request.url, _myTryCacheIgnoringVaryHeaderResourceURLsToInclude, _myTryCacheIgnoringVaryHeaderResourceURLsToExclude);
                    let responseFromCache = await _fetchFromCache(request.url, ignoreURLParams, ignoreVaryHeader);
                    if (responseFromCache != null) {
                        return responseFromCache;
                    }
                }

                let ignoreURLParamsAsFallback = _shouldResourceURLBeIncluded(request.url, _myTryCacheIgnoringURLParamsAsFallbackResourceURLsToInclude, _myTryCacheIgnoringURLParamsAsFallbackResourceURLsToExclude);
                let ignoreVaryHeaderAsFallback = _shouldResourceURLBeIncluded(request.url, _myTryCacheIgnoringVaryHeaderAsFallbackResourceURLsToInclude, _myTryCacheIgnoringVaryHeaderAsFallbackResourceURLsToExclude);
                if (ignoreURLParamsAsFallback || ignoreVaryHeaderAsFallback) {
                    let fallbackResponseFromCache = await _fetchFromCache(request.url, ignoreURLParamsAsFallback, ignoreVaryHeaderAsFallback);
                    if (fallbackResponseFromCache != null) {
                        let logEnabled = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myLogEnabledLocationURLsToInclude, _myLogEnabledLocationURLsToExclude);
                        if (logEnabled) {
                            console.warn("Get from cache using a fallback: " + request.url);
                        }

                        return fallbackResponseFromCache;
                    }
                }
            }

            // If everything else fail, return the response from the network
            return responseFromNetwork;
        }
    } catch (error) {
        let errorMessage = "An error occurred while trying to fetch from the service worker: " + request.url + "\n\n" + error;
        let responseFromServiceWorker = new Response(errorMessage, {
            status: 500,
            headers: { "Content-Type": "text/plain" }
        });

        try {
            let logEnabled = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myLogEnabledLocationURLsToInclude, _myLogEnabledLocationURLsToExclude);
            if (logEnabled) {
                console.error(errorMessage);
            }
        } catch (error) {
            // Do nothing
        }

        return responseFromServiceWorker;
    }
}

async function _fetchFromNetworkAndPutInCache(request, awaitOnlyFetchFromNetwork = false, refetchFromNetwork = false, useTemps = false, fetchFromNetworkAllowedOverride = null) {
    let responseFromNetwork = await _fetchFromNetwork(request, fetchFromNetworkAllowedOverride);
    let responseHasBeenCached = false;

    if (_isResponseOk(responseFromNetwork) || _isResponseOpaque(responseFromNetwork)) {
        if (_shouldResourceBeCached(request, responseFromNetwork)) {
            if (!awaitOnlyFetchFromNetwork) {
                responseHasBeenCached = await _putInCache(request, responseFromNetwork, useTemps);

                if (refetchFromNetwork) {
                    await _tickOffFromRefetchFromNetworkChecklist(request.url, useTemps);
                }
            } else {
                _putInCache(request, responseFromNetwork, useTemps).then(function (putInCacheSucceeded) {
                    if (putInCacheSucceeded && refetchFromNetwork) {
                        _tickOffFromRefetchFromNetworkChecklist(request.url, useTemps);
                    }
                });

                responseHasBeenCached = null; // Not awaiting so we can't know
            }
        }
    }

    return [responseFromNetwork, responseHasBeenCached];
}

async function _fetchFromNetwork(request, fetchFromNetworkAllowedOverride = null) {
    let responseFromNetwork = null;

    try {
        let fetchFromNetworkAllowed = _shouldResourceURLBeIncluded(request.url, _myFetchFromNetworkAllowedResourceURLsToInclude, _myFetchFromNetworkAllowedResourceURLsToExclude);
        if ((fetchFromNetworkAllowed && fetchFromNetworkAllowedOverride == null) || (fetchFromNetworkAllowedOverride != null && fetchFromNetworkAllowedOverride)) {
            responseFromNetwork = await fetch(request);
        } else {
            throw new Error("Fetch from network is not allowed: " + request.url);
        }
    } catch (error) {
        let errorMessage = "An error occurred while trying to fetch from the network: " + request.url + "\n\n" + error;
        responseFromNetwork = new Response(errorMessage, {
            status: 500,
            headers: { "Content-Type": "text/plain" }
        });

        let logEnabled = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myLogEnabledLocationURLsToInclude, _myLogEnabledLocationURLsToExclude);
        if (logEnabled) {
            console.error(errorMessage);
        }
    }

    return responseFromNetwork;
}

async function _fetchFromCache(resourceURL, ignoreURLParams = false, ignoreVaryHeader = false) {
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

        let logEnabled = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myLogEnabledLocationURLsToInclude, _myLogEnabledLocationURLsToExclude);
        if (logEnabled) {
            console.error("An error occurred while trying to get from the cache: " + resourceURL);
        }
    }

    return responseFromCache;
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

        let logEnabled = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myLogEnabledLocationURLsToInclude, _myLogEnabledLocationURLsToExclude);
        if (logEnabled) {
            console.error("An error occurred while trying to put the response in the cache: " + request.url);
        }
    }

    return putInCacheSucceeded;
}

async function _cacheResourcesToPrecache(allowRejectOnPrecacheFail = true, useTemps = false, installPhase = false) {
    if (_getResourceURLsToPrecache().length == 0) return;

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
        if (installPhase && !_myRecoverInstallationFromLastAttempt) {
            // Explicitly not try catching this to make install fail if it can't be deleted

            let tempCacheID = _getTempCacheID();
            let tempCacheExists = await caches.has(tempCacheID);
            let tempCacheDeleted = await caches.delete(tempCacheID);

            let tempRefetchFromNetworkChecklistID = _getTempRefetchFromNetworkChecklistID();
            let tempRefetchFromNetworkChecklistExists = await caches.has(tempRefetchFromNetworkChecklistID);
            let tempRefetchFromNetworkChecklistDeleted = await caches.delete(tempRefetchFromNetworkChecklistID);

            if ((tempCacheExists && !tempCacheDeleted) || (tempRefetchFromNetworkChecklistExists && !tempRefetchFromNetworkChecklistDeleted)) {
                throw new Error("An error occured while trying to delete the temporary data during the installation phase");
            }
        }

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
    for (let resourceURLToPrecache of _getResourceURLsToPrecache()) {
        let resourceCompleteURLToPrecache = new Request(resourceURLToPrecache).url;

        promisesToAwait.push(new Promise(async function (resolve, reject) {
            let resourceHasBeenPrecached = false;

            try {
                let resourceHaveToBeCached = false;

                let refetchFromNetwork = await _shouldResourceBeRefetchedFromNetwork(resourceCompleteURLToPrecache, useTemps);

                if (refetchFromNetwork) {
                    resourceHaveToBeCached = true
                } else {
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
                }

                if (resourceHaveToBeCached) {
                    let [responseFromNetwork, responseHasBeenCached] = await _fetchFromNetworkAndPutInCache(new Request(resourceCompleteURLToPrecache), false, refetchFromNetwork, useTemps, installPhase);
                    resourceHasBeenPrecached = responseHasBeenCached;
                } else {
                    resourceHasBeenPrecached = true; // The resource has been already precached
                }
            } catch (error) {
                let logEnabled = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myLogEnabledLocationURLsToInclude, _myLogEnabledLocationURLsToExclude);
                if (logEnabled) {
                    console.error("Failed to fetch resource to precache: " + resourceCompleteURLToPrecache);
                }
            }

            if (resourceHasBeenPrecached || !allowRejectOnPrecacheFail) {
                resolve();
            } else {
                let rejectServiceWorkerOnPrecacheFail = _shouldResourceURLBeIncluded(resourceCompleteURLToPrecache, _myRejectServiceWorkerOnPrecacheFailResourceURLsToInclude, _myRejectServiceWorkerOnPrecacheFailResourceURLsToExclude);

                if (!rejectServiceWorkerOnPrecacheFail) {
                    resolve();
                } else {
                    reject("Failed to fetch resource to precache: " + resourceCompleteURLToPrecache);
                }
            }
        }));
    }

    await Promise.all(promisesToAwait);
}

async function _deletePreviousCaches() {
    try {
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
    } catch (error) {
        // Do nothing
    }
}

async function _tickOffFromRefetchFromNetworkChecklist(resourceURL, useTempRefetchFromNetworkChecklist = false) {
    try {
        let refetechChecklistID = (useTempRefetchFromNetworkChecklist) ? _getTempRefetchFromNetworkChecklistID() : _getRefetchFromNetworkChecklistID();
        let refetchChecklist = await caches.open(refetechChecklistID);
        await refetchChecklist.put(new Request(resourceURL), new Response(null));
    } catch (error) {
        let logEnabled = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myLogEnabledLocationURLsToInclude, _myLogEnabledLocationURLsToExclude);
        if (logEnabled) {
            console.error("An error occurred while trying to put the response in the cache: " + request.url);
        }
    }
}

async function _deletePreviousRefetchFromNetworkChecklists() {
    try {
        let cachesIDs = await caches.keys();

        for (let cacheID of cachesIDs) {
            try {
                if (_shouldDeleteRefetchFromNetworkChecklistID(cacheID)) {
                    await caches.delete(cacheID);
                }
            } catch (error) {
                // Do nothing
            }
        }
    } catch (error) {
        // Do nothing
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
                try {
                    let currentTempCachedResource = await currentTempCache.match(currentTempCachedResourceRequest);
                    await currentCache.put(currentTempCachedResourceRequest, currentTempCachedResource);
                } catch (error) {
                    if (_myRejectServiceWorkerOnActivationFail) {
                        throw error;
                    }
                }
            }
        }
    } catch (error) {
        if (_myRejectServiceWorkerOnActivationFail) {
            throw error;
        }
    }

    try {
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
    } catch (error) {
        // Do nothing
    }
}

async function _copyTempRefetchFromNetworkChecklistToCurrentRefetchFromNetworkChecklist() {
    let currentTempRefetchFromNetworkChecklistID = _getTempRefetchFromNetworkChecklistID();

    try {
        let hasTempRefetchFromNetworkChecklist = await caches.has(currentTempRefetchFromNetworkChecklistID);
        if (hasTempRefetchFromNetworkChecklist) {
            let currentTempRefetchFromNetworkChecklist = await caches.open(currentTempRefetchFromNetworkChecklistID);
            let currentRefetchFromNetworkChecklist = await caches.open(_getRefetchFromNetworkChecklistID());

            let currentTempRefetchFromNetworkChecklistResourceRequests = await currentTempRefetchFromNetworkChecklist.keys();
            for (let currentTempRefetchFromNetworkChecklistResourceRequest of currentTempRefetchFromNetworkChecklistResourceRequests) {
                try {
                    let currentTempRefetchFromNetworkChecklistResource = await currentTempRefetchFromNetworkChecklist.match(currentTempRefetchFromNetworkChecklistResourceRequest);
                    await currentRefetchFromNetworkChecklist.put(currentTempRefetchFromNetworkChecklistResourceRequest, currentTempRefetchFromNetworkChecklistResource);
                } catch (error) {
                    if (_myRejectServiceWorkerOnActivationFail) {
                        throw error;
                    }
                }
            }
        }
    } catch (error) {
        if (_myRejectServiceWorkerOnActivationFail) {
            throw error;
        }
    }

    try {
        let cachesIDs = await caches.keys();
        for (let cacheID of cachesIDs) {
            try {
                if (_shouldDeleteTempRefetchFromNetworkChecklistID(cacheID)) {
                    await caches.delete(cacheID);
                }
            } catch (error) {
                // Do nothing
            }
        }
    } catch (error) {
        // Do nothing
    }
}

function _getResourceURLsToPrecache() {
    return _myResourceURLsToPrecache;
}

// #endregion Service Worker Functions



// #region Service Worker Utils

function _isResponseOk(response) {
    return response != null && response.status == 200;
}

function _isResponseOpaque(response) {
    return response != null && response.status == 0 && response.type.includes("opaque");
}

function _shouldResourceBeCached(request, response) {
    let cacheResource = _shouldResourceURLBeIncluded(request.url, _myPutInCacheResourceURLsToInclude, _myPutInCacheResourceURLsToExclude);
    let cacheResourceWithOpaqueResponseAllowed = _shouldResourceURLBeIncluded(request.url, _myPutInCacheAllowedForOpaqueResponsesResourceURLsToInclude, _myPutInCacheAllowedForOpaqueResponsesResourceURLsToExclude);
    return cacheResource && (request.method == "GET" && (_isResponseOk(response) || (cacheResourceWithOpaqueResponseAllowed && _isResponseOpaque(response))));
}

function _shouldHandleRequest(request) {
    let handleHEADRequest = _shouldResourceURLBeIncluded(request.url, _myHandleHEADRequestsResourceURLsToInclude, _myHandleHEADRequestsResourceURLsToExclude);
    return request != null && request.url != null && request.method != null &&
        (request.method == "GET" || (handleHEADRequest && request.method == "HEAD"));
}

function _getCacheID(cacheVersion = _myCacheVersion) {
    return _myAppName + "_cache_v" + cacheVersion.toFixed(0);
}

function _getTempCacheID(cacheVersion = _myCacheVersion, serviceWorkerVersion = _myServiceWorkerVersion) {
    serviceWorkerVersion = (_myInstallationTemporaryDataSharingEnabled && _myRecoverInstallationFromLastAttempt) ? 0 : serviceWorkerVersion;
    return _getCacheID(cacheVersion) + "_temp_v" + serviceWorkerVersion.toFixed(0);
}

function _getRefetchFromNetworkChecklistID(cacheVersion = _myCacheVersion, refetchFromNetworkVersion = _myRefetchFromNetworkVersion) {
    return _getCacheID(cacheVersion) + "_refetch_checklist_v" + refetchFromNetworkVersion.toFixed(0);
}

function _getTempRefetchFromNetworkChecklistID(cacheVersion = _myCacheVersion, refetchFromNetworkVersion = _myRefetchFromNetworkVersion, serviceWorkerVersion = _myServiceWorkerVersion) {
    serviceWorkerVersion = (_myInstallationTemporaryDataSharingEnabled && _myRecoverInstallationFromLastAttempt) ? 0 : serviceWorkerVersion;
    return _getRefetchFromNetworkChecklistID(cacheVersion, refetchFromNetworkVersion) + "_temp_v" + serviceWorkerVersion.toFixed(0);
}

function _isCacheID(cacheID) {
    let matchCacheID = new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName) + "_cache_v\\d+$");
    return cacheID.match(matchCacheID) != null;
}

function _isTempCacheID(tempCacheID) {
    let matchTempCacheID = new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName) + "_cache_v\\d+_temp_v\\d+$");
    return tempCacheID.match(matchTempCacheID) != null;
}

function _isRefetchFromNetworkChecklistID(refetchFromNetworkChecklistID) {
    let matchRefetchFromNetworkChecklistID = new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName) + "_cache_v\\d+_refetch_checklist_v\\d+$");
    return refetchFromNetworkChecklistID.match(matchRefetchFromNetworkChecklistID) != null;
}

function _isTempRefetchFromNetworkChecklistID(tempRefetchFromNetworkChecklistID) {
    let matchRefetchFromNetworkChecklistID = new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName) + "_cache_v\\d+_refetch_checklist_v\\d+_temp_v\\d+$");
    return tempRefetchFromNetworkChecklistID.match(matchRefetchFromNetworkChecklistID) != null;
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

function _shouldDeleteRefetchFromNetworkChecklistID(refetchFromNetworkChecklistID) {
    let deleteRefetchFromNetworkChecklistID = false;

    let validRefetchFromNetworkChecklistID = _isRefetchFromNetworkChecklistID(refetchFromNetworkChecklistID);
    if (validRefetchFromNetworkChecklistID) {
        let refetchFromNetworkChecklistIDWithoutAppName = refetchFromNetworkChecklistID.replace(new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName)), "");

        let versions = refetchFromNetworkChecklistIDWithoutAppName.match(new RegExp("(?<=_v)\\d+(?=_|$)", "g"));

        deleteRefetchFromNetworkChecklistID =
            parseInt(versions[0]) < _myCacheVersion ||
            (parseInt(versions[0]) == _myCacheVersion && parseInt(versions[1]) < _myRefetchFromNetworkVersion);
    }

    return deleteRefetchFromNetworkChecklistID;
}

function _shouldDeleteTempRefetchFromNetworkChecklistID(tempRefetchFromNetworkChecklistID) {
    let deleteTempRefetchFromNetworkChecklistID = false;

    let validTempRefetchFromNetworkChecklistID = _isTempRefetchFromNetworkChecklistID(tempRefetchFromNetworkChecklistID);
    if (validTempRefetchFromNetworkChecklistID) {
        let tempRefetchFromNetworkChecklistIDWithoutAppName = tempRefetchFromNetworkChecklistID.replace(new RegExp("^" + _escapeRegexSpecialCharacters(_myAppName)), "");

        let versions = tempRefetchFromNetworkChecklistIDWithoutAppName.match(new RegExp("(?<=_v)\\d+(?=_|$)", "g"));

        deleteTempRefetchFromNetworkChecklistID =
            parseInt(versions[0]) < _myCacheVersion ||
            (parseInt(versions[0]) == _myCacheVersion && parseInt(versions[1]) < _myRefetchFromNetworkVersion) ||
            (parseInt(versions[0]) == _myCacheVersion && parseInt(versions[1]) == _myRefetchFromNetworkVersion && parseInt(versions[2]) <= _myServiceWorkerVersion);
    }

    return deleteTempRefetchFromNetworkChecklistID;
}

async function _shouldResourceBeRefetchedFromNetwork(resourceURL, checkTempRefetchFromNetworkChecklist = false) {
    let refetchResourceFromNetwork = false;

    try {
        refetchResourceFromNetwork = _shouldResourceURLBeIncluded(resourceURL, _myRefetchFromNetworkResourceURLsToInclude, _myRefetchFromNetworkResourceURLsToExclude);

        if (refetchResourceFromNetwork) {
            let refetechChecklistID = _getRefetchFromNetworkChecklistID();

            let hasChecklist = await caches.has(refetechChecklistID); // Avoid creating the checklist when opening it if it has not already been created
            if (hasChecklist) {
                let refetchChecklist = await caches.open(refetechChecklistID);
                let refetchChecklistResult = await refetchChecklist.match(resourceURL);

                if (refetchChecklistResult != null) {
                    refetchResourceFromNetwork = false; // It has already been ticked off since it is in the checklist "cache"
                }
            }
        }

        if (refetchResourceFromNetwork && checkTempRefetchFromNetworkChecklist) {
            let refetechChecklistID = _getTempRefetchFromNetworkChecklistID();

            let hasChecklist = await caches.has(refetechChecklistID); // Avoid creating the checklist when opening it if it has not already been created
            if (hasChecklist) {
                let refetchChecklist = await caches.open(refetechChecklistID);
                let refetchChecklistResult = await refetchChecklist.match(resourceURL);

                if (refetchChecklistResult != null) {
                    refetchResourceFromNetwork = false; // It has already been ticked off since it is in the checklist "cache"
                }
            }
        }
    } catch (error) {
        refetchResourceFromNetwork = false;

        let logEnabled = _shouldResourceURLBeIncluded(_getCurrentLocation(), _myLogEnabledLocationURLsToInclude, _myLogEnabledLocationURLsToExclude);
        if (logEnabled) {
            console.error("An error occurred while trying to check if the resource should be refetched: " + request.url);
        }
    }

    return refetchResourceFromNetwork;
}

// #endregion Service Worker Utils



// #region Cauldron Utils

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

// #endregion Cauldron Utils