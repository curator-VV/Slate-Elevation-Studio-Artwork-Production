/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Artwork } from '../types';

const DB_NAME = 'GalleryMinimalistDB';
const DB_VERSION = 2;
const STORE_NAME = 'artworks';

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Upgrade store for artworks
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }

      // Upgrade store for marketing campaigns
      if (!db.objectStoreNames.contains('mkt_campaigns')) {
        db.createObjectStore('mkt_campaigns', { keyPath: 'id' });
      }

      // Upgrade store for marketing assets
      if (!db.objectStoreNames.contains('mkt_assets')) {
        db.createObjectStore('mkt_assets', { keyPath: 'id' });
      }

      // Upgrade store for marketing social posts
      if (!db.objectStoreNames.contains('mkt_social_posts')) {
        db.createObjectStore('mkt_social_posts', { keyPath: 'id' });
      }

      // Upgrade store for marketing checklists
      if (!db.objectStoreNames.contains('mkt_checklists')) {
        db.createObjectStore('mkt_checklists', { keyPath: 'id' });
      }
    };
  });
}

// Artwork functions
export async function getAllArtworks(): Promise<Artwork[]> {
  return getAllFromStore<Artwork>(STORE_NAME);
}

export async function saveArtwork(artwork: Artwork): Promise<void> {
  return putToStore(STORE_NAME, artwork);
}

export async function deleteArtwork(id: string): Promise<void> {
  return deleteFromStore(STORE_NAME, id);
}

export async function getArtworkById(id: string): Promise<Artwork | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to fetch artwork by id'));
    };
  });
}

// Generic helper functions
function getAllFromStore<T>(storeName: string): Promise<T[]> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to fetch from ${storeName}`));
    });
  });
}

function putToStore<T>(storeName: string, item: T): Promise<void> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save in ${storeName}`));
    });
  });
}

function deleteFromStore(storeName: string, id: string): Promise<void> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete from ${storeName}`));
    });
  });
}

// Marketing Campaigns CRUD
export async function getAllCampaigns(): Promise<any[]> {
  return getAllFromStore<any>('mkt_campaigns');
}

export async function saveCampaign(campaign: any): Promise<void> {
  return putToStore('mkt_campaigns', campaign);
}

export async function deleteCampaign(id: string): Promise<void> {
  return deleteFromStore('mkt_campaigns', id);
}

// Marketing Assets CRUD
export async function getAllAssets(): Promise<any[]> {
  return getAllFromStore<any>('mkt_assets');
}

export async function saveAsset(asset: any): Promise<void> {
  return putToStore('mkt_assets', asset);
}

export async function deleteAsset(id: string): Promise<void> {
  return deleteFromStore('mkt_assets', id);
}

// Marketing Social Posts CRUD
export async function getAllSocialPosts(): Promise<any[]> {
  return getAllFromStore<any>('mkt_social_posts');
}

export async function saveSocialPost(post: any): Promise<void> {
  return putToStore('mkt_social_posts', post);
}

export async function deleteSocialPost(id: string): Promise<void> {
  return deleteFromStore('mkt_social_posts', id);
}

// Marketing Checklists CRUD
export async function getAllChecklists(): Promise<any[]> {
  return getAllFromStore<any>('mkt_checklists');
}

export async function saveChecklist(checklist: any): Promise<void> {
  return putToStore('mkt_checklists', checklist);
}

export async function getChecklistByAssetId(assetId: string): Promise<any | null> {
  const all = await getAllChecklists();
  return all.find((c) => c.assetId === assetId) || null;
}
