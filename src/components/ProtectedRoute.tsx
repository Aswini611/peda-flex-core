import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useState, useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const [isLoadingTooLong, setIsLoadingTooLong] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setIsLoadingTooLong(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          {isLoadingTooLong && (
            <p className="text-xs text-muted-foreground">
              Taking longer than expected... Please check your connection.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
