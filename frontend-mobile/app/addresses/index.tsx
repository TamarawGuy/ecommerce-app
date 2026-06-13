import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Button } from "@/src/components/ui/Button";
import { useAddresses } from "@/src/hooks/useAddresses";
import type { Address } from "@/src/lib/addresses-api";
import { useColors } from "@/src/lib/colors";

export default function AddressesScreen() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { addresses, isLoading, isError, refetch, makeDefault, remove } =
    useAddresses();

  // Addresses are an account feature; a signed-out user shouldn't reach here,
  // but guard rather than render an empty list against no user.
  if (!isSignedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-8">
        <Text className="text-center text-muted">
          Sign in to manage your saved addresses.
        </Text>
      </View>
    );
  }

  const confirmDelete = (address: Address) => {
    Alert.alert(
      "Delete address",
      `Remove "${address.name}"? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => remove.mutate(address.id),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator />
          </View>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : addresses.length === 0 ? (
          <EmptyState />
        ) : (
          <View className="gap-4">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                busy={makeDefault.isPending || remove.isPending}
                onEdit={() => router.push(`/addresses/${address.id}`)}
                onSetDefault={() => makeDefault.mutate(address.id)}
                onDelete={() => confirmDelete(address)}
              />
            ))}
          </View>
        )}

        <View className="mt-6">
          <Button
            label="Add address"
            icon="add-outline"
            onPress={() => router.push("/addresses/new")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function AddressCard({
  address,
  busy,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  address: Address;
  busy: boolean;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const lines = [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postal}`,
    address.country,
    address.phone,
  ].filter((l): l is string => Boolean(l && l.trim()));

  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {address.name}
        </Text>
        {address.isDefault ? (
          <View className="rounded-full bg-primary px-2.5 py-1">
            <Text className="text-xs font-semibold text-primary-foreground">
              Default
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-2 gap-0.5">
        {lines.map((line, i) => (
          <Text key={i} className="text-sm text-muted">
            {line}
          </Text>
        ))}
      </View>

      <View className="mt-4 flex-row items-center gap-5">
        <CardAction icon="create-outline" label="Edit" onPress={onEdit} />
        {!address.isDefault ? (
          <CardAction
            icon="star-outline"
            label="Set default"
            onPress={onSetDefault}
            disabled={busy}
          />
        ) : null}
        <CardAction
          icon="trash-outline"
          label="Delete"
          onPress={onDelete}
          disabled={busy}
          color={colors.danger}
        />
      </View>
    </View>
  );
}

function CardAction({
  icon,
  label,
  onPress,
  disabled,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  const colors = useColors();
  const tint = color ?? colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      className={`flex-row items-center gap-1.5 active:opacity-60 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <Ionicons name={icon} size={16} color={tint} />
      <Text className="text-sm font-medium" style={{ color: tint }}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState() {
  const colors = useColors();
  return (
    <View className="items-center rounded-2xl border border-border bg-card p-8">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-background">
        <Ionicons name="location-outline" size={28} color={colors.muted} />
      </View>
      <Text className="mt-4 text-lg font-semibold text-foreground">
        No saved addresses
      </Text>
      <Text className="mt-1 text-center text-sm text-muted">
        Add an address to speed up checkout next time.
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="items-center rounded-2xl border border-border bg-card p-8">
      <Text className="text-base font-semibold text-foreground">
        Couldn&apos;t load your addresses
      </Text>
      <Text className="mt-1 text-center text-sm text-muted">
        Check your connection and try again.
      </Text>
      <View className="mt-4">
        <Button label="Retry" variant="secondary" onPress={onRetry} />
      </View>
    </View>
  );
}
