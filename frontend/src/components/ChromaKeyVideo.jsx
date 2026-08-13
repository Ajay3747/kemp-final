import React, { useRef, useEffect, useState } from 'react';

/**
 * ChromaKeyVideo - Removes white background from video in real-time using canvas
 * 
 * WHY THE VIDEO STAYS VISIBLE:
 * 1. The canvas element is displayed directly to the user (not hidden)
 * 2. Each video frame is drawn to the canvas using ctx.drawImage()
 * 3. Pixel data is extracted and processed for white detection
 * 4. Only WHITE pixels are made transparent (alpha = 0)
 * 5. Subject pixels stay FULLY OPAQUE (alpha = 255)
 * 6. The processed pixels are drawn back with ctx.putImageData()
 * 7. requestAnimationFrame ensures smooth playback
 * 
 * The key fix: Use RGB channel spread detection, NOT brightness-based logic
 */
const ChromaKeyVideo = ({ 
  src, 
  className = '', 
  style = {},
  threshold = 0.92,     // Brightness threshold for white detection (0-1)
  tolerance = 20        // RGB channel variance tolerance (0-255 spread)
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    /**
     * Process each frame from the video
     * This runs every ~16ms (60fps) via requestAnimationFrame
     */
    const processFrame = () => {
      if (video.paused || video.ended) {
        setIsProcessing(false);
        return;
      }

      // CRITICAL: Canvas size must match video dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // STEP 1: Draw the current video frame to canvas
      // This makes the video VISIBLE on the page
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // STEP 2: Get pixel data from the canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // STEP 3: Process each pixel to detect and remove white background
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];      // Red channel (0-255)
        const g = data[i + 1];  // Green channel (0-255)
        const b = data[i + 2];  // Blue channel (0-255)
        // data[i + 3] is alpha (opacity) - we'll modify this
        
        // Calculate overall brightness (average of RGB)
        const brightness = (r + g + b) / (255 * 3);
        
        // Calculate RGB uniformity: how close R, G, B values are to each other
        // White pixels have R ≈ G ≈ B (small spread)
        // Colored pixels have large spread
        const maxChannel = Math.max(r, g, b);
        const minChannel = Math.min(r, g, b);
        const spread = maxChannel - minChannel;
        
        // A pixel is considered white if:
        // - It's bright (brightness > threshold)
        // - AND RGB channels are uniform (spread < tolerance)
        const isWhiteBackground = spread < tolerance && brightness > threshold;
        
        if (isWhiteBackground) {
          // Remove this pixel: make it fully transparent
          // This is the KEY: Only white pixels disappear
          data[i + 3] = 0;
        } else {
          // Keep this pixel: make it fully opaque
          // Subject stays completely visible
          data[i + 3] = 255;
        }
      }

      // STEP 4: Draw the processed pixel data back to canvas
      // This applies all transparency changes at once
      ctx.putImageData(imageData, 0, 0);

      // STEP 5: Schedule the next frame
      // requestAnimationFrame synchronizes with display refresh rate (~60fps)
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    const handlePlay = () => {
      setIsProcessing(true);
      processFrame();
    };

    const handlePause = () => {
      setIsProcessing(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);

    // Start processing if video is already playing
    if (!video.paused) {
      handlePlay();
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [threshold, tolerance]);

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      {/* 
        HIDDEN VIDEO ELEMENT
        - Not displayed to user
        - Only used as a data source for canvas processing
        - autoPlay: starts playing when loaded (requires muted)
        - muted: required by browsers for autoplay policy
        - crossOrigin: allows canvas pixel access
      */}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        className="hidden"
        crossOrigin="anonymous"
      />
      
      {/* 
        VISIBLE CANVAS ELEMENT - THIS IS WHAT THE USER SEES
        - Displays directly on the page (display: block)
        - Canvas size automatically matches video dimensions
        - Background is transparent (shows page behind it)
        - Each frame is drawn by processFrame() function
        - Chroma key effect happens here via pixel manipulation
      */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${className}`}
        style={{ 
          background: 'transparent',
          ...style 
        }}
      />
    </div>
  );
};

export default ChromaKeyVideo;
