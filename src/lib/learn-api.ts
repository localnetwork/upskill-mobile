import { Api, apiRequest } from '@/lib/api';

export type Rec = Record<string, any>;

const data = <T>(res: any, fallback: T): T => (res?.data?.data ?? res?.data ?? fallback) as T;

export async function fetchLearnCourse(slug: string): Promise<Rec> {
  const res = await Api.get<any>(`/courses/${encodeURIComponent(slug)}/learn`);
  return data<Rec>(res, {})?.course || {};
}

export const addProgress = (courseId: string | number, curriculumId: string | number) =>
  Api.post('/course-curriculums/add-progress', { course_id: courseId, curriculum_id: curriculumId });

export const sendHeartbeat = (lessonId: string) =>
  Api.post('/earnings/watch/heartbeat', { lessonId }).catch(() => undefined);

export async function fetchStreamEmbedUrl(curriculumId: string | number): Promise<string> {
  const res = await apiRequest<any>(`/stream-token?id=${encodeURIComponent(String(curriculumId))}`, {
    headers: { 'x-upskill-stream-intent': 'playback' },
  });
  return String(data<Rec>(res, {})?.embed_url || '').trim();
}

// ---- Quiz ----
export async function fetchQuizAttempt(id: string | number): Promise<Rec> {
  return data<Rec>(await Api.get<any>(`/course-curriculums/${id}/quiz-attempt`), {});
}
export async function validateQuizAnswer(id: string | number, questionIndex: number, answer: string) {
  return data<Rec>(
    await Api.post<any>(`/course-curriculums/${id}/quiz-attempt/validate`, { questionIndex, answer }),
    {},
  );
}
export async function requestQuizHint(id: string | number, questionIndex: number) {
  return String(
    data<Rec>(await Api.post<any>(`/course-curriculums/${id}/quiz-attempt/hint`, { questionIndex }), {})
      ?.hint || '',
  );
}
export async function retryQuizAttempt(id: string | number): Promise<Rec> {
  return data<Rec>(await Api.post<any>(`/course-curriculums/${id}/quiz-attempt/retry`), {});
}

// ---- Q&A ----
export async function fetchDiscussions(
  slug: string,
  params: { lessonId?: string | number; status: string; category: string; sort: string },
) {
  const q = new URLSearchParams({
    limit: '20',
    page: '1',
    status: params.status,
    category: params.category,
    sort: params.sort,
  });
  if (params.lessonId) q.set('lessonId', String(params.lessonId));
  const res = await Api.get<any>(`/courses/${encodeURIComponent(slug)}/discussions?${q}`);
  return {
    threads: (Array.isArray(res?.data) ? res.data : []) as Rec[],
    canModerate: Boolean(res?.permissions?.canModerate),
  };
}
export async function fetchDiscussion(id: string): Promise<Rec | null> {
  return data<Rec | null>(await Api.get<any>(`/discussions/${encodeURIComponent(id)}`), null);
}
export const createDiscussion = (
  slug: string,
  body: { lessonId?: string | number; category: string; title: string; body: string },
) => Api.post(`/courses/${encodeURIComponent(slug)}/discussions`, { imagePath: null, ...body });
export const replyToDiscussion = (id: string, body: string) =>
  Api.post(`/discussions/${encodeURIComponent(id)}/replies`, { body });
export async function voteDiscussion(id: string, isUpvoted: boolean) {
  return data<Rec>(await Api.put<any>(`/discussions/${encodeURIComponent(id)}/vote`, { isUpvoted }), {});
}
export const resolveDiscussion = (id: string, isResolved: boolean) =>
  Api.put(`/discussions/${encodeURIComponent(id)}/resolved`, { isResolved });

// ---- Announcements ----
export async function fetchAnnouncements(courseId: string | number): Promise<Rec[]> {
  const res = await Api.get<any>(
    `/notifications?kind=INSTRUCTOR_ANNOUNCEMENT&courseId=${encodeURIComponent(String(courseId))}&page=1&limit=30`,
  );
  return Array.isArray(res?.data) ? res.data : [];
}
export async function fetchAnnouncementComments(id: string): Promise<Rec[]> {
  const res = await Api.get<any>(`/notifications/${encodeURIComponent(id)}/comments?page=1&limit=100`);
  return Array.isArray(res?.data) ? res.data : [];
}
export async function postAnnouncementComment(id: string, body: string): Promise<Rec | null> {
  return data<Rec | null>(await Api.post<any>(`/notifications/${encodeURIComponent(id)}/comments`, { body }), null);
}

// ---- Reviews ----
export async function fetchLearnReviews(courseId: string | number) {
  const res = await Api.get<any>(
    `/reviews/courses/${encodeURIComponent(String(courseId))}?page=1&limit=10&sort=recent`,
  );
  return {
    reviews: (Array.isArray(res?.data) ? res.data : []) as Rec[],
    summary: (res?.summary || { totalReviews: 0, averageRating: 0 }) as Rec,
  };
}
