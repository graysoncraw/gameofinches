import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../../../page";
import { getLeagueData } from "../../../lib/sleeper";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string; week: string }>;
}): Promise<Metadata> {
  const { season, week } = await params;
  return {
    title: `${season} Week ${week} Gazette | Game of Inches`,
    description: `The Game of Inches Gazette recap for ${season}, Week ${week}.`,
  };
}

export default async function GazetteEdition({
  params,
}: {
  params: Promise<{ season: string; week: string }>;
}) {
  const { season, week } = await params;
  const parsedWeek = Number(week);
  if (!/^\d{4}$/.test(season) || !Number.isInteger(parsedWeek)) notFound();
  const data = await getLeagueData();
  if (
    !data.chaos.recaps.some(
      (recap) => recap.season === season && recap.week === parsedWeek,
    )
  ) {
    notFound();
  }
  return (
    <Home
      activePage="chaos"
      initialRecap={{ season, week: parsedWeek }}
    />
  );
}
