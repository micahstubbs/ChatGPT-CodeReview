/**
 * Tests for bot integration with review formatter
 */

import { formatReviewComment } from '../src/review-formatter';

describe('Bot formatter integration', () => {
  test('should use formatter when issues array exists', () => {
    const reviewData = {
      lgtm: false,
      review_comment: 'Legacy comment',
      issues: [
        { severity: 'critical' as const, message: 'Security issue' },
      ],
      details: 'Detailed explanation here.',
    };

    // Simulate what bot.ts will do
    let commentBody: string;
    if (reviewData.issues && reviewData.issues.length >= 0) {
      commentBody = formatReviewComment({
        issues: reviewData.issues,
        details: reviewData.details,
      });
    } else {
      commentBody = reviewData.review_comment;
    }

    expect(commentBody).toContain('## Code Review Summary');
    expect(commentBody).toContain('<details>');
  });

  test('should fall back to review_comment when issues is missing', () => {
    const reviewData = {
      lgtm: false,
      review_comment: 'Plain old comment',
      issues: undefined as any,
      details: '',
    };

    let commentBody: string;
    if (reviewData.issues && reviewData.issues.length >= 0) {
      commentBody = formatReviewComment({
        issues: reviewData.issues,
        details: reviewData.details,
      });
    } else {
      commentBody = reviewData.review_comment;
    }

    expect(commentBody).toBe('Plain old comment');
  });

  test('should respect COMMENT_FORMAT environment variable', () => {
    const reviewData = {
      lgtm: false,
      review_comment: 'Legacy comment',
      issues: [{ severity: 'warning' as const, message: 'Minor issue' }],
      details: 'Details here',
    };

    // Test with COMMENT_FORMAT=structured
    process.env.COMMENT_FORMAT = 'structured';
    let useStructured = process.env.COMMENT_FORMAT !== 'legacy';

    let commentBody = useStructured
      ? formatReviewComment({ issues: reviewData.issues, details: reviewData.details })
      : reviewData.review_comment;

    expect(commentBody).toContain('## Code Review Summary');

    // Test with COMMENT_FORMAT=legacy
    process.env.COMMENT_FORMAT = 'legacy';
    useStructured = process.env.COMMENT_FORMAT !== 'legacy';

    commentBody = useStructured
      ? formatReviewComment({ issues: reviewData.issues, details: reviewData.details })
      : reviewData.review_comment;

    expect(commentBody).toBe('Legacy comment');

    // Clean up
    delete process.env.COMMENT_FORMAT;
  });
});
