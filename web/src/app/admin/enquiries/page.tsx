import { LeadsBoard } from "@/components/leads-board";

export default async function Page({ searchParams }: { searchParams: Promise<{ stage?: string; q?: string; mine?: string }> }) {
  return <LeadsBoard type="enquiry" params={await searchParams} />;
}
