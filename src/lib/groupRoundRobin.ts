export function generateGroupRounds(teamIds: string[]) {
  const teams = [...teamIds];

  // Se ímpar, adiciona bye
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }

  const rounds: { home: string; away: string }[][] = [];
  const totalRounds = teams.length - 1;
  const half = teams.length / 2;

  for (let round = 0; round < totalRounds; round++) {
    const matches: { home: string; away: string }[] = [];

    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];

      if (home !== 'BYE' && away !== 'BYE') {
        matches.push({ home, away });
      }
    }

    rounds.push(matches);

    // Rotaciona mantendo o primeiro fixo
    teams.splice(1, 0, teams.pop()!);
  }

  return rounds;
}
