import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSessionStore } from "@/store/session";

const ACCENT = "#A435F0";
const BORDER = "#3E4143";
const INK = "#F1F2F4";

function Illustration() {
  const stroke = { borderWidth: 2, borderColor: INK } as const;
  return (
    <View style={{ height: 170, width: "100%", maxWidth: 360, alignSelf: "center" }}>
      <View
        style={{ position: "absolute", left: 8, top: 66, height: 64, width: 64, borderRadius: 32, backgroundColor: INK, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "#000", fontSize: 22, fontWeight: "800" }}>{"</>"}</Text>
      </View>
      <View
        style={{ ...stroke, position: "absolute", left: 90, top: 8, height: 44, width: 110, borderRadius: 4, transform: [{ rotate: "-10deg" }], flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}
      >
        <Text style={{ color: INK, fontSize: 18 }}>▲</Text>
        <Text style={{ color: INK, fontSize: 18 }}>●</Text>
        <Text style={{ color: INK, fontSize: 18 }}>◆</Text>
      </View>
      <View
        style={{ ...stroke, position: "absolute", left: 120, top: 92, height: 58, width: 58, borderRadius: 6, alignItems: "center", justifyContent: "center", transform: [{ rotate: "8deg" }] }}
      >
        <Text style={{ color: INK, fontSize: 24 }}>●</Text>
      </View>
      <View
        style={{ ...stroke, position: "absolute", left: 214, top: 14, height: 52, width: 84, borderRadius: 4, alignItems: "center", justifyContent: "center", transform: [{ rotate: "12deg" }] }}
      >
        <Text style={{ color: INK, fontSize: 28 }}>✉</Text>
      </View>
      <View
        style={{ ...stroke, position: "absolute", right: 6, top: 62, height: 70, width: 70, borderRadius: 35, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: INK, fontSize: 30 }}>⊕</Text>
      </View>
      <View
        style={{ ...stroke, position: "absolute", right: 0, top: 46, height: 22, width: 22, borderRadius: 11, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: INK, fontSize: 11 }}>文</Text>
      </View>
      <View
        style={{ position: "absolute", right: 58, top: 122, height: 24, width: 24, borderRadius: 12, backgroundColor: INK, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "#000", fontSize: 13, fontWeight: "800" }}>A</Text>
      </View>
    </View>
  );
}

function SocialButton({ children }: { children: React.ReactNode }) {
  return (
    <Pressable
      style={{ height: 60, width: 60, borderWidth: 1, borderColor: ACCENT, borderRadius: 4, alignItems: "center", justifyContent: "center" }}
    >
      {children}
    </Pressable>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useSessionStore((state) => state.profile);
  const initialized = useSessionStore((state) => state.initialized);
  const login = useSessionStore((state) => state.login);
  const verifyLoginCode = useSessionStore((state) => state.verifyLoginCode);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [codeTarget, setCodeTarget] = useState<{
    email: string;
    maskedEmail: string;
  } | null>(null);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (initialized && profile) {
    return <Redirect href="/(tabs)" />;
  }

  const submit = async () => {
    try {
      setLoading(true);
      setError("");
      if (codeTarget) {
        await verifyLoginCode(codeTarget.email, code);
        router.replace("/(tabs)");
        return;
      }
      const pending = await login(identifier.trim());
      if (pending) {
        setCodeTarget(pending);
        return;
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (codeTarget) {
    return (
      <View className="flex-1 bg-black">
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4">
            <Pressable
              onPress={() => {
                setCodeTarget(null);
                setCode("");
                setError("");
              }}
              hitSlop={10}
              accessibilityLabel="Back"
              className="self-start"
            >
              <FontAwesome name="arrow-left" size={22} color="#F1F2F4" />
            </Pressable>

            <View className="mt-10 items-center">
              <View
                style={{ borderWidth: 2, borderColor: INK, height: 76, width: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: INK, fontSize: 34 }}>✉</Text>
              </View>
            </View>

            <Text className="mt-8 text-center text-[24px] font-bold text-[#F1F2F4]">
              Check your email
            </Text>
            <Text className="mt-3 text-center text-[16px] leading-[24px] text-[#B8BCC0]">
              Enter the 6-digit code we sent to{"\n"}
              <Text className="font-bold text-[#F1F2F4]">{codeTarget.maskedEmail}</Text>
            </Text>

            <View className="mt-8" style={{ height: 64 }}>
              <View className="flex-row justify-between" pointerEvents="none">
                {Array.from({ length: 6 }).map((_, i) => {
                  const active = i === Math.min(code.length, 5);
                  return (
                    <View
                      key={i}
                      style={{
                        height: 64,
                        width: 48,
                        borderRadius: 4,
                        borderWidth: active ? 2 : 1,
                        borderColor: active ? ACCENT : BORDER,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: INK, fontSize: 26, fontWeight: "700" }}>
                        {code[i] ?? ""}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                caretHidden
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
              />
            </View>

            {error ? <Text className="mt-4 text-center text-danger">{error}</Text> : null}

            <Pressable
              onPress={submit}
              disabled={loading || code.length !== 6}
              style={{ backgroundColor: ACCENT, opacity: loading || code.length !== 6 ? 0.5 : 1 }}
              className="mt-8 h-[60px] items-center justify-center rounded"
            >
              <Text className="text-[17px] font-bold text-white">
                {loading ? "Please wait..." : "Verify & Log in"}
              </Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                try {
                  setLoading(true);
                  setError("");
                  setCode("");
                  await login(codeTarget.email);
                } catch (e: any) {
                  setError(e?.message || "Unable to resend code");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="mt-6 items-center"
            >
              <Text className="text-[15px] font-bold text-[#D6B3FF]">Resend code</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setCodeTarget(null);
                setCode("");
                setError("");
              }}
              className="mt-4 items-center"
            >
              <Text className="text-[15px] text-[#9194AC]">Use a different email</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4">
          <Illustration />

          <Text className="mt-8 text-center text-[20px] font-bold text-[#F1F2F4]">
            Log in to continue your learning journey
          </Text>

          <View
            style={{ borderColor: focused ? ACCENT : BORDER }}
            className="mt-8 h-[76px] justify-center rounded border bg-black px-4"
          >
            <Text className="text-[15px] font-bold text-[#F1F2F4]">Email</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="p-0 text-[16px] text-[#F1F2F4]"
            />
          </View>

          {error ? <Text className="mt-3 text-danger">{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={loading || !identifier.trim()}
            style={{ backgroundColor: ACCENT, opacity: loading ? 0.7 : 1 }}
            className="mt-5 h-[60px] items-center justify-center rounded"
          >
            <Text className="text-[17px] font-bold text-white">
              {loading ? "Please wait..." : "Continue"}
            </Text>
          </Pressable>

          <View className="mt-10 flex-row items-center">
            <View style={{ backgroundColor: BORDER }} className="h-px flex-1" />
            <Text className="mx-3 text-[15px] text-[#9194AC]">Other log in options</Text>
            <View style={{ backgroundColor: BORDER }} className="h-px flex-1" />
          </View>

          <View className="mt-8 flex-row items-center justify-center gap-5">
            <SocialButton>
              <Text style={{ color: "#EA4335", fontSize: 28, fontWeight: "800" }}>G</Text>
            </SocialButton>
            <SocialButton>
              <View style={{ height: 30, width: 30, borderRadius: 15, backgroundColor: "#1877F2", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
                <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", lineHeight: 32 }}>f</Text>
              </View>
            </SocialButton>
            <SocialButton>
              <FontAwesome name="apple" size={30} color={INK} />
            </SocialButton>
          </View>

          <Pressable onPress={() => router.back()} className="mt-10 items-center">
            <Text className="text-[14px] text-[#9194AC]">Continue browsing</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
