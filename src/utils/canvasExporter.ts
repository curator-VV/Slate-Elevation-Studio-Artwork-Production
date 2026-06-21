/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Artwork } from '../types';

export function downloadFile(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadSpecSheet(artwork: Artwork) {
  const content = `=========================================
ARTWORK PRODUCTION SPECIFICATION
=========================================
Reference Order ID: ${artwork.referenceNumber}
Production Status:  ${artwork.status.toUpperCase()}
Last Modified:      ${new Date(artwork.lastModified).toLocaleString()}

TITLE AND CLIENT
-----------------------------------------
Artwork Title:      ${artwork.title}
Client Name:        ${artwork.clientName}

PRODUCTION SELECTIONS
-----------------------------------------
Art Style:          ${artwork.style}
Print Dimensions:   ${artwork.dimensions}
Mat Board Width:    ${artwork.matWidth}
Frame Molding:      ${artwork.frame}

PRODUCTION DIRECTIONS & REVIEWS Notes
-----------------------------------------
${artwork.notes || "No special production directions entered."}

=========================================
Prepared for workshop execution.
Gallery Minimalist Production System.
=========================================`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, `SPEC-${artwork.referenceNumber}-${artwork.title.replace(/\s+/g, '_')}.txt`);
  URL.revokeObjectURL(url);
}

// Generates an interactive framed image mock on canvas
export function renderArtworkToCanvas(artwork: Artwork): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Resolve cross-origin issues for hotlinked images
    const sourceImage = artwork.imageData || artwork.originalImage || '';
    if (sourceImage.startsWith('http')) {
      img.crossOrigin = 'anonymous';
      const cacheBuster = sourceImage.includes('?') ? `&_cb=${Date.now()}` : `?_cb=${Date.now()}`;
      img.src = sourceImage + cacheBuster;
    } else {
      img.src = sourceImage;
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Print dimension in pixels: 24" x 36" at 300 DPI = 10800 x 7200
        const canvasWidth = 10800;
        const canvasHeight = 7200;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // 1. Draw absolute white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 2. Draw transformed house drawing inside the safe artwork window (7800 x 4200)
        const scale = artwork.imageScale || 1.15;
        const yOffset = artwork.imageYOffset !== undefined ? artwork.imageYOffset : 300;
        const xOffset = artwork.imageXOffset !== undefined ? artwork.imageXOffset : 0;
        
        const containerWidth = scale * 7800;
        const containerHeight = scale * 4200;
        
        const imgAspect = img.width / img.height;
        const containerAspect = 7800 / 4200;
        
        let drawWidth = containerWidth;
        let drawHeight = containerHeight;
        
        if (imgAspect > containerAspect) {
          // bound by width
          drawWidth = containerWidth;
          drawHeight = drawWidth / imgAspect;
        } else {
          // bound by height
          drawHeight = containerHeight;
          drawWidth = drawHeight * imgAspect;
        }

        const imgX = (canvasWidth - containerWidth) / 2 + (containerWidth - drawWidth) / 2 + xOffset;
        const imgY = yOffset + (containerHeight - drawHeight) / 2;

        // Multiply drawing onto background to blend with paper texture
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight);
        ctx.globalCompositeOperation = 'source-over'; // reset

        // 3. Draw address and property details in the bottom margin area
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
        const line3 = artwork.textLine3Override || (artwork.estDate ? `EST. ${artwork.estDate.replace(/^EST\.\s*/i, '')}` : '') || '';

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Draw Line 1 (Street Address)
        if (line1) {
          ctx.fillStyle = '#1c1c1c';
          ctx.font = '400 388px "Hanken Grotesk", "Roboto", sans-serif';
          // Modern Canvas letter-spacing support
          try {
            ctx.letterSpacing = '0.08em';
          } catch (e) {
            console.warn('Canvas letterSpacing not supported in this browser version');
          }
          ctx.fillText(line1.toUpperCase(), canvasWidth / 2, textYOffset);
        }

        // Draw Line 2 (Coordinates)
        if (line2) {
          ctx.fillStyle = '#555555';
          ctx.font = '300 205px "Hanken Grotesk", "Roboto", sans-serif';
          try {
            ctx.letterSpacing = '0.08em';
          } catch (e) {}
          ctx.fillText(line2.toUpperCase(), canvasWidth / 2, textYOffset + 460);
        }

        // Draw Line 3 (Established Year)
        if (line3) {
          ctx.fillStyle = '#777777';
          ctx.font = '300 297px "Hanken Grotesk", "Roboto", sans-serif';
          try {
            ctx.letterSpacing = '0.08em';
          } catch (e) {}
          ctx.fillText(line3.toUpperCase(), canvasWidth / 2, textYOffset + 760);
        }

        resolve(canvas);
      } catch (err) {
        console.error('Failed to render artwork to canvas:', err);
        resolve(null);
      }
    };

    img.onerror = (e) => {
      console.error('Failed to load image for canvas render:', e);
      resolve(null);
    };
  });
}

// Generates an interactive framed image mock on canvas and triggers download
export async function exportFramedArtwork(artwork: Artwork): Promise<boolean> {
  const canvas = await renderArtworkToCanvas(artwork);
  if (!canvas) {
    // Fallback: download whatever source image we have
    const sourceImage = artwork.imageData || artwork.originalImage || '';
    if (sourceImage) {
      downloadFile(sourceImage, `original-${artwork.referenceNumber}-${artwork.title.replace(/\s+/g, '_')}.jpg`);
      return true;
    }
    return false;
  }

  try {
    const finalUrl = canvas.toDataURL('image/jpeg', 0.98);
    const filename = `PRINT-24x36-${artwork.referenceNumber}-${artwork.title.replace(/\s+/g, '_')}.jpg`;
    downloadFile(finalUrl, filename);
    return true;
  } catch (err) {
    console.error('Failed to export high-res artwork:', err);
    return false;
  }
}

// Generates the framed image and writes it directly to the system clipboard as a PNG
export async function copyFramedArtworkToClipboard(artwork: Artwork): Promise<boolean> {
  const canvas = await renderArtworkToCanvas(artwork);
  if (!canvas) return false;

  return new Promise<boolean>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]).then(() => {
          resolve(true);
        }).catch((err) => {
          console.error('Failed to write image to clipboard:', err);
          resolve(false);
        });
      } catch (err) {
        console.error('ClipboardItem not supported or writing failed:', err);
        resolve(false);
      }
    }, 'image/png');
  });
}
