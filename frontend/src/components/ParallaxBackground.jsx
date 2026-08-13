import React, { useEffect, useRef } from 'react';

const ParallaxBackground = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;

        // Apply parallax transform to background elements
        const parallaxElements = containerRef.current.querySelectorAll('.parallax-element');
        parallaxElements.forEach((element, index) => {
          const speed = (index + 1) * 0.1;
          element.style.transform = `translateY(${rate * speed}px)`;
        });

        // Add rotation based on scroll for some elements
        const rotatingElements = containerRef.current.querySelectorAll('.parallax-rotate');
        rotatingElements.forEach((element, index) => {
          const rotation = scrolled * (0.02 + index * 0.01);
          element.style.transform = `translateY(${rate * (index + 1) * 0.05}px) rotate(${rotation}deg)`;
        });
      }
    };

    // Add mouse movement parallax
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        const interactiveElements = containerRef.current.querySelectorAll('.parallax-mouse');
        interactiveElements.forEach((element, index) => {
          const speed = 0.05 + index * 0.02;
          element.style.transform = `translate(${mouseX * speed * 100}px, ${mouseY * speed * 100}px)`;
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#070b18] via-[#0a0f1c] to-[#0f172a] animate-gradient-x"></div>

      {/* Floating geometric shapes with different effects */}
      <div className="parallax-element parallax-rotate absolute top-20 left-10 w-32 h-32 bg-[#facc15]/10 rounded-full blur-xl animate-float-slow"></div>
      <div className="parallax-element absolute top-40 right-20 w-24 h-24 bg-blue-500/10 rounded-lg rotate-45 blur-lg animate-float-medium"></div>
      <div className="parallax-element parallax-mouse absolute bottom-32 left-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-xl animate-float-fast"></div>
      <div className="parallax-element parallax-rotate absolute top-1/3 right-10 w-20 h-20 bg-green-500/10 rounded-lg blur-md animate-float-slow"></div>
      <div className="parallax-element absolute bottom-20 right-1/3 w-28 h-28 bg-pink-500/10 rounded-full blur-lg animate-float-medium"></div>

      {/* Interactive mouse-following elements */}
      <div className="parallax-mouse absolute top-1/2 left-1/2 w-16 h-16 bg-cyan-500/5 rounded-full blur-md"></div>
      <div className="parallax-mouse absolute top-1/4 right-1/4 w-12 h-12 bg-indigo-500/5 rounded-lg blur-sm"></div>

      {/* Additional floating shapes */}
      <div className="parallax-element absolute top-3/4 left-20 w-36 h-36 bg-red-500/5 rounded-full blur-2xl animate-drift"></div>
      <div className="parallax-element parallax-rotate absolute bottom-1/4 right-20 w-18 h-18 bg-teal-500/5 rounded-lg blur-lg animate-glow"></div>

      {/* Large background orbs */}
      <div className="parallax-element absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="parallax-element absolute -bottom-32 -right-32 w-80 h-80 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

      {/* Animated particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`parallax-element absolute w-1 h-1 bg-white/20 rounded-full animate-pulse`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Subtle grid overlay */}
      <div className="parallax-element absolute inset-0 opacity-5">
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KPGcgZmlsbD0iI2ZmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj4KPHBhdGggZD0iTTIwIDIwaDQwdjQwSDBWMjB6TTAgNDBoNDB2NDBIMHY0MHoiLz4KPC9nPgo8L2c+Cjwvc3ZnPg==')] bg-repeat"></div>
      </div>

      {/* Radial gradient overlay for depth */}
      <div className="parallax-element absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/20"></div>
    </div>
  );
};

export default ParallaxBackground;