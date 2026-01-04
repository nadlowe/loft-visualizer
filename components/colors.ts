export const colors = {
  // Background colors
  bg: {
    primary: "bg-[#2C2C2C]",
    secondary: "bg-[#3A3A3A]",
    tertiary: "bg-[#1E1E1E]",
    input: "bg-[#3A3A3A]",
    deleteHover: "bg-[#4A2A2A]",
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
} as const;
