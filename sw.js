var npm = {
  root: 'https://npmcdn.com',
  bootstrap: 'https://npmcdn.com/bootstrap@4.0.0-alpha.2',
  fontAwesome: 'https://npmcdn.com/font-awesome@4.5.0',
  raven: 'https://npmcdn.com/raven-js@2.2.0'
};

var URLS = {
  app: [
    './',
    './index.js',
    './index.html',
    './manifest.json',
    './res/icon_hi_res_512.png',
    './res/icon_xxxhdpi_192.png',
    './res/icon_xxhdpi_144.png',
    './res/icon_xhdpi_96.png',
    './res/icon_hdpi_72.png',
    './res/icon_mdpi_48.png'
  ],
  vendor: [
    `${npm.bootstrap}/dist/css/bootstrap.min.css`,
    `${npm.fontAwesome}/css/font-awesome.min.css`,
    `${npm.fontAwesome}/fonts/fontawesome-webfont.woff2` // browsers that support sw support woff2
    `${npm.raven}/dist/raven.min.js`
  ]
}

var CACHE_NAMES = {
  app: 'app-cache-v1',
  vendor: 'vendor-cache-v1'
};

function cacheAll(cacheName, urls) {
  return caches.open(cacheName).then((cache) => cache.addAll(urls));
}

function addToCache(cacheName, request, response) {
  if (response.ok) {
    var clone = response.clone()
    caches.open(cacheName).then((cache) => cache.put(request, clone));
  }
  return response;
}

function lookupCache(request) {
  return caches.match(request).then(function(cachedResponse) {
    if (!cachedResponse) {
      throw Error(`${request.url} not found in cache`);
    }
    return cachedResponse;
  });
}

function fetchThenCache(request, cacheName) {
  var fetchRequest = fetch(request);
  // add to cache, but don't block resolve of this promise on caching
  fetchRequest.then((response) => addToCache(cacheName, request, response));
  return fetchRequest;
}

function raceRequest(request, cacheName) {
  var attempts = [
    fetchThenCache(request, cacheName),
    lookupCache(request)
  ];
  return new Promise(function(resolve, reject) {
    // resolve this promise once one resolves
    attempts.forEach((attempt) => attempt.then(resolve));
    // reject if all promises reject
    attempts.reduce((verdict, attempt) => verdict.catch(() => attempt))
      .catch(() => reject(Error('Unable to resolve request from network or cache.')));
  })
}

self.addEventListener('install', function(evt) {
  var cachingCompleted = Promise.all([
    cacheAll(CACHE_NAMES.app, URLS.app),
    cacheAll(CACHE_NAMES.vendor, URLS.vendor)
  ]);

  evt.waitUntil(cachingCompleted);
});

self.addEventListener('fetch', function(evt) {
  var request = evt.request;
  var response;

  // only handle GET requests
  if (request.method !== 'GET') return;

  if (request.url.startsWith(npm.root)) {
    // vendor requests: check cache first, fallback to fetch
    response = lookupCache(request)
      .catch(() => fetchThenCache(request, CACHE_NAMES.vendor));
  } else {
    // app request: race cache/fetch (bonus: update in background)
    response = raceRequest(request, CACHE_NAMES.app);
  }
  evt.respondWith(response);
});
