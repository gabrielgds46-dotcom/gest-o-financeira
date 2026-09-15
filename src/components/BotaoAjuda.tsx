import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FolhaAjuda } from './FolhaAjuda'
import { Tour, type PassoTour } from './Tour'
import { PASSOS_POR_TELA } from '../conteudo/tour'
import { Icone } from './Icone'

/**
 * Botão de ajuda, flutuante e permanente.
 *
 * Contorno, não preenchido: verde cheio é a cor de AÇÃO neste app (lançar,
 * pagar, salvar). Um "?" verde vivo competiria com o botão de lançar pela
 * atenção, e ajuda não é a coisa mais importante da tela.
 */
export function BotaoAjuda() {
  const [ajuda, setAjuda] = useState(false)
  const [tour, setTour] = useState<PassoTour[] | null>(null)
  const { pathname } = useLocation()

  return (
    <>
      <button
        type="button"
        onClick={() => setAjuda(true)}
        aria-label="Ajuda"
        className="safe-bottom fixed bottom-[76px] left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-bg/85 text-ink-2 shadow-lg backdrop-blur active:scale-95"
      >
        <Icone nome="ajuda" tamanho={20} />
      </button>

      <FolhaAjuda
        aberta={ajuda}
        onFechar={() => setAjuda(false)}
        onTour={() => { setAjuda(false); setTour(PASSOS_POR_TELA[pathname] ?? PASSOS_POR_TELA['/']) }}
      />

      {tour && <Tour passos={tour} onFim={() => setTour(null)} />}
    </>
  )
}
