import HomeFeed from '@/components/home-feed';
import LearnerHome from '@/components/learner-home';
import { useSessionStore } from '@/store/session';

export default function HomeScreen() {
  const profile = useSessionStore((state) => state.profile);
  return profile ? <LearnerHome /> : <HomeFeed />;
}
