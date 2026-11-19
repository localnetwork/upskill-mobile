export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000/api';

export const TOKEN_KEY = process.env.EXPO_PUBLIC_TOKEN_KEY || 'upskill-token';

export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '') || 'http://localhost:3000';
