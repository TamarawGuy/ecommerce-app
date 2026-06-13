import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemeToggle } from "@/src/components/ThemeToggle";
import { Button } from "@/src/components/ui/Button";
import { useColors } from "@/src/lib/colors";

export default function ProfileScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="text-3xl font-bold text-foreground">Profile</Text>

        <View className="mt-6">
          {!isLoaded ? (
            <View className="items-center py-10">
              <ActivityIndicator />
            </View>
          ) : isSignedIn ? (
            <AccountCard />
          ) : (
            <GuestCard />
          )}
        </View>

        <Section title="Appearance">
          <ThemeToggle />
          <Text className="mt-2 text-xs text-muted">
            Choose a theme, or follow your device.
          </Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-8">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Signed-in state: account summary + sign out. */
function AccountCard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName?.trim() || email || "Your account";
  const initial = (name[0] ?? "?").toUpperCase();

  const confirmSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4">
        {user?.imageUrl ? (
          <Image
            source={{ uri: user.imageUrl }}
            style={{ width: 56, height: 56, borderRadius: 28 }}
            contentFit="cover"
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
            <Text className="text-xl font-bold text-primary-foreground">
              {initial}
            </Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
            {name}
          </Text>
          {email ? (
            <Text className="text-sm text-muted" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>

      <Button
        label="Sign out"
        variant="secondary"
        icon="log-out-outline"
        onPress={confirmSignOut}
        loading={signingOut}
      />
    </View>
  );
}

/** Guest state: explains the value of an account without gating anything. */
function GuestCard() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View className="items-center rounded-2xl border border-border bg-card p-6">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-background">
        <Ionicons name="person-outline" size={28} color={colors.muted} />
      </View>
      <Text className="mt-4 text-lg font-semibold text-foreground">
        You&apos;re browsing as a guest
      </Text>
      <Text className="mt-1 text-center text-sm text-muted">
        Sign in to sync your wishlist, save addresses, and see your order
        history. You can keep shopping without an account.
      </Text>
      <View className="mt-5 w-full">
        <Button
          label="Sign in or create account"
          icon="log-in-outline"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </View>
    </View>
  );
}
