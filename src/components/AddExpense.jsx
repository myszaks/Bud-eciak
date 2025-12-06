import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AddExpense({ userId, onAdded }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  async function handleAdd() {
    if (!title || !amount) return;
    const { error } = await supabase
      .from("expenses")
      .insert([{ user_id: userId, title, amount: parseFloat(amount) }]);
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
