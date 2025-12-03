"use client";

import { useMemo, useState } from "react";
import Field from "./components/Field";
import { readContract, writeContract } from "@wagmi/core";
import { useAccount, useConfig } from "wagmi";
import Upload from "./components/Upload";

type AbiInput = {
  name?: string;
  type?: string;
};

type AbiFunction = {
  type?: string;
  name?: string;
  inputs?: AbiInput[];
};

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

  const functionInputs = useMemo<AbiInput[]>(() => {
    if (!abi || !selectedFunction) {
      return [];
    }

    try {
      const parsedAbi = JSON.parse(abi).abi as AbiFunction[];
      const fnDefinition = parsedAbi.find(
        (item) => item.type === "function" && item.name === selectedFunction
      );

      return Array.isArray(fnDefinition?.inputs) ? fnDefinition.inputs : [];
    } catch (error) {
      console.error("Failed to parse ABI for inputs", error);
      return [];
    }
  }, [abi, selectedFunction]);

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
  return (
    <div className="w-screen h-screen">
      <div className="w-[50%] flex flex-col pt-2.5 px-4 gap-4">
        <label className="text-xl font-bold">Contract Call</label>
        <label className="text-lg font-bold">Chain ID: {chainId}</label>
        <label className="text-lg font-bold">Chain: {chain?.name}</label>
        <div className="flex flex-col gap-2">
          <textarea
            placeholder="Define ABI"
            className="rounded-lg border-2 p-2"
            defaultValue={abi}
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
        <Field
          onChange={(e) => {
            if (e.target.value.length > 2 && !e.target.value.startsWith("0x")) {
              alert("Contract address must start with 0x");
              e.target.value = "";
              return;
            }
            setContractAddress(e.target.value);
          }}
          placeholder="Contract address"
          value={contractAddress}
        />
        {functionInputs.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-lg font-semibold">Arguments</label>
            {functionInputs.map((input, index) => (
              <Field
                key={`${selectedFunction}-${input.name ?? index}`}
                placeholder={
                  input.name ? `${input.name} (${input.type})` : `arg${index}`
                }
                value={activeArgs[index] ?? ""}
                onChange={(e) => {
                  setArgValues((prev) => {
                    const next = { ...prev };
                    const current = next[selectedFunction] ?? [];
                    const updated = [...current];
                    updated[index] = e.target.value;
                    next[selectedFunction] = updated;
                    return next;
                  });
                }}
                name={input.name}
              />
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
            disabled={canCall === false}
            onClick={onClickRead}
            className={`w-full h-full rounded-lg bg-blue-500 text-white p-2 ${
              canCall === false ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Read
          </button>
          <button
            disabled={canCall === false}
            onClick={onClickWrite}
            className={`w-full h-full rounded-lg bg-blue-500 text-white p-2 ${
              canCall === false ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Write
          </button>
        </div>
        <span>Reulst: {result as string}</span>
      </div>
    </div>
  );
}
