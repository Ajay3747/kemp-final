import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  // Example dynamic data (replace with real data fetching if needed)
  const stats = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto mb-2 text-yellow-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM4.5 20.25v-2.25A2.25 2.25 0 016.75 15.75h10.5a2.25 2.25 0 012.25 2.25v2.25" />
        </svg>
      ),
      value: 3,
      label: "Active Users"
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto mb-2 text-yellow-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17.25V21h3.75M21 17.25V21h-3.75M3 17.25c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5M21 17.25c0-2.485-2.239-4.5-5-4.5s-5 2.015-5 4.5M3 17.25c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5M21 17.25c0-2.485-2.239-4.5-5-4.5s-5 2.015-5 4.5" />
        </svg>
      ),
      value: 9,
      label: "Items Listed"
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto mb-2 text-yellow-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.06 4.178a.563.563 0 00.424.307l4.605.67a.563.563 0 01.312.96l-3.334 3.247a.563.563 0 00-.162.5l.787 4.587a.563.563 0 01-.818.593l-4.116-2.164a.563.563 0 00-.523 0l-4.116 2.164a.563.563 0 01-.818-.593l.787-4.587a.563.563 0 00-.162-.5L2.08 9.654a.563.563 0 01.312-.96l4.605-.67a.563.563 0 00.424-.307l2.06-4.178z" />
        </svg>
      ),
      value: "98%",
      label: "Satisfaction Rate"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] via-yellow-100/60 to-yellow-200 relative overflow-x-hidden">
      {/* Decorative blurred circles for depth */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-yellow-400/30 rounded-full blur-3xl z-0" />
      <div className="absolute -bottom-32 right-0 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl z-0" />
      {/* Hero Card */}
      <div className="relative z-10 bg-white/30 backdrop-blur-xl border border-yellow-200/60 shadow-2xl p-12 flex flex-col items-center max-w-2xl w-full rounded-3xl mt-16 mb-8 animate-fade-in">
        <div className="mb-6">
          <span className="inline-block bg-yellow-900/90 text-yellow-300 font-semibold px-6 py-2 rounded-full text-base shadow">
            ✨ Welcome to Your Campus Marketplace
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-center text-white drop-shadow mb-2">
          <span className="block text-white">KEMP</span>
          <span className="block text-yellow-500">Marketplace</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-900 mt-4 mb-2 text-center font-medium">Buy and sell used books, electronics, and essentials with your community.</p>
        <p className="text-lg md:text-xl text-yellow-900 text-center mb-8">
          <span className="text-yellow-500 font-semibold">Connect, collaborate, and thrive together.</span>
        </p>
        <button
          className="flex items-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-full shadow-xl text-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-yellow-300/60"
          onClick={() => navigate("/login")}
          aria-label="Login"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-6-3h12m0 0l-3-3m3 3l-3 3" />
          </svg>
          Login
        </button>
      </div>
      {/* Stats Section */}
      <div className="w-full flex flex-col items-center mb-16">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 px-4 animate-fade-in delay-200">
          {stats.map((stat, idx) => (
            <div
              key={stat.label}
              className="bg-white/20 backdrop-blur-lg border border-yellow-200/40 shadow-xl flex flex-col items-center py-10 px-6 min-h-[170px] rounded-2xl transition-all duration-200 hover:scale-105 hover:shadow-2xl"
              style={{ boxShadow: '0 0 60px 0 #10152233' }}
            >
              {stat.icon}
              <div className="text-4xl font-extrabold text-yellow-500 mb-1 drop-shadow">{stat.value}</div>
              <div className="text-gray-900 text-base font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      <footer className="relative z-10 mt-10 text-gray-700 text-sm opacity-80">&copy; {new Date().getFullYear()} kemp. All rights reserved.</footer>
    </div>
  );
}
