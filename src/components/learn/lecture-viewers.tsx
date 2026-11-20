import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { LAVENDER, OutlineButton, PrimaryButton } from '@/components/dark-ui';
import { htmlToText } from '@/components/instructor/editor-kit';
import { WEB_URL } from '@/lib/config';
import {
  addProgress,
  fetchQuizAttempt,
  fetchStreamEmbedUrl,
  requestQuizHint,
  retryQuizAttempt,
  validateQuizAnswer,
  type Rec,
} from '@/lib/learn-api';

type Common = { course: Rec; lecture: Rec; onCompleted: (id: string | number) => void };

const isHttp = (u: string) => /^https?:\/\//i.test(u);

function Note({ title, body }: { title: string; body?: string }) {
  return (
    <View className="items-center px-6 py-10">
      <Text className="text-center text-[18px] font-bold text-white">{title}</Text>
      {body ? <Text className="mt-2 text-center text-[14px] text-[#D1D7DC]">{body}</Text> : null}
    </View>
  );
}

/* ---------- Video ---------- */

function DirectVideo({ uri, onEnded }: { uri: string; onEnded: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });
  const ended = useEvent(player, 'playToEnd');
  const fired = useRef(false);
  useEffect(() => {
    if (ended !== undefined && !fired.current) {
      fired.current = true;
      onEnded();
    }
  }, [ended, onEnded]);
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls />;
}

export function VideoLecture({ course, lecture, onCompleted }: Common) {
  const [embed, setEmbed] = useState('');
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(Boolean(lecture.is_taken));
  const direct = String(lecture.asset?.path || '');

  useEffect(() => {
    let live = true;
    fetchStreamEmbedUrl(lecture.id)
      .then((u) => live && setEmbed(u))
      .catch(() => undefined)
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [lecture.id]);

  const complete = async () => {
    if (done) return;
    setDone(true);
    try {
      await addProgress(course.id, lecture.id);
      onCompleted(lecture.id);
    } catch {
      setDone(false);
    }
  };

  return (
    <View>
      <View className="bg-black" style={{ aspectRatio: 16 / 9 }}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#fff" />
          </View>
        ) : embed ? (
          <WebView
            source={{ uri: embed }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            style={{ backgroundColor: '#000' }}
          />
        ) : isHttp(direct) ? (
          <DirectVideo key={lecture.id} uri={direct} onEnded={complete} />
        ) : (
          <Note title="Video unavailable" body="We couldn't load this video. Please try again later." />
        )}
      </View>
      <View className="px-4 pt-3">
        {done ? (
          <Text className="text-[14px] font-bold text-success">✓ Completed</Text>
        ) : (
          <Pressable onPress={complete} hitSlop={8}>
            <Text className="text-[14px] font-bold" style={{ color: LAVENDER }}>
              Mark as complete
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ---------- Article ---------- */

export function ArticleLecture({ course, lecture, onCompleted }: Common) {
  useEffect(() => {
    if (!lecture.id || lecture.is_taken) return;
    addProgress(course.id, lecture.id)
      .then(() => onCompleted(lecture.id))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecture.id]);
  const text = htmlToText(String(lecture.asset?.content || ''));
  return (
    <View className="px-4 py-5">
      <Text className="mb-3 text-[20px] font-bold text-white">{lecture.title}</Text>
      <Text className="text-[16px] leading-[26px] text-[#D1D7DC]">{text || 'No content yet.'}</Text>
    </View>
  );
}

/* ---------- Quiz ---------- */

const keyOf = (q: Rec, i: number) => q?.id || `q-${i + 1}`;

function fmtCorrect(q: Rec, correct: any) {
  if (q?.type === 'multiple_choice') {
    return (Array.isArray(correct) ? correct : [])
      .map((i: number) => q?.options?.[i]?.text || `Option ${i + 1}`)
      .join(', ');
  }
  if (q?.type === 'true_false') return correct ? 'True' : 'False';
  if (Array.isArray(correct)) return correct.join(', ');
  return correct == null ? 'N/A' : String(correct);
}

function fmtSubmitted(q: Rec, a: any) {
  if (a === undefined || a === null || a === '') return 'No answer';
  if (q?.type === 'multiple_choice') {
    const t = q.options?.[Number(a)]?.text;
    if (t) return t;
  }
  if (q?.type === 'true_false') return String(a) === 'true' ? 'True' : 'False';
  return String(a);
}

const clock = (s: number) => new Date(Number(s || 0) * 1000).toISOString().substring(11, 19);

export function QuizLecture({ lecture, onCompleted }: Common) {
  const questions: Rec[] = Array.isArray(lecture.asset?.questions) ? lecture.asset.questions : [];
  const [attempt, setAttempt] = useState<Rec | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<Rec | null>(null);
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');

  const showQuestion = (a: Rec | null, i: number) => {
    const k = keyOf(questions[i], i);
    setIndex(i);
    setAnswer(String(a?.state?.answers?.[k] ?? ''));
    setResult(a?.state?.questionResults?.[k] || null);
    setHint('');
  };

  const q = questions[index];
  const key = keyOf(q, index);
  const saved = attempt?.state?.questionResults?.[key] || null;
  const feedback = result || saved;
  const hintUsed = Boolean(attempt?.state?.hintUsage?.[key]);
  const metrics = attempt?.state?.metrics || {};
  const completed = Boolean(attempt?.state?.completed);
  const passed = Boolean(attempt?.state?.passed);

  useEffect(() => {
    let live = true;
    fetchQuizAttempt(lecture.id)
      .then((a) => {
        if (!live) return;
        setAttempt(a);
        showQuestion(a, Number(a?.state?.currentQuestionIndex || 0));
      })
      .catch(() => live && setError('Unable to load quiz attempt.'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecture.id]);

  useEffect(() => {
    if (passed) onCompleted(lecture.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed]);

  if (loading) return <Note title="Loading quiz…" />;
  if (!questions.length) return <Note title={lecture.title} body="This quiz has no questions yet." />;
  if (!q) return <Note title="Unable to load this quiz" body={error} />;

  const canSubmit = !busy && !saved && String(answer).trim().length > 0;

  const submit = async () => {
    try {
      setBusy(true);
      setError('');
      const p = await validateQuizAnswer(lecture.id, index, answer);
      setResult(p.validation || null);
      setAttempt((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        next.state = next.state || {};
        next.state.questionResults = { ...(next.state.questionResults || {}), [key]: p.validation };
        next.state.answers = { ...(next.state.answers || {}), [key]: answer };
        next.state.metrics = p.metrics || next.state.metrics;
        next.state.completed = p.completed;
        next.state.passed = p.passed;
        next.state.currentQuestionIndex = p.nextQuestionIndex ?? next.state.currentQuestionIndex;
        return next;
      });
    } catch (e: any) {
      setError(e?.message || 'Unable to validate your answer.');
    } finally {
      setBusy(false);
    }
  };

  const getHint = async () => {
    if (hintUsed) return;
    try {
      setHint(await requestQuizHint(lecture.id, index));
      setAttempt((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        next.state = next.state || {};
        next.state.hintUsage = { ...(next.state.hintUsage || {}), [key]: true };
        return next;
      });
    } catch (e: any) {
      setError(e?.message || 'Unable to load hint.');
    }
  };

  const next = () => {
    const n = Number(attempt?.state?.currentQuestionIndex || index + 1);
    showQuestion(attempt, Math.min(n, Math.max(questions.length - 1, 0)));
  };

  const retry = async () => {
    try {
      setLoading(true);
      const a = await retryQuizAttempt(lecture.id);
      setAttempt(a);
      showQuestion(a, 0);
      setReview(false);
    } catch (e: any) {
      setError(e?.message || 'Unable to restart quiz.');
    } finally {
      setLoading(false);
    }
  };

  if (review) {
    return (
      <View className="px-4 py-5">
        <Text className="mb-4 text-[20px] font-bold text-white">Review answers</Text>
        {questions.map((qq, i) => {
          const k = keyOf(qq, i);
          const r = attempt?.state?.questionResults?.[k];
          return (
            <View key={k} className="mb-3 rounded-lg border border-[#2D2F31] bg-[#1C1D1F] p-4">
              <Text className="text-[15px] font-bold text-white">
                {i + 1}. {qq.prompt}
              </Text>
              <Text className="mt-2 text-[13px] text-[#D1D7DC]">
                Your answer: {fmtSubmitted(qq, attempt?.state?.answers?.[k])}
              </Text>
              <Text className={`mt-1 text-[13px] font-bold ${r?.isCorrect ? 'text-success' : 'text-danger'}`}>
                {r?.isCorrect ? 'Correct' : `Incorrect · Answer: ${fmtCorrect(qq, r?.correctAnswer)}`}
              </Text>
              {r?.explanation ? <Text className="mt-1 text-[13px] text-[#6A6F73]">{r.explanation}</Text> : null}
            </View>
          );
        })}
        <OutlineButton label="Back to results" onPress={() => setReview(false)} />
      </View>
    );
  }

  if (completed) {
    return (
      <View className="px-4 py-6">
        <Text className="text-center text-[26px] font-bold text-white">
          {passed ? 'Congratulations!' : 'Not yet passed'}
        </Text>
        <Text className="mt-2 text-center text-[18px] text-[#D1D7DC]">
          {metrics.score || 0} / {metrics.maxScore || 0} · {metrics.scorePercentage || 0}%
        </Text>
        <View className="my-6 flex-row flex-wrap justify-between gap-y-3">
          {[
            ['Correct', metrics.correctAnswers || 0],
            ['Incorrect', metrics.incorrectAnswers || 0],
            ['Hints used', metrics.hintsUsed || 0],
            ['Time spent', clock(metrics.timeSpentSeconds)],
          ].map(([label, value]) => (
            <View key={String(label)} className="w-[48%] rounded-lg border border-[#2D2F31] bg-[#1C1D1F] p-4">
              <Text className="text-[20px] font-bold text-white">{String(value)}</Text>
              <Text className="mt-1 text-[12px] uppercase text-[#6A6F73]">{label}</Text>
            </View>
          ))}
        </View>
        <View className="gap-3">
          {!passed ? <PrimaryButton label="Retry quiz" onPress={retry} /> : null}
          <OutlineButton label="Review answers" onPress={() => setReview(true)} />
        </View>
      </View>
    );
  }

  const progress = Math.round(((metrics.answeredQuestions || 0) / questions.length) * 100);
  const choose = (v: string) => {
    if (!saved) setAnswer(v);
  };

  return (
    <View className="px-4 py-5">
      <View className="mb-1 flex-row justify-between">
        <Text className="text-[13px] text-[#D1D7DC]">
          Question {index + 1} of {questions.length}
        </Text>
        <Text className="text-[13px] text-[#6A6F73]">Pass: {Number(attempt?.settings?.passingScore || 80)}%</Text>
      </View>
      <View className="mb-5 h-1.5 overflow-hidden rounded-full bg-[#2D2F31]">
        <View style={{ width: `${progress}%`, backgroundColor: LAVENDER }} className="h-full" />
      </View>
      <Text className="mb-4 text-[18px] font-bold text-white">{q.prompt || 'Question'}</Text>

      {q.type === 'multiple_choice'
        ? (q.options || []).map((o: Rec, i: number) => {
            const on = answer === String(i);
            return (
              <Pressable
                key={i}
                onPress={() => choose(String(i))}
                className={`mb-2 flex-row items-center gap-3 rounded-lg border p-4 ${on ? 'border-white' : 'border-[#3E4143]'}`}>
                <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${on ? 'border-white' : 'border-[#6A6F73]'}`}>
                  {on ? <View className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                </View>
                <Text className="flex-1 text-[15px] text-white">{o.text || `Option ${i + 1}`}</Text>
              </Pressable>
            );
          })
        : null}

      {q.type === 'true_false' ? (
        <View className="flex-row gap-3">
          {['true', 'false'].map((v) => (
            <Pressable
              key={v}
              onPress={() => choose(v)}
              className={`flex-1 items-center rounded-lg border py-5 ${answer === v ? 'border-white' : 'border-[#3E4143]'}`}>
              <Text className="text-[16px] font-bold capitalize text-white">{v}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {q.type === 'fill_in_the_blanks' || q.type === 'short_answer' ? (
        <TextInput
          value={answer}
          onChangeText={choose}
          editable={!saved}
          placeholder="Your answer"
          placeholderTextColor="#6A6F73"
          autoCapitalize="none"
          className="rounded-md border border-[#6A6F73] bg-black px-4 py-3 text-[16px] text-white"
        />
      ) : null}

      {hint ? (
        <View className="mt-4 rounded-lg border-l-4 border-[#F2C94C] bg-[#1C1D1F] p-3">
          <Text className="text-[13px] font-bold text-white">Hint</Text>
          <Text className="mt-1 text-[13px] text-[#D1D7DC]">{hint}</Text>
        </View>
      ) : null}

      {feedback ? (
        <View
          className={`mt-4 rounded-lg border p-4 ${feedback.isCorrect ? 'border-[#2E7D32] bg-[#102A14]' : 'border-[#B3261E] bg-[#2A1210]'}`}>
          <Text className={`text-[14px] font-bold ${feedback.isCorrect ? 'text-success' : 'text-danger'}`}>
            {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
          <Text className="mt-1 text-[13px] text-white">
            Correct answer: <Text className="font-bold">{fmtCorrect(q, feedback.correctAnswer)}</Text>
          </Text>
          <Text className="mt-1 text-[13px] text-[#D1D7DC]">
            {feedback.explanation || 'Review the concept and continue.'}
          </Text>
        </View>
      ) : null}

      {error ? <Text className="mt-3 text-danger">{error}</Text> : null}

      <View className="mt-5 flex-row items-center gap-3">
        <Pressable
          onPress={getHint}
          disabled={hintUsed}
          style={{ opacity: hintUsed ? 0.4 : 1 }}
          className="h-[52px] items-center justify-center rounded-full border border-[#6A6F73] px-4">
          <Text className="text-[14px] font-bold text-white">Hint</Text>
        </Pressable>
        <View className="flex-1">
          <PrimaryButton label={busy ? 'Validating…' : 'Submit answer'} onPress={submit} disabled={!canSubmit} />
        </View>
        <Pressable
          onPress={next}
          disabled={!feedback}
          style={{ opacity: feedback ? 1 : 0.4 }}
          className="h-[52px] items-center justify-center rounded-full border border-[#6A6F73] px-4">
          <Text className="text-[16px] font-bold text-white">→</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------- Coding / assignment / role play: continue on web ---------- */

const WEB_ONLY: Record<string, string> = {
  coding_exercise: 'Coding exercises',
  assignment: 'Assignments',
  role_play: 'AI role plays',
};

export function WebOnlyLecture({ course, lecture }: Common) {
  const label = WEB_ONLY[String(lecture.curriculum_resource_type)] || 'This lesson type';
  return (
    <View className="items-center px-6 py-10">
      <Text className="text-center text-[18px] font-bold text-white">{lecture.title}</Text>
      <Text className="mb-5 mt-2 text-center text-[14px] text-[#D1D7DC]">
        {label} are completed in the web learning player for now.
      </Text>
      <OutlineButton
        label="Open in browser"
        onPress={() =>
          Linking.openURL(`${WEB_URL}/courses/${encodeURIComponent(course.slug)}/learn?lecture=${lecture.uuid}`)
        }
      />
    </View>
  );
}

export function LockedLecture({ lecture }: { lecture: Rec }) {
  return (
    <Note
      title="This lesson is locked"
      body={lecture.lock_reason || 'Complete the required prerequisite to unlock this lesson.'}
    />
  );
}
