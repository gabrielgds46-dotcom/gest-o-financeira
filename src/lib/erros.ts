// Traduz as mensagens mais comuns do Supabase Auth para pt-BR.
// O que não estiver mapeado passa direto, para não esconder a causa real.
const MAPA: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Email ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu email antes de entrar.'],
  [/user already registered/i, 'Já existe uma conta com este email.'],
  [/password should be at least (\d+)/i, 'A senha precisa ter pelo menos 8 caracteres.'],
  [/password should contain/i, 'A senha precisa ter letras e números.'],
  [/weak password|pwned|compromised/i, 'Essa senha é fraca ou conhecida. Escolha outra.'],
  [/unable to validate email address|invalid email/i, 'Email inválido.'],
  [/email rate limit exceeded/i, 'Muitas tentativas. Aguarde alguns minutos.'],
  [/network|fetch/i, 'Sem conexão. Verifique sua internet.'],
]

export function traduzErro(mensagem: string | undefined | null): string {
  if (!mensagem) return 'Algo deu errado. Tente novamente.'
  for (const [re, texto] of MAPA) if (re.test(mensagem)) return texto
  return mensagem
}
