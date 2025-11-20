/**
 * Tests for review-analyzer module
 * Phase 1: Critical Security Fixes (#25, #26, #14)
 */

import {
  ReviewerAuth,
  calculateQualityScore,
  verifyReviewerAuthorization
} from '../src/review-analyzer';

// Type augmentation for global fetch mock
declare global {
  var fetch: jest.Mock;
}

describe('review-analyzer', () => {
  describe('Issue #26: ReviewerAuth interface (PAT exposure)', () => {
    test('ReviewerAuth should have verifiedAt field', async () => {
      // Mock fetch to return successful collaborator check
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          permission: 'write',
          user: { login: 'test-user' }
        })
      }) as jest.Mock;

      const auth = await verifyReviewerAuthorization(
        'test-user',
        'owner',
        'repo',
        'fake-token'
      );

      expect(auth).toHaveProperty('verifiedAt');
      expect((auth as any).verifiedAt).toBeInstanceOf(Date);
    });

    test('ReviewerAuth should NOT have authToken field', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          permission: 'write',
          user: { login: 'test-user' }
        })
      }) as jest.Mock;

      const auth = await verifyReviewerAuthorization(
        'test-user',
        'owner',
        'repo',
        'fake-token'
      );

      expect(auth).not.toHaveProperty('authToken');
    });

    test('verifyReviewerAuthorization should never return token in response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          permission: 'admin',
          user: { login: 'admin-user' }
        })
      }) as jest.Mock;

      const auth = await verifyReviewerAuthorization(
        'admin-user',
        'owner',
        'repo',
        'secret-token-123'
      );

      // Verify response doesn't contain the token
      const authString = JSON.stringify(auth);
      expect(authString).not.toContain('secret-token-123');
      expect(auth).not.toHaveProperty('authToken');
    });
  });

  describe('Issue #25: 404 authorization bug', () => {
    test('verifyReviewerAuthorization returns isVerified:false on 404', async () => {
      // Mock GitHub API 404 response (user is not a collaborator)
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }) as jest.Mock;

      const auth = await verifyReviewerAuthorization(
        'non-collaborator',
        'owner',
        'repo',
        'fake-token'
      );

      expect(auth.isVerified).toBe(false);
    });

    test('verifyReviewerAuthorization returns hasWriteAccess:false on 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }) as jest.Mock;

      const auth = await verifyReviewerAuthorization(
        'non-collaborator',
        'owner',
        'repo',
        'fake-token'
      );

      expect(auth.hasWriteAccess).toBe(false);
    });

    test('verifyReviewerAuthorization includes verifiedAt on 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }) as jest.Mock;

      const auth = await verifyReviewerAuthorization(
        'non-collaborator',
        'owner',
        'repo',
        'fake-token'
      );

      expect((auth as any).verifiedAt).toBeInstanceOf(Date);
    });

    test('verifyReviewerAuthorization returns isVerified:true for valid collaborator', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          permission: 'write',
          user: { login: 'collaborator' }
        })
      }) as jest.Mock;

      const auth = await verifyReviewerAuthorization(
        'collaborator',
        'owner',
        'repo',
        'fake-token'
      );

      expect(auth.isVerified).toBe(true);
      expect(auth.hasWriteAccess).toBe(true);
    });
  });

  describe('Issue #14: LGTM authorization enforcement', () => {
    test('calculateQualityScore throws error when lgtm=true without reviewerAuth', () => {
      const reviewComment = 'Looks good!';

      expect(() => {
        calculateQualityScore(reviewComment, true);
      }).toThrow('SECURITY ERROR: LGTM requires verified reviewer authorization');
    });

    test('calculateQualityScore throws error when lgtm=true with isVerified=false', () => {
      const reviewComment = 'Looks good!';
      const unverifiedAuth = {
        isVerified: false,
        login: 'test-user',
        hasWriteAccess: false,
        verifiedAt: new Date()
      } as any as ReviewerAuth;

      expect(() => {
        calculateQualityScore(reviewComment, true, unverifiedAuth);
      }).toThrow('SECURITY ERROR: LGTM requires isVerified=true');
    });

    test('calculateQualityScore accepts lgtm=false without reviewerAuth', () => {
      const reviewComment = 'Please fix the security issues';

      expect(() => {
        calculateQualityScore(reviewComment, false);
      }).not.toThrow();
    });

    test('calculateQualityScore accepts lgtm=true with valid reviewerAuth', () => {
      const reviewComment = 'Looks good!';
      const validAuth = {
        isVerified: true,
        login: 'reviewer',
        hasWriteAccess: true,
        verifiedAt: new Date()
      } as any as ReviewerAuth;

      expect(() => {
        calculateQualityScore(reviewComment, true, validAuth);
      }).not.toThrow();
    });

    test('LGTM bonus only applies with verified authorization', () => {
      // Use a review with minor suggestions so score isn't already at 100
      const reviewComment = 'Looks good! Consider adding more test coverage.';
      const validAuth = {
        isVerified: true,
        login: 'reviewer',
        hasWriteAccess: true,
        verifiedAt: new Date()
      } as any as ReviewerAuth;

      const scoreWithAuth = calculateQualityScore(reviewComment, true, validAuth);
      const scoreWithoutLgtm = calculateQualityScore(reviewComment, false);

      // LGTM with valid auth should give bonus (higher score)
      expect(scoreWithAuth.score).toBeGreaterThan(scoreWithoutLgtm.score);
    });

    test('LGTM bonus requires both verified and write access', () => {
      const reviewComment = 'Looks good!';

      // Verified but no write access
      const authNoWrite = {
        isVerified: true,
        login: 'read-only-user',
        hasWriteAccess: false,
        verifiedAt: new Date()
      } as any as ReviewerAuth;

      const scoreNoWrite = calculateQualityScore(reviewComment, true, authNoWrite);
      const scoreBaseline = calculateQualityScore(reviewComment, false);

      // No write access = no LGTM bonus
      expect(scoreNoWrite.score).toBe(scoreBaseline.score);
    });
  });

  describe('Error handling', () => {
    test('verifyReviewerAuthorization returns isVerified:false on error', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock;

      const auth = await verifyReviewerAuthorization(
        'test-user',
        'owner',
        'repo',
        'fake-token'
      );

      expect(auth.isVerified).toBe(false);
      expect(auth.hasWriteAccess).toBe(false);
    });

    test('verifyReviewerAuthorization includes verifiedAt even on error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock;

      const auth = await verifyReviewerAuthorization(
        'test-user',
        'owner',
        'repo',
        'fake-token'
      );

      expect((auth as any).verifiedAt).toBeInstanceOf(Date);
    });
  });
});
