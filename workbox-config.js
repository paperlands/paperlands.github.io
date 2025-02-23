module.exports = {
	globDirectory: '_site/',
	globPatterns: [
		'assets/js/turtling**/*.{js,css}',
		'**/*.{css,svg,ttf,woff,woff2,js,png,jpg,webp,mp4,jpeg,webm,gif,ico}',
		'turtle.html'
	],
	swDest: '_site/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	cleanupOutdatedCaches: true,
	runtimeCaching: [
		{
		  urlPattern: /\.(?:png|jpg|jpeg|svg)$/,
		  handler: 'CacheFirst',
		  options: {
			cacheName: 'images-cache',
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
