import { Suspense } from "react";
import PaymentResultClient from "./PaymentResultClient";

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div>Dang tai ket qua thanh toan...</div>}>
      <PaymentResultClient />
    </Suspense>
  );
}
