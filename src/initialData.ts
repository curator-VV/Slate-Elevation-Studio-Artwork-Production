/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Artwork } from './types';

export const INITIAL_ARTWORKS: Artwork[] = [
  {
    id: 'sample-1',
    title: 'The Glass Pavilion',
    clientName: 'Julian & Adele Sterling',
    referenceNumber: 'PR-2026-0041',
    dateUploaded: '2026-05-18T10:30:00Z',
    lastModified: '2026-06-01T15:24:00Z',
    imageData: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=1200',
    status: 'Pending Review',
    notes: 'Please check if the line hierarchy of the north-facing glass panels is too dense. Scale down the pen weight slightly if necessary prior to large-format plot.',
    style: 'Pencil Sketch',
    frame: 'None',
    matWidth: '2 inches',
    dimensions: '24" x 36"'
  },
  {
    id: 'sample-2',
    title: 'Coastal Villa Elevation',
    clientName: 'Dr. Eleanor Vance',
    referenceNumber: 'PR-2026-0092',
    dateUploaded: '2026-05-24T14:15:00Z',
    lastModified: '2026-06-03T11:08:00Z',
    imageData: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=1200',
    status: 'Changes Drafted',
    notes: 'Client requests the watercolor wash on the ocean horizon to be warmer. Soft golden hour hue should bleed into the deck edges.',
    style: 'Watercolor',
    frame: 'None',
    matWidth: '2 inches',
    dimensions: '24" x 36"'
  },
  {
    id: 'sample-3',
    title: 'Minimalist Courtyard Study',
    clientName: 'Sora & Takashi',
    referenceNumber: 'PR-2026-0125',
    dateUploaded: '2026-06-01T09:00:00Z',
    lastModified: '2026-06-01T09:12:00Z',
    imageData: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1200',
    status: 'Approved for Production',
    notes: 'Approved without remarks. Print on 310gsm Hahnemühle Photo Rag paper with a hand-torn deckled edge.',
    style: 'Pencil Sketch',
    frame: 'None',
    matWidth: '2 inches',
    dimensions: '24" x 36"'
  }
];
