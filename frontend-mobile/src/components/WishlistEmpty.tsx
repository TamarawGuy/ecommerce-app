import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { Pressable, Text, View } from "react-native";

// Lottie is reserved for select moments (empty states, order success, splash);
// the empty wishlist is one of them. Works the same for guests and signed-in
// users — the wishlist is never gated behind an account — so the copy just nudges
// back into browsing rather than prompting a sign-in.
export function WishlistEmpty() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-10">
      <LottieView
        source={require("../lottie/wishlist/empty-wishlist.json")}
        autoPlay
        loop
        style={{ width: 200, height: 200 }}
      />
      <Text className="mt-2 text-xl font-bold text-foreground">
        Your wishlist is empty
      </Text>
      <Text className="mt-2 text-center text-base text-muted">
        Tap the heart on anything you love to save it here.
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
