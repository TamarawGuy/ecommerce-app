import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui/Button";
import { useCart } from "@/src/context/CartContext";

/**
 * Order-success — the terminal step of checkout. Lottie is reserved for select
 * moments and this is one of them: a one-shot celebration when a payment goes
 * through. The cart is cleared here (the purchase is done) and the only way out
 * is back into browsing — checkout is a dead end once paid.
 */
export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const { clear } = useCart();

  // Empty the cart once the order is placed. Runs once on mount.
  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-10">
        <LottieView
          source={require("../../src/lottie/order/order-success.json")}
          autoPlay
          loop={false}
          style={{ width: 200, height: 200 }}
        />
        <Text className="mt-2 text-2xl font-bold text-foreground">
          Order placed!
        </Text>
        <Text className="mt-2 text-center text-base text-muted">
          Thanks for your purchase. A confirmation is on its way and your order is
          being prepared.
        </Text>
      </View>
      <View className="px-5 pb-8">
        <Button
          label="Continue shopping"
          icon="bag-outline"
          onPress={() => router.replace("/(tabs)/(home)")}
        />
      </View>
    </SafeAreaView>
  );
}
