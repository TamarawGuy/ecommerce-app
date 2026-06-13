import { useSignUp } from "@clerk/clerk-expo";
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
import {
  signUpSchema,
  verificationSchema,
  type SignUpValues,
  type VerificationValues,
} from "@/src/lib/auth-schemas";
import { clerkErrorMessage } from "@/src/lib/clerk-errors";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [formError, setFormError] = useState("");
  // Clerk sends a verification code after `create`; we then collect it before
  // the account becomes active. This flips the screen to the code stage.
  const [pendingVerification, setPendingVerification] = useState(false);

  const credentials = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "" },
  });
  const verification = useForm<VerificationValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { code: "" },
  });

  const onCreate = async (values: SignUpValues) => {
    if (!isLoaded) return;
    setFormError("");
    try {
      await signUp.create({
        emailAddress: values.email,
        password: values.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      setFormError(clerkErrorMessage(err));
    }
  };

  const onVerify = async (values: VerificationValues) => {
    if (!isLoaded) return;
    setFormError("");
    try {
      const attempt = await signUp.attemptEmailAddressVerification({
        code: values.code,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.back(); // dismiss the auth modal
      } else {
        setFormError("That code didn't complete sign-up. Please try again.");
      }
    } catch (err) {
      setFormError(clerkErrorMessage(err));
    }
  };

  if (pendingVerification) {
    return (
      // `key` forces a remount between the two stages: they use different RHF
      // forms (`credentials` vs `verification`), and without a distinct key
      // React reuses the same native TextInput — leaving it bound to the old
      // form so keystrokes never reach the code field.
      <AuthScreen
        key="verify"
        title="Verify your email"
        subtitle="Enter the 6-digit code we just sent you."
      >
        <AuthError message={formError} />
        <FormTextField
          control={verification.control}
          name="code"
          label="Verification code"
          placeholder="123456"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
        />
        <Button
          label="Verify & continue"
          onPress={verification.handleSubmit(onVerify)}
          loading={verification.formState.isSubmitting}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      key="credentials"
      title="Create account"
      subtitle="Save your wishlist, addresses, and order history."
    >
      <AuthError message={formError} />

      <FormTextField
        control={credentials.control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormTextField
        control={credentials.control}
        name="password"
        label="Password"
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
      />

      <Button
        label="Create account"
        onPress={credentials.handleSubmit(onCreate)}
        loading={credentials.formState.isSubmitting}
      />

      <OrDivider />
      <GoogleButton onError={setFormError} />

      <View className="mt-2 flex-row justify-center gap-1">
        <Text className="text-sm text-muted">Already have an account?</Text>
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
