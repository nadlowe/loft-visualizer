import { Doc } from "./doc";

export function defaultDocInit(): Doc {
  return {
    workPlanes: {},
    polylines: {},
    lofts: {},
  };
}
