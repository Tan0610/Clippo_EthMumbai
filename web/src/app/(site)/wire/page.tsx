import type { Metadata } from "next";
import { WireView } from "@/components/WireView";

export const metadata: Metadata = { title: "Campaigns" };

export default function Page() {
  return <WireView />;
}
