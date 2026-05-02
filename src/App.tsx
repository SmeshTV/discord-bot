import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { useProtection } from './hooks/useProtection';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import BackToTop from './components/BackToTop';
import Skeleton from './components/Skeleton';
import NotificationToastContainer from './components/NotificationToast';

// Lazy load страниц
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Games = lazy(() => import('./pages/Games'));
const GamesCatalog = lazy(() => import('./pages/GamesCatalog'));
const Shop = lazy(() => import('./pages/Shop'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Warnings = lazy(() => import('./pages/Warnings'));
const GameRooms = lazy(() => import('./pages/GameRooms'));
const Checkers = lazy(() => import('./pages/Checkers'));
const CheckersOnline = lazy(() => import('./pages/CheckersOnline'));
const Durak = lazy(() => import('./pages/Durak'));
const Poker = lazy(() => import('./pages/Poker'));
const NotFound = lazy(() => import('./pages/NotFound'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Team = lazy(() => import('./pages/Team'));
const Community = lazy(() => import('./pages/Community'));
const Contact = lazy(() => import('./pages/Contact'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Events = lazy(() => import('./pages/Events'));
const Rules = lazy(() => import('./pages/Rules'));
const Applications = lazy(() => import('./pages/Applications'));
const MiniGames = lazy(() => import('./pages/MiniGames'));

// Компонент загрузки для Suspense
const PageLoader = () => (
  <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-[60vh]">
    <div className="container mx-auto max-w-4xl">
      <Skeleton className="h-12 w-64 mb-8" />
      <Skeleton className="h-64 w-full mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  </div>
);

function App() {
  useProtection();

  return (
    <Router>
        <AuthProvider>
          <ScrollToTop />
          <div className="min-h-screen bg-gray-900 flex flex-col relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
            </div>
            <Navbar />
          <main className="flex-grow relative" style={{ zIndex: 1 }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/games" element={<GamesCatalog />} />
                <Route path="/casino" element={<Games />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/profile" element={<PlayerProfile />} />
                <Route path="/profile/:userId" element={<PlayerProfile />} />
                <Route path="/monitoring" element={<Monitoring />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/warnings" element={<Warnings />} />
                <Route path="/play" element={<MiniGames />} />
                <Route path="/rps" element={<GameRooms />} />
                <Route path="/checkers" element={<Checkers />} />
                <Route path="/checkers-online/:roomId" element={<CheckersOnline />} />
                <Route path="/durak" element={<Durak />} />
                <Route path="/durak/:roomId" element={<Durak />} />
                <Route path="/poker" element={<Poker />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/team" element={<Team />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/events" element={<Events />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/community" element={<Community />} />
                <Route path="/apply" element={<Applications />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          <NotificationToastContainer />
          <BackToTop />
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
