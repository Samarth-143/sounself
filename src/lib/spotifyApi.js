// spotifyApi.js
// Spotify Authorization Code + PKCE flow (no client secret, SPA-safe).
// Falls back to mock data when no VITE_SPOTIFY_CLIENT_ID is configured.

import { generateMockData } from './mockData.js'

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
const REDIRECT_URI =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ||
  (typeof window !== 'undefined' ? `${window.location.origin}/` : '')

const SCOPES = [
  'user-top-read',
  'user-read-recently-played',
  'user-read-playback-state',
  'user-modify-playback-state',
  'streaming',
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
].join(' ')

const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize'
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'
const API_BASE = 'https://api.spotify.com/v1'

const LS = {
  verifier: 'ss_pkce_verifier',
  token: 'ss_token',
}

export const isConfigured = () => Boolean(CLIENT_ID)

/* ------------------------------- PKCE utils ------------------------------ */

function randomString(len = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join('')
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/* ------------------------------ token store ------------------------------ */

function saveToken(payload) {
  const token = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Date.now() + (payload.expires_in ?? 3600) * 1000,
    scope: payload.scope || '',
  }
  localStorage.setItem(LS.token, JSON.stringify(token))
  return token
}

function readToken() {
  try {
    return JSON.parse(localStorage.getItem(LS.token) || 'null')
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(LS.token)
  localStorage.removeItem(LS.verifier)
}

export function hasSession() {
  return Boolean(readToken()?.refresh_token || readToken()?.access_token)
}

/* ------------------------------ auth flow -------------------------------- */

export async function redirectToAuth() {
  if (!isConfigured()) throw new Error('Spotify CLIENT_ID not configured.')
  const verifier = randomString(96)
  const challenge = base64url(await sha256(verifier))
  localStorage.setItem(LS.verifier, verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  window.location.assign(`${AUTH_ENDPOINT}?${params.toString()}`)
}

// Call on app load. If we came back from Spotify with ?code=, exchange it.
export async function handleRedirectCallback() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    cleanUrl()
    throw new Error(`Spotify authorization failed: ${error}`)
  }
  if (!code) return false

  const verifier = localStorage.getItem(LS.verifier)
  if (!verifier) {
    cleanUrl()
    throw new Error('Missing PKCE verifier. Please try connecting again.')
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  })

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  cleanUrl()
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Token exchange failed (${res.status}). ${detail}`)
  }
  saveToken(await res.json())
  localStorage.removeItem(LS.verifier)
  return true
}

function cleanUrl() {
  window.history.replaceState({}, document.title, window.location.pathname)
}

async function refreshAccessToken(refresh_token) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token,
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error('Session expired. Please reconnect Spotify.')
  const payload = await res.json()
  // Spotify may omit refresh_token on refresh — keep the old one.
  if (!payload.refresh_token) payload.refresh_token = refresh_token
  return saveToken(payload)
}

async function getValidAccessToken() {
  let token = readToken()
  if (!token) throw new Error('Not authenticated.')
  if (Date.now() < token.expires_at - 30000) return token.access_token
  if (!token.refresh_token) throw new Error('Session expired. Please reconnect Spotify.')
  token = await refreshAccessToken(token.refresh_token)
  return token.access_token
}

/* ------------------------------- fetching -------------------------------- */

async function api(path, accessToken) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 401) throw new Error('Session expired. Please reconnect Spotify.')
  if (res.status === 429) throw new Error('Spotify rate limit hit. Try again in a moment.')
  if (!res.ok) throw new Error(`Spotify request failed (${res.status}) for ${path}`)
  return res.json()
}

// onProgress(label) lets the loading screen narrate real status.
export async function fetchUserData(timeRange = 'medium_term', onProgress = () => {}) {
  // Mock mode — no credentials needed.
  if (!isConfigured()) {
    onProgress('Spinning up demo data…')
    await delay(500)
    onProgress('Analyzing sonic DNA…')
    await delay(500)
    return generateMockData({ timeRange })
  }

  const accessToken = await getValidAccessToken()

  onProgress('Fetching your profile…')
  const profile = await api('/me', accessToken)

  onProgress('Pulling your top tracks…')
  const topTracksRes = await api(`/me/top/tracks?limit=50&time_range=${timeRange}`, accessToken)

  onProgress('Pulling your top artists…')
  const topArtistsRes = await api(`/me/top/artists?limit=50&time_range=${timeRange}`, accessToken)

  onProgress('Checking recent rotation…')
  const recentRes = await api('/me/player/recently-played?limit=50', accessToken)

  const topTracks = (topTracksRes.items || []).map((t) => ({
    id: t.id,
    name: t.name,
    artists: t.artists?.map((a) => ({ id: a.id, name: a.name })) || [],
    popularity: t.popularity,
    explicit: !!t.explicit,
    durationMs: t.duration_ms,
    releaseDate: t.album?.release_date || null,
    image: t.album?.images?.[t.album.images.length - 1]?.url || t.album?.images?.[0]?.url || null,
  }))

  const topArtists = (topArtistsRes.items || []).map((a) => ({
    id: a.id,
    name: a.name,
    genres: a.genres || [],
    popularity: a.popularity,
    followers: a.followers?.total ?? null,
    image: a.images?.[a.images.length - 1]?.url || a.images?.[0]?.url || null,
  }))

  const recentlyPlayed = (recentRes.items || []).map((i) => ({
    id: i.track?.id,
    name: i.track?.name,
    artists: i.track?.artists?.map((a) => ({ id: a.id, name: a.name })) || [],
    playedAt: i.played_at || null,
  }))

  onProgress('Extracting audio features…')
  const ids = topTracks.map((t) => t.id).filter(Boolean).slice(0, 100)
  const audioFeatures = {}
  if (ids.length) {
    try {
      const feat = await api(`/audio-features?ids=${ids.join(',')}`, accessToken)
      ;(feat.audio_features || []).forEach((f) => {
        if (f && f.id) audioFeatures[f.id] = f
      })
    } catch {
      // Audio features are 403 for apps created after Spotify's Nov 2024
      // restriction; the analyzer falls back to a metadata estimate.
      onProgress('Audio features locked — estimating from metadata…')
    }
  }

  return {
    displayName: profile.display_name || 'Spotify Listener',
    timeRange,
    topTracks,
    topArtists,
    recentlyPlayed,
    audioFeatures,
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------- playback -------------------------------- */
// Full-track playback for Premium users via the Web Playback SDK.

// True if the stored token was granted the streaming scope (else reconnect).
export function hasStreamingScope() {
  const t = readToken()
  return !!t?.scope?.includes('streaming')
}

// Used by the Web Playback SDK's getOAuthToken callback.
export async function getAccessToken() {
  return getValidAccessToken()
}

// Start playback of a single track on a specific SDK device.
export async function playTrackOnDevice(trackId, deviceId) {
  const token = await getValidAccessToken()
  const res = await fetch(`${API_BASE}/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
  })
  if (res.status === 403) throw new Error('PREMIUM_REQUIRED')
  if (res.status === 401) throw new Error('Session expired. Please reconnect Spotify.')
  if (!res.ok && res.status !== 204) {
    throw new Error(`Playback failed (${res.status}).`)
  }
}
