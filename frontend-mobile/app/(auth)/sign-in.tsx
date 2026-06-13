import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { AuthError } from "@/src/components/auth/AuthError";
import { AuthScreen } from "@/src/components/auth/AuthScreen";
import { GoogleButton } from "@/src/components/auth/GoogleButton";
import { OrDivider } from "@/src/components/auth/OrDivider";
import { Button } from "@/src/components/ui/Button";
import { FormTextField } from "@/src/components/ui/FormTextField";
import { signInSchema, type SignInValues } from "@/src/lib/auth-schemas";
import { clerkErrorMessage } from "@/src/lib/clerk-errors";

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [formError, setFormError] = useState("");

  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInValues) => {
    if (!isLoaded) return;
    setFormError("");
    try {
      const attempt = await signIn.create({
        identifier: values.email,
        password: values.password,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.back(); // dismiss the auth modal — back to where they were
      } else {
        // e.g. needs_second_factor — out of scope for this slice's setup.
        setFormError("Additional verification is required to sign in.");
      }
    } catch (err) {
      setFormError(clerkErrorMessage(err));
    }
  };

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to sync your account.">
      <AuthError message={formError} />

      <FormTextField
        control={control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormTextField
        control={control}
        name="password"
        label="Password"
        placeholder="Your password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
      />

      <Pressable
        onPress={() => router.replace("/(auth)/reset-password")}
        hitSlop={8}
        className="self-end active:opacity-60"
      >
        <Text className="text-sm font-medium text-muted">Forgot password?</Text>
      </Pressable>

      <Button
        label="Sign in"
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
      />

      <OrDivider />
      <GoogleButton onError={setFormError} />

      <View className="mt-2 flex-row justify-center gap-1">
        <Text className="text-sm text-muted">Don&apos;t have an account?</Text>
        <Pressable
          onPress={() => router.replace("/(auth)/sign-up")}
          hitSlop={8}
          className="active:opacity-60"
        >
          <Text className="text-sm font-semibold text-foreground">Sign up</Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}
