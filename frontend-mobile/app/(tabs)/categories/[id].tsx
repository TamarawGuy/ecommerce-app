import { useLocalSearchParams } from "expo-router";

import { CategoryBrowser } from "@/src/components/CategoryBrowser";

// One level of the drill-down: the children of the category in the route, or a
// leaf state when it has none.
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CategoryBrowser categoryId={Number(id)} />;
}
