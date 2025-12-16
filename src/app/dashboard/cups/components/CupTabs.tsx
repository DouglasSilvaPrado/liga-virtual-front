// components/CupTabs.tsx
"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function CupTabs({
  competitionId,
}: {
  competitionId: string;
}) {
  return (
    <Tabs defaultValue="groups">
      <TabsList>
        <TabsTrigger value="teams">Times</TabsTrigger>
        <TabsTrigger value="groups">Grupos</TabsTrigger>
        <TabsTrigger value="matches">Jogos</TabsTrigger>
        <TabsTrigger value="standings">Classificação</TabsTrigger>
        <TabsTrigger value="knockout">Mata-mata</TabsTrigger>
      </TabsList>

      <TabsContent value="teams">
        {/* listagem competition_teams */}
      </TabsContent>

      <TabsContent value="groups">
        {/* grupos + times */}
      </TabsContent>

      <TabsContent value="matches">
        {/* jogos da copa */}
      </TabsContent>

      <TabsContent value="standings">
        {/* standings por grupo */}
      </TabsContent>

      <TabsContent value="knockout">
        {/* chave mata-mata */}
      </TabsContent>
    </Tabs>
  );
}