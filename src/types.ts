export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  isPremium: boolean;
}

export interface Match {
  id: string;
  date: string; // ISO String (ex: 2026-06-15T18:00:00Z)
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  competition: string;
  status: 'upcoming' | 'live' | 'finished';
  videoUrl: string;
}

export type MatchStatus = 'upcoming' | 'live' | 'finished';

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  papiReference: string;
  createdAt: string;
}
