/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ArtworkStatus = 'Pending Review' | 'Changes Drafted' | 'Approved for Production';

export type ArtworkStyle = 'Pencil Sketch' | 'Watercolor' | 'Charcoal Study' | 'Architect Ink' | 'Classic Oil' | 'Digital Illustration';

export type FrameType = 'None' | 'Natural Oak' | 'Charcoal Black' | 'Warm Walnut' | 'Gallery Gold';

export type MatWidth = 'None' | '1 inch' | '2 inches' | '3 inches';

export type ArtworkDimensions = '8" x 10"' | '11" x 14"' | '16" x 20"' | '24" x 36"';

export interface Artwork {
  id: string;
  title: string;
  clientName: string;
  referenceNumber: string;
  dateUploaded: string;
  lastModified: string;
  imageData: string; // base64 string or blob URL (for transformed rendering)
  status: ArtworkStatus;
  notes: string;
  style: ArtworkStyle;
  frame: FrameType;
  matWidth: MatWidth;
  dimensions: ArtworkDimensions;
  
  // Custom properties for AI watercolor/sketch workflow
  originalImage?: string; // original uploaded photo (base64 string or blob URL)
  address?: string; // property street address
  cityState?: string; // property city, state
  coordinates?: string; // property coordinates
  estDate?: string; // e.g. "Est. 1961"
  imageScale?: number; // scale adjustment for home drawing on canvas
  sourceCropY?: number; // vertical cropping position of the source photo (0-100)
  processingMode?: 'AI Generation' | 'Photo Filter'; // How the image is processed (AI generation or photo filters)
  imageYOffset?: number; // y-position adjustment for home drawing on canvas
  imageXOffset?: number; // x-position adjustment for home drawing on canvas
  textYOffset?: number; // y-position adjustment for text on canvas
  textLine1Override?: string; // Custom override for line 1 of address text
  textLine2Override?: string; // Custom override for line 2 of address text
  textLine3Override?: string; // Custom override for line 3 of address text
  
  // Cache fields to prevent redundant API calls and enable instant toggling
  aiDescription?: string; // Gemini-generated detailed description
  aiWatercolorImage?: string; // Cache for AI-generated watercolor image
  aiSketchImage?: string; // Cache for AI-generated sketch image
  filterWatercolorImage?: string; // Cache for photo-filtered watercolor image
  filterSketchImage?: string; // Cache for photo-filtered sketch image
}

export interface Campaign {
  id: string;
  name: string;
  campaign_state: 'stealth' | 'warm_up' | 'active_drop' | 'completed';
  target_launch_date: string; // YYYY-MM-DD
  description: string;
}

export interface MarketingAsset {
  id: string;
  parent_id?: string;
  title: string;
  status: 'backlog' | 'raw_b_roll' | 'asset_in_refinement' | 'draft_staged' | 'queue_scheduled' | 'live_deployed';
  asset_type: 'pillar_source' | 'hook_variant' | 'teaser_snippet' | 'b_roll' | 'standalone_post';
  file_url?: string;
  aspect_ratio?: string;
  duration_sec?: number;
  created_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  asset_id: string;
  campaign_id?: string;
  platform: 'tiktok' | 'instagram_reels' | 'instagram_post' | 'youtube_shorts' | 'linkedin';
  caption: string;
  audio_track?: string;
  publish_type: 'api_automated' | 'manual_reminder';
  scheduled_for?: string;
  published_at?: string;
}

export interface ProductionChecklist {
  id: string;
  asset_id: string;
  hook_finalized: boolean;
  b_roll_stitched: boolean;
  captions_generated: boolean;
  audio_selected: boolean;
}

