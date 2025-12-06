import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Navigation() {
  const location = useLocation();

  const tabs = [
    { name: "Dashboard", path: "/" },
    { name: "Wydatki", path: "/expenses" },
    { name: "Wpływy", path: "/income" },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <nav className="bg-dark-surface rounded-lg shadow-xl">
      <div className="flex justify-between items-center p-2">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                location.pathname === tab.path
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-300 hover:bg-dark-hover hover:text-white"
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="mr-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-dark-hover rounded-lg font-medium transition-all"
        >
          Wyloguj
        </button>
      </div>
    </nav>
  );
}