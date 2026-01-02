"use client";

import { useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface InfiniteGridProps {
    cellSize?: number;
    sectionSize?: number;
    majorSectionSize?: number;
    gridWidth?: number;
    sectionWidth?: number;
    majorSectionWidth?: number;
    colorGrid?: THREE.Color | string | number;
    minCellSizePixels?: number; // Minimum screen-space size (in pixels) before hiding grid lines
}

export function InfiniteGrid({
    cellSize = 1,
    sectionSize = 12,
    majorSectionSize = 120,
    gridWidth = 0.02,
    sectionWidth = 0.006,
    majorSectionWidth = 0.0006, // Same as sectionWidth for consistent visual thickness
    colorGrid = "#888888",
    minCellSizePixels = 20, // Hide grid lines when cell is < 20 pixels on screen
}: InfiniteGridProps) {
    const { camera, size } = useThree();
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const shaderMaterial = useMemo(() => {
        const gridColor = new THREE.Color(colorGrid);

        return new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            uniforms: {
                uCellSize: { value: cellSize },
                uSectionSize: { value: sectionSize },
                uMajorSectionSize: { value: majorSectionSize },
                uGridWidth: { value: gridWidth },
                uSectionWidth: { value: sectionWidth },
                uMajorSectionWidth: { value: majorSectionWidth },
                uGridColor: { value: gridColor },
                uMinCellSizePixels: { value: minCellSizePixels },
                uViewScale: { value: 1.0 }, // Updated in useFrame
            },
            vertexShader: `
                varying vec3 worldPosition;
                void main() {
                    worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uCellSize;
                uniform float uSectionSize;
                uniform float uMajorSectionSize;
                uniform float uGridWidth;
                uniform float uSectionWidth;
                uniform float uMajorSectionWidth;
                uniform vec3 uGridColor;
                uniform float uMinCellSizePixels;
                uniform float uViewScale;
                varying vec3 worldPosition;
                
                void main() {
                    vec2 coord = worldPosition.xz;
                    
                    // Calculate screen-space size of grid cells
                    float gridCellScreenSize = uCellSize * uViewScale;
                    float sectionCellScreenSize = uSectionSize * uViewScale;
                    float majorSectionCellScreenSize = uMajorSectionSize * uViewScale;
                    
                    // Only draw grid lines if cell is large enough on screen
                    float gridAlpha = 0.0;
                    if (gridCellScreenSize >= uMinCellSizePixels) {
                        vec2 grid = fract(coord / uCellSize);
                        grid = min(grid, 1.0 - grid);
                        grid = grid * 2.0;
                        float gridLineDist = min(grid.x, grid.y);
                        gridAlpha = step(gridLineDist, uGridWidth);
                    }
                    
                    // Only draw section lines if cell is large enough on screen
                    float sectionAlpha = 0.0;
                    if (sectionCellScreenSize >= uMinCellSizePixels) {
                        vec2 section = fract(coord / uSectionSize);
                        section = min(section, 1.0 - section);
                        section = section * 2.0;
                        float sectionLineDist = min(section.x, section.y);
                        sectionAlpha = step(sectionLineDist, uSectionWidth);
                    }
                    
                    // Only draw major section lines if cell is large enough on screen
                    float majorSectionAlpha = 0.0;
                    if (majorSectionCellScreenSize >= uMinCellSizePixels) {
                        vec2 majorSection = fract(coord / uMajorSectionSize);
                        majorSection = min(majorSection, 1.0 - majorSection);
                        majorSection = majorSection * 2.0;
                        float majorSectionLineDist = min(majorSection.x, majorSection.y);
                        majorSectionAlpha = step(majorSectionLineDist, uMajorSectionWidth);
                    }
                    
                    // Combine
                    float alpha = max(max(gridAlpha, sectionAlpha), majorSectionAlpha);
                    gl_FragColor = vec4(uGridColor, alpha * 0.6);
                }
            `,
            transparent: true,
            depthWrite: false,
        });
    }, [
        cellSize,
        sectionSize,
        majorSectionSize,
        gridWidth,
        sectionWidth,
        majorSectionWidth,
        colorGrid,
        minCellSizePixels,
    ]);

    // Update view scale based on camera zoom/distance
    useFrame(() => {
        if (!materialRef.current) return;

        let viewScale: number;
        if (camera instanceof THREE.OrthographicCamera) {
            // Orthographic: account for zoom property
            const height = (camera.top - camera.bottom) / camera.zoom;
            viewScale = size.height / height;
        } else {
            // Perspective: estimate based on distance to grid plane
            const distance = camera.position.y; // Distance to XZ plane
            const fov =
                (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
            const viewHeight = 2.0 * distance * Math.tan(fov / 2.0);
            viewScale = size.height / viewHeight;
        }

        materialRef.current.uniforms.uViewScale.value = viewScale;
    });

    const planeGeometry = useMemo(() => {
        return new THREE.PlaneGeometry(2000, 2000);
    }, []);

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
            geometry={planeGeometry}
            material={shaderMaterial}
            renderOrder={-1}
        >
            <primitive
                ref={materialRef}
                object={shaderMaterial}
                attach="material"
            />
        </mesh>
    );
}
