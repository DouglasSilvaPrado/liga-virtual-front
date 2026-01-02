// COMPETITION BASE
export interface Competition {
  id: string;
  tenant_id: string;
  championship_id: string;
  name: string;
  type: CompetitionType;
  rules: string | null;
  competition_url: string | null;
  created_at?: string;
}

export type CompetitionType =
  | 'divisao'
  | 'divisao_mata'
  | 'copa_grupo'
  | 'copa_grupo_mata'
  | 'mata_mata'
  | string;

// SETTINGS BASE
export interface CompetitionSettings {
  id: string;
  tenant_id: string;
  competition_id: string;
  settings: CompetitionSettingsData;
}

// MATCH SETTINGS
export interface MatchSettings {
  multa_wo: number;
  premio_gol: number;
  pontos_empate: number;
  premio_empate: number;
  cartao_amarelo: number;
  pontos_derrota: number;
  pontos_vitoria: number;
  premio_derrota: number;
  premio_vitoria: number;
  cartao_vermelho: number;
  melhor_jogador_partida: boolean;
  mostrar_gols_artilharia: boolean;
}

// SPECIFIC TYPE PER COMPETITION
export interface CopaGrupoSpecific {
  ida_volta: boolean;
  num_grupos: number;
}

export interface MataMataSpecific {
  jogos_ida_volta: boolean;
}

export interface DivisaoSpecific {
  qtd_times: number;
  subida: number;
  descida: number;
}

export type CompetitionSpecific =
  | CopaGrupoSpecific
  | MataMataSpecific
  | DivisaoSpecific
  | Record<string, unknown>;

// ROOT SETTINGS
export interface CompetitionSettingsData {
  format: CompetitionType;
  specific: CompetitionSpecific;
  match_settings: MatchSettings;
  divisionSettings?: DivisionSettings;
}

// VIEW
export interface CompetitionWithSettings extends Competition {
  competition_settings_id: string;
  settings: CompetitionSettingsData;
}

export interface DivisionSettings {
  divisao_rebaixamento_competition_id?: string | null;
  divisao_acesso_competition_id?: string | null;
}

export interface CompetitionGroup {
  id: string;
  competition_id: string;
  tenant_id: string;
  code: string;
  name: string;
  created_at: string;
}
export interface CompetitionTeam {
  id: string;
  competition_id: string;
  team_id: string;
  tenant_id: string;
  championship_id: string;
  group_id: string;
  created_at: string;
}

function hasJogosIdaVolta(specific: CompetitionSpecific): specific is MataMataSpecific {
  return typeof specific === 'object' && specific !== null && 'jogos_ida_volta' in specific;
}
