import type { Metadata } from "next";
import { LedgerView } from "@/components/LedgerView";

export const metadata: Metadata = { title: "Earnings" };

export default function Page() {
  return <LedgerView />;
}
