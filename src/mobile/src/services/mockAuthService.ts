import { Account, Role } from "../models/types";
import { sampleAccounts } from "../sampleData/mockData";

export async function loginWithSampleAccount(
  email: string,
  password: string,
): Promise<Account> {
  // TODO: Replace local sample account validation with real backend call:
  // POST /api/auth/login
  // Body: { email, password }
  // Expected response: { accessToken, refreshToken, user: { id, name, email, role } }
  // Handle 401 for invalid credentials and 403 for locked/disabled accounts.
  await delay(500);
  const account = sampleAccounts.find(
    (item) =>
      item.email.toLowerCase() === email.trim().toLowerCase() &&
      item.password === password,
  );

  if (!account) {
    throw new Error("Email or password is incorrect.");
  }

  return account;
}

export async function registerSampleAccount(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}): Promise<Account> {
  // TODO: Replace demo registration with backend-controlled account creation
  // or remove this screen when public self-registration is disabled for MVP.
  // Possible endpoint: POST /api/auth/register-demo
  // Body: { name, email, password, role }
  // Expected response: { user: { id, name, email, role } }
  await delay(500);

  if (!input.name.trim()) {
    throw new Error("Full name is required.");
  }
  if (!input.email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }
  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  if (input.password !== input.confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  return {
    id: `demo-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim(),
    password: input.password,
    role: input.role,
    label: roleLabel(input.role),
    studentId: input.role === "STUDENT" ? input.email.trim() : undefined,
  };
}

function roleLabel(role: Role) {
  if (role === "CHECKIN_STAFF") {
    return "Check-in Staff";
  }
  if (role === "ORGANIZER") {
    return "Organizer/Admin";
  }
  return "Student";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
