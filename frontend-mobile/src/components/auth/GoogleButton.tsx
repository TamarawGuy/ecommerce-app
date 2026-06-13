import { useSSO } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import { useState } from "react";

import { Button } from "@/src/components/ui/Button";
import { useWarmUpBrowser } from "@/src/components/auth/useWarmUpBrowser";
import { clerkErrorMessage } from "@/src/lib/clerk-errors";

/**
 * "Continue with Google" via Clerk's OAuth SSO flow. Opens the system browser,
 * and on success activates the new session and dismisses the auth modal —
 * returning the shopper to whatever they were doing. In dev, Google uses Clerk's
 * shared OAuth credentials, so no Google Cloud setup is required.
 *
 * `redirectUrl` is derived from the app's `scheme` (app.json) so Clerk can hand
 * control back to the app after the browser round-trip.
 */
export function GoogleButton({ onError }: { onError: (message: string) => void }) {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onPress = async () => {
    setLoading(true);
    onError("");
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.back();
      }
      // No session id → the user cancelled in the browser; stay on the screen.
    } catch (err) {
      onError(clerkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      label="Continue with Google"
      variant="secondary"
      icon="logo-google"
      onPress={onPress}
      loading={loading}
    />
  );
}
