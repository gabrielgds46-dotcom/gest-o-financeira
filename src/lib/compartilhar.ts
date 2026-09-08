/** Compartilha via a folha nativa do celular; no desktop copia para a área de transferência. */
export async function compartilharTexto(texto: string): Promise<'compartilhado' | 'copiado' | 'falhou'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text: texto })
      return 'compartilhado'
    }
    await navigator.clipboard.writeText(texto)
    return 'copiado'
  } catch {
    return 'falhou'
  }
}
