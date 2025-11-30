import { Controller, Get, Post, Body } from "@nestjs/common";

type SearchRequest = {
  location: string;
  date: string;
  timeWindow: string;
  budget: number;
};

type Offer = {
  id: string;
  providerName: string;
  time: string;
  price: number;
  matchScore: "low" | "medium" | "high";
};

@Controller()
export class AppController {
  @Get("health")
  getHealth() {
    return { status: "ok" };
  }

  @Post("search")
  search(@Body() body: SearchRequest): { offers: Offer[] } {
    const { location, date, timeWindow, budget } = body;

    const offers: Offer[] = [
      {
        id: "1",
        providerName: "Zen Flow Massage",
        time: `${date} 17:00`,
        price: Math.min(budget, 70),
        matchScore: "high",
      },
      {
        id: "2",
        providerName: "Deep Relief Studio",
        time: `${date} 18:30`,
        price: Math.min(budget + 10, 80),
        matchScore: "medium",
      },
      {
        id: "3",
        providerName: "City Relax Spa",
        time: `${date} 20:00`,
        price: Math.max(budget - 15, 45),
        matchScore: "low",
      },
    ];

    console.log("Search request:", {
      location,
      date,
      timeWindow,
      budget,
    });

    return { offers };
  }
}
