export async function generateCodenamesWordsHe(): Promise<string[]> {
  try {
    if (window.electronAPI?.generateWordsHe) {
      return await window.electronAPI.generateWordsHe();
    }
    throw new Error('Gemini word generation is only available in the Electron app.');
  } catch (error) {
    console.error("Error generating words:", error);
    const message =
      (error as any)?.message && typeof (error as any).message === 'string'
        ? (error as any).message
        : 'נכשלה יצירת מילים.';
    throw new Error(message);
  }
}

export async function generateMissionCode(): Promise<string> {
  try {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  } catch (error) {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}