/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Artwork } from '../types';

interface ArtworkFramePreviewProps {
  artwork: Artwork;
}

export const ArtworkFramePreview: React.FC<ArtworkFramePreviewProps> = ({ artwork }) => {
  // Translate MatWidth to padding tailwind classes
  const getMatPaddingStyle = () => {
    switch (artwork.matWidth) {
      case '1 inch':
        return 'p-6 sm:p-8';
      case '2 inches':
        return 'p-10 sm:p-14';
      case '3 inches':
        return 'p-14 sm:p-20';
      case 'None':
      default:
        return 'p-0';
    }
  };

  // Translate frame selection to CSS backgrounds and border highlights
  const getFrameStyle = () => {
    switch (artwork.frame) {
      case 'Natural Oak':
        return {
          backgroundColor: '#ebdcb9',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '10px 10px',
          borderColor: '#d6c5a5',
          borderWidth: '16px',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.15), 0 10px 30px rgba(0,0,0,0.1)'
        };
      case 'Warm Walnut':
        return {
          backgroundColor: '#51452d',
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
          backgroundSize: '15px 15px',
          borderColor: '#3c321e',
          borderWidth: '16px',
          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.3), 0 10px 35px rgba(0,0,0,0.15)'
        };
      case 'Charcoal Black':
        return {
          backgroundColor: '#181919',
          borderColor: '#2d2d2d',
          borderWidth: '14px',
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.12)'
        };
      case 'Gallery Gold':
        return {
          backgroundColor: '#c5a363',
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 20%, rgba(0,0,0,0.2) 60%, rgba(255,255,255,0.1) 100%)',
          borderColor: '#b49252',
          borderWidth: '12px',
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.25), 0 10px 25px rgba(0,0,0,0.1)'
        };
      case 'None':
      default:
        return {
          borderColor: '#e8e6e1',
          borderWidth: '1px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        };
    }
  };

  const scale = artwork.imageScale || 1.0;
  const yOffset = artwork.imageYOffset !== undefined ? artwork.imageYOffset : 300;
  const xOffset = artwork.imageXOffset !== undefined ? artwork.imageXOffset : 0;
  const textYOffset = artwork.textYOffset !== undefined ? artwork.textYOffset : 5700;

  const getCityOnly = (cityState?: string) => {
    if (!cityState) return '';
    return cityState.split(',')[0].trim();
  };
  const city = getCityOnly(artwork.cityState);
  const defaultLine1 = artwork.address 
    ? (city ? `${artwork.address} | ${city}` : artwork.address)
    : '1450 HILLSIDE AVENUE';

  const line1 = artwork.textLine1Override || defaultLine1;
  const line2 = artwork.textLine2Override || artwork.coordinates || '37.8972° N, 122.5311° W';
  const line3 = artwork.textLine3Override || (artwork.estDate ? `EST. ${String(artwork.estDate).replace(/^EST\.\s*/i, '')}` : '') || '';

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 bg-[#f5f3f3] rounded-lg border border-[#e9e8e7] overflow-hidden min-h-[400px] sm:min-h-[500px] w-full">
      <div className="relative w-full max-w-[540px] transition-all duration-300 ease-out">
        {/* Frame Outer */}
        <div 
          className="rounded-sm overflow-hidden transition-all duration-300"
          style={getFrameStyle() as React.CSSProperties}
        >
          {/* Mat Board Paper effect */}
          <div 
            className={`bg-[#fdfcfb] transition-all duration-300 relative ${getMatPaddingStyle()}`}
            style={{
              backgroundImage: 'radial-gradient(rgba(0,0,0,0.015) 1px, transparent 0)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* The Print Sheet: exactly 3:2 landscape format */}
            <div 
              className="relative shadow-inner bg-white w-full aspect-[3/2] border border-[#eae8e2] overflow-hidden select-none"
              style={{ containerType: 'inline-size' } as React.CSSProperties}
            >
              {/* House Rendering (Original or Transformed) */}
              {artwork.imageData ? (
                <div 
                  className="absolute transition-all duration-200"
                  style={{
                    left: `calc(50% + ${(xOffset / 10800) * 100}%)`,
                    transform: 'translateX(-50%)',
                    top: `${(yOffset / 7200) * 100}%`,
                    width: `${scale * 72.22}%`,
                    aspectRatio: '7800/4200'
                  }}
                >
                  <img 
                    src={artwork.imageData} 
                    alt={artwork.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain block"
                  />
                </div>
              ) : artwork.originalImage ? (
                <div 
                  className="absolute transition-all duration-200"
                  style={{
                    left: `calc(50% + ${(xOffset / 10800) * 100}%)`,
                    transform: 'translateX(-50%)',
                    top: `${(yOffset / 7200) * 100}%`,
                    width: `${scale * 72.22}%`,
                    aspectRatio: '7800/4200'
                  }}
                >
                  <div className="relative w-full h-full border border-dashed border-gray-300 rounded overflow-hidden">
                    <img 
                      src={artwork.originalImage} 
                      alt="Raw intake portrait"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain opacity-40 blur-[1px] block"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 p-2 text-center">
                      <span className="text-[3cqw] font-sans font-extrabold uppercase tracking-widest text-gray-800 bg-white/90 px-3 py-1 rounded shadow-sm">
                        Pending AI Render
                      </span>
                      <span className="text-[1.8cqw] text-gray-700 font-mono mt-1">
                        Original Photo Loaded
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 border border-dashed border-gray-200">
                  <span className="text-xs font-mono text-gray-400">No Image Attached</span>
                </div>
              )}

              {/* Typography overlay in the lower section */}
              <div 
                className="absolute left-0 right-0 flex flex-col items-center justify-center text-center px-4 uppercase pointer-events-none select-none"
                style={{
                  top: `${(textYOffset / 7200) * 100}%`,
                  fontFamily: '"Roboto", sans-serif'
                }}
              >
                {line1 && (
                  <div className="text-[#1c1c1c] tracking-[0.08em]" style={{ fontFamily: '"Hanken Grotesk", "Roboto", sans-serif', fontSize: '3.6cqw', lineHeight: 1.1, fontWeight: 400 }}>
                    {line1}
                  </div>
                )}
                {line2 && (
                  <div className="text-[#555] tracking-[0.08em]" style={{ fontFamily: '"Hanken Grotesk", "Roboto", sans-serif', fontSize: '1.9cqw', lineHeight: 1.1, marginTop: '1.4cqw', fontWeight: 300 }}>
                    {line2}
                  </div>
                )}
                {line3 && (
                  <div className="text-[#777] tracking-[0.08em]" style={{ fontFamily: '"Hanken Grotesk", "Roboto", sans-serif', fontSize: '2.75cqw', lineHeight: 1.1, marginTop: '1.4cqw', fontWeight: 300 }}>
                    {line3}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Small Elegant Stamp indicating state directly below simulation */}
        <div className="absolute right-4 bottom-4 pointer-events-none select-none opacity-90">
          {artwork.status === 'Approved for Production' && (
            <div className="border border-red-600/70 border-dashed text-red-600 font-serif font-bold tracking-widest text-[10px] px-2 py-1 rotate-[-3deg] uppercase bg-white/95">
              Approved
            </div>
          )}
          {artwork.status === 'Changes Drafted' && (
            <div className="border border-blue-600/70 border-dashed text-blue-600 font-serif font-bold tracking-widest text-[10px] px-2 py-1 rotate-[-3deg] uppercase bg-white/95">
              Draft Rev
            </div>
          )}
          {artwork.status === 'Pending Review' && (
            <div className="border border-amber-600/70 border-dashed text-amber-600 font-serif font-bold tracking-widest text-[10px] px-2 py-1 rotate-[-3deg] uppercase bg-white/95">
              Pending
            </div>
          )}
        </div>
      </div>

      {/* Frame Details label */}
      <div className="mt-5 flex items-center gap-4 text-xs font-mono text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: artwork.frame === 'None' ? '#ccc' : artwork.frame === 'Natural Oak' ? '#ebdcb9' : artwork.frame === 'Warm Walnut' ? '#51452d' : artwork.frame === 'Charcoal Black' ? '#181919' : '#c5a363' }} />
          {artwork.frame === 'None' ? 'No Frame' : `${artwork.frame}`}
        </span>
        <span className="w-1 h-1 bg-gray-300 rounded-full" />
        <span>Mat: {artwork.matWidth}</span>
        <span className="w-1 h-1 bg-gray-300 rounded-full" />
        <span>Print Size: {artwork.dimensions}</span>
      </div>
    </div>
  );
};
