// =============================================================
// Web Push: assinar e cancelar no navegador.
//
// A chave pública VAPID vem do .env e é pública por definição — ela
// identifica o servidor para o serviço de push. A PRIVADA nunca chega
// ao front: vive nos secrets da Edge Function.
// =============================================================

export type EstadoPush =
  | 'indisponivel'   // navegador sem suporte, ou app não instalado no iOS
  | 'sem-chave'      // VITE_VAPID_PUBLICA não configurada
  | 'bloqueado'      // a pessoa negou a permissão
  | 'desligado'
  | 'ligado'

const CHAVE = import.meta.env.VITE_VAPID_PUBLICA as string | undefined

export function suportaPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!suportaPush()) return 'indisponivel'
  if (!CHAVE) return 'sem-chave'
  if (Notification.permission === 'denied') return 'bloqueado'
  const reg = await navigator.serviceWorker.ready
  const atual = await reg.pushManager.getSubscription()
  return atual ? 'ligado' : 'desligado'
}

export type DadosInscricao = { endpoint: string; p256dh: string; auth: string; aparelho: string | null }

/** Pede permissão e assina. Devolve null se a pessoa recusar. */
export async function assinarPush(): Promise<DadosInscricao | null> {
  if (!suportaPush() || !CHAVE) return null
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return null

  const reg = await navigator.serviceWorker.ready
  const inscricao = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlParaBytes(CHAVE),
  })
  return paraDados(inscricao)
}

export async function cancelarPush(): Promise<string | null> {
  if (!suportaPush()) return null
  const reg = await navigator.serviceWorker.ready
  const atual = await reg.pushManager.getSubscription()
  if (!atual) return null
  const endpoint = atual.endpoint
  await atual.unsubscribe()
  return endpoint
}

export async function inscricaoAtual(): Promise<DadosInscricao | null> {
  if (!suportaPush()) return null
  const reg = await navigator.serviceWorker.ready
  const atual = await reg.pushManager.getSubscription()
  return atual ? paraDados(atual) : null
}

function paraDados(s: PushSubscription): DadosInscricao {
  const j = s.toJSON()
  return {
    endpoint: s.endpoint,
    p256dh: j.keys?.p256dh ?? '',
    auth: j.keys?.auth ?? '',
    aparelho: navigator.userAgent.slice(0, 120),
  }
}

/** A chave VAPID chega em base64url; o subscribe quer bytes. */
function base64UrlParaBytes(base64: string): Uint8Array {
  const preenchido = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(preenchido)
  const bytes = new Uint8Array(bruto.length)
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i)
  return bytes
}
