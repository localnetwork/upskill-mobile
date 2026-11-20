import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'missing-client-id';

export function GoogleButton({
  label,
  loading,
  compact,
  onToken,
  onError,
}: {
  label: string;
  loading?: boolean;
  compact?: boolean;
  onToken: (idToken: string) => void;
  onError: (message: string) => void;
}) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB,
    webClientId: WEB,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || WEB,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || WEB,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const token = response.params?.id_token || response.authentication?.idToken;
      if (token) onToken(token);
      else onError('Google did not return an ID token.');
    } else if (response.type === 'error') {
      onError('Google sign-in failed. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const press = () => {
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      onError('Google sign-in is not configured (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
      return;
    }
    promptAsync();
  };

  return (
    <Pressable
      onPress={press}
      disabled={!request || loading}
      style={{ opacity: !request || loading ? 0.6 : 1 }}
      accessibilityLabel={label}
      className={
        compact
          ? 'h-[60px] w-[60px] items-center justify-center self-center rounded border border-[#C0C4FC] bg-black active:opacity-70'
          : 'h-[60px] flex-row items-center justify-center gap-3 rounded border border-[#3E4143] bg-black active:opacity-70'
      }>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={{ color: '#EA4335', fontSize: 24, fontWeight: '800' }}>G</Text>
          {compact ? null : <Text className="text-[17px] font-bold text-white">{label}</Text>}
        </>
      )}
    </Pressable>
  );
}
