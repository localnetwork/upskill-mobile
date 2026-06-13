import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Api } from '@/lib/api';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Course = {
  id: string;
  title: string;
  slug?: string;
  is_enrolled?: boolean;
};

export default function CoursesScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await Api.get<any>('/courses?limit=20&page=1', false);
      const rows = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.rows)
          ? response.data.rows
          : Array.isArray(response?.rows)
            ? response.rows
            : [];
      setCourses(rows);
    } catch (e: any) {
      setError(e?.message || 'Unable to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {loading ? <Text style={{ color: colors.textSecondary }}>Loading courses...</Text> : null}
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={[styles.item, { backgroundColor: colors.surface }]}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary }}>
              {item.is_enrolled ? 'Enrolled' : 'Not enrolled'}
            </Text>
          </Pressable>
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
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  error: {
    marginBottom: Spacing.two,
  },
});
