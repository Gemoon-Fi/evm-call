"use client";

import {
  getBytecode,
  getStorageAt,
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import { useEffect, useMemo, useState } from "react";
import { encodeFunctionData, getAddress, parseEther, keccak256 } from "viem";
import { useAccount, useConfig, useStorageAt } from "wagmi";
import Field from "./components/Field";
import Upload from "./components/Upload";

type AbiInput = {
  name?: string;
  type?: string;
};

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  } catch (err) {
    console.error("Failed to copy: ", err);
    alert("Failed to copy to clipboard");
  }
}

type AbiFunction = {
  type?: string;
  name?: string;
  inputs?: AbiInput[];
  stateMutability?: string;
};

type FunctionArgumentMap = Record<string, string>;
type FunctionArgumentsStore = Record<string, FunctionArgumentMap>;

const parseResult = (res: unknown | bigint): React.ReactElement => {
  if (typeof res === "bigint") {
    return (
      <span className="flex flex-row justify-start items-center gap-1">
        <span>{parseEther(res.toString(), "wei").toString()}</span>
        <button
          className="ml-2 p-1 border-2 rounded-lg bg-blue-400 text-white border-white"
          onClick={(e) => {
            if (e.currentTarget.innerText !== "to WEI") {
              e.currentTarget.innerText = "to WEI";
              e.currentTarget.previousSibling!.textContent =
                res.toString() + " ETH";
            } else {
              e.currentTarget.innerText = "to ETH";
              e.currentTarget.previousSibling!.textContent =
                parseEther(res.toString(), "wei").toString() + " wei";
            }
          }}
        >
          Change ETH/WEI
        </button>
      </span>
    );
  } else if (typeof res === "object") {
    return (
      <pre className="whitespace-pre-wrap wrap-break-word">
        {JSON.stringify(res, null, 2)}
      </pre>
    );
  } else if (typeof res === "boolean") {
    console.log("Boolean result:", res);
    return (
      <span className="text-white text-center">
        {res ? (
          <pre className="p-2 rounded-lg max-w-[8%] bg-green-400">TRUE</pre>
        ) : (
          <pre className="p-2 rounded-lg max-w-[8%] bg-red-400">FALSE</pre>
        )}
      </span>
    );
  } else {
    return <span>{String(res)}</span>;
  }
};

const makeInputKey = (input: AbiInput, index: number) =>
  input.name ?? `__arg_${index}`;

const ownerAbi = [
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
];

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

const implementationSlot =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

export default function Home() {
  const [result, setResult] = useState<unknown | bigint>("");
  const [abi, setAbi] = useState("");
  const { address, chainId, chain } = useAccount();
  const [contractAddress, setContractAddress] = useState("");
  const [functionNames, setFunctionNames] = useState<string[]>([]);
  const [selectedFunction, setSelectedFunction] = useState("");
  const [functionArguments, setFunctionArguments] =
    useState<FunctionArgumentsStore>({});
  const [disableAbiChange, setDisableAbiChange] = useState(false);
  const [owner, setOwner] = useState<string>("");
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(null);
  const [isEOA, setIsEOA] = useState<boolean | null>(false);
  const config = useConfig();
  const [keccakHash, setKeccakHash] = useState<`0x${string}`>("0x");
  const [clipboardSelected, setClipboardSelected] = useState<
    string | undefined
  >(undefined);
  const canCall = Boolean(
    abi && contractAddress && selectedFunction && address
  );
  const [storageSlotContent, setStorageSlotContent] = useState<
    string | undefined | null
  >(undefined);
  const [slot, setSlot] = useState<string | undefined>("");

  useEffect(() => {
    const listener = async () => {
      try {
        const text = await navigator.clipboard.readText();
        setClipboardSelected(text);
        console.log("Clipboard text selected:", text);
      } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
      }
    };
    document.addEventListener("copy", listener);
  }, []);

  useEffect(() => {
    async function bgJobs() {
      try {
        if (!contractAddress) {
          setOwner("N/A");
          return;
        }
        const res = readContract(config, {
          abi: ownerAbi,
          functionName: "owner",
          chainId: chainId,
          address: contractAddress as `0x${string}`,
        });
        console.log("fetched owner:", await res);
        if (!res) {
          setOwner("N/A");
          return;
        }
        setOwner((await res) as string);
      } catch (error) {
        console.error("Failed to fetch owner:", error);
        setOwner("Error (possible contract isn't ownable)");
      }

      try {
        const hasAdmin = await readContract(config, {
          abi: hasRoleAbi,
          functionName: "hasRole",
          chainId: chainId,
          address: contractAddress as `0x${string}`,
          args: [
            "0x0000000000000000000000000000000000000000000000000000000000000000", // Replace with actual admin role hash
            address as `0x${string}`,
          ],
        });
        setHasAdminRole(hasAdmin as boolean);
      } catch (error) {
        console.error("Failed to fetch admin role:", error);
        setHasAdminRole(null);
      }

      try {
        const bytecode = await getBytecode(config, {
          address: contractAddress as `0x${string}`,
          chainId: chainId,
        });
        console.log("Contract bytecode:", bytecode);
        const isEoa = bytecode === undefined || bytecode === "0x";
        setIsEOA(isEoa);
      } catch (error) {
        console.error("Failed to fetch contract bytecode:", error);
      }

      if (!contractAddress) {
        return;
      }
    }

    bgJobs();
  }, [address, contractAddress, chainId, config]);

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

  const orderedArgs = useMemo(() => {
    if (!selectedFunction) {
      return [] as string[];
    }

    const fnArgs = functionArguments[selectedFunction] ?? {};
    return functionInputs.map((input, index) => {
      const key = makeInputKey(input, index);
      return fnArgs[key] ?? "";
    });
  }, [functionArguments, functionInputs, selectedFunction]);

  const calldata = useMemo(() => {
    if (!abi || !selectedFunction) {
      return "";
    }

    try {
      const parsedAbi = JSON.parse(abi).abi;
      return encodeFunctionData({
        abi: parsedAbi,
        functionName: selectedFunction,
        args: orderedArgs as unknown[],
      });
    } catch (error) {
      console.error("Failed to encode calldata", error);
      return "";
    }
  }, [abi, orderedArgs, selectedFunction]);

  const onClickRead = async () => {
    try {
      const parsedAbi = JSON.parse(abi).abi;

      const res = (await readContract(config, {
        abi: parsedAbi,
        functionName: selectedFunction,
        chainId: chainId,
        address: contractAddress?.toLowerCase() as `0x${string}`,
        account: address?.toLowerCase() as `0x${string}`,
        args: orderedArgs.map((value) =>
          typeof value === "string" ? value.toLowerCase() : value
        ),
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
        args: orderedArgs.map((value) =>
          typeof value === "string" ? value.toLowerCase() : value
        ),
      })) as unknown;

      console.log("RESULT", res);

      waitForTransactionReceipt(config, {
        hash: res as `0x${string}`,
        chainId: chainId,
      })
        .then((receipt) => {
          setResult(receipt);
          console.log("Transaction receipt:", receipt);
        })
        .catch((r) => {
          setResult(r);
          console.log("Transaction receipt reject:", r);
        });
    } catch (err) {
      console.error(err);
      setResult("Error reading contract: " + (err as Error).message);
    }
  };
  const newLocal: React.ReactNode =
    result !== undefined && result !== null && result !== "" ? (
      <span className="rounded-lg bg-amber-200 min-h-[150px] p-2 text-clip overflow-scroll border-2">
        {parseResult(result)}
      </span>
    ) : null;

  return (
    <div className="min-h-screen w-full flex flex-col gap-6 p-4 overflow-x-hidden md:flex-row md:items-start">
      <div className="w-full flex flex-col justify-start items-stretch pt-2.5 px-4 gap-4 border border-gray-200 rounded-xl md:border-0 md:border-r-2 md:rounded-none md:pr-6 md:max-w-[50%] md:basis-1/2 md:flex-[0_0_50%]">
        <label className="text-xl font-bold self-center">
          <h2 className="text-[28px]">Contract Call</h2>
        </label>
        <label className="text-lg font-bold">Chain ID: {chainId}</label>
        <label className="text-lg font-bold">Chain: {chain?.name}</label>
        <label className="text-lg font-bold">
          Is EOA: {isEOA === null ? "N/A" : isEOA ? "YES" : "NO"}
        </label>
        <label className="text-lg font-bold flex flex-col md:flex-row gap-1 justify-start items-start md:items-end">
          <span className="truncate">Contract implementation address: </span>
          <span className="text-[16px]">
            {implementationAddress?.toLowerCase() ?? "Not available"}
          </span>
        </label>
        <div className="flex flex-col gap-2 border-t-2 border-blue-500 p-5 border-2 rounded-xl">
          <h3 className="font-bold text-[20px] self-center mb-0 md:mb-2">
            ABI
          </h3>
          <textarea
            placeholder="Define ABI"
            disabled={disableAbiChange}
            className={`rounded-lg border-2 p-2 ${
              disableAbiChange ? "bg-gray-200" : ""
            }`}
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
          <label>
            <strong>{functionNames.length}</strong> functions
          </label>
          <span className="self-center font-bold">OR</span>
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
              setDisableAbiChange(true);
            }}
            text="Upload ABI JSON"
          />
        </div>
        <div className="flex flew-row gap-2.5 justify-center items-center">
          <Field
            maxLength={42}
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
                  value={orderedArgs[index] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!selectedFunction) {
                      return;
                    }
                    const key = makeInputKey(input, index);
                    setFunctionArguments((prev) => {
                      const fnArgs = { ...(prev[selectedFunction] ?? {}) };
                      fnArgs[key] = value;
                      return {
                        ...prev,
                        [selectedFunction]: fnArgs,
                      };
                    });
                  }}
                  name={input.name}
                />
                {input.type?.toLowerCase().includes("address") && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!address || !selectedFunction) {
                        return;
                      }
                      const key = makeInputKey(input, index);
                      setFunctionArguments((prev) => {
                        const fnArgs = { ...(prev[selectedFunction] ?? {}) };
                        fnArgs[key] = address.toLowerCase();
                        return {
                          ...prev,
                          [selectedFunction]: fnArgs,
                        };
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
                {input.type?.toLowerCase().includes("bytes32") && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedFunction) {
                        return;
                      }
                      const zeroBytes32 =
                        "0x0000000000000000000000000000000000000000000000000000000000000000";
                      const key = makeInputKey(input, index);
                      setFunctionArguments((prev) => {
                        const fnArgs = { ...(prev[selectedFunction] ?? {}) };
                        fnArgs[key] = zeroBytes32;
                        return {
                          ...prev,
                          [selectedFunction]: fnArgs,
                        };
                      });
                    }}
                    className="h-12 w-12 flex items-center justify-center rounded-lg border-2 border-blue-500 text-blue-500"
                    aria-label="Use zero bytes32"
                  >
                    0x0
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="w-full h-full flex flex-row gap-2.5 justify-center items-center">
          <select
            disabled={functionNames.length === 0}
            value={selectedFunction}
            onChange={(e) => {
              console.log(e.currentTarget.value);
              setSelectedFunction(e.currentTarget.value);
            }}
            className={`border-2 rounded-lg p-2 w-full h-full ${
              functionNames.length === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
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
        <span className="max-w-[60%] wrap-break-word flex flex-col justify-baseline gap-4">
          <div className="flex flex-row gap-4 justify-start items-center">
            <label className="font-semibold">Calldata</label>
            <button
              disabled={!calldata}
              onClick={() => copyToClipboard(calldata)}
              className={`p-2 border-2 rounded-lg ${
                !calldata ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Copy calldata
            </button>
          </div>
          <span>{calldata}</span>
        </span>
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
      <div className="flex-1 w-full flex flex-col gap-6 px-4">
        <div className="flex flex-col border-b-2 justify-start p-2 items-start w-full wrap-break-word">
          <h1 className="text-3xl font-bold mb-4 self-center">Access rights</h1>
          <label className="text-lg font-bold wrap-break-word w-full">
            Owner (Ownable check): {owner}
          </label>
          <label
            className={`text-lg font-bold wrap-break-word w-full ${
              hasAdminRole ? "text-red-500" : "text-green-500"
            }`}
          >
            Current address has admin role (AccessControl check):{" "}
            {hasAdminRole === null ? "N/A" : hasAdminRole ? "YES" : "NO"}
          </label>
        </div>
        <div className="w-full p-2 wrap-break-word">
          <h1 className="text-3xl font-bold mb-4 text-center">Storage slots</h1>{" "}
          <div className="flex flex-col justify-baseline items-start gap-2 wrap-break-word w-full">
            <Field
              name="storage-slot"
              type="text"
              disabled={!contractAddress || isEOA}
              onChange={async (e) => {
                let val = e.currentTarget.value;
                // Pad to 32 bytes (64 hex chars) if not already
                if (val.startsWith("0x")) {
                  val = val.slice(2);
                }
                if (val.length < 64) {
                  val = val.padStart(64, "0");
                }
                val = "0x" + val;
                const content = await getStorageAt(config, {
                  address: contractAddress as `0x${string}`,
                  chainId: chainId,
                  slot: val as `0x${string}`,
                });
                setSlot(val);
                setStorageSlotContent(content?.toString());
              }}
              placeholder="Enter storage slot"
            />
            <span className="font-semibold wrap-break-word w-full">
              Slot: {slot}
            </span>
            <span className="font-semibold">Slot value:</span>
            <span className="wrap-break-word whitespace-pre-wrap w-full">
              {storageSlotContent}
            </span>
            <span className="font-semibold border-t-2 pt-4 w-full h-full text-left">
              Keccak256: {keccakHash}
            </span>
            <Field
              placeholder="Enter value for HASHING"
              name="keccak256"
              onChange={(e) => {
                const input = e.currentTarget.value;
                if (!input) {
                  setKeccakHash("0x");
                  return;
                }
                let hexInput: `0x${string}`;
                if (!input.startsWith("0x")) {
                  hexInput = `0x${Buffer.from(input, "utf8").toString("hex")}`;
                } else {
                  hexInput = input as `0x${string}`;
                }
                setKeccakHash(keccak256(hexInput));
              }}
            />
            <span className="font-semibold border-t-2 pt-4 w-full h-full text-left">
              Clipboard keccak256: {keccak256((`0x${(clipboardSelected ?? "")}`) as `0x${string}`)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
