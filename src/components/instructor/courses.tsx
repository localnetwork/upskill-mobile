import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';

import { Chips, Empty, num, PrimaryButton, Sheet } from '@/components/dark-ui';
import { PLACEHOLDER_COVER } from '@/components/home-feed';
import {
  createAiDraft,
  createCourse,
  fetchAuthoredCourses,
  fetchCategoryTree,
  fetchCourseLevels,
  type CategoryNode,
  type CourseLevel,
} from '@/lib/upskill-api';

const INPUT =
  'rounded-md border border-[#6A6F73] bg-black px-4 py-3 text-[16px] text-white';

function isPublished(course: any) {
  return (
    course?.isPublished === true ||
    course?.published === '1' ||
    String(course?.workflowStatus || '').toUpperCase() === 'PUBLISHED'
  );
}

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => (n.children?.length ? flatten(n.children) : [n]));
}

type Mode = null | 'manual' | 'ai' | 'bulk';

export default function InstructorCourses() {
  const router = useRouter();
  const [levels, setLevels] = useState<CourseLevel[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [levelId, setLevelId] = useState('all');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [formTitle, setFormTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [topics, setTopics] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [bulkResult, setBulkResult] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetchAuthoredCourses({
        title,
        instructionalLevel: levelId === 'all' ? undefined : levelId,
      });
      setCourses(res.rows);
    } catch (e: any) {
      setError(e?.message || 'Unable to load courses');
    } finally {
      setLoading(false);
    }
  }, [title, levelId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    fetchCourseLevels().then(setLevels).catch(() => {});
    fetchCategoryTree().then((tree) => setCategories(flatten(tree))).catch(() => {});
  }, []);

  const openMode = (next: Mode) => {
    setMenuOpen(false);
    setFormError('');
    setBulkResult('');
    setMode(next);
  };

  const openCourse = (slug?: string) => slug && router.push(`/instructor/courses/${encodeURIComponent(slug)}` as never);

  const submit = async () => {
    setFormError('');
    setBusy(true);
    try {
      if (mode === 'manual') {
        if (!formTitle.trim() || !categoryId) throw new Error('Add a title and choose a category.');
        const created = await createCourse(formTitle.trim(), [categoryId]);
        setMode(null);
        setFormTitle('');
        await load();
        openCourse(created.slug);
      } else if (mode === 'ai') {
        if (!prompt.trim()) throw new Error('Describe the course you want to draft.');
        const created = await createAiDraft(prompt.trim());
        setMode(null);
        setPrompt('');
        await load();
        openCourse(created.slug);
      } else if (mode === 'bulk') {
        const list = topics.split('\n').map((t) => t.trim()).filter(Boolean);
        if (!list.length) throw new Error('Add at least one topic, one per line.');
        let done = 0;
        for (const topic of list) {
          try {
            await createAiDraft(`Create a complete course about: ${topic}`);
            done += 1;
          } catch {}
        }
        setBulkResult(`${done} of ${list.length} drafts created.`);
        setTopics('');
        await load();
      }
    } catch (e: any) {
      setFormError(e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const levelOptions = [
    { key: 'all', label: 'All levels' },
    ...levels.map((l) => ({ key: l.id, label: l.title })),
  ];

  return (
    <View>
      <View className="flex-row items-center">
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setTitle(search.trim())}
          returnKeyType="search"
          placeholder="Search your courses"
          placeholderTextColor="#6A6F73"
          className={`${INPUT} mr-3 flex-1`}
        />
        <Pressable
          onPress={() => setMenuOpen((open) => !open)}
          className="flex-row items-center rounded-full bg-white px-4 py-3 active:opacity-80">
          <Text className="mr-2 text-[15px] font-bold text-black">Add course</Text>
          <FontAwesome name={menuOpen ? 'angle-up' : 'angle-down'} size={18} color="#000" />
        </Pressable>
      </View>

      {menuOpen ? (
        <View className="mt-2 overflow-hidden rounded-lg border border-[#2D2F31] bg-[#1C1D1F]">
          {(
            [
              ['manual', 'Create manually'],
              ['ai', 'Draft with AI'],
              ['bulk', 'Bulk draft with AI'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => openMode(key)}
              className="border-b border-[#2D2F31] px-4 py-4 active:opacity-60">
              <Text className="text-[16px] text-white">{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Chips options={levelOptions} value={levelId} onChange={setLevelId} />

      {error ? <Text className="mb-3 text-danger">{error}</Text> : null}
      {loading ? <Text className="text-[#D1D7DC]">Loading courses...</Text> : null}
      {!loading && courses.length === 0 ? <Empty>No courses found.</Empty> : null}

      {courses.map((course) => {
        const live = isPublished(course);
        return (
          <Pressable key={course.id} onPress={() => openCourse(course.slug)} className="mb-8 flex-row">
            <Image
              source={{ uri: course.cover_image?.path || PLACEHOLDER_COVER }}
              style={{ width: 76, height: 76, borderRadius: 4 }}
              resizeMode="cover"
            />
            <View className="ml-4 flex-1">
              <Text numberOfLines={2} className="text-[19px] font-bold leading-[24px] text-white">
                {course.title}
              </Text>
              <Text
                className={`mt-1 text-[13px] font-bold uppercase tracking-wide ${
                  live ? 'text-success' : 'text-[#F59E0B]'
                }`}>
                {live ? 'Published' : String(course.workflowStatus || 'Draft').replace(/_/g, ' ')}
              </Text>
              <Text className="mt-1 text-[15px] text-[#D1D7DC]">
                {num(course?.stats?.total_enrollments)} students · ★{' '}
                {num(course?.stats?.average_rating).toFixed(2)}
              </Text>
            </View>
          </Pressable>
        );
      })}

      <Sheet
        visible={mode !== null}
        title={
          mode === 'manual' ? 'Create manually' : mode === 'ai' ? 'Draft with AI' : 'Bulk draft with AI'
        }
        onClose={() => !busy && setMode(null)}>
        {mode === 'manual' ? (
          <>
            <Text className="mb-2 text-[#D1D7DC]">Course title</Text>
            <TextInput
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="e.g. Learn React Native"
              placeholderTextColor="#6A6F73"
              className={INPUT}
            />
            <Text className="mb-1 mt-4 text-[#D1D7DC]">Category</Text>
            <Chips
              options={categories.map((c) => ({ key: c.id, label: c.title }))}
              value={categoryId}
              onChange={setCategoryId}
            />
          </>
        ) : null}
        {mode === 'ai' ? (
          <>
            <Text className="mb-2 text-[#D1D7DC]">
              Describe your course and AI will draft the description and outline.
            </Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              multiline
              placeholder="A beginner course about..."
              placeholderTextColor="#6A6F73"
              className={`${INPUT} min-h-[120px]`}
              style={{ textAlignVertical: 'top' }}
            />
          </>
        ) : null}
        {mode === 'bulk' ? (
          <>
            <Text className="mb-2 text-[#D1D7DC]">One course topic per line.</Text>
            <TextInput
              value={topics}
              onChangeText={setTopics}
              multiline
              placeholder={'Python for beginners\nExcel dashboards'}
              placeholderTextColor="#6A6F73"
              className={`${INPUT} min-h-[140px]`}
              style={{ textAlignVertical: 'top' }}
            />
            {bulkResult ? <Text className="mt-3 text-success">{bulkResult}</Text> : null}
          </>
        ) : null}
        {formError ? <Text className="mt-3 text-danger">{formError}</Text> : null}
        <View className="mt-5">
          <PrimaryButton
            label={busy ? 'Working...' : mode === 'manual' ? 'Create course' : 'Generate draft'}
            onPress={submit}
            disabled={busy}
          />
        </View>
      </Sheet>
    </View>
  );
}
