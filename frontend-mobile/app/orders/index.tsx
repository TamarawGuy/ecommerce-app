import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Button } from "@/src/components/ui/Button";
import { useOrders } from "@/src/hooks/useOrders";
import { useColors } from "@/src/lib/colors";
import { formatPrice } from "@/src/lib/format";
import { sizedImage } from "@/src/lib/images";
import type { Order, OrderLine, OrderStatus } from "@/src/lib/orders-api";

export default function OrdersScreen() {
  const { isSignedIn } = useAuth();
  const { orders, isLoading, isError, refetch } = useOrders();

  // Order history is an account feature; a signed-out user shouldn't reach here,
  // but guard rather than render an empty list against no user.
  if (!isSignedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-8">
        <Text className="text-center text-muted">
          Sign in to see your order history.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator />
          </View>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : orders.length === 0 ? (
          <EmptyState />
        ) : (
          <View className="gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** A human-readable variant label, e.g. "M · Black". Empty for one-size items. */
function variantLabel(line: OrderLine): string {
  return [line.size, line.colorName].filter(Boolean).join(" · ");
}

/** Formats an ISO timestamp as a short date, e.g. "Jun 14, 2026". */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function OrderCard({ order }: { order: Order }) {
  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-base font-semibold text-foreground">
            Order #{order.id}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">
            {formatDate(order.createdAt)}
          </Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <View className="my-3 h-px bg-border" />

      <View className="gap-3">
        {order.items.map((line) => (
          <LineRow key={line.variantId} line={line} />
        ))}
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
        <Text className="text-sm text-muted">Total</Text>
        <Text className="text-base font-semibold text-foreground">
          {formatPrice(order.totalCents)}
        </Text>
      </View>
    </View>
  );
}

function LineRow({ line }: { line: OrderLine }) {
  const label = variantLabel(line);
  const uri = sizedImage(line.imageUrl, 120);

  return (
    <View className="flex-row items-center gap-3">
      <View className="h-14 w-14 overflow-hidden rounded-lg bg-background">
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : null}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
          {line.name}
        </Text>
        {label ? (
          <Text className="mt-0.5 text-xs text-muted">{label}</Text>
        ) : null}
      </View>
      <Text className="text-sm text-muted">
        {line.qty} × {formatPrice(line.unitPriceCents)}
      </Text>
    </View>
  );
}

/** Maps an order status to a label + tone. `pending` reads as neutral/muted. */
function StatusBadge({ status }: { status: OrderStatus }) {
  const colors = useColors();
  const map: Record<OrderStatus, { label: string; color: string }> = {
    paid: { label: "Paid", color: colors.success },
    pending: { label: "Pending", color: colors.muted },
    cancelled: { label: "Cancelled", color: colors.danger },
  };
  const { label, color } = map[status];

  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{ backgroundColor: `${color}1a` }}
    >
      <Text className="text-xs font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

function EmptyState() {
  const colors = useColors();
  return (
    <View className="items-center rounded-2xl border border-border bg-card p-8">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-background">
        <Ionicons name="receipt-outline" size={28} color={colors.muted} />
      </View>
      <Text className="mt-4 text-lg font-semibold text-foreground">
        No orders yet
      </Text>
      <Text className="mt-1 text-center text-sm text-muted">
        When you place an order, it&apos;ll show up here. Orders you placed as a
        guest with this email appear automatically.
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="items-center rounded-2xl border border-border bg-card p-8">
      <Text className="text-base font-semibold text-foreground">
        Couldn&apos;t load your orders
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
