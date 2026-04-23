// Creative Transformation API - connects to Replicate for AI image generation
// Modes: opposite, whatif, expand, challenge

export type CreativeMode = 'opposite' | 'whatif' | 'expand' | 'challenge';

export interface CreativeTransformResponse {
  imageUrl: string;
  mode: string;
  prompt: string;
  error?: string;
}

// Mode descriptions for UI
export const CREATIVE_MODES: Record<CreativeMode, {
  name: string;
  nameEn: string;
  description: string;
  icon: string;
}> = {
  opposite: {
    name: '반전',
    nameEn: 'Opposite',
    description: '개념적으로 반대되는 이미지',
    icon: '🔄',
  },
  whatif: {
    name: '만약에',
    nameEn: 'What If',
    description: '예상치 못한 조합',
    icon: '✨',
  },
  expand: {
    name: '확장',
    nameEn: 'Expand',
    description: '한 요소를 다양하게 변주',
    icon: '🌱',
  },
  challenge: {
    name: '도전',
    nameEn: 'Challenge',
    description: '예상을 깨는 놀라운 결과',
    icon: '🎲',
  },
};

// API base URL - uses your Supabase function URL
const getApiUrl = (): string => {
  // Try environment variable first, fallback to empty string
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback - update this with your actual Supabase URL
  return '';
};

/**
 * Call the creative transformation API
 */
export async function creativeTransform(
  imageDataUrl: string,
  mode: CreativeMode,
  userKeywords?: string[]
): Promise<CreativeTransformResponse> {
  const apiUrl = getApiUrl();
  
  if (!apiUrl) {
    return {
      imageUrl: '',
      mode,
      prompt: '',
      error: 'API URL이 설정되지 않았습니다. VITE_API_URL 환경변수를 확인하세요.',
    };
  }

  try {
    const response = await fetch(`${apiUrl}/make-server-a794bded/creative-transform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageDataUrl,
        mode,
        userKeywords,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API 요청 실패: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Creative transform error:', error);
    return {
      imageUrl: '',
      mode,
      prompt: '',
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}