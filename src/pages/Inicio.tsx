import { usePerfil } from '../contexts/PerfilContext'
import { Tela, Cartao } from '../components/Tela'

// Placeholder até a Fase 5 (seletor de mês, cards, a vencer, orçamento).
export function Inicio() {
  const { perfil, casa, parceiro } = usePerfil()
  return (
    <Tela titulo={casa?.nome ?? 'Início'}>
      <Cartao>
        <p className="text-sm text-zinc-400">Olá, {perfil?.nome.split(' ')[0]}.</p>
        <p className="mt-2 text-sm text-zinc-400">
          {parceiro
            ? `Você e ${parceiro.nome} estão na mesma casa. A tela de resumo do mês chega na Fase 5.`
            : 'Seu par ainda não entrou. Gere o código de convite no Perfil.'}
        </p>
      </Cartao>
    </Tela>
  )
}
