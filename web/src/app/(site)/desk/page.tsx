import type { Metadata } from "next";
import { DeskView } from "@/components/DeskView";

export const metadata: Metadata = { title: "My campaigns" };

export default function Page() {
  return <DeskView />;
}
