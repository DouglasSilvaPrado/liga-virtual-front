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
import DeleteShieldModal from './DeleteShieldModal';
import { isSofifa } from '@/util/isSofifa';

export default function ShieldsTable({
  shields,
  tenant_member_id,
  tenant_member_role
}: {
  shields: Shield[];
  tenant_member_id: string;
  tenant_member_role: string;
}) {
  

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
          {shields.map((s) => {
            const canEdit = s.tenant_member_id === tenant_member_id;
            const canDelete =
              s.tenant_id !== null && 
              (s.tenant_member_id === tenant_member_id || tenant_member_role === "owner");

            return (
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

                <TableCell className="flex gap-2">
                  {canEdit && (
                    <EditShieldModal
                      shield={s}
                      tenant_member_role={tenant_member_role}
                    />
                  )}

                  {canDelete && (
                    <DeleteShieldModal
                      shield={s}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
