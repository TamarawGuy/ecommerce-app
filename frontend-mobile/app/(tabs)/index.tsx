import { ActivityIndicator, Text, View } from "react-native";

import { Screen } from "@/src/components/Screen";
import { API_BASE_URL } from "@/src/lib/api";
import { useHealth } from "@/src/hooks/useHealth";

export default function HomeScreen() {
  const { data, isLoading, isError, error } = useHealth();

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-foreground">Vibe Commerce</Text>
        <Text className="mt-1 text-base text-muted">Walking skeleton</Text>

        <View className="mt-8 rounded-2xl border border-border bg-card p-5">
          <Text className="text-sm font-medium text-muted">Backend connection</Text>

          {isLoading && (
            <View className="mt-3 flex-row items-center gap-2">
              <ActivityIndicator />
              <Text className="text-base text-foreground">Checking…</Text>
            </View>
          )}

          {isError && (
            <View className="mt-3">
              <Text className="text-base font-semibold text-danger">
                ● Unreachable
              </Text>
              <Text className="mt-1 text-xs text-muted">
                {error instanceof Error ? error.message : "Unknown error"}
              </Text>
            </View>
          )}

          {data && (
            <View className="mt-3">
              <Text className="text-base font-semibold text-success">
                ● Connected — DB {data.db}
              </Text>
              <Text className="mt-1 text-xs text-muted">
                checked {new Date(data.checkedAt).toLocaleTimeString()}
              </Text>
            </View>
          )}

          <Text className="mt-4 text-[11px] text-muted">{API_BASE_URL}</Text>
        </View>
      </View>
    </Screen>
  );
}
