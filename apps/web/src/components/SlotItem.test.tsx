import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlotItem } from './SlotItem';
import type { Slot, MatchLikelihood } from '../types/discovery';

// Test fixture for Slot data - prices are in cents
const createSlotFixture = (overrides: Partial<Slot> = {}): Slot => ({
  slotId: 'slot-1',
  startTime: '2025-11-28T10:00:00Z',
  endTime: '2025-11-28T11:00:00Z',
  basePrice: 10000, // $100.00 in cents
  maxDiscount: 20,
  maxDiscountedPrice: 8000, // $80.00 in cents
  serviceName: 'Swedish Massage',
  durationMin: 60,
  ...overrides,
});

describe('SlotItem', () => {
  describe('Basic Rendering', () => {
    it('should render slot time range', () => {
      const slot = createSlotFixture();
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      // Time formatting is locale-dependent, but we can check for basic structure
      const timeText = screen.getByText(/AM|PM/i);
      expect(timeText).toBeInTheDocument();
    });

    it('should render service name', () => {
      const slot = createSlotFixture();
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/Swedish Massage/)).toBeInTheDocument();
    });

    it('should render duration', () => {
      const slot = createSlotFixture({ durationMin: 60 });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/60 min/)).toBeInTheDocument();
    });

    it('should render max discounted price', () => {
      const slot = createSlotFixture({ maxDiscountedPrice: 8000 }); // $80.00 in cents
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText('$80')).toBeInTheDocument();
    });

    it('should render match likelihood badge', () => {
      const slot = createSlotFixture();
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="Very High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText('Very High')).toBeInTheDocument();
    });
  });

  describe('Best Offer Badge', () => {
    it('should display Best badge when isBestOffer is true', () => {
      const slot = createSlotFixture();
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={true}
        />
      );

      expect(screen.getByText('Best')).toBeInTheDocument();
    });

    it('should not display Best badge when isBestOffer is false', () => {
      const slot = createSlotFixture();
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.queryByText('Best')).not.toBeInTheDocument();
    });

    it('should apply best offer styling when isBestOffer is true', () => {
      const slot = createSlotFixture();
      const { container } = render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={true}
        />
      );

      const slotDiv = container.firstChild;
      expect(slotDiv).toHaveClass('bg-amber-50');
      expect(slotDiv).toHaveClass('border-amber-300');
    });

    it('should apply default styling when isBestOffer is false', () => {
      const slot = createSlotFixture();
      const { container } = render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      const slotDiv = container.firstChild;
      expect(slotDiv).toHaveClass('bg-slate-50');
      expect(slotDiv).toHaveClass('border-slate-200');
    });
  });

  describe('Match Likelihood Display', () => {
    const likelihoods: MatchLikelihood[] = ['Very High', 'High', 'Low', 'Very Low'];

    likelihoods.forEach((likelihood) => {
      it(`should display ${likelihood} match badge`, () => {
        const slot = createSlotFixture();
        render(
          <SlotItem
            slot={slot}
            matchLikelihood={likelihood}
            isBestOffer={false}
          />
        );

        expect(screen.getByText(likelihood)).toBeInTheDocument();
      });
    });

    it('should render match badge with small size', () => {
      const slot = createSlotFixture();
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      const badge = screen.getByText('High');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('text-xs');
    });
  });

  describe('Bid Button', () => {
    it('should render bid button when onBid is provided', () => {
      const slot = createSlotFixture();
      const onBid = vi.fn();

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
          onBid={onBid}
        />
      );

      expect(screen.getByText('Bid')).toBeInTheDocument();
    });

    it('should not render bid button when onBid is not provided', () => {
      const slot = createSlotFixture();

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.queryByText('Bid')).not.toBeInTheDocument();
    });

    it('should call onBid with slot ID when bid button is clicked', () => {
      const slot = createSlotFixture({ slotId: 'slot-123' });
      const onBid = vi.fn();

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
          onBid={onBid}
        />
      );

      const bidButton = screen.getByText('Bid');
      fireEvent.click(bidButton);

      expect(onBid).toHaveBeenCalledTimes(1);
      expect(onBid).toHaveBeenCalledWith('slot-123');
    });

    it('should have proper aria-label for accessibility', () => {
      const slot = createSlotFixture({
        startTime: '2025-11-28T10:00:00Z',
        endTime: '2025-11-28T11:00:00Z',
      });
      const onBid = vi.fn();

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
          onBid={onBid}
        />
      );

      const bidButton = screen.getByRole('button');
      const ariaLabel = bidButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('Bid on slot');
    });

    it('should have button type attribute', () => {
      const slot = createSlotFixture();
      const onBid = vi.fn();

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
          onBid={onBid}
        />
      );

      const bidButton = screen.getByText('Bid');
      expect(bidButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Time Formatting', () => {
    it('should format and display time with AM or PM', () => {
      const slot = createSlotFixture({
        startTime: '2025-11-28T09:00:00Z',
        endTime: '2025-11-28T10:00:00Z',
      });

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      // Should contain either AM or PM (depends on timezone)
      const text = screen.getByText(/AM|PM/i);
      expect(text).toBeInTheDocument();
    });

    it('should format time correctly regardless of timezone', () => {
      const slot = createSlotFixture({
        startTime: '2025-11-28T14:00:00Z',
        endTime: '2025-11-28T15:00:00Z',
      });

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      // Should contain either AM or PM
      const text = screen.getByText(/AM|PM/i);
      expect(text).toBeInTheDocument();
    });

    it('should display time range with hyphen separator', () => {
      const slot = createSlotFixture({
        startTime: '2025-11-28T10:00:00Z',
        endTime: '2025-11-28T11:00:00Z',
      });

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      const timeRange = screen.getByText(/-/);
      expect(timeRange).toBeInTheDocument();
    });
  });

  describe('Duration Display', () => {
    it('should display 30-minute duration', () => {
      const slot = createSlotFixture({ durationMin: 30 });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/30 min/)).toBeInTheDocument();
    });

    it('should display 60-minute duration', () => {
      const slot = createSlotFixture({ durationMin: 60 });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/60 min/)).toBeInTheDocument();
    });

    it('should display 90-minute duration', () => {
      const slot = createSlotFixture({ durationMin: 90 });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/90 min/)).toBeInTheDocument();
    });

    it('should display 120-minute duration', () => {
      const slot = createSlotFixture({ durationMin: 120 });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/120 min/)).toBeInTheDocument();
    });
  });

  describe('Price Display', () => {
    it('should display price in dollars', () => {
      const slot = createSlotFixture({ maxDiscountedPrice: 7500 }); // $75.00 in cents
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText('$75')).toBeInTheDocument();
    });

    it('should handle decimal prices', () => {
      const slot = createSlotFixture({ maxDiscountedPrice: 7999 }); // $79.99 in cents
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText('$79.99')).toBeInTheDocument();
    });

    it('should handle very low prices', () => {
      const slot = createSlotFixture({ maxDiscountedPrice: 1000 }); // $10.00 in cents
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText('$10')).toBeInTheDocument();
    });

    it('should handle very high prices', () => {
      const slot = createSlotFixture({ maxDiscountedPrice: 50000 }); // $500.00 in cents
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText('$500')).toBeInTheDocument();
    });
  });

  describe('Service Name Display', () => {
    it('should display different service types', () => {
      const serviceNames = [
        'Swedish Massage',
        'Deep Tissue Massage',
        'Hot Stone Massage',
        'Acupuncture Session',
        'Facial Treatment',
      ];

      serviceNames.forEach((serviceName) => {
        const slot = createSlotFixture({ serviceName });
        const { unmount } = render(
          <SlotItem
            slot={slot}
            matchLikelihood="High"
            isBestOffer={false}
          />
        );

        expect(screen.getByText(new RegExp(serviceName))).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle long service names', () => {
      const slot = createSlotFixture({
        serviceName: 'Deep Tissue Massage with Aromatherapy and Hot Stones',
      });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/Deep Tissue Massage with Aromatherapy and Hot Stones/)).toBeInTheDocument();
    });

    it('should handle short service names', () => {
      const slot = createSlotFixture({ serviceName: 'Massage' });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/Massage/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle slot with zero discount', () => {
      const slot = createSlotFixture({
        basePrice: 10000, // $100.00 in cents
        maxDiscount: 0,
        maxDiscountedPrice: 10000, // $100.00 in cents
      });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="Very Low"
          isBestOffer={false}
        />
      );

      expect(screen.getByText('$100')).toBeInTheDocument();
      expect(screen.getByText('Very Low')).toBeInTheDocument();
    });

    it('should handle slot with maximum discount', () => {
      const slot = createSlotFixture({
        basePrice: 10000, // $100.00 in cents
        maxDiscount: 50,
        maxDiscountedPrice: 5000, // $50.00 in cents
      });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="Very High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText('$50')).toBeInTheDocument();
    });

    it('should handle midnight time slots', () => {
      const slot = createSlotFixture({
        startTime: '2025-11-28T00:00:00Z',
        endTime: '2025-11-28T01:00:00Z',
      });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      // Should render without errors
      expect(screen.getByText(/Swedish Massage/)).toBeInTheDocument();
    });

    it('should handle late night time slots', () => {
      const slot = createSlotFixture({
        startTime: '2025-11-28T23:00:00Z',
        endTime: '2025-11-29T00:00:00Z',
      });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      // Should render without errors
      expect(screen.getByText(/Swedish Massage/)).toBeInTheDocument();
    });

    it('should handle 15-minute duration', () => {
      const slot = createSlotFixture({ durationMin: 15 });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/15 min/)).toBeInTheDocument();
    });

    it('should handle 180-minute duration', () => {
      const slot = createSlotFixture({ durationMin: 180 });
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={false}
        />
      );

      expect(screen.getByText(/180 min/)).toBeInTheDocument();
    });
  });

  describe('Combined Scenarios', () => {
    it('should render best offer with very high match', () => {
      const slot = createSlotFixture();
      render(
        <SlotItem
          slot={slot}
          matchLikelihood="Very High"
          isBestOffer={true}
        />
      );

      expect(screen.getByText('Best')).toBeInTheDocument();
      expect(screen.getByText('Very High')).toBeInTheDocument();
    });

    it('should render best offer with bid button', () => {
      const slot = createSlotFixture();
      const onBid = vi.fn();

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="Very High"
          isBestOffer={true}
          onBid={onBid}
        />
      );

      expect(screen.getByText('Best')).toBeInTheDocument();
      expect(screen.getByText('Bid')).toBeInTheDocument();
      expect(screen.getByText('Very High')).toBeInTheDocument();
    });

    it('should render all information correctly together', () => {
      const slot = createSlotFixture({
        slotId: 'slot-special',
        startTime: '2025-11-28T14:30:00Z',
        endTime: '2025-11-28T15:30:00Z',
        maxDiscountedPrice: 8550, // $85.50 in cents
        serviceName: 'Hot Stone Massage',
        durationMin: 60,
      });
      const onBid = vi.fn();

      render(
        <SlotItem
          slot={slot}
          matchLikelihood="High"
          isBestOffer={true}
          onBid={onBid}
        />
      );

      expect(screen.getByText('Best')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('$85.50')).toBeInTheDocument();
      expect(screen.getByText(/Hot Stone Massage/)).toBeInTheDocument();
      expect(screen.getByText(/60 min/)).toBeInTheDocument();

      const bidButton = screen.getByText('Bid');
      fireEvent.click(bidButton);
      expect(onBid).toHaveBeenCalledWith('slot-special');
    });
  });
});
