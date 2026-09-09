/**
 * Entrega um arquivo ao usuário. No celular tenta a folha nativa de
 * compartilhamento (o Safari do iPhone não baixa blob direto); no
 * desktop cai no download por link.
 */
export async function baixarArquivo(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8'): Promise<'compartilhado' | 'baixado' | 'falhou'> {
  try {
    const arquivo = new File([conteudo], nome, { type: tipo })
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], title: nome })
      return 'compartilhado'
    }
  } catch {
    // Usuário cancelou a folha ou o navegador não suporta: tenta o download.
  }
  try {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return 'baixado'
  } catch {
    return 'falhou'
  }
}
