"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {  CompetitionWithSettings } from "@/@types/competition";
import EditCompetitionModal from './EditCompetitionModal';

export default function EditCompetitionButton({ competition }: { competition:  CompetitionWithSettings}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-8 w-8"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <EditCompetitionModal
        open={open}
        onOpenChange={setOpen}
        competition={competition}
      />
    </>
  );
}
