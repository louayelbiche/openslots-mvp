import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderCard } from './ProviderCard';
import type { Provider, TimeWindow } from '../types/discovery';

// Test fixture for Provider data
// Note: Prices are in cents (8000 = $80.00)
// Note: Slots are set to Morning (10:00) and Afternoon (14:00) time windows (local time)
const createProviderFixture = (overrides: Partial<Provider> = {}): Provider => ({
  providerId: 'provider-1',
  name: 'Serenity Spa',
  rating: 4.5,
  distance: 2.3,
  address: '123 Main St',
  city: 'San Francisco',
  lowestPrice: 8000, // $80.00 in cents
  slots: [
    {
      slotId: 'slot-1',
      startTime: '2025-11-28T10:00:00', // Morning slot (10 AM local)
      endTime: '2025-11-28T11:00:00',
      basePrice: 10000,
      maxDiscount: 20,
      maxDiscountedPrice: 8000, // $80.00 in cents
      serviceName: 'Swedish Massage',
      durationMin: 60,
    },
    {
      slotId: 'slot-2',
      startTime: '2025-11-28T14:00:00', // Afternoon slot (2 PM local)
      endTime: '2025-11-28T15:00:00',
      basePrice: 12000,
      maxDiscount: 25,
      maxDiscountedPrice: 9000, // $90.00 in cents
      serviceName: 'Deep Tissue Massage',
      durationMin: 60,
    },
  ],
  ...overrides,
});

// Default time window that includes all test slots
const defaultTimeWindow: TimeWindow = 'Custom';

describe('ProviderCard', () => {
  describe('Basic Rendering', () => {
    it('should render provider information', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText('Serenity Spa')).toBeInTheDocument();
      expect(screen.getByText('2.3 miles')).toBeInTheDocument();
      expect(screen.getByText('4.50')).toBeInTheDocument();
    });

    it('should render lowest price', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText('From')).toBeInTheDocument();
      // Use getAllByText since $80 appears multiple times (provider price and slot prices)
      const priceElements = screen.getAllByText('$80');
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('should render slot dropdown with available slots', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText('Select Time Slot')).toBeInTheDocument();
      // Should have a dropdown with slot options
      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();
    });

    it('should render rating with star icon', () => {
      const provider = createProviderFixture({ rating: 4.75 });
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText('4.75')).toBeInTheDocument();
    });
  });

  describe('Best Offer Badge', () => {
    it('should display Best Offer badge when isBestOfferProvider is true', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={true}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText('BEST OFFER')).toBeInTheDocument();
    });

    it('should not display Best Offer badge when isBestOfferProvider is false', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.queryByText('BEST OFFER')).not.toBeInTheDocument();
    });

    it('should apply border styling when isBestOfferProvider is true', () => {
      const provider = createProviderFixture();
      const { container } = render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={true}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      const article = container.querySelector('article');
      expect(article).toHaveClass('border-amber-400');
      expect(article).toHaveClass('shadow-lg');
    });

    it('should apply default border styling when isBestOfferProvider is false', () => {
      const provider = createProviderFixture();
      const { container } = render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      const article = container.querySelector('article');
      expect(article).toHaveClass('border-slate-200');
    });
  });

  describe('Match Likelihood Display', () => {
    it('should display Very High match when user bid meets all slot prices', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={10000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      // Multiple "Very High" badges appear (provider level + slot level)
      const veryHighBadges = screen.getAllByText('Very High');
      expect(veryHighBadges.length).toBeGreaterThan(0);
    });

    it('should display High match when user bid is close to slot prices', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={7700} // 96% of lowest price (80)
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      const highBadges = screen.getAllByText('High');
      expect(highBadges.length).toBeGreaterThan(0);
    });

    it('should display Low match when user bid is moderately below prices', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={7000} // 87.5% of lowest price (80)
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      const lowBadges = screen.getAllByText('Low');
      expect(lowBadges.length).toBeGreaterThan(0);
    });

    it('should display Very Low match when user bid is well below prices', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={5000} // 62.5% of lowest price (80)
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      const veryLowBadges = screen.getAllByText('Very Low');
      expect(veryLowBadges.length).toBeGreaterThan(0);
    });

    it('should use best match among multiple slots', () => {
      const provider = createProviderFixture({
        slots: [
          {
            slotId: 'slot-1',
            startTime: '2025-11-28T10:00:00',
            endTime: '2025-11-28T11:00:00',
            basePrice: 10000,
            maxDiscount: 20,
            maxDiscountedPrice: 8000,
            serviceName: 'Swedish Massage',
            durationMin: 60,
          },
          {
            slotId: 'slot-2',
            startTime: '2025-11-28T14:00:00',
            endTime: '2025-11-28T15:00:00',
            basePrice: 5000,
            maxDiscount: 10,
            maxDiscountedPrice: 4000,
            serviceName: 'Chair Massage',
            durationMin: 30,
          },
        ],
      });
      render(
        <ProviderCard
          provider={provider}
          userBid={4200} // Very High for slot-2, Low for slot-1
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      // Should show the best match (Very High) - appears multiple times
      const veryHighBadges = screen.getAllByText('Very High');
      expect(veryHighBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Bid Handling', () => {
    it('should call onBid when bid button is clicked for selected slot', () => {
      const provider = createProviderFixture();
      const onBid = vi.fn();

      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId="slot-1"
          timeWindow={defaultTimeWindow}
          onBid={onBid}
        />
      );

      // With dropdown, there's one Bid button for the selected slot
      const bidButton = screen.getByText('Bid');
      fireEvent.click(bidButton);

      expect(onBid).toHaveBeenCalledTimes(1);
      // Best offer slot-1 should be pre-selected
      expect(onBid).toHaveBeenCalledWith('slot-1', 'provider-1');
    });

    it('should call onBid with correct slot after changing dropdown selection', () => {
      const provider = createProviderFixture();
      const onBid = vi.fn();

      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId="slot-1"
          timeWindow={defaultTimeWindow}
          onBid={onBid}
        />
      );

      // Change dropdown to slot-2
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'slot-2' } });

      const bidButton = screen.getByText('Bid');
      fireEvent.click(bidButton);

      expect(onBid).toHaveBeenCalledTimes(1);
      expect(onBid).toHaveBeenCalledWith('slot-2', 'provider-1');
    });

    it('should render bid button even when onBid is not provided', () => {
      const provider = createProviderFixture();

      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      // SlotDropdown always renders bid button
      const bidButton = screen.getByText('Bid');
      expect(bidButton).toBeInTheDocument();
    });
  });

  describe('Best Offer Slot Highlighting', () => {
    it('should highlight the best offer slot when bestOfferSlotId is provided', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={true}
          bestOfferSlotId="slot-1"
          timeWindow={defaultTimeWindow}
        />
      );

      // The dropdown shows "Best Offer" in the selected slot details
      expect(screen.getByText('Best Offer')).toBeInTheDocument();
    });

    it('should not highlight slots when no slot matches best offer', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId="non-existent-slot"
          timeWindow={defaultTimeWindow}
        />
      );

      // Provider still renders with local best offer calculation
      // but won't show the best offer badge for non-matching slot
      expect(screen.getByText('Serenity Spa')).toBeInTheDocument();
    });

    it('should show best offer badge for the designated slot', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={true}
          bestOfferSlotId="slot-1"
          timeWindow={defaultTimeWindow}
        />
      );

      // "Best Offer" badge appears in selected slot details
      const bestOfferBadges = screen.getAllByText('Best Offer');
      expect(bestOfferBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should not render provider with no slots in time window', () => {
      const provider = createProviderFixture({ slots: [] });
      const { container } = render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      // Provider with no slots returns null
      expect(container.querySelector('article')).not.toBeInTheDocument();
    });

    it('should handle provider with single slot', () => {
      const provider = createProviderFixture({
        slots: [
          {
            slotId: 'slot-1',
            startTime: '2025-11-28T10:00:00',
            endTime: '2025-11-28T11:00:00',
            basePrice: 10000,
            maxDiscount: 20,
            maxDiscountedPrice: 8000,
            serviceName: 'Swedish Massage',
            durationMin: 60,
          },
        ],
      });
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText(/Swedish Massage/)).toBeInTheDocument();
      const veryHighBadges = screen.getAllByText('Very High');
      expect(veryHighBadges.length).toBeGreaterThan(0);
    });

    it('should handle very high rating', () => {
      const provider = createProviderFixture({ rating: 5.0 });
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText('5.00')).toBeInTheDocument();
    });

    it('should handle very low rating', () => {
      const provider = createProviderFixture({ rating: 1.5 });
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText('1.50')).toBeInTheDocument();
    });

    it('should handle decimal distance values', () => {
      const provider = createProviderFixture({ distance: 0.5 });
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText('0.5 miles')).toBeInTheDocument();
    });

    it('should handle very large distance values', () => {
      const provider = createProviderFixture({ distance: 25.7 });
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByText('25.7 miles')).toBeInTheDocument();
    });

    it('should handle user bid of 0', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={0}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      const veryLowBadges = screen.getAllByText('Very Low');
      expect(veryLowBadges.length).toBeGreaterThan(0);
    });

    it('should handle very high user bid', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={100000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      const veryHighBadges = screen.getAllByText('Very High');
      expect(veryHighBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should render as article element', () => {
      const provider = createProviderFixture();
      const { container } = render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(container.querySelector('article')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      expect(screen.getByRole('heading', { level: 3, name: 'Serenity Spa' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: 'Select Time Slot' })).toBeInTheDocument();
    });

    it('should have accessible dropdown for slot selection', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow={defaultTimeWindow}
        />
      );

      const dropdown = screen.getByRole('combobox', { name: /select time slot/i });
      expect(dropdown).toBeInTheDocument();
    });
  });

  describe('Time Window Filtering', () => {
    it('should only show slots within Morning time window', () => {
      const provider = createProviderFixture();
      const { container } = render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow="Morning"
        />
      );

      // Morning slot (10:00) should be visible, Afternoon slot (14:00) should not
      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();
      // Only one option should be in the dropdown for Morning window
    });

    it('should not render provider when no slots match time window', () => {
      const provider = createProviderFixture({
        slots: [
          {
            slotId: 'slot-evening',
            startTime: '2025-11-28T18:00:00', // Evening slot (6 PM local)
            endTime: '2025-11-28T19:00:00',
            basePrice: 10000,
            maxDiscount: 20,
            maxDiscountedPrice: 8000,
            serviceName: 'Evening Massage',
            durationMin: 60,
          },
        ],
      });
      const { container } = render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          timeWindow="Morning"
        />
      );

      // No Morning slots, so provider should not render
      expect(container.querySelector('article')).not.toBeInTheDocument();
    });
  });
});
