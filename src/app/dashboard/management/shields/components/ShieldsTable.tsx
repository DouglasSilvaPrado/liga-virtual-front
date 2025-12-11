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
import EditShieldModal from './EditShieldModal';

export default function ShieldsTable({ shields, tenant_member_id }: { shields: Shield[]; tenant_member_id: string }) {
  function isSofifa(url?: string | null) {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.hostname === "cdn.sofifa.net";
    } catch {
      return false;
    }
  }

  
  return (
    <div className="overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imagem</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Sigla</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {shields.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                {isSofifa(s.shield_url) ? (
                  <Image
                    src={s.shield_url}
                    width={40}
                    height={40}
                    alt={s.name}
                    className="rounded-md object-cover"
                  />
                ) : (
                  <img
                    src={s.shield_url}
                    alt={s.name}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                )}
              </TableCell>

              <TableCell className="font-semibold">{s.name}</TableCell>

              <TableCell>{s.abbreviation}</TableCell>

              <TableCell>
                <ShieldStatusBadge status={s.status} />
              </TableCell>

              <TableCell>
                {s.tenant_member_id === tenant_member_id && (
                  <EditShieldModal shield={s} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
