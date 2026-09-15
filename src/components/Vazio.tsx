import type { ReactNode } from 'react'
import { Icone, type NomeIcone } from './Icone'

/**
 * Tela vazia.
 *
 * Vazio não é erro: é o estado normal de quem acabou de chegar. Então cada
 * um diz o que está faltando, por que está vazio, e oferece a ação que
 * resolve — em vez do "nenhum registro encontrado" que não ajuda ninguém.
 */
export function Vazio({ icone, titulo, texto, acao }: {
  icone: NomeIcone
  titulo: string
  texto: string
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-s2 text-ink-3">
        <Icone nome={icone} tamanho={22} />
      </span>
      <p className="text-sm font-semibold text-ink-2">{titulo}</p>
      <p className="max-w-[34ch] text-[13px] leading-relaxed text-ink-3">{texto}</p>
      {acao && <div className="mt-2 w-full max-w-[16rem]">{acao}</div>}
    </div>
  )
}
