import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { AuthError } from "@/src/components/auth/AuthError";
import { AuthScreen } from "@/src/components/auth/AuthScreen";
import { Button } from "@/src/components/ui/Button";
import { FormTextField } from "@/src/components/ui/FormTextField";
import {
  resetConfirmSchema,
  resetRequestSchema,
  type ResetConfirmValues,
  type ResetRequestValues,
} from "@/src/lib/auth-schemas";
import { clerkErrorMessage } from "@/src/lib/clerk-errors";

export default function ResetPasswordScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [formError, setFormError] = useState("");
  // Stage 1 emails a code; stage 2 collects the code + a new password. Clerk
  // signs the user in on success, so the reset doubles as a sign-in.
  const [codeSent, setCodeSent] = useState(false);

  const request = useForm<ResetRequestValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: "" },
  });
  const confirm = useForm<ResetConfirmValues>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: { code: "", password: "" },
  });

  const onRequest = async (values: ResetRequestValues) => {
    if (!isLoaded) return;
    setFormError("");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: values.email,
      });
      setCodeSent(true);
    } catch (err) {
      setFormError(clerkErrorMessage(err));
    }
  };

  const onConfirm = async (values: ResetConfirmValues) => {
    if (!isLoaded) return;
    setFormError("");
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: values.code,
        password: values.password,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.back(); // password changed and signed in — dismiss the modal
      } else {
        setFormError("Couldn't reset the password. Please try again.");
      }
    } catch (err) {
      setFormError(clerkErrorMessage(err));
    }
  };

  if (codeSent) {
    return (
      // Distinct `key` per stage forces a remount so the native TextInput isn't
      // reused across the two RHF forms (`request` vs `confirm`); otherwise it
      // stays bound to the old form and won't accept input. See sign-up.tsx.
      <AuthScreen
        key="confirm"
        title="Set a new password"
        subtitle="Enter the code we emailed you and choose a new password."
      >
        <AuthError message={formError} />
        <FormTextField
          control={confirm.control}
          name="code"
          label="Verification code"
          placeholder="123456"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
        />
        <FormTextField
          control={confirm.control}
          name="password"
          label="New password"
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
        />
        <Button
          label="Reset password"
          onPress={confirm.handleSubmit(onConfirm)}
          loading={confirm.formState.isSubmitting}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      key="request"
      title="Reset password"
      subtitle="We'll email you a code to reset it."
    >
      <AuthError message={formError} />
      <FormTextField
        control={request.control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Button
        label="Send reset code"
        onPress={request.handleSubmit(onRequest)}
        loading={request.formState.isSubmitting}
      />

      <View className="mt-2 flex-row justify-center gap-1">
        <Text className="text-sm text-muted">Remembered it?</Text>
        <Pressable
          onPress={() => router.replace("/(auth)/sign-in")}
          hitSlop={8}
          className="active:opacity-60"
        >
          <Text className="text-sm font-semibold text-foreground">Sign in</Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}
