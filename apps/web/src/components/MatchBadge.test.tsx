import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchBadge, calculateMatchLikelihood } from './MatchBadge';
import type { MatchLikelihood } from '../types/discovery';

describe('MatchBadge', () => {
  describe('Component Rendering', () => {
    it('should render with Very High likelihood', () => {
      render(<MatchBadge likelihood="Very High" />);

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Very High');
      expect(badge).toHaveClass('bg-emerald-700');
      expect(badge).toHaveClass('text-white');
    });

    it('should render with High likelihood', () => {
      render(<MatchBadge likelihood="High" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('High');
      expect(badge).toHaveClass('bg-emerald-500');
      expect(badge).toHaveClass('text-white');
    });

    it('should render with Low likelihood', () => {
      render(<MatchBadge likelihood="Low" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Low');
      expect(badge).toHaveClass('bg-amber-500');
      expect(badge).toHaveClass('text-white');
    });

    it('should render with Very Low likelihood', () => {
      render(<MatchBadge likelihood="Very Low" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Very Low');
      expect(badge).toHaveClass('bg-red-500');
      expect(badge).toHaveClass('text-white');
    });
  });

  describe('Size Variants', () => {
    it('should render with medium size by default', () => {
      render(<MatchBadge likelihood="High" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('text-sm');
    });

    it('should render with small size when size="sm"', () => {
      render(<MatchBadge likelihood="High" size="sm" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('text-xs');
    });

    it('should render with medium size when size="md"', () => {
      render(<MatchBadge likelihood="High" size="md" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('text-sm');
    });
  });

  describe('Color Mapping', () => {
    const testCases: Array<{ likelihood: MatchLikelihood; bgColor: string }> = [
      { likelihood: 'Very High', bgColor: 'bg-emerald-700' },
      { likelihood: 'High', bgColor: 'bg-emerald-500' },
      { likelihood: 'Low', bgColor: 'bg-amber-500' },
      { likelihood: 'Very Low', bgColor: 'bg-red-500' },
    ];

    testCases.forEach(({ likelihood, bgColor }) => {
      it(`should apply correct color for ${likelihood}`, () => {
        render(<MatchBadge likelihood={likelihood} />);

        const badge = screen.getByRole('status');
        expect(badge).toHaveClass(bgColor);
        expect(badge).toHaveClass('text-white');
      });
    });
  });
});

describe('calculateMatchLikelihood', () => {
  describe('Very High Match', () => {
    it('should return Very High when bid equals max discounted price', () => {
      const result = calculateMatchLikelihood(100, 100);
      expect(result).toBe('Very High');
    });

    it('should return Very High when bid exceeds max discounted price', () => {
      const result = calculateMatchLikelihood(150, 100);
      expect(result).toBe('Very High');
    });

    it('should return Very High when bid is slightly above price', () => {
      const result = calculateMatchLikelihood(101, 100);
      expect(result).toBe('Very High');
    });
  });

  describe('High Match', () => {
    it('should return High when bid is 95% of max discounted price', () => {
      const result = calculateMatchLikelihood(95, 100);
      expect(result).toBe('High');
    });

    it('should return High when bid is between 95% and 99%', () => {
      const result = calculateMatchLikelihood(97, 100);
      expect(result).toBe('High');
    });

    it('should return High at the boundary (95%)', () => {
      const result = calculateMatchLikelihood(190, 200);
      expect(result).toBe('High');
    });
  });

  describe('Low Match', () => {
    it('should return Low when bid is 85% of max discounted price', () => {
      const result = calculateMatchLikelihood(85, 100);
      expect(result).toBe('Low');
    });

    it('should return Low when bid is between 85% and 94%', () => {
      const result = calculateMatchLikelihood(90, 100);
      expect(result).toBe('Low');
    });

    it('should return Low at the boundary (85%)', () => {
      const result = calculateMatchLikelihood(170, 200);
      expect(result).toBe('Low');
    });
  });

  describe('Very Low Match', () => {
    it('should return Very Low when bid is below 85%', () => {
      const result = calculateMatchLikelihood(80, 100);
      expect(result).toBe('Very Low');
    });

    it('should return Very Low when bid is significantly lower', () => {
      const result = calculateMatchLikelihood(50, 100);
      expect(result).toBe('Very Low');
    });

    it('should return Very Low when bid is 0', () => {
      const result = calculateMatchLikelihood(0, 100);
      expect(result).toBe('Very Low');
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal bid amounts', () => {
      const result = calculateMatchLikelihood(95.5, 100);
      expect(result).toBe('High');
    });

    it('should handle decimal max discounted prices', () => {
      const result = calculateMatchLikelihood(100, 105.75);
      expect(result).toBe('Low'); // 100 / 105.75 = 94.6%
    });

    it('should handle both values as decimals', () => {
      const result = calculateMatchLikelihood(99.99, 100.01);
      expect(result).toBe('High');
    });

    it('should handle very small prices', () => {
      const result = calculateMatchLikelihood(5, 5);
      expect(result).toBe('Very High');
    });

    it('should handle very large prices', () => {
      const result = calculateMatchLikelihood(10000, 10000);
      expect(result).toBe('Very High');
    });

    it('should handle boundary at exactly 100%', () => {
      const result = calculateMatchLikelihood(200, 200);
      expect(result).toBe('Very High');
    });

    it('should handle boundary just below 95%', () => {
      const result = calculateMatchLikelihood(94.9, 100);
      expect(result).toBe('Low');
    });

    it('should handle boundary just below 85%', () => {
      const result = calculateMatchLikelihood(84.9, 100);
      expect(result).toBe('Very Low');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should calculate for typical haircut scenario', () => {
      const userBid = 45;
      const maxDiscountedPrice = 50;
      const result = calculateMatchLikelihood(userBid, maxDiscountedPrice);
      expect(result).toBe('Low'); // 90% match
    });

    it('should calculate for massage scenario with exact match', () => {
      const userBid = 80;
      const maxDiscountedPrice = 80;
      const result = calculateMatchLikelihood(userBid, maxDiscountedPrice);
      expect(result).toBe('Very High');
    });

    it('should calculate for budget constraint scenario', () => {
      const userBid = 30;
      const maxDiscountedPrice = 50;
      const result = calculateMatchLikelihood(userBid, maxDiscountedPrice);
      expect(result).toBe('Very Low'); // 60% match
    });

    it('should calculate for willing-to-pay-more scenario', () => {
      const userBid = 100;
      const maxDiscountedPrice = 75;
      const result = calculateMatchLikelihood(userBid, maxDiscountedPrice);
      expect(result).toBe('Very High'); // 133% match
    });
  });
});
