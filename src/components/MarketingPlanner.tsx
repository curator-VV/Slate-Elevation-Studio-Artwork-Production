/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight, 
  Play, 
  Save, 
  FileVideo, 
  CheckCircle2, 
  RefreshCw, 
  FileText, 
  Layers, 
  FolderPlus,
  Compass,
  ListTodo,
  Video,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { 
  getAllCampaigns, 
  saveCampaign, 
  deleteCampaign,
  getAllAssets, 
  saveAsset, 
  deleteAsset,
  getAllSocialPosts, 
  saveSocialPost, 
  deleteSocialPost,
  getAllChecklists, 
  saveChecklist 
} from '../db/indexedDbHelper';
import { Campaign, MarketingAsset, SocialPost, ProductionChecklist } from '../types';
import { generateMarketingCaption } from '../utils/geminiApi';

const CATEGORY_GROUPS = [
  {
    label: "Strategic Frameworks",
    options: ["GTM Asset", "Pipeline Content", "Under-Embargo Asset", "Seeding Material", "Stealth-Mode Collateral"]
  },
  {
    label: "Pre-Launch & Lead Gen",
    options: ["Teaser Campaign", "Pre-Registration / Pre-Order Asset", "Coming Soon Landing Page (CSLP)", "Waitlist Incentive", "Gated Pre-Release"]
  },
  {
    label: "Testing & Validation",
    options: ["Beta Marketing Collateral", "Proof of Concept (PoC) Showcase", "Prototype Walkthrough", "Minimum Viable Product (MVP) Pitch"]
  },
  {
    label: "Internal Operations",
    options: ["Deliverable-in-Waiting", "Placeholder Asset", "Work in Progress (WIP)", "Staging Content", "Evergreen Asset-in-Reserve"]
  },
  {
    label: "Instagram (Short-Form)",
    options: ["IG Teaser", "IG Content", "IG Hook Variation", "IG B-Roll Bank", "IG Trending Draft", "IG Teaser Snippet", "IG Raw Cut"]
  },
  {
    label: "TikTok (Short-Form)",
    options: ["TK Teaser", "TK Content", "TK Hook Variation", "TK B-Roll Bank", "TK Trending Draft", "TK Teaser Snippet", "TK Raw Cut"]
  }
];

export const MarketingPlanner: React.FC = () => {
  // DB States
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [checklists, setChecklists] = useState<ProductionChecklist[]>([]);

  // UI Active states
  const [activeStageTab, setActiveStageTab] = useState<string>('ingestion');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  
  // Modals & Forms
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  
  // New Campaign Form State
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignState, setNewCampaignState] = useState<'stealth' | 'warm_up' | 'active_drop' | 'completed'>('warm_up');
  const [newCampaignDate, setNewCampaignDate] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');

  // New Asset Form State
  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [newAssetType, setNewAssetType] = useState<'pillar_source' | 'hook_variant' | 'teaser_snippet' | 'b_roll' | 'standalone_post'>('standalone_post');
  const [newAssetRatio, setNewAssetRatio] = useState<'9:16' | '16:9'>('9:16');
  const [newAssetDuration, setNewAssetDuration] = useState<number>(15);
  const [newAssetParentId, setNewAssetParentId] = useState<string>('');
  const [newAssetCampaignId, setNewAssetCampaignId] = useState<string>('');
  const [newAssetFileUrl, setNewAssetFileUrl] = useState<string>('');
  
  // Scheduling & Ingestion extensions
  const [newAssetCategoryTag, setNewAssetCategoryTag] = useState<string>('GTM Asset');
  const [newAssetCreativeBriefUrl, setNewAssetCreativeBriefUrl] = useState<string>('');
  const [newAssetBriefingNotes, setNewAssetBriefingNotes] = useState<string>('');
  const [newAssetTheme, setNewAssetTheme] = useState<string>("Founder's 50 (Exclusivity)");
  const [newAssetFocusContext, setNewAssetFocusContext] = useState<string>('');
  const [newAssetScheduledDate, setNewAssetScheduledDate] = useState<string>('');
  const [newAssetPlatform, setNewAssetPlatform] = useState<'tiktok' | 'instagram_reels' | 'instagram_post' | 'youtube_shorts' | 'linkedin'>('instagram_reels');
  const [newAssetStage, setNewAssetStage] = useState<string>('backlog');
  const [newAssetCaption, setNewAssetCaption] = useState<string>('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState<boolean>(false);

  // Calendar states
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarAsset, setSelectedCalendarAsset] = useState<MarketingAsset | null>(null);
  const [isCalendarDetailOpen, setIsCalendarDetailOpen] = useState<boolean>(false);
  
  // Active refinement card id for detail view
  const [refinementAssetId, setRefinementAssetId] = useState<string | null>(null);

  // Social Post form overrides
  const [socialPostCaptions, setSocialPostCaptions] = useState<Record<string, string>>({});
  const [socialPostAudios, setSocialPostAudios] = useState<Record<string, string>>({});
  const [socialPostDates, setSocialPostDates] = useState<Record<string, string>>({});
  const [socialPostPlatforms, setSocialPostPlatforms] = useState<Record<string, string>>({});

  // Loading indicator
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const c = await getAllCampaigns();
      const a = await getAllAssets();
      const s = await getAllSocialPosts();
      const ch = await getAllChecklists();
      
      setCampaigns(c);
      setAssets(a);
      setSocialPosts(s);
      setChecklists(ch);
      
      // Expand all campaigns by default
      const expansions: Record<string, boolean> = {};
      c.forEach(camp => {
        expansions[camp.id] = true;
      });
      setExpandedCampaigns(expansions);
    } catch (e) {
      console.error('Failed to load marketing planner database stores:', e);
    } finally {
      setLoading(false);
    }
  };

  // 1. CAMPAIGN CREATION
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    const campaign: Campaign = {
      id: 'camp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      name: newCampaignName.trim(),
      campaign_state: newCampaignState,
      target_launch_date: newCampaignDate || new Date().toISOString().split('T')[0],
      description: newCampaignDesc.trim()
    };

    await saveCampaign(campaign);
    setNewCampaignName('');
    setNewCampaignDate('');
    setNewCampaignDesc('');
    setIsCampaignModalOpen(false);
    loadData();
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Are you sure you want to delete this campaign? Linked posts will remain but lose their campaign association.')) {
      await deleteCampaign(id);
      
      // Update any posts linked to this campaign to have campaign_id undefined
      const linkedPosts = socialPosts.filter(p => p.campaign_id === id);
      for (const p of linkedPosts) {
        await saveSocialPost({ ...p, campaign_id: undefined });
      }
      
      loadData();
    }
  };

  // Toggle Campaign Accordion
  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 2. ASSET INGESTION (Stage 1 & Custom Scheduling Ingestion)
  const handleIngestAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetTitle.trim()) return;

    const assetId = 'asset_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const timestamp = new Date().toISOString();

    const asset: MarketingAsset = {
      id: assetId,
      parent_id: newAssetParentId || undefined,
      title: newAssetTitle.trim(),
      status: newAssetStage as any,
      asset_type: newAssetType,
      file_url: newAssetFileUrl || undefined,
      aspect_ratio: newAssetRatio,
      duration_sec: newAssetDuration,
      created_at: timestamp,
      updated_at: timestamp,
      category_tag: newAssetCategoryTag,
      creative_brief_url: newAssetCreativeBriefUrl.trim() || undefined,
      briefing_notes: newAssetBriefingNotes.trim() || undefined,
      theme: newAssetTheme,
      focus_context: newAssetFocusContext.trim() || undefined
    };

    // Save asset
    await saveAsset(asset);

    // Auto-create checklist for Stage 2 (check all if already staging/scheduled/deployed)
    const isCompleted = newAssetStage === 'draft_staged' || newAssetStage === 'queue_scheduled' || newAssetStage === 'live_deployed';
    const checklist: ProductionChecklist = {
      id: 'chk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      asset_id: assetId,
      hook_finalized: isCompleted,
      b_roll_stitched: isCompleted,
      captions_generated: isCompleted,
      audio_selected: isCompleted
    };
    await saveChecklist(checklist);

    // Auto-create social post deployment link
    const socialPostId = 'post_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const socialPost: SocialPost = {
      id: socialPostId,
      asset_id: assetId,
      campaign_id: newAssetCampaignId || undefined,
      platform: newAssetPlatform,
      caption: newAssetCaption.trim(),
      audio_track: '',
      publish_type: newAssetScheduledDate ? 'manual_reminder' : 'api_automated',
      scheduled_for: newAssetScheduledDate ? new Date(newAssetScheduledDate).toISOString() : undefined,
      published_at: newAssetStage === 'live_deployed' ? timestamp : undefined
    };
    await saveSocialPost(socialPost);

    // Reset Form
    setNewAssetTitle('');
    setNewAssetParentId('');
    setNewAssetCampaignId('');
    setNewAssetFileUrl('');
    setNewAssetCategoryTag('GTM Asset');
    setNewAssetCreativeBriefUrl('');
    setNewAssetBriefingNotes('');
    setNewAssetTheme("Founder's 50 (Exclusivity)");
    setNewAssetFocusContext('');
    setNewAssetScheduledDate('');
    setNewAssetPlatform('instagram_reels');
    setNewAssetStage('backlog');
    setNewAssetCaption('');
    setIsAssetModalOpen(false);
    loadData();
  };

  // Mock File Upload (sets raw base64 mock)
  const handleFileUploadMock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewAssetFileUrl(reader.result as string);
        // Automatically determine aspect ratio if it looks vertical
        setNewAssetRatio('9:16');
      };
      reader.readAsDataURL(file);
    }
  };

  // generate marketing caption via Gemini
  const handleGenerateAICaption = async () => {
    if (!newAssetFocusContext.trim()) {
      alert('Please specify a post focus or context first so the AI has context to write.');
      return;
    }
    
    setIsGeneratingCaption(true);
    try {
      const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '') as string;
      const text = await generateMarketingCaption(
        newAssetTheme,
        newAssetFocusContext.trim(),
        newAssetPlatform,
        apiKey
      );
      setNewAssetCaption(text);
    } catch (e: any) {
      console.error(e);
      alert('AI Caption Generation failed: ' + (e.message || e));
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // 3. REFINEMENT & PROGRESS CHECKLIST (Stage 2)
  const handleUpdateChecklist = async (assetId: string, field: keyof Omit<ProductionChecklist, 'id' | 'asset_id'>) => {
    const chk = checklists.find(c => c.asset_id === assetId);
    if (!chk) return;

    const updatedChecklist = {
      ...chk,
      [field]: !chk[field]
    };

    await saveChecklist(updatedChecklist);
    
    // Refresh local checklists list
    setChecklists(prev => prev.map(c => c.id === chk.id ? updatedChecklist : c));
  };

  // Flip status to asset_in_refinement (Moves to WIP)
  const handleMoveToInProgress = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    const updatedAsset: MarketingAsset = {
      ...asset,
      status: 'asset_in_refinement',
      updated_at: new Date().toISOString()
    };
    await saveAsset(updatedAsset);
    setRefinementAssetId(assetId);
    loadData();
  };

  // Gated transition: Move to Stage 3 (Vault)
  const handleMoveToStaged = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    const chk = checklists.find(c => c.asset_id === assetId);
    if (!asset || !chk) return;

    // Antigravity Logic Gate
    const isReady = chk.hook_finalized && chk.b_roll_stitched && chk.captions_generated && chk.audio_selected;
    if (!isReady) {
      alert('🔒 Antigravity Logic Gate: You must check off all 4 Refinement Checklist items before committing this asset to the Staging Vault.');
      return;
    }

    const updatedAsset: MarketingAsset = {
      ...asset,
      status: 'draft_staged',
      updated_at: new Date().toISOString()
    };
    await saveAsset(updatedAsset);
    loadData();
  };

  // 4. STAGING (Stage 3) - Build captions & metadata
  const handleUpdateSocialPostMetadata = async (assetId: string) => {
    const post = socialPosts.find(p => p.asset_id === assetId);
    if (!post) return;

    const caption = socialPostCaptions[assetId] || post.caption;
    const audio = socialPostAudios[assetId] || post.audio_track;
    const platform = socialPostPlatforms[assetId] || post.platform;

    const updatedPost: SocialPost = {
      ...post,
      caption,
      audio_track: audio,
      platform: platform as any
    };

    await saveSocialPost(updatedPost);
    alert('Caption and audio configurations committed to Social Post metadata!');
    loadData();
  };

  // 5. SCHEDULING (Stage 4) - Bind date/trigger
  const handleSchedulePost = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    const post = socialPosts.find(p => p.asset_id === assetId);
    if (!asset || !post) return;

    const dateStr = socialPostDates[assetId];
    if (!dateStr) {
      alert('Please select a rollout date first.');
      return;
    }

    const updatedAsset: MarketingAsset = {
      ...asset,
      status: 'queue_scheduled',
      updated_at: new Date().toISOString()
    };
    
    const updatedPost: SocialPost = {
      ...post,
      scheduled_for: new Date(dateStr).toISOString()
    };

    await saveAsset(updatedAsset);
    await saveSocialPost(updatedPost);
    loadData();
  };

  // Event Trigger (Alternative Trigger)
  const handleLinkEventTrigger = async (assetId: string, eventName: string) => {
    const asset = assets.find(a => a.id === assetId);
    const post = socialPosts.find(p => p.asset_id === assetId);
    if (!asset || !post) return;

    const updatedAsset: MarketingAsset = {
      ...asset,
      status: 'queue_scheduled',
      updated_at: new Date().toISOString()
    };

    const updatedPost: SocialPost = {
      ...post,
      publish_type: 'api_automated',
      caption: `${post.caption} [Linked Trigger: ${eventName}]`
    };

    await saveAsset(updatedAsset);
    await saveSocialPost(updatedPost);
    alert(`Asset successfully linked to event trigger: "${eventName}". Status updated to Scheduled Queue.`);
    loadData();
  };

  // 6. DEPLOYMENT & CLEANUP (Stage 5)
  const handleDeployNow = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    const post = socialPosts.find(p => p.asset_id === assetId);
    if (!asset || !post) return;

    const timestamp = new Date().toISOString();

    const updatedAsset: MarketingAsset = {
      ...asset,
      status: 'live_deployed',
      updated_at: timestamp
    };

    const updatedPost: SocialPost = {
      ...post,
      published_at: timestamp
    };

    await saveAsset(updatedAsset);
    await saveSocialPost(updatedPost);
    loadData();
  };

  // Cleanup heavy asset file data URLs to save DB space
  const handleArchiveFileCleanup = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    const updatedAsset: MarketingAsset = {
      ...asset,
      file_url: undefined, // Wipes the base64 payload
      updated_at: new Date().toISOString()
    };

    await saveAsset(updatedAsset);
    alert('B-Roll file media cleared from local Database to save space! Metadata and logs remain.');
    loadData();
  };

  const handleDeleteAsset = async (id: string) => {
    if (confirm('Are you sure you want to delete this marketing asset and its deployment logs?')) {
      await deleteAsset(id);
      
      const post = socialPosts.find(p => p.asset_id === id);
      if (post) {
        await deleteSocialPost(post.id);
      }
      
      loadData();
    }
  };

  // Form helper: format Date for HTML5 date inputs
  const formatDateForInput = (isoString?: string) => {
    if (!isoString) return '';
    return isoString.split('T')[0];
  };

  // Helper labels
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'backlog':
        return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Backlog Idea</span>;
      case 'raw_b_roll':
        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Raw Footage</span>;
      case 'asset_in_refinement':
        return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-semibold">Refining (WIP)</span>;
      case 'draft_staged':
        return <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Draft Staged</span>;
      case 'queue_scheduled':
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3"/> Scheduled</span>;
      case 'live_deployed':
        return <span className="bg-gray-900 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Live Deployed</span>;
      default:
        return null;
    }
  };

  const prevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getAssetsForDate = (date: Date) => {
    return assets.filter(asset => {
      const post = socialPosts.find(p => p.asset_id === asset.id);
      if (!post) return false;
      
      const dateStr = date.toDateString();
      if (asset.status === 'queue_scheduled' && post.scheduled_for) {
        return new Date(post.scheduled_for).toDateString() === dateStr;
      }
      if (asset.status === 'live_deployed' && post.published_at) {
        return new Date(post.published_at).toDateString() === dateStr;
      }
      return false;
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram_reels':
      case 'instagram_post':
        return <span className="inline-flex items-center gap-0.5 text-pink-600 font-bold bg-pink-50 border border-pink-100 rounded px-1 text-[9px]">📸 IG</span>;
      case 'tiktok':
        return <span className="inline-flex items-center gap-0.5 text-black font-bold bg-gray-100 border border-gray-250 rounded px-1 text-[9px]">🎵 TK</span>;
      case 'youtube_shorts':
        return <span className="inline-flex items-center gap-0.5 text-red-600 font-bold bg-red-50 border border-red-100 rounded px-1 text-[9px]">▶️ YT</span>;
      case 'linkedin':
        return <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold bg-blue-50 border border-blue-100 rounded px-1 text-[9px]">💼 IN</span>;
      default:
        return <span className="inline-flex items-center gap-0.5 text-gray-500 font-bold bg-gray-50 border border-gray-200 rounded px-1 text-[9px]">📝 Post</span>;
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const renderCalendarView = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Generate days grid
    const cells: { date: Date; isPadding: boolean }[] = [];
    
    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isPadding: true
      });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        date: new Date(year, month, i),
        isPadding: false
      });
    }
    
    // Next month padding (make it 42 cells total)
    const nextPaddingCount = 42 - cells.length;
    for (let i = 1; i <= nextPaddingCount; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isPadding: true
      });
    }

    return (
      <div className="space-y-4">
        {/* Calendar Nav Header */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-150 rounded-xl p-3">
          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-white hover:border-gray-250 border border-transparent rounded transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <span className="text-xs font-bold text-gray-900 font-sans uppercase tracking-wider px-2">
              {monthNames[month]} {year}
            </span>
            <button 
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-white hover:border-gray-250 border border-transparent rounded transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => setCurrentCalendarDate(new Date())}
            className="text-[10px] font-bold uppercase tracking-wider border border-gray-300 rounded px-2.5 py-1 text-gray-650 hover:bg-white transition-all cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-3xs">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50 text-center py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>
          
          {/* Grid Cells */}
          <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-gray-150">
            {cells.map((cell, idx) => {
              const dayAssets = getAssetsForDate(cell.date);
              const isToday = cell.date.toDateString() === new Date().toDateString();
              
              return (
                <div 
                  key={idx}
                  onClick={() => {
                    const localDateStr = cell.date.getFullYear() + '-' + String(cell.date.getMonth() + 1).padStart(2, '0') + '-' + String(cell.date.getDate()).padStart(2, '0');
                    setNewAssetScheduledDate(localDateStr);
                    setNewAssetStage('queue_scheduled');
                    setIsAssetModalOpen(true);
                  }}
                  className={`min-h-[90px] p-2 hover:bg-gray-50/40 transition-colors cursor-pointer flex flex-col justify-between ${
                    cell.isPadding ? 'bg-gray-50/20 text-gray-350' : 'text-gray-900'
                  } ${isToday ? 'bg-blue-50/20 ring-1 ring-blue-500/25' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-mono font-bold px-1 py-0.2 rounded ${
                      isToday ? 'bg-blue-600 text-white font-extrabold' : ''
                    }`}>
                      {cell.date.getDate()}
                    </span>
                  </div>
                  
                  {/* Event Badges List */}
                  <div 
                    className="space-y-1 mt-2 w-full"
                    onClick={(e) => e.stopPropagation()} // Prevent cell click
                  >
                    {dayAssets.map(asset => {
                      const post = socialPosts.find(p => p.asset_id === asset.id);
                      return (
                        <div 
                          key={asset.id}
                          onClick={() => {
                            setSelectedCalendarAsset(asset);
                            setIsCalendarDetailOpen(true);
                          }}
                          className={`p-1 text-[9px] rounded border transition-all cursor-pointer flex items-center justify-between gap-1 ${
                            asset.status === 'live_deployed' 
                              ? 'bg-zinc-800 border-zinc-950 text-white font-semibold' 
                              : 'bg-indigo-50 border-indigo-200 text-indigo-800 font-semibold'
                          }`}
                        >
                          <span className="truncate max-w-[50px]">{asset.title}</span>
                          {post && getPlatformIcon(post.platform)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 pb-12 flex-grow w-full font-sans">
      <div className="grid grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CAMPAIGNS PANEL (1/3 width) */}
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#e8e6e1] rounded-xl p-5 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h2 className="text-xs font-sans font-bold tracking-wider text-gray-400 uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-600" /> Campaigns & Rollouts
              </h2>
              <button 
                onClick={() => setIsCampaignModalOpen(true)}
                className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3"/> Add
              </button>
            </div>

            {loading ? (
              <p className="text-xs text-gray-450 text-center py-6">Querying local IndexedDB...</p>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-gray-200 rounded-lg">
                <p className="text-xs text-gray-450">No campaigns created yet.</p>
                <button 
                  onClick={() => setIsCampaignModalOpen(true)}
                  className="text-xs text-blue-600 font-bold uppercase mt-2 hover:underline cursor-pointer"
                >
                  Create your first Campaign
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {campaigns.map((camp) => {
                  const campAssets = assets.filter(a => {
                    const post = socialPosts.find(p => p.asset_id === a.id);
                    return post?.campaign_id === camp.id;
                  });

                  const isExpanded = expandedCampaigns[camp.id];

                  return (
                    <div key={camp.id} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                      {/* Campaign Header Toggle */}
                      <div 
                        onClick={() => toggleCampaign(camp.id)}
                        className="flex items-center justify-between p-3.5 bg-white border-b border-gray-200 cursor-pointer hover:bg-gray-50 select-none"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-gray-900 uppercase font-sans tracking-wide">{camp.name}</h3>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              camp.campaign_state === 'stealth' ? 'bg-zinc-100 text-zinc-700' :
                              camp.campaign_state === 'warm_up' ? 'bg-amber-100 text-amber-800' :
                              camp.campaign_state === 'active_drop' ? 'bg-red-100 text-red-800 font-bold' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {camp.campaign_state.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-450 font-mono mt-0.5">Launch: {camp.target_launch_date}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCampaign(camp.id);
                            }}
                            className="p-1 hover:text-red-600 text-gray-400 rounded transition-all cursor-pointer"
                            title="Delete Campaign"
                          >
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="p-3 bg-white space-y-2.5">
                          {camp.description && (
                            <p className="text-[11px] text-gray-650 border-l-2 border-gray-300 pl-2 italic">
                              {camp.description}
                            </p>
                          )}
                          
                          <div className="space-y-1.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Assets in rollout ({campAssets.length})</span>
                            {campAssets.length === 0 ? (
                              <p className="text-[10px] text-gray-400 italic">No assets linked. Upload an asset and link it here!</p>
                            ) : (
                              <div className="divide-y divide-gray-100 border border-gray-150 rounded bg-gray-50/20">
                                {campAssets.map(asset => {
                                  const post = socialPosts.find(p => p.asset_id === asset.id);
                                  return (
                                    <div key={asset.id} className="p-2 flex items-center justify-between text-xs hover:bg-gray-50/50">
                                      <div className="truncate pr-2">
                                        <span className="font-bold text-gray-800 block truncate">{asset.title}</span>
                                        <span className="text-[9px] text-gray-450 uppercase font-bold font-mono">
                                          {post?.platform ? post.platform.replace('_', ' ') : 'Unassigned'} • {asset.aspect_ratio}
                                        </span>
                                      </div>
                                      <div className="shrink-0">
                                        {getStatusBadge(asset.status)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: 5-STAGE PIPELINE BOARD (2/3 width) */}
        <section className="col-span-12 lg:col-span-8 bg-white border border-[#e8e6e1] rounded-xl p-5 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-4">
            <div>
              <h2 className="text-sm font-sans font-extrabold tracking-tight text-gray-900 uppercase">
                Content Rollout & Refinement Pipeline
              </h2>
              <p className="text-[10px] text-gray-450 font-medium">
                Drag or update your short-form drafts and marketing content through 5 status nodes.
              </p>
            </div>
            <button 
              onClick={() => setIsAssetModalOpen(true)}
              className="bg-[#181919] hover:bg-[#2c2d2c] text-white text-xs font-sans font-bold tracking-wider uppercase px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer select-none"
            >
              <Plus className="w-4 h-4"/> Ingest New Content
            </button>
          </div>

          {/* Pipeline Stage Tabs */}
          <div className="grid grid-cols-6 gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-150">
            {[
              { id: 'ingestion', label: '1. Ingestion', icon: FolderPlus, color: 'text-blue-600' },
              { id: 'refinement', label: '2. Refinement', icon: ListTodo, color: 'text-amber-600' },
              { id: 'staging', label: '3. Staging Vault', icon: Layers, color: 'text-purple-600' },
              { id: 'scheduling', label: '4. Scheduling', icon: Calendar, color: 'text-emerald-700' },
              { id: 'deployment', label: '5. Deployed', icon: CheckCircle2, color: 'text-zinc-950' },
              { id: 'calendar', label: '6. Scheduler Calendar', icon: Calendar, color: 'text-indigo-650' }
            ].map(stage => {
              const Icon = stage.icon;
              const isSelected = activeStageTab === stage.id;
              
              // Count items in each stage
              const count = assets.filter(a => {
                if (stage.id === 'ingestion') return a.status === 'backlog' || a.status === 'raw_b_roll';
                if (stage.id === 'refinement') return a.status === 'asset_in_refinement';
                if (stage.id === 'staging') return a.status === 'draft_staged';
                if (stage.id === 'scheduling') return a.status === 'queue_scheduled';
                if (stage.id === 'deployment') return a.status === 'live_deployed';
                if (stage.id === 'calendar') return a.status === 'queue_scheduled' || a.status === 'live_deployed';
                return false;
              }).length;

              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageTab(stage.id)}
                  className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white border border-gray-250 shadow-2xs font-extrabold text-gray-900' 
                      : 'text-gray-400 hover:text-gray-600 font-semibold'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${stage.color}`} />
                  <span className="text-[9px] uppercase tracking-wider text-center">{stage.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 rounded-full font-mono font-bold text-gray-500">{count}</span>
                </button>
              );
            })}
          </div>

          {/* STAGE CONTAINER VIEW */}
          <div className="space-y-4">
            
            {/* STAGE 1: INGESTION VIEW */}
            {activeStageTab === 'ingestion' && (
              <div className="space-y-4">
                <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-3.5 text-xs text-blue-900 flex gap-2.5 items-start">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-blue-800 mb-0.5">Stage 1: Ingestion Node (The Catch-All)</span>
                    Log content ideas or upload raw footage assets here. System auto-tags aspect ratios: `9:16` sets target to Short-Form Video (TikTok/Reels), and `16:9` sets target to Long-Form.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assets.filter(a => a.status === 'backlog' || a.status === 'raw_b_roll').map(asset => (
                    <div key={asset.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3.5 hover:shadow-2xs transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold font-mono text-gray-400 uppercase tracking-widest">{asset.aspect_ratio || 'TBD'} • {asset.duration_sec || 0}s</span>
                          {getStatusBadge(asset.status)}
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 uppercase font-sans mt-2">{asset.title}</h4>
                        <p className="text-[10px] text-gray-500 font-mono mt-1">Ingested: {new Date(asset.created_at).toLocaleString()}</p>
                        
                        {asset.file_url ? (
                          <div className="mt-3 relative aspect-[16/9] max-h-28 bg-gray-100 rounded overflow-hidden flex items-center justify-center border border-gray-200">
                            {asset.aspect_ratio === '9:16' ? (
                              <Video className="w-6 h-6 text-gray-400" />
                            ) : (
                              <FileVideo className="w-6 h-6 text-gray-400" />
                            )}
                            <span className="absolute bottom-1 right-1 text-[9px] bg-black/75 text-white font-mono px-1 rounded">Media Loaded</span>
                          </div>
                        ) : (
                          <div className="mt-3 p-3 bg-gray-50 rounded border border-dashed border-gray-200 text-center">
                            <span className="text-[10px] text-gray-450 italic">Text Content Idea Card (No media attached)</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2.5 border-t border-gray-100 mt-3">
                        <button
                          onClick={() => handleMoveToInProgress(asset.id)}
                          className="flex-grow bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg border border-blue-200 transition-all cursor-pointer"
                        >
                          Start Production (WIP)
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="p-1.5 hover:text-red-600 text-gray-400 rounded hover:bg-gray-50 border border-gray-200 cursor-pointer"
                          title="Delete Content"
                        >
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                  ))}
                  {assets.filter(a => a.status === 'backlog' || a.status === 'raw_b_roll').length === 0 && (
                    <div className="col-span-2 text-center py-12 text-gray-400 text-xs italic">
                      Ingestion queue is empty. Click "Ingest New Content" above to log ideas or uploads!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STAGE 2: REFINEMENT (WIP) VIEW */}
            {activeStageTab === 'refinement' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-150 rounded-lg p-3.5 text-xs text-amber-900 flex gap-2.5 items-start">
                  <ListTodo className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-amber-800 mb-0.5">Stage 2: Refinement Pipeline (The Production Stage)</span>
                    Assets here are in production (`status: asset_in_refinement`). Check off each task. **Antigravity Logic Gate**: An asset cannot be advanced to the Staging Vault until all 4 checklist items are complete.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {assets.filter(a => a.status === 'asset_in_refinement').map(asset => {
                    const chk = checklists.find(c => c.asset_id === asset.id);
                    const isAllDone = chk ? (chk.hook_finalized && chk.b_roll_stitched && chk.captions_generated && chk.audio_selected) : false;

                    return (
                      <div key={asset.id} className="bg-white border border-gray-200 rounded-xl p-4.5 space-y-4 hover:shadow-2xs transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <h4 className="text-xs font-bold text-gray-900 uppercase truncate pr-2">{asset.title}</h4>
                            <div className="shrink-0">{getStatusBadge(asset.status)}</div>
                          </div>

                          {/* Checklist items */}
                          {chk && (
                            <div className="mt-3.5 space-y-2">
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Production Requirements</span>
                              {[
                                { key: 'hook_finalized', label: 'Hook Intro Finalized' },
                                { key: 'b_roll_stitched', label: 'B-Roll Footage Stitched' },
                                { key: 'captions_generated', label: 'Captions / Subtitles Generated' },
                                { key: 'audio_selected', label: 'Trending Audio Selected' }
                              ].map(item => {
                                const checked = chk[item.key as keyof Omit<ProductionChecklist, 'id' | 'asset_id'>];
                                return (
                                  <div 
                                    key={item.key}
                                    onClick={() => handleUpdateChecklist(asset.id, item.key as any)}
                                    className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none hover:text-gray-900"
                                  >
                                    {checked ? (
                                      <CheckSquare className="w-4.5 h-4.5 text-amber-500 fill-amber-50/20 shrink-0" />
                                    ) : (
                                      <Square className="w-4.5 h-4.5 text-gray-300 shrink-0" />
                                    )}
                                    <span className={checked ? 'line-through text-gray-400' : 'font-medium'}>{item.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-150 mt-4">
                          <button
                            onClick={() => handleMoveToStaged(asset.id)}
                            disabled={!isAllDone}
                            className={`flex-grow text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isAllDone
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-2xs'
                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            }`}
                          >
                            {!isAllDone && '🔒 Gate Locked • '} Staged in Vault
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 hover:text-red-600 text-gray-400 rounded hover:bg-gray-50 border border-gray-200 cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {assets.filter(a => a.status === 'asset_in_refinement').length === 0 && (
                    <div className="col-span-2 text-center py-12 text-gray-400 text-xs italic">
                      No assets currently in production. Open Ingestion and select "Start Production" on any card!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STAGE 3: STAGING & VAULT VIEW */}
            {activeStageTab === 'staging' && (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-150 rounded-lg p-3.5 text-xs text-purple-900 flex gap-2.5 items-start">
                  <Layers className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-purple-800 mb-0.5">Stage 3: Staging & Variant Vault</span>
                    Staging vault for completed assets. Connect hook variations, customize platform targets, and write captions/hashtags.
                  </div>
                </div>

                <div className="space-y-4">
                  {assets.filter(a => a.status === 'draft_staged' && !a.parent_id).map(asset => {
                    const post = socialPosts.find(p => p.asset_id === asset.id);
                    const childVariants = assets.filter(a => a.parent_id === asset.id);

                    return (
                      <div key={asset.id} className="bg-white border border-gray-250 rounded-xl p-5 hover:shadow-2xs transition-all space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-150 pb-3">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{asset.title}</h4>
                            <span className="text-[9px] font-mono text-gray-450 uppercase font-bold">Staged Vault Master Asset</span>
                          </div>
                          {getStatusBadge(asset.status)}
                        </div>

                        {/* Staging Fields & Copy-Hashtag Builder */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Target Platform</label>
                              <select
                                value={socialPostPlatforms[asset.id] || post?.platform || 'instagram_reels'}
                                onChange={(e) => setSocialPostPlatforms(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none"
                              >
                                <option value="instagram_reels">IG Reels (Short Form)</option>
                                <option value="tiktok">TK (TikTok Short Form)</option>
                                <option value="instagram_post">IG Static Post</option>
                                <option value="youtube_shorts">YT Shorts</option>
                                <option value="linkedin">LinkedIn Update</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Trending Audio/Sound Link</label>
                              <input
                                type="text"
                                placeholder="e.g. sound/id_1283"
                                value={socialPostAudios[asset.id] !== undefined ? socialPostAudios[asset.id] : post?.audio_track || ''}
                                onChange={(e) => setSocialPostAudios(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none"
                              />
                            </div>
                            
                            {/* Hook Variant Listing */}
                            <div className="pt-2 border-t border-gray-100">
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Variant Groupings ({childVariants.length})</span>
                              {childVariants.length === 0 ? (
                                <p className="text-[10px] text-gray-400 italic">No hook variants or split-testing intros registered.</p>
                              ) : (
                                <div className="space-y-1 mt-1.5">
                                  {childVariants.map(child => (
                                    <div key={child.id} className="p-1 px-2 text-[10px] bg-purple-50 text-purple-800 border border-purple-100 rounded flex justify-between items-center">
                                      <span className="font-bold">{child.title}</span>
                                      <span className="text-[8px] uppercase tracking-wider bg-white px-1.5 py-0.2 rounded font-mono">Hook Variant</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col justify-between space-y-3">
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Caption & Hashtag Builder</label>
                              <textarea
                                placeholder="Write Instagram/TikTok captions & hashtags here..."
                                rows={4}
                                value={socialPostCaptions[asset.id] !== undefined ? socialPostCaptions[asset.id] : post?.caption || ''}
                                onChange={(e) => setSocialPostCaptions(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                className="w-full bg-white border border-gray-300 rounded p-2.5 text-xs text-gray-800 focus:outline-none resize-none"
                              />
                            </div>
                            <button
                              onClick={() => handleUpdateSocialPostMetadata(asset.id)}
                              className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded hover:bg-gray-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" /> Commit Caption Metadata
                            </button>
                          </div>
                        </div>

                        {/* Transition and scheduling trigger wrapper */}
                        <div className="pt-3.5 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                              type="date"
                              value={socialPostDates[asset.id] || formatDateForInput(post?.scheduled_for)}
                              onChange={(e) => setSocialPostDates(prev => ({ ...prev, [asset.id]: e.target.value }))}
                              className="bg-white border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSchedulePost(asset.id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5"/> Schedule Date
                            </button>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                              onClick={() => handleLinkEventTrigger(asset.id, 'Website Launch Event')}
                              className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3 h-3"/> Link Event Trigger
                            </button>
                            <button
                              onClick={() => handleDeployNow(asset.id)}
                              className="bg-[#181919] hover:bg-[#2c2d2c] text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all cursor-pointer"
                            >
                              Deploy Now
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {assets.filter(a => a.status === 'draft_staged' && !a.parent_id).length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-xs italic">
                      No assets currently staged. Finish the refinement stage to add completed files to the Vault.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STAGE 4: SCHEDULING GRID VIEW */}
            {activeStageTab === 'scheduling' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-3.5 text-xs text-emerald-950 flex gap-2.5 items-start">
                  <Calendar className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-emerald-800 mb-0.5">Stage 4: Scheduling & Trigger Engine</span>
                    Scheduled items queue (`status: queue_scheduled`). These are locked to publish dates or trigger conditions. Click **"Deploy & Publish"** to manually push immediately.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assets.filter(a => a.status === 'queue_scheduled').map(asset => {
                    const post = socialPosts.find(p => p.asset_id === asset.id);
                    const scheduleDate = post?.scheduled_for ? new Date(post.scheduled_for).toLocaleDateString() : 'Linked Trigger Event';

                    return (
                      <div key={asset.id} className="bg-white border border-gray-200 rounded-xl p-4.5 space-y-4 hover:shadow-2xs transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-gray-150 pb-2">
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 uppercase truncate max-w-[200px]">{asset.title}</h4>
                              <span className="text-[9px] text-gray-450 uppercase font-bold font-mono">Platform: {post?.platform ? post.platform.replace('_', ' ') : 'Any'}</span>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded font-mono">
                              {scheduleDate}
                            </span>
                          </div>

                          <div className="space-y-2 mt-3 text-xs">
                            {post?.caption && (
                              <p className="text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-150 font-mono text-[11px] break-words">
                                {post.caption}
                              </p>
                            )}
                            {post?.audio_track && (
                              <p className="text-[10px] text-blue-600 font-mono flex items-center gap-1">
                                🎵 Audio: {post.audio_track}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-100 mt-4">
                          <button
                            onClick={() => handleDeployNow(asset.id)}
                            className="flex-grow bg-[#181919] hover:bg-[#2c2d2c] text-white text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Deploy & Publish
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-2 hover:text-red-600 text-gray-400 rounded hover:bg-gray-50 border border-gray-200 cursor-pointer"
                            title="Delete Scheduled Post"
                          >
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {assets.filter(a => a.status === 'queue_scheduled').length === 0 && (
                    <div className="col-span-2 text-center py-12 text-gray-400 text-xs italic">
                      No assets scheduled. Go to Staging Vault to assign publish dates or triggers.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STAGE 5: POST-DEPLOYMENT VIEW */}
            {activeStageTab === 'deployment' && (
              <div className="space-y-4">
                <div className="bg-zinc-100 border border-zinc-200 rounded-lg p-3.5 text-xs text-zinc-950 flex gap-2.5 items-start">
                  <CheckCircle2 className="w-5 h-5 text-zinc-900 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-zinc-900 mb-0.5">Stage 5: Post-Deployment Archive</span>
                    Live deployed assets logs. Clear raw files to conserve disk space, keeping only the final compressed metadata and publication timestamps.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assets.filter(a => a.status === 'live_deployed').map(asset => {
                    const post = socialPosts.find(p => p.asset_id === asset.id);
                    const deployDate = post?.published_at ? new Date(post.published_at).toLocaleString() : 'Just Deployed';

                    return (
                      <div key={asset.id} className="bg-white border border-gray-200 rounded-xl p-4.5 space-y-4 hover:shadow-2xs transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-gray-150 pb-2">
                            <h4 className="text-xs font-bold text-gray-900 uppercase truncate pr-2">{asset.title}</h4>
                            <span className="bg-zinc-800 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded font-mono">Live</span>
                          </div>

                          <div className="space-y-2 mt-3 text-xs text-gray-650 font-sans">
                            <p className="font-mono text-[10px]">
                              📢 Deployed on: <span className="font-bold text-gray-900">{deployDate}</span>
                            </p>
                            <p className="font-mono text-[10px]">
                              🖥️ Platform: <span className="font-bold uppercase text-gray-800">{post?.platform ? post.platform.replace('_', ' ') : 'N/A'}</span>
                            </p>
                            
                            {asset.file_url ? (
                              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-2 flex items-center justify-between">
                                <span className="text-[9px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <ShieldAlert className="w-3.5 h-3.5"/> Heavy file loaded
                                </span>
                                <button
                                  onClick={() => handleArchiveFileCleanup(asset.id)}
                                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[9px] uppercase tracking-wider px-2 py-1 rounded cursor-pointer"
                                >
                                  Cleanup Media
                                </button>
                              </div>
                            ) : (
                              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 mt-2">
                                <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">✓ Space Optimized & Archived</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-100 mt-4">
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded hover:bg-gray-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5"/> Wipe Deployment Logs
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {assets.filter(a => a.status === 'live_deployed').length === 0 && (
                    <div className="col-span-2 text-center py-12 text-gray-400 text-xs italic">
                      No deployed content logs. Move scheduled queue to publish to populate this archive.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCHEDULER CALENDAR VIEW */}
            {activeStageTab === 'calendar' && (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-150 rounded-lg p-3.5 text-xs text-indigo-950 flex gap-2.5 items-start">
                  <Calendar className="w-5 h-5 text-indigo-650 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-indigo-850 mb-0.5">Scheduler Calendar (Monthly Rollout Plan)</span>
                    Interactive calendar month view of scheduled and deployed campaigns. Click any empty box to schedule a post for that day, or select a badge to inspect briefs and captions.
                  </div>
                </div>
                
                {renderCalendarView()}
              </div>
            )}

          </div>
        </section>

      </div>

      {/* NEW CAMPAIGN DIALOG MODAL */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <h3 className="text-sm font-sans font-bold tracking-wider text-gray-900 uppercase flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-blue-600" /> New Marketing Campaign
              </h3>
              <button 
                onClick={() => setIsCampaignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Watercolor Collection Drop"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">State</label>
                  <select
                    value={newCampaignState}
                    onChange={(e) => setNewCampaignState(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value="stealth">Stealth Launch</option>
                    <option value="warm_up">Warm Up (Teasing)</option>
                    <option value="active_drop">Active Drop (Launch)</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Launch Date</label>
                  <input
                    type="date"
                    value={newCampaignDate}
                    onChange={(e) => setNewCampaignDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-gray-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Description / Goals</label>
                <textarea
                  placeholder="Describe GTM objectives, targets, and notes..."
                  rows={3}
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-150 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase tracking-wider cursor-pointer"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPGRADED SCHEDULE MARKETING ASSET DIALOG MODAL */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <div>
                <h3 className="text-sm font-sans font-bold tracking-wider text-gray-900 uppercase flex items-center gap-1.5">
                  <Calendar className="w-4.5 h-4.5 text-blue-600" /> Schedule Monograph Campaign
                </h3>
                <p className="text-[10px] text-gray-400 italic mt-0.5">
                  Compose editorial briefs and copywrite brand-aligned social captions.
                </p>
              </div>
              <button 
                onClick={() => setIsAssetModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIngestAsset} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Asset Title / Hook Working Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Modern Oak frame mockup reveal"
                    value={newAssetTitle}
                    onChange={(e) => setNewAssetTitle(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Asset Category / Strategy Tag</label>
                  <select
                    value={newAssetCategoryTag}
                    onChange={(e) => setNewAssetCategoryTag(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-2 text-gray-800 focus:outline-none"
                  >
                    {CATEGORY_GROUPS.map((group, gIdx) => (
                      <optgroup key={gIdx} label={group.label}>
                        {group.options.map((opt, oIdx) => (
                          <option key={oIdx} value={opt}>{opt}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={newAssetScheduledDate}
                    onChange={(e) => setNewAssetScheduledDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-gray-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Platform Channel</label>
                  <select
                    value={newAssetPlatform}
                    onChange={(e) => setNewAssetPlatform(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value="instagram_reels">Instagram Reels (Short)</option>
                    <option value="tiktok">TikTok (Short)</option>
                    <option value="instagram_post">Instagram Post (Static)</option>
                    <option value="youtube_shorts">YouTube Shorts</option>
                    <option value="linkedin">LinkedIn Update</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Production Status / Stage</label>
                  <select
                    value={newAssetStage}
                    onChange={(e) => setNewAssetStage(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value="backlog">Stage 1: Ingestion (Backlog)</option>
                    <option value="asset_in_refinement">Stage 2: Refinement (WIP)</option>
                    <option value="draft_staged">Stage 3: Staging Vault</option>
                    <option value="queue_scheduled">Stage 4: Scheduling (Queue)</option>
                    <option value="live_deployed">Stage 5: Live Deployed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Asset Type</label>
                  <select
                    value={newAssetType}
                    onChange={(e) => setNewAssetType(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value="standalone_post">Social Post (Standalone)</option>
                    <option value="pillar_source">Pillar Content (Source Video)</option>
                    <option value="hook_variant">Hook Variant (Intro clip)</option>
                    <option value="teaser_snippet">Teaser Snippet</option>
                    <option value="b_roll">Raw B-Roll Footage</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Aspect Ratio</label>
                  <select
                    value={newAssetRatio}
                    onChange={(e) => setNewAssetRatio(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value="9:16">Short Form (Vertical 9:16)</option>
                    <option value="16:9">Long Form (Landscape 16:9)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Creative Brief URL (Google Drive)</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={newAssetCreativeBriefUrl}
                    onChange={(e) => setNewAssetCreativeBriefUrl(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Internal Briefing Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Focus on handpressed Hanken Grotesk details"
                    value={newAssetBriefingNotes}
                    onChange={(e) => setNewAssetBriefingNotes(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Associate to Campaign</label>
                  <select
                    value={newAssetCampaignId}
                    onChange={(e) => setNewAssetCampaignId(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value="">None (Standalone rollout)</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Upload Marketing Asset File (Photo / Video)</label>
                  <input
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleFileUploadMock}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* ATELIER AI COPYWRITING SUITE */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-650" /> Atelier AI Copywriting Suite
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">Powered by Gemini Curation Model</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-gray-400 mb-1 text-[9px]">Monograph Theme</label>
                    <select
                      value={newAssetTheme}
                      onChange={(e) => setNewAssetTheme(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-gray-800 focus:outline-none"
                    >
                      <option value="Founder's 50 (Exclusivity)">Founder's 50 (Exclusivity)</option>
                      <option value="Architectural Heritage">Architectural Heritage</option>
                      <option value="Minimalist Design">Minimalist Design</option>
                      <option value="Drop Hype">Drop Hype</option>
                      <option value="Canvas Craftsmanship">Canvas Craftsmanship</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-gray-400 mb-1 text-[9px]">Focus of this Post (Media / Hook Context)</label>
                    <input
                      type="text"
                      placeholder="e.g. showcasing the deckle edge frame detail"
                      value={newAssetFocusContext}
                      onChange={(e) => setNewAssetFocusContext(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-gray-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAICaption}
                  disabled={isGeneratingCaption}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold uppercase text-[9px] py-2 rounded transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGeneratingCaption ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin"/> Generating brand-aligned copy...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3"/> Generate On-Brand Caption
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-500 mb-1">Post Caption Content</label>
                <textarea
                  placeholder="Draft your social post captions..."
                  rows={4}
                  value={newAssetCaption}
                  onChange={(e) => setNewAssetCaption(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none resize-none font-mono"
                />
              </div>

              {newAssetFileUrl && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 font-mono text-[10px] flex items-center justify-between">
                  <span>✓ Media file attached and cached in local memory!</span>
                  <button 
                    type="button"
                    onClick={() => setNewAssetFileUrl('')}
                    className="text-red-600 font-bold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-gray-150 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-bold uppercase tracking-wider cursor-pointer animate-transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase tracking-wider cursor-pointer"
                >
                  Schedule Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CALENDAR CELL DETAILS DIALOG MODAL */}
      {isCalendarDetailOpen && selectedCalendarAsset && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <h3 className="text-sm font-sans font-bold tracking-wider text-gray-900 uppercase flex items-center gap-1">
                <Layers className="w-4 h-4 text-indigo-650" /> Rollout Asset Details
              </h3>
              <button 
                onClick={() => setIsCalendarDetailOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Title / Hook Name</span>
                <span className="text-xs font-extrabold text-gray-900 uppercase">{selectedCalendarAsset.title}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Category Tag</span>
                  <span className="font-semibold text-gray-800">{selectedCalendarAsset.category_tag || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Theme</span>
                  <span className="font-semibold text-gray-800">{selectedCalendarAsset.theme || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Status</span>
                  <span className="block mt-0.5">{getStatusBadge(selectedCalendarAsset.status)}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Platform</span>
                  <span className="font-semibold text-gray-850 uppercase block mt-1">
                    {socialPosts.find(p => p.asset_id === selectedCalendarAsset.id)?.platform.replace('_', ' ') || 'N/A'}
                  </span>
                </div>
              </div>

              {selectedCalendarAsset.creative_brief_url && (
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Creative Brief URL</span>
                  <a 
                    href={selectedCalendarAsset.creative_brief_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold mt-0.5"
                  >
                    Open Google Drive Brief <ExternalLink className="w-3 h-3"/>
                  </a>
                </div>
              )}

              {selectedCalendarAsset.briefing_notes && (
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Briefing Notes</span>
                  <p className="text-gray-700 bg-gray-50 p-2 border border-gray-150 rounded italic mt-0.5">{selectedCalendarAsset.briefing_notes}</p>
                </div>
              )}

              {socialPosts.find(p => p.asset_id === selectedCalendarAsset.id)?.caption && (
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Deployed Caption</span>
                  <p className="text-gray-800 bg-gray-50 p-2.5 border border-gray-150 rounded font-mono text-[10px] whitespace-pre-line leading-relaxed mt-0.5 max-h-36 overflow-y-auto">
                    {socialPosts.find(p => p.asset_id === selectedCalendarAsset.id)?.caption}
                  </p>
                </div>
              )}
              
              <div className="pt-3 border-t border-gray-150 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Delete this asset from rollout scheduler?')) {
                      await handleDeleteAsset(selectedCalendarAsset.id);
                      setIsCalendarDetailOpen(false);
                    }
                  }}
                  className="px-3 py-2 border border-red-250 text-red-700 hover:bg-red-50 rounded-lg font-bold uppercase tracking-wider cursor-pointer"
                >
                  Delete Asset
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCalendarDetailOpen(false)}
                    className="px-4 py-2 border border-gray-350 text-gray-700 hover:bg-gray-50 rounded-lg font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Close
                  </button>
                  {selectedCalendarAsset.status !== 'live_deployed' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleDeployNow(selectedCalendarAsset.id);
                        setIsCalendarDetailOpen(false);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Deploy Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
