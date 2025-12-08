import React from 'react';

export function LoadingSpinner({ size = "md", color = "blue" }) {
  const sizeClasses = {
    xs: "h-3 w-3 border-2",
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-16 w-16 border-4",
    xl: "h-24 w-24 border-4",
  };

  const colorClasses = {
    blue: "border-blue-500 border-t-transparent",
    red: "border-red-500 border-t-transparent",
    green: "border-green-500 border-t-transparent",
    yellow: "border-yellow-500 border-t-transparent",
    purple: "border-purple-500 border-t-transparent",
    white: "border-white border-t-transparent",
    gray: "border-gray-500 border-t-transparent",
  };

  return (
    <div 
      className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}
      role="status"
      aria-label="Ładowanie"
    >
      <span className="sr-only">Ładowanie...</span>
    </div>
  );
}

export function LoadingScreen({ message = "Ładowanie...", color = "blue" }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <LoadingSpinner size="lg" color={color} />
        {message && (
          <p className="text-gray-400 mt-4 text-lg">{message}</p>
        )}
      </div>
    </div>
  );
}

export function LoadingButton({ loading, children, className = "", ...props }) {
  return (
    <button
      disabled={loading}
      className={`relative ${className} ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" color="white" />
        </span>
      )}
      <span className={loading ? 'invisible' : ''}>
        {children}
      </span>
    </button>
  );
}

export function LoadingOverlay({ message = "Przetwarzanie...", show = false }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-surface border border-dark-border rounded-xl p-8 shadow-2xl">
        <div className="text-center">
          <LoadingSpinner size="xl" color="blue" />
          {message && (
            <p className="text-white mt-6 text-lg font-medium">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function InlineLoader({ message, color = "blue", size = "sm" }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <LoadingSpinner size={size} color={color} />
      {message && (
        <span className="text-gray-400 text-sm">{message}</span>
      )}
    </div>
  );
}

export function CardLoader({ rows = 3 }) {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-xl p-6 shadow-lg animate-pulse">
      <div className="space-y-4">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-10 h-10 bg-dark-border rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-dark-border rounded w-3/4"></div>
              <div className="h-3 bg-dark-border rounded w-1/2"></div>
            </div>
            <div className="h-6 w-20 bg-dark-border rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonText({ width = "full", height = "4" }) {
  const widthClasses = {
    full: "w-full",
    "3/4": "w-3/4",
    "1/2": "w-1/2",
    "1/4": "w-1/4",
  };

  const heightClasses = {
    "3": "h-3",
    "4": "h-4",
    "5": "h-5",
    "6": "h-6",
  };

  return (
    <div className={`bg-dark-border rounded animate-pulse ${widthClasses[width]} ${heightClasses[height]}`}></div>
  );
}