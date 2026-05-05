import { getSrxPaymentMethods } from "@/lib/srx-website";

import { PaymentMethodsManager } from "./_components/payment-methods-manager";

export default async function Page() {
  const paymentMethods = await getSrxPaymentMethods();

  return <PaymentMethodsManager initialPaymentMethods={paymentMethods} />;
}
