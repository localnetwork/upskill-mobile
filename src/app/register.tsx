import { useLocalSearchParams } from "expo-router";

import { AuthScreen } from "@/components/auth-screen";

export default function RegisterScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return <AuthScreen mode={mode === "instructor" ? "instructor" : "student"} />;
}
