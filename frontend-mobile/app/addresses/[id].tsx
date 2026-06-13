import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { Button } from "@/src/components/ui/Button";
import { FormTextField } from "@/src/components/ui/FormTextField";
import { useAddresses } from "@/src/hooks/useAddresses";
import {
  addressSchema,
  emptyAddress,
  type AddressFormValues,
} from "@/src/lib/address-schemas";
import type { Address } from "@/src/lib/addresses-api";
import { useColors } from "@/src/lib/colors";

/** Address → form values: the API's nullable fields become empty strings. */
function toForm(a: Address): AddressFormValues {
  return {
    name: a.name,
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state,
    postal: a.postal,
    country: a.country,
    phone: a.phone ?? "",
  };
}

export default function AddressFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const colors = useColors();
  const { addresses, isLoading, create, update, makeDefault } = useAddresses();

  const existing = isNew
    ? undefined
    : addresses.find((a) => String(a.id) === id);
  const alreadyDefault = Boolean(existing?.isDefault);

  const { control, handleSubmit, reset } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: existing ? toForm(existing) : emptyAddress,
  });

  // The "set as default" toggle: pre-checked for a user's very first address so
  // the common case needs no thought; off when adding to an existing set or
  // editing. Hidden entirely when the address is already the default.
  const [defaultOn, setDefaultOn] = useState(
    isNew && addresses.length === 0
  );

  // Prefill once the cached list resolves the address being edited (navigation
  // from the list usually has it immediately; reset keeps us correct if it
  // arrives a tick later).
  useEffect(() => {
    if (existing) reset(toForm(existing));
  }, [existing, reset]);

  const onSubmit = async (values: AddressFormValues) => {
    try {
      if (isNew) {
        await create.mutateAsync({ values, makeDefault: defaultOn });
      } else if (existing) {
        await update.mutateAsync({ id: existing.id, values });
        // Promoting to default is also reachable from the edit form, not just
        // the list — only when it isn't already the default.
        if (defaultOn && !existing.isDefault) {
          await makeDefault.mutateAsync(existing.id);
        }
      }
      router.back();
    } catch {
      Alert.alert(
        "Couldn't save address",
        "Something went wrong. Please try again."
      );
    }
  };

  const title = isNew ? "Add address" : "Edit address";
  const saving =
    create.isPending || update.isPending || makeDefault.isPending;

  // Editing an id that isn't in the list (e.g. just deleted, or cache cleared).
  if (!isNew && !existing) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View className="flex-1 items-center justify-center bg-background p-8">
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-center text-muted">
              This address is no longer available.
            </Text>
          )}
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
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

          {alreadyDefault ? (
            <Text className="text-sm text-muted">
              This is your default address.
            </Text>
          ) : (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">
                Set as default address
              </Text>
              <Switch
                value={defaultOn}
                onValueChange={setDefaultOn}
                trackColor={{ true: colors.primary }}
              />
            </View>
          )}

          <Button
            label={isNew ? "Save address" : "Save changes"}
            onPress={handleSubmit(onSubmit)}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
