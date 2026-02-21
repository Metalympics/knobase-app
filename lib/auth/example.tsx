"use client";

import { useState } from "react";
import { useAuth } from "./provider";

export function AuthExample() {
  const { user, loading, signUp, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp) {
      const { error: signUpError } = await signUp(email, password, displayName);
      if (signUpError) {
        setError(signUpError.message);
      }
    } else {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm">
          <p className="font-medium">Signed in as:</p>
          <p className="text-gray-600">{user.email}</p>
          <p className="text-xs text-gray-500 mt-1">ID: {user.id}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="mb-4">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-blue-500 hover:underline"
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "Need an account? Sign Up"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-bold">
          {isSignUp ? "Sign Up" : "Sign In"}
        </h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}

        {isSignUp && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="John Doe"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isSignUp ? "Sign Up" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
