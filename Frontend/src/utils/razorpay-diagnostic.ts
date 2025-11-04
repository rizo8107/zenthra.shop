/**
 * Razorpay Diagnostic Utility
 * Use this to test and debug Razorpay order creation
 */

interface DiagnosticResult {
  success: boolean;
  step: string;
  message: string;
  data?: any;
  error?: any;
}

export async function runRazorpayDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Step 1: Check environment variables
  console.log("=== RAZORPAY DIAGNOSTICS START ===");

  try {
    const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
    const crmOrderEndpoint = import.meta.env.VITE_CRM_ORDER_ENDPOINT;

    results.push({
      success: !!razorpayKeyId,
      step: "Environment Check",
      message: razorpayKeyId
        ? `Razorpay Key ID found: ${razorpayKeyId.substring(0, 8)}...`
        : "Razorpay Key ID NOT FOUND",
      data: {
        keyId: razorpayKeyId ? `${razorpayKeyId.substring(0, 8)}...` : null,
        keyType: razorpayKeyId?.startsWith('rzp_live_') ? 'LIVE' : razorpayKeyId?.startsWith('rzp_test_') ? 'TEST' : 'UNKNOWN',
        crmEndpoint: crmOrderEndpoint || 'Using default',
      }
    });
  } catch (error) {
    results.push({
      success: false,
      step: "Environment Check",
      message: "Failed to check environment variables",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Step 2: Test CRM Endpoint connectivity
  try {
    const crmOrderEndpoint = import.meta.env.VITE_CRM_ORDER_ENDPOINT ||
      'https://crm-supabase.7za6uc.easypanel.host/functions/v1/create-order-karigai';

    console.log("Testing CRM endpoint:", crmOrderEndpoint);

    const testPayload = {
      amount: 100, // 1 rupee in paise
      currency: 'INR',
      receipt: 'diagnostic_test_' + Date.now(),
      notes: {
        diagnostic: 'true',
        test_time: new Date().toISOString()
      }
    };

    console.log("Sending test payload:", testPayload);

    const response = await fetch(crmOrderEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    console.log("Raw response:", responseText);

    if (!response.ok) {
      results.push({
        success: false,
        step: "CRM Endpoint Test",
        message: `CRM endpoint returned error: ${response.status}`,
        data: {
          status: response.status,
          statusText: response.statusText,
          response: responseText.substring(0, 200)
        },
        error: responseText
      });
    } else {
      let orderData;
      try {
        orderData = JSON.parse(responseText);
      } catch (e) {
        results.push({
          success: false,
          step: "CRM Endpoint Test",
          message: "Response is not valid JSON",
          data: { response: responseText.substring(0, 200) },
          error: "Invalid JSON response"
        });
        return results;
      }

      console.log("Parsed order data:", orderData);

      // Validate order response
      const hasOrderId = !!orderData.id;
      const isValidFormat = orderData.id?.startsWith('order_');
      const hasAmount = typeof orderData.amount === 'number';

      results.push({
        success: hasOrderId && isValidFormat && hasAmount,
        step: "CRM Endpoint Test",
        message: hasOrderId && isValidFormat
          ? `✅ Valid Razorpay order created: ${orderData.id}`
          : "❌ Invalid order response structure",
        data: {
          orderId: orderData.id,
          isValidFormat,
          amount: orderData.amount,
          currency: orderData.currency,
          status: orderData.status,
          fullResponse: orderData
        }
      });

      // Additional validation checks
      if (!hasOrderId) {
        results.push({
          success: false,
          step: "Order ID Validation",
          message: "❌ Order ID is missing from response",
          data: { response: orderData }
        });
      }

      if (orderData.id && !isValidFormat) {
        results.push({
          success: false,
          step: "Order ID Format",
          message: `❌ Order ID has wrong format. Expected: 'order_XXXXX', Got: '${orderData.id}'`,
          data: { orderId: orderData.id }
        });
      }

      if (orderData.amount !== testPayload.amount) {
        results.push({
          success: false,
          step: "Amount Validation",
          message: `⚠️ Amount mismatch. Sent: ${testPayload.amount} paise, Received: ${orderData.amount} paise`,
          data: {
            sent: testPayload.amount,
            received: orderData.amount
          }
        });
      }
    }
  } catch (error) {
    console.error("CRM endpoint test error:", error);
    results.push({
      success: false,
      step: "CRM Endpoint Test",
      message: "Failed to connect to CRM endpoint",
      error: error instanceof Error ? error.message : String(error),
      data: {
        errorType: error instanceof TypeError ? 'Network Error' : 'Unknown Error'
      }
    });
  }

  // Step 3: Check if Razorpay SDK is loaded
  try {
    const isRazorpayLoaded = typeof window !== 'undefined' && 'Razorpay' in window;
    results.push({
      success: isRazorpayLoaded,
      step: "Razorpay SDK Check",
      message: isRazorpayLoaded
        ? "✅ Razorpay SDK is loaded"
        : "❌ Razorpay SDK not loaded",
      data: {
        loaded: isRazorpayLoaded,
        windowKeys: typeof window !== 'undefined' ? Object.keys(window).filter(k => k.toLowerCase().includes('razor')) : []
      }
    });
  } catch (error) {
    results.push({
      success: false,
      step: "Razorpay SDK Check",
      message: "Failed to check Razorpay SDK",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  console.log("=== DIAGNOSTICS RESULTS ===");
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.step}: ${result.success ? '✅' : '❌'}`);
    console.log(`   ${result.message}`);
    if (result.data) {
      console.log("   Data:", result.data);
    }
    if (result.error) {
      console.log("   Error:", result.error);
    }
  });
  console.log("\n=== DIAGNOSTICS END ===\n");

  return results;
}

// Function to display results in a user-friendly format
export function displayDiagnostics(results: DiagnosticResult[]): string {
  let output = "🔍 RAZORPAY DIAGNOSTIC REPORT\n";
  output += "═══════════════════════════════\n\n";

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach((result, index) => {
    output += `${index + 1}. ${result.step}\n`;
    output += `   Status: ${result.success ? '✅ PASS' : '❌ FAIL'}\n`;
    output += `   ${result.message}\n`;
    if (result.error) {
      output += `   Error: ${result.error}\n`;
    }
    output += "\n";
  });

  output += "═══════════════════════════════\n";
  output += `Summary: ${passed} passed, ${failed} failed\n`;

  if (failed > 0) {
    output += "\n⚠️ RECOMMENDED ACTIONS:\n";
    results.filter(r => !r.success).forEach(result => {
      output += `• Fix: ${result.step}\n`;
    });
  }

  return output;
}

// Quick test function to call from console
(window as any).testRazorpay = async () => {
  console.log("Running Razorpay diagnostics...");
  const results = await runRazorpayDiagnostics();
  console.log(displayDiagnostics(results));
  return results;
};

console.log("💡 Razorpay diagnostic loaded. Run 'testRazorpay()' in console to test.");
