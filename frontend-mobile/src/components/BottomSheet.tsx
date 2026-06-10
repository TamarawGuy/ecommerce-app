import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * A lightweight bottom sheet built on React Native's `Modal` (no extra native
 * deps). A tap on the dimmed backdrop or the hardware back button dismisses it.
 * The sheet card hosts arbitrary content (the sort menu, the filter form).
 */
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View className="rounded-t-2xl border-t border-border bg-background">
          <SafeAreaView edges={["bottom"]}>{children}</SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
