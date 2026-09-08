import { NavLink } from 'react-router-dom'
import { Icone, type NomeIcone } from './Icone'

const ABAS: Array<{ para: string; rotulo: string; icone: NomeIcone }> = [
  { para: '/', rotulo: 'Início', icone: 'inicio' },
  { para: '/lancar', rotulo: 'Lançar', icone: 'lancar' },
  { para: '/analise', rotulo: 'Análise', icone: 'analise' },
  { para: '/perfil', rotulo: 'Perfil', icone: 'perfil' },
]

export function BarraAbas() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {ABAS.map((a) => (
          <li key={a.para} className="flex-1">
            <NavLink
              to={a.para}
              end={a.para === '/'}
              className={({ isActive }) =>
                'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ' +
                (isActive ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300')
              }
            >
              <Icone nome={a.icone} />
              {a.rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
