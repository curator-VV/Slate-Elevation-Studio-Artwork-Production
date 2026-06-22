/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Download, 
  CheckCircle, 
  FileText, 
  ChevronLeft, 
  ChevronDown,
  AlertCircle, 
  Database, 
  HelpCircle,
  FileCheck,
  RefreshCw,
  ExternalLink,
  Sliders,
  Sparkles,
  Compass,
  Loader2,
  Copy,
  Check,
  Upload,
  LayoutList,
  Plus
} from 'lucide-react';
import { 
  Artwork, 
  ArtworkStyle, 
  FrameType, 
  MatWidth, 
  ArtworkDimensions,
  ArtworkStatus
} from './types';
import { 
  getAllArtworks, 
  saveArtwork, 
  deleteArtwork 
} from './db/indexedDbHelper';
import { INITIAL_ARTWORKS } from './initialData';
import { Header } from './components/Header';
import { ArtworkCard } from './components/ArtworkCard';
import { ArtworkFramePreview } from './components/ArtworkFramePreview';
import { UploadModal } from './components/UploadModal';
import { GoogleFormsManager } from './components/GoogleFormsManager';
import { MarketingPlanner } from './components/MarketingPlanner';
import { 
  downloadSpecSheet, 
  exportFramedArtwork, 
  downloadFile,
  copyFramedArtworkToClipboard
} from './utils/canvasExporter';
import { 
  describeHouse, 
  generateHouseArt, 
  lookupAddressCoordinates,
  getAIArtworkPrompt
} from './utils/geminiApi';

export default function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspace' | 'google-forms' | 'marketing'>('workspace');
  
  // Filtering and searching states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Status feedback
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | null>(null);
  const [errorText, setErrorText] = useState('');
  const [isMobileWorkspaceOpen, setIsMobileWorkspaceOpen] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // AI Generation & Coordinates Lookup States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'idle' | 'describing' | 'rendering' | 'complete'>('idle');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [activeWorkstationTab, setActiveWorkstationTab] = useState<'transformed' | 'original'>('transformed');
  const [copied, setCopied] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [isRosterExpanded, setIsRosterExpanded] = useState(false);

  const handleUploadCustomRender = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedArtwork) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        const isWatercolor = selectedArtwork.style === 'Watercolor';
        const cacheUpdates: Partial<Artwork> = {
          imageData: base64Data
        };
        if (isWatercolor) {
          cacheUpdates.aiWatercolorImage = base64Data;
        } else {
          cacheUpdates.aiSketchImage = base64Data;
        }
        await handleUpdateActiveSpecs(cacheUpdates);
        setActiveWorkstationTab('transformed');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAIArtwork = async () => {
    if (!selectedArtwork) return;
    const sourceImage = selectedArtwork.originalImage || selectedArtwork.imageData;
    if (!sourceImage) {
      setErrorText('Please upload a source home photo first.');
      return;
    }

    setIsGenerating(true);
    setErrorText('');
    setGenerationStep('rendering');

    try {
      const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '') as string;
      
      const transformedBase64 = await generateHouseArt(
        '', // Pass empty description
        selectedArtwork.style === 'Watercolor' ? 'Watercolor' : 'Pencil Sketch', 
        apiKey,
        sourceImage,
        selectedArtwork.sourceCropY ?? 50,
        selectedArtwork.processingMode ?? 'AI Generation'
      );
      
      // Save results and populate appropriate style cache
      setGenerationStep('complete');
      const isWatercolor = selectedArtwork.style === 'Watercolor';
      const cacheUpdates: Partial<Artwork> = {
        imageData: transformedBase64
      };

      if (isWatercolor) {
        cacheUpdates.aiWatercolorImage = transformedBase64;
      } else {
        cacheUpdates.aiSketchImage = transformedBase64;
      }

      await handleUpdateActiveSpecs(cacheUpdates);
      setActiveWorkstationTab('transformed');
    } catch (err: any) {
      console.error(err);
      setErrorText(`AI Art generation failed: ${err.message || err}`);
    } finally {
      setIsGenerating(false);
      setGenerationStep('idle');
    }
  };

  const regenerateArtwork = async (
    styleVal: ArtworkStyle, 
    cropYVal: number,
    modeVal?: 'AI Generation' | 'Photo Filter'
  ) => {
    if (!selectedArtwork) return;
    const sourceImage = selectedArtwork.originalImage || selectedArtwork.imageData;
    if (!sourceImage) return;

    const activeMode = modeVal || selectedArtwork.processingMode || 'AI Generation';
    const isWatercolor = styleVal === 'Watercolor';

    // 1. Check cache first to avoid redundant API/canvas processing
    if (activeMode === 'AI Generation') {
      const cachedAiImage = isWatercolor 
        ? selectedArtwork.aiWatercolorImage 
        : selectedArtwork.aiSketchImage;
      
      const hasBeenGenerated = !!cachedAiImage;

      if (!hasBeenGenerated) {
        // Just update cropY without triggering AI API call
        await handleUpdateActiveSpecs({
          style: styleVal,
          sourceCropY: cropYVal,
          processingMode: activeMode
        });
        return;
      }

      if (cachedAiImage && cropYVal === selectedArtwork.sourceCropY) {
        console.log('Using cached AI image for style:', styleVal);
        await handleUpdateActiveSpecs({
          style: styleVal,
          sourceCropY: cropYVal,
          processingMode: activeMode,
          imageData: cachedAiImage
        });
        return;
      }
    } else {
      // Photo Filter mode
      const cachedFilterImage = isWatercolor 
        ? selectedArtwork.filterWatercolorImage 
        : selectedArtwork.filterSketchImage;
      
      if (cachedFilterImage && cropYVal === selectedArtwork.sourceCropY) {
        console.log('Using cached photo filter image for style:', styleVal);
        await handleUpdateActiveSpecs({
          style: styleVal,
          sourceCropY: cropYVal,
          processingMode: activeMode,
          imageData: cachedFilterImage
        });
        return;
      }
    }

    // 2. Perform fresh generation or filtering if not cached or if cropY changed
    try {
      if (activeMode === 'AI Generation') {
        setIsGenerating(true);
        setGenerationStep('rendering');
      }

      const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '') as string;
      
      const transformedBase64 = await generateHouseArt(
        '', // Pass empty description
        styleVal === 'Watercolor' ? 'Watercolor' : 'Pencil Sketch', 
        apiKey,
        sourceImage,
        cropYVal,
        activeMode
      );
      
      const cacheUpdates: Partial<Artwork> = {
        style: styleVal,
        sourceCropY: cropYVal,
        processingMode: activeMode,
        imageData: transformedBase64
      };
      
      if (activeMode === 'AI Generation') {
        if (isWatercolor) {
          cacheUpdates.aiWatercolorImage = transformedBase64;
        } else {
          cacheUpdates.aiSketchImage = transformedBase64;
        }
      } else {
        if (isWatercolor) {
          cacheUpdates.filterWatercolorImage = transformedBase64;
        } else {
          cacheUpdates.filterSketchImage = transformedBase64;
        }
      }
      
      await handleUpdateActiveSpecs(cacheUpdates);
    } catch (err: any) {
      console.error('Failed to regenerate artwork:', err);
    } finally {
      if (activeMode === 'AI Generation') {
        setIsGenerating(false);
        setGenerationStep('idle');
      }
    }
  };

  const handleGeocodeWorkstation = async () => {
    if (!selectedArtwork) return;
    const fullAddress = `${selectedArtwork.address || ''}, ${selectedArtwork.cityState || ''}`.trim().replace(/^,|,$/g, '').trim();
    if (!fullAddress) {
      setErrorText('Please specify a street address and city/state to look up coordinates.');
      return;
    }

    setIsGeocoding(true);
    setErrorText('');
    try {
      const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '') as string;
      const coords = await lookupAddressCoordinates(fullAddress, apiKey);
      await handleUpdateActiveSpecs({ coordinates: coords });
    } catch (err: any) {
      console.error(err);
      setErrorText('GPS Coordinate lookup failed. Please enter coordinates manually.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const copyCoordinatesToClipboard = () => {
    if (!selectedArtwork?.coordinates) return;
    navigator.clipboard.writeText(selectedArtwork.coordinates);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle porting specifications imported from Google Forms
  const handleImportGoogleFormArtwork = async (newArtworkData: Omit<Artwork, 'id' | 'referenceNumber' | 'lastModified'>) => {
    try {
      const id = 'art_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const referenceNumber = 'SKU-' + Math.floor(1000 + Math.random() * 9000);
      const lastModified = new Date().toISOString();

      const newArtwork: Artwork = {
        ...newArtworkData,
        id,
        referenceNumber,
        lastModified,
        imageScale: newArtworkData.imageScale || 1.15,
        imageYOffset: newArtworkData.imageYOffset !== undefined ? newArtworkData.imageYOffset : 300,
        imageXOffset: newArtworkData.imageXOffset !== undefined ? newArtworkData.imageXOffset : 0,
        textYOffset: newArtworkData.textYOffset !== undefined ? newArtworkData.textYOffset : 5700
      };

      await saveArtwork(newArtwork);
      const fresh = await getAllArtworks();
      setArtworks(fresh);
      setSelectedArtworkId(newArtwork.id);
      setActiveTab('workspace'); // Auto-switch view back to production desk
      setIsMobileWorkspaceOpen(true); // Ensure focus on detail workspace panel
      setErrorText('');
    } catch (err) {
      console.error(err);
      setErrorText('Failed to import artwork from Google Form responses.');
    }
  };

  // Initialize DB and load artworks
  useEffect(() => {
    async function loadData() {
      try {
        let loaded = await getAllArtworks();
        if (loaded.length === 0) {
          // Pre-populate with beautiful initial samples if DB is empty
          for (const item of INITIAL_ARTWORKS) {
            await saveArtwork(item);
          }
          loaded = await getAllArtworks();
        }
        setArtworks(loaded);
        if (loaded.length > 0) {
          setSelectedArtworkId(loaded[0].id);
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setErrorText('Failed to read local database. Falling back to memory storage.');
        // Memory fallback
        setArtworks(INITIAL_ARTWORKS);
        setSelectedArtworkId(INITIAL_ARTWORKS[0]?.id || null);
      }
    }
    loadData();
  }, []);

  // Fetch the active artwork
  const selectedArtwork = artworks.find(a => a.id === selectedArtworkId) || null;

  // Real-time auto-saving spec updates
  const handleUpdateActiveSpecs = async (updates: Partial<Artwork>) => {
    if (!selectedArtwork) return;
    
    setSaveIndicator('saving');
    const updated: Artwork = {
      ...selectedArtwork,
      ...updates,
      lastModified: new Date().toISOString()
    };

    // Optimistically update reactant state
    setArtworks(prev => prev.map(a => a.id === updated.id ? updated : a));
    
    try {
      await saveArtwork(updated);
      setTimeout(() => setSaveIndicator('saved'), 350);
    } catch (err) {
      console.error('Auto-save error:', err);
    }
  };

  // Intake upload creation save handler
  const handleCreateArtwork = async (newArtwork: Artwork) => {
    try {
      await saveArtwork(newArtwork);
      setArtworks(prev => [newArtwork, ...prev]);
      setSelectedArtworkId(newArtwork.id);
      setIsUploadModalOpen(false);
      setIsMobileWorkspaceOpen(true);
      
      setSaveIndicator('saved');
    } catch (err) {
      console.error('Failed to insert new artwork:', err);
    }
  };

  // Complete Approval For Production handler
  const handleApproveForProduction = async () => {
    if (!selectedArtwork) return;
    await handleUpdateActiveSpecs({ status: 'Approved for Production' });
  };

  // Delete artwork handler
  const handleDeleteArtwork = async (id: string) => {
    try {
      await deleteArtwork(id);
      const remaining = artworks.filter(a => a.id !== id);
      setArtworks(remaining);
      setDeleteConfirmationId(null);
      
      if (remaining.length > 0) {
        setSelectedArtworkId(remaining[0].id);
      } else {
        setSelectedArtworkId(null);
      }
      setIsMobileWorkspaceOpen(false);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Filter artworks based on search and status selection
  const filteredArtworks = artworks.filter(artwork => {
    const matchesSearch = 
      artwork.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      artwork.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      artwork.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artwork.style.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || artwork.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectArtworkOnMobile = (id: string) => {
    setSelectedArtworkId(id);
    setIsMobileWorkspaceOpen(true);
  };

  // Handle direct file download for raw files
  const handleDownloadOriginal = () => {
    if (!selectedArtwork) return;
    const fallbackName = `original-${selectedArtwork.referenceNumber}-${selectedArtwork.title.replace(/\s+/g, '_')}.jpg`;
    downloadFile(selectedArtwork.imageData, fallbackName);
  };

  // Handle premium canvas rendering download
  const handleDownloadFramed = async () => {
    if (!selectedArtwork) return;
    await exportFramedArtwork(selectedArtwork);
  };

  // Handle text specification files download
  const handleDownloadTxtSpec = () => {
    if (!selectedArtwork) return;
    downloadSpecSheet(selectedArtwork);
  };

  // Handle copying print layout canvas to clipboard
  const handleCopyFramedToClipboard = async () => {
    if (!selectedArtwork) return;
    setIsCopyingImage(true);
    setImageCopied(false);
    try {
      const success = await copyFramedArtworkToClipboard(selectedArtwork);
      if (success) {
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 2000);
      } else {
        setErrorText('Failed to copy print-ready image. Try downloading it instead.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(`Failed to copy image to clipboard: ${err.message || err}`);
    } finally {
      setIsCopyingImage(false);
    }
  };

  // Quick reset database back to factory samples
  const handleResetDatabase = async () => {
    if (confirm('Are you sure you want to restore original mock assets? This will replace your uploads.')) {
      try {
        // Clear IndexedDB store
        const loaded = await getAllArtworks();
        for (const item of loaded) {
          await deleteArtwork(item.id);
        }
        // Write defaults
        for (const item of INITIAL_ARTWORKS) {
          await saveArtwork(item);
        }
        const fresh = await getAllArtworks();
        setArtworks(fresh);
        setSelectedArtworkId(fresh[0]?.id || null);
        setErrorText('');
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f9] text-[#1b1c1c] font-sans flex flex-col">
      
      {/* Dynamic Header */}
      <Header 
        artworks={artworks}
        onUploadClick={() => setIsUploadModalOpen(true)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {errorText && (
        <div className="bg-amber-50 border-y border-amber-200 py-2.5 text-center text-xs text-amber-800 font-medium">
          {errorText}
        </div>
      )}

      {/* Primary Workspace layout */}
      {activeTab === 'workspace' ? (
        <main className="max-w-7xl mx-auto px-6 sm:px-8 py-6 flex-grow w-full space-y-6">
          
          {/* Workstation Top Action Bar (for desktop Roster toggle & Upload) */}
          <div className="hidden lg:flex items-center justify-between bg-white border border-[#e8e6e1] rounded-xl px-5 py-3 shadow-2xs">
            <button
              onClick={() => setIsRosterExpanded(!isRosterExpanded)}
              className="px-4 py-2 border border-gray-300 hover:border-gray-500 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2 transition-all cursor-pointer select-none"
            >
              <LayoutList className="w-4 h-4 text-gray-505" />
              {isRosterExpanded ? 'Hide Workshop Queue' : 'Show Workshop Queue'}
            </button>
            
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-[#181919] hover:bg-[#2c2d2c] text-white text-xs font-sans font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Upload Intake File
            </button>
          </div>

          <div className="grid grid-cols-12 gap-8 items-start">
            
            {/* SIDE PANEL: ARTWORK ROSTER (collapsible on desktop, hides on mobile when editing is open) */}
            <section className={`flex-col space-y-6 ${
              isRosterExpanded 
                ? `col-span-12 lg:col-span-4 ${isMobileWorkspaceOpen ? 'hidden lg:flex' : 'flex'}`
                : `${isMobileWorkspaceOpen ? 'hidden' : 'flex'} lg:hidden`
            }`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-sans font-bold tracking-wider text-gray-400 uppercase">
                  WORKSHOP QUEUE ({filteredArtworks.length})
                </h2>
                <button 
                  onClick={handleResetDatabase}
                  className="text-[10px] font-mono text-gray-400 hover:text-gray-800 transition-colors flex items-center gap-1"
                  title="Reset workshop data back to preloaded layouts"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Mock Assets
                </button>
              </div>

              {filteredArtworks.length === 0 ? (
                <div className="bg-white border border-[#e8e6e1] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <span className="p-4 rounded-full bg-[#fbf9f9] border border-gray-100">
                    <Database className="w-8 h-8 text-gray-400" />
                  </span>
                  <div>
                    <p className="text-base font-serif font-medium text-gray-900">No artwork files matched</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      Modify your search or filter keywords, or add a new custom intake portrait to the queue.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-[#181919] hover:bg-[#2c2d2c] text-white text-[10px] font-sans font-bold tracking-wider uppercase px-4 py-2.5 rounded transition-all mt-2"
                  >
                    Upload Intake File
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 overflow-y-auto max-h-[85vh] pr-1 scrollbar-none">
                  {filteredArtworks.map((art) => (
                    <ArtworkCard
                      key={art.id}
                      artwork={art}
                      isSelected={selectedArtworkId === art.id}
                      onClick={() => selectArtworkOnMobile(art.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* WORKSTATION REVIEW PANEL */}
            <section className={`${isRosterExpanded ? 'col-span-12 lg:col-span-8' : 'col-span-12'} flex flex-col space-y-6 ${!isMobileWorkspaceOpen ? 'hidden lg:flex' : 'flex'} ${!isRosterExpanded ? 'max-w-6xl mx-auto w-full' : ''}`}>
              
              {/* Mobile Back navigation bar */}
              <div className="lg:hidden flex items-center justify-between border-b border-[#e9e8e7] pb-4">
                <button
                  onClick={() => setIsMobileWorkspaceOpen(false)}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Queue
                </button>
                <span className="text-xs font-mono font-bold text-gray-500">
                  {selectedArtwork ? selectedArtwork.referenceNumber : 'No Selection'}
                </span>
              </div>

              {selectedArtwork ? (
                <div className="bg-white border border-[#e8e6e1] rounded-xl overflow-hidden shadow-xs flex flex-col">
                  
                  {/* Workstation Header */}
                  <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded">
                          {selectedArtwork.referenceNumber}
                        </span>
                        
                        {/* Database Auto-save confirmation indicator */}
                        {saveIndicator === 'saving' && (
                          <span className="text-[10px] text-gray-400 font-mono italic animate-pulse flex items-center gap-1">
                            ● saving spec...
                          </span>
                        )}
                        {saveIndicator === 'saved' && (
                          <span className="text-[10px] text-slate-500 font-mono font-semibold flex items-center gap-0.5 animate-fade-in-out">
                            <CheckCircle className="w-3 h-3 text-slate-500" /> saved
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-sm font-sans font-extrabold text-gray-900 truncate leading-snug">
                        WORKSTATION / {selectedArtwork.title.toUpperCase()}
                      </h2>
                    </div>

                    {/* Technical status quick pill badge */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider font-sans px-2.5 py-1 rounded-lg border shrink-0 ${
                      selectedArtwork.status === 'Approved for Production' 
                        ? 'text-emerald-700 bg-emerald-100 border-emerald-200 font-bold' 
                        : selectedArtwork.status === 'Changes Drafted'
                        ? 'text-blue-700 bg-blue-50 border-blue-200 font-bold'
                        : 'text-amber-700 bg-amber-50 border-amber-200 font-bold'
                    }`}>
                      {selectedArtwork.status === 'Changes Drafted' ? 'In Revision' : selectedArtwork.status === 'Pending Review' ? 'Needs Approval' : 'Approved'}
                    </span>
                  </div>

                  {/* COMPACT AUTO-FILL INFO BANNER */}
                  <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-4 gap-4 text-[11px] text-gray-650 font-sans">
                    <div className="truncate">
                      <span className="font-bold text-gray-400 uppercase tracking-wider block text-[9px] mb-0.5">Client Name</span>
                      <span className="font-semibold text-gray-800">{selectedArtwork.clientName || 'N/A'}</span>
                    </div>
                    <div className="truncate col-span-2">
                      <span className="font-bold text-gray-400 uppercase tracking-wider block text-[9px] mb-0.5">Address Location</span>
                      <span className="font-semibold text-gray-800">{selectedArtwork.address ? `${selectedArtwork.address}, ${selectedArtwork.cityState || ''}` : 'N/A'}</span>
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-gray-400 uppercase tracking-wider block text-[9px] mb-0.5">Coordinates & Year</span>
                      <span className="font-semibold text-gray-800">
                        {selectedArtwork.coordinates || 'N/A'} {selectedArtwork.estDate ? `(${selectedArtwork.estDate})` : ''}
                      </span>
                    </div>
                  </div>              {/* Workstation Core Content body */}
              <div className="p-6 space-y-8">
                
                {/* 1. INTERACTIVE WORKSPACE GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Live Mock Visualizer and Asset Preview */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Visualizer Preview */}
                    <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs">
                      <label className="block text-[11px] font-bold tracking-wider font-sans uppercase text-[#181919] mb-3">
                        Framing Design Visualizer (Live Spec Preview)
                      </label>
                      <ArtworkFramePreview artwork={selectedArtwork} />
                    </div>

                    {/* Tab Selector for Intake Photo vs Rendered Asset */}
                    <div className="flex border-b border-gray-200 pb-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setActiveWorkstationTab('transformed')}
                        className={`pb-1.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                          activeWorkstationTab === 'transformed'
                            ? 'border-blue-600 text-blue-600 font-extrabold'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        ✨ Transformed Rendering
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveWorkstationTab('original')}
                        className={`pb-1.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all flex items-center gap-1 ${
                          activeWorkstationTab === 'original'
                            ? 'border-blue-600 text-blue-600 font-extrabold'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        📸 Client Home Photo
                      </button>
                    </div>

                    {/* Tab contents */}
                    {activeWorkstationTab === 'original' && (
                      <div className="bg-gray-50 border border-gray-250/80 rounded-lg p-4 flex flex-col items-center justify-center space-y-3 relative overflow-hidden aspect-[16/9]">
                        {selectedArtwork.originalImage ? (
                          <>
                            <img 
                              src={selectedArtwork.originalImage} 
                              alt="Intake Home Photo" 
                              referrerPolicy="no-referrer"
                              className="max-h-full max-w-full object-contain shadow-xs bg-white rounded"
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1.5">
                              <span className="text-[9px] bg-black/60 text-white font-mono px-2 py-0.5 rounded backdrop-blur-xs">
                                Client Upload
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-gray-400 py-6">
                            <p className="text-xs font-mono">No raw home photo uploaded yet.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeWorkstationTab === 'transformed' && selectedArtwork.imageData && (
                      <div className="bg-gray-50 border border-gray-250/80 rounded-lg p-6 space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-950 flex items-center gap-1.5 font-sans">
                            <Sparkles className="w-4 h-4 text-blue-600" /> Transformed Art Asset
                          </h4>
                          {selectedArtwork.imageData && (
                            <button
                              type="button"
                              onClick={handleGenerateAIArtwork}
                              disabled={isGenerating}
                              className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-1 cursor-pointer"
                              title="Regenerate the AI rendering using current settings"
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" /> Regenerating...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3" /> Regenerate AI Render
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        <div className="aspect-[16/9] bg-white border border-gray-250/70 rounded-lg flex items-center justify-center overflow-hidden shadow-xs p-2">
                          <img 
                            src={selectedArtwork.imageData} 
                            alt="Transformed Art Asset" 
                            className="max-h-full max-w-full object-contain rounded"
                          />
                        </div>

                        {selectedArtwork.processingMode === 'AI Generation' && (
                          <div className="p-4 bg-white border border-gray-200 rounded-lg text-left space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Active AI Prompt
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const fullPrompt = getAIArtworkPrompt(
                                    selectedArtwork.style === 'Watercolor' ? 'Watercolor' : 'Pencil Sketch'
                                  );
                                  navigator.clipboard.writeText(fullPrompt);
                                  alert('Copied AI prompt to clipboard!');
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase"
                              >
                                Copy Prompt
                              </button>
                            </div>
                            <div className="text-[10.5px] text-gray-650 bg-gray-50 p-3 rounded-md border border-gray-100 font-mono leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-pointer" title="Click to expand full prompt">
                              {getAIArtworkPrompt(
                                selectedArtwork.style === 'Watercolor' ? 'Watercolor' : 'Pencil Sketch'
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Layout & Composition Controls */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-gray-50/50 border border-gray-200/80 rounded-xl p-5 space-y-5">
                      <h4 className="text-xs font-bold tracking-[0.1em] text-gray-800 uppercase font-sans flex items-center gap-1.5 border-b border-gray-150 pb-2">
                        <Sliders className="w-4 h-4 text-blue-600" /> Layout & Composition
                      </h4>
                      
                      {/* Image Scale Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold font-sans text-gray-500 uppercase mb-1">
                          <span>Artwork Image Scale</span>
                          <span className="text-blue-600 font-mono font-bold">{Math.round((selectedArtwork.imageScale || 1.0) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="4.0"
                          step="0.05"
                          value={selectedArtwork.imageScale || 1.0}
                          onChange={(e) => handleUpdateActiveSpecs({ imageScale: parseFloat(e.target.value) })}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Source Crop Y Slider */}
                      {selectedArtwork.processingMode === 'Photo Filter' && (selectedArtwork.originalImage || selectedArtwork.imageData) && (
                        <div>
                          <div className="flex justify-between text-[10px] font-bold font-sans text-gray-500 uppercase mb-1">
                            <span>Source Crop (Pan)</span>
                            <span className="text-blue-600 font-mono font-bold">{selectedArtwork.sourceCropY !== undefined ? selectedArtwork.sourceCropY : 50}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={selectedArtwork.sourceCropY !== undefined ? selectedArtwork.sourceCropY : 50}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              handleUpdateActiveSpecs({ sourceCropY: val });
                            }}
                            onMouseUp={(e) => {
                              const val = parseInt((e.target as HTMLInputElement).value);
                              regenerateArtwork(selectedArtwork.style, val);
                            }}
                            onTouchEnd={(e) => {
                              const val = parseInt((e.target as HTMLInputElement).value);
                              regenerateArtwork(selectedArtwork.style, val);
                            }}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      )}

                      {/* Image Y-Offset Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold font-sans text-gray-500 uppercase mb-1">
                          <span>Vertical Position (Y-Offset)</span>
                          <span className="text-blue-600 font-mono font-bold">{selectedArtwork.imageYOffset !== undefined ? selectedArtwork.imageYOffset : 300} px</span>
                        </div>
                        <input
                          type="range"
                          min="-4000"
                          max="6000"
                          step="20"
                          value={selectedArtwork.imageYOffset !== undefined ? selectedArtwork.imageYOffset : 300}
                          onChange={(e) => handleUpdateActiveSpecs({ imageYOffset: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Image X-Offset Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold font-sans text-gray-500 uppercase mb-1">
                          <span>Horizontal Position (X-Offset)</span>
                          <span className="text-blue-600 font-mono font-bold">{selectedArtwork.imageXOffset !== undefined ? selectedArtwork.imageXOffset : 0} px</span>
                        </div>
                        <input
                          type="range"
                          min="-5000"
                          max="5000"
                          step="20"
                          value={selectedArtwork.imageXOffset !== undefined ? selectedArtwork.imageXOffset : 0}
                          onChange={(e) => handleUpdateActiveSpecs({ imageXOffset: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Text Y-Offset Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold font-sans text-gray-500 uppercase mb-1">
                          <span>Address Text Y-Offset</span>
                          <span className="text-blue-600 font-mono font-bold">{selectedArtwork.textYOffset !== undefined ? selectedArtwork.textYOffset : 5700} px</span>
                        </div>
                        <input
                          type="range"
                          min="4500"
                          max="7000"
                          step="20"
                          value={selectedArtwork.textYOffset !== undefined ? selectedArtwork.textYOffset : 5700}
                          onChange={(e) => handleUpdateActiveSpecs({ textYOffset: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Custom Text Overrides */}
                      <div className="space-y-3 pt-3 border-t border-gray-200/60">
                        <span className="block text-[10px] font-bold tracking-wider font-sans uppercase text-[#181919]">
                          Text Line Overrides
                        </span>
                        <div>
                          <label className="block text-[9px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-0.5">
                            Line 1 (Address | City)
                          </label>
                          <input
                            type="text"
                            value={selectedArtwork.textLine1Override || ''}
                            onChange={(e) => handleUpdateActiveSpecs({ textLine1Override: e.target.value })}
                            placeholder={
                              selectedArtwork.address 
                                ? (selectedArtwork.cityState 
                                    ? `${selectedArtwork.address} | ${selectedArtwork.cityState.split(',')[0].trim()}`.toUpperCase()
                                    : selectedArtwork.address.toUpperCase())
                                : '1450 HILLSIDE AVENUE'
                            }
                            className="w-full bg-white border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#181919]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-0.5">
                            Line 2 (GPS Coordinates)
                          </label>
                          <input
                            type="text"
                            value={selectedArtwork.textLine2Override || ''}
                            onChange={(e) => handleUpdateActiveSpecs({ textLine2Override: e.target.value })}
                            placeholder={selectedArtwork.coordinates || '37.8972° N, 122.5311° W'}
                            className="w-full bg-white border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#181919]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-0.5">
                            Line 3 (Established Year)
                          </label>
                          <input
                            type="text"
                            value={selectedArtwork.textLine3Override || ''}
                            onChange={(e) => handleUpdateActiveSpecs({ textLine3Override: e.target.value })}
                            placeholder={
                              (selectedArtwork.estDate 
                                ? `EST. ${selectedArtwork.estDate.replace(/^EST\.\s*/i, '')}`.toUpperCase()
                                : '') || 'EST. 1961'
                            }
                            className="w-full bg-white border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#181919]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. PRODUCTION SETTINGS SECTION (Style choice, specs, customer details inputs) */}
                <div className="space-y-6 border-t border-gray-100 pt-6">
                  
                  {/* Style choice and Static print specifications */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rendering Style Selection */}
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold tracking-wider font-sans uppercase text-gray-500">
                        Rendering Style
                      </label>
                      <div className="flex gap-2">
                        {[
                          { val: 'Watercolor', label: 'Color Watercolor Painting' },
                          { val: 'Pencil Sketch', label: 'Black & White Sketch' }
                        ].map((styleOpt) => {
                          const isChosen = selectedArtwork.style === styleOpt.val;
                          return (
                            <button
                              key={styleOpt.val}
                              type="button"
                              disabled={isGenerating}
                              onClick={async () => {
                                const newStyle = styleOpt.val as ArtworkStyle;
                                const isWatercolor = newStyle === 'Watercolor';
                                const cachedAiImage = isWatercolor 
                                  ? selectedArtwork.aiWatercolorImage 
                                  : selectedArtwork.aiSketchImage;
                                
                                if (cachedAiImage) {
                                  await handleUpdateActiveSpecs({
                                    style: newStyle,
                                    imageData: cachedAiImage
                                  });
                                } else {
                                  await handleUpdateActiveSpecs({
                                    style: newStyle,
                                    imageData: ''
                                  });
                                }
                              }}
                              className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2.5 border rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                isChosen
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold'
                                  : 'bg-transparent border-gray-250 text-gray-650 hover:bg-gray-50 hover:border-gray-400'
                              }`}
                            >
                              {styleOpt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Static specifications display */}
                    <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-2 text-center items-center">
                      <div>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-gray-400 font-sans">Molding</span>
                        <span className="text-[10px] font-semibold text-gray-700">Print Only (Unframed)</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-gray-400 font-sans">Mat Margin</span>
                        <span className="text-[10px] font-semibold text-gray-700">2 Inch Border</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-gray-400 font-sans">Dimensions</span>
                        <span className="text-[10px] font-semibold text-gray-700">24" x 36" (300 DPI)</span>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Customer Details Entry Form */}
                  <details className="group border border-gray-200 rounded-lg bg-white overflow-hidden transition-all duration-300">
                    <summary className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 font-sans text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer select-none">
                      <span>Customer intake & Address specifications</span>
                      <span className="transition-transform duration-300 group-open:rotate-180">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </span>
                    </summary>
                    
                    <div className="p-5 space-y-4 border-t border-gray-150">
                      {/* Title & Client Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-1">
                            Artwork title
                          </label>
                          <input
                            type="text"
                            value={selectedArtwork.title}
                            onChange={(e) => handleUpdateActiveSpecs({ title: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#181919]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-1">
                            Client / Recipient
                          </label>
                          <input
                            type="text"
                            value={selectedArtwork.clientName}
                            onChange={(e) => handleUpdateActiveSpecs({ clientName: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#181919]"
                          />
                        </div>
                      </div>

                      {/* Address & City/State */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-1">
                            Street Address
                          </label>
                          <input
                            type="text"
                            value={selectedArtwork.address || ''}
                            onChange={(e) => handleUpdateActiveSpecs({ address: e.target.value })}
                            placeholder="e.g. 1450 Hillside Avenue"
                            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#181919]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-1">
                            City, State
                          </label>
                          <input
                            type="text"
                            value={selectedArtwork.cityState || ''}
                            onChange={(e) => handleUpdateActiveSpecs({ cityState: e.target.value })}
                            placeholder="e.g. Mill Valley, California"
                            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#181919]"
                          />
                        </div>
                      </div>

                      {/* GPS Coordinates & Est Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-1 flex items-center justify-between">
                            <span>GPS Coordinates</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleGeocodeWorkstation}
                                disabled={isGeocoding}
                                className="text-[9px] font-bold uppercase text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-0.5 cursor-pointer"
                              >
                                {isGeocoding ? (
                                  <>
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Locating...
                                  </>
                                ) : (
                                  <>
                                    <Compass className="w-2.5 h-2.5" /> Auto-Lookup
                                  </>
                                )}
                              </button>
                              {selectedArtwork.coordinates && (
                                <button
                                  type="button"
                                  onClick={copyCoordinatesToClipboard}
                                  className="text-[9px] font-bold uppercase text-gray-500 hover:text-gray-800 flex items-center gap-0.5 cursor-pointer border border-gray-200 px-1 rounded bg-gray-55"
                                >
                                  {copied ? (
                                    <>
                                      <Check className="w-2.5 h-2.5 text-emerald-600" /> Mapped!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-2.5 h-2.5" /> Copy GPS
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </label>
                          <input
                            type="text"
                            value={selectedArtwork.coordinates || ''}
                            onChange={(e) => handleUpdateActiveSpecs({ coordinates: e.target.value })}
                            placeholder="e.g. 37.8972° N, 122.5311° W"
                            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#181919]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-1">
                            Est. Year / Line 3
                          </label>
                          <input
                            type="text"
                            value={selectedArtwork.estDate || ''}
                            onChange={(e) => handleUpdateActiveSpecs({ estDate: e.target.value })}
                            placeholder="e.g. EST. 1961"
                            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#181919]"
                          />
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Production notes */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-1.5">
                      Production & Revision notes
                    </label>
                    <textarea
                      rows={2}
                      value={selectedArtwork.notes}
                      onChange={(e) => handleUpdateActiveSpecs({ notes: e.target.value })}
                      placeholder="Add layout changes or notes requested by client prior to framing..."
                      className="w-full bg-white border border-gray-200 rounded p-3 text-sm text-gray-755 focus:outline-none focus:border-[#181919] resize-none"
                    />
                  </div>

                  {/* Status Toggle control block */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider font-sans uppercase text-gray-500 mb-2">
                      Workflow Status
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Pending Review', 'Changes Drafted', 'Approved for Production'] as ArtworkStatus[]).map((statusVal) => {
                        const isCurrent = selectedArtwork.status === statusVal;
                        return (
                          <button
                            key={statusVal}
                            type="button"
                            onClick={() => handleUpdateActiveSpecs({ status: statusVal })}
                            className={`px-2 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border text-center transition-all cursor-pointer ${
                              isCurrent
                                ? statusVal === 'Approved for Production'
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold'
                                  : statusVal === 'Changes Drafted'
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold'
                                  : 'bg-amber-500 border-amber-500 text-white shadow-sm font-bold'
                                : 'bg-transparent border-gray-250 text-gray-650 hover:bg-gray-50 hover:border-gray-450'
                            }`}
                          >
                            {statusVal === 'Changes Drafted' ? 'In Revision' : statusVal === 'Pending Review' ? 'Needs Spec' : 'Approved'}
                          </button>
                        );
                      })}
                    </div>
                  </div>     </div>

                {activeWorkstationTab === 'transformed' && !selectedArtwork.imageData && (
                  <div className="bg-blue-50/40 border border-dashed border-blue-200 rounded-lg p-6 text-center space-y-4">
                    <div className="flex justify-center">
                      <span className="p-3 bg-blue-100/60 rounded-full text-blue-600">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
                        Generate AI Minimalist Translation
                      </h4>
                      <p className="text-xs text-blue-600 max-w-md mx-auto leading-relaxed">
                        Transform the client's home photo into a custom {selectedArtwork.style === 'Watercolor' ? 'Color Watercolor Painting' : 'Black & White Pencil Sketch'} using Google Gemini (Nano Banana) on a clean white paper background.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateAIArtwork}
                      disabled={isGenerating}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-250 text-white text-xs font-bold uppercase tracking-wider px-8 py-3 rounded-lg shadow-sm flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Rendering Artwork...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Run AI Style Pipeline
                        </>
                      )}
                    </button>

                    {errorText && (errorText.includes('paid plans') || errorText.includes('billing')) && (
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left space-y-2">
                        <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1">
                          ⚠️ Billing Required for Imagen 4 API
                        </h5>
                        <p className="text-[11px] text-amber-800 leading-normal">
                          Google AI Studio requires a <strong>Pay-as-you-go</strong> billing plan to access the Imagen image generation API. (The free tier key only covers text models like Gemini Flash).
                        </p>
                        <div className="text-[11px] text-amber-800 font-semibold mt-1">
                          To enable this:
                          <ol className="list-decimal list-inside font-normal space-y-0.5 mt-1">
                            <li>Go to the <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-amber-950">Google AI Studio Console</a></li>
                            <li>Navigate to settings/billing and click <strong>Upgrade to pay-as-you-go</strong></li>
                            <li>Link your API key to a billing account</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg text-left space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          AI Prompt Preview (Style-Specific)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const fullPrompt = getAIArtworkPrompt(
                              selectedArtwork.style === 'Watercolor' ? 'Watercolor' : 'Pencil Sketch'
                            );
                            navigator.clipboard.writeText(fullPrompt);
                            alert('Copied AI prompt to clipboard!');
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase"
                        >
                          Copy Prompt
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-650 bg-gray-50 p-2.5 rounded border border-gray-100 font-mono max-h-32 overflow-y-auto leading-normal">
                        {getAIArtworkPrompt(
                          selectedArtwork.style === 'Watercolor' ? 'Watercolor' : 'Pencil Sketch'
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 italic leading-normal">
                        💡 Choosing a style above updates this prompt template. This is the exact style description sent to the AI generator to apply the artistic effect.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. FINAL SIGN-OFF / ACTION BOARD */}
                <div className="border-t border-gray-100 pt-8 space-y-4">
                  {selectedArtwork.status !== 'Approved for Production' ? (
                    <button
                      onClick={handleApproveForProduction}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold tracking-[0.15em] uppercase py-3.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-xl"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Push
                    </button>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-4 flex items-center gap-3">
                      <span className="p-2 rounded-full bg-emerald-100 text-emerald-700">
                        <FileCheck className="w-5 h-5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 font-sans">
                          Authorized for production output
                        </h4>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Approved by curator christianhorrocks85. High-resolution spec sheet can now be downloaded and output to the plotting workshop.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Specification download triggers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    <button
                      onClick={handleDownloadFramed}
                      type="button"
                      className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Download full layout blueprint containing frame texture, mat, and technical details sheet"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Mockup JPG
                    </button>

                    <button
                      onClick={handleCopyFramedToClipboard}
                      disabled={isCopyingImage}
                      type="button"
                      className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      title="Copy the high-resolution print-ready layout to clipboard for pasting into Canva"
                    >
                      {isCopyingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Copying...
                        </>
                      ) : imageCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied print layout!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Print Image
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadOriginal}
                      type="button"
                      className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Download the raw uploaded image in original resolution"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Download Original
                    </button>

                    <button
                      onClick={handleDownloadTxtSpec}
                      type="button"
                      className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Export clean technical text spec print layout bundle matching paper and sizes"
                    >
                      <FileText className="w-3.5 h-3.5" /> Export Spec Sheet
                    </button>
                  </div>
                </div>

                {/* Confirm Delete Section (Safeguarded) */}
                <div className="border-t border-gray-105 pt-6 flex items-center justify-between text-xs text-gray-400">
                  <span className="font-mono">Last modified: {new Date(selectedArtwork.lastModified).toLocaleString()}</span>
                  
                  {deleteConfirmationId === selectedArtwork.id ? (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <span className="text-red-700 font-semibold text-[11px] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Confirm Delete?
                      </span>
                      <button
                        onClick={() => handleDeleteArtwork(selectedArtwork.id)}
                        className="bg-red-700 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmationId(null)}
                        className="border border-gray-300 px-2.5 py-1 rounded text-[10px] font-bold text-gray-600 hover:bg-gray-100"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmationId(selectedArtwork.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Artwork File
                    </button>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#e8e6e1] rounded-lg p-16 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <span className="p-4 rounded-full bg-[#fbf9f9] border border-gray-100">
                <Sliders className="w-8 h-8 text-gray-300" />
              </span>
              <p className="text-base font-serif font-medium text-gray-900 mt-4">No Selected Sketch</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Pick any architectural frame or watercolor mockup from the roster on the left column to begin adjusting layouts, modifying dimensions, or authorizing printing output.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
      ) : activeTab === 'google-forms' ? (
        <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8 flex-grow w-full">
          <GoogleFormsManager onImportArtwork={handleImportGoogleFormArtwork} />
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8 flex-grow w-full">
          <MarketingPlanner />
        </main>
      )}

      {/* Dynamic Intake Upload Drawer Modal */}
      {isUploadModalOpen && (
        <UploadModal 
          onClose={() => setIsUploadModalOpen(false)}
          onSave={handleCreateArtwork}
        />
      )}

      {/* Aesthetic Footer */}
      <footer className="border-t border-[#e9e8e7] bg-white py-12 text-center text-xs text-gray-400 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Gallery Minimalist Workshop. Production Line Auth Mode.</p>
          <p className="flex items-center gap-1.5 text-gray-400">
            <Database className="w-3.5 h-3.5 text-gray-400" />
            Secured Offline Browser IndexedDB Engine • Active Profile: Lead Curator
          </p>
        </div>
      </footer>
    </div>
  );
}
