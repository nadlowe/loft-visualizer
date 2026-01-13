# Loft Visualizer

Deployed at [https://loft-visualizer.vercel.app/](https://loft-visualizer.vercel.app/)

### Getting Started Locally

First, run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Project Setup

See [package.json](package.json) for scripts.

See [setup.md](setup.md) for detailed project setup.

### Directory Structure

```
.
├── app
│   └── editor           (page.tsx - main landing)
├── components
│   ├── canvas           (Scene.tsx - threejs canvas)
│   │   ├── cmd
│   │   ├── polylineVertexEditing
│   │   └── render       (Entity Render Logic)
│   └── ui
│       ├── explorer     (left pane)
│       └── inspector    (right pane)
├── hooks
├── lib
│   ├── conversion       (between geom and three)
│   ├── debug            (drop-in visualizer for geometry)
│   ├── doc              (structure for state/persistence)
│   ├── entity
│   │   ├── entityTools
│   │   └── handleTools
│   ├── generate         (generateLoft)
│   ├── geom             (geometry types and ops)
│   ├── snap
│   └── util
├── store                (zustand store for app state)
│   └── cmd
└── test                 (geometry unit tests)
```
