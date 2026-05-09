"use client";
import { useState } from "react";

export default function OCRPage() {
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState("");

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files) setImage(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if(!image) return;
    const formData = new FormData();
    formData.append("file", image);

    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8000/ocr", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    setText(data.text);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">OCR - Trích xuất văn bản</h2>
      <input type="file" accept="image/*" onChange={handleUpload} className="mb-4"/>
      <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">Trích xuất</button>
      <textarea value={text} readOnly className="w-full h-64 p-2 border rounded" placeholder="Văn bản sẽ hiển thị ở đây"/>
    </div>
  );
}