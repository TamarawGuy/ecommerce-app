import { Text, View } from "react-native";

/** Form-level error banner for auth failures (bad credentials, taken email, …).
 *  Renders nothing when there's no message. */
export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
      <Text className="text-sm text-danger">{message}</Text>
    </View>
  );
}
