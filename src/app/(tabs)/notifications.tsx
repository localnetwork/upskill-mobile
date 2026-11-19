import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { io, Socket } from 'socket.io-client';

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
    <View className="flex-1 p-4 bg-background">
      {error ? <Text className="text-danger">{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <View className="rounded-xl p-4 bg-surface">
            <Text className="font-bold text-[16px] mb-1 text-text">{item.title}</Text>
            <Text className="text-text-secondary">{item.message}</Text>
            <Text className="text-text-secondary mt-1">
              {item.readAt ? 'Read' : 'Unread'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
