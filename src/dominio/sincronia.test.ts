import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// A Edge Function (Deno) não passa por bundler: os módulos puros do domínio
// são COPIADOS para supabase/functions/gerar-recorrencias/dominio/.
// Se as cópias divergirem, o cron e o app calculariam competências
// diferentes — exatamente o bug que a especificação manda evitar.
// A única diferença permitida é a extensão .ts nos imports relativos (Deno).
const ARQUIVOS = ['calendario.ts', 'parcelas.ts', 'recorrencias.ts']

const normalizar = (s: string) => s.replace(/from '\.\/(\w+)\.ts'/g, "from './$1'")

describe('cópias do domínio na Edge Function', () => {
  it.each(ARQUIVOS)('%s está idêntico ao original', (arquivo) => {
    const original = readFileSync(`src/dominio/${arquivo}`, 'utf8')
    const copia = readFileSync(`supabase/functions/gerar-recorrencias/dominio/${arquivo}`, 'utf8')
    expect(normalizar(copia)).toBe(normalizar(original))
  })
})
