/*
 * Service worker - רק מה שנדרש כדי שהדפדפן יציע "התקן" (PWA).
 *
 * בכוונה בלי מטמון: כל גרסה שעולה ל-Railway מגיעה מיד, בלי "גרסה ישנה
 * תקועה" בטלפון. מטפל רק בניווט (טעינת דף); בקשות API, LiveQuery והעלאות
 * ל-S3 לא עוברות כאן בכלל.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
  }
});
