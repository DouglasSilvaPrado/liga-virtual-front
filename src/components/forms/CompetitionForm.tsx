'use client';


import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';


export default function CompetitionForm() {
const [name, setName] = useState('');
const [type, setType] = useState('divisao');


async function handleSubmit(e: React.FormEvent) {
e.preventDefault();
const { data, error } = await supabase.from('competitions').insert({
name,
type,
});
console.log({ data, error });
}


return (
<form className="space-y-4 max-w-lg" onSubmit={handleSubmit}>
<Input placeholder="Nome da Competição" value={name} onChange={(e) => setName(e.target.value)} />


<select
value={type}
onChange={(e) => setType(e.target.value)}
className="border p-2 rounded w-full"
>
<option value="divisao">Divisão</option>
<option value="divisao_mata">Divisão + Mata-Mata</option>
<option value="copa_grupo">Copa Grupo</option>
<option value="copa_grupo_mata">Copa Grupo + Mata-Mata</option>
<option value="mata_mata">Mata-Mata</option>
</select>


<Button type="submit">Criar Competição</Button>
</form>
);
}