    if ('serviceWorker' in navigator) {
        // Wait until window is loaded before registering.
        window.addEventListener('load', () => {
        // Register the service worker with "/" as it's scope.
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            // Output success/failure of registration.
            .then(() => console.log('Service Worker registered with scope'))
            .catch(() => console.error('Service Worker registration failed'));
        });
    }
