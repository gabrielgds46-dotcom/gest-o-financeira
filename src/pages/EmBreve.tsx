import { Tela, Cartao } from '../components/Tela'

export function EmBreve({ titulo }: { titulo: string }) {
  return (
    <Tela titulo={titulo}>
      <Cartao><p className="text-sm text-zinc-400">Esta tela chega em uma fase seguinte.</p></Cartao>
    </Tela>
  )
}
