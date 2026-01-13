import { Doc } from "@/lib/doc/doc";
import { uid } from "@/lib/util/uid";

export function defaultDocInit(): Doc {
  return {
    id: uid(),
    name: "Untitled",
    workPlanes: {},
    polylines: {},
    lofts: {},
  };
}
