"use client";
import { useEffect, useState } from "react";
import { keccak256 } from "viem";
import { readContract } from "@wagmi/core";

const hasRoleAbi = [
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
];

export default function RolesChecker({ config, contractAddress }) {
  const [roleHash, setRoleHash] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [checkResults, setCheckResults] = useState<string[]>([]);
  useEffect(() => {
    const checkRoles = async () => {
      setCheckResults([]);
      for (const addr of addresses) {
        try {
          const hasRole = await readContract(config, {
            address: contractAddress as `0x${string}`,
            abi: hasRoleAbi,
            functionName: "hasRole",
            args: [roleHash as `0x${string}`, addr as `0x${string}`],
          });
          setCheckResults((prev) => [...prev, `${addr}: ${hasRole}`]);
        } catch (error) {
          console.error(`Error checking role for address ${addr}:`, error);
        }
      }
    };
    if (roleHash && addresses.length > 0 && contractAddress) {
      checkRoles();
    }
  }, [addresses, roleHash, contractAddress, config]);
  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <div className="w-full h-full flex flex-row gap-2">
        <input
          type="text"
          className="rounded-lg border-2 p-2 w-full h-full"
          placeholder="Insert role name"
          onChange={(e) => {
            if (e.currentTarget.value.length <= 4) return;
            if (e.currentTarget.value.startsWith("0x")) {
              if (e.currentTarget.value.length < 65) {
                e.currentTarget.value = e.currentTarget.value.padEnd(65, "0");
              }
              console.log("Setting role hash to:", e.currentTarget.value);
              setRoleHash(e.currentTarget.value);
              return;
            }
            setRoleHash(keccak256(e.currentTarget.value as `0x${string}`));
          }}
        />
        <textarea
          className="rounded-lg border-2 p-2 w-full h-full"
          placeholder="Insert addresses to check with space delimiter"
          onChange={(e) => {
            setAddresses(
              e.currentTarget.value.split(" ").filter((c) => c.length > 0)
            );
          }}
        />
      </div>
      <div className="w-full h-full">
        <ul className="w-full h-full">
          {checkResults.map((res, index) => (
            <li key={index} className="wrap-break-word">
              {res}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
