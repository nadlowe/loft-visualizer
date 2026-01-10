import { uid } from "../util/uid";
import { Doc } from "./doc";

export function defaultDocInit(): Doc {
  return {
    id: uid(),
    name: "Untitled",
    workPlanes: {},
    polylines: {},
    lofts: {},
  };
}
