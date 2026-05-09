const mongoose = require('mongoose');
const Task = require('../models/task');
const TimeEntry = require('../models/timeEntry');

const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const allowedBucketValues = new Set(['day', 'week', 'month']);

const parseDateOnlyParam = (value, label) => {
  if (!value) {
    return null;
  }

  if (!dateOnlyPattern.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a valid calendar date.`);
  }

  return parsed;
};

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const addUtcDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const startOfUtcWeek = (date) => {
  const start = startOfUtcDay(date);
  return addUtcDays(start, -start.getUTCDay());
};

const startOfUtcMonth = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const getBucketStart = (date, bucket) => {
  if (bucket === 'week') {
    return startOfUtcWeek(date);
  }

  if (bucket === 'month') {
    return startOfUtcMonth(date);
  }

  return startOfUtcDay(date);
};

const addBucket = (date, bucket) => {
  if (bucket === 'week') {
    return addUtcDays(date, 7);
  }

  if (bucket === 'month') {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  }

  return addUtcDays(date, 1);
};

const parseBucketParam = (value) => {
  if (!value) {
    return 'day';
  }

  if (!allowedBucketValues.has(value)) {
    throw new Error('bucket must be one of day, week, or month.');
  }

  return value;
};

const parseCategoryIdsParam = (value) => {
  if (!value) {
    return null;
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const tokens = rawValues
    .flatMap((rawValue) => String(rawValue).split(','))
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  const categoryIds = new Set();
  let includeUncategorized = false;

  for (const token of tokens) {
    if (token.toLowerCase() === 'uncategorized') {
      includeUncategorized = true;
      continue;
    }

    if (!mongoose.Types.ObjectId.isValid(token)) {
      throw new Error(
        'categoryIds must contain comma-separated category ids or "uncategorized".'
      );
    }

    categoryIds.add(String(new mongoose.Types.ObjectId(token)));
  }

  return {
    categoryIds,
    includeUncategorized
  };
};

const buildTaskMatch = ({ userId, fromDate, toDate }) => {
  const match = {
    userId
  };

  if (fromDate || toDate) {
    match.targetCompletionDate = {};

    if (fromDate) {
      match.targetCompletionDate.$gte = fromDate;
    }

    if (toDate) {
      match.targetCompletionDate.$lt = addUtcDays(toDate, 1);
    }
  }

  return match;
};

const buildTimeEntryMatch = ({ userId, fromDate, toDate }) => ({
  userId,
  startedAt: {
    $lt: addUtcDays(toDate, 1)
  },
  endedAt: {
    $gt: fromDate
  }
});

const buildBucketsFromMap = ({ bucketMap, fromDate, toDate, bucket }) => {
  const buckets = [];
  let cursor = getBucketStart(fromDate, bucket);
  const lastBucket = getBucketStart(toDate, bucket);

  while (cursor <= lastBucket) {
    const key = formatDateOnly(cursor);
    const bucketData = bucketMap.get(key);
    const categories = bucketData
      ? Array.from(bucketData.categories.values())
          .filter((category) => category.hours > 0)
          .sort((a, b) =>
            b.hours - a.hours ||
            a.categoryTitle.localeCompare(b.categoryTitle, undefined, { sensitivity: 'base' })
          )
          .map((category) => ({
            categoryId: category.categoryId,
            categoryTitle: category.categoryTitle,
            hours: roundToTwoDecimals(category.hours)
          }))
      : [];

    buckets.push({
      periodStart: key,
      totalHours: roundToTwoDecimals(bucketData ? bucketData.totalHours : 0),
      categories
    });

    cursor = addBucket(cursor, bucket);
  }

  return buckets;
};

const buildTimeEntryBackedTimeSeries = async ({
  userId,
  fromDate,
  toDate,
  bucket,
  categoryFilter
}) => {
  const timeEntries = await TimeEntry.find(
    buildTimeEntryMatch({
      userId,
      fromDate,
      toDate
    })
  )
    .select('startedAt endedAt category')
    .populate('category', 'title')
    .lean();

  const bucketMap = new Map();
  const rangeStart = fromDate;
  const rangeEndExclusive = addUtcDays(toDate, 1);

  timeEntries.forEach((entry) => {
    const entryStart = new Date(entry.startedAt);
    const entryEnd = new Date(entry.endedAt);
    const effectiveStart = entryStart > rangeStart ? entryStart : rangeStart;
    const effectiveEnd = entryEnd < rangeEndExclusive ? entryEnd : rangeEndExclusive;

    if (effectiveEnd <= effectiveStart) {
      return;
    }

    const categoryTitle = entry.category?.title || 'Uncategorized';
    const categoryId = entry.category?._id ? String(entry.category._id) : null;
    const shouldIncludeCategory = !categoryFilter || (
      categoryId
        ? categoryFilter.categoryIds.has(categoryId)
        : categoryFilter.includeUncategorized
    );

    let bucketCursor = getBucketStart(effectiveStart, bucket);

    while (bucketCursor < effectiveEnd) {
      const bucketStart = bucketCursor;
      const bucketEnd = addBucket(bucketStart, bucket);
      const overlapStart = effectiveStart > bucketStart ? effectiveStart : bucketStart;
      const overlapEnd = effectiveEnd < bucketEnd ? effectiveEnd : bucketEnd;
      const overlapMinutes = (overlapEnd - overlapStart) / 60000;

      if (overlapMinutes > 0) {
        const key = formatDateOnly(bucketStart);
        const existing = bucketMap.get(key) || {
          periodStart: key,
          totalHours: 0,
          categories: new Map()
        };
        const overlapHours = overlapMinutes / 60;

        existing.totalHours += overlapHours;

        if (shouldIncludeCategory) {
          const categoryExisting = existing.categories.get(categoryTitle) || {
            categoryId,
            categoryTitle,
            hours: 0
          };

          categoryExisting.hours += overlapHours;
          existing.categories.set(categoryTitle, categoryExisting);
        }

        bucketMap.set(key, existing);
      }

      bucketCursor = bucketEnd;
    }
  });

  return buildBucketsFromMap({
    bucketMap,
    fromDate,
    toDate,
    bucket
  });
};

const getTimeByCategory = async (req, res) => {
  try {
    const fromDate = parseDateOnlyParam(req.query.from, 'from');
    const toDate = parseDateOnlyParam(req.query.to, 'to');

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        error: 'from must be on or before to.'
      });
    }

    const match = buildTaskMatch({
      userId: req.user.id,
      fromDate,
      toDate
    });

    const rows = await Task.aggregate([
      {
        $match: match
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            categoryId: '$category._id',
            categoryTitle: '$category.title'
          },
          hours: { $sum: '$timeSpent' }
        }
      },
      {
        $match: {
          hours: { $gt: 0 }
        }
      },
      {
        $project: {
          _id: 0,
          categoryId: {
            $ifNull: [{ $toString: '$_id.categoryId' }, null]
          },
          categoryTitle: {
            $ifNull: ['$_id.categoryTitle', 'Uncategorized']
          },
          hours: 1
        }
      },
      {
        $sort: {
          hours: -1,
          categoryTitle: 1
        }
      }
    ]);

    const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
    const categories = rows.map((row) => ({
      ...row,
      hours: roundToTwoDecimals(row.hours),
      percentage: totalHours > 0
        ? roundToTwoDecimals((row.hours / totalHours) * 100)
        : 0
    }));

    res.status(200).json({
      totalHours: roundToTwoDecimals(totalHours),
      categories
    });
  } catch (err) {
    if (
      err.message === 'from must use YYYY-MM-DD format.' ||
      err.message === 'to must use YYYY-MM-DD format.' ||
      err.message === 'from must be a valid calendar date.' ||
      err.message === 'to must be a valid calendar date.' ||
      err.message === 'bucket must be one of day, week, or month.'
    ) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: err.message });
  }
};

const getTimeSeries = async (req, res) => {
  try {
    const fromDate = parseDateOnlyParam(req.query.from, 'from');
    const toDate = parseDateOnlyParam(req.query.to, 'to');
    const bucket = parseBucketParam(req.query.bucket);
    const categoryFilter = parseCategoryIdsParam(req.query.categoryIds);

    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: 'from and to are required for time series analytics.'
      });
    }

    if (fromDate > toDate) {
      return res.status(400).json({
        error: 'from must be on or before to.'
      });
    }

    const buckets = await buildTimeEntryBackedTimeSeries({
      userId: req.user.id,
      fromDate,
      toDate,
      bucket,
      categoryFilter
    });

    res.status(200).json({
      bucket,
      from: formatDateOnly(fromDate),
      to: formatDateOnly(toDate),
      buckets
    });
  } catch (err) {
    if (
      err.message === 'from must use YYYY-MM-DD format.' ||
      err.message === 'to must use YYYY-MM-DD format.' ||
      err.message === 'from must be a valid calendar date.' ||
      err.message === 'to must be a valid calendar date.' ||
      err.message === 'bucket must be one of day, week, or month.' ||
      err.message === 'categoryIds must contain comma-separated category ids or "uncategorized".'
    ) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getTimeByCategory,
  getTimeSeries
};
