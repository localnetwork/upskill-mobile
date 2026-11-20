import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import {
  Chips,
  Empty,
  fmtDate,
  InfoRow,
  LAVENDER,
  num,
  OutlineButton,
  php,
  PrimaryButton,
  SectionTitle,
  Sheet,

  StatGrid,
} from '@/components/dark-ui';
import ContentEditor from '@/components/instructor/curriculum-content';
import {
  checkSlugAvailability,
  createCourseCoupon,
  deleteCurriculum,
  deleteSection,
  fetchCategoryTree,
  fetchCourseCoupons,
  fetchCourseReviews,
  fetchCourseSections,
  fetchCourseStatistics,
  fetchCourseStudents,
  fetchCourseLevels,
  fetchLanguages,
  fetchSectionCurriculums,
  PRICE_TIERS,
  saveCurriculum,
  saveSection,
  updateCourseBasics,
  updateCourseGoals,
  updateCourseMessages,
  updateCoursePricing,
  uploadCourseCoverImage,
  uploadCoursePromoVideo,
  type CategoryNode,
  type CourseLevel,
} from '@/lib/upskill-api';

import {
  errorText,
  Feedback,
  Field,
  htmlToText,
  INPUT,
  Intro,
  MediaUpload,
  textToHtml,
} from '@/components/instructor/editor-kit';

export { INPUT };

const cnt = (v: unknown) => String(num(v));

type Course = Record<string, any>;
type Props = { course: Course; onSaved: (patch: Course) => void };

const flatten = (nodes: CategoryNode[]): CategoryNode[] =>
  nodes.flatMap((n) => (n.children?.length ? flatten(n.children) : [n]));

/* ---------------- Approval readiness ---------------- */

export function getChecks(course: Course, sections: Course[], payoutConnected: boolean) {
  const goals = course.goals || {};
  const lessons = sections.reduce((n, s) => n + (s.curriculums?.length || 0), 0);
  const missing = sections.reduce(
    (n, s) => n + (s.curriculums || []).filter((c: Course) => !c.asset && !c.curriculum_resource_type).length,
    0,
  );
  const words = htmlToText(course.description).split(/\s+/).filter(Boolean).length;
  const hasMedia = (m: any) => Boolean(m?.id || m?.path || (typeof m === 'string' && m));
  return [
    { label: 'Add a clear course title', done: String(course.title || '').trim().length >= 10 },
    { label: 'Write a compelling subtitle', done: String(course.subtitle || '').trim().length >= 30 },
    { label: 'Write a full description (200+ words)', done: words >= 200 },
    { label: 'Upload a course image', done: hasMedia(course.cover_image) },
    { label: 'Upload a promotional video', done: hasMedia(course.promo_video) },
    {
      label: 'Set category and level',
      done: Boolean((course.category_ids || []).length && course.instructional_level),
    },
    { label: 'Select course language', done: Boolean(course.language) },
    { label: 'Build curriculum (1+ section, 5+ lessons)', done: sections.length >= 1 && lessons >= 5 },
    { label: 'Complete all curriculum content items', done: sections.length > 0 && missing === 0 },
    { label: 'Add what students will learn (4+ items)', done: (goals.what_you_will_learn_data || []).length >= 4 },
    { label: 'Add at least 1 requirement', done: (goals.requirements_data || []).length >= 1 },
    { label: 'Define your target learners', done: (goals.who_should_attend_data || []).length >= 1 },
    { label: 'Set pricing tier', done: Boolean(course.price_tier?.id) },
    { label: 'Connect a payout account', done: payoutConnected },
  ];
}

export function Readiness({ checks }: { checks: { label: string; done: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const done = checks.filter((c) => c.done).length;
  const score = Math.round((done / (checks.length || 1)) * 100);
  const pending = checks.filter((c) => !c.done);
  return (
    <View className="mb-6 rounded-lg border border-[#2D2F31] bg-[#1C1D1F] p-4">
      <Pressable onPress={() => setOpen((v) => !v)} className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[16px] font-bold text-white">Approval readiness</Text>
          <Text className="mt-1 text-[13px] text-[#D1D7DC]">
            {done}/{checks.length} complete
            {pending[0] ? ` · Next: ${pending[0].label}` : ''}
          </Text>
        </View>
        <Text className="text-[22px] font-bold" style={{ color: LAVENDER }}>
          {score}%
        </Text>
      </Pressable>
      <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#2D2F31]">
        <View className="h-2 rounded-full" style={{ width: `${score}%`, backgroundColor: LAVENDER }} />
      </View>
      {open
        ? checks.map((item) => (
            <Text
              key={item.label}
              className={`mt-3 text-[14px] ${item.done ? 'text-success' : 'text-[#D1D7DC]'}`}>
              {item.done ? '✓ ' : '○ '}
              {item.label}
            </Text>
          ))
        : null}
    </View>
  );
}

function CategoryPicker({
  tree,
  flat,
  selected,
  onToggle,
}: {
  tree: CategoryNode[];
  flat: CategoryNode[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<CategoryNode[]>([]);
  const current = path.length ? path[path.length - 1].children || [] : tree;
  const countIn = (node: CategoryNode): number =>
    node.children?.length
      ? node.children.reduce((n, c) => n + countIn(c), 0)
      : selected.includes(String(node.id))
        ? 1
        : 0;

  return (
    <View>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {selected.map((id) => (
          <Pressable
            key={id}
            onPress={() => onToggle(id)}
            className="rounded-full border border-white bg-white px-3.5 py-2">
            <Text className="text-[14px] font-bold text-black">
              {flat.find((c) => String(c.id) === id)?.title || id} ✕
            </Text>
          </Pressable>
        ))}
      </View>
      <OutlineButton label={selected.length ? 'Change categories' : 'Select categories'} onPress={() => setOpen(true)} />
      <Sheet
        visible={open}
        title="Select categories"
        onClose={() => {
          setOpen(false);
          setPath([]);
        }}>
        <Pressable
          disabled={!path.length}
          onPress={() => setPath((p) => p.slice(0, -1))}
          className="mb-2">
          <Text className="text-[14px] font-bold" style={{ color: path.length ? LAVENDER : '#6A6F73' }}>
            {path.length ? `‹ ${path.map((n) => n.title).join(' / ')}` : 'All categories'}
          </Text>
        </Pressable>
        <ScrollView style={{ maxHeight: 360 }}>
          {current.map((node) => {
            const hasChildren = !!node.children?.length;
            const active = selected.includes(String(node.id));
            const count = hasChildren ? countIn(node) : 0;
            return (
              <Pressable
                key={node.id}
                onPress={() => (hasChildren ? setPath((p) => [...p, node]) : onToggle(String(node.id)))}
                className="flex-row items-center justify-between border-b border-[#2D2F31] py-3.5">
                <Text className="flex-1 pr-3 text-[16px] text-white">{node.title}</Text>
                {hasChildren ? (
                  <Text className="text-[14px] text-[#D1D7DC]">
                    {count ? `${count} selected  ` : ''}›
                  </Text>
                ) : (
                  <Text className="text-[18px]" style={{ color: active ? LAVENDER : '#6A6F73' }}>
                    {active ? '☑' : '☐'}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        <View className="mt-4">
          <PrimaryButton
            label="Done"
            onPress={() => {
              setOpen(false);
              setPath([]);
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

/* ---------------- Basics ---------------- */

export function BasicsSection({ course, onSaved }: Props) {
  const [title, setTitle] = useState(String(course.title || ''));
  const [slug, setSlug] = useState(String(course.slug || ''));
  const [customSlug, setCustomSlug] = useState(false);
  const [slugState, setSlugState] = useState<'idle' | 'ok' | 'taken'>('idle');
  const [subtitle, setSubtitle] = useState(String(course.subtitle || ''));
  const [description, setDescription] = useState(htmlToText(course.description));
  const [language, setLanguage] = useState(String(course.language || ''));
  const [levelId, setLevelId] = useState(
    String(course.instructional_level?.id ?? course.instructional_level ?? ''),
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(
    (course.category_ids || []).map((c: any) => String(c?.category_id ?? c)),
  );
  const [levels, setLevels] = useState<CourseLevel[]>([]);
  const [languages, setLanguages] = useState<{ value: string; label: string }[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [coverId, setCoverId] = useState<string | number>('');
  const [coverPath, setCoverPath] = useState<string | undefined>(course.cover_image?.path);
  const [coverTitle, setCoverTitle] = useState<string | undefined>(course.cover_image?.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    Promise.all([fetchCourseLevels(), fetchLanguages(), fetchCategoryTree()])
      .then(([l, lang, cats]) => {
        setLevels(l);
        setLanguages(lang);
        setCategories(flatten(cats));
        setTree(cats);
      })
      .catch(() => undefined);
  }, []);

  const checkSlug = async () => {
    try {
      const free = await checkSlugAvailability(slug.trim(), String(course.id || course.uuid));
      setSlugState(free ? 'ok' : 'taken');
    } catch {
      setSlugState('idle');
    }
  };

  const toggleCategory = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const save = async () => {
    setError('');
    setOk('');
    if (!title.trim()) return setError('Course title is required.');
    setBusy(true);
    try {
      const payload: Course = {
        title: title.trim(),
        slug: slug.trim(),
        subtitle: subtitle.trim(),
        description: textToHtml(description),
        language,
        instructional_level: levelId,
        category_ids: categoryIds,
        ...(coverId ? { cover_image: coverId } : {}),
      };
      const saved = await updateCourseBasics(course.uuid, payload);
      onSaved({
        ...payload,
        ...saved,
        category_ids: categoryIds,
        instructional_level: saved.instructional_level ?? levelId,
      });
      setOk('Course updated successfully.');
    } catch (e) {
      setError(errorText(e, 'An error occurred. Please try again later.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Field label="Course title" counter={`${title.length}/60`} hint="Your title should be attention-grabbing, clear and searchable.">
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          placeholderTextColor="#6A6F73"
          className={INPUT}
        />
      </Field>

      <Field label="Course slug" counter={`${slug.length}/150`}>
        {customSlug ? (
          <TextInput
            value={slug}
            onChangeText={(v) => {
              setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
              setSlugState('idle');
            }}
            onBlur={checkSlug}
            maxLength={150}
            autoCapitalize="none"
            placeholderTextColor="#6A6F73"
            className={INPUT}
          />
        ) : (
          <Text className="text-[15px] text-[#D1D7DC]">{slug || 'Generated automatically'}</Text>
        )}
        {customSlug && slugState !== 'idle' ? (
          <Text className={`mt-2 text-[13px] ${slugState === 'ok' ? 'text-success' : 'text-danger'}`}>
            {slugState === 'ok' ? 'Slug is available.' : 'Slug is already taken.'}
          </Text>
        ) : null}
        <Pressable onPress={() => setCustomSlug((v) => !v)} className="mt-2">
          <Text className="text-[14px] font-bold" style={{ color: LAVENDER }}>
            {customSlug ? 'Use automatic slug' : 'Customize slug'}
          </Text>
        </Pressable>
      </Field>

      <Field label="Course subtitle" counter={`${subtitle.length}/120`} hint="Use 1 or 2 related keywords and mention 3-4 of the most important areas.">
        <TextInput
          value={subtitle}
          onChangeText={setSubtitle}
          maxLength={120}
          placeholderTextColor="#6A6F73"
          className={INPUT}
        />
      </Field>

      <Field label="Course description" hint="Describe what students will learn. Aim for at least 200 words.">
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#6A6F73"
          className={INPUT}
          style={{ minHeight: 180 }}
        />
      </Field>

      <Field label="Instructional level">
        <Chips
          options={levels.map((l) => ({ key: String(l.id), label: l.title }))}
          value={levelId}
          onChange={setLevelId}
        />
      </Field>

      <Field label="Language">
        <Chips
          options={languages.map((l) => ({ key: l.value, label: l.label }))}
          value={language}
          onChange={setLanguage}
        />
      </Field>

      <Field label="Categories">
        <CategoryPicker tree={tree} selected={categoryIds} onToggle={toggleCategory} flat={categories} />
      </Field>

      <MediaUpload
        kind="image"
        label="Course Image"
        description="Upload your course image here. It must meet our course image quality standards to be accepted. Important guidelines: 750x422 pixels; .jpg, .jpeg, .gif, or .png. No text on the image."
        path={coverPath}
        fileName={coverTitle}
        onPicked={async (file, setProgress) => {
          const data = await uploadCourseCoverImage(file, setProgress);
          setCoverId(data?.id ?? '');
          setCoverPath(file.uri);
          setCoverTitle(file.name);
        }}
      />

      <MediaUpload
        kind="video"
        label="Promotional Video"
        description="Your promo video is a quick and compelling way for students to preview what they'll learn in your course. Students considering your course are more likely to enroll if your promo video is well-made."
        path={course.promo_video?.path}
        fileName={course.promo_video?.title}
        disabledReason={course.uuid ? undefined : 'Save the course basics first to enable video upload.'}
        onPicked={async (file, setProgress) => {
          const data = await uploadCoursePromoVideo(String(course.uuid), file, setProgress);
          onSaved({ promo_video: data });
        }}
      />

      <Feedback error={error} ok={ok} />
      <PrimaryButton label={busy ? 'Saving…' : 'Save'} onPress={save} disabled={busy} />
    </View>
  );
}

/* ---------------- Intended learners ---------------- */

function ListEditor({
  title,
  description,
  items,
  setItems,
  placeholder,
}: {
  title: string;
  description: string;
  items: string[];
  setItems: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <View className="mb-8">
      <Text className="text-[17px] font-bold text-white">{title}</Text>
      <Text className="mb-3 mt-1 text-[14px] text-[#D1D7DC]">{description}</Text>
      {items.map((value, index) => (
        <View key={index} className="mb-3 flex-row items-center gap-2">
          <TextInput
            value={value}
            onChangeText={(v) => setItems(items.map((x, i) => (i === index ? v : x)))}
            maxLength={160}
            placeholder={placeholder}
            placeholderTextColor="#6A6F73"
            className={`${INPUT} flex-1`}
          />
          <Pressable
            onPress={() => setItems(items.filter((_, i) => i !== index))}
            className="rounded-md border border-[#6A6F73] px-3 py-3">
            <Text className="text-[16px] text-white">✕</Text>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={() => setItems([...items, ''])}>
        <Text className="text-[15px] font-bold" style={{ color: LAVENDER }}>
          + Add more to your response
        </Text>
      </Pressable>
    </View>
  );
}

export function IntendedLearnersSection({ course, onSaved }: Props) {
  const seed = (list?: string[], min = 1) => {
    const base = Array.isArray(list) && list.length ? list : [];
    return [...base, ...Array(Math.max(0, min - base.length)).fill('')];
  };
  const goals = course.goals || {};
  const [learn, setLearn] = useState<string[]>(seed(goals.what_you_will_learn_data, 4));
  const [reqs, setReqs] = useState<string[]>(seed(goals.requirements_data, 1));
  const [audience, setAudience] = useState<string[]>(seed(goals.who_should_attend_data, 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const save = async () => {
    setError('');
    setOk('');
    setBusy(true);
    const clean = (list: string[]) => list.map((x) => x.trim()).filter(Boolean);
    const payload = {
      what_you_will_learn_data: clean(learn),
      requirements_data: clean(reqs),
      who_should_attend_data: clean(audience),
    };
    try {
      const saved = await updateCourseGoals(course.id, payload);
      onSaved({ goals: saved?.what_you_will_learn_data ? saved : payload });
      setOk('Intended learners saved.');
    } catch (e) {
      setError(errorText(e, 'Unable to save intended learners.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Intro>
        The following descriptions will be publicly visible on your Course Landing Page and will have a direct impact on your course performance.
      </Intro>
      <ListEditor
        title="What will students learn in your course?"
        description="Enter at least 4 learning objectives or outcomes."
        items={learn}
        setItems={setLearn}
        placeholder="Example: Define the roles and responsibilities of a project manager"
      />
      <ListEditor
        title="What are the requirements or prerequisites?"
        description="List the required skills, experience, tools or equipment."
        items={reqs}
        setItems={setReqs}
        placeholder="Example: No programming experience needed"
      />
      <ListEditor
        title="Who is this course for?"
        description="Write a clear description of the intended learners."
        items={audience}
        setItems={setAudience}
        placeholder="Example: Beginner developers curious about data science"
      />
      <Feedback error={error} ok={ok} />
      <PrimaryButton label={busy ? 'Saving…' : 'Save'} onPress={save} disabled={busy} />
    </View>
  );
}

/* ---------------- Curriculum ---------------- */

const ITEM_TYPES = [
  { key: 'lecture', label: 'Lecture' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'coding_exercise', label: 'Coding exercise' },
  { key: 'assignment', label: 'Assignment' },
  { key: 'role_play', label: 'Role play' },
] as const;

type SectionForm = { id?: string | number; title: string; description: string };
type ItemForm = {
  id?: string | number;
  sectionId: string | number;
  type: string;
  title: string;
  description: string;
  preview: boolean;
};

export function CurriculumSection({
  course,
  onSections,
}: Props & { onSections: (sections: Course[]) => void }) {
  const [sections, setSections] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionForm, setSectionForm] = useState<SectionForm | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [contentItem, setContentItem] = useState<Course | null>(null);

  const load = useCallback(async () => {
    try {
      const secs = await fetchCourseSections(course.id);
      const full = await Promise.all(
        secs.map(async (s) => ({ ...s, curriculums: await fetchSectionCurriculums(s.id).catch(() => []) })),
      );
      setSections(full);
      onSections(full);
    } finally {
      setLoading(false);
    }
  }, [course.id, onSections]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setLoading(false));
    }, [load]),
  );

  const run = async (fn: () => Promise<unknown>, done: () => void) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      done();
      await load();
    } catch (e) {
      setError(errorText(e, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const submitSection = () => {
    if (!sectionForm?.title.trim()) return setError('Section title is required.');
    run(
      () =>
        saveSection(
          course.id,
          { title: sectionForm.title.trim(), description: sectionForm.description.trim() },
          sectionForm.id,
        ),
      () => setSectionForm(null),
    );
  };

  const submitItem = () => {
    if (!itemForm?.title.trim()) return setError('Title is required.');
    const payload: Course = {
      title: itemForm.title.trim(),
      description: itemForm.description.trim(),
      curriculum_type: itemForm.type,
      is_public_preview: itemForm.preview,
      unlock_type: 'immediate',
      unlock_at: null,
      prerequisite_lesson_id: null,
    };
    if (!itemForm.id) payload.course_section_id = itemForm.sectionId;
    run(() => saveCurriculum(payload, itemForm.id), () => setItemForm(null));
  };

  return (
    <View>
      <Intro>
        Start putting together your course by creating sections, lectures and practice (quizzes, coding exercises and assignments).
      </Intro>
      <Feedback error={sectionForm || itemForm ? '' : error} />
      {loading ? (
        <Empty>Loading curriculum…</Empty>
      ) : sections.length === 0 ? (
        <Empty>No sections yet.</Empty>
      ) : (
        sections.map((section, index) => (
          <View key={section.id} className="mb-5 rounded-lg border border-[#2D2F31] bg-[#1C1D1F] p-4">
            <Text className="text-[16px] font-bold text-white">
              Section {index + 1}: {section.title}
            </Text>
            {section.description ? (
              <Text className="mt-1 text-[13px] text-[#D1D7DC]">{section.description}</Text>
            ) : null}
            <View className="mt-3 flex-row gap-5">
              <Pressable
                onPress={() =>
                  setSectionForm({ id: section.id, title: section.title, description: section.description || '' })
                }>
                <Text className="text-[14px] font-bold" style={{ color: LAVENDER }}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => run(() => deleteSection(section.id), () => undefined)}>
                <Text className="text-[14px] font-bold text-danger">Delete</Text>
              </Pressable>
            </View>
            {(section.curriculums || []).map((item: Course, i: number) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  setItemForm({
                    id: item.id,
                    sectionId: section.id,
                    type: String(item.curriculum_type || 'lecture'),
                    title: item.title || '',
                    description: item.curriculum_description || item.description || '',
                    preview: Boolean(item.is_public_preview),
                  })
                }
                className="mt-3 flex-row items-center justify-between border-t border-[#2D2F31] pt-3">
                <View className="flex-1 pr-3">
                  <Text className="text-[15px] text-white">
                    {i + 1}. {item.title}
                  </Text>
                  <Text className="mt-0.5 text-[12px] capitalize text-[#6A6F73]">
                    {String(item.curriculum_type || 'lecture').replace('_', ' ')}
                    {item.is_public_preview ? ' · Preview' : ''}
                    {item.asset ? '' : ' · Missing content'}
                  </Text>
                </View>
                <Pressable onPress={() => setContentItem(item as any)} hitSlop={8} className="rounded-full border border-[#6A6F73] px-3 py-1.5">
                  <Text className="text-[12px] font-bold" style={{ color: LAVENDER }}>
                    {item.asset ? 'Edit content' : 'Add content'}
                  </Text>
                </Pressable>
              </Pressable>
            ))}
            <Pressable
              onPress={() =>
                setItemForm({ sectionId: section.id, type: 'lecture', title: '', description: '', preview: false })
              }
              className="mt-4">
              <Text className="text-[14px] font-bold" style={{ color: LAVENDER }}>
                + Curriculum item
              </Text>
            </Pressable>
          </View>
        ))
      )}
      <PrimaryButton
        label="+ Section"
        onPress={() => {
          setError('');
          setSectionForm({ title: '', description: '' });
        }}
      />
      {contentItem ? (
        <ContentEditor
          key={String(contentItem.id)}
          item={contentItem as any}
          onClose={() => setContentItem(null)}
          onChanged={() => {
            load().catch(() => undefined);
          }}
        />
      ) : null}

      <Sheet visible={!!sectionForm} title={sectionForm?.id ? 'Edit section' : 'New section'} onClose={() => setSectionForm(null)}>
        <TextInput
          value={sectionForm?.title || ''}
          onChangeText={(v) => setSectionForm((f) => f && { ...f, title: v })}
          placeholder="Enter a title"
          placeholderTextColor="#6A6F73"
          className={`${INPUT} mb-3`}
        />
        <TextInput
          value={sectionForm?.description || ''}
          onChangeText={(v) => setSectionForm((f) => f && { ...f, description: v })}
          placeholder="What will students be able to do at the end of this section?"
          placeholderTextColor="#6A6F73"
          className={`${INPUT} mb-3`}
        />
        <Feedback error={error} />
        <PrimaryButton label={busy ? 'Saving…' : 'Save'} onPress={submitSection} disabled={busy} />
      </Sheet>

      <Sheet visible={!!itemForm} title={itemForm?.id ? 'Edit item' : 'New item'} onClose={() => setItemForm(null)}>
        <Chips
          options={ITEM_TYPES}
          value={itemForm?.type || 'lecture'}
          onChange={(type) => !itemForm?.id && setItemForm((f) => f && { ...f, type })}
        />
        <TextInput
          value={itemForm?.title || ''}
          onChangeText={(v) => setItemForm((f) => f && { ...f, title: v })}
          placeholder="Enter a title"
          placeholderTextColor="#6A6F73"
          className={`${INPUT} mb-3`}
        />
        <TextInput
          value={itemForm?.description || ''}
          onChangeText={(v) => setItemForm((f) => f && { ...f, description: v })}
          placeholder="Description"
          placeholderTextColor="#6A6F73"
          multiline
          className={`${INPUT} mb-3`}
          style={{ minHeight: 80 }}
        />
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[15px] text-white">Free preview</Text>
          <Switch
            value={!!itemForm?.preview}
            onValueChange={(v) => setItemForm((f) => f && { ...f, preview: v })}
            trackColor={{ true: LAVENDER, false: '#2D2F31' }}
          />
        </View>
        <Feedback error={error} />
        <PrimaryButton label={busy ? 'Saving…' : 'Save'} onPress={submitItem} disabled={busy} />
        {itemForm?.id ? (
          <Pressable
            onPress={() => run(() => deleteCurriculum(itemForm.id as string | number), () => setItemForm(null))}
            className="mt-4 items-center">
            <Text className="text-[15px] font-bold text-danger">Delete item</Text>
          </Pressable>
        ) : null}
      </Sheet>
    </View>
  );
}

/* ---------------- Pricing ---------------- */

export function PricingSection({ course, onSaved }: Props) {
  const [tier, setTier] = useState(String(course.price_tier?.id || ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const save = async () => {
    setError('');
    setOk('');
    if (!tier) return setError('Select a price tier.');
    setBusy(true);
    try {
      const saved = await updateCoursePricing(course.uuid, tier);
      onSaved({ price_tier: saved?.price_tier || PRICE_TIERS.find((t) => t.id === tier) });
      setOk('Pricing saved successfully.');
    } catch (e) {
      setError(errorText(e, 'Unable to save pricing.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text className="mb-2 text-[16px] font-bold text-white">Set a price for your course</Text>
      <Intro>
        Select the price tier for your course. To offer it for free, it must have a total video length of less than 2 hours. Courses with practice tests cannot be free.
      </Intro>
      {PRICE_TIERS.map((t) => {
        const active = tier === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => setTier(t.id)}
            className={`mb-3 flex-row items-center justify-between rounded-md border px-4 py-3.5 ${active ? 'border-white' : 'border-[#2D2F31]'}`}>
            <Text className="text-[16px] text-white">{t.title}</Text>
            <Text className="text-[16px] font-bold" style={{ color: active ? LAVENDER : '#D1D7DC' }}>
              PHP {t.price}
            </Text>
          </Pressable>
        );
      })}
      <Feedback error={error} ok={ok} />
      <PrimaryButton label={busy ? 'Saving…' : 'Save'} onPress={save} disabled={busy} />
    </View>
  );
}

/* ---------------- Promotions ---------------- */

export function PromotionsSection({ course }: { course: Course }) {
  const [coupons, setCoupons] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [max, setMax] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setCoupons(await fetchCourseCoupons(course.uuid).catch(() => []));
  }, [course.uuid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const create = async () => {
    setError('');
    if (!code.trim()) return setError('Coupon code is required.');
    setBusy(true);
    try {
      await createCourseCoupon(course.uuid, {
        code: code.trim().toUpperCase(),
        salePrice: Number(price || 0),
        startAt: startAt.trim() ? new Date(startAt.trim()).toISOString() : null,
        endAt: endAt.trim() ? new Date(endAt.trim()).toISOString() : null,
        maxRedemptions: max ? Number(max) : null,
        couponType: 'CUSTOM_PRICE',
      });
      setOpen(false);
      setCode('');
      setPrice('');
      setStartAt('');
      setEndAt('');
      setMax('');
      await load();
    } catch (e) {
      setError(errorText(e, 'Unable to create coupon. Check the dates (YYYY-MM-DD) and values.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Intro>Create coupons to offer your course at a special price. Share the code with students.</Intro>
      <PrimaryButton label="Create coupon" onPress={() => setOpen(true)} />
      <SectionTitle>Active / scheduled coupons</SectionTitle>
      {coupons.length === 0 ? (
        <Empty>No coupons yet.</Empty>
      ) : (
        coupons.map((c) => (
          <View key={c.id} className="mb-3 rounded-lg border border-[#2D2F31] bg-[#1C1D1F] p-4">
            <Text className="text-[16px] font-bold text-white">{c.code}</Text>
            <Text className="mt-1 text-[13px] text-[#D1D7DC]">
              {php(c.salePrice)}
              {c.maxRedemptions ? ` · ${c.remainingRedemptions ?? c.maxRedemptions} of ${c.maxRedemptions} left` : ''}
            </Text>
            <Text className="mt-1 text-[12px] text-[#6A6F73]">
              {c.startAt ? fmtDate(c.startAt) : 'Now'} – {c.endAt ? fmtDate(c.endAt) : 'No end'}
            </Text>
          </View>
        ))
      )}
      <Sheet visible={open} title="Create coupon" onClose={() => setOpen(false)}>
        {[
          ['Coupon code', code, setCode, 'default'],
          ['Sale price (PHP)', price, setPrice, 'numeric'],
          ['Start date (YYYY-MM-DD, optional)', startAt, setStartAt, 'default'],
          ['End date (YYYY-MM-DD, optional)', endAt, setEndAt, 'default'],
          ['Max redemptions (optional)', max, setMax, 'numeric'],
        ].map(([label, value, setter, kb]) => (
          <TextInput
            key={label as string}
            value={value as string}
            onChangeText={setter as (v: string) => void}
            placeholder={label as string}
            keyboardType={kb as 'default' | 'numeric'}
            autoCapitalize="none"
            placeholderTextColor="#6A6F73"
            className={`${INPUT} mb-3`}
          />
        ))}
        <Feedback error={error} />
        <PrimaryButton label={busy ? 'Creating…' : 'Create'} onPress={create} disabled={busy} />
      </Sheet>
    </View>
  );
}

/* ---------------- Statistics ---------------- */

export function StatisticsSection({ course }: { course: Course }) {
  const [stats, setStats] = useState<Course | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchCourseStatistics(course.slug)
        .then(setStats)
        .catch(() => setStats({}));
    }, [course.slug]),
  );

  if (!stats) return <Empty>Loading statistics…</Empty>;
  const o = stats.overview || {};
  return (
    <StatGrid
      items={[
        { label: 'Total students', value: cnt(o.total_students) },
        { label: 'Enrollments this month', value: cnt(o.enrollments_this_month) },
        { label: 'Completion rate', value: `${Math.round(Number(o.completion_rate_pct || 0))}%` },
        { label: 'Average progress', value: `${Math.round(Number(o.average_progress_pct || 0))}%` },
        { label: 'Average rating', value: Number(o.average_rating || 0).toFixed(2) },
        { label: 'Total reviews', value: cnt(o.total_reviews) },
        { label: 'Total revenue', value: php(o.total_revenue) },
        { label: 'Revenue this month', value: php(o.revenue_this_month) },
        { label: 'Impressions', value: cnt(o.total_impressions) },
        { label: 'Unique visitors', value: cnt(o.unique_impression_visitors) },
      ]}
    />
  );
}

/* ---------------- Students ---------------- */

export function StudentsSection({ course }: { course: Course }) {
  const [data, setData] = useState<{ rows: Course[]; stats: Course } | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchCourseStudents(course.slug)
        .then(setData)
        .catch(() => setData({ rows: [], stats: {} }));
    }, [course.slug]),
  );

  if (!data) return <Empty>Loading students…</Empty>;
  return (
    <View>
      <StatGrid
        items={[
          { label: 'Total students', value: cnt(data.stats.total_students ?? data.rows.length) },
          { label: 'Average progress', value: `${Math.round(Number(data.stats.average_progress_pct || 0))}%` },
          { label: 'New this month', value: cnt(data.stats.increase_this_month) },
        ]}
      />
      <SectionTitle>Students</SectionTitle>
      {data.rows.length === 0 ? (
        <Empty>No students enrolled yet.</Empty>
      ) : (
        data.rows.map((row, i) => {
          const s = row.student || {};
          const name = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.name || s.email || 'Student';
          const progress = Math.round(Number(row.progress?.progress_pct ?? row.progress ?? 0)) || 0;
          return (
            <View key={row.enrollment_id || i} className="mb-3 rounded-lg border border-[#2D2F31] bg-[#1C1D1F] p-4">
              <Text className="text-[15px] font-bold text-white">{name}</Text>
              {s.email ? <Text className="mt-0.5 text-[13px] text-[#D1D7DC]">{s.email}</Text> : null}
              <Text className="mt-1 text-[12px] text-[#6A6F73]">
                Enrolled {fmtDate(row.enrollment_date)} · {progress}% complete
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ---------------- Reviews ---------------- */

export function ReviewsSection({ course }: { course: Course }) {
  const [data, setData] = useState<{ rows: Course[]; summary: Course } | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchCourseReviews(course.slug)
        .then(setData)
        .catch(() => setData({ rows: [], summary: {} }));
    }, [course.slug]),
  );

  if (!data) return <Empty>Loading reviews…</Empty>;
  return (
    <View>
      <StatGrid
        items={[
          { label: 'Average rating', value: Number(data.summary.averageRating || 0).toFixed(2) },
          { label: 'Total reviews', value: cnt(data.summary.totalReviews) },
        ]}
      />
      <SectionTitle>Reviews</SectionTitle>
      {data.rows.length === 0 ? (
        <Empty>No reviews yet.</Empty>
      ) : (
        data.rows.map((r, i) => {
          const a = r.author || {};
          const name = typeof a === 'string' ? a : [a.first_name, a.last_name].filter(Boolean).join(' ') || a.name || 'Student';
          return (
            <View key={r.id || i} className="mb-3 rounded-lg border border-[#2D2F31] bg-[#1C1D1F] p-4">
              <View className="flex-row justify-between">
                <Text className="text-[15px] font-bold text-white">{name}</Text>
                <Text style={{ color: LAVENDER }}>★ {Number(r.rating || 0).toFixed(1)}</Text>
              </View>
              {r.title ? <Text className="mt-1 text-[14px] text-white">{r.title}</Text> : null}
              {r.comment ? <Text className="mt-1 text-[14px] text-[#D1D7DC]">{r.comment}</Text> : null}
              <Text className="mt-2 text-[12px] text-[#6A6F73]">{fmtDate(r.createdAt)}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ---------------- Course messages ---------------- */

export function MessagesSection({ course, onSaved }: Props) {
  const [welcome, setWelcome] = useState(String(course.welcome_message || course.welcomeMessage || ''));
  const [congrats, setCongrats] = useState(
    String(course.congratulations_message || course.congratulationsMessage || ''),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const save = async () => {
    setError('');
    setOk('');
    setBusy(true);
    try {
      const saved = await updateCourseMessages(course.id, {
        welcome_message: welcome,
        congratulations_message: congrats,
      });
      onSaved({
        welcome_message: saved.welcome_message ?? welcome,
        congratulations_message: saved.congratulations_message ?? congrats,
      });
      setOk('Course messages updated.');
    } catch (e) {
      setError(errorText(e, 'Failed to update course messages.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Intro>
        Write messages to your students (optional) that will be sent automatically when they join or complete your course. Leave a box blank to skip that message.
      </Intro>
      <Field label="Welcome message">
        <TextInput
          value={welcome}
          onChangeText={setWelcome}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#6A6F73"
          className={INPUT}
          style={{ minHeight: 130 }}
        />
      </Field>
      <Field label="Congratulations message">
        <TextInput
          value={congrats}
          onChangeText={setCongrats}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#6A6F73"
          className={INPUT}
          style={{ minHeight: 130 }}
        />
      </Field>
      <Feedback error={error} ok={ok} />
      <PrimaryButton label={busy ? 'Saving…' : 'Save'} onPress={save} disabled={busy} />
    </View>
  );
}

/* ---------------- Community ---------------- */

export function CommunitySection({ course }: { course: Course }) {
  return (
    <View>
      <Intro>Manage the discussion space for your students.</Intro>
      <InfoRow label="Course" value={String(course.title || '')} />
      <Empty>Community moderation and settings are available on the web editor for now.</Empty>
    </View>
  );
}
