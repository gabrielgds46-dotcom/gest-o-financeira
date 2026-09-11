import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { Icone } from './Icone'

/**
 * Faixa de "nova versão" e de "sem conexão".
 *
 * A atualização NÃO é aplicada sozinha: recarregar no meio de um
 * lançamento perderia o que a pessoa digitou. Mostra-se a faixa e ela
 * decide quando.
 */
export function Avisos() {
  const [temAtualizacao, setTemAtualizacao] = useState(false)
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  const [atualizar, setAtualizar] = useState<(() => Promise<void>) | null>(null)

  useEffect(() => {
    const aplicar = registerSW({
      immediate: true,
      onNeedRefresh() {
        setAtualizar(() => () => aplicar(true))
        setTemAtualizacao(true)
      },
    })
  }, [])

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline && !temAtualizacao) return null

  return (
    <div className="safe-top fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-2">
      {offline ? (
        <p role="status" className="flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 text-sm text-zinc-200 shadow-lg">
          <Icone nome="alerta" tamanho={16} /> Sem conexão. Os dados podem estar desatualizados.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void atualizar?.()}
          className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg active:scale-95"
        >
          <Icone nome="repetir" tamanho={16} /> Nova versão disponível. Toque para atualizar.
        </button>
      )}
    </div>
  )
}
