import React from 'react';
import { Upload } from 'lucide-react';
import SellingForm from '../components/SellingForm';

export default function Selling() {
  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto py-8 sm:py-12">
        <div className="text-center mb-12 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 mb-4">
            <Upload size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300 tracking-wide uppercase">List an Item</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-wide leading-tight mb-4 bg-gradient-to-r from-white via-white to-yellow-200 bg-clip-text text-transparent">
            List Your Item
          </h1>
          <p className="text-lg text-gray-400 font-light max-w-2xl mx-auto">
            Ready to sell? Fill out the details below to list your item for thousands of students to see.
          </p>
        </div>
        <SellingForm />
      </div>
    </div>
  );
}