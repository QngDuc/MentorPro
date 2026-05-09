"use client";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [history, setHistory] = useState<{id: string, summary: string}[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/chat-history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setHistory(data);
    };
    fetchHistory();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Lịch sử Chat</h2>
      <ul className="space-y-2">
        {history.map(h => (
          <li key={h.id} className="p-3 border rounded hover:bg-gray-100">
            {h.summary}
          </li>
        ))}
      </ul>
    </div>
  );
}