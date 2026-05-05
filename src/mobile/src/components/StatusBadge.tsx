import { Badge } from "./ui";
import { FeeType, WorkshopStatus } from "../models/types";

export function WorkshopStatusBadge({ status }: { status: WorkshopStatus }) {
  const tone =
    status === "CANCELLED" ? "danger" : status === "DRAFT" ? "warning" : "success";

  return <Badge label={status} tone={tone} />;
}

export function FeeBadge({ feeType }: { feeType: FeeType }) {
  return (
    <Badge
      label={feeType === "PAID" ? "Paid" : "Free"}
      tone={feeType === "PAID" ? "warning" : "success"}
    />
  );
}
