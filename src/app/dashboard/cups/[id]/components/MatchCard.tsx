import { BracketMatch } from '@/@types/knockout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export function MatchCard({
  match,
  idaVolta,
}: {
  match: BracketMatch;
  idaVolta: boolean;
}) {
  const finished = match.status === 'finished';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={`relative ${
          finished ? 'border-green-500' : 'border-muted'
        }`}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={finished ? 'bg-green-600 text-white' : ''}
            >
              {finished ? 'Finalizado' : 'Agendado'}
            </Badge>

            {idaVolta && (
              <span className="text-xs text-muted-foreground">
                Jogo {match.leg}
              </span>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span>{match.team_home.name}</span> 
            <strong>
              {" "}{match.score_home ?? '-'} x {match.score_away ?? '-'}
            </strong>
            <span>{match.team_away.name}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
