import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import { AppModule } from './app/app.module'

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err))

// PWA - service worker מינימלי (src/sw.js), כדי שהטלפון יציע "התקן"
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('sw.js not registered', err))
  })
}
