import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Star, Edit, CreditCard } from 'lucide-react';
import MatrixBackground from '../components/MatrixBackground';

export default function UserProfile() {
  const [user, setUser] = useState({
    name: "Loading...",
    id: "Loading...",
    email: "Loading...",
    phone: "Loading...",
    location: "Not provided",
    major: "Not provided",
    rollNumber: "Not provided",
    joined: new Date().toLocaleDateString(),
    ratings: 0,
    idCardUrl: "#",
    idCardBackUrl: "#",
  });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const userData = localStorage.getItem('userData');
    
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        setUser(prevUser => ({
          ...prevUser,
          name: parsedData.fullName || parsedData.username || "User",
          id: parsedData.rollNo || "N/A",
          email: parsedData.collegeEmail || "N/A",
          phone: parsedData.phone || "N/A",
          location: "Campus",
          major: parsedData.department || "N/A",
          rollNumber: parsedData.rollNo || "N/A",
          joined: new Date(parsedData.createdAt).toLocaleDateString() || new Date().toLocaleDateString(),
          ratings: 0,
          idCardUrl: userId ? `http://localhost:5000/api/auth/idcard/${userId}` : "#",
          idCardBackUrl: userId ? `http://localhost:5000/api/auth/idcard-back/${userId}` : "#",
        }));
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  const sections = [
    { title: "Contact Information", icon: <Mail size={20} />, key: 'email', displayKey: 'Email' },
    { title: "Contact Information", icon: <Phone size={20} />, key: 'phone', displayKey: 'Phone' },
    { title: "Campus Details", icon: <MapPin size={20} />, key: 'location', displayKey: 'Location' },
    { title: "Academic Information", icon: <Briefcase size={20} />, key: 'major', displayKey: 'Department' },
    { title: "Academic Information", icon: <Briefcase size={20} />, key: 'rollNumber', displayKey: 'Roll Number' },
    { title: "User Since", icon: <Calendar size={20} />, key: 'joined', displayKey: 'Joined' },
  ];

  return (
    <div className="bg-gray-950 min-h-screen text-white p-8">
      <div className="max-w-4xl mx-auto bg-gray-900 rounded-3xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
        
        {/* Matrix Background */}
        <MatrixBackground />

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 mb-12 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-700 flex items-center justify-center border-4 border-yellow-400">
              <User size={80} className="text-gray-400" />
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-yellow-400 rounded-full text-black shadow-lg hover:scale-110 transition-transform">
              <Edit size={20} />
            </button>
          </div>
          
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">
              {user.name}
            </h1>
            <p className="text-gray-400 text-lg md:text-xl font-light mb-4">Student ID: {user.id}</p>
            
            
          </div>
        </div>

        <hr className="border-gray-800 mb-12 relative z-10" />

        {/* Profile Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          {sections.map((section, index) => (
            <div key={index} className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-inner hover:border-yellow-400 transition-colors">
              <div className="flex items-center text-yellow-400 mb-3">
                {section.icon}
                <h3 className="text-lg font-bold ml-3">{section.displayKey}</h3>
              </div>
              <p className="text-gray-300 text-base">{user[section.key]}</p>
            </div>
          ))}
        </div>

        {/* ID Card Section */}
        <div className="mt-12 relative z-10">
          <div className="flex items-center text-yellow-400 mb-6">
            <CreditCard size={28} className="mr-3" />
            <h2 className="text-3xl font-bold">ID Card</h2>
          </div>
          
          {user.idCardUrl && user.idCardUrl !== "#" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-inner">
                <p className="text-gray-400 text-sm font-semibold mb-3 text-center">Front Side</p>
                <img
                  src={user.idCardUrl}
                  alt="ID Card Front"
                  className="max-w-full max-h-80 object-contain rounded-lg mx-auto"
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250'%3E%3Crect fill='%23333' width='400' height='250'/%3E%3Ctext x='50%25' y='50%25' fill='%23999' text-anchor='middle' dominant-baseline='middle' font-size='18'%3EID Card Image%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              {user.idCardBackUrl && user.idCardBackUrl !== "#" && (
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-inner">
                  <p className="text-gray-400 text-sm font-semibold mb-3 text-center">Back Side</p>
                  <img
                    src={user.idCardBackUrl}
                    alt="ID Card Back"
                    className="max-w-full max-h-80 object-contain rounded-lg mx-auto"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 text-center">
              <p className="text-gray-400">No ID Card uploaded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}