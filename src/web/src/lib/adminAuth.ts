export {
  clearTokens,
  getAccessToken,
  getCurrentUser,
  login,
  logout,
  normalizeRoles,
  requestWithStoredAuth as fetchWithAuth,
  type AuthUser,
  type StudentProfile,
} from "./auth";

export async function ensureAdminAuth() {
  const { ensureRole } = await import("./auth");
  return ensureRole("organizer");
}
