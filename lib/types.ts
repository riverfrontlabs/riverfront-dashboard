// Shared types — no Node.js imports, safe to use in client components

export interface Lead {
  shortlisted?: number | null;
  id:           number;
  name:         string;
  phone:        string | null;
  email:        string | null;
  address:      string | null;
  website:      string | null;
  rating:       string | null;
  reviews:      string | null;
  type:         string | null;
  location:     string | null;
  score:        number;
  placeId:      string | null;
  previewUrl:   string | null;
  emailSubject: string | null;
  emailBody:    string | null;
  sms:          string | null;
  emailStatus:  string | null;
  smsStatus:    string | null;
  status:       string;
  createdAt:    string;
  updatedAt:    string;
}

export interface Note {
  id:        number;
  leadId:    number;
  content:   string;
  createdAt: string;
}

export interface ContactEvent {
  id:        number;
  leadId:    number;
  type:      string;
  detail:    string | null;
  createdAt: string;
}

export interface DailySnapshot {
  id:        number;
  date:      string;
  total:     number;
  previewed: number;
  drafted:   number;
  contacted: number;
  replied:   number;
  booked:    number;
  closed:    number;
}
