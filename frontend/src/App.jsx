import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersManagement from "./pages/AdminUsersManagement";
import AdminListings from "./pages/AdminListings";
import AdminOrders from "./pages/AdminOrders";
import AdminReports from "./pages/AdminReports";
import AdminBloodDonors from "./pages/AdminBloodDonors";
import AdminBloodRequests from "./pages/AdminBloodRequests";
import BloodRequestDetail from "./pages/BloodRequestDetail";
import AdminCategories from "./pages/AdminCategories";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminProfile from "./pages/AdminProfile";
import Home from "./pages/Home";
import Buying from "./pages/Buying";
import Selling from "./pages/Selling";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import MyOrders from "./pages/MyOrders";
import ConfirmHandover from "./pages/ConfirmHandover";
import Chat from "./pages/Chat";
import OtpVerificationPage from "./pages/OtpVerificationPage";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MapButton from "./components/MapButton";
import CampusMap from "./components/CampusMap";
import ParallaxBackground from "./components/ParallaxBackground";

function AppContent() {
  const [showMap, setShowMap] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If redirected from SSO with token in query, store it and go to /home
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        localStorage.setItem('token', token);
        // remove token from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/home');
      }
    } catch (e) {
      // ignore
    }
  }, [navigate]);

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  return (
    <>
      <ParallaxBackground />
      <div className="relative z-10 bg-slate-950 min-h-screen text-white font-sans">

        {/* 
          👉 Navbar should NOT show on Login Page 
          So we show it ONLY when route is NOT "/"
        */}
        <Routes>
          <Route
            path="/"
            element={<LoginPage />}
          />

          <Route
            path="/verify-email"
            element={<OtpVerificationPage />}
          />

          <Route
            path="/admin-login"
            element={<AdminLoginPage />}
          />

          <Route
            path="/admin-dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/users"
            element={<AdminUsersManagement />}
          />

          <Route
            path="/admin/listings"
            element={<AdminListings />}
          />

          <Route
            path="/admin/orders"
            element={<AdminOrders />}
          />

          <Route
            path="/admin/reports"
            element={<AdminReports />}
          />

          <Route
            path="/admin/blood-donors"
            element={<AdminBloodDonors />}
          />

          <Route
            path="/admin/blood-requests"
            element={<AdminBloodRequests />}
          />

          <Route
            path="/admin/categories"
            element={<AdminCategories />}
          />

          <Route
            path="/admin/announcements"
            element={<AdminAnnouncements />}
          />

          <Route
            path="/admin/analytics"
            element={<AdminAnalytics />}
          />

          {/* All other pages get Navbar + Components */}
          <Route
            path="/home"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <Home />
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/dealing"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <Buying />
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/selling"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <Selling />
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/community"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <Community />
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/profile"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  {localStorage.getItem("isAdmin") === "true" ? <AdminProfile /> : <Profile />}
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/notifications"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <Notifications />
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/my-orders"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <MyOrders />
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/confirm-handover/:orderId"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <ConfirmHandover />
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/blood-requests/:id"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <BloodRequestDetail />
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/chat"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <Chat />
                </main>
                <Footer />
              </>
            }
          />

          <Route
            path="/chat/:conversationId"
            element={
              <>
                <Navbar />
                <main className="container mx-auto p-4">
                  <Chat />
                </main>
                <Footer />
              </>
            }
          />
        </Routes>

        {/* Campus Map Button only visible after login */}
        {showMap && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-75 flex items-center justify-center p-8">
            <div className="relative w-full h-full max-w-5xl max-h-[80vh]">
              <button
                onClick={toggleMap}
                className="absolute top-4 right-4 z-50 text-white text-2xl font-bold bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                &times;
              </button>
              <CampusMap />
            </div>
          </div>
        )}

        {/* Floating Map button (not visible on login page) */}
        {location.pathname !== "/" && location.pathname !== "/admin-login" && location.pathname !== "/verify-email" && !location.pathname.startsWith("/confirm-handover") && (
          <MapButton onClick={toggleMap} />
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
}
