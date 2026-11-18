import { SymmetricWave } from "@/components/ui/symmetric-wave";

type LoadingMaskProps = {
  loading: boolean;
  layout?: boolean;
  label?: string;
};

const LoadingMask = ({ loading, layout = false, label = "Loading your workspace" }: LoadingMaskProps) => {
  if (!loading) return null;
  return (
    <div className={`loading-overlay${layout ? " loading-overlay-layout" : ""}`}>
      <div className="loading-card">
        <SymmetricWave className="loading-wave" aria-label={label} aria-live="polite" />
        <p className="loading-status-line" aria-hidden="true">{label}</p>
      </div>
    </div>
  );
};

export default LoadingMask;
