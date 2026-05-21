import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";

import HomePage from "@/routes/index";
import LoginPage from "@/routes/login";
import SignupPage from "@/routes/signup";
import ArenaPage from "@/routes/arena";
import ExplorePage from "@/routes/explore";
import CreatePage from "@/routes/create";
import ProfilePage from "@/routes/profile";
import SettingsPage from "@/routes/settings";
import DuelPage from "@/routes/duel.$duelId";
import RecapPage from "@/routes/recap.$duelId";
import ChatsIndexPage from "@/routes/chats.index";
import ChatThreadPage from "@/routes/chats.$userId";
import CallPage from "@/routes/call.$peerId";
import AdminPage from "@/routes/admin";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <a href="/" className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const showNav = pathname !== "/login" && pathname !== "/signup" && pathname !== "/admin" && !pathname.startsWith("/chats/") && !pathname.startsWith("/call/");
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/arena" element={<ArenaPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/duel/:duelId" element={<DuelPage />} />
        <Route path="/recap/:duelId" element={<RecapPage />} />
        <Route path="/chats" element={<ChatsIndexPage />} />
        <Route path="/chats/:userId" element={<ChatThreadPage />} />
        <Route path="/call/:peerId" element={<CallPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showNav && <BottomNav />}
    </AuthGate>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Shell />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export { Navigate };
