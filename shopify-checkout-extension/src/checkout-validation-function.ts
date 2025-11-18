/**
 * Shopify Checkout Validation Function
 * Blocks checkout when customer selects "INQUIRY" shipping method
 * Shows message that inquiry has been placed
 * 
 * This function validates the checkout before customer proceeds to payment
 */

import {
  FunctionRunResult,
} from "@shopify/functions";

type Input = {
  cart: {
    deliveryGroups: Array<{
      deliveryOptions: Array<{
        title?: string;
        code?: string;
        handle?: string;
      }>;
    }>;
  };
};

/**
 * This function runs when customer tries to proceed to payment
 * It checks if they selected the INQUIRY shipping method
 * If yes, it blocks checkout and shows a message
 */
export default async function run(
  input: Input
): Promise<FunctionRunResult> {
  // Get the selected shipping method from the first delivery group
  const deliveryGroup = input.cart?.deliveryGroups?.[0];
  const selectedShipping = deliveryGroup?.deliveryOptions?.[0];
  
  if (!selectedShipping) {
    // No shipping method selected, allow checkout (Shopify will handle this)
    return { errors: [] };
  }
  
  // Check if the shipping method is INQUIRY
  const isInquiryMethod = 
    selectedShipping.title?.includes('Inquiry Required') ||
    selectedShipping.title?.includes('Inquiry') ||
    selectedShipping.code === 'INQUIRY' ||
    selectedShipping.handle === 'INQUIRY';

  // If INQUIRY method is selected, block checkout
  if (isInquiryMethod) {
    return {
      errors: [
        {
          message: "Your inquiry has been placed. Our store will contact you to finalize shipping. If delivery is possible, you will receive your order.",
          target: "$.cart.deliveryGroups[0].deliveryOptions[0]"
        }
      ]
    };
  }

  // If not INQUIRY, allow checkout to proceed
  return {
    errors: []
  };
}

