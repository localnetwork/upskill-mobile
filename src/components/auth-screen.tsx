import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoogleButton } from "@/components/google-button";
import { useSessionStore } from "@/store/session";

function Illustration() {
  return (
    <Image
      source={require("../../assets/images/login-illustration.png")}
      resizeMode="contain"
      style={{ width: "100%", maxWidth: 320, height: 140, alignSelf: "center", filter: [{ invert: 1 }] } as any}
    />
  );
}

export function AuthScreen({ mode }: { mode: "login" | "student" | "instructor" }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useSessionStore((state) => state.profile);
  const initialized = useSessionStore((state) => state.initialized);
  const googleAuth = useSessionStore((state) => state.googleAuth);
  const login = useSessionStore((state) => state.login);
  const verifyLoginCode = useSessionStore((state) => state.verifyLoginCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<{ email: string; maskedEmail: string } | null>(null);

  if (initialized && profile) {
    return <Redirect href="/(tabs)" />;
  }

  const submitEmail = async () => {
    if (!identifier.trim()) return setError("Enter your email.");
    try {
      setLoading(true);
      setError("");
      const next = await login(identifier.trim());
      if (next) setPending(next);
      else router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (!pending || code.trim().length < 6) return setError("Enter the 6-digit code.");
    try {
      setLoading(true);
      setError("");
      await verifyLoginCode(pending.email, code.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const onToken = async (idToken: string) => {
    try {
      setLoading(true);
      setError("");
      await googleAuth(idToken, mode === "login" ? "login" : "register", mode === "instructor" ? "instructor" : "student");
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "login"
      ? "Log in to continue your learning journey"
      : mode === "instructor"
        ? "Create an instructor account to teach on Upskill"
        : "Create a learner account";
  const label = mode === "login" ? "Continue with Google" : "Sign up with Google";

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4">
          <Illustration />

          <Text className="mt-8 text-center text-[20px] font-bold text-[#F1F2F4]">{title}</Text>

          {mode === "login" ? (
            <View className="mt-6">
              {pending ? (
                <>
                  <Text className="mb-3 text-center text-[14px] text-[#D1D7DC]">
                    We sent a 6-digit code to {pending.maskedEmail}.
                  </Text>
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="6-digit code"
                    placeholderTextColor="#6A6F73"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="rounded-md border border-[#6A6F73] bg-black px-4 py-3 text-[16px] text-white"
                  />
                  <Pressable onPress={submitCode} disabled={loading} className="mt-3 h-[52px] items-center justify-center rounded-md bg-[#C0C4FC]">
                    <Text className="text-[16px] font-bold text-black">{loading ? "Verifying…" : "Verify code"}</Text>
                  </Pressable>
                  <Pressable onPress={() => { setPending(null); setCode(""); setError(""); }} className="mt-3 items-center">
                    <Text className="text-[14px] text-[#9194AC]">Use a different email</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text className="mb-3 text-center text-[14px] text-[#D1D7DC]">
                    We&apos;ll email you a 6-digit login code.
                  </Text>
                  <TextInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="Email"
                    placeholderTextColor="#6A6F73"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="rounded-md border border-[#6A6F73] bg-black px-4 py-3 text-[16px] text-white"
                  />
                  <Pressable onPress={submitEmail} disabled={loading} className="mt-3 h-[52px] items-center justify-center rounded-md bg-[#C0C4FC]">
                    <Text className="text-[16px] font-bold text-black">{loading ? "Please wait…" : "Login"}</Text>
                  </Pressable>
                </>
              )}
              <View className="my-6 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-[#2D2F31]" />
                <Text className="text-[14px] text-[#6A6F73]">Other log in options</Text>
                <View className="h-px flex-1 bg-[#2D2F31]" />
              </View>
              <GoogleButton compact label="Continue with Google" loading={loading} onToken={onToken} onError={setError} />
            </View>
          ) : (
            <View className="mt-8">
              <GoogleButton label={label} loading={loading} onToken={onToken} onError={setError} />
            </View>
          )}

          {error ? <Text className="mt-3 text-center text-danger">{error}</Text> : null}

          {mode === "login" ? (
            <View className="mt-10 gap-4">
              <Pressable onPress={() => router.push("/register?mode=student" as never)} className="items-center">
                <Text className="text-[15px] text-[#9194AC]">
                  New here? <Text className="font-bold text-[#D6B3FF]">Register</Text>
                </Text>
              </Pressable>
              <Pressable onPress={() => router.push("/register?mode=instructor" as never)} className="items-center">
                <Text className="text-[15px] font-bold text-[#D6B3FF]">Teach on Upskill</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-10 gap-4">
              <Pressable
                onPress={() => router.replace(mode === "student" ? "/register?mode=instructor" : ("/register?mode=student" as never))}
                className="items-center">
                <Text className="text-[15px] font-bold text-[#D6B3FF]">
                  {mode === "student" ? "Teach on Upskill" : "Register as a learner"}
                </Text>
              </Pressable>
              <Pressable onPress={() => router.replace("/login")} className="items-center">
                <Text className="text-[15px] text-[#9194AC]">
                  Already have an account? <Text className="font-bold text-[#D6B3FF]">Log in</Text>
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={() => router.back()} className="mt-10 items-center">
            <Text className="text-[14px] text-[#9194AC]">Continue browsing</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}