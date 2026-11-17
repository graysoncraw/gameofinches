import type { Metadata } from "next";
import Home from "../../page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retired Teams | Game of Inches",
  description:
    "The former Game of Inches managers and complete franchise histories preserved in the league archive.",
};

export default function RetiredTeamsPage() {
  return <Home activePage="teams-retired" />;
}
