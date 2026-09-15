/* =============================================================
   Push do resumo de segunda.

   Este arquivo é puxado pelo service worker gerado pelo Workbox
   (vite.config.ts -> workbox.importScripts). Fica separado de
   propósito: migrar o app inteiro para injectManifest só para
   escutar dois eventos trocaria uma configuração que funciona por
   outra, maior, para ganhar nada.
   ============================================================= */

self.addEventListener('push', (evento) => {
  let dados = {}
  try { dados = evento.data ? evento.data.json() : {} } catch { /* corpo não-JSON: usa os padrões */ }

  const titulo = dados.titulo || 'Finanças do Casal'
  const opcoes = {
    body: dados.corpo || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    lang: 'pt-BR',
    // Uma tag por assunto: o resumo da semana seguinte substitui o anterior
    // em vez de empilhar cinco notificações iguais na bandeja.
    tag: dados.tag || 'geral',
    renotify: true,
    data: { url: dados.url || '/' },
  }
  evento.waitUntil(self.registration.showNotification(titulo, opcoes))
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = (evento.notification.data && evento.notification.data.url) || '/'

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      // Já tem o app aberto? Navega nele em vez de abrir outra aba.
      for (const j of janelas) {
        if (j.url.includes(self.location.origin)) {
          return j.focus().then((f) => (f.navigate ? f.navigate(destino) : f))
        }
      }
      return self.clients.openWindow(destino)
    }),
  )
})
