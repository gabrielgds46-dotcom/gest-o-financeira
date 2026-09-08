// Espelha a política configurada no Supabase (Authentication > Providers > Email):
// mínimo 8 caracteres, pelo menos uma letra e um dígito. Validar aqui evita
// uma ida ao servidor só para receber o mesmo erro.
export const SENHA_MINIMO = 8

export function senhaValida(senha: string): boolean {
  return senha.length >= SENHA_MINIMO && /[a-zA-Z]/.test(senha) && /\d/.test(senha)
}
