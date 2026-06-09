import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
  /** Center content vertically + horizontally (used by placeholder screens). */
  center?: boolean;
}

export function Screen({ children, center = false }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className={`flex-1 px-5 ${center ? "items-center justify-center" : ""}`}>
        {children}
      </View>
    </SafeAreaView>
  );
}
