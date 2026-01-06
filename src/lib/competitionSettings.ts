import { CompetitionSettingsData } from '@/@types/competition';

export function normalizeCompetitionSettings(settings: unknown): CompetitionSettingsData | null {
  if (!settings) return null;

  if (typeof settings === 'object') {
    return settings as CompetitionSettingsData;
  }

  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings) as CompetitionSettingsData;
    } catch {
      return null;
    }
  }

  return null;
}
