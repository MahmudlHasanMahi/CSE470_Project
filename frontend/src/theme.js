import { createTheme } from "@mui/material/styles";

export const colors = {
  cream: "#FFFBF5",
  sand: "#F7EFE5",
  lavender: "#C3ACD0",
  purple: "#7743DB",
  highlight: "#6f6f6f2a",
};
export const brandFont = '"Grand Hotel"';
export default createTheme({
  palette: {
    mode: "light",
    primary: { main: colors.purple, contrastText: colors.cream },
    secondary: { main: colors.lavender },
    background: { default: colors.cream, paper: colors.sand },
    text: { primary: "#2B2140", secondary: "#6B6080" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h3: { fontWeight: 700, letterSpacing: "-0.03em" },
    h4: { fontWeight: 700, letterSpacing: "-0.025em" },
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        outlined: {
          color: "#2B2140",
          borderColor: colors.lavender,
          backgroundColor: colors.cream,
          "&:hover": {
            borderColor: colors.purple,
            backgroundColor: colors.highlight,
          },
        },

        root: { borderRadius: 12, padding: "12px 20px" },
        contained: {
          boxShadow: "none",
          "&:hover": { boxShadow: "0 8px 20px rgba(119, 67, 219, 0.3)" },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: colors.sand,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.lavender,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.purple,
            borderWidth: 2,
          },
          "& input:-webkit-autofill": {
            WebkitBoxShadow: `0 0 0 100px ${colors.sand} inset`,
            borderRadius: "inherit",
          },
        },
      },
    },
  },
});
