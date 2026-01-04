export type Polyline2 = number[];

export type Polygon = Polyline2[];

export type Vec2 = [number, number];

export type Vec3 = [number, number, number];

export interface Plane3 {
  readonly origin: Vec3;
  readonly normal: Vec3;
  readonly u?: Vec3;
}

export interface Face {
  readonly plane: Plane3;
  readonly polygon: Polygon;
}
