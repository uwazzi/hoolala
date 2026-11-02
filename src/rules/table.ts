// WP-A4 table tokens (v6.4). Pure shape and window checks; the HMAC itself
// lives in src/api/table.ts. A token binds a room, the shower and the time:
// roomId.showerId.iat.sig. New code every 30 s; the server accepts the
// current and the previous token only (60 s window).

/** A photo of the QR is useless a minute later. */
export const TABLE_TOKEN_WINDOW_S = 60;
/** The phone on the table shows a new code this often. */
export const TABLE_TOKEN_REFRESH_S = 30;

export interface TableToken {
  roomId: string;
  showerId: string;
  iat: number;
}

export function tableTokenPayload(roomId: string, showerId: string, iat: number): string {
  return `${roomId}.${showerId}.${iat}`;
}

/** Within the window and not from the future (5 s of clock skew allowed). */
export function tableTokenLive(iat: number, nowMs: number): boolean {
  const ageS = nowMs / 1000 - iat;
  return ageS >= -5 && ageS <= TABLE_TOKEN_WINDOW_S;
}

export function parseTableToken(raw: unknown): { payload: string; roomId: string; showerId: string; iat: number; sig: string } | null {
  if (typeof raw !== "string") return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [roomId, showerId, iatRaw, sig] = parts;
  if (!roomId || !showerId || !/^\d+$/.test(iatRaw) || !/^[0-9a-f]{64}$/.test(sig)) return null;
  return { payload: `${roomId}.${showerId}.${iatRaw}`, roomId, showerId, iat: Number(iatRaw), sig };
}
