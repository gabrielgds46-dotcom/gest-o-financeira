import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

// =============================================================
// public/push-sw.js é JavaScript solto: não passa por tsc, não passa
// pelo bundler, e é carregado pelo service worker só quando chega uma
// notificação de verdade. Sem este teste, um erro ali apareceria na
// primeira segunda-feira — para os dois, ao mesmo tempo.
//
// O arquivo é avaliado com um `self` de mentira, e os handlers que ele
// registra são chamados à mão.
// =============================================================

type Handler = (evento: unknown) => void

function carregarSW() {
  const codigo = readFileSync('public/push-sw.js', 'utf8')
  const handlers = new Map<string, Handler>()
  const mostradas: Array<{ titulo: string; opcoes: Record<string, unknown> }> = []
  const abertas: string[] = []
  const navegadas: string[] = []
  const janelas: Array<{ url: string; focus: () => Promise<unknown>; navigate?: (u: string) => Promise<unknown> }> = []

  const self = {
    location: { origin: 'https://financas.test' },
    addEventListener: (nome: string, fn: Handler) => handlers.set(nome, fn),
    registration: {
      showNotification: (titulo: string, opcoes: Record<string, unknown>) => {
        mostradas.push({ titulo, opcoes })
        return Promise.resolve()
      },
    },
    clients: {
      matchAll: () => Promise.resolve(janelas),
      openWindow: (url: string) => { abertas.push(url); return Promise.resolve() },
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('self', codigo)(self)
  return { handlers, mostradas, abertas, navegadas, janelas }
}

/** Dispara o handler e espera o que ele passou para waitUntil. */
async function disparar(h: Handler, evento: Record<string, unknown>) {
  let espera: unknown = Promise.resolve()
  h({ ...evento, waitUntil: (p: unknown) => { espera = p } })
  await espera
}

describe('public/push-sw.js', () => {
  it('registra os dois handlers que o push precisa', () => {
    const sw = carregarSW()
    expect([...sw.handlers.keys()].sort()).toEqual(['notificationclick', 'push'])
  })

  it('mostra a notificação com o texto que a Edge Function manda', async () => {
    const sw = carregarSW()
    await disparar(sw.handlers.get('push')!, {
      data: { json: () => ({ titulo: 'Saíram R$ 600,00 nesta semana', corpo: 'Alimentação levou R$ 500,00', tag: 'resumo-semana', url: '/?semana=1' }) },
    })
    expect(sw.mostradas).toHaveLength(1)
    expect(sw.mostradas[0].titulo).toBe('Saíram R$ 600,00 nesta semana')
    expect(sw.mostradas[0].opcoes.body).toBe('Alimentação levou R$ 500,00')
    expect(sw.mostradas[0].opcoes.tag).toBe('resumo-semana')
    expect((sw.mostradas[0].opcoes.data as { url: string }).url).toBe('/?semana=1')
  })

  it('não quebra com corpo vazio ou que não é JSON', async () => {
    const sw = carregarSW()
    await disparar(sw.handlers.get('push')!, { data: null })
    await disparar(sw.handlers.get('push')!, { data: { json: () => { throw new Error('não é JSON') } } })
    expect(sw.mostradas).toHaveLength(2)
    // Sem título no payload, cai no nome do app em vez de mostrar "undefined".
    expect(sw.mostradas[0].titulo).toBe('Finanças do Casal')
    expect(sw.mostradas[1].titulo).toBe('Finanças do Casal')
  })

  it('usa uma tag por assunto, para não empilhar cinco resumos iguais', async () => {
    const sw = carregarSW()
    await disparar(sw.handlers.get('push')!, { data: { json: () => ({ titulo: 'a' }) } })
    expect(sw.mostradas[0].opcoes.tag).toBe('geral')
    expect(sw.mostradas[0].opcoes.renotify).toBe(true)
  })

  it('o toque navega na janela já aberta, em vez de abrir outra aba', async () => {
    const sw = carregarSW()
    const navegou: string[] = []
    sw.janelas.push({
      url: 'https://financas.test/perfil',
      focus: () => Promise.resolve({ navigate: (u: string) => { navegou.push(u); return Promise.resolve() } }),
    })
    const fechar = vi.fn()
    await disparar(sw.handlers.get('notificationclick')!, {
      notification: { close: fechar, data: { url: '/?semana=1' } },
    })
    expect(fechar).toHaveBeenCalled()
    expect(navegou).toEqual(['/?semana=1'])
    expect(sw.abertas).toEqual([])
  })

  it('sem janela aberta, abre uma nova no destino certo', async () => {
    const sw = carregarSW()
    await disparar(sw.handlers.get('notificationclick')!, {
      notification: { close: () => {}, data: { url: '/?semana=1' } },
    })
    expect(sw.abertas).toEqual(['/?semana=1'])
  })

  it('notificação sem url cai na raiz, não em undefined', async () => {
    const sw = carregarSW()
    await disparar(sw.handlers.get('notificationclick')!, {
      notification: { close: () => {}, data: null },
    })
    expect(sw.abertas).toEqual(['/'])
  })
})
