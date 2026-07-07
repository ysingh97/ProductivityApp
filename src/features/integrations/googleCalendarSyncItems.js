const normalizeId = (value) => (value ? String(value) : "");

const getCategoryLabel = (category) => {
  if (!category) return "Uncategorized";
  if (typeof category === "string") return category;
  if (typeof category === "object" && category.title) return category.title;
  return "Uncategorized";
};

const hasTargetCompletionDate = (item) => Boolean(item?.targetCompletionDate);

export const GOOGLE_CALENDAR_ITEM_REASON_CONFIG = {
  "missing-target-date": {
    slug: "missing-target-date",
    title: "Items without target dates",
    description:
      "These goals and tasks stay only in Branchwork until they have a target date.",
    emptyState:
      "Everything currently has a target date or is already completed.",
    countLabel: "No target date",
    matches: (item) => !item?.isComplete && !hasTargetCompletionDate(item)
  },
  completed: {
    slug: "completed",
    title: "Completed items",
    description:
      "Completed goals and tasks are intentionally removed from Google Calendar sync.",
    emptyState: "No completed goals or tasks are currently excluded from sync.",
    countLabel: "Completed",
    matches: (item) => Boolean(item?.isComplete)
  }
};

export const getGoogleCalendarItemReasonConfig = (reasonSlug) =>
  GOOGLE_CALENDAR_ITEM_REASON_CONFIG[reasonSlug] || null;

const buildGoalLineage = (goalId, goalsById) => {
  const lineage = [];
  let currentId = normalizeId(goalId);
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const goal = goalsById.get(currentId);
    if (!goal) {
      break;
    }

    lineage.push(goal);
    const parentId = normalizeId(goal.parentGoalId);
    if (!parentId || !goalsById.has(parentId)) {
      break;
    }

    currentId = parentId;
  }

  return lineage.reverse();
};

const buildNormalizedItem = ({ item, itemType, goalsById }) => {
  const itemId = normalizeId(item?._id);
  const parentGoalId = normalizeId(item?.parentGoalId);
  const goalLineage =
    itemType === "goal"
      ? buildGoalLineage(itemId, goalsById)
      : buildGoalLineage(parentGoalId, goalsById);
  const itemPath = itemType === "goal" ? goalLineage : [...goalLineage, item];
  const rootGoal = goalLineage[0] || null;
  const rootGoalId = normalizeId(rootGoal?._id);

  return {
    ...item,
    _id: itemId,
    itemType,
    categoryLabel: getCategoryLabel(item?.category),
    parentGoalId,
    rootGoalId: rootGoalId || null,
    rootGoalTitle: rootGoal?.title || null,
    treeKey: rootGoalId ? `goal:${rootGoalId}` : "standalone",
    treeTitle: rootGoal?.title || "Standalone tasks",
    treeKind: rootGoalId ? "goalTree" : "standalone",
    hierarchyDepth: Math.max(itemPath.length - 1, 0),
    hierarchyPathLabels: itemPath.map((entry) => entry.title).filter(Boolean),
    hierarchyPathLabel: itemPath.map((entry) => entry.title).filter(Boolean).join(" > "),
    targetPath: itemType === "goal" ? `/goals/${itemId}` : `/tasks/${itemId}`
  };
};

const compareStrings = (left, right) =>
  left.localeCompare(right, undefined, { sensitivity: "base" });

const compareItems = (left, right) => {
  const pathComparison = compareStrings(left.hierarchyPathLabel, right.hierarchyPathLabel);
  if (pathComparison !== 0) return pathComparison;

  if (left.hierarchyDepth !== right.hierarchyDepth) {
    return left.hierarchyDepth - right.hierarchyDepth;
  }

  if (left.itemType !== right.itemType) {
    return left.itemType === "goal" ? -1 : 1;
  }

  return compareStrings(left.title || "", right.title || "");
};

export const buildGoogleCalendarSyncItemGroups = ({
  goals = [],
  tasks = [],
  reasonSlug
}) => {
  const reason = getGoogleCalendarItemReasonConfig(reasonSlug);
  if (!reason) {
    return [];
  }

  const goalsById = new Map(
    goals
      .filter((goal) => goal?._id)
      .map((goal) => [normalizeId(goal._id), goal])
  );

  const items = [
    ...goals.map((goal) => buildNormalizedItem({ item: goal, itemType: "goal", goalsById })),
    ...tasks.map((task) => buildNormalizedItem({ item: task, itemType: "task", goalsById }))
  ].filter(reason.matches);

  const categories = new Map();

  items.forEach((item) => {
    const categoryKey = item.categoryLabel;
    if (!categories.has(categoryKey)) {
      categories.set(categoryKey, {
        categoryLabel: item.categoryLabel,
        itemCount: 0,
        treeGroups: new Map()
      });
    }

    const category = categories.get(categoryKey);
    category.itemCount += 1;

    if (!category.treeGroups.has(item.treeKey)) {
      category.treeGroups.set(item.treeKey, {
        treeKey: item.treeKey,
        treeTitle: item.treeTitle,
        treeKind: item.treeKind,
        rootGoalId: item.rootGoalId,
        itemCount: 0,
        items: []
      });
    }

    const treeGroup = category.treeGroups.get(item.treeKey);
    treeGroup.itemCount += 1;
    treeGroup.items.push(item);
  });

  return Array.from(categories.values())
    .map((category) => ({
      categoryLabel: category.categoryLabel,
      itemCount: category.itemCount,
      treeGroups: Array.from(category.treeGroups.values())
        .map((treeGroup) => ({
          ...treeGroup,
          items: treeGroup.items.sort(compareItems)
        }))
        .sort((left, right) => {
          if (left.treeKind !== right.treeKind) {
            return left.treeKind === "goalTree" ? -1 : 1;
          }

          return compareStrings(left.treeTitle, right.treeTitle);
        })
    }))
    .sort((left, right) => compareStrings(left.categoryLabel, right.categoryLabel));
};
