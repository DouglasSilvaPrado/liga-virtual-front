"use client";

import { Shield } from "@/@types/shield";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ShieldStatusBadge from "./ShieldStatusBadge";

export default function ShieldsTable({ shields }: { shields: Shield[] }) {
  return (
    <div className="overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imagem</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Sigla</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {shields.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Image
                  src={s.image_url ?? s.shield_url}
                  width={40}
                  height={40}
                  alt={s.name}
                  className="rounded-md"
                />
              </TableCell>

              <TableCell className="font-semibold">{s.name}</TableCell>

              <TableCell>{s.abbreviation}</TableCell>

              <TableCell>
                <ShieldStatusBadge status={s.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
