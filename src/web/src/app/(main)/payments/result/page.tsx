import { Suspense } from "react";
import PaymentResultClient from "./PaymentResultClient";

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div>Đang tải kết quả thanh toán...</div>}>
      <PaymentResultClient />
    </Suspense>
  );
}
