import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../../page";
import { getLeagueData } from "../../lib/sleeper";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const data = await getLeagueData();
  const profile = data.chaos.franchises.find(
    (franchise) => franchise.userId === userId,
  );
  if (!profile) return {};
  return {
    title: `${profile.teamName} | Game of Inches`,
    description: `${profile.manager}'s Game of Inches franchise dossier, career record, rivals, keeper history, and league receipts.`,
  };
}

export default async function FranchisePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const data = await getLeagueData();
  if (
    !data.chaos.franchises.some((franchise) => franchise.userId === userId)
  ) {
    notFound();
  }
  return <Home activePage="profile" profileUserId={userId} />;
}
