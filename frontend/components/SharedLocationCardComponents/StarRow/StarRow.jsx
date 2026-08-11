import React from 'react';
import './StarRow.css'; 

export default function StarRow({ rating }) {
  // Ensure rating is treated as a number to prevent .toFixed() errors
  const numericRating = Number(rating) || 0;

  return (
    <div className="star-row">
      {[1, 2, 3, 4, 5].map(i => (
        <span 
          key={i} 
          className={`star ${i <= Math.round(numericRating) ? 'star--filled' : 'star--empty'}`}
        >
          ★
        </span>
      ))}
      <span className="rating-number">{numericRating.toFixed(1)}</span>
    </div>
  );
}