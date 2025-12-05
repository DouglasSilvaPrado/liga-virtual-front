import { redirect } from "next/navigation";

export default function ChampionshipPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/management/championships/${params.id}/competitions`);
}
