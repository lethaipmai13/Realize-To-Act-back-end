export type UserType = 'school' | 'community-partner' | 'nonprofit';

export interface AvailabilitySlot {
  day: string;
  slots: string[];
}

export interface User {
  id: string;
  name: string;
  type: UserType;
  email: string;
  avatar?: string;
  location?: string;
  contactName?: string;
  availability?: AvailabilitySlot[];
  dropOffLocation?: string;
  needDropOffAssistance?: boolean;
}

export interface ConnectionRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  type: 'received' | 'sent';
  status: 'pending' | 'approved' | 'denied';
  item: string;
  quantity: number;
  distance: string;
  timeAgo: string;
  timestamp: number; // Added for sorting
  postedAt?: string;
  availableUntil?: string;
  description?: string;
  availability?: AvailabilitySlot[];
  isNew?: boolean;
}

export interface Document {
  id: string;
  title: string;
  fromName: string;
  fromId: string;
  toName: string;
  toId: string;
  status: 'pending' | 'signed';
  dueDate?: string;
  signedDate?: string;
  timeAgo: string;
  itemDescription: string;
  timestamp?: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isSuggestedTime?: boolean;
  suggestedTimes?: string[];
  confirmedTime?: string;
  meetingNote?: string;
}

export interface Organization {
  id: number;
  name: string;
  org_type: 'school' | 'nonprofit';
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  website?: string;
  created_at: string;
}

export interface ItemType {
  id: number;
  name: string;
  description?: string;
}

export interface Offer {
  id: number;
  user_id: number;
  item_type_id: number;
  resource_type: string;
  resource_item: string;
  quantity_offered: number;
  quantity_committed: number;
  status: 'open' | 'partially_committed' | 'fully_committed' | 'cancelled';
  available_from_date?: string;
  available_to_date?: string;
  notes?: string;
  created_at: string;
}

export interface ResourceRequest {
  id: number;
  user_id: number;
  item_type_id: number;
  resource_type: string;
  resource_item: string;
  quantity_requested: number;
  quantity_fulfilled: number;
  status: 'open' | 'partially_committed' | 'fully_committed' | 'cancelled';
  needed_by_date?: string;
  notes?: string;
  created_at: string;
}

export interface Match {
  id: number;
  request_id: number;
  offer_id: number;
  item_type_id: number;
  quantity_matched: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Chat {
  id: string;
  participantName: string;
  participantTitle: string;
  participantAvatar?: string;
  lastMessage?: string;
  timeAgo: string;
  lastMessageTimestamp?: number;
  unreadCount?: number;
  messages?: Message[];
  isRecentlyApproved?: boolean;
}
