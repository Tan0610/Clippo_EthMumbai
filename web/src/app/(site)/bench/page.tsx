import type { Metadata } from "next";
import { BenchView } from "@/components/BenchView";

export const metadata: Metadata = { title: "Admin review" };

export default function Page() {
  return <BenchView />;
}
