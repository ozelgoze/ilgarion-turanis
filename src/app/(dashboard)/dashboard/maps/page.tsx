import { getAllMyMaps } from "@/app/actions/maps";
import type { MapWithTeam } from "@/app/actions/maps";
import MapsClient from "./maps-client";

export default async function MapsIndexPage() {
  const maps = await getAllMyMaps();
  return <MapsClient maps={maps} />;
}
