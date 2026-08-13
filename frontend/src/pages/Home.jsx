import React, { useEffect, useState, useRef } from 'react';
import { ShoppingBag, Upload, Users, Sparkles, ArrowRight, Star, TrendingUp, Zap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import InteractiveSpinner from '../components/InteractiveSpinner';
import gsap from 'gsap';

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [stats, setStats] = useState({
    activeStudents: 0,
    itemsListed: 0,
    satisfactionRate: 98
  });
  const location = useLocation();
  const pageRef = useRef(null);
  const heroRef = useRef(null);
  const contentRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial state - hidden
      gsap.set(heroRef.current, { opacity: 0, y: 50, scale: 0.95 });
      gsap.set('.animate-entrance', { opacity: 0, y: 30 });
      
      // Entrance animation timeline
      const tl = gsap.timeline({ delay: 0.1 });
      
      tl.to(heroRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out'
      })
      .to('.animate-entrance', {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out'
      }, '-=0.4');
    }, pageRef);

    return () => ctx.revert();
  }, []);

  // Handle hash anchor scrolling
  useEffect(() => {
    if (location.hash === '#about-us') {
      setTimeout(() => {
        const element = document.getElementById('about-us');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    // Fetch real-time stats
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/stats');
        if (response.ok) {
          const data = await response.json();
          setStats({
            activeStudents: data.activeStudents,
            itemsListed: data.itemsListed,
            satisfactionRate: data.satisfactionRate
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchStats();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const FloatingOrb = ({ delay, size, offset }) => (
    <div
      className={`absolute rounded-full opacity-20 blur-2xl animate-pulse`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(234,179,8,0.5), transparent)`,
        left: offset.x,
        top: offset.y,
        animation: `float ${5 + delay}s infinite ease-in-out`,
        animationDelay: `${delay}s`,
      }}
    />
  );

  return (
    <div ref={pageRef} className="relative w-full overflow-hidden min-h-screen">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.3); }
          50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.6); }
        }
        .glow-animate {
          animation: glow 3s ease-in-out infinite;
        }
        .gradient-text {
          background: linear-gradient(135deg, #fef3c7 0%, #fde047 50%, #facc15 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <FloatingOrb delay={0} size="300px" offset={{ x: '10%', y: '10%' }} />
        <FloatingOrb delay={2} size="400px" offset={{ x: '80%', y: '20%' }} />
        <FloatingOrb delay={4} size="350px" offset={{ x: '50%', y: '60%' }} />
      </div>

      {/* KEMP Logo - Top Left Corner */}
      <div className="fixed top-6 left-6 z-50">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg group-hover:shadow-yellow-500/50 transition-all duration-300">
            <span className="text-black font-bold text-lg">K</span>
          </div>
          <span className="text-white font-bold text-xl hidden sm:inline group-hover:text-yellow-300 transition-colors">KEMP</span>
        </Link>
      </div>

      <div className="relative z-20 min-h-screen text-white">
        
        {/* Hero Section with Parallax */}
        <div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 md:px-8 overflow-hidden">
          {/* Parallax background elements */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              transform: `translateY(${scrollY * 0.5}px)`,
              background: 'radial-gradient(ellipse at center, rgba(234, 179, 8, 0.1) 0%, transparent 70%)',
            }}
          />

          <div ref={heroRef} className="relative z-20 text-center max-w-5xl mx-auto">
            {/* Floating badge */}
            <div 
              className="mb-8 inline-block"
              style={{
                transform: `translateY(${scrollY * 0.3}px)`,
              }}
            >
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-full px-4 py-2 backdrop-blur-md">
                <Sparkles size={16} className="text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-300">Welcome to Your Campus Marketplace</span>
              </div>
            </div>

            {/* Main heading with parallax */}
            <h1 
              className="text-6xl sm:text-7xl md:text-8xl font-extrabold mb-6 leading-tight tracking-wider"
              style={{
                transform: `translateY(${scrollY * 0.2}px)`,
              }}
            >
              KEMP
              <br />
              <span className="gradient-text">Marketplace</span>
            </h1>

            {/* Subheading */}
            <p 
              className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 font-light leading-relaxed"
              style={{
                transform: `translateY(${scrollY * 0.15}px)`,
              }}
            >
              Buy and sell used books, electronics, and essentials with your community. 
              <br className="hidden sm:block" />
              <span className="text-yellow-300">Connect, collaborate, and thrive together</span>.
            </p>

            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6"
              style={{
                transform: `translateY(${scrollY * 0.1}px)`,
              }}
            >
              <Link
                to="/dealing"
                className="glow-animate group relative overflow-hidden bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-4 px-8 sm:px-10 rounded-full font-bold text-lg shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <ShoppingBag size={20} />
                Start Dealing
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/selling"
                className="group relative overflow-hidden bg-gray-900/50 backdrop-blur-sm border-2 border-yellow-500/50 text-white py-4 px-8 sm:px-10 rounded-full font-bold text-lg hover:border-yellow-400 hover:bg-yellow-500/10 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Upload size={20} />
                Start Listing
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>

        {/* Stats Section */}
        <div className="relative z-20 py-16 sm:py-24 px-4 animate-entrance">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { value: stats.activeStudents, label: 'Active Users', icon: Users },
              { value: stats.itemsListed, label: 'Items Listed', icon: TrendingUp },
              { value: `${stats.satisfactionRate}%`, label: 'Satisfaction Rate', icon: Star },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="animate-entrance text-center p-6 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-yellow-500/20 backdrop-blur-sm hover:border-yellow-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300"
                >
                  <div className="flex justify-center mb-4">
                    <Icon className="text-yellow-400 transition-transform duration-300 group-hover:scale-110" size={32} />
                  </div>
                  <div className="text-4xl font-bold text-yellow-300 mb-2">{stat.value}</div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Spinner Section */}
        <div className="relative z-20 py-12 sm:py-16">
          <InteractiveSpinner />
        </div>

        {/* Features Section with Parallax Cards */}
        <div className="relative z-20 py-20 sm:py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 sm:mb-20">
              <h2 className="text-5xl sm:text-6xl font-bold mb-6">
                How <span className="gradient-text">it Works</span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Three simple steps to join our thriving campus community
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
              {[
                {
                  icon: ShoppingBag,
                  title: 'Discover & Buy',
                  description: 'Find pre-loved items from students on your campus. Browse by category, search for what you need, and connect with sellers instantly.',
                  color: 'from-yellow-500/20 to-yellow-600/20',
                  accentColor: 'text-yellow-400',
                },
                {
                  icon: Upload,
                  title: 'List & Sell',
                  description: 'Have an item you no longer need? List it in minutes with our easy-to-use form, add photos, and set your price.',
                  color: 'from-orange-500/20 to-yellow-500/20',
                  accentColor: 'text-orange-400',
                },
                {
                  icon: Users,
                  title: 'Join the Community',
                  description: 'Connect with your peers on the community board. Post requests, share tips, and build a stronger campus network.',
                  color: 'from-red-500/20 to-orange-500/20',
                  accentColor: 'text-red-400',
                },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    className={`animate-entrance group relative h-full rounded-2xl bg-gradient-to-br ${feature.color} border border-yellow-500/20 p-8 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/20 hover:-translate-y-1`}
                  >
                    {/* Animated background glow on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-yellow-500/10 to-transparent" />

                    <div className="relative z-10">
                      {/* Step number */}
                      <div className="text-6xl font-bold text-gray-700 group-hover:text-yellow-500/20 transition-colors duration-300 mb-6">
                        0{idx + 1}
                      </div>

                      {/* Icon */}
                      <div className="mb-6">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <Icon size={32} className={`${feature.accentColor}`} />
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-yellow-300 transition-colors duration-300">
                        {feature.title}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                        {feature.description}
                      </p>

                      {/* Arrow indicator */}
                      <div className="mt-6 flex items-center gap-2 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-sm font-semibold">Learn more</span>
                        <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative z-20 py-12 sm:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div
              className="animate-entrance bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-3xl p-12 sm:p-16 backdrop-blur-sm hover:border-yellow-500/50 transition-colors duration-500"
            >
              <div className="flex justify-center mb-6">
                <Zap className="text-yellow-400" size={40} />
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of students already dealing and listing on campus. No fees, no hassles.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/dealing"
                  className="glow-animate bg-yellow-400 text-black py-4 px-8 rounded-full font-bold text-lg hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  Browse Listings
                </Link>
                <Link
                  to="/selling"
                  className="border-2 border-yellow-400 text-yellow-400 py-4 px-8 rounded-full font-bold text-lg hover:bg-yellow-400/10 hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  Sell Now
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Information Section */}
        <div id="about-us" className="relative z-20 py-16 sm:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="animate-entrance bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-2xl p-8 backdrop-blur-sm hover:border-blue-400/50 hover:-translate-y-1 transition-all duration-300">
                <h3 className="text-2xl font-bold text-blue-300 mb-4">About This Platform</h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  KEMP is a peer-to-peer marketplace designed exclusively for campus students. Our platform empowers you to make your required items and services available to the community, fostering a sustainable and supportive ecosystem where buying and selling becomes seamless and trustworthy.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Whether you have textbooks, electronics, furniture, or services to offer, KEMP connects you with students who need exactly what you have. Together, we're building a thriving community marketplace right on your campus.
                </p>
              </div>
              
              <div className="animate-entrance bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-2xl p-8 backdrop-blur-sm hover:border-red-400/50 hover:-translate-y-1 transition-all duration-300">
                <h3 className="text-2xl font-bold text-red-300 mb-4">Your Responsibility</h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  When you purchase any product on KEMP, you assume full responsibility for the quality, authenticity, and condition of the item you receive. We recommend inspecting products carefully before completing transactions and verifying all details with sellers beforehand.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  As a seller, you are responsible for providing accurate descriptions, fair pricing, and honest representation of your products. Maintain integrity and transparency to build a trustworthy reputation within our campus community.
                </p>
              </div>
            </div>

            <div className="animate-entrance mt-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-8 backdrop-blur-sm hover:border-yellow-400/50 transition-all duration-300">
              <h3 className="text-2xl font-bold text-yellow-300 mb-4">Community Guidelines</h3>
              <ul className="text-gray-300 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400 font-bold mt-1">•</span>
                  <span>Always communicate clearly with buyers and sellers before and after transactions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400 font-bold mt-1">•</span>
                  <span>Provide honest descriptions and accurate photos of items being sold</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400 font-bold mt-1">•</span>
                  <span>Verify the authenticity and condition of products before purchasing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400 font-bold mt-1">•</span>
                  <span>Report any fraudulent or inappropriate activity to maintain community safety</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}