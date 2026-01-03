import React, { useState } from "react";
import { addExpenseForUser } from "../lib/api";

export default function AddExpense({ userId, onAdded }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  function validateInput() {
    if (!title.trim()) {
      alert("Tytuł nie może być pusty.");
      return false;
    }
    if (title.length > 100) {
      alert("Tytuł jest za długi (max 100 znaków).");
      return false;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      alert("Kwota musi być liczbą dodatnią.");
      return false;
    }
    return true;
  }

  async function handleAdd() {
    if (!validateInput()) return;
    const { error } = await addExpenseForUser({ user_id: userId, title: title.trim(), amount: parseFloat(amount) });
    if (error) console.error(error);
    else {
      setTitle("");
      setAmount("");
      onAdded && onAdded();
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <h3 className="text-lg font-semibold mb-2">Dodaj wydatek</h3>
      <input
        className="w-full p-2 mb-2 border rounded"
        placeholder="Tytuł"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="w-full p-2 mb-2 border rounded"
        placeholder="Kwota"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={handleAdd}
      >
        Dodaj
      </button>
    </div>
  );
}