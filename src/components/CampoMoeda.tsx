import { useId } from 'react'
import { formatarMoeda } from '../lib/moeda'

type Props = {
  rotulo: string
  /** Valor em centavos, ou null quando vazio. */
  valor: number | null
  onChange: (centavos: number | null) => void
  autoFocus?: boolean
  grande?: boolean
  erro?: string
  id?: string
}

/**
 * Máscara de caixa: o usuário digita só dígitos e o valor cresce da direita
 * para a esquerda ("1" -> R$ 0,01, "12" -> R$ 0,12, "1234" -> R$ 12,34).
 * inputmode="decimal" abre o teclado numérico; o estado é sempre inteiro.
 */
export function CampoMoeda({ rotulo, valor, onChange, autoFocus, grande, erro, id }: Props) {
  const gerado = useId()
  const inputId = id ?? gerado
  const texto = valor === null ? '' : formatarMoeda(valor)

  function aoDigitar(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, '')
    if (!digitos) return onChange(null)
    onChange(Math.min(Number(digitos), 999_999_999_99))
  }

  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{rotulo}</span>
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="R$ 0,00"
        value={texto}
        onChange={aoDigitar}
        className={
          'w-full rounded-xl border bg-zinc-900 px-4 text-zinc-100 outline-none placeholder:text-zinc-600 ' +
          'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 ' +
          (grande ? 'h-16 text-3xl font-semibold tabular-nums ' : 'h-12 text-base ') +
          (erro ? 'border-red-500' : 'border-zinc-800')
        }
      />
      {erro && <span className="mt-1 block text-sm text-red-400">{erro}</span>}
    </label>
  )
}
