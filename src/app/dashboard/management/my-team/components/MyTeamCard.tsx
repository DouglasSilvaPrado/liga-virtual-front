'use client';

import { Shield } from '@/@types/shield';
import { Team } from '@/@types/team';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Shirt, MapPin, Flag } from 'lucide-react';
import { isSofifa } from '@/util/isSofifa';
import EditTeamModal from './EditTeamModal';

interface Props {
  team: Team;
  shield?: Shield | null;
}

export default function MyTeamCard({ team, shield }: Props) {
  const defaultShieldUrl = '/image/shieldDefault.png';
  const defaultUniformUrl = '/image/uniformDefault.jpg';

  const fixUrl = (fallback: string, url?: string | null) => {
    if (!url || url.trim() === '') return fallback;
    return url;
  };

  const shieldUrl = fixUrl(defaultShieldUrl, shield?.shield_url);

  return (
    <Card className="border-border/50 from-muted/60 to-background overflow-hidden rounded-2xl border bg-linear-to-b shadow-lg">
      <CardContent className="space-y-6 p-6">
        <EditTeamModal
          team={team}
          shield={shield}
          tenantId={team.tenant_id}
          tenantMemberId={team.tenant_member_id}
        />

        {/* HEADER */}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20">
            {isSofifa(shieldUrl) ? (
              <Image
                src={shieldUrl}
                alt={team.name}
                fill
                className="object-contain drop-shadow-md"
              />
            ) : (
              <img
                src={shieldUrl}
                alt={shield?.name || 'Escudo do time'}
                className="h-full w-full rounded-md object-cover"
              />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold">{team.name}</h2>
            <p className="text-muted-foreground text-sm">
              {shield?.abbreviation ? shield?.abbreviation : 'N/A'} •{' '}
              {shield?.country ? shield?.country : 'N/A'}
            </p>
          </div>
        </div>

        {/* COLORS */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Cor principal:</span>
          <div
            className="h-6 w-6 rounded-full border"
            style={{ background: shield?.main_color || '#ccc' }}
          ></div>
        </div>

        {/* EXTRAS */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-muted-foreground" />
            <span>
              <strong>Estádio:</strong> {shield?.stadium ? shield.stadium : 'Não informado'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Flag size={16} className="text-muted-foreground" />
            <span>
              <strong>País:</strong> {shield?.country ? shield?.country : 'N/A'}
            </span>
          </div>
        </div>

        {/* UNIFORMS */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <Shirt size={18} /> Uniformes
          </h3>

          <div className="grid grid-cols-3 gap-4">
            {[shield?.uniform_1_url, shield?.uniform_2_url, shield?.uniform_gk_url].map(
              (url, idx) => {
                const u = fixUrl(defaultUniformUrl, url);

                return (
                  <div key={idx} className="relative h-24 w-full">
                    {isSofifa(u) ? (
                      <Image
                        src={u}
                        alt={team.name}
                        fill
                        className="object-contain drop-shadow-md"
                      />
                    ) : (
                      <img
                        src={u}
                        alt={team.name}
                        className="h-full w-full object-contain drop-shadow-md"
                      />
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
