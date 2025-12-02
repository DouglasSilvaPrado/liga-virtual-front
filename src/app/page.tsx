import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  return (
    <div className="mx-auto max-w-md p-10">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Componentes</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input placeholder="Digite algo..." />
          <Button>Enviar</Button>
        </CardContent>
      </Card>
    </div>
  );
}
