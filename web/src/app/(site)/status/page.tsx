import type { Metadata } from "next";
import { StatusView } from "@/components/ModulePages";

export const metadata: Metadata = { title: "Creator levels" };

export default function Page() {
  return <StatusView />;
}
