import { Api, apiRequest, uploadFile } from '@/lib/api';

type AnyRecord = Record<string, any>;

export type CourseLevel = {
  id: string;
  title: string;
};

export type CategoryNode = {
  id: string;
  title: string;
  slug?: string;
  children?: CategoryNode[];
};

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  price_tier?: { id?: string; title?: string; price?: string } | null;
  instructional_level?: { id?: string | null; title?: string } | null;
  category?: { id?: string; title?: string; name?: string } | null;
  cover_image?: { path?: string } | null;
  resources_count?: { section_count?: number; curriculum_count?: number } | null;
  workflowStatus?: string;
  is_enrolled?: boolean;
  is_in_cart?: boolean;
};

export type CourseDetail = CourseSummary & {
  description?: string;
  goals?: {
    objectives?: string[];
    requirements?: string[];
    targetAudience?: string[];
  } | null;
  categories?: { id: string; slug?: string; title: string }[];
  author?: {
    data?: {
      id?: string;
      username?: string;
      fullName?: string;
    };
  };
  sections?: {
    id: string;
    title: string;
    curriculums?: {
      id: string;
      title: string;
      curriculum_resource_type?: string;
    }[];
  }[];
  is_in_wishlist?: boolean;
};

export type MyLearning = {
  id: string;
  accessSource?: string;
  course?: CourseSummary & { author?: { data?: { fullName?: string } } };
  progress?: { progress_pct?: number | string; completed_lessons?: number | string } | null;
};

export type CartSnapshot = {
  cartItems: {
    id: string;
    course?: {
      id: string;
      title?: string;
      slug?: string;
      price_tier?: { price?: string } | null;
    };
  }[];
  cartTotal: number;
};

function unwrapData<T = any>(payload: any, fallback: T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload.data as T) ?? fallback;
  }
  return (payload as T) ?? fallback;
}

function toQueryString(params: AnyRecord) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });
  return query.toString();
}

export async function fetchCourseLevels(): Promise<CourseLevel[]> {
  const response = await Api.get<any>('/course-levels', false);
  return Array.isArray(response) ? response : unwrapData<CourseLevel[]>(response, []);
}

export async function fetchCategoryTree(): Promise<CategoryNode[]> {
  const response = await Api.get<any>('/categories?tree=true', false);
  return unwrapData<CategoryNode[]>(response, []);
}

export async function fetchCourses(params: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  instructionalLevel?: string;
}) {
  const query = toQueryString({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search,
    category_id: params.categoryId,
    instructional_level: params.instructionalLevel,
  });

  const response = await Api.get<any>(`/courses?${query}`, false);
  const rows = unwrapData<CourseSummary[]>(response, []);
  const pagination = response?.pagination || response?.meta || null;
  return { rows, pagination };
}

export async function fetchMyLearnings(): Promise<MyLearning[]> {
  const response = await Api.get<any>('/enrollments');
  return unwrapData<MyLearning[]>(response, []);
}

export async function fetchCourseRoute(slug: string): Promise<CourseDetail> {
  const response = await apiRequest<any>(`/courses/route/${encodeURIComponent(slug)}`, {
    auth: false,
    optionalAuth: true,
  });
  return response as CourseDetail;
}

export async function addCourseToCart(courseId: string) {
  return Api.post('/cart', { course_id: courseId });
}

export async function fetchCartSnapshot() {
  const response = await Api.get<any>('/cart');
  return unwrapData<CartSnapshot>(response, { cartItems: [], cartTotal: 0 });
}

export async function createCheckout(courseId?: string) {
  const payload = courseId ? { courseId } : {};
  const response = await Api.post<any>('/checkout', payload);
  return response;
}

export async function fetchAuthoredCourses(params: {
  page?: number;
  limit?: number;
  title?: string;
  instructionalLevel?: string;
}) {
  const query = toQueryString({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    title: params.title,
    instructional_level: params.instructionalLevel,
  });
  const response = await Api.get<any>(`/courses/authored?${query}`);
  return {
    rows: unwrapData<CourseSummary[]>(response, []),
    pagination: response?.pagination || response?.meta || null,
  };
}

export async function fetchMyPayouts() {
  const response = await Api.get<any>('/payouts/my?page=1&limit=20');
  return {
    rows: unwrapData<any[]>(response, []),
    pagination: response?.pagination || response?.meta || null,
  };
}

export async function fetchPayoutSummary() {
  const response = await Api.get<any>('/payouts/summary');
  return unwrapData<AnyRecord | null>(response, null);
}

export async function fetchInstructorQa(page = 1) {
  const response = await Api.get<any>(`/communication/instructor/qa?page=${page}&limit=20`);
  return unwrapData<AnyRecord[]>(response, []);
}

const list = async (path: string) => unwrapData<AnyRecord[]>(await Api.get<any>(path), []);

export const fetchWishlist = () => list('/wishlist');
export const removeFromWishlist = (courseId: string) => Api.delete(`/wishlist/${courseId}`);
export const fetchCertificates = () => list('/certifications/me');

export const fetchAiInsights = async () =>
  unwrapData<AnyRecord | null>(await Api.get<any>('/communication/instructor/ai-insights'), null);
export const fetchInstructorMessages = () => list('/communication/instructor/messages?page=1&limit=20');
export const fetchInstructorAssignments = () => list('/communication/instructor/assignments');
export const fetchAnnouncements = () => list('/communication/instructor/announcements?page=1&limit=20');

export const fetchCourseStatistics = async (slug: string) =>
  unwrapData<AnyRecord | null>(
    await Api.get<any>(`/courses/${encodeURIComponent(slug)}/statistics`),
    null,
  );

export async function fetchAuthoredCoursesFull(limit = 200) {
  return list(`/courses/authored?page=1&limit=${limit}`);
}

export async function createCourse(title: string, categoryIds: string[]) {
  const response = await Api.post<any>('/courses', { title, category_ids: categoryIds });
  return unwrapData<AnyRecord>(response, {});
}

export async function createAiDraft(prompt: string) {
  const response = await Api.post<any>('/courses/ai-draft', { prompt });
  return unwrapData<AnyRecord>(response, {});
}

export async function fetchEarnings() {
  return unwrapData<AnyRecord | null>(await Api.get<any>('/earnings/my'), null);
}

export async function fetchPayoutHistory(limit = 200) {
  return list(`/payouts/my?page=1&limit=${limit}`);
}

export async function getPayoutVerificationMethod() {
  const response = await Api.get<any>('/payouts/account/verification-method');
  return String(unwrapData<AnyRecord>(response, {})?.method || 'none');
}

export const verifyPayoutAccountCode = (code: string) =>
  Api.post('/payouts/account/verify-password', { code });

export const savePayoutAccount = (payload: AnyRecord) => Api.post('/payouts/account', payload);

export const requestPayout = (note: string) => Api.post('/payouts/request', { note });

// ---- Course editor ----
export const PRICE_TIERS = [
  { id: 'cmvutbche00h34q2rzu79925e', title: 'Free', price: '0' },
  { id: 'cmvutbcks00h44q2ruuiyrrcg', title: 'Tier 1', price: '50' },
  { id: 'cmvutbcmh00h54q2rw12olj9e', title: 'Tier 2', price: '100' },
  { id: 'cmvutbco300h64q2rlop2jcvx', title: 'Tier 3', price: '200' },
  { id: 'cmvutbcpu00h74q2rn5zgd7bc', title: 'Tier 4', price: '250' },
  { id: 'cmvutbcrl00h84q2ra0vg4xjj', title: 'Tier 5', price: '300' },
  { id: 'cmvutbcta00h94q2rgp844ibe', title: 'Tier 6', price: '400' },
  { id: 'cmvutbcuw00ha4q2rw5xwqgta', title: 'Tier 7', price: '500' },
];

export async function fetchCourseManage(slug: string) {
  const response = await Api.get<any>(`/courses/${encodeURIComponent(slug)}/manage`);
  return unwrapData<AnyRecord>(response, {});
}

export async function fetchLanguages() {
  const response = await Api.get<any>('/languages', false);
  return (Array.isArray(response) ? response : unwrapData<AnyRecord[]>(response, [])) as {
    value: string;
    label: string;
  }[];
}

export async function checkSlugAvailability(slug: string, courseId: string) {
  const response = await Api.get<any>(
    `/courses/slug-availability?slug=${encodeURIComponent(slug)}&excludeCourseId=${encodeURIComponent(courseId)}&nocache=true`,
  );
  return Boolean(unwrapData<AnyRecord>(response, {})?.isAvailable);
}

export async function updateCourseBasics(uuid: string, payload: AnyRecord) {
  const response = await Api.put<any>(`/courses/${uuid}`, payload);
  return unwrapData<AnyRecord>(response, {});
}

export async function uploadCourseCoverImage(
  file: { uri: string; name: string; type: string },
  onProgress?: (percent: number) => void,
) {
  const response = await uploadFile<any>('/media', { title: file.name }, file, 'file', onProgress);
  return unwrapData<AnyRecord>(response, {});
}

export async function uploadCoursePromoVideo(
  uuid: string,
  file: { uri: string; name: string; type: string },
  onProgress?: (percent: number) => void,
) {
  const response = await uploadFile<any>(
    `/courses/${uuid}/promo-video`,
    { title: file.name, course_uuid: uuid },
    file,
    'promo_video',
    onProgress,
  );
  return unwrapData<AnyRecord>(response, {});
}

export async function updateCourseGoals(id: string | number, payload: AnyRecord) {
  const response = await Api.put<any>(`/courses/${id}/goals`, payload);
  return unwrapData<AnyRecord>(response, {});
}

export async function updateCoursePricing(uuid: string, priceTier: string) {
  const response = await Api.put<any>(`/courses/${uuid}/pricing`, { price_tier: priceTier });
  return unwrapData<AnyRecord>(response, {});
}

export async function updateCourseMessages(id: string | number, payload: AnyRecord) {
  const response = await Api.put<any>(`/courses/${id}/messages`, payload);
  return unwrapData<AnyRecord>(response, {});
}

export async function submitCourseForReview(uuid: string, note: string) {
  return Api.post<any>(`/courses/${uuid}/submit`, { note });
}

export async function setCoursePublished(uuid: string, publish: boolean) {
  return Api.post<any>(`/courses/${uuid}/${publish ? 'publish' : 'unpublish'}`, {});
}

export async function fetchCourseSections(courseId: string | number) {
  return list(`/course-sections/course/${courseId}`);
}

export async function fetchSectionCurriculums(sectionId: string | number) {
  return list(`/course-sections/${sectionId}/curriculums`);
}

export async function saveSection(
  courseId: string | number,
  payload: { title: string; description: string },
  sectionId?: string | number,
) {
  const body = { ...payload, course_id: courseId };
  const response = sectionId
    ? await Api.put<any>(`/course-sections/${sectionId}`, body)
    : await Api.post<any>('/course-sections', body);
  return unwrapData<AnyRecord>(response, {});
}

export async function deleteSection(sectionId: string | number) {
  return Api.delete<any>(`/course-sections/${sectionId}`);
}

export async function saveCurriculum(
  payload: AnyRecord,
  curriculumId?: string | number,
) {
  const response = curriculumId
    ? await Api.put<any>(`/course-curriculums/${curriculumId}`, payload)
    : await Api.post<any>('/course-curriculums', payload);
  return unwrapData<AnyRecord>(response, {});
}

export async function deleteCurriculum(curriculumId: string | number) {
  return Api.delete<any>(`/course-curriculums/${curriculumId}`);
}

export async function saveArticleContent(curriculumId: string | number, content: string) {
  const response = await Api.post<any>('/course-resources/articles', {
    content,
    curriculum_id: curriculumId,
  });
  return unwrapData<AnyRecord>(response, {});
}

export async function saveQuizQuestions(
  curriculum: { id: string | number; title?: string; curriculum_description?: string },
  questions: AnyRecord[],
) {
  const response = await Api.put<any>(`/course-curriculums/${curriculum.id}`, {
    title: curriculum.title,
    description: curriculum.curriculum_description || '',
    quizQuestions: { questions },
  });
  return unwrapData<AnyRecord>(response, {});
}

export async function uploadLectureVideo(
  curriculumId: string | number,
  file: { uri: string; name: string; type: string; duration?: number },
  onProgress?: (percent: number) => void,
) {
  const fields: Record<string, string> = { curriculum_id: String(curriculumId) };
  if (file.duration && file.duration > 0) fields.duration = String(Math.ceil(file.duration));
  const response = await uploadFile<any>('/course-resources/videos', fields, file, 'file', onProgress);
  return unwrapData<AnyRecord>(response, {});
}

export async function deleteLectureContent(
  resourceType: 'video' | 'article',
  curriculumId: string | number,
) {
  return Api.delete<any>(`/course-resources/${resourceType}s/${curriculumId}`);
}

export async function fetchCourseCoupons(uuid: string) {
  return list(`/courses/${uuid}/coupons`);
}

export async function createCourseCoupon(uuid: string, payload: AnyRecord) {
  return Api.post<any>(`/courses/${uuid}/coupons`, payload);
}

export async function fetchCourseStudents(slug: string, page = 1, limit = 20) {
  const response = await Api.get<any>(
    `/courses/${encodeURIComponent(slug)}/students?page=${page}&limit=${limit}`,
  );
  return {
    rows: (Array.isArray(response?.data) ? response.data : []) as AnyRecord[],
    stats: (response?.stats || {}) as AnyRecord,
  };
}

export async function fetchCourseReviews(slug: string, page = 1, limit = 20) {
  const response = await Api.get<any>(
    `/reviews/instructor/courses/${encodeURIComponent(slug)}?page=${page}&limit=${limit}`,
  );
  return {
    rows: (Array.isArray(response?.data) ? response.data : []) as AnyRecord[],
    summary: (response?.summary || { averageRating: 0, totalReviews: 0 }) as AnyRecord,
  };
}

// ---- Curriculum content ----
export async function saveCodingExercise(
  curriculum: { id: string | number; curriculum_description?: string },
  payload: { title: string; instructions: string; starterCode: AnyRecord },
) {
  const response = await Api.put<any>(`/course-curriculums/${curriculum.id}`, {
    title: payload.title,
    description: curriculum.curriculum_description || '',
    codingInstructions: payload.instructions,
    codingStarterCode: payload.starterCode,
  });
  return unwrapData<AnyRecord>(response, {});
}

export async function fetchAssignment(id: string | number) {
  const response = await Api.get<any>(`/course-curriculums/${id}/assignment`);
  return unwrapData<AnyRecord>(response, {})?.curriculum || {};
}

export async function saveAssignment(id: string | number, body: AnyRecord) {
  const response = await Api.put<any>(`/course-curriculums/${id}/assignment`, body);
  return unwrapData<AnyRecord>(response, {});
}

export async function fetchRolePlay(id: string | number) {
  const response = await Api.get<any>(`/course-curriculums/${id}/role-play`);
  return unwrapData<AnyRecord>(response, {})?.curriculum || {};
}

export async function generateRolePlay(id: string | number, setup: AnyRecord) {
  const response = await Api.post<any>(`/course-curriculums/${id}/role-play/generate`, setup);
  return unwrapData<AnyRecord>(response, {});
}

export async function saveRolePlay(id: string | number, details: AnyRecord, publish?: boolean) {
  const response = await Api.put<any>(`/course-curriculums/${id}/role-play`, {
    role_play: details,
    ...(publish ? { publish: true } : {}),
  });
  return unwrapData<AnyRecord>(response, {});
}
