import { Organization, ItemType, Offer, ResourceRequest, Match } from '../types';

export const apiService = {
  // Organizations
  async getOrganizations(): Promise<Organization[]> {
    const response = await fetch('/api/organizations');
    if (!response.ok) throw new Error('Failed to fetch organizations');
    return response.json();
  },

  async createOrganization(org: Partial<Organization>): Promise<{ id: number }> {
    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(org),
    });
    if (!response.ok) throw new Error('Failed to create organization');
    return response.json();
  },

  // Item Types
  async getItemTypes(): Promise<ItemType[]> {
    const response = await fetch('/api/item-types');
    if (!response.ok) throw new Error('Failed to fetch item types');
    return response.json();
  },

  // Offers
  async getOffers(): Promise<(Offer & { org_name: string; item_name: string; first_name: string; last_name: string })[]> {
    const response = await fetch('/api/offers');
    if (!response.ok) throw new Error('Failed to fetch offers');
    return response.json();
  },

  async createOffer(offer: Partial<Offer>): Promise<{ id: number }> {
    const response = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offer),
    });
    if (!response.ok) throw new Error('Failed to create offer');
    return response.json();
  },

  // Requests
  async getRequests(): Promise<(ResourceRequest & { org_name: string; item_name: string; first_name: string; last_name: string })[]> {
    const response = await fetch('/api/requests');
    if (!response.ok) throw new Error('Failed to fetch requests');
    return response.json();
  },

  async createRequest(req: Partial<ResourceRequest>): Promise<{ id: number }> {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!response.ok) throw new Error('Failed to create request');
    return response.json();
  },

  // Matches
  async createMatch(match: Partial<Match>): Promise<{ id: number }> {
    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(match),
    });
    if (!response.ok) throw new Error('Failed to create match');
    return response.json();
  }
};
