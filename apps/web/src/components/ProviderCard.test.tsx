import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderCard } from './ProviderCard';
import type { Provider } from '../types/discovery';

// Test fixture for Provider data
const createProviderFixture = (overrides: Partial<Provider> = {}): Provider => ({
  providerId: 'provider-1',
  name: 'Serenity Spa',
  rating: 4.5,
  distance: 2.3,
  address: '123 Main St',
  city: 'San Francisco',
  lowestPrice: 80,
  slots: [
    {
      slotId: 'slot-1',
      startTime: '2025-11-28T10:00:00Z',
      endTime: '2025-11-28T11:00:00Z',
      basePrice: 100,
      maxDiscount: 20,
      maxDiscountedPrice: 80,
      serviceName: 'Swedish Massage',
      durationMin: 60,
    },
    {
      slotId: 'slot-2',
      startTime: '2025-11-28T14:00:00Z',
      endTime: '2025-11-28T15:00:00Z',
      basePrice: 120,
      maxDiscount: 25,
      maxDiscountedPrice: 90,
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
          userBid={80}
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
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
        />
      );

      expect(screen.getByText('From')).toBeInTheDocument();
      // Use getAllByText since $80 appears multiple times (provider price and slot prices)
      const priceElements = screen.getAllByText('$80');
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('should render all available slots', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
        />
      );

      expect(screen.getByText('Available Slots')).toBeInTheDocument();
      // Should render both slot times
      expect(screen.getByText(/Swedish Massage/)).toBeInTheDocument();
      expect(screen.getByText(/Deep Tissue Massage/)).toBeInTheDocument();
    });

    it('should render rating with star icon', () => {
      const provider = createProviderFixture({ rating: 4.75 });
      render(
        <ProviderCard
          provider={provider}
          userBid={80}
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
          userBid={80}
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
          userBid={80}
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
          userBid={80}
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
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
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
          userBid={100}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
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
          userBid={77} // 96% of lowest price (80)
          isBestOfferProvider={false}
          bestOfferSlotId={null}
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
          userBid={70} // 87.5% of lowest price (80)
          isBestOfferProvider={false}
          bestOfferSlotId={null}
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
          userBid={50} // 62.5% of lowest price (80)
          isBestOfferProvider={false}
          bestOfferSlotId={null}
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
            startTime: '2025-11-28T10:00:00Z',
            endTime: '2025-11-28T11:00:00Z',
            basePrice: 100,
            maxDiscount: 20,
            maxDiscountedPrice: 80,
            serviceName: 'Swedish Massage',
            durationMin: 60,
          },
          {
            slotId: 'slot-2',
            startTime: '2025-11-28T14:00:00Z',
            endTime: '2025-11-28T15:00:00Z',
            basePrice: 50,
            maxDiscount: 10,
            maxDiscountedPrice: 40,
            serviceName: 'Chair Massage',
            durationMin: 30,
          },
        ],
      });
      render(
        <ProviderCard
          provider={provider}
          userBid={42} // Very High for slot-2, Low for slot-1
          isBestOfferProvider={false}
          bestOfferSlotId={null}
        />
      );

      // Should show the best match (Very High) - appears multiple times
      const veryHighBadges = screen.getAllByText('Very High');
      expect(veryHighBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Bid Handling', () => {
    it('should call onBid when bid button is clicked on a slot', () => {
      const provider = createProviderFixture();
      const onBid = vi.fn();

      render(
        <ProviderCard
          provider={provider}
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          onBid={onBid}
        />
      );

      const bidButtons = screen.getAllByText('Bid');
      fireEvent.click(bidButtons[0]);

      expect(onBid).toHaveBeenCalledTimes(1);
      expect(onBid).toHaveBeenCalledWith('slot-1', 'provider-1');
    });

    it('should call onBid with correct parameters for second slot', () => {
      const provider = createProviderFixture();
      const onBid = vi.fn();

      render(
        <ProviderCard
          provider={provider}
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
          onBid={onBid}
        />
      );

      const bidButtons = screen.getAllByText('Bid');
      fireEvent.click(bidButtons[1]);

      expect(onBid).toHaveBeenCalledTimes(1);
      expect(onBid).toHaveBeenCalledWith('slot-2', 'provider-1');
    });

    it('should render bid buttons even when onBid is not provided (handler exists but does nothing)', () => {
      const provider = createProviderFixture();

      render(
        <ProviderCard
          provider={provider}
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
        />
      );

      // ProviderCard always passes handleBid to SlotItem, so buttons render
      // The handleBid just won't do anything if onBid prop is undefined
      const bidButtons = screen.getAllByText('Bid');
      expect(bidButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Best Offer Slot Highlighting', () => {
    it('should highlight the best offer slot when bestOfferSlotId is provided', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={80}
          isBestOfferProvider={true}
          bestOfferSlotId="slot-1"
        />
      );

      // The SlotItem component should receive isBestOffer=true for slot-1
      // We can verify this by checking for the "Best" badge
      expect(screen.getByText('Best')).toBeInTheDocument();
    });

    it('should not highlight slots when bestOfferSlotId is null', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
        />
      );

      expect(screen.queryByText('Best')).not.toBeInTheDocument();
    });

    it('should only highlight matching slot when bestOfferSlotId is provided', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={80}
          isBestOfferProvider={true}
          bestOfferSlotId="slot-2"
        />
      );

      // Should only have one "Best" badge
      const bestBadges = screen.getAllByText('Best');
      expect(bestBadges).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle provider with no slots', () => {
      const provider = createProviderFixture({ slots: [] });
      render(
        <ProviderCard
          provider={provider}
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
        />
      );

      expect(screen.getByText('Serenity Spa')).toBeInTheDocument();
      expect(screen.getByText('Available Slots')).toBeInTheDocument();
      // Should still show Very Low match for empty slots
      const veryLowBadges = screen.getAllByText('Very Low');
      expect(veryLowBadges.length).toBeGreaterThan(0);
    });

    it('should handle provider with single slot', () => {
      const provider = createProviderFixture({
        slots: [
          {
            slotId: 'slot-1',
            startTime: '2025-11-28T10:00:00Z',
            endTime: '2025-11-28T11:00:00Z',
            basePrice: 100,
            maxDiscount: 20,
            maxDiscountedPrice: 80,
            serviceName: 'Swedish Massage',
            durationMin: 60,
          },
        ],
      });
      render(
        <ProviderCard
          provider={provider}
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
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
          userBid={80}
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
          userBid={80}
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
          userBid={80}
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
          userBid={80}
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

      const veryLowBadges = screen.getAllByText('Very Low');
      expect(veryLowBadges.length).toBeGreaterThan(0);
    });

    it('should handle very high user bid', () => {
      const provider = createProviderFixture();
      render(
        <ProviderCard
          provider={provider}
          userBid={1000}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
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
          userBid={80}
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
          userBid={80}
          isBestOfferProvider={false}
          bestOfferSlotId={null}
        />
      );

      expect(screen.getByRole('heading', { level: 3, name: 'Serenity Spa' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: 'Available Slots' })).toBeInTheDocument();
    });
  });
});
