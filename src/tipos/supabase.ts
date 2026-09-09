// Gerado a partir do projeto Supabase (generate_typescript_types).
// Regenerar sempre que uma migration mudar tabelas, views ou funções.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acertos: {
        Row: {
          created_at: string
          data: string
          de_user_id: string
          descricao: string
          household_id: string
          id: string
          para_user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          de_user_id: string
          descricao?: string
          household_id: string
          id?: string
          para_user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          de_user_id?: string
          descricao?: string
          household_id?: string
          id?: string
          para_user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "acertos_de_user_id_fkey"
            columns: ["de_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acertos_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acertos_para_user_id_fkey"
            columns: ["para_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cartoes: {
        Row: {
          apelido: string
          ativo: boolean
          created_at: string
          dia_fechamento: number
          dia_vencimento: number
          id: string
          limite: number | null
          owner_id: string
        }
        Insert: {
          apelido: string
          ativo?: boolean
          created_at?: string
          dia_fechamento: number
          dia_vencimento: number
          id?: string
          limite?: number | null
          owner_id: string
        }
        Update: {
          apelido?: string
          ativo?: boolean
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          id?: string
          limite?: number | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          cor: string
          grupo: Database["public"]["Enums"]["grupo_categoria_t"]
          icone: string
          id: string
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          cor: string
          grupo: Database["public"]["Enums"]["grupo_categoria_t"]
          icone: string
          id?: string
          nome: string
          ordem?: number
          slug: string
        }
        Update: {
          cor?: string
          grupo?: Database["public"]["Enums"]["grupo_categoria_t"]
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          percentual_rateio: number
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          percentual_rateio?: number
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          percentual_rateio?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          codigo_convite: string | null
          codigo_expira_em: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          codigo_convite?: string | null
          codigo_expira_em?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          codigo_convite?: string | null
          codigo_expira_em?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          cancelado_em: string | null
          cartao_id: string | null
          categoria_id: string
          competencia_rec: string | null
          created_at: string
          data_compra: string
          descricao: string
          escopo: Database["public"]["Enums"]["escopo_t"]
          household_id: string | null
          id: string
          metodo: Database["public"]["Enums"]["metodo_t"]
          natureza: Database["public"]["Enums"]["natureza_t"]
          owner_id: string
          pago_por: string
          parcelas_total: number
          recorrencia_id: string | null
          valor_total: number
        }
        Insert: {
          cancelado_em?: string | null
          cartao_id?: string | null
          categoria_id: string
          competencia_rec?: string | null
          created_at?: string
          data_compra: string
          descricao?: string
          escopo: Database["public"]["Enums"]["escopo_t"]
          household_id?: string | null
          id?: string
          metodo: Database["public"]["Enums"]["metodo_t"]
          natureza?: Database["public"]["Enums"]["natureza_t"]
          owner_id: string
          pago_por: string
          parcelas_total?: number
          recorrencia_id?: string | null
          valor_total: number
        }
        Update: {
          cancelado_em?: string | null
          cartao_id?: string | null
          categoria_id?: string
          competencia_rec?: string | null
          created_at?: string
          data_compra?: string
          descricao?: string
          escopo?: Database["public"]["Enums"]["escopo_t"]
          household_id?: string | null
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_t"]
          natureza?: Database["public"]["Enums"]["natureza_t"]
          owner_id?: string
          pago_por?: string
          parcelas_total?: number
          recorrencia_id?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "v_cartoes_household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_pago_por_fkey"
            columns: ["pago_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_recorrencia_id_fkey"
            columns: ["recorrencia_id"]
            isOneToOne: false
            referencedRelation: "recorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      meses_fechados: {
        Row: {
          competencia: string
          escopo: Database["public"]["Enums"]["escopo_t"]
          fechado_em: string
          fechado_por: string
          household_id: string | null
          id: string
          owner_id: string | null
        }
        Insert: {
          competencia: string
          escopo: Database["public"]["Enums"]["escopo_t"]
          fechado_em?: string
          fechado_por: string
          household_id?: string | null
          id?: string
          owner_id?: string | null
        }
        Update: {
          competencia?: string
          escopo?: Database["public"]["Enums"]["escopo_t"]
          fechado_em?: string
          fechado_por?: string
          household_id?: string | null
          id?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meses_fechados_fechado_por_fkey"
            columns: ["fechado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meses_fechados_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meses_fechados_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          categoria_id: string
          created_at: string
          escopo: Database["public"]["Enums"]["escopo_t"]
          household_id: string | null
          id: string
          owner_id: string
          valor_mensal: number
          vigente_desde: string
        }
        Insert: {
          categoria_id: string
          created_at?: string
          escopo: Database["public"]["Enums"]["escopo_t"]
          household_id?: string | null
          id?: string
          owner_id: string
          valor_mensal: number
          vigente_desde?: string
        }
        Update: {
          categoria_id?: string
          created_at?: string
          escopo?: Database["public"]["Enums"]["escopo_t"]
          household_id?: string | null
          id?: string
          owner_id?: string
          valor_mensal?: number
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          competencia: string
          created_at: string
          id: string
          lancamento_id: string
          numero: number
          pago_em: string | null
          status: Database["public"]["Enums"]["status_parcela_t"]
          valor: number
          vencimento: string
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          lancamento_id: string
          numero: number
          pago_em?: string | null
          status?: Database["public"]["Enums"]["status_parcela_t"]
          valor: number
          vencimento: string
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          lancamento_id?: string
          numero?: number
          pago_em?: string | null
          status?: Database["public"]["Enums"]["status_parcela_t"]
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          dia_recebimento: number
          dia_vencimento_contas: number
          household_id: string | null
          id: string
          nome: string
          salario_base: number
        }
        Insert: {
          created_at?: string
          dia_recebimento?: number
          dia_vencimento_contas?: number
          household_id?: string | null
          id: string
          nome?: string
          salario_base?: number
        }
        Update: {
          created_at?: string
          dia_recebimento?: number
          dia_vencimento_contas?: number
          household_id?: string | null
          id?: string
          nome?: string
          salario_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          competencia: string
          created_at: string
          descricao: string
          escopo: Database["public"]["Enums"]["escopo_t"]
          household_id: string | null
          id: string
          owner_id: string
          recorrencia_id: string | null
          tipo: Database["public"]["Enums"]["tipo_receita_t"]
          valor: number
        }
        Insert: {
          competencia: string
          created_at?: string
          descricao?: string
          escopo: Database["public"]["Enums"]["escopo_t"]
          household_id?: string | null
          id?: string
          owner_id: string
          recorrencia_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_receita_t"]
          valor: number
        }
        Update: {
          competencia?: string
          created_at?: string
          descricao?: string
          escopo?: Database["public"]["Enums"]["escopo_t"]
          household_id?: string | null
          id?: string
          owner_id?: string
          recorrencia_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_receita_t"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "receitas_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_recorrencia_id_fkey"
            columns: ["recorrencia_id"]
            isOneToOne: false
            referencedRelation: "recorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      recorrencias: {
        Row: {
          ativo: boolean
          cartao_id: string | null
          categoria_id: string | null
          created_at: string
          descricao: string
          dia_vencimento: number
          escopo: Database["public"]["Enums"]["escopo_t"]
          fim: string | null
          household_id: string | null
          id: string
          inicio: string
          metodo: Database["public"]["Enums"]["metodo_t"] | null
          owner_id: string
          tipo: Database["public"]["Enums"]["tipo_recorrencia_t"]
          valor: number
        }
        Insert: {
          ativo?: boolean
          cartao_id?: string | null
          categoria_id?: string | null
          created_at?: string
          descricao: string
          dia_vencimento: number
          escopo: Database["public"]["Enums"]["escopo_t"]
          fim?: string | null
          household_id?: string | null
          id?: string
          inicio?: string
          metodo?: Database["public"]["Enums"]["metodo_t"] | null
          owner_id: string
          tipo: Database["public"]["Enums"]["tipo_recorrencia_t"]
          valor: number
        }
        Update: {
          ativo?: boolean
          cartao_id?: string | null
          categoria_id?: string | null
          created_at?: string
          descricao?: string
          dia_vencimento?: number
          escopo?: Database["public"]["Enums"]["escopo_t"]
          fim?: string | null
          household_id?: string | null
          id?: string
          inicio?: string
          metodo?: Database["public"]["Enums"]["metodo_t"] | null
          owner_id?: string
          tipo?: Database["public"]["Enums"]["tipo_recorrencia_t"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recorrencias_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "v_cartoes_household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_cartoes_household: {
        Row: {
          apelido: string | null
          ativo: boolean | null
          dia_fechamento: number | null
          dia_vencimento: number | null
          id: string | null
          owner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_renda_household: {
        Row: {
          competencia: string | null
          owner_id: string | null
          renda_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receitas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analise_categorias: {
        Args: { p_visao: string; p_competencia: string }
        Returns: {
          categoria_id: string
          slug: string
          nome: string
          icone: string
          cor: string
          grupo: Database["public"]["Enums"]["grupo_categoria_t"]
          ordem: number
          valor: number
        }[]
      }
      analise_metodo: {
        Args: { p_visao: string; p_competencia: string }
        Returns: { credito: number; a_vista: number }[]
      }
      comprometimento_futuro: {
        Args: { p_visao: string; p_competencia: string; p_meses?: number }
        Returns: { competencia: string; valor: number; credito: number }[]
      }
      evolucao_mensal: {
        Args: { p_visao: string; p_competencia: string; p_meses?: number }
        Returns: { competencia: string; renda: number; gasto: number }[]
      }
      limite_por_cartao: {
        Args: { p_competencia: string }
        Returns: { cartao_id: string; apelido: string; limite: number | null; comprometido: number }[]
      }
      exportar_lancamentos: {
        Args: { p_visao: string; p_de: string; p_ate: string }
        Returns: {
          competencia: string
          vencimento: string
          data_compra: string
          descricao: string
          categoria: string
          grupo: Database["public"]["Enums"]["grupo_categoria_t"]
          escopo: Database["public"]["Enums"]["escopo_t"]
          metodo: Database["public"]["Enums"]["metodo_t"]
          natureza: Database["public"]["Enums"]["natureza_t"]
          cartao: string | null
          parcela: string
          valor: number
          status: Database["public"]["Enums"]["status_parcela_t"]
          pago_em: string | null
          pago_por: string | null
        }[]
      }
      a_vencer: {
        Args: { p_escopo: Database["public"]["Enums"]["escopo_t"]; p_dias?: number }
        Returns: {
          parcela_id: string
          lancamento_id: string
          descricao: string
          categoria_slug: string
          categoria_nome: string
          categoria_cor: string
          categoria_icone: string
          metodo: Database["public"]["Enums"]["metodo_t"]
          cartao_apelido: string | null
          numero: number
          parcelas_total: number
          valor: number
          vencimento: string
          competencia: string
          dias_restantes: number
          pago_por: string
        }[]
      }
      cancelar_lancamento: {
        Args: { p_lancamento_id: string }
        Returns: number
      }
      criar_household: { Args: { p_nome: string }; Returns: string }
      criar_lancamento: {
        Args: {
          p_cartao_id?: string
          p_categoria_id: string
          p_data_compra: string
          p_descricao: string
          p_escopo: Database["public"]["Enums"]["escopo_t"]
          p_household_id?: string
          p_metodo: Database["public"]["Enums"]["metodo_t"]
          p_natureza?: Database["public"]["Enums"]["natureza_t"]
          p_pago_por?: string
          p_parcelas: Json
          p_parcelas_total: number
          p_valor_total: number
        }
        Returns: string
      }
      definir_rateio: { Args: { p_meu_percentual: number }; Returns: undefined }
      entrar_household: { Args: { p_codigo: string }; Returns: string }
      fn_hoje_local: { Args: never; Returns: string }
      fn_mes_esta_fechado: {
        Args: {
          p_comp: string
          p_escopo: Database["public"]["Enums"]["escopo_t"]
          p_household: string
          p_owner: string
        }
        Returns: boolean
      }
      fn_meu_household: { Args: never; Returns: string }
      fn_sou_membro: { Args: { p_household: string }; Returns: boolean }
      garantir_salario: { Args: { p_competencia: string }; Returns: undefined }
      gasto_por_categoria: {
        Args: { p_escopo: Database["public"]["Enums"]["escopo_t"]; p_competencia: string }
        Returns: {
          categoria_id: string
          slug: string
          nome: string
          icone: string
          cor: string
          grupo: Database["public"]["Enums"]["grupo_categoria_t"]
          ordem: number
          valor: number
          teto: number | null
        }[]
      }
      gerar_recorrencia: {
        Args: { p_recorrencia_id: string; p_competencia: string; p_data: string; p_parcela: Json }
        Returns: string | null
      }
      gerar_salarios: { Args: { p_competencia: string }; Returns: number }
      gerar_codigo_convite: {
        Args: { p_household_id: string }
        Returns: string
      }
      recorrencias_pendentes: {
        Args: { p_competencia: string }
        Returns: {
          ativo: boolean
          cartao_id: string | null
          categoria_id: string | null
          created_at: string
          descricao: string
          dia_vencimento: number
          escopo: Database["public"]["Enums"]["escopo_t"]
          fim: string | null
          household_id: string | null
          id: string
          inicio: string
          metodo: Database["public"]["Enums"]["metodo_t"] | null
          owner_id: string
          tipo: Database["public"]["Enums"]["tipo_recorrencia_t"]
          valor: number
        }[]
        SetofOptions: {
          from: "*"
          to: "recorrencias"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      resumo_mes: {
        Args: { p_escopo: Database["public"]["Enums"]["escopo_t"]; p_competencia: string }
        Returns: {
          renda: number
          gasto: number
          reserva: number
          resgate: number
          credito: number
          sobra: number
          taxa_poupanca: number
          comprometimento: number
        }[]
      }
      saldo_casal: {
        Args: { p_household_id: string }
        Returns: {
          devido: number
          pago: number
          saldo: number
          user_id: string
        }[]
      }
    }
    Enums: {
      escopo_t: "pessoal" | "compartilhado"
      grupo_categoria_t: "despesa" | "reserva"
      metodo_t: "credito" | "a_vista"
      natureza_t: "saida" | "resgate"
      status_parcela_t: "pendente" | "pago" | "cancelado"
      tipo_receita_t: "salario" | "extra"
      tipo_recorrencia_t: "despesa" | "receita"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      escopo_t: ["pessoal", "compartilhado"],
      grupo_categoria_t: ["despesa", "reserva"],
      metodo_t: ["credito", "a_vista"],
      natureza_t: ["saida", "resgate"],
      status_parcela_t: ["pendente", "pago", "cancelado"],
      tipo_receita_t: ["salario", "extra"],
      tipo_recorrencia_t: ["despesa", "receita"],
    },
  },
} as const
