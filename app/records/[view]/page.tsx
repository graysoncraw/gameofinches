import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../../page";

const VIEWS: Record<string, { activePage: string; title: string }> = {
  rivalries: {
    activePage: "records-rivalries",
    title: "Rivalries",
  },
  performances: {
    activePage: "records-performances",
    title: "Top Performances",
  },
  superlatives: {
    activePage: "records-superlatives",
    title: "League Superlatives",
  },
  book: {
    activePage: "records-book",
    title: "League Record Book",
  },
  elo: {
    activePage: "records-elo",
    title: "Elo Rankings",
  },
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ view: string }>;
}): Promise<Metadata> {
  const { view } = await params;
  const page = VIEWS[view];
  return page ? { title: `${page.title} | Game of Inches` } : {};
}

export default async function RecordsViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  const page = VIEWS[view];
  if (!page) notFound();
  return <Home activePage={page.activePage} />;
}
