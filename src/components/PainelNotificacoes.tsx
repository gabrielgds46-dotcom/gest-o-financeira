import { useCallback, useEffect, useState } from 'react'
import { assinarPush, cancelarPush, estadoPush, inscricaoAtual, type EstadoPush } from '../lib/push'
import { removerInscricao, salvarInscricao } from '../dados/semana'
import { traduzErro } from '../lib/erros'
import { Aviso } from './Tela'
import { Botao } from './Botao'
import { Icone } from './Icone'

/**
 * Liga e desliga o resumo de segunda no aparelho.
 *
 * "Neste aparelho" é literal: a inscrição é do navegador, não da conta.
 * O celular e o computador precisam ser ligados separadamente, e a tela
 * diz isso — senão a pessoa liga no computador e reclama que o celular
 * não avisa.
 */
export function PainelNotificacoes({ userId }: { userId: string }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const conferir = useCallback(async () => {
    try { setEstado(await estadoPush()) } catch { setEstado('indisponivel') }
  }, [])

  useEffect(() => { void conferir() }, [conferir])

  async function ligar() {
    setOcupado(true); setErro(null)
    try {
      const dados = await assinarPush()
      if (!dados) { setErro('Você recusou as notificações. Dá para liberar nas permissões do navegador.'); await conferir(); return }
      await salvarInscricao(userId, dados)
      await conferir()
    } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }

  async function desligar() {
    setOcupado(true); setErro(null)
    try {
      const atual = await inscricaoAtual()
      const endpoint = await cancelarPush()
      if (endpoint || atual) await removerInscricao(endpoint ?? atual!.endpoint)
      await conferir()
    } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }

  if (estado === null) return <p className="text-sm text-ink-3">Verificando…</p>

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">
        Toda segunda de manhã, um resumo do que saiu na semana e do que vence na próxima.
      </p>

      {estado === 'indisponivel' && (
        <Aviso tipo="info">
          Este navegador não faz notificação. No iPhone, ela só funciona depois de
          <b> adicionar o app à Tela de Início</b>.
        </Aviso>
      )}

      {estado === 'sem-chave' && (
        <Aviso tipo="info">
          Falta configurar a chave de notificações (<code className="text-xs">VITE_VAPID_PUBLICA</code>). Enquanto isso, o
          resumo continua disponível dentro do app.
        </Aviso>
      )}

      {estado === 'bloqueado' && (
        <Aviso>
          As notificações estão bloqueadas para este site. Libere nas permissões do navegador e volte aqui.
        </Aviso>
      )}

      {erro && <Aviso>{erro}</Aviso>}

      {estado === 'ligado' && (
        <>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-acao">
            <Icone nome="check" tamanho={16} /> Ligado neste aparelho
          </p>
          <Botao variante="secundario" ocupado={ocupado} onClick={() => void desligar()}>
            Desligar neste aparelho
          </Botao>
        </>
      )}

      {estado === 'desligado' && (
        <Botao ocupado={ocupado} onClick={() => void ligar()}>
          Ligar neste aparelho
        </Botao>
      )}

      <p className="text-xs text-ink-3">
        A inscrição é deste navegador. Celular e computador se ligam separadamente.
      </p>
    </div>
  )
}
