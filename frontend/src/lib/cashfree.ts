const CASHFREE_SCRIPT_SRC = "https://sdk.cashfree.com/js/v3/cashfree.js";

type CashfreeCheckoutResult = {
  error?: {
    message?: string;
  };
};

type CashfreeInstance = {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget: "_self" | "_blank" | "_modal";
  }) => Promise<CashfreeCheckoutResult> | CashfreeCheckoutResult;
};

type CashfreeFactory = (options: { mode: "sandbox" | "production" }) => CashfreeInstance;

declare global {
  interface Window {
    Cashfree?: CashfreeFactory;
  }
}

let cashfreeLoader: Promise<CashfreeFactory> | null = null;

async function loadCashfreeFactory(): Promise<CashfreeFactory> {
  if (window.Cashfree) {
    return window.Cashfree;
  }

  if (!cashfreeLoader) {
    cashfreeLoader = new Promise<CashfreeFactory>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${CASHFREE_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => {
          if (window.Cashfree) {
            resolve(window.Cashfree);
            return;
          }
          reject(new Error("Cashfree SDK loaded without exposing the checkout client."));
        });
        existing.addEventListener("error", () => reject(new Error("Unable to load Cashfree right now.")));
        return;
      }

      const script = document.createElement("script");
      script.src = CASHFREE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => {
        if (window.Cashfree) {
          resolve(window.Cashfree);
          return;
        }
        reject(new Error("Cashfree SDK loaded without exposing the checkout client."));
      };
      script.onerror = () => reject(new Error("Unable to load Cashfree right now."));
      document.head.appendChild(script);
    });
  }

  return cashfreeLoader;
}

export async function openCashfreeCheckout(paymentSessionId: string, environment: string) {
  const factory = await loadCashfreeFactory();
  const cashfree = factory({
    mode: environment.toLowerCase() === "production" ? "production" : "sandbox"
  });
  const result = await cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_self"
  });

  if (result?.error?.message) {
    throw new Error(result.error.message);
  }
}
