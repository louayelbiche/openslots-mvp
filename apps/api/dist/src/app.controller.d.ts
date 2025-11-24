import { AppService } from "./app.service";
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
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getHealth(): {
        status: string;
    };
    search(body: SearchRequest): {
        offers: Offer[];
    };
}
export {};
