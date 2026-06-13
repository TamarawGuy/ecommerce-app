import { Text, View } from "react-native";

/** A horizontal rule with a centered "or", separating email/password from SSO. */
export function OrDivider() {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text className="text-xs font-medium uppercase text-muted">or</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
