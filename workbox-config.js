module.exports = {
	globDirectory: '_site/',
	globPatterns: [
		'assets/js/turtling**/*.{js,css}',
		// Precache code/fonts/icons. Raster artwork belongs to the bounded,
		// demand-driven image route below, not every /turtle installation.
		'**/*.{css,svg,ttf,woff,woff2,js,ico}',
		'turtle.html'
	],
	swDest: '_site/sw.js',
	// Compiled scroll states are demand-loaded, not an eager offline catalogue.
	// The /turtle worker controls '/' too; visiting it must not fetch every frame.
	globIgnores: ['assets/lib/helios/ink/**'],
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	cleanupOutdatedCaches: true,
	runtimeCaching: [
		{
		  urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
		  handler: 'CacheFirst',
		  options: {
			cacheName: 'images-cache',
			expiration: { maxEntries: 48 },
		  },
		},
		{
		  urlPattern: /\.(?:mp4|webm)$/,
		  handler: 'CacheFirst',
		  options: {
			cacheName: 'media-cache',
			expiration: { maxEntries: 3 },
		  },
		},
		{
		  urlPattern: /\.(?:css|js|webmanifest)$/,
		  handler: 'NetworkFirst',
		  options: {
			cacheName: 'static-cache',
		  },
		},
		{
		  urlPattern: /\.(?:html)$/,
		  handler: 'NetworkFirst',
		  options: {
			cacheName: 'html-cache',
		  },
		},
	  ],
};
