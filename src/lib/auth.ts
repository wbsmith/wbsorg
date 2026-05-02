import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AWS_CONFIG } from './aws-config';

const client = new CognitoIdentityProviderClient({ region: AWS_CONFIG.region });

interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

function getStoredTokens(): AuthTokens | null {
  const raw = sessionStorage.getItem('wbs_auth');
  if (!raw) return null;
  const tokens: AuthTokens = JSON.parse(raw);
  if (Date.now() > tokens.expiresAt) {
    sessionStorage.removeItem('wbs_auth');
    return null;
  }
  return tokens;
}

function storeTokens(result: any): AuthTokens {
  const tokens: AuthTokens = {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken || getStoredTokens()?.refreshToken || '',
    expiresAt: Date.now() + (result.ExpiresIn || 3600) * 1000,
  };
  sessionStorage.setItem('wbs_auth', JSON.stringify(tokens));
  return tokens;
}

export function isAuthenticated(): boolean {
  return getStoredTokens() !== null;
}

export function getAccessToken(): string | null {
  return getStoredTokens()?.accessToken || null;
}

export async function signIn(email: string, password: string): Promise<{ success: boolean; challenge?: string; session?: string; error?: string }> {
  try {
    const resp = await client.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: AWS_CONFIG.cognito.clientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }));

    if (resp.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      return { success: false, challenge: 'NEW_PASSWORD_REQUIRED', session: resp.Session };
    }

    if (resp.AuthenticationResult) {
      storeTokens(resp.AuthenticationResult);
      return { success: true };
    }

    return { success: false, error: 'Unexpected response' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Sign in failed' };
  }
}

export async function completeNewPassword(session: string, email: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await client.send(new RespondToAuthChallengeCommand({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      ClientId: AWS_CONFIG.cognito.clientId,
      ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword },
      Session: session,
    }));

    if (resp.AuthenticationResult) {
      storeTokens(resp.AuthenticationResult);
      return { success: true };
    }
    return { success: false, error: 'Unexpected response' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Password change failed' };
  }
}

export function signOut() {
  sessionStorage.removeItem('wbs_auth');
}
