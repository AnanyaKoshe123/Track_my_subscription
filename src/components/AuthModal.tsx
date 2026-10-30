import React, { useEffect, useState } from 'react';
import { CreditCard, Clock, Lock, Mail, User, AlertCircle, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../types';
import { WelcomeView } from './WelcomeView';
import { db, formatSupabaseError, getSupabaseError, GOOGLE_OAUTH_PENDING_KEY } from '../services/supabase';

interface AuthModalProps {
  onLogin: (user: UserProfile) => void;
  isPasswordRecovery: boolean;
  onPasswordResetComplete: () => void;
  initialAuthError?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, isPasswordRecovery, onPasswordResetComplete, initialAuthError }) => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [isResetRequest, setIsResetRequest] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [pendingNotice, setPendingNotice] = useState(false);
  const [pendingTitle, setPendingTitle] = useState('Access Pending Approval');
  const [pendingMessage, setPendingMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (isPasswordRecovery) {
      setShowLoginForm(true);
      setIsSignup(false);
      setIsResetRequest(false);
      setLoginError(null);
    }
  }, [isPasswordRecovery]);

  useEffect(() => {
    if (!initialAuthError) return;
    setShowLoginForm(true);
    if (initialAuthError.includes('awaiting administrator approval')) {
      setPendingTitle('Access Pending Approval');
      setPendingMessage(initialAuthError);
      setPendingNotice(true);
      return;
    }
    setLoginError(initialAuthError);
  }, [initialAuthError]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const callbackError = searchParams.get('error') || hashParams.get('error');
    const callbackErrorCode = searchParams.get('error_code') || hashParams.get('error_code') || callbackError;
    const callbackDescription = searchParams.get('error_description') || hashParams.get('error_description') || '';
    const googleSignInWasPending = window.sessionStorage.getItem(GOOGLE_OAUTH_PENDING_KEY) !== null;

    if (!callbackError && !googleSignInWasPending) return;

    setShowLoginForm(true);
    const normalizedCode = (callbackErrorCode || '').toLowerCase();
    const normalizedDescription = callbackDescription.toLowerCase();
    if (normalizedCode === 'access_denied' || normalizedDescription.includes('cancel')) {
      setLoginError('Google sign-in was cancelled. You can try again or sign in with your email and password.');
    } else if (normalizedCode === 'provider_disabled') {
      setLoginError('Google sign-in is not enabled for this Supabase project. Enable the Google provider in Supabase Authentication settings.');
    } else if (/redirect_uri|redirect url|redirect_uri_mismatch/.test(`${normalizedCode} ${normalizedDescription}`)) {
      setLoginError('Google sign-in could not complete because the redirect URL does not match. Check the OAuth callback URL in Google Cloud and the allowed redirect URLs in Supabase.');
    } else if (/invalid_grant|flow_state|pkce|authorization code|oauth state|expired/.test(`${normalizedCode} ${normalizedDescription}`)) {
      setLoginError('The Google sign-in response expired or was invalid. Start Google sign-in again.');
    } else if (googleSignInWasPending && !searchParams.has('code') && !hashParams.has('access_token')) {
      setLoginError('Google did not return a valid sign-in response. Try again, and check that the Google provider and redirect URLs are configured in Supabase.');
    } else {
      setLoginError('Google sign-in could not be completed. Check the Google OAuth credentials and redirect URL configuration, then try again.');
    }

    window.sessionStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY);
    if (callbackError || googleSignInWasPending) {
      for (const params of [searchParams, hashParams]) {
        for (const key of ['error', 'error_code', 'error_description', 'error_uri', 'code', 'state']) {
          params.delete(key);
        }
      }
      const cleanUrl = `${url.pathname}${searchParams.size ? `?${searchParams}` : ''}${hashParams.size ? `#${hashParams}` : ''}`;
      window.history.replaceState(window.history.state, '', cleanUrl);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      if (isPasswordRecovery) {
        if (password !== confirmPassword) {
          setLoginError('The new passwords do not match.');
          return;
        }
        await db.completePasswordReset(password);
        onPasswordResetComplete();
        setPassword('');
        setConfirmPassword('');
        setStatusMessage('Your password has been updated. Sign in with your new password.');
      } else if (isResetRequest) {
        await db.requestPasswordReset(email.trim());
        setIsResetRequest(false);
        setStatusMessage('If an account exists for that email, a password reset link has been sent.');
      } else if (isSignup) {
        const result = await db.signUp(email.trim(), password, fullName);
        setPendingMessage(result.requiresEmailConfirmation
          ? 'Registration was saved. Check your email to confirm your address; an administrator must approve your access before you can sign in.'
          : 'Registration was saved. An administrator must approve your access before you can sign in.');
        setPendingNotice(true);
      } else {
        onLogin(await db.signIn(email.trim(), password));
      }
    } catch (error) {
      const supabaseError = getSupabaseError(error);
      if (isSignup && supabaseError.code === 'over_email_send_rate_limit') {
        setPendingTitle('Signup Email Rate Limit');
        setPendingMessage(
          'Supabase blocked the confirmation email because its email rate limit was reached. Check Authentication → Users in your Supabase project: if this email is not listed, there is no Auth account to sign in with yet. Wait for the limit to clear or configure custom SMTP under Authentication → SMTP Settings, then submit the signup again. Once the account exists and its email is confirmed, an administrator can approve access.'
        );
        setPendingNotice(true);
      } else {
        setLoginError(formatSupabaseError(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError(null);
    setIsGoogleSubmitting(true);
    try {
      await db.signInWithGoogle();
    } catch (error) {
      setLoginError(formatSupabaseError(error));
      setIsGoogleSubmitting(false);
    }
  };

  if (!showLoginForm && !isPasswordRecovery) {
    return <WelcomeView onOpenLogin={() => setShowLoginForm(true)} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#172B3A] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(118,87,232,0.15),transparent_50%)]" />
      
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative z-10 border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-2">
          {!isPasswordRecovery && (
            <button
              onClick={() => {
                setShowLoginForm(false);
                setLoginError(null);
                setPendingNotice(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7657E8] to-[#12B886] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#7657E8]/30">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Track My Subscription</h2>
          <p className="text-xs text-gray-500 mt-1">Premium SaaS Subscription Management Platform</p>
        </div>

        {loginError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        {pendingNotice ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">{pendingTitle}</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {pendingMessage}
            </p>
            <button
              onClick={() => {
                setPendingNotice(false);
                setIsSignup(false);
                setLoginError(null);
              }}
              className="w-full py-2.5 bg-[#7657E8] text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {statusMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-700 font-medium">
                {statusMessage}
              </div>
            )}

            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            {!isPasswordRecovery && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            {!isResetRequest && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {isPasswordRecovery ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {isPasswordRecovery && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {!isSignup && !isResetRequest && !isPasswordRecovery && (
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetRequest(true);
                    setLoginError(null);
                    setStatusMessage(null);
                  }}
                  className="text-xs text-[#7657E8] font-semibold hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full py-3 bg-[#7657E8] text-white rounded-xl font-semibold text-sm shadow-lg shadow-[#7657E8]/30 hover:bg-[#6444d4] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Please wait...'
                : isPasswordRecovery
                  ? 'Update Password'
                  : isResetRequest
                    ? 'Send Reset Link'
                    : isSignup
                      ? 'Submit Access Request'
                      : 'Sign In to Dashboard'}
            </button>

            {!isResetRequest && !isPasswordRecovery && (
              <>
                <div className="flex items-center gap-3 py-1" aria-hidden="true">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <button
                  type="button"
                  onClick={() => void handleGoogleSignIn()}
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2l6.7 5.2c3.9-3.6 6-8.9 6-15.1Z" />
                    <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2l-7 5.4C9.2 39.5 16.1 44 24 44Z" />
                    <path fill="#FBBC05" d="M12.8 27.7a12 12 0 0 1 0-7.4l-7-5.4a20 20 0 0 0 0 18.2l7-5.4Z" />
                    <path fill="#EA4335" d="M24 12c3 0 5.7 1.1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4 16.1 4 9.2 8.5 5.8 14.9l7 5.4C14.4 15.5 18.8 12 24 12Z" />
                  </svg>
                  {isGoogleSubmitting ? 'Connecting to Google...' : 'Continue with Google'}
                </button>
              </>
            )}

            {!isPasswordRecovery && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isResetRequest) {
                      setIsResetRequest(false);
                    } else {
                      setIsSignup(!isSignup);
                    }
                    setLoginError(null);
                    setStatusMessage(null);
                  }}
                  className="text-xs text-[#7657E8] font-semibold hover:underline cursor-pointer"
                >
                  {isResetRequest ? 'Back to Sign In' : isSignup ? 'Already have an account? Sign in' : "Don't have an account? Request access"}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
