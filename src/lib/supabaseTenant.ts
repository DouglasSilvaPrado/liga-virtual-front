import { supabase } from './supabaseClient';

export function fromTenant(table: string) {
  return supabase.from(table);
}
