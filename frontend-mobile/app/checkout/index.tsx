import { useAuth, useUser } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStripe } from "@stripe/stripe-react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Button } from "@/src/components/ui/Button";
import { FormTextField } from "@/src/components/ui/FormTextField";
import { useCart } from "@/src/context/CartContext";
import { useAddresses } from "@/src/hooks/useAddresses";
import { useCheckout } from "@/src/hooks/useCheckout";
import {
  checkoutSchema,
  emptyCheckout,
  type CheckoutFormValues,
} from "@/src/lib/checkout-schema";
import { formatPrice } from "@/src/lib/format";

/**
 * Checkout — address + email, then the Stripe PaymentSheet. Guests fill
 * everything; signed-in users get their default saved address and account email
 * prefilled (auth is never a gate). The server is the source of truth for price:
 * we send only `{ variantId, qty }`, it recomputes the total and opens a
 * PaymentIntent, and the `payment_intent.succeeded` webhook fulfills the order.
 */
export default function CheckoutScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { items, totalCents, hydrated, count } = useCart();
  const { addresses } = useAddresses();
  const checkout = useCheckout();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const { control, handleSubmit, reset } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: emptyCheckout,
  });

  // Prefill once, when the signed-in user's email and default address resolve.
  // `useAddresses` returns the default first, so `addresses[0]` is it; guests
  // get an empty list and no user, so the form stays blank.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    const addr = addresses[0];
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    if (!addr && !email) return;
    prefilled.current = true;
    reset({
      name: addr?.name ?? "",
      line1: addr?.line1 ?? "",
      line2: addr?.line2 ?? "",
      city: addr?.city ?? "",
      state: addr?.state ?? "",
      postal: addr?.postal ?? "",
      country: addr?.country ?? "",
      phone: addr?.phone ?? "",
      email,
    });
  }, [addresses, user, reset]);

  // Guard against landing here with nothing to buy (e.g. cart cleared in another
  // screen). Wait for hydration so we don't bounce before the saved cart loads.
  if (hydrated && items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-8">
        <Text className="text-center text-base text-muted">
          Your cart is empty.
        </Text>
        <View className="mt-4">
          <Button label="Back to cart" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const onPay = handleSubmit(async (values) => {
    const lineItems = items.map((i) => ({ variantId: i.variantId, qty: i.qty }));
    try {
      const { clientSecret } = await checkout.mutateAsync({
        items: lineItems,
        form: values,
      });

      const init = await initPaymentSheet({
        merchantDisplayName: "Vibe Commerce",
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { email: values.email, name: values.name },
      });
      if (init.error) {
        Alert.alert("Payment error", init.error.message);
        return;
      }

      const { error } = await presentPaymentSheet();
      if (error) {
        // The shopper dismissing the sheet isn't an error worth surfacing.
        if (error.code !== "Canceled") {
          Alert.alert("Payment failed", error.message);
        }
        return;
      }

      // Charge succeeded on the client; the webhook reconciles stock + marks the
      // order paid. Replace so back doesn't return to a paid checkout.
      router.replace("/checkout/success");
    } catch {
      Alert.alert(
        "Checkout error",
        "We couldn't start checkout. Please try again."
      );
    }
  });

  const busy = checkout.isPending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-sm font-semibold uppercase tracking-wide text-muted">
          Contact
        </Text>
        <FormTextField
          control={control}
          name="email"
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <Text className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Shipping address
        </Text>
        <FormTextField
          control={control}
          name="name"
          label="Full name"
          placeholder="Jane Doe"
          autoComplete="name"
          textContentType="name"
        />
        <FormTextField
          control={control}
          name="line1"
          label="Address line 1"
          placeholder="123 Main St"
          autoComplete="address-line1"
          textContentType="streetAddressLine1"
        />
        <FormTextField
          control={control}
          name="line2"
          label="Address line 2 (optional)"
          placeholder="Apt, suite, unit"
          autoComplete="address-line2"
          textContentType="streetAddressLine2"
        />
        <FormTextField
          control={control}
          name="city"
          label="City"
          placeholder="New York"
          textContentType="addressCity"
        />
        <FormTextField
          control={control}
          name="state"
          label="State / region"
          placeholder="NY"
          textContentType="addressState"
        />
        <FormTextField
          control={control}
          name="postal"
          label="Postal code"
          placeholder="10001"
          autoComplete="postal-code"
          textContentType="postalCode"
        />
        <FormTextField
          control={control}
          name="country"
          label="Country"
          placeholder="United States"
          autoComplete="country"
          textContentType="countryName"
        />
        <FormTextField
          control={control}
          name="phone"
          label="Phone (optional)"
          placeholder="+1 555 123 4567"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-base text-muted">
            Total ({count} {count === 1 ? "item" : "items"})
          </Text>
          <Text className="text-2xl font-bold text-foreground">
            {formatPrice(totalCents)}
          </Text>
        </View>

        <Button
          label={`Pay ${formatPrice(totalCents)}`}
          icon="lock-closed"
          onPress={onPay}
          loading={busy}
        />
        <Text className="text-center text-xs text-muted">
          {isSignedIn
            ? "Paying securely with Stripe."
            : "Checking out as a guest — paying securely with Stripe."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
