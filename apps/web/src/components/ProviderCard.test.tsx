import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderCard } from './ProviderCard';
import type { Provider } from '../types/discovery';

// Test fixture for Provider data
// Note: Prices are in cents (8000 = $80.00)
// Note: Time window filtering is done at the page level, not component level
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
      startTime: '2025-11-28T10:00:00',
      endTime: '2025-11-28T11:00:00',
      basePrice: 10000,
      maxDiscount: 20,
      maxDiscountedPrice: 8000, // $80.00 in cents
      serviceName: 'Swedish Massage',
      durationMin: 60,
    },
    {
      slotId: 'slot-2',
      startTime: '2025-11-28T14:00:00',
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
        />
      );

      const article = container.querySelector('article');
      expect(article).toHaveClass('border-slate-200');
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
        />
      );

      // "Best Offer" badge appears in selected slot details
      const bestOfferBadges = screen.getAllByText('Best Offer');
      expect(bestOfferBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should render provider with empty slots showing no availability message', () => {
      // Note: In practice, the page filters out providers with no slots
      // but the component handles this gracefully if passed empty slots
      const provider = createProviderFixture({ slots: [] });
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
        />
      );

      // SlotDropdown shows "no slots" message
      expect(screen.getByText('No slots available in this time window')).toBeInTheDocument();
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
        />
      );

      expect(screen.getByText(/Swedish Massage/)).toBeInTheDocument();
    });

    it('should handle very high rating', () => {
      const provider = createProviderFixture({ rating: 5.0 });
      render(
        <ProviderCard
          provider={provider}
          userBid={8000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
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
        />
      );

      // Should render without crashing
      expect(screen.getByText('Serenity Spa')).toBeInTheDocument();
    });

    it('should handle very high user bid', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={100000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
        />
      );

      // Should render without crashing
      expect(screen.getByText('Serenity Spa')).toBeInTheDocument();
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
        />
      );

      const dropdown = screen.getByRole('combobox', { name: /select time slot/i });
      expect(dropdown).toBeInTheDocument();
    });
  });

});
