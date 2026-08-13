import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import gsap from 'gsap';

const PageTransition = forwardRef(({ onComplete }, ref) => {
  const overlayRef = useRef(null);
  const circleRef = useRef(null);
  const particlesRef = useRef([]);
  const textRef = useRef(null);

  useImperativeHandle(ref, () => ({
    startTransition: () => {
      const tl = gsap.timeline({
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });

      // Initial state
      gsap.set(overlayRef.current, { display: 'flex', opacity: 0 });
      gsap.set(circleRef.current, { scale: 0, opacity: 0 });
      gsap.set(textRef.current, { opacity: 0, y: 20 });

      // Animation sequence
      tl.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      })
      .to(circleRef.current, {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: 'back.out(1.7)'
      }, '-=0.1')
      .to(textRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out'
      }, '-=0.3')
      // Particle burst
      .add(() => {
        particlesRef.current.forEach((particle, i) => {
          const angle = (i / particlesRef.current.length) * Math.PI * 2;
          const distance = 150 + Math.random() * 100;
          gsap.fromTo(particle, 
            { 
              x: 0, 
              y: 0, 
              scale: 0,
              opacity: 1 
            },
            {
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              scale: 1 + Math.random(),
              opacity: 0,
              duration: 0.8,
              ease: 'power2.out',
              delay: i * 0.02
            }
          );
        });
      }, '-=0.2')
      // Expand circle to cover screen
      .to(circleRef.current, {
        scale: 30,
        duration: 0.8,
        ease: 'power3.inOut'
      }, '+=0.2')
      .to(textRef.current, {
        opacity: 0,
        scale: 1.5,
        duration: 0.3,
        ease: 'power2.in'
      }, '-=0.6');

      return tl;
    }
  }));

  const particles = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] items-center justify-center pointer-events-none"
      style={{ display: 'none' }}
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/30" />
      
      {/* Animated circle */}
      <div
        ref={circleRef}
        className="relative w-48 h-48 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle, rgba(250,204,21,0.9) 0%, rgba(234,179,8,0.8) 50%, rgba(202,138,4,0.7) 100%)',
          boxShadow: '0 0 60px rgba(250,204,21,0.6), 0 0 120px rgba(250,204,21,0.4), inset 0 0 40px rgba(255,255,255,0.3)'
        }}
      >
        {/* Inner glow ring */}
        <div 
          className="absolute w-40 h-40 rounded-full animate-ping"
          style={{
            background: 'transparent',
            border: '2px solid rgba(255,255,255,0.5)',
            animationDuration: '1s'
          }}
        />
        
        {/* Welcome text */}
        <div ref={textRef} className="text-center z-10">
          <div className="text-black font-bold text-2xl tracking-wider">Welcome</div>
          <div className="text-black/70 text-sm mt-1">to kemp</div>
        </div>

        {/* Particles container */}
        <div className="absolute inset-0 flex items-center justify-center">
          {particles.map((_, i) => (
            <div
              key={i}
              ref={el => particlesRef.current[i] = el}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: i % 3 === 0 
                  ? 'linear-gradient(135deg, #fcd34d, #f59e0b)' 
                  : i % 3 === 1 
                    ? 'linear-gradient(135deg, #fff, #fef3c7)'
                    : 'linear-gradient(135deg, #fbbf24, #d97706)',
                boxShadow: '0 0 10px rgba(250,204,21,0.8)'
              }}
            />
          ))}
        </div>
      </div>

      {/* Radial lines */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-screen bg-gradient-to-b from-transparent via-yellow-400/20 to-transparent"
            style={{
              transform: `rotate(${i * 30}deg)`,
              transformOrigin: 'center center'
            }}
          />
        ))}
      </div>
    </div>
  );
});

PageTransition.displayName = 'PageTransition';

export default PageTransition;
