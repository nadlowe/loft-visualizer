# Info

## Requirements

### 1. Build an app that allows the user to create, visualize, and edit lofts.

### 2. Create a loft

Two or more sketches positioned in 3D space.

- A sketch is a closed polygon defined by a sequence of 2D vertices.
- The input sketches may contain a different number of edges/vertices.

Create sketches and loft them.

- Lofting pairs of sketches creates faces that connect the edges of the sketches.
- The edges may not be parallel to each other, so the faces could be curved.

### 3. Visualize a loft

Generate geometry to visualize the appearance of the loft.

### 4. Edit the loft

After the loft is created, the user should be able to edit it.
Some operations change the entire loft, but others are more “localized”, affecting only a part of the loft.

The following operations should be supported:

- Rotating an input sketch along its normal axis, causing the loft to twist.
- Moving vertices in a sketch.
- Merging adjacent vertices in a sketch.
- Inserting a new vertex along the edge of a sketch, splitting that edge into two.

Scenario 1: The user loft the two sketches, then rotates the top sketch 60 degrees. (Twisted shape)

Scenario 2: The user rotates the top sketch 60 degrees, then lofts the two
sketches.

These two sequences of operations may generate different lofts, because
different vertices/edges get paired between the two sketches to form faces.

### 5. Optional (addressed)

- Non-parallel input sketches.
- Interactive editing in 3D view/SketchUp-like experience.

## Data Model Decisions

1. Store polylines as arrays of numbers... odd and even for x and y.
2. Store vectors as tuples for more compact serialized form.
3. Don't use direct memory Float64Array representation for polylines, since perf/serialization complexity is not the focus of the code challenge.

## Strategies

1. Strict Nulls (strict mode), Linting rules = Agent efficiency
2. Cycle Detection Watch
3. Dead/Unused Code Detection

## Guiding Principles

1. Physical Interaction and Permanence
   - On vertex edits, seam should appear to "stay in place" in as much is possible.
   - Dragging manipulates the geometry in real-time.

2. Simple Normalized Table Entity Model
3. Follow CAD / modeling conventions in as much is possible
