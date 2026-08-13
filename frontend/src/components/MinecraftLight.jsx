import React, { useState } from 'react';

export default function MinecraftLight() {
  const [isChecked, setIsChecked] = useState(true);

  return (
    <label className="container">
      <div className="simple-text">Click me!</div>
      <input 
        type="checkbox" 
        checked={isChecked} 
        onChange={() => setIsChecked(!isChecked)} 
      />
      <div className="checkmark"></div>
      <div className="torch">
        <div className="head">
          <div className="face top">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div className="face left">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div className="face right">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
        <div className="stick">
          <div className="side side-left">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div className="side side-right">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      </div>
    </label>
  );
}