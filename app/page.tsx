"use client";

import { useState } from "react";
import Field from "./components/Field";
import { readContract, writeContract } from "@wagmi/core";
import { useAccount, useConfig } from "wagmi";

export default function Home() {
  const [result, setResult] = useState<unknown>("");
  const [abi, setAbi] = useState("");
  const { address, chainId, chain } = useAccount();
  const [contractAddress, setContractAddress] = useState("");
  const [functionNames, setFunctionNames] = useState([]);
  const [selectedFunction, setSelectedFunction] = useState("");
  const [args, setArgs] = useState<Array<string>>([]);
  const config = useConfig();
  const onClickRead = async () => {
    try {
      const parsedAbi = JSON.parse(abi).abi;

      console.log("CHAIN", config.chains[0].id);

      const res = await readContract(config, {
        abi: parsedAbi,
        functionName: selectedFunction,
        chainId: chainId,
        address: contractAddress?.toLowerCase() as `0x${string}`,
        account: address?.toLowerCase() as `0x${string}`,
        args: args.map((v) => {
          return v.toLowerCase();
        }),
      }) as unknown;

      setResult(res);
    } catch (err) {
      console.error(err);
      setResult("Error reading contract: " + (err as Error).message);
    }
  };
  const onClickWrite = async () => {};
  return (
    <div className="w-screen h-screen">
      <div className="w-[50%] flex flex-col pt-2.5 px-4 gap-4">
        <label className="text-xl font-bold">Contract Call</label>
        <label className="text-lg font-bold">Chain ID: {chainId}</label>
        <label className="text-lg font-bold">Chain: {chain?.name}</label>
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
        />
        <Field
          placeholder="args comma separated"
          onChange={(e) => {
            setArgs(e.target.value.split(",").map((arg) => arg.trim()));
          }}
        />
        <div className="w-full h-full flex flex-row gap-2.5 justify-center items-center">
          <select
            onChange={(e) => {
              console.log(e.currentTarget.value);
              setSelectedFunction(e.currentTarget.value);
            }}
            className="border-2 rounded-lg p-2 w-full h-full"
          >
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
            disabled={!abi || !contractAddress || !selectedFunction}
            onClick={onClickRead}
            className="w-full h-full rounded-lg bg-blue-500 text-white p-2"
          >
            Read
          </button>
          <button
            disabled={!abi || !contractAddress || !selectedFunction}
            onClick={onClickWrite}
            className="w-full h-full rounded-lg bg-blue-500 text-white p-2"
          >
            Write
          </button>
        </div>
        <span>Reulst: {result}</span>
      </div>
    </div>
  );
}
