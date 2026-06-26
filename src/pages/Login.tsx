import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_NAME, APP_TAGLINE, APP_LOGO } from "../constants/branding";
import { useAuth } from "../providers";
import { identityService } from "../services/identityService";
import authService from "../services/authService";
import type { OrganizationBranding } from "../types/identity";
import { getDefaultAppPath, resolveApiAssetUrl } from "../utils/roles";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [orgBranding, setOrgBranding] = useState<OrganizationBranding | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const displayName = orgBranding?.app_display_name || APP_NAME;
  const tagline = orgBranding?.app_tagline || APP_TAGLINE;
  const logoUrl = resolveApiAssetUrl(orgBranding?.logo_url) || APP_LOGO || null;

  const handleUsernameBlur = async () => {
    if (!username.includes("@")) return;
    const branding = await identityService.lookupBrandingByEmail(username);
    setOrgBranding(branding);
    if (branding?.favicon_url) {
      const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (link) link.href = resolveApiAssetUrl(branding.favicon_url) || link.href;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!username || !password) {
        setError("Please enter both username and password");
        setIsLoading(false);
        return;
      }

      await login(username, password);
      const token = localStorage.getItem("comply_lens_access_token");
      const user = token ? authService.decodeToken(token) : null;
      navigate(getDefaultAppPath(user));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
          {/* Header */}
          <div className="text-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt={displayName} className="mx-auto mb-4 h-12 w-auto" />
            ) : (
              <h1 className="text-3xl font-bold text-white mb-2">{displayName}</h1>
            )}
            <p className="text-slate-400">{tagline}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username or Email
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => void handleUsernameBlur()}
                placeholder="hraverkar@a10networks.com"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-slate-400 text-sm">
          <p>Secure access to compliance and OSS management tools</p>
        </div>
      </div>
    </div>
  );
}
