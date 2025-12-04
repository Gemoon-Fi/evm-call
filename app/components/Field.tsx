"use client";

import React from "react";

export default function Field({
  onChange,
  disabled,
  maxLength,
  placeholder,
  type = "text",
  value,
  name,
}: {
  placeholder: string;
  value?: string;
  maxLength?: number;
  disabled?: boolean;
  type?: "text" | "number" | "password" | "email";
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
}): React.JSX.Element {
  return (
    <input
      type={type}
      maxLength={maxLength}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`p-2 w-full h-full border-2 border-black rounded-lg ${
        disabled ? "bg-gray-200 cursor-not-allowed" : "bg-white"
      }`}
    />
  );
}
