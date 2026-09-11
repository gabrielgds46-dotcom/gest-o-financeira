import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

/** Tabelas publicadas no Realtime (ver 010_realtime.sql). */
export type TabelaViva =
  | 'lancamentos' | 'parcelas' | 'receitas' | 'acertos'
  | 'orcamentos' | 'recorrencias' | 'meses_fechados'

/**
 * Assina mudanças nas tabelas e chama `aoMudar` quando algo se move.
 *
 * O Realtime do Supabase respeita RLS: só chega evento de linha que este
 * usuário já poderia ler. Como as telas recalculam tudo por RPC, aqui não
 * se aplica o payload — só se dispara a recarga, o que evita divergência
 * entre o que a tela mostra e o que o banco realmente tem.
 *
 * Os eventos vêm em rajada (um lançamento de 12x gera 13 linhas), então há
 * um atraso curto para agrupar tudo numa recarga só.
 */
export function useTempoReal(tabelas: TabelaViva[], aoMudar: () => void, ativo = true): void {
  const callback = useRef(aoMudar)
  callback.current = aoMudar
  const chave = tabelas.join(',')

  useEffect(() => {
    if (!ativo) return
    let timer: number | undefined
    const agendar = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => callback.current(), 350)
    }

    const canal = supabase.channel(`sync:${chave}`)
    for (const tabela of chave.split(',') as TabelaViva[]) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, agendar)
    }
    canal.subscribe()

    // Voltar do segundo plano (trocar de app, destravar o celular) pode ter
    // perdido eventos enquanto a aba dormia: recarrega ao reaparecer.
    const aoVoltar = () => { if (document.visibilityState === 'visible') agendar() }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('online', agendar)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('online', agendar)
      void supabase.removeChannel(canal)
    }
  }, [chave, ativo])
}
