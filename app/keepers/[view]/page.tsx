import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../../page";

const VIEWS: Record<string, { activePage: string; title: string }> = {
  rules: {
    activePage: "keepers-rules",
    title: "Keeper Rules",
  },
  lab: {
    activePage: "keepers-lab",
    title: "Keeper Lab",
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

export default async function KeepersViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  const page = VIEWS[view];
  if (!page) notFound();
  return <Home activePage={page.activePage} />;
}
