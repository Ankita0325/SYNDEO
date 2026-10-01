import { ThinkingOrb } from "./thinking-orbs";

// Agent listening — the 20px inline pill, exactly as on the original site.
export default function ThinkingOrbListeningDemo() {
  return (
    <div className="flex min-h-[360px] w-full items-center justify-center bg-[#070707] p-8">
      <div
        className="inline-flex h-9 items-center gap-2 rounded-full pl-2 pr-3.5"
        style={{
          background: "rgba(29,29,29,0.42)",
          boxShadow:
            "inset 0 0 0 1px rgba(44,47,54,0.31), inset 0 0 50px 0 rgba(255,255,255,0.012)",
        }}
      >
        <ThinkingOrb state="listening" size={20} theme="dark" />
        <span
          className="whitespace-nowrap text-xs leading-[14px]"
          style={{ color: "rgba(251,251,251,0.5)" }}
        >
          Agent listening…
        </span>
      </div>
    </div>
  );
}
