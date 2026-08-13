import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Shield, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

const API_URL = "http://localhost:5000/api/auth";
const ADMIN_USERNAME = "test";
const ADMIN_PASSWORD = "test";

export default function AdminLoginPage() {
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const login = async () => {
    if (!username || !password) {
      setMessageType("error");
      setMessage("Please enter username and password");
      return;
    }

    // Client-side validation for admin credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      setMessageType("error");
      setMessage("Invalid Username or Password");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, userType: "admin" })
      });

      const data = await response.json();

      if (response.ok) {
        setMessageType("success");
        setMessage("Admin Login Successful!");
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("isAdmin", "true");

        // Fetch and store user data after login
        const userResponse = await fetch(`${API_URL.replace('/auth', '')}/user/${data.userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${data.token}`
          }
        }).catch(() => null);

        if (userResponse?.ok) {
          const userData = await userResponse.json();
          localStorage.setItem('userData', JSON.stringify(userData));
        }

        setTimeout(() => navigate("/admin-dashboard"), 700);
      } else {
        setMessageType("error");
        setMessage(data.message || "Invalid Username or Password");
      }
    } catch (error) {
      setMessageType("error");
      setMessage("Server Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const hasValue = (val) => val && val.length > 0;

  const renderInputField = (label, value, setter, type = "text", icon = null) => {
    const isPasswordField = type === "password";

    return (
      <div key={label} className="mb-4 relative group">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-4 text-white/40 group-focus-within:text-red-400 transition-colors">
              {icon}
            </div>
          )}
          <input
            type={isPasswordField ? (showPassword ? "text" : "password") : type}
            value={value}
            onChange={(e) => setter(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && login()}
            placeholder={label}
            className={`w-full p-3.5 rounded-xl bg-white/5 border-2 border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-red-400 transition-all duration-300 peer ${icon ? 'pl-12' : ''}`}
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-white/40 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070b18] via-[#0a0e1f] to-[#000000] text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10">
        <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-8 rounded-3xl backdrop-blur-xl shadow-2xl shadow-red-500/10 hover:border-red-400/30 transition-all duration-500">
          
          {/* Admin Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-red-500/30 to-red-600/30 border border-red-500/50 rounded-2xl">
                <Shield className="text-red-400" size={32} />
              </div>
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent mb-2">
              Admin Portal
            </h1>
            <p className="text-white/60 text-sm">Authorized Access Only - Administrative Dashboard</p>
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            {renderInputField("Username", username, setUsername, "text", <Lock size={18} />)}
            {renderInputField("Password", password, setPassword, "password", <Shield size={18} />)}
          </div>

          {/* Login Button */}
          <button
            onClick={login}
            disabled={loading}
            className="w-full p-3.5 mt-6 text-lg font-bold bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <Shield size={20} />
                Admin Login
              </>
            )}
          </button>

          {/* Message */}
          {message && (
            <div
              className={`mt-4 p-4 rounded-xl flex items-center gap-3 animate-slideDown ${
                messageType === "success"
                  ? "bg-green-500/20 border border-green-500/50 text-green-400"
                  : "bg-red-500/20 border border-red-500/50 text-red-400"
              }`}
            >
              {messageType === "success" ? (
                <CheckCircle size={20} className="flex-shrink-0" />
              ) : (
                <AlertCircle size={20} className="flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}

          {/* Back to User Login */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => navigate("/")}
              className="w-full p-3 text-white/80 hover:text-white transition font-semibold border border-white/20 rounded-xl hover:bg-white/10 hover:border-white/40"
            >
              ← Back to User Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
