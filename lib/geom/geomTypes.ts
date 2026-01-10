export type Polyline2 = number[];

export type Vec2 = [number, number];

export type Vec3 = [number, number, number];

export interface Plane3 {
  readonly origin: Vec3;
  readonly normal: Vec3;
  readonly u?: Vec3;
}
