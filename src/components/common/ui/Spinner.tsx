import { Loader2 } from "lucide-react";

export default function Spinner({ size = 14 }: { size?: number }) {
  return (
    <Loader2
      aria-hidden="true"
      width={size}
      height={size}
      className="spinner"
    />
  );
}