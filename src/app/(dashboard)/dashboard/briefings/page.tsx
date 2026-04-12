import { getAllMyBriefings } from "@/app/actions/briefings";
import BriefingsClient from "./briefings-client";

export default async function BriefingsIndexPage() {
  const briefings = await getAllMyBriefings();
  return <BriefingsClient briefings={briefings} />;
}
