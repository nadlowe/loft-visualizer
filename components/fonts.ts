export const fonts = {
  // Font sizes
  size: {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  },

  // Font weights
  weight: {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  },

  // Common font combinations
  menu: "text-sm font-medium",
  menuItem: "text-sm font-medium",
  menuLabel: "text-xs font-semibold tracking-wide uppercase",
  dialogTitle: "text-lg font-semibold",
  dialogBody: "text-sm font-medium",
  dialogEmpty: "text-sm text-gray-400",
  button: "text-sm font-medium",
  input: "text-sm font-medium",
  documentName: "text-sm font-semibold",
} as const;
