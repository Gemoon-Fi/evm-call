import { useState } from "react";
import { parseEther } from "viem";
export default function ParsedResult({ result }: { result: unknown | bigint }) {
  const [showInWei, setShowInWei] = useState(false);
  const [unit, setUnit] = useState<"wei" | "eth">("wei");

  if (typeof result === "bigint") {
    const valueWhenConverted =
      unit === "wei"
        ? `${parseEther(result.toString(), "wei").toString()} WEI`
        : `${result.toString()} ETH`;
    const toggleLabel = unit === "wei" ? "to ETH" : "to WEI";

    return (
      <div className="flex flex-col gap-2">
        <span className="flex flex-row justify-start items-center gap-2">
          <span>{showInWei ? valueWhenConverted : result.toString()}</span>
          {showInWei && (
            <button
              className="ml-2 p-1 border-2 rounded-lg bg-blue-400 text-white border-white"
              onClick={() => {
                setUnit((prev) => (prev === "wei" ? "eth" : "wei"));
              }}
            >
              {toggleLabel}
            </button>
          )}
        </span>
        <span className="flex flex-row items-center gap-1">
          <input
            type="checkbox"
            checked={showInWei}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              setShowInWei(checked);
              if (!checked) {
                setUnit("wei");
              }
            }}
          />
          <label>Show in WEI</label>
        </span>
      </div>
    );
  } else if (typeof result === "object") {
    return (
      <pre className="whitespace-pre-wrap wrap-break-word">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  } else if (typeof result === "boolean") {
    console.log("Boolean result:", result);
    return (
      <span className="text-white text-center">
        {result ? (
          <pre className="p-2 rounded-lg max-w-[8%] bg-green-400">TRUE</pre>
        ) : (
          <pre className="p-2 rounded-lg max-w-[8%] bg-red-400">FALSE</pre>
        )}
      </span>
    );
  } else {
    return <span>{String(result)}</span>;
  }
}
