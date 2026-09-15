import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// As Edge Functions (Deno) não passam por bundler: os módulos puros do
// domínio são COPIADOS para supabase/functions/<fn>/dominio/.
// Se as cópias divergirem, o cron e o app calculariam coisas diferentes —
// exatamente o bug que a especificação manda evitar.
// A única diferença permitida é a extensão .ts nos imports relativos (Deno).
const COPIAS: Array<[funcao: string, arquivo: string]> = [
  ['gerar-recorrencias', 'calendario.ts'],
  ['gerar-recorrencias', 'parcelas.ts'],
  ['gerar-recorrencias', 'recorrencias.ts'],
  ['resumo-semanal', 'mensagem.ts'],
]

const normalizar = (s: string) => s.replace(/from '\.\/(\w+)\.ts'/g, "from './$1'")

describe('cópias do domínio nas Edge Functions', () => {
  it.each(COPIAS)('%s/%s está idêntico ao original', (funcao, arquivo) => {
    const original = readFileSync(`src/dominio/${arquivo}`, 'utf8')
    const copia = readFileSync(`supabase/functions/${funcao}/dominio/${arquivo}`, 'utf8')
    expect(normalizar(copia)).toBe(normalizar(original))
  })
})
