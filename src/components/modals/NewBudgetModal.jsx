import { useState } from "react";
import BaseModal from "./BaseModal";

export default function NewBudgetModal({ onCreate, onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <BaseModal onClose={onClose}>
      <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          Nowy budżet
        </h2>

        <input
          className="w-full mb-3 px-4 py-2.5 border rounded-lg"
          placeholder="Nazwa budżetu"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <textarea
          className="w-full mb-5 px-4 py-2.5 border rounded-lg resize-none"
          rows={3}
          placeholder="Opis (opcjonalnie)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={() => {
              onCreate(name, description);
              onClose();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg"
          >
            Utwórz
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 py-2.5 rounded-lg"
          >
            Anuluj
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
