/** ART: public surface of the art module. Everything else is internal.
 *  Unknown ids render null; ART_ENABLED=false renders null everywhere. */
import type { UnitId } from "@/types/content";
import { ART_ENABLED } from "./config";
import { ArtStill } from "./ArtFrame";
import { UNIT_ART } from "./unitArt";
import { SKILL_ART } from "./skillArt";

export function UnitArt({
  unitId,
  className,
  still = false,
}: {
  unitId: UnitId;
  className?: string;
  still?: boolean;
}) {
  if (!ART_ENABLED) return null;
  const C = UNIT_ART[unitId];
  if (!C) return null;
  const node = <C className={className} />;
  return still ? <ArtStill>{node}</ArtStill> : node;
}

export function SkillArt({
  skillId,
  className,
  still = false,
}: {
  skillId: string;
  className?: string;
  still?: boolean;
}) {
  if (!ART_ENABLED) return null;
  const C = SKILL_ART[skillId];
  if (!C) return null;
  const node = <C className={className} />;
  return still ? <ArtStill>{node}</ArtStill> : node;
}
