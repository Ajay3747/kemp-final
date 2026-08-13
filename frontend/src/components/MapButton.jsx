import React from 'react';

const MapButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 left-20 z-50 p-4 text-black font-bold bg-yellow-400 rounded-full shadow-lg hover:scale-110 transition-transform duration-300"
    >
       Map
    </button>
  );
};

export default MapButton;