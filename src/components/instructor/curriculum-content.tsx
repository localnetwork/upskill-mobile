import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chips, Empty, LAVENDER, OutlineButton, PrimaryButton } from '@/components/dark-ui';
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
import {
  deleteLectureContent,
  fetchAssignment,
  fetchRolePlay,
  generateRolePlay,
  saveArticleContent,
  saveAssignment,
  saveCodingExercise,
  saveQuizQuestions,
  saveRolePlay,
  uploadLectureVideo,
} from '@/lib/upskill-api';

type Rec = Record<string, any>;
type Props = { item: Rec & { id: string | number }; onClose: () => void; onChanged: () => void };

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const PH = '#6A6F73';

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mb-4 rounded-lg border border-[#2D2F31] bg-[#1C1D1F] p-4">{children}</View>;
}

function Link({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text className={`text-[14px] font-bold ${danger ? 'text-danger' : ''}`} style={danger ? undefined : { color: LAVENDER }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  multiline,
  height,
  mono,
  numeric,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  height?: number;
  mono?: boolean;
  numeric?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={PH}
      multiline={multiline}
      keyboardType={numeric ? 'numeric' : 'default'}
      textAlignVertical={multiline ? 'top' : 'center'}
      autoCapitalize={mono ? 'none' : 'sentences'}
      autoCorrect={!mono}
      className={`${INPUT} mb-3`}
      style={[multiline ? { minHeight: height || 100 } : null, mono ? { fontFamily: 'monospace' } : null]}
    />
  );
}

function useSaver() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const run = async (fn: () => Promise<unknown>, success: string, fallback = 'Unable to save. Please try again.') => {
    setError('');
    setOk('');
    setBusy(true);
    try {
      await fn();
      setOk(success);
      return true;
    } catch (e) {
      setError(errorText(e, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, ok, run, setError, setOk };
}

/* ---------------- Lecture (video / article) ---------------- */

function LectureContent({ item, onChanged }: Props) {
  const [current, setCurrent] = useState<Rec>(item);
  const resource = String(current.curriculum_resource_type || '');
  const [mode, setMode] = useState<'choose' | 'video' | 'article'>(
    resource === 'video' || resource === 'article' ? resource : 'choose',
  );
  const [text, setText] = useState(htmlToText(item.asset?.content || ''));
  const s = useSaver();

  const merge = (data: Rec) => {
    setCurrent((c) => ({ ...c, ...(data.curriculum || {}), asset: data.asset ?? c.asset }));
    onChanged();
  };

  const saveArticle = () => {
    if (!text.trim()) return s.setError('Article content cannot be empty.');
    s.run(async () => merge(await saveArticleContent(item.id, textToHtml(text))), 'Article saved successfully.');
  };

  const removeContent = (type: 'video' | 'article') =>
    s.run(
      async () => {
        await deleteLectureContent(type, item.id);
        setCurrent((c) => ({ ...c, asset: null, curriculum_resource_type: null }));
        setText('');
        setMode('choose');
        onChanged();
      },
      'Content deleted.',
      'Unable to delete content.',
    );

  if (mode === 'choose') {
    return (
      <View>
        <Text className="mb-4 text-[18px] font-bold text-white">Choose lecture type</Text>
        {(
          [
            ['video', 'Video', 'Upload an MP4, WebM or MOV file.'],
            ['article', 'Article', 'Write a text lecture.'],
          ] as const
        ).map(([key, label, hint]) => (
          <Pressable
            key={key}
            onPress={() => setMode(key)}
            className="mb-3 rounded-lg border border-[#3E4143] bg-[#1C1D1F] p-5 active:opacity-70">
            <Text className="text-[17px] font-bold text-white">{label}</Text>
            <Text className="mt-1 text-[14px] text-[#D1D7DC]">{hint}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  const hasContent = Boolean(current.asset);
  return (
    <View>
      {!hasContent ? (
        <Pressable onPress={() => setMode('choose')} className="mb-4">
          <Text className="text-[14px] font-bold" style={{ color: LAVENDER }}>
            ‹ Back to lecture types
          </Text>
        </Pressable>
      ) : null}
      {mode === 'article' ? (
        <View>
          <Field label="Article content">
            <Input value={text} onChange={setText} multiline height={280} placeholder="Write your article…" />
          </Field>
          <Feedback error={s.error} ok={s.ok} />
          <PrimaryButton label={s.busy ? 'Saving…' : 'Save article'} onPress={saveArticle} disabled={s.busy} />
        </View>
      ) : (
        <View>
          <MediaUpload
            kind="video"
            label="Upload video"
            description="Upload your video file here. Accepted formats: MP4, WebM, MOV."
            path={current.asset?.path}
            fileName={current.asset?.original_name}
            onPicked={async (file, setProgress) => {
              merge(await uploadLectureVideo(item.id, file, setProgress));
            }}
          />
        </View>
      )}
      {hasContent ? (
        <View className="mt-6 items-center">
          <Link label="Delete content" danger onPress={() => removeContent(mode === 'video' ? 'video' : 'article')} />
          {mode === 'video' ? <Feedback error={s.error} ok={s.ok} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/* ---------------- Quiz ---------------- */

const Q_TYPES = [
  { key: 'multiple_choice', label: 'Multiple choice' },
  { key: 'fill_in_the_blanks', label: 'Fill in the blanks' },
  { key: 'true_false', label: 'True / False' },
  { key: 'short_answer', label: 'Short answer' },
] as const;

function newQuestion(type = 'multiple_choice'): Rec {
  return {
    id: uid('q'),
    type,
    prompt: '',
    options:
      type === 'multiple_choice'
        ? [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ]
        : [],
    acceptedAnswers: type === 'fill_in_the_blanks' || type === 'short_answer' ? [''] : [],
    correctAnswer: type === 'true_false' ? true : null,
    hint: '',
    explanation: '',
  };
}

function QuizContent({ item, onChanged }: Props) {
  const [questions, setQuestions] = useState<Rec[]>(
    Array.isArray(item.asset?.questions)
      ? item.asset.questions.map((q: Rec) => ({ ...newQuestion(q.type), ...q }))
      : [],
  );
  const s = useSaver();

  const canSave = useMemo(
    () =>
      questions.length > 0 &&
      questions.every((q) => {
        if (!String(q.prompt || '').trim()) return false;
        if (q.type === 'multiple_choice') {
          const o: Rec[] = q.options || [];
          return o.length >= 2 && o.some((x) => x.isCorrect) && o.every((x) => String(x.text || '').trim());
        }
        if (q.type === 'fill_in_the_blanks' || q.type === 'short_answer') {
          return (q.acceptedAnswers || []).some((a: string) => String(a || '').trim());
        }
        return true;
      }),
    [questions],
  );

  const update = (id: string, patch: Rec) =>
    setQuestions((list) => list.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const save = () =>
    s.run(async () => {
      await saveQuizQuestions(item, questions);
      onChanged();
    }, 'Quiz saved.');

  return (
    <View>
      <Intro>Add questions for learners to answer. Every question needs a prompt and a correct answer.</Intro>
      {questions.map((q, index) => (
        <Card key={q.id}>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[16px] font-bold text-white">Question {index + 1}</Text>
            <Link label="Remove" danger onPress={() => setQuestions((l) => l.filter((x) => x.id !== q.id))} />
          </View>
          <Chips
            options={Q_TYPES}
            value={q.type}
            onChange={(type) => setQuestions((l) => l.map((x) => (x.id === q.id ? { ...newQuestion(type), id: q.id, prompt: q.prompt } : x)))}
          />
          <Input value={q.prompt} onChange={(v) => update(q.id, { prompt: v })} placeholder="Question prompt" multiline height={70} />
          <Input value={q.hint || ''} onChange={(v) => update(q.id, { hint: v })} placeholder="Hint (optional)" />
          <Input
            value={q.explanation || ''}
            onChange={(v) => update(q.id, { explanation: v })}
            placeholder="Explanation shown after validation (optional)"
          />

          {q.type === 'multiple_choice' ? (
            <View>
              {(q.options || []).map((o: Rec, oi: number) => (
                <View key={oi} className="mb-3 flex-row items-center gap-2">
                  <Pressable
                    onPress={() =>
                      update(q.id, { options: q.options.map((x: Rec, i: number) => (i === oi ? { ...x, isCorrect: !x.isCorrect } : x)) })
                    }>
                    <Text className="text-[22px]" style={{ color: o.isCorrect ? LAVENDER : PH }}>
                      {o.isCorrect ? '☑' : '☐'}
                    </Text>
                  </Pressable>
                  <TextInput
                    value={o.text}
                    onChangeText={(v) =>
                      update(q.id, { options: q.options.map((x: Rec, i: number) => (i === oi ? { ...x, text: v } : x)) })
                    }
                    placeholder={`Option ${oi + 1}`}
                    placeholderTextColor={PH}
                    className={`${INPUT} flex-1`}
                  />
                  {q.options.length > 2 ? (
                    <Link label="✕" danger onPress={() => update(q.id, { options: q.options.filter((_: Rec, i: number) => i !== oi) })} />
                  ) : null}
                </View>
              ))}
              <Link
                label="+ Add option"
                onPress={() => update(q.id, { options: [...q.options, { text: '', isCorrect: false }] })}
              />
              <Text className="mt-2 text-[12px] text-[#6A6F73]">Tick the correct option(s).</Text>
            </View>
          ) : null}

          {q.type === 'true_false' ? (
            <Chips
              options={[
                { key: 'true', label: 'True' },
                { key: 'false', label: 'False' },
              ]}
              value={q.correctAnswer === false ? 'false' : 'true'}
              onChange={(v) => update(q.id, { correctAnswer: v === 'true' })}
            />
          ) : null}

          {q.type === 'fill_in_the_blanks' || q.type === 'short_answer' ? (
            <View>
              <Text className="mb-2 text-[13px] text-[#D1D7DC]">Accepted answers</Text>
              {(q.acceptedAnswers || []).map((a: string, ai: number) => (
                <View key={ai} className="mb-3 flex-row items-center gap-2">
                  <TextInput
                    value={a}
                    onChangeText={(v) =>
                      update(q.id, { acceptedAnswers: q.acceptedAnswers.map((x: string, i: number) => (i === ai ? v : x)) })
                    }
                    placeholder="Accepted answer"
                    placeholderTextColor={PH}
                    className={`${INPUT} flex-1`}
                  />
                  {q.acceptedAnswers.length > 1 ? (
                    <Link
                      label="✕"
                      danger
                      onPress={() => update(q.id, { acceptedAnswers: q.acceptedAnswers.filter((_: string, i: number) => i !== ai) })}
                    />
                  ) : null}
                </View>
              ))}
              <Link label="+ Add answer" onPress={() => update(q.id, { acceptedAnswers: [...q.acceptedAnswers, ''] })} />
            </View>
          ) : null}
        </Card>
      ))}
      <View className="mb-5 flex-row flex-wrap gap-2">
        {Q_TYPES.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setQuestions((l) => [...l, newQuestion(t.key)])}
            className="rounded-full border border-[#6A6F73] px-3.5 py-2">
            <Text className="text-[13px] font-bold text-[#D1D7DC]">+ {t.label}</Text>
          </Pressable>
        ))}
      </View>
      {!canSave && questions.length ? (
        <Text className="mb-3 text-[13px] text-[#6A6F73]">
          Complete every question (prompt and correct answer) to save.
        </Text>
      ) : null}
      <Feedback error={s.error} ok={s.ok} />
      <PrimaryButton label={s.busy ? 'Saving…' : 'Save quiz'} onPress={save} disabled={!canSave || s.busy} />
    </View>
  );
}

/* ---------------- Coding exercise ---------------- */

const LANGS = [
  'html', 'css', 'javascript', 'typescript', 'python', 'java', 'php', 'go',
  'csharp', 'c', 'cpp', 'ruby', 'rust', 'kotlin', 'swift', 'sql',
];
const CHECK_TYPES = [
  { key: 'contains', label: 'Contains' },
  { key: 'regex', label: 'Regex' },
  { key: 'exact', label: 'Exact code' },
  { key: 'output', label: 'Run output' },
] as const;
const HTML_TEMPLATE = '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My page</title>\n  </head>\n  <body>\n  </body>\n</html>';

function checkToValidator(c: Rec) {
  const base = {
    id: c.id,
    name: c.name || 'Check',
    visibility: c.visibility || 'VISIBLE',
    expected_output: c.value,
    input: c.input || '',
  };
  if (c.type === 'regex') return { ...base, mode: 'CODE_INCLUDES', comparison_mode: 'REGEX' };
  if (c.type === 'exact') return { ...base, mode: 'EXACT_CODE', comparison_mode: 'EXACT' };
  if (c.type === 'output') return { ...base, mode: 'RUN_OUTPUT', comparison_mode: 'EXACT' };
  return { ...base, mode: 'CODE_INCLUDES', comparison_mode: 'INCLUDES' };
}

function validatorToCheck(v: Rec, i: number): Rec {
  const mode = String(v?.mode || 'CODE_INCLUDES').toUpperCase();
  const cmp = String(v?.comparison_mode || v?.comparisonMode || 'EXACT').toUpperCase();
  let type = 'contains';
  if (mode === 'RUN_OUTPUT') type = 'output';
  else if (mode === 'EXACT_CODE') type = 'exact';
  else if (cmp === 'REGEX') type = 'regex';
  return {
    id: v?.id || uid('check'),
    name: v?.name || `Check ${i + 1}`,
    type,
    value: String(v?.expected_output ?? v?.expectedOutput ?? ''),
    input: String(v?.input || ''),
    visibility: v?.visibility || 'VISIBLE',
  };
}

function hydrateStep(step: Rec, i: number): Rec {
  let checks: Rec[] = [];
  if (Array.isArray(step?.validators) && step.validators.length) checks = step.validators.map(validatorToCheck);
  else if (step?.expected_output || step?.expectedOutput) checks = [validatorToCheck(step, 0)];
  return {
    id: step?.id || uid('step'),
    title: step?.title || `Step ${i + 1}`,
    instruction: step?.instruction || step?.instructions || '',
    starter_code: step?.starter_code || step?.starterCode || '',
    preview_html: step?.preview_html || step?.previewHtml || '',
    hintsText: (Array.isArray(step?.hints) ? step.hints : []).join('\n---\n'),
    checks,
  };
}

function serializeStep(step: Rec, index: number) {
  const validators = step.checks.filter((c: Rec) => String(c.value || '').trim()).map(checkToValidator);
  const first = validators[0];
  return {
    id: step.id,
    step_number: index + 1,
    title: step.title || `Step ${index + 1}`,
    instruction: step.instruction,
    starter_code: step.starter_code,
    ...(step.preview_html ? { preview_html: step.preview_html } : {}),
    hints: String(step.hintsText || '')
      .split(/\n\s*---\s*\n/)
      .map((h) => h.trim())
      .filter(Boolean),
    validators,
    validation_mode: first?.mode || 'CODE_INCLUDES',
    comparison_mode: first?.comparison_mode || 'INCLUDES',
    expected_output: first?.expected_output || '',
  };
}

function parseAsset(value: unknown): Rec {
  const fallback = { languages: ['html'], hints: [], step_challenges: {} };
  if (!value) return fallback;
  try {
    return typeof value === 'object' ? (value as Rec) : JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function CodingContent({ item, onChanged }: Props) {
  const asset = useMemo(() => parseAsset(item.asset), [item.asset]);
  const initialLangs: string[] = Array.isArray(asset.languages) && asset.languages.length ? asset.languages : ['html'];
  const [title, setTitle] = useState<string>(item.title || 'Untitled Step Challenge');
  const [languages, setLanguages] = useState<string[]>(initialLangs);
  const [active, setActive] = useState(initialLangs[0]);
  const [hints, setHints] = useState<string>(Array.isArray(asset.hints) ? asset.hints.join('\n') : '');
  const [steps, setSteps] = useState<Record<string, Rec[]>>(() => {
    const raw = asset.step_challenges && typeof asset.step_challenges === 'object' ? asset.step_challenges : {};
    const out: Record<string, Rec[]> = {};
    for (const [lang, list] of Object.entries(raw)) {
      out[lang] = (Array.isArray(list) ? (list as Rec[]) : [])
        .slice()
        .sort((a, b) => Number(a?.step_number || 0) - Number(b?.step_number || 0))
        .map(hydrateStep);
    }
    return out;
  });
  const [selected, setSelected] = useState<string | null>(null);
  const s = useSaver();

  const list = steps[active] || [];
  const step = list.find((x) => x.id === selected) || null;
  const markup = active === 'html' || active === 'css';

  const setList = (fn: (l: Rec[]) => Rec[]) => setSteps((p) => ({ ...p, [active]: fn(p[active] || []) }));
  const patchStep = (id: string, patch: Rec) => setList((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addStep = () => {
    const created = {
      id: uid('step'),
      title: `Step ${list.length + 1}`,
      instruction: '',
      starter_code: active === 'html' && !list.length ? HTML_TEMPLATE : '',
      preview_html: '',
      hintsText: '',
      checks: [],
    };
    setList((l) => [...l, created]);
    setSelected(created.id);
  };

  const move = (id: string, dir: number) =>
    setList((l) => {
      const i = l.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const toggleLang = (lang: string) =>
    setLanguages((prev) => {
      const next = prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang];
      if (!next.length) return prev;
      if (!next.includes(active)) setActive(next[0]);
      return next;
    });

  const validate = () => {
    for (const lang of languages) {
      const l = steps[lang] || [];
      for (let i = 0; i < l.length; i += 1) {
        const label = `${lang.toUpperCase()} - Step ${i + 1}`;
        if (!String(l[i].instruction || '').trim()) return `${label}: add an instruction for the learner.`;
        const filled = l[i].checks.filter((c: Rec) => String(c.value || '').trim());
        if (!filled.length) return `${label}: add at least one check.`;
        for (const c of filled) {
          if (c.type === 'regex') {
            try {
              new RegExp(c.value);
            } catch {
              return `${label}: "${c.name}" has an invalid regex pattern.`;
            }
          }
        }
      }
    }
    return '';
  };

  const save = async (status: 'Draft' | 'Published') => {
    if (!title.trim()) return s.setError('Title is required.');
    const problem = status === 'Published' ? validate() : '';
    if (problem) return s.setError(problem);
    const challenges: Rec = {};
    for (const lang of languages) challenges[lang] = (steps[lang] || []).map(serializeStep);
    const first = challenges[languages[0]]?.[0];
    await s.run(
      async () => {
        await saveCodingExercise(item, {
          title: title.trim(),
          instructions: first?.instruction || '',
          starterCode: {
            languages,
            hints: hints.split(/\r?\n/).map((h) => h.trim()).filter(Boolean),
            step_challenges: challenges,
            metadata: { status },
          },
        });
        onChanged();
      },
      status === 'Published' ? 'Exercise published.' : 'Draft saved.',
    );
  };

  return (
    <View>
      <Intro>Build step-by-step coding challenges. Learners write code and each step is validated by your checks.</Intro>
      <Field label="Title">
        <Input value={title} onChange={setTitle} placeholder="Exercise title" />
      </Field>
      <Field label="Languages learners can use">
        <View className="flex-row flex-wrap gap-2">
          {LANGS.map((l) => {
            const on = languages.includes(l);
            return (
              <Pressable
                key={l}
                onPress={() => toggleLang(l)}
                className={`rounded-full border px-3.5 py-2 ${on ? 'border-white bg-white' : 'border-[#6A6F73]'}`}>
                <Text className={`text-[13px] font-bold ${on ? 'text-black' : 'text-[#D1D7DC]'}`}>{l.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>
      <Field label="General hints" hint="One hint per line.">
        <Input value={hints} onChange={setHints} multiline height={70} />
      </Field>

      {languages.length > 1 ? (
        <Chips
          options={languages.map((l) => ({ key: l, label: l.toUpperCase() }))}
          value={active}
          onChange={(l) => {
            setActive(l);
            setSelected(null);
          }}
        />
      ) : null}

      <Text className="mb-3 mt-2 text-[17px] font-bold text-white">Steps ({active.toUpperCase()})</Text>
      {list.length === 0 ? <Empty>No steps yet.</Empty> : null}
      {list.map((st, i) => (
        <Pressable
          key={st.id}
          onPress={() => setSelected(selected === st.id ? null : st.id)}
          className={`mb-2 rounded-md border px-4 py-3 ${selected === st.id ? 'border-white' : 'border-[#2D2F31]'}`}>
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-[15px] text-white" numberOfLines={1}>
              {i + 1}. {st.title}
            </Text>
            <Text className="text-[12px] text-[#6A6F73]">{st.checks.length} checks</Text>
          </View>
        </Pressable>
      ))}
      <View className="mb-4 mt-1">
        <Link label="+ Add step" onPress={addStep} />
      </View>

      {step ? (
        <Card>
          <View className="mb-3 flex-row gap-5">
            <Link label="↑ Up" onPress={() => move(step.id, -1)} />
            <Link label="↓ Down" onPress={() => move(step.id, 1)} />
            <Link
              label="Delete step"
              danger
              onPress={() => {
                setList((l) => l.filter((x) => x.id !== step.id));
                setSelected(null);
              }}
            />
          </View>
          <Field label="Step title">
            <Input value={step.title} onChange={(v) => patchStep(step.id, { title: v })} />
          </Field>
          <Field label="Instruction">
            <Input value={step.instruction} onChange={(v) => patchStep(step.id, { instruction: v })} multiline height={90} />
          </Field>
          <Field label="Starter code">
            <Input value={step.starter_code} onChange={(v) => patchStep(step.id, { starter_code: v })} multiline height={140} mono />
          </Field>
          {active === 'css' ? (
            <Field label="Preview HTML" hint="HTML the CSS is applied to in the preview.">
              <Input value={step.preview_html} onChange={(v) => patchStep(step.id, { preview_html: v })} multiline height={90} mono />
            </Field>
          ) : null}
          <Field label="Step hints" hint="Separate hints with a line containing ---">
            <Input value={step.hintsText} onChange={(v) => patchStep(step.id, { hintsText: v })} multiline height={70} />
          </Field>

          <Text className="mb-2 text-[15px] font-bold text-white">Checks</Text>
          {step.checks.map((c: Rec) => {
            const setCheck = (patch: Rec) =>
              patchStep(step.id, { checks: step.checks.map((x: Rec) => (x.id === c.id ? { ...x, ...patch } : x)) });
            return (
              <View key={c.id} className="mb-3 rounded-md border border-[#2D2F31] p-3">
                <Input value={c.name} onChange={(v) => setCheck({ name: v })} placeholder="Check name" />
                <Chips
                  options={CHECK_TYPES.filter((t) => !markup || t.key !== 'output')}
                  value={c.type}
                  onChange={(type) => setCheck({ type })}
                />
                <Input
                  value={c.value}
                  onChange={(v) => setCheck({ value: v })}
                  placeholder={c.type === 'output' ? 'Expected output' : c.type === 'regex' ? 'Regex pattern' : 'Expected code'}
                  multiline
                  height={60}
                  mono
                />
                {c.type === 'output' ? <Input value={c.input} onChange={(v) => setCheck({ input: v })} placeholder="Input (optional)" /> : null}
                <Chips
                  options={[
                    { key: 'VISIBLE', label: 'Visible' },
                    { key: 'HIDDEN', label: 'Hidden' },
                  ]}
                  value={c.visibility === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE'}
                  onChange={(visibility) => setCheck({ visibility })}
                />
                <Link
                  label="Remove check"
                  danger
                  onPress={() => patchStep(step.id, { checks: step.checks.filter((x: Rec) => x.id !== c.id) })}
                />
              </View>
            );
          })}
          <Link
            label="+ Add check"
            onPress={() =>
              patchStep(step.id, {
                checks: [
                  ...step.checks,
                  { id: uid('check'), name: `Check ${step.checks.length + 1}`, type: 'contains', value: '', input: '', visibility: 'VISIBLE' },
                ],
              })
            }
          />
        </Card>
      ) : null}

      <Feedback error={s.error} ok={s.ok} />
      <View className="gap-3">
        <PrimaryButton label={s.busy ? 'Saving…' : 'Publish'} onPress={() => save('Published')} disabled={s.busy} />
        <OutlineButton label="Save draft" onPress={() => save('Draft')} />
      </View>
    </View>
  );
}

/* ---------------- Assignment ---------------- */

const A_TABS = [
  { key: 'basic', label: 'Basic info' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'questions', label: 'Questions' },
  { key: 'solutions', label: 'Solutions' },
] as const;

function assignmentForm(c: Rec) {
  const a = c.asset || {};
  return {
    title: c.title || '',
    description: htmlToText(c.curriculum_description || ''),
    duration: c.estimated_duration ? String(Math.round(c.estimated_duration / 60)) : '',
    status: a.status || 'DRAFT',
    instructions: htmlToText(a.instructions?.text || ''),
    questions: (a.questions || []).map((q: Rec) => ({ ...q, text: htmlToText(q.body) })) as Rec[],
    answers: Object.fromEntries(
      Object.entries(a.solutions?.answers || {}).map(([k, v]) => [k, htmlToText(String(v))]),
    ) as Record<string, string>,
    raw: a,
  };
}

function AssignmentContent({ item, onChanged }: Props) {
  const [tab, setTab] = useState<(typeof A_TABS)[number]['key']>('basic');
  const [form, setForm] = useState<ReturnType<typeof assignmentForm> | null>(null);
  const [failed, setFailed] = useState(false);
  const s = useSaver();

  useEffect(() => {
    fetchAssignment(item.id)
      .then((c) => setForm(assignmentForm(c)))
      .catch(() => setFailed(true));
  }, [item.id]);

  if (failed) return <Empty>Unable to load this assignment.</Empty>;
  if (!form) return <Empty>Loading assignment…</Empty>;

  const patch = (p: Partial<typeof form>) => setForm((f) => (f ? { ...f, ...p } : f));
  const published = form.status === 'PUBLISHED';

  const issues = [
    !form.title.trim() && 'You need to have a title.',
    !form.description.trim() && 'You need to have a description.',
    !(Number(form.duration) >= 1) && 'You need to estimate the duration of your assignment.',
    !form.instructions.trim() && !form.raw.instructions?.video && 'You need to have instruction text or video.',
    form.questions.length === 0 && 'You need to have at least 1 question.',
  ].filter(Boolean) as string[];

  const save = (publish?: boolean) => {
    if (publish && issues.length) return s.setError(issues[0]);
    return s.run(
      async () => {
        const data = await saveAssignment(item.id, {
          basic: {
            title: form.title,
            description: textToHtml(form.description),
            duration_minutes: Number(form.duration) || 0,
          },
          assignment: {
            instructions: { ...(form.raw.instructions || {}), text: textToHtml(form.instructions) },
            questions: form.questions.map(({ text, ...q }) => ({ ...q, body: textToHtml(String(text || '')) })),
            solutions: {
              ...(form.raw.solutions || {}),
              answers: Object.fromEntries(
                Object.entries(form.answers)
                  .filter(([, v]) => v.trim())
                  .map(([k, v]) => [k, textToHtml(v)]),
              ),
            },
          },
          ...(publish === undefined ? {} : { publish }),
        });
        setForm(assignmentForm(data));
        onChanged();
      },
      publish === true ? 'Assignment published.' : publish === false ? 'Assignment unpublished.' : 'Saved.',
    );
  };

  return (
    <View>
      <View className="mb-4 self-start rounded-full bg-[#2D2F31] px-3 py-1">
        <Text className="text-[12px] font-bold text-white">{published ? 'Published' : 'Draft'}</Text>
      </View>
      <Chips options={A_TABS} value={tab} onChange={setTab} />

      {tab === 'basic' ? (
        <View>
          <Field label="Title" counter={`${form.title.length}/120`}>
            <Input value={form.title} onChange={(v) => patch({ title: v.slice(0, 120) })} placeholder="Title" />
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={(v) => patch({ description: v })} multiline height={110} />
          </Field>
          <Field label="Estimated duration (minutes)">
            <Input value={form.duration} onChange={(v) => patch({ duration: v.replace(/\D/g, '') })} numeric />
          </Field>
        </View>
      ) : null}

      {tab === 'instructions' ? (
        <View>
          <Field label="Assignment instructions">
            <Input value={form.instructions} onChange={(v) => patch({ instructions: v })} multiline height={200} />
          </Field>
          <Text className="mb-3 text-[13px] text-[#6A6F73]">
            Instruction video and downloadable resources can be managed from the web editor.
          </Text>
        </View>
      ) : null}

      {tab === 'questions' ? (
        <View>
          {form.questions.map((q, i) => (
            <Card key={q.id}>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-[15px] font-bold text-white">Question {i + 1}</Text>
                <Link
                  label="Delete"
                  danger
                  onPress={() => {
                    if (published && form.questions.length <= 1) {
                      return s.setError('You cannot delete the final question of a published assignment.');
                    }
                    patch({ questions: form.questions.filter((x) => x.id !== q.id) });
                  }}
                />
              </View>
              <Input
                value={q.text}
                onChange={(v) => patch({ questions: form.questions.map((x) => (x.id === q.id ? { ...x, text: v } : x)) })}
                multiline
                height={90}
              />
            </Card>
          ))}
          <OutlineButton
            label="+ Add question"
            onPress={() => patch({ questions: [...form.questions, { id: `q${Date.now()}`, body: '', text: '' }] })}
          />
        </View>
      ) : null}

      {tab === 'solutions' ? (
        <View>
          {form.questions.length === 0 ? (
            <Empty>Add questions first to provide answers.</Empty>
          ) : (
            form.questions.map((q, i) => (
              <Card key={q.id}>
                <Text className="mb-2 text-[14px] text-[#D1D7DC]">
                  {i + 1}. {q.text || '(empty question)'}
                </Text>
                <Input
                  value={form.answers[q.id] || ''}
                  onChange={(v) => patch({ answers: { ...form.answers, [q.id]: v } })}
                  placeholder="Your answer"
                  multiline
                  height={80}
                />
              </Card>
            ))
          )}
        </View>
      ) : null}

      <View className="mt-2">
        <Feedback error={s.error} ok={s.ok} />
        <View className="gap-3">
          <PrimaryButton label={s.busy ? 'Saving…' : 'Save'} onPress={() => save()} disabled={s.busy} />
          <OutlineButton label={published ? 'Unpublish' : 'Publish'} onPress={() => save(!published)} />
        </View>
      </View>
    </View>
  );
}

/* ---------------- Role play ---------------- */

const VOICES = [
  ['character-1', 'Maya · American'],
  ['character-2', 'Jack · Australian'],
  ['character-3', 'Emma · American'],
  ['character-4', 'Ethan · American'],
  ['character-5', 'Charlotte · British'],
  ['character-6', 'Oliver · British'],
  ['character-7', 'Angelica · Filipino'],
  ['character-8', 'Miguel · Filipino'],
].map(([key, label]) => ({ key, label }));

const emptyDetails: Rec = {
  meeting_title: '',
  scenario: '',
  duration_minutes: 5,
  learner_role: '',
  learner_goals: [] as string[],
  ai_character: { name: '', role: '', personality: '', voice: 'character-1' },
  ai_instructions: '',
  opening_message: '',
};

function pickDetails(asset: Rec = {}): Rec {
  return {
    ...Object.fromEntries(Object.keys(emptyDetails).map((k) => [k, asset[k] ?? emptyDetails[k]])),
    ai_character: { ...emptyDetails.ai_character, ...(asset.ai_character || {}) },
  };
}

function RolePlayContent({ item, onChanged }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState<'setup' | 'review'>('setup');
  const [setup, setSetup] = useState<Rec>({ skills: '', scenario: '', additional_context: '', lecture_ids: [] });
  const [details, setDetails] = useState<Rec>(emptyDetails);
  const [status, setStatus] = useState('');
  const s = useSaver();

  const hydrate = useCallback((c: Rec) => {
    const asset = c.asset || {};
    setSetup((p) => ({ ...p, ...(asset.setup || {}) }));
    setDetails(pickDetails(asset));
    setStatus(asset.status || '');
    setStep(asset.generated ? 'review' : 'setup');
  }, []);

  useEffect(() => {
    fetchRolePlay(item.id)
      .then((c) => {
        hydrate(c);
        setLoaded(true);
      })
      .catch(() => setFailed(true));
  }, [item.id, hydrate]);

  if (failed) return <Empty>Unable to load this role play.</Empty>;
  if (!loaded) return <Empty>Loading role play…</Empty>;

  const set = (p: Rec) => setDetails((d) => ({ ...d, ...p }));
  const setChar = (p: Rec) => setDetails((d) => ({ ...d, ai_character: { ...d.ai_character, ...p } }));

  const generate = () => {
    if (!String(setup.scenario || '').trim()) return s.setError('Describe the scenario first.');
    return s.run(
      async () => {
        const c = await generateRolePlay(item.id, setup);
        setDetails(pickDetails(c.asset));
        setStep('review');
        onChanged();
      },
      'Draft generated. Review the details below.',
      'Failed to generate the role play.',
    );
  };

  const save = (publish: boolean) => {
    if (
      publish &&
      (!details.meeting_title.trim() ||
        !details.scenario.trim() ||
        !details.learner_role.trim() ||
        !details.learner_goals.some((g: string) => g.trim()))
    ) {
      return s.setError('Add a title, scenario, learner role and at least one goal first.');
    }
    return s.run(
      async () => {
        const c = await saveRolePlay(
          item.id,
          { ...details, learner_goals: details.learner_goals.filter((g: string) => g.trim()) },
          publish,
        );
        setDetails(pickDetails(c.asset));
        setStatus(c.asset?.status || status);
        onChanged();
      },
      publish ? 'Role play published.' : 'Role play saved.',
      'Failed to save the role play.',
    );
  };

  if (step === 'setup') {
    return (
      <View>
        <Intro>Describe the scenario and AI will draft a role play conversation for learners to practice.</Intro>
        <Field label="Skills to practice">
          <Input value={setup.skills} onChange={(v) => setSetup((p) => ({ ...p, skills: v }))} placeholder="e.g. active listening, giving constructive feedback" multiline height={70} />
        </Field>
        <Field label="Scenario">
          <Input value={setup.scenario} onChange={(v) => setSetup((p) => ({ ...p, scenario: v }))} placeholder="e.g. A manager addressing repeated missed deadlines" multiline height={90} />
        </Field>
        <Field label="Additional context">
          <Input value={setup.additional_context} onChange={(v) => setSetup((p) => ({ ...p, additional_context: v }))} multiline height={90} />
        </Field>
        <Feedback error={s.error} ok={s.ok} />
        <PrimaryButton label={s.busy ? 'Generating…' : 'Generate role play'} onPress={generate} disabled={s.busy} />
      </View>
    );
  }

  return (
    <View>
      {status ? (
        <View className="mb-4 self-start rounded-full bg-[#2D2F31] px-3 py-1">
          <Text className="text-[12px] font-bold text-white">{status === 'PUBLISHED' ? 'Published' : 'Draft'}</Text>
        </View>
      ) : null}
      <Field label="Meeting title">
        <Input value={details.meeting_title} onChange={(v) => set({ meeting_title: v })} />
      </Field>
      <Field label="Scenario">
        <Input value={details.scenario} onChange={(v) => set({ scenario: v })} multiline height={100} />
      </Field>
      <Field label="Meeting duration" hint="Choose the time limit that matches the complexity of your scenario.">
        <Chips
          options={[
            { key: '3', label: '3 min' },
            { key: '5', label: '5 min' },
            { key: '10', label: '10 min' },
          ]}
          value={String(details.duration_minutes)}
          onChange={(v) => set({ duration_minutes: Number(v) })}
        />
      </Field>
      <Field label="Learner role">
        <Input value={details.learner_role} onChange={(v) => set({ learner_role: v })} />
      </Field>
      <Field label="Learner goals">
        {details.learner_goals.map((g: string, i: number) => (
          <View key={i} className="mb-3 flex-row items-center gap-2">
            <TextInput
              value={g}
              onChangeText={(v) => set({ learner_goals: details.learner_goals.map((x: string, j: number) => (j === i ? v : x)) })}
              placeholderTextColor={PH}
              className={`${INPUT} flex-1`}
            />
            <Link label="✕" danger onPress={() => set({ learner_goals: details.learner_goals.filter((_: string, j: number) => j !== i) })} />
          </View>
        ))}
        <Link label="+ Add goal" onPress={() => set({ learner_goals: [...details.learner_goals, ''] })} />
      </Field>

      <Text className="mb-3 text-[17px] font-bold text-white">AI character</Text>
      <Field label="Name">
        <Input value={details.ai_character.name} onChange={(v) => setChar({ name: v })} />
      </Field>
      <Field label="Audio character">
        <Chips options={VOICES} value={details.ai_character.voice} onChange={(voice) => setChar({ voice })} />
      </Field>
      <Field label="Character role">
        <Input value={details.ai_character.role} onChange={(v) => setChar({ role: v })} />
      </Field>
      <Field label="Personality and background">
        <Input value={details.ai_character.personality} onChange={(v) => setChar({ personality: v })} multiline height={90} />
      </Field>
      <Field label="AI character's first line">
        <Input value={details.opening_message} onChange={(v) => set({ opening_message: v })} multiline height={80} />
      </Field>
      <Field label="Private AI guidance" hint="Not shown to learners.">
        <Input value={details.ai_instructions} onChange={(v) => set({ ai_instructions: v })} multiline height={100} />
      </Field>

      <Feedback error={s.error} ok={s.ok} />
      <View className="gap-3">
        <PrimaryButton label={s.busy ? 'Saving…' : status === 'PUBLISHED' ? 'Publish changes' : 'Publish'} onPress={() => save(true)} disabled={s.busy} />
        <OutlineButton label="Save" onPress={() => save(false)} />
        <OutlineButton label="Regenerate from setup" onPress={() => setStep('setup')} />
      </View>
    </View>
  );
}

/* ---------------- Host ---------------- */

const TITLES: Record<string, string> = {
  lecture: 'Lecture content',
  quiz: 'Quiz',
  coding_exercise: 'Coding exercise',
  assignment: 'Assignment',
  role_play: 'Role play',
};

export function curriculumType(item: Rec) {
  const type = String(item.curriculum_type || '').toLowerCase();
  if (type) return type;
  return 'lecture';
}

export function hasContent(item: Rec) {
  return Boolean(item.asset);
}

export default function ContentEditor({ item, onClose, onChanged }: Props) {
  const insets = useSafeAreaInsets();
  const type = curriculumType(item);
  const body = { item, onClose, onChanged };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center border-b border-[#2D2F31] px-4 pb-3 pt-2">
          <View className="flex-1 pr-3">
            <Text className="text-[12px] font-bold uppercase text-[#6A6F73]">{TITLES[type] || 'Content'}</Text>
            <Text className="text-[18px] font-bold text-white" numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text className="text-[15px] font-bold" style={{ color: LAVENDER }}>
              Close
            </Text>
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {type === 'quiz' ? <QuizContent {...body} /> : null}
          {type === 'coding_exercise' ? <CodingContent {...body} /> : null}
          {type === 'assignment' ? <AssignmentContent {...body} /> : null}
          {type === 'role_play' ? <RolePlayContent {...body} /> : null}
          {type !== 'quiz' && type !== 'coding_exercise' && type !== 'assignment' && type !== 'role_play' ? (
            <LectureContent {...body} />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
