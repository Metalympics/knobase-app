"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database, InsertDto } from "@/lib/supabase/client";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (data: {
    displayName?: string;
    avatarUrl?: string;
  }) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const createUserProfile = async (
    authUser: User,
    displayName?: string
  ): Promise<{ error: Error | null }> => {
    try {
      const userProfile: InsertDto<"users"> = {
        auth_id: authUser.id,
        email: authUser.email!,
        name: displayName || authUser.email?.split("@")[0] || "User",
      };

      const { error: insertError } = await supabase
        .from("users")
        .insert(userProfile);

      if (insertError) {
        if (insertError.code === "23505") {
          return { error: null };
        }
        console.error("Error creating user profile:", insertError);
        return { error: new Error(insertError.message) };
      }

      return { error: null };
    } catch (error) {
      console.error("Unexpected error creating user profile:", error);
      return {
        error:
          error instanceof Error ? error : new Error("Unknown error occurred"),
      };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        return { error: signUpError };
      }

      if (data.user) {
        const { error: profileError } = await createUserProfile(
          data.user,
          displayName
        );

        if (profileError) {
          console.error("Failed to create user profile:", profileError);
        }
      }

      return { error: null };
    } catch (error) {
      console.error("Unexpected error during sign up:", error);
      return {
        error: {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
          status: 500,
        } as AuthError,
      };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      console.error("Unexpected error during sign in:", error);
      return {
        error: {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
          status: 500,
        } as AuthError,
      };
    }
  };

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      return {
        error: {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
          status: 500,
        } as AuthError,
      };
    }
  };

  const updateProfile = async (data: {
    displayName?: string;
    avatarUrl?: string;
  }): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error("No user logged in") };
    }

    try {
      const updates: {
        name?: string;
        avatar_url?: string;
        updated_at: string;
      } = {
        updated_at: new Date().toISOString(),
      };

      if (data.displayName !== undefined) {
        updates.name = data.displayName;
      }
      if (data.avatarUrl !== undefined) {
        updates.avatar_url = data.avatarUrl;
      }

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("auth_id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      console.error("Unexpected error updating profile:", error);
      return {
        error:
          error instanceof Error ? error : new Error("Unknown error occurred"),
      };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
