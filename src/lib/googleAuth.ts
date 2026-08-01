/**
 * Google OAuth 2.0 / GIS Helper
 */

import { GoogleAuthUser } from '../types';

const AUTH_KEY = 'argumentation_auth_user';
const DEFAULT_CLIENT_ID_KEY = 'argumentation_google_client_id';

export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

export function getStoredAuthUser(): GoogleAuthUser | null {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    if (!data) return null;
    const user: GoogleAuthUser = JSON.parse(data);
    if (user.expiresAt && Date.now() > user.expiresAt) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return user;
  } catch (e) {
    return null;
  }
}

export function saveAuthUser(user: GoogleAuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function removeAuthUser() {
  localStorage.removeItem(AUTH_KEY);
}

export function getStoredClientId(): string {
  return localStorage.getItem(DEFAULT_CLIENT_ID_KEY) || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
}

export function saveStoredClientId(clientId: string) {
  localStorage.setItem(DEFAULT_CLIENT_ID_KEY, clientId);
}

/**
 * Dynamically loads the GIS script if not present
 */
export function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services script failed to load'));
    document.head.appendChild(script);
  });
}

/**
 * Initiates Google OAuth Token Client popup
 */
export async function requestGoogleToken(clientId: string): Promise<GoogleAuthUser> {
  await loadGisScript();

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services client is not available.'));
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: OAUTH_SCOPES,
      callback: async (response: any) => {
        if (response.error) {
          reject(new Error(`OAuth Error: ${response.error}`));
          return;
        }

        const accessToken = response.access_token;
        const expiresIn = parseInt(response.expires_in || '3600', 10);
        const expiresAt = Date.now() + (expiresIn - 60) * 1000;

        let name = '선생님';
        let email = '';
        let picture = '';

        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            name = userData.name || userData.email || '선생님';
            email = userData.email || '';
            picture = userData.picture || '';
          }
        } catch (e) {
          console.warn('UserInfo fetch warning', e);
        }

        const user: GoogleAuthUser = {
          accessToken,
          expiresAt,
          name,
          email,
          picture
        };

        saveAuthUser(user);
        resolve(user);
      }
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}
