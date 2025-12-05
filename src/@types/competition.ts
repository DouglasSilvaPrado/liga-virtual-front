export interface Competition {
  id: string;
  tenant_id: string;
  championship_id: string;
  name: string;
  type: string;
  rules: string | null;
  created_at: string;
  competition_url: string | null;
}
