import { Api, apiRequest } from '@/lib/api';

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
