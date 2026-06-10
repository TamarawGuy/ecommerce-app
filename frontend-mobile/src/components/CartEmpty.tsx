import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { Pressable, Text, View } from "react-native";

// Lottie is reserved for select moments (empty states, order success, splash);
// the empty cart is one of them. The animation loops gently behind friendly copy
// and a shortcut back into browsing — the cart is never a dead end.
export function CartEmpty() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-10">
      <LottieView
        source={require("../lottie/cart/empty-cart.json")}
        autoPlay
        loop
        style={{ width: 200, height: 200 }}
      />
      <Text className="mt-2 text-xl font-bold text-foreground">Your cart is empty</Text>
      <Text className="mt-2 text-center text-base text-muted">
        Browse the catalog and add something you love.
      </Text>
      <Pressable
        onPress={() => router.navigate("/(tabs)/(home)")}
        className="mt-6 flex-row items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 active:opacity-80"
      >
        <Ionicons name="bag-outline" size={18} color="white" />
        <Text className="text-base font-semibold text-primary-foreground">
          Start shopping
        </Text>
      </Pressable>
    </View>
  );
}
