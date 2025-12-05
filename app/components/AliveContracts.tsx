import { getBytecode } from "@wagmi/core";
import { useEffect, useState } from "react";

export default function AliveContracts({
  config,
}: {
  config: any;
}): React.JSX.Element {
  const [inputContracts, setInputContracts] = useState<string[]>([]);
  const [aliveContracts, setAliveContracts] = useState<string[]>([]);

  useEffect(() => {
    const call = async () => {
      const alive: string[] = [];
      for (const c of inputContracts) {
        const code = await getBytecode(config, { address: c as `0x${string}` });
        if (code?.length > 0) {
          alive.push(c);
        }
      }
      setAliveContracts(alive);
    };
    call();
    console.log("Alive contracts updated:", aliveContracts);
  }, [inputContracts]);

  return (
    <div className="w-full h-full">
      <textarea
        onChange={(e) => {
          setInputContracts(
            e.currentTarget.value.split(" ").filter((c) => c.length > 0)
          );
          console.log("Alive contracts to check:", inputContracts);
        }}
        placeholder="Parse contracts with space delimiter"
        className="border-2 rounded-lg p-1 w-full h-full min-h-[100px] resize-y"
      />
      <ul>
        {inputContracts.map((c) => (
          <li
            key={c}
            className={
              aliveContracts.includes(c) ? "text-green-500" : "text-red-500"
            }
          >
            {c} -{" "}
            {aliveContracts.includes(c)
              ? "IS CONTRACT"
              : "EOA or INVALID ADDRESS"}
          </li>
        ))}
      </ul>
    </div>
  );
}
