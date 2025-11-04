import { loadScript } from "./utils";

// Define Razorpay types
export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayPaymentResponse {
  success: boolean;
  payment?: Record<string, unknown>;
  error?: string;
}

// Define a type for Razorpay response handlers
export type RazorpayResponseHandler = (
  response: RazorpaySuccessResponse,
) => void;

// Get the server URL from environment or use default
// Use a relative URL instead of trying to construct an absolute one
const SERVER_URL = "/api/razorpay";

// New CRM Supabase endpoint for order creation
const CRM_ORDER_ENDPOINT =
  import.meta.env.VITE_CRM_ORDER_ENDPOINT ||
  "https://crm-supabase.7za6uc.easypanel.host/functions/v1/create-order-karigai";

// New CRM Supabase endpoint for payment verification
const CRM_VERIFY_ENDPOINT =
  import.meta.env.VITE_CRM_VERIFY_ENDPOINT ||
  "https://crm-supabase.7za6uc.easypanel.host/functions/v1/verify-payment-karigai";

// Get Razorpay Key ID from environment
export function getRazorpayKeyId(): string {
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
  console.log(
    "Using Razorpay Key ID:",
    keyId ? keyId.substring(0, 8) + "..." : "NOT FOUND",
  );

  if (!keyId) {
    console.error("VITE_RAZORPAY_KEY_ID not found in environment variables");
    throw new Error(
      "Razorpay key not configured. Please check your environment variables.",
    );
  }

  return keyId;
}

// Get Razorpay Key Secret from environment (for server-side operations)
export function getRazorpayKeySecret(): string {
  return import.meta.env.VITE_RAZORPAY_KEY_SECRET || "";
}

/**
 * Create a Razorpay order
 * @param amount Amount in INR (will be converted to paise)
 * @param currency Currency code (default: INR)
 * @param receipt Receipt ID (optional)
 * @param notes Additional notes (optional)
 * @returns Promise with the created order
 */
export async function createRazorpayOrder(
  amount: number,
  currency: string = "INR",
  receipt?: string,
  notes?: Record<string, string>,
): Promise<RazorpayOrder> {
  try {
    console.log(`Creating order with CRM endpoint: ${CRM_ORDER_ENDPOINT}`);

    // Log the Razorpay key being used
    const keyId = getRazorpayKeyId();
    const keyMode = keyId.startsWith("rzp_live_")
      ? "LIVE"
      : keyId.startsWith("rzp_test_")
        ? "TEST"
        : "UNKNOWN";
    console.log(
      `🔑 Using Razorpay Key Mode: ${keyMode} (${keyId.substring(0, 12)}...)`,
    );
    console.warn(
      `⚠️ CRITICAL: Backend MUST use the SAME ${keyMode} keys to create the order!`,
    );

    // CORRECT FLOW:
    // 1. Client receives amount in rupees (e.g., 1.00)
    // 2. Convert to paise by multiplying by 100 (e.g., 100 paise)
    // 3. Send to server which passes directly to Razorpay
    // 4. Razorpay displays correct amount (₹1.00)

    // TEMPORARY WORKAROUND: Backend is multiplying by 100, so we send in rupees
    // TODO: Fix backend to not multiply, then change this back to paise
    const amountToSend = amount; // Send in rupees, backend will convert to paise
    console.log(
      `⚠️ WORKAROUND: Sending ₹${amount} (rupees) to backend - backend will convert to paise`,
    );
    console.log(
      `Expected final amount in Razorpay: ${Math.round(amount * 100)} paise`,
    );

    // Log the exact payload we're sending to the CRM endpoint
    const payload = {
      amount: amountToSend, // Sending in rupees because backend multiplies by 100
      currency,
      receipt,
      notes: {
        ...notes,
        frontend_key_mode: keyMode, // Tell backend what mode we're using
        expected_key_prefix: keyId.substring(0, 8),
      },
    };

    console.log("Sending payload to CRM endpoint:", payload);

    // Use fetch with the CRM Supabase endpoint
    const response = await fetch(CRM_ORDER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CRM endpoint error response:", errorText);
      console.error("Response status:", response.status);
      console.error(
        "Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.error || `Failed to create order: ${response.status}`,
        );
      } catch (e) {
        throw new Error(
          `Failed to create order: ${response.status} - ${errorText.substring(0, 100)}`,
        );
      }
    }

    const orderData = await response.json();
    console.log("Order created successfully:", orderData);
    console.log("Order ID received:", orderData.id);
    console.log("Order amount:", orderData.amount, "paise");

    // Validate the response structure
    if (!orderData || !orderData.id) {
      console.error("Invalid order response structure:", orderData);
      throw new Error(
        "Invalid response from payment gateway - missing order ID",
      );
    }

    // Validate that the order ID has the correct Razorpay format
    if (
      typeof orderData.id !== "string" ||
      !orderData.id.startsWith("order_")
    ) {
      console.error("Invalid Razorpay order ID format:", orderData.id);
      console.error("Expected format: order_XXXXX, received:", orderData.id);
      throw new Error(`Invalid order ID format received: ${orderData.id}`);
    }

    // Validate amount matches (expecting backend multiplied by 100)
    const expectedAmount = Math.round(amount * 100);
    if (orderData.amount !== expectedAmount) {
      console.warn(
        `Amount mismatch: expected ${expectedAmount} paise, received ${orderData.amount} paise`,
      );
    }

    // CRITICAL: Verify the order was created with matching keys
    // Test if we can fetch this order with our current keys
    console.log("🔍 Verifying order exists with current keys...");
    try {
      const verifyResponse = await fetch(
        `https://api.razorpay.com/v1/orders/${orderData.id}`,
        {
          method: "GET",
          headers: {
            Authorization:
              "Basic " + btoa(`${keyId}:${getRazorpayKeySecret()}`),
          },
        },
      );

      if (!verifyResponse.ok) {
        console.error("❌ Order verification failed!");
        console.error("Status:", verifyResponse.status);
        const errorText = await verifyResponse.text();
        console.error("Response:", errorText);

        if (verifyResponse.status === 401 || verifyResponse.status === 404) {
          throw new Error(
            `Order ${orderData.id} was created with DIFFERENT keys than frontend is using. ` +
              `Frontend is using ${keyMode} mode. Backend might be using ${keyMode === "LIVE" ? "TEST" : "LIVE"} mode. ` +
              `Both MUST use the same mode (both LIVE or both TEST).`,
          );
        }
      } else {
        console.log("✅ Order verification successful - keys match!");
        const verifyData = await verifyResponse.json();
        console.log("Order exists in Razorpay:", verifyData);
      }
    } catch (verifyError) {
      console.error(
        "⚠️ Could not verify order (CORS or network issue):",
        verifyError,
      );
      // Continue anyway - verification might fail due to CORS but order might still be valid
    }

    return orderData;
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw error;
  }
}

/**
 * Load the Razorpay script
 * @returns Promise that resolves when the script is loaded
 */
export async function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      // Check if already loaded
      if (typeof window !== "undefined" && "Razorpay" in window) {
        console.log("Razorpay already available");
        resolve(true);
        return;
      }

      console.log("Loading Razorpay script...");
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.id = "razorpay-checkout";
      script.async = true;
      script.crossOrigin = "anonymous";

      const timeoutId = setTimeout(() => {
        console.error("Razorpay script loading timed out");
        reject(new Error("Razorpay script loading timed out"));
      }, 10000);

      script.onload = () => {
        console.log("Razorpay script loaded successfully");
        clearTimeout(timeoutId);
        resolve(true);
      };

      script.onerror = (error) => {
        console.error("Error loading Razorpay script:", error);
        clearTimeout(timeoutId);
        reject(new Error("Failed to load Razorpay script"));
      };

      document.body.appendChild(script);
    } catch (error) {
      console.error("Exception during script load:", error);
      reject(error);
    }
  });
}

/**
 * Open the Razorpay checkout modal
 * @param options Razorpay options
 * @returns Promise that resolves when payment is complete
 */
export function openRazorpayCheckout(
  options: RazorpayOptions,
): Promise<RazorpaySuccessResponse> {
  return new Promise((resolve, reject) => {
    try {
      // Check if Razorpay is available in the window
      if (typeof window === "undefined" || !("Razorpay" in window)) {
        console.error(
          "Razorpay is not loaded. Make sure to call loadRazorpayScript() first",
        );
        reject(
          new Error(
            "Razorpay SDK not loaded. Please try again or contact support.",
          ),
        );
        return;
      }

      // Ensure key is set
      if (!options.key) {
        options.key = getRazorpayKeyId();

        // Double-check that we have the key
        if (!options.key) {
          console.error(
            "Razorpay key is missing. Check VITE_RAZORPAY_KEY_ID environment variable",
          );
          reject(
            new Error("Payment configuration error. Please contact support."),
          );
          return;
        }
      }

      // Validate key mode matches
      const keyMode = options.key.startsWith("rzp_live_")
        ? "LIVE"
        : options.key.startsWith("rzp_test_")
          ? "TEST"
          : "UNKNOWN";
      console.log(
        `🔑 Opening checkout with ${keyMode} key: ${options.key.substring(0, 12)}...`,
      );

      // Validate order_id format and log it clearly
      if (!options.order_id) {
        console.error("❌ Missing order_id in checkout options!");
        reject(new Error("Missing order ID for payment"));
        return;
      }

      if (!options.order_id.startsWith("order_")) {
        console.error(`❌ Invalid order_id format: ${options.order_id}`);
        console.error("Expected format: order_XXXXX");
        reject(new Error(`Invalid order ID format: ${options.order_id}`));
        return;
      }

      console.log(`📋 Using order_id: ${options.order_id}`);
      console.warn(
        `⚠️ This order MUST have been created with ${keyMode} keys!`,
      );
      console.warn(
        `If you get "id provided does not exist" error, the order was created with ${keyMode === "LIVE" ? "TEST" : "LIVE"} keys.`,
      );

      console.log("Opening Razorpay checkout with options:", {
        ...options,
        key: options.key.substring(0, 12) + "...", // Log partial key for security
      });

      // Store the original handler to call it later
      const originalHandler = options.handler;

      // Create checkout object with enhanced error handling
      let razorpay;
      try {
        // Define a type for the Razorpay constructor
        interface RazorpayStatic {
          (options: Record<string, unknown>): {
            on: (event: string, callback: (response: unknown) => void) => void;
            open: () => void;
          };
        }

        // Use a properly typed assertion
        const RazorpayConstructor = (
          window as unknown as { Razorpay: RazorpayStatic }
        ).Razorpay;
        if (!RazorpayConstructor) {
          throw new Error("Razorpay constructor not found");
        }

        // Create properly typed options object for Razorpay
        const handlerOptions = {
          ...options,
          handler: function (response: RazorpaySuccessResponse) {
            console.log("Payment successful, response:", response);

            // Call the original handler if it exists
            if (typeof originalHandler === "function") {
              originalHandler(response);
            }

            // Resolve the promise
            resolve(response);
          },
        };

        razorpay = new RazorpayConstructor(handlerOptions);
      } catch (initError) {
        console.error("Failed to initialize Razorpay:", initError);
        reject(new Error("Payment initialization failed. Please try again."));
        return;
      }

      // Register all event handlers
      // Type for Razorpay error response
      interface RazorpayErrorResponse {
        error: {
          code: string;
          description: string;
          source: string;
          step: string;
          reason: string;
        };
      }

      razorpay.on("payment.failed", function (response: RazorpayErrorResponse) {
        console.error("Payment failed:", response.error);
        reject(new Error(response.error?.description || "Payment failed"));
      });

      // Additional error handlers
      razorpay.on("modal.closed", function () {
        console.log("Razorpay modal closed by user");
        reject(new Error("Payment cancelled by user"));
      });

      // Open the checkout
      try {
        razorpay.open();
        console.log("Razorpay checkout opened successfully");
      } catch (openError) {
        console.error("Failed to open Razorpay checkout:", openError);
        reject(new Error("Failed to open payment page. Please try again."));
      }
    } catch (error) {
      console.error("Error in Razorpay checkout process:", error);
      reject(
        error instanceof Error ? error : new Error("An unknown error occurred"),
      );
    }
  });
}

/**
 * Verify a Razorpay payment
 * @param paymentId Razorpay payment ID
 * @param orderId Razorpay order ID
 * @param signature Razorpay signature
 * @returns Promise with the verification result
 */
export async function verifyRazorpayPayment(
  paymentId: string,
  orderId: string,
  signature: string,
): Promise<RazorpayPaymentResponse> {
  try {
    console.log(`Verifying payment with CRM endpoint: ${CRM_VERIFY_ENDPOINT}`);

    const response = await fetch(CRM_VERIFY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
      }),
    });

    console.log("Verification response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Verification server response:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.error || `Payment verification failed: ${response.status}`,
        );
      } catch (e) {
        throw new Error(
          `Payment verification failed: ${response.status} - ${errorText.substring(0, 100)}`,
        );
      }
    }

    const responseData = await response.json();
    console.log("Verification result:", responseData);

    return {
      success: responseData.verified === true,
      payment: responseData.payment,
      error: responseData.error || null,
    };
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Payment verification failed",
    };
  }
}

/**
 * Capture a Razorpay payment
 * @param paymentId Razorpay payment ID
 * @param amount Amount to capture (optional)
 * @returns Promise with the capture result
 */
export async function captureRazorpayPayment(
  paymentId: string,
  amount?: number,
): Promise<RazorpayPaymentResponse> {
  try {
    console.log(`Attempting to capture Razorpay payment: ${paymentId}`);

    // Use the main verification endpoint and specify action as 'capture'
    // This fixes the 405 Method Not Allowed error
    const response = await fetch(CRM_VERIFY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_id: paymentId,
        razorpay_payment_id: paymentId, // Include both formats to be safe
        action: "capture",
        amount, // Include amount if provided
        timestamp: new Date().toISOString(),
      }),
    });

    console.log(`Payment capture response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Capture error response:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        return {
          success: false,
          error:
            errorData.error || `Payment capture failed: ${response.status}`,
        };
      } catch (e) {
        return {
          success: false,
          error: `Payment capture failed: ${response.status} - ${errorText.substring(0, 100)}`,
        };
      }
    }

    const responseData = await response.json();
    console.log("Payment capture success response:", responseData);

    return {
      success: true,
      payment: responseData,
    };
  } catch (error) {
    console.error("Error capturing Razorpay payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment capture failed",
    };
  }
}

/**
 * Refund a Razorpay payment
 * @param paymentId Razorpay payment ID
 * @param amount Amount to refund (optional, full refund if not specified)
 * @returns Promise with the refund result
 */
export async function refundRazorpayPayment(
  paymentId: string,
  amount?: number,
): Promise<any> {
  try {
    const response = await fetch(`${SERVER_URL}/refund-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_id: paymentId,
        amount,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Payment refund failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Error refunding Razorpay payment:", error);
    throw error;
  }
}
