"use client";

import React from "react";

export default function Field({
  onChange,
  placeholder,
  value,
  name,
}: {
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
}): React.JSX.Element {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="p-2 w-full h-full border-2 border-black rounded-lg"
    />
  );
}
