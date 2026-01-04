import { Doc } from "./doc";

export function defaultDocNew(): Doc {
  return {
    workPlanes: {},
    polylines: {},
    lofts: {},
  };
}
