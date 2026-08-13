import React, { useState, useRef } from 'react';

// Single Spinner Cube component with continuous spin logic
function SpinnerCube() {
  const [isSpinning, setIsSpinning] = useState(false);
  const spinTimerRef = useRef(null);

  const handleClick = () => {
    // Clear any existing timer to prevent it from stopping the spin
    clearTimeout(spinTimerRef.current);

    // Start the spin animation
    setIsSpinning(true);

    // Set a new timer. The spin will stop after 2 seconds of no clicks.
    spinTimerRef.current = setTimeout(() => {
      setIsSpinning(false);
    }, 2000);
  };

  return (
    <div className="spinner-container" onClick={handleClick}>
      <div className={`spinner-cube ${isSpinning ? 'spin' : ''}`}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
}

// Wrapper component to render multiple cubes horizontally with perfect spacing
export default function InteractiveSpinnerRow() {
  const numberOfCubes = 5;

  return (
    <div className="flex justify-center space-x-40">
      {[...Array(numberOfCubes)].map((_, index) => (
        <SpinnerCube key={index} />
      ))}
    </div>
  );
}