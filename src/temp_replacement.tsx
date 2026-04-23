  // AI-driven visual analysis - sends canvas image to server for holistic interpretation
  const analyzeDrawingWithAI = async (imageDataUrl: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a794bded/analyze-visual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ imageDataUrl })
      });

      if (!response.ok) {
        throw new Error(`Visual analysis failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('🤖 AI Visual Analysis:', data);
      
      return {
        asciiArt: data.asciiArt || '○ · ○\n·   ·\n○ · ○',
        echoKeywords: data.echoKeywords || ['trace', 'silence'],
        visualDescription: data.visualDescription || ''
      };
    } catch (error) {
      console.error('Error in AI visual analysis:', error);
      // Fallback to default
      return {
        asciiArt: '○ · ○\n·   ·\n○ · ○',
        echoKeywords: ['trace', 'silence'],
        visualDescription: 'Analysis unavailable'
      };
    }
  };
