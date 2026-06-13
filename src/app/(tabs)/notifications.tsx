import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { io, Socket } from 'socket.io-client';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { getToken } from '@/lib/token';
import { useSessionStore } from '@/store/session';

type Notification = {
  id: string;
  title: string;
  message: string;
  readAt?: string | null;
};

export default function NotificationsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const profile = useSessionStore((state) => state.profile);
  const [rows, setRows] = useState<Notification[]>([]);
  const [error, setError] = useState('');

  const socketBaseUrl = useMemo(() => API_URL.replace(/\/api\/?$/, ''), []);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setError('');
      const response = await Api.get<any>('/notifications?limit=25&page=1');
      const items = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.rows)
          ? response.data.rows
          : [];
      setRows(items);
    } catch (e: any) {
      setError(e?.message || 'Unable to load notifications');
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!profile?.id) return;
    let socket: Socket | null = null;

    async function connect() {
      const token = await getToken();
      if (!token) return;
      socket = io(socketBaseUrl, {
        transports: ['websocket'],
        auth: { token },
      });
      socket.on('notification:new', () => {
        load();
      });
    }

    connect();
    return () => {
      socket?.disconnect();
    };
  }, [profile?.id, socketBaseUrl, load]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary }}>{item.message}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              {item.readAt ? 'Read' : 'Unread'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  item: {
    borderRadius: 12,
    padding: Spacing.three,
  },
  title: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
});
