import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetail from "./pages/PropertyDetail";
import ValuationPage from "./pages/ValuationPage";
import AboutPage from "./pages/AboutPage";
import AgentsPage from "./pages/AgentsPage";
import AgentDetail from "./pages/AgentDetail";
import InsightsPage from "./pages/InsightsPage";
import BlogPostPage from "./pages/BlogPostPage";
import ContactPage from "./pages/ContactPage";
import LegalPage from "./pages/LegalPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/buy" element={<ListingsPage transactionType="buy" />} />
          <Route path="/rent" element={<ListingsPage transactionType="rent" />} />
          <Route path="/property/:slug" element={<PropertyDetail />} />
          <Route path="/sell/valuation" element={<ValuationPage />} />
          <Route path="/agency/about" element={<AboutPage />} />
          <Route path="/agency/agents" element={<AgentsPage />} />
          <Route path="/agency/agents/:slug" element={<AgentDetail />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/insights/:slug" element={<BlogPostPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/legal/fees" element={<LegalPage page="fees" />} />
          <Route path="/legal/privacy" element={<LegalPage page="privacy" />} />
          <Route path="/legal/cookies" element={<LegalPage page="cookies" />} />
          <Route path="/legal/notice" element={<LegalPage page="notice" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
