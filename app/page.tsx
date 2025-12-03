"use client";

import { readContract, writeContract } from "@wagmi/core";
import { useMemo, useState } from "react";
import { useAccount, useConfig, useStorageAt } from "wagmi";
import { getAddress } from "viem";
import Field from "./components/Field";
import Upload from "./components/Upload";

type AbiInput = {
  name?: string;
  type?: string;
};

type AbiFunction = {
  type?: string;
  name?: string;
  inputs?: AbiInput[];
  stateMutability?: string;
};

const implementationSlot =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

export default function Home() {
  const [result, setResult] = useState<unknown>("");
  const [abi, setAbi] = useState("");
  const { address, chainId, chain } = useAccount();
  const [contractAddress, setContractAddress] = useState("");
  const [functionNames, setFunctionNames] = useState<string[]>([]);
  const [selectedFunction, setSelectedFunction] = useState("");
  const [argValues, setArgValues] = useState<Record<string, string[]>>({});
  const config = useConfig();
  const canCall = Boolean(
    abi && contractAddress && selectedFunction && address
  );

  const { data } = useStorageAt({
    address: contractAddress as `0x${string}`,
    chainId: chainId,
    slot: implementationSlot,
  });

  console.log("implementation address storage data:", data);

  const isProxy = Boolean(
    data &&
      data !==
        "0x0000000000000000000000000000000000000000000000000000000000000000"
  );

  const implementationAddress = useMemo(() => {
    if (!data) {
      return null;
    }

    try {
      const hexWithoutPrefix = data.replace(/^0x/, "");
      if (hexWithoutPrefix.length < 40) {
        return null;
      }

      const addressHex = `0x${hexWithoutPrefix.slice(-40)}`;
      return getAddress(addressHex);
    } catch (error) {
      console.error("Failed to derive implementation address", error);
      return null;
    }
  }, [data]);

  const selectedFunctionDefinition = useMemo<AbiFunction | null>(() => {
    if (!abi || !selectedFunction) {
      return null;
    }

    try {
      const parsedAbi = JSON.parse(abi).abi as AbiFunction[];
      const fnDefinition = parsedAbi.find(
        (item) => item.type === "function" && item.name === selectedFunction
      );

      return fnDefinition ?? null;
    } catch (error) {
      console.error("Failed to parse ABI for function metadata", error);
      return null;
    }
  }, [abi, selectedFunction]);

  const functionInputs = useMemo(
    () => selectedFunctionDefinition?.inputs ?? [],
    [selectedFunctionDefinition]
  );

  const isReadOnlyFunction = useMemo(() => {
    if (!selectedFunctionDefinition?.stateMutability) {
      return false;
    }

    return ["view", "pure"].includes(
      selectedFunctionDefinition.stateMutability
    );
  }, [selectedFunctionDefinition]);

  const canPressRead = Boolean(canCall && isReadOnlyFunction);
  const canPressWrite = Boolean(
    canCall && selectedFunctionDefinition && !isReadOnlyFunction
  );

  const activeArgs = useMemo(() => {
    if (!selectedFunction) {
      return [] as string[];
    }

    const storedValues = argValues[selectedFunction] ?? [];
    return functionInputs.map((_, index) => storedValues[index] ?? "");
  }, [argValues, functionInputs, selectedFunction]);

  const onClickRead = async () => {
    try {
      const parsedAbi = JSON.parse(abi).abi;

      const res = (await readContract(config, {
        abi: parsedAbi,
        functionName: selectedFunction,
        chainId: chainId,
        address: contractAddress?.toLowerCase() as `0x${string}`,
        account: address?.toLowerCase() as `0x${string}`,
        args: activeArgs.map((v) => {
          return v.toLowerCase();
        }),
      })) as unknown;

      setResult(res);
    } catch (err) {
      console.error(err);
      setResult("Error reading contract: " + (err as Error).message);
    }
  };
  const onClickWrite = async () => {
    try {
      const parsedAbi = JSON.parse(abi).abi;

      const res = (await writeContract(config, {
        abi: parsedAbi,
        functionName: selectedFunction,
        chainId: chainId,
        address: contractAddress?.toLowerCase() as `0x${string}`,
        account: address?.toLowerCase() as `0x${string}`,
        args: activeArgs.map((v) => {
          return v.toLowerCase();
        }),
      })) as unknown;

      setResult(res);
    } catch (err) {
      console.error(err);
      setResult("Error reading contract: " + (err as Error).message);
    }
  };
  const newLocal: React.ReactNode =
    result !== undefined && result !== null && result !== "" ? (
      <span className="rounded-lg bg-amber-200 p-2 text-clip overflow-scroll border-2">
        {typeof result === "object" ? JSON.stringify(result) : String(result)}
      </span>
    ) : null;

  return (
    <div className="w-screen h-screen">
      <div className="w-[50%] flex flex-col pt-2.5 px-4 gap-4">
        <label className="text-xl font-bold">Contract Call</label>
        <label className="text-lg font-bold">Chain ID: {chainId}</label>
        <label className="text-lg font-bold">Chain: {chain?.name}</label>
        <label className="text-lg font-bold">
          Contract implementation address:{" "}
          {implementationAddress?.toLowerCase() ?? "Not available"}
        </label>
        <div className="flex flex-col gap-2 border-t-2 border-blue-500 p-5 border-2 rounded-xl">
          <textarea
            placeholder="Define ABI"
            className="rounded-lg border-2 p-2"
            value={abi}
            onChange={(e) => {
              if (!e.target.value) {
                setAbi("");
                setFunctionNames([]);
                return;
              }
              setAbi(e.target.value);
              const parsedAbi = JSON.parse(e.target.value).abi;
              const fnNames = parsedAbi
                .filter((item: { type: string }) => item.type === "function")
                .map((item: { name: string }) => item.name);
              setFunctionNames(fnNames.length > 0 ? fnNames : []);
            }}
          ></textarea>
          <span>OR</span>
          <Upload
            uploadCb={(file: File) => {
              const reader = new FileReader();
              reader.readAsText(file);
              reader.onload = () => {
                const content = reader.result as string;
                setAbi(content);
                const parsedAbi = JSON.parse(content).abi;
                const fnNames = parsedAbi
                  .filter((item: { type: string }) => item.type === "function")
                  .map((item: { name: string }) => item.name);
                setFunctionNames(fnNames.length > 0 ? fnNames : []);
              };
            }}
            text="Upload ABI JSON"
          />
        </div>
        <div className="flex flew-row gap-2.5 justify-center items-center">
          <Field
            onChange={(e) => {
              if (
                e.target.value.length > 2 &&
                !e.target.value.startsWith("0x")
              ) {
                alert("Contract address must start with 0x");
                e.target.value = "";
                return;
              }
              setContractAddress(e.target.value);
            }}
            placeholder="Contract address"
            value={contractAddress}
          />
          {isProxy && (
            <span className="bg-green-300 rounded-lg text-center text-white font-bold p-2 text-nowrap">
              Contract is proxy
            </span>
          )}
        </div>
        {functionInputs.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-lg font-semibold">Arguments</label>
            {functionInputs.map((input, index) => (
              <div
                key={`${selectedFunction}-${input.name ?? index}`}
                className="flex items-center gap-2"
              >
                <Field
                  placeholder={
                    input.name ? `${input.name} (${input.type})` : `arg${index}`
                  }
                  value={activeArgs[index] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setArgValues((prev) => {
                      const next = { ...prev };
                      const current = next[selectedFunction] ?? [];
                      const updated = [...current];
                      updated[index] = value;
                      next[selectedFunction] = updated;
                      return next;
                    });
                  }}
                  name={input.name}
                />
                {input.type?.toLowerCase().includes("address") && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!address) {
                        return;
                      }
                      setArgValues((prev) => {
                        const next = { ...prev };
                        const current = next[selectedFunction] ?? [];
                        const updated = [...current];
                        updated[index] = address.toLowerCase();
                        next[selectedFunction] = updated;
                        return next;
                      });
                    }}
                    disabled={!address}
                    className="h-12 w-12 flex items-center justify-center rounded-lg border-2 border-blue-500 text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Use connected address"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 32 32"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M26 20h-8.17l2.58-2.59L19 16l-5 5l5 5l1.41-1.41L17.83 22H26v8h2v-8a2 2 0 0 0-2-2"
                      />
                      <path
                        fill="currentColor"
                        d="m23.71 9.29l-7-7A1 1 0 0 0 16 2H6a2 2 0 0 0-2 2v24a2 2 0 0 0 2 2h8v-2H6V4h8v6a2 2 0 0 0 2 2h6v2h2v-4a1 1 0 0 0-.29-.71M16 4.41L21.59 10H16Z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="w-full h-full flex flex-row gap-2.5 justify-center items-center">
          <select
            value={selectedFunction}
            onChange={(e) => {
              console.log(e.currentTarget.value);
              setSelectedFunction(e.currentTarget.value);
            }}
            className="border-2 rounded-lg p-2 w-full h-full"
          >
            <option value="">Select function</option>
            {functionNames.map((fnName) => (
              <option key={fnName} value={fnName}>
                {fnName}
              </option>
            ))}
          </select>
          <span className="w-full h-full ">
            Current selected function:{" "}
            <span className="font-bold text-[16px] text-amber-500">
              {selectedFunction}
            </span>
          </span>
        </div>
        <div className="flex flex-row gap-2.5">
          <button
            disabled={!canPressRead}
            onClick={onClickRead}
            className={`w-full h-full rounded-lg bg-blue-500 text-white p-2 ${
              !canPressRead ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Read
          </button>
          <button
            disabled={!canPressWrite}
            onClick={onClickWrite}
            className={`w-full h-full rounded-lg bg-blue-500 text-white p-2 ${
              !canPressWrite ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Write
          </button>
        </div>
        <label>Result</label>
        {newLocal}
      </div>
    </div>
  );
}
