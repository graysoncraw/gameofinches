import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../page";

const SECTIONS = new Set([
  "chaos",
  "teams",
  "history",
  "records",
  "drafts",
  "moves",
  "keepers",
]);

const TITLES: Record<string, string> = {
  chaos: "The Gazette & League Chaos",
  teams: "Teams",
  history: "League History",
  records: "Records & Rivalries",
  drafts: "Draft Archive",
  moves: "Transaction History",
  keepers: "Keeper Board",
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  if (!SECTIONS.has(section)) return {};
  return {
    title: `${TITLES[section]} | Game of Inches`,
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!SECTIONS.has(section)) notFound();
  return <Home activePage={section} />;
}
