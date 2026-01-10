export const colors = {
  // Background colors
  bg: {
    primary: "bg-[#2C2C2C]",
    secondary: "bg-[#3A3A3A]",
    input: "bg-[#3A3A3A]",
    selected: "bg-[#3A4A5A]",
    deleteSelected: "bg-[#4A2A2A]",
    red: "bg-red-600",
    redHover: "bg-red-700",
    gray: "bg-gray-600",
  },

  // Text colors
  text: {
    primary: "text-gray-200",
    secondary: "text-gray-400",
    hover: "text-gray-200",
    selected: "text-blue-400",
    delete: "text-red-400",
  },

  // Border colors
  border: {
    primary: "border-[#1E1E1E]",
    input: "border-[#4A4A4A]",
    focus: "border-blue-500",
  },

  // Toggle switch colors
  toggle: {
    on: "bg-blue-500",
    off: "bg-gray-600",
  },

  // Selection window overlay
  selectionWindow: {
    border: "border-blue-500",
    bg: "bg-blue-500/10",
  },

  // Resize handle
  resize: {
    hover: "hover:bg-blue-500",
  },

  // Three.js numeric colors (for canvas)
  canvas: {
    selected: 0x3b82f6,
    unselected: 0x888888,
    white: 0xffffff,
    workPlane: 0xffd700,
    grid: 0xcccccc,
    axis: {
      x: 0xff0000,
      y: 0x00ff00,
      z: 0x0000ff,
    },
  },
} as const;
