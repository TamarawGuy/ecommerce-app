import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/src/lib/colors";

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared chrome for the auth modal screens: a dismiss (✕) button, a title/
 * subtitle header, and a keyboard-avoiding scroll area. Dismissing the modal
 * returns the shopper exactly where they were — auth is never a gate.
 */
export function AuthScreen({ title, subtitle, children }: AuthScreenProps) {
  const router = useRouter();
  const colors = useColors();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row justify-end px-4 pt-2">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityLabel="Close"
            className="rounded-full p-1 active:opacity-60"
          >
            <Ionicons name="close" size={26} color={colors.foreground} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-3xl font-bold text-foreground">{title}</Text>
          {subtitle ? (
            <Text className="mt-2 text-base text-muted">{subtitle}</Text>
          ) : null}
          <View className="mt-8 gap-4">{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
