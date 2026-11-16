import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/grand-hotel/400.css";
import theme from "./theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // don't auto-retry failed requests
    },
  },
});
export default function mount(Page) {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <Page />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
