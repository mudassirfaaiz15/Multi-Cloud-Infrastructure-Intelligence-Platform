import { useQuery, useMutation } from '@tanstack/react-query';
import { queryAIChat, getAIUsageStats, type AIResponse, type AIUsageStats } from '@/lib/api/ai';
import { logger } from '@/lib/utils/logger';

/**
 * Hook to query the AI chat endpoint
 */
export function useAIChat() {
  return useMutation({
    mutationFn: async (params: { question: string; context?: Record<string, unknown> }) => {
      const response = await queryAIChat(params.question, params.context);
      return response;
    },
    onError: (error) => {
      logger.error(`AI chat error: ${error}`);
    },
  });
}

/**
 * Hook to fetch AI usage statistics
 */
export function useAIUsageStats(days: number = 30, enabled: boolean = true) {
  return useQuery({
    queryKey: ['ai', 'usage', days],
    queryFn: () => getAIUsageStats(days),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  });
}
