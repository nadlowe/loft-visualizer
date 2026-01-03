import { Face, Plane3, Polygon, Polyline2 } from "./geom/geomTypes";
import { plane3New } from "./geom/plane3";

/**
 * Creates a Pac-Man shape polygon.
 * @param radius - Radius of the Pac-Man circle
 * @param mouthAngle - Angle of the mouth opening in radians (default: Math.PI / 3 = 60 degrees)
 * @param eyeRadius - Radius of the eye hole
 * @param eyeOffsetX - X offset of the eye from center
 * @param eyeOffsetY - Y offset of the eye from center
 */
export function createPacManPolygon(
  radius: number = 1,
  mouthAngle: number = Math.PI / 3,
  eyeRadius: number = 0.15,
  eyeOffsetX: number = 0.3,
  eyeOffsetY: number = 0.4
): Polygon {
  const segments = 32; // Number of segments for the circle
  const outer: number[] = [];

  // Pac-Man mouth: start at center, go to right edge, around circle, back to left edge, close to center
  // Right edge of mouth (pointing right, negative angle)
  const rightMouthAngle = -mouthAngle / 2;
  const leftMouthAngle = mouthAngle / 2;

  // Start at center (0, 0)
  outer.push(0, 0);

  // Go to right edge of mouth
  outer.push(
    radius * Math.cos(rightMouthAngle),
    radius * Math.sin(rightMouthAngle)
  );

  // Go around the circle from right edge to left edge (CCW)
  // Arc goes from rightMouthAngle to leftMouthAngle, wrapping around
  // Total arc angle = 2*PI - mouthAngle
  const totalArcAngle = 2 * Math.PI - mouthAngle;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const angle = rightMouthAngle + totalArcAngle * t;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    outer.push(x, y);
  }

  // Add left edge of mouth (explicitly, to ensure we hit it exactly)
  outer.push(
    radius * Math.cos(leftMouthAngle),
    radius * Math.sin(leftMouthAngle)
  );

  // Close back to center (polygon will auto-close, but explicit is clearer)
  outer.push(0, 0);

  // Create the eye hole (small circle, CW)
  const eyeSegments = 16;
  const eyeHole: number[] = [];
  for (let i = 0; i <= eyeSegments; i++) {
    const angle = (2 * Math.PI * i) / eyeSegments;
    const x = eyeOffsetX + eyeRadius * Math.cos(angle);
    const y = eyeOffsetY + eyeRadius * Math.sin(angle);
    eyeHole.push(x, y);
  }

  return [outer, eyeHole];
}

export function createSquareWithHoleOnUpperRightCornerPolygon(): Polygon {
  // Create a 2x2 square (from -1 to 1 in both x and y, centered at origin)
  // Outer boundary (CCW)
  const outer: Polyline2 = [
    -1,
    -1.5, // bottom-left
    1,
    -1, // bottom-right
    1,
    1, // top-right
    -1,
    1, // top-left
    -1,
    -1, // close back to start
  ];

  // Create hole in upper right corner (at 1, 1)
  // Hole should be CW (clockwise) for proper rendering
  const hole: Polyline2 = [
    0.8,
    0.8, // bottom-left
    0.9,
    0.8, // bottom-right
    0.9,
    0.9, // top-right
    0.8,
    0.9, // top-left
    0.8,
    0.8, // close back to start
  ];

  return [outer, hole];
}

/**
 * Creates a Pac-Man face on a flat XY plane (kernel coordinates).
 * In kernel: z is up, so normal [0, 0, 1] means flat on XY plane.
 */
export function placePolygonOnFace(
  centerX: number = 0,
  centerY: number = 0,
  centerZ: number = 0,
  polygon: Polygon
): Face {
  const plane = plane3New([centerX, centerY, centerZ], [0, 0, 1]);

  return {
    plane,
    polygon,
  };
}

/**
 * Creates a Pac-Man face on a tilted plane.
 * The plane is rotated 45 degrees around the X axis.
 * In kernel: normal [0, 0.707, 0.707] means tilted up.
 */
export function createTiltedPacMan(
  centerX: number = 0,
  centerY: number = 0,
  centerZ: number = 0,
  tiltAngle: number = Math.PI / 4 // 45 degrees
): Face {
  // Normal vector: rotate [0, 0, 1] around X axis by tiltAngle
  // In kernel: z is up, so rotating around x means y and z change
  const normal: [number, number, number] = [
    0,
    Math.sin(tiltAngle), // y component
    Math.cos(tiltAngle), // z component (up)
  ];

  const plane = plane3New([centerX, centerY, centerZ], normal);

  return {
    plane,
    polygon: createPacManPolygon(),
  };
}

/**
 * Test data: Multiple Pac-Man faces in different positions and orientations
 */
export const testPacManFaces: Face[] = [
  // Flat Pac-Man at origin
  placePolygonOnFace(0, 0, 0, createPacManPolygon()),

  // Flat Pac-Man offset to the right
  placePolygonOnFace(3, 3, 0, createSquareWithHoleOnUpperRightCornerPolygon()),

  // Tilted Pac-Man (45 degrees up)
  //createTiltedPacMan(0, 3, 0, Math.PI / 4),

  // Tilted Pac-Man (60 degrees up)
  //createTiltedPacMan(3, 3, 0, Math.PI / 3),
];
