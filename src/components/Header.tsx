/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Image as ImageIcon, CheckCircle, Clock } from 'lucide-react';
import { Artwork } from '../types';

interface HeaderProps {
  artworks: Artwork[];
  onUploadClick: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  activeTab: 'workspace' | 'google-forms';
  setActiveTab: (tab: 'workspace' | 'google-forms') => void;
}

export const Header: React.FC<HeaderProps> = ({
  artworks,
  onUploadClick,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  activeTab,
  setActiveTab,
}) => {
  const totalCount = artworks.length;
  const pendingCount = artworks.filter(a => a.status === 'Pending Review').length;
  const draftedCount = artworks.filter(a => a.status === 'Changes Drafted').length;
  const approvedCount = artworks.filter(a => a.status === 'Approved for Production').length;

  return (
    <header className="border-b border-gray-200 bg-white shadow-xs">
      {/* Top Brand Block */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          {/* Pathway Navigation */}
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 font-sans">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
              <div className="w-2.5 h-2.5 border border-white rounded-xs"></div>
            </div>
            <span className="font-bold text-gray-800 uppercase tracking-tight">flow_spec</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500">Internal Workspace</span>
            <span className="text-gray-300">/</span>
            <span className="text-blue-600 font-medium">
              {activeTab === 'workspace' ? 'Production Desk' : 'Forms Sync Desk'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-sans font-extrabold tracking-tight text-gray-900 leading-none">
            Artwork Production Manager
          </h1>
          <p className="text-xs font-sans text-gray-500 mt-1 max-w-xl font-medium">
            System panel for uploading raw portraits, drafting specs, framing overlays, and authorizing full production plotters.
          </p>
        </div>
      </div>

      {/* Modern Tab Bar */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 border-b border-gray-150 flex items-center gap-8 mb-6">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`pb-3 font-sans text-xs font-bold tracking-wider uppercase border-b-2 cursor-pointer transition-all ${
            activeTab === 'workspace' 
              ? 'border-blue-600 text-blue-600 font-extrabold' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          📁 Production Desk
        </button>
        <button
          onClick={() => setActiveTab('google-forms')}
          className={`pb-3 font-sans text-xs font-bold tracking-wider uppercase border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'google-forms' 
              ? 'border-blue-600 text-blue-600 font-extrabold' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Google Forms Dispatch
        </button>
      </div>

      {/* Workshop Stats Board (Tonal Layering Cards) */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 border border-gray-250/80 p-4 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] font-bold font-sans uppercase tracking-wider text-gray-400">Total Database</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-sans font-extrabold text-gray-900">{totalCount}</span>
              <span className="text-xs text-gray-500">files</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-250/80 p-4 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] font-bold font-sans uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> PENDING REVIEW
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-sans font-extrabold text-amber-600">{pendingCount}</span>
              <span className="text-xs text-gray-500">needs specs</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-250/80 p-4 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] font-bold font-sans uppercase tracking-wider text-blue-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> CHANGES DRAFTED
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-sans font-extrabold text-blue-600">{draftedCount}</span>
              <span className="text-xs text-gray-500">revisions</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-250/80 p-4 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] font-bold font-sans uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> APPROVED FOR PROD.
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-sans font-extrabold text-emerald-700">{approvedCount}</span>
              <span className="text-xs text-emerald-600">ready to plot</span>
            </div>
          </div>
        </div>

        {/* Dynamic Controls Bar */}
        {activeTab === 'workspace' && (
          <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Work Search Field */}
            <div className="w-full sm:w-80 relative">
              <input
                type="text"
                placeholder="Search by SKU, Client, or Title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-450 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-sans"
              />
            </div>

            {/* Minimalist Filter Tab Chips */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {['All', 'Pending Review', 'Changes Drafted', 'Approved for Production'].map((status) => {
                const count = status === 'All' 
                  ? totalCount 
                  : artworks.filter(a => a.status === status).length;

                const isSelected = statusFilter === status;

                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap rounded-lg transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                        : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-250 opacity-90'
                    }`}
                  >
                    {status}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-blue-205 text-blue-700 font-bold bg-blue-100' : 'bg-gray-100 text-gray-500 border border-gray-200/50'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
