/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Check, AlertCircle } from 'lucide-react';
import { Artwork } from '../types';

interface ArtworkCardProps {
  artwork: Artwork;
  isSelected: boolean;
  onClick: () => void;
}

export const ArtworkCard: React.FC<ArtworkCardProps> = ({ artwork, isSelected, onClick }) => {
  // Get small class-based frame classes for mini mock visual card representation
  const getMiniFrameClass = () => {
    switch (artwork.frame) {
      case 'Charcoal Black':
        return 'border-[6px] border-[#181919]';
      case 'Natural Oak':
        return 'border-[6px] border-[#d6c5a5]';
      case 'Warm Walnut':
        return 'border-[6px] border-[#51452d]';
      case 'Gallery Gold':
        return 'border-[6px] border-[#c5a363]';
      case 'None':
      default:
        return 'border border-gray-200';
    }
  };

  // Mini mat board representation
  const getMiniMatPadding = () => {
    switch (artwork.matWidth) {
      case '1 inch':
        return 'p-1.5';
      case '2 inches':
        return 'p-3.5';
      case '3 inches':
        return 'p-5';
      case 'None':
      default:
        return 'p-0';
    }
  };

  // Get status metadata badge values
  const getStatusBadge = () => {
    switch (artwork.status) {
      case 'Approved for Production':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold tracking-tight font-sans text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200 uppercase">
            <Check className="w-3 h-3" /> Approved
          </span>
        );
      case 'Changes Drafted':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold tracking-tight font-sans text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 uppercase">
            <AlertCircle className="w-3 h-3" /> In Revision
          </span>
        );
      case 'Pending Review':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold tracking-tight font-sans text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-200 uppercase">
            <Clock className="w-3 h-3" /> Needs Approval
          </span>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-lg transition-all duration-200 text-left relative flex flex-col h-full border ${
        isSelected
          ? 'bg-gray-50 border-l-4 border-blue-600 border-y-gray-200 border-r-gray-200 shadow-sm'
          : 'bg-white border-gray-200 hover:bg-gray-50/50 hover:shadow-xs'
      }`}
    >
      {/* Framed Image Mat Container */}
      <div className="bg-[#fcfbf9] p-4 flex items-center justify-center border-b border-[#e9e8e7] overflow-hidden aspect-[4/3] relative">
        <div className={`w-full max-w-[170px] aspect-square flex items-center justify-center transition-all bg-[#fdfcfb] shadow-sm overflow-hidden ${getMiniFrameClass()} ${getMiniMatPadding()}`}>
          <img
            src={artwork.imageData}
            alt={artwork.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-contain select-none max-h-[140px]"
          />
        </div>

        {/* Floating Style Chip */}
        <div className="absolute left-2 bottom-2">
          <span className="text-[9px] font-mono bg-white/90 backdrop-blur-xs text-gray-500 border border-gray-200/50 px-1.5 py-0.5 rounded-sm">
            {artwork.style}
          </span>
        </div>
      </div>

      {/* Narrative block */}
      <div className="p-4 flex flex-col justify-between flex-grow">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[10px] font-mono font-bold text-gray-400 tracking-wider">
              {artwork.referenceNumber}
            </span>
            {getStatusBadge()}
          </div>

          <h3 className="text-sm font-sans font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors leading-snug">
            {artwork.title}
          </h3>

          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
            Client: <span className="font-semibold text-gray-700">{artwork.clientName}</span>
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#f5f3f3] flex items-center justify-between text-[11px] text-gray-400 font-mono">
          <span>{artwork.dimensions}</span>
          <span>{new Date(artwork.dateUploaded).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
};
