'use client';

import { Label } from '@/components/ui/label';

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showLockedMessage?: boolean;
}

export default function RoleSelect({
  value,
  onChange,
  disabled = false,
  showLockedMessage = false,
}: RoleSelectProps) {
  return (
    <div>
      <Label>Role</Label>

      <select
        className={`w-full rounded-md border p-2 ${
          disabled ? 'cursor-not-allowed bg-gray-100' : ''
        }`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="owner">Dono</option>
        <option value="admin">Administrador</option>
        <option value="member">Membro</option>
      </select>

      {showLockedMessage && disabled && (
        <p className="mt-1 text-xs text-gray-500">Somente o Dono pode editar o papel.</p>
      )}
    </div>
  );
}
