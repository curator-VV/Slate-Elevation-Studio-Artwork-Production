/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle, HelpCircle, Compass, Loader2 } from 'lucide-react';
import { Artwork, ArtworkStyle, FrameType, MatWidth, ArtworkDimensions } from '../types';
import { lookupAddressCoordinates } from '../utils/geminiApi';

interface UploadModalProps {
  onClose: () => void;
  onSave: (artwork: Artwork) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [style, setStyle] = useState<ArtworkStyle>('Watercolor');
  const [frame, setFrame] = useState<FrameType>('None');
  const [matWidth, setMatWidth] = useState<MatWidth>('2 inches'); // Default to 2 inches as per requirements
  const [dimensions, setDimensions] = useState<ArtworkDimensions>('24" x 36"'); // Default to 24" x 36" (landscape)
  const [imageData, setImageData] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  
  // Custom property intake states
  const [address, setAddress] = useState('');
  const [cityState, setCityState] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [estDate, setEstDate] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleGeocode = async () => {
    const fullAddress = `${address}, ${cityState}`.trim();
    const cleanAddress = fullAddress.replace(/^,|,$/g, '').trim();
    if (!cleanAddress) {
      setError('Please enter at least a street address or city/state to look up coordinates.');
      return;
    }
    setIsGeocoding(true);
    setError('');
    try {
      const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '') as string;
      const coords = await lookupAddressCoordinates(cleanAddress, apiKey);
      setCoordinates(coords);
    } catch (err: any) {
      console.error(err);
      setError('Address lookup failed. You can copy/paste coordinates manually.');
    } finally {
      setIsGeocoding(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate SKU/Reference number
  const generateReferenceNumber = () => {
    const randomRange = Math.floor(1000 + Math.random() * 9000);
    return `PR-2026-${randomRange}`;
  };

  // Convert uploaded image file to Base64
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageData(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Artwork Title is required.');
      return;
    }
    if (!clientName.trim()) {
      setError('Client Name is required.');
      return;
    }
    if (!imageData) {
      setError('Please upload an artwork image.');
      return;
    }

    const now = new Date().toISOString();
    const newArtwork: Artwork = {
      id: `art-${Date.now()}`,
      title: title.trim(),
      clientName: clientName.trim(),
      referenceNumber: generateReferenceNumber(),
      dateUploaded: now,
      lastModified: now,
      imageData: '', // Generated in workstation
      originalImage: imageData, // Set the uploaded raw photo as original
      status: 'Pending Review',
      notes: notes.trim(),
      style,
      frame,
      matWidth,
      dimensions,
      address: address.trim(),
      cityState: cityState.trim(),
      coordinates: coordinates.trim(),
      estDate: estDate.trim(),
      imageScale: 1.15,
      sourceCropY: 50,
      processingMode: 'AI Generation',
      imageYOffset: 300,
      imageXOffset: 0,
      textYOffset: 5700
    };

    onSave(newArtwork);
  };

  // Load sample mockup sketch if they don't have a picture to drag-drop right now
  const handleLoadSample = () => {
    // Beautiful architecture line sketch from Unsplash
    const samples = [
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800',
      'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=800'
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    setImageData(picked);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-lg border border-[#e8e6e1] shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col pointer-events-auto"
        id="upload-modal-container"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <span className="text-[9px] font-bold font-sans tracking-widest text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-lg font-bold">
              Workshop Intake
            </span>
            <h2 className="text-lg font-sans font-extrabold text-gray-900 mt-1">
              Add New Portrait Specs
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form scroll container */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
          
          {error && (
            <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded border border-red-200">
              {error}
            </div>
          )}

          {/* 1. Drag and drop file section */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-2">
              Image File & Portrait Attachment *
            </label>
            
            {imageData ? (
              <div className="relative border border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center bg-[#fbf9f9]">
                <img 
                  src={imageData} 
                  alt="Pre-cropped raw portrait" 
                  referrerPolicy="no-referrer"
                  className="rounded max-h-48 object-contain shadow-xs bg-white"
                />
                
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setImageData('')}
                    className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                  >
                    Remove Photo
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Change file
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-blue-600 bg-blue-50/30' 
                    : 'border-gray-250 hover:border-gray-400 bg-gray-50/50'
                }`}
              >
                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm font-sans text-gray-700 font-bold">
                  {dragActive ? "Drop the file here" : "Drag and drop the portrait file"}
                </p>
                <p className="text-xs text-gray-400 font-sans mt-1">
                  Supports High-Res JPG, PNG, WEBP files
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[11px] bg-white border border-gray-250 shadow-3xs rounded-lg px-2.5 py-1 text-gray-600 font-bold uppercase tracking-wider">
                    Browse Files
                  </span>
                  <span className="text-xs text-gray-400">or</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSample();
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Use Workshop Demo Sketch
                  </button>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* 2. Textual specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-1.5">
                Artwork / Subject Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Hillside Avenue Residence"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#181919]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-1.5">
                Client / Recipient Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Julian & Adele Sterling"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#181919]"
                required
              />
            </div>
          </div>

          {/* New Address and Coordinates Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-1.5">
                Property Street Address *
              </label>
              <input
                type="text"
                placeholder="e.g. 1450 Hillside Avenue"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#181919]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-1.5">
                City, State *
              </label>
              <input
                type="text"
                placeholder="e.g. Mill Valley, California"
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#181919]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-1.5 flex items-center justify-between">
                <span>GPS Coordinates *</span>
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={isGeocoding}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-0.5"
                >
                  {isGeocoding ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Locating...
                    </>
                  ) : (
                    <>
                      <Compass className="w-3 h-3" /> Auto-Lookup
                    </>
                  )}
                </button>
              </label>
              <input
                type="text"
                placeholder="e.g. 37.8972° N, 122.5311° W"
                value={coordinates}
                onChange={(e) => setCoordinates(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#181919]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-1.5">
                Established Year / Custom Line 3
              </label>
              <input
                type="text"
                placeholder="e.g. EST. 1961"
                value={estDate}
                onChange={(e) => setEstDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#181919]"
              />
            </div>
          </div>

          {/* 3. Dropdowns for architectural selections */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-1.5">
                Rendering Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as ArtworkStyle)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-[#181919]"
              >
                <option value="Watercolor">Color Watercolor Painting</option>
                <option value="Pencil Sketch">Black & White Pencil Sketch</option>
              </select>
            </div>

            <div className="col-span-full border border-gray-250 bg-gray-50 rounded p-3.5 grid grid-cols-3 gap-3">
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 font-sans">Target Frame</span>
                <span className="text-[11px] font-bold text-gray-750">None (Print Only)</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 font-sans">Mat Board</span>
                <span className="text-[11px] font-bold text-gray-750">2 Inch Margin</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 font-sans">Print Size</span>
                <span className="text-[11px] font-bold text-gray-750">24" x 36" (300 DPI)</span>
              </div>
            </div>
          </div>

          {/* 4. Production remarks */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-1.5">
              Production Directions & Client Request Notes
            </label>
            <textarea
              rows={3}
              placeholder="E.g. Wants clean lines. Crop negative empty spaces by 10%. Retain organic wood charcoal textures carefully during print calibration..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded p-3 text-sm text-gray-850 focus:outline-none focus:border-[#181919] resize-none"
            />
          </div>

        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold uppercase tracking-wider text-gray-700 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
          >
            Authorize Specs & Save
          </button>
        </div>
      </div>
    </div>
  );
};
