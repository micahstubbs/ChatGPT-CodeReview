export declare class Chat {
    private openai;
    private isAzure;
    private isGithubModels;
    constructor(apikey: string);
    private isReasoningModel;
    private getValidVerbosity;
    private generatePrompt;
    private codeReviewWithResponsesAPI;
    private codeReviewWithChatAPI;
    codeReview: (patch: string) => Promise<{
        lgtm: boolean;
        review_comment: string;
        issues: any[];
        details: string;
    }>;
}
