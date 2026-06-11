/**
 * Venty API-Client für die Expo-App.
 *
 * Diese Datei ist self-contained und kann direkt in die React-Native-App
 * kopiert werden (z. B. nach src/lib/api-client.ts). Keine Abhängigkeiten
 * außer `fetch` (in React Native / Expo eingebaut).
 *
 * Verwendung:
 *   const api = new VentyClient({
 *     baseUrl: "http://192.168.x.x:3000", // LAN-IP des Dev-Rechners
 *     onTokensChanged: (tokens) => SecureStore-Speichern,
 *   });
 *   await api.login({ email, password });
 *   const events = await api.nearbyEvents({ lat, lng, radiusKm: 10 });
 */

// ---------- Typen (gespiegelt vom Backend) ----------

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface UserMe {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  veranstalterId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface Veranstalter {
  id: string;
  ownerId: string;
  name: string;
  beschreibung: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  kontaktEmail: string | null;
  websiteUrl: string | null;
  adresse: string | null;
  stadt: string | null;
  postleitzahl: string | null;
  land: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  createdAt: string;
}

export interface VentyEvent {
  id: string;
  veranstalterId: string;
  titel: string;
  beschreibung: string | null;
  ortName: string | null;
  adresse: string | null;
  latitude: number;
  longitude: number;
  startetAm: string;
  endetAm: string;
  maxTeilnehmer: number | null;
  status: EventStatus;
  teilnehmerCount: number;
  publishedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Event aus der Umkreissuche – zusätzlich mit Distanz in Metern. */
export interface NearbyEvent extends VentyEvent {
  distanceM: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserMe;
}

export interface EventList {
  items: VentyEvent[];
  nextCursor: string | null;
}

// ---------- Inputs ----------

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateMeInput {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface VeranstalterInput {
  name: string;
  beschreibung?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  kontaktEmail?: string | null;
  websiteUrl?: string | null;
  adresse?: string | null;
  stadt?: string | null;
  postleitzahl?: string | null;
  land?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface EventInput {
  titel: string;
  beschreibung?: string | null;
  ortName?: string | null;
  adresse?: string | null;
  latitude: number;
  longitude: number;
  /** ISO-String, z. B. date.toISOString() */
  startetAm: string;
  endetAm: string;
  maxTeilnehmer?: number | null;
}

export interface NearbyParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}

// ---------- Fehler ----------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------- Client ----------

export interface VentyClientOptions {
  /** z. B. "http://localhost:3000" (Simulator) oder "http://192.168.x.x:3000" (Gerät im LAN) */
  baseUrl: string;
  /** Initiale Tokens, z. B. aus SecureStore. */
  tokens?: AuthTokens | null;
  /** Wird bei Login/Refresh/Logout aufgerufen – hier Tokens persistieren. */
  onTokensChanged?: (tokens: AuthTokens | null) => void;
}

export class VentyClient {
  private baseUrl: string;
  private tokens: AuthTokens | null;
  private onTokensChanged: ((tokens: AuthTokens | null) => void) | undefined;
  private refreshPromise: Promise<void> | null = null;

  constructor(options: VentyClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.tokens = options.tokens ?? null;
    this.onTokensChanged = options.onTokensChanged;
  }

  get isLoggedIn(): boolean {
    return this.tokens !== null;
  }

  private setTokens(tokens: AuthTokens | null) {
    this.tokens = tokens;
    this.onTokensChanged?.(tokens);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retryOn401 = true,
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.tokens) headers["Authorization"] = `Bearer ${this.tokens.accessToken}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    // Access-Token abgelaufen → einmalig refreshen und wiederholen
    if (res.status === 401 && retryOn401 && this.tokens && !path.startsWith("/api/v1/auth/")) {
      await this.refreshTokens();
      return this.request<T>(method, path, body, false);
    }

    if (res.status === 204) return undefined as T;

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const err = (json as { error?: { code: string; message: string } } | null)?.error;
      throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? res.statusText);
    }
    return json as T;
  }

  /** Refresh mit Deduplizierung – parallele 401s lösen nur einen Refresh aus. */
  private refreshTokens(): Promise<void> {
    this.refreshPromise ??= (async () => {
      const refreshToken = this.tokens?.refreshToken;
      if (!refreshToken) throw new ApiError(401, "UNAUTHORIZED", "Nicht eingeloggt.");
      try {
        const tokens = await this.request<AuthTokens>(
          "POST",
          "/api/v1/auth/refresh",
          { refreshToken },
          false,
        );
        this.setTokens(tokens);
      } catch (err) {
        this.setTokens(null); // Session ist tot → ausloggen
        throw err;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  // ---------- Auth ----------

  async register(input: RegisterInput): Promise<UserMe> {
    const res = await this.request<AuthResponse>("POST", "/api/v1/auth/register", input);
    this.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    return res.user;
  }

  async login(input: LoginInput): Promise<UserMe> {
    const res = await this.request<AuthResponse>("POST", "/api/v1/auth/login", input);
    this.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    return res.user;
  }

  async logout(): Promise<void> {
    const refreshToken = this.tokens?.refreshToken;
    this.setTokens(null);
    if (refreshToken) {
      await this.request<void>("POST", "/api/v1/auth/logout", { refreshToken }, false).catch(
        () => undefined, // Logout darf lokal nie scheitern
      );
    }
  }

  // ---------- User ----------

  getMe = () => this.request<UserMe>("GET", "/api/v1/users/me");
  updateMe = (input: UpdateMeInput) => this.request<UserMe>("PATCH", "/api/v1/users/me", input);
  getUser = (id: string) => this.request<PublicUser>("GET", `/api/v1/users/${id}`);
  getMyEvents = () => this.request<VentyEvent[]>("GET", "/api/v1/users/me/events");
  getMyFavorites = () => this.request<VentyEvent[]>("GET", "/api/v1/users/me/favorites");

  // ---------- Veranstalter ----------

  createVeranstalter = (input: VeranstalterInput) =>
    this.request<Veranstalter>("POST", "/api/v1/veranstalter", input);
  getVeranstalter = (id: string) => this.request<Veranstalter>("GET", `/api/v1/veranstalter/${id}`);
  updateVeranstalter = (id: string, input: Partial<VeranstalterInput>) =>
    this.request<Veranstalter>("PATCH", `/api/v1/veranstalter/${id}`, input);
  getVeranstalterEvents = (id: string) =>
    this.request<VentyEvent[]>("GET", `/api/v1/veranstalter/${id}/events`);

  // ---------- Events ----------

  createEvent = (input: EventInput) => this.request<VentyEvent>("POST", "/api/v1/events", input);
  getEvent = (id: string) => this.request<VentyEvent>("GET", `/api/v1/events/${id}`);
  updateEvent = (id: string, input: Partial<EventInput>) =>
    this.request<VentyEvent>("PATCH", `/api/v1/events/${id}`, input);
  deleteEvent = (id: string) => this.request<void>("DELETE", `/api/v1/events/${id}`);
  publishEvent = (id: string) => this.request<VentyEvent>("POST", `/api/v1/events/${id}/publish`);
  cancelEvent = (id: string) => this.request<VentyEvent>("POST", `/api/v1/events/${id}/cancel`);

  listEvents = (params: { cursor?: string; limit?: number; ab?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.cursor) q.set("cursor", params.cursor);
    if (params.limit) q.set("limit", String(params.limit));
    if (params.ab) q.set("ab", params.ab);
    const qs = q.toString();
    return this.request<EventList>("GET", `/api/v1/events${qs ? `?${qs}` : ""}`);
  };

  /** Umkreissuche für die Kartenansicht – Distanzen in Metern. */
  nearbyEvents = (params: NearbyParams) => {
    const q = new URLSearchParams({ lat: String(params.lat), lng: String(params.lng) });
    if (params.radiusKm) q.set("radiusKm", String(params.radiusKm));
    if (params.limit) q.set("limit", String(params.limit));
    return this.request<NearbyEvent[]>("GET", `/api/v1/events/nearby?${q}`);
  };

  // ---------- Teilnahme ----------

  joinEvent = (id: string) => this.request<VentyEvent>("POST", `/api/v1/events/${id}/teilnahme`);
  leaveEvent = (id: string) => this.request<VentyEvent>("DELETE", `/api/v1/events/${id}/teilnahme`);
  getTeilnehmer = (id: string) =>
    this.request<PublicUser[]>("GET", `/api/v1/events/${id}/teilnehmer`);

  // ---------- Favoriten ----------

  favoriteEvent = (id: string) => this.request<void>("PUT", `/api/v1/events/${id}/favorit`);
  unfavoriteEvent = (id: string) => this.request<void>("DELETE", `/api/v1/events/${id}/favorit`);

  // ---------- Freunde ----------

  getFriends = () => this.request<PublicUser[]>("GET", "/api/v1/friends");
  addFriend = (userId: string) => this.request<{ ok: true }>("POST", `/api/v1/friends/${userId}`);
  removeFriend = (userId: string) => this.request<void>("DELETE", `/api/v1/friends/${userId}`);
}
