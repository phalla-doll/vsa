'use client';

import { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, Image as ImageIcon, Search, Copy, Check, Sparkles, ExternalLink, Settings, X, AlertCircle, Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';

interface Segment {
  textSegment: string;
  mood: string;
  sceneIdea: string;
  keywords: string[];
}

const ImagePreview = ({ keyword, index }: { keyword: string; index: number }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(`https://loremflickr.com/400/225/${encodeURIComponent(keyword.replace(/\s+/g, ','))}?lock=${index + 1}`);

  return (
    <div className="relative aspect-video w-[260px] shrink-0 snap-center rounded-xl overflow-hidden bg-[#f5f5f7] dark:bg-zinc-800/50 group">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#e8e8ed] dark:bg-zinc-800 animate-pulse z-10">
          <ImageIcon className="h-8 w-8 text-[#d2d2d7] dark:text-zinc-600" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={keyword}
        className={`object-cover w-full h-full transition-transform duration-500 group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          if (imgSrc.includes('loremflickr')) {
            setImgSrc(`https://picsum.photos/seed/${encodeURIComponent(keyword)}/400/225`);
          } else {
            setIsLoading(false);
          }
        }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5 z-20">
        <p className="text-xs text-white font-normal truncate">{keyword}</p>
      </div>
      <a 
        href={`https://www.pexels.com/search/${encodeURIComponent(keyword)}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-20"
        title="Search on Pexels"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
};

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [error, setError] = useState('');
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('openai/gpt-4o-mini');
  const [isMounted, setIsMounted] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Derived metrics
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;
  const readingTime = Math.ceil(wordCount / 200);
  const sizeKb = typeof window !== 'undefined' ? (new Blob([transcript]).size / 1024).toFixed(1) : '0.0';

  useEffect(() => {
    setIsMounted(true);
    const savedProvider = localStorage.getItem('activeProvider') as 'gemini' | 'openrouter';
    if (savedProvider) setActiveProvider(savedProvider);

    const savedGemini = localStorage.getItem('geminiKey');
    if (savedGemini) setGeminiKey(savedGemini);

    const savedOpenRouter = localStorage.getItem('openRouterKey');
    if (savedOpenRouter) setOpenRouterKey(savedOpenRouter);

    const savedModel = localStorage.getItem('openRouterModel');
    if (savedModel) setOpenRouterModel(savedModel);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('activeProvider', activeProvider);
    localStorage.setItem('geminiKey', geminiKey);
    localStorage.setItem('openRouterKey', openRouterKey);
    localStorage.setItem('openRouterModel', openRouterModel);
  }, [activeProvider, geminiKey, openRouterKey, openRouterModel, isMounted]);

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError('Please enter a transcript first.');
      return;
    }

    const hasGemini = !!(geminiKey.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    const hasOpenRouter = !!openRouterKey.trim();

    if (!hasGemini && !hasOpenRouter) {
      setIsAlertOpen(true);
      return;
    }

    let providerToUse = activeProvider;
    if (providerToUse === 'gemini' && !hasGemini && hasOpenRouter) {
      providerToUse = 'openrouter';
      setActiveProvider('openrouter');
    } else if (providerToUse === 'openrouter' && !hasOpenRouter && hasGemini) {
      providerToUse = 'gemini';
      setActiveProvider('gemini');
    }

    setIsGenerating(true);
    setError('');
    setSegments([]);

    try {
      let parsedSegments: Segment[] = [];

      if (providerToUse === 'gemini') {
        const apiKey = geminiKey.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) throw new Error("Gemini API key is missing.");

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze the following transcript and break it down into meaningful segments for a video editor or creator. For each segment, provide:
1. The original text segment.
2. The mood or style (e.g., cinematic, energetic, calm).
3. A specific scene idea (what visuals should appear on screen).
4. 3-5 highly relevant keywords for searching stock footage or images.

Transcript:
${transcript}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  textSegment: {
                    type: Type.STRING,
                    description: 'A meaningful chunk of the original transcript.',
                  },
                  mood: {
                    type: Type.STRING,
                    description: 'The emotional tone or visual style for this segment.',
                  },
                  sceneIdea: {
                    type: Type.STRING,
                    description: 'A clear, actionable description of what should be shown on screen.',
                  },
                  keywords: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                    description: '3-5 specific keywords for searching stock footage or images.',
                  },
                },
                required: ['textSegment', 'mood', 'sceneIdea', 'keywords'],
              },
            },
          },
        });

        if (response.text) {
          parsedSegments = JSON.parse(response.text) as Segment[];
        } else {
          throw new Error('Failed to generate visual ideas. Please try again.');
        }
      } else {
        // OpenRouter
        if (!openRouterKey.trim()) throw new Error("OpenRouter API key is required. Please configure it in Settings.");
        const modelToUse = openRouterModel.trim() || "openai/gpt-4o-mini";

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey.trim()}`,
            "Content-Type": "application/json",
            "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "https://aistudio.google.com",
            "X-Title": "Visual Storytelling Assistant"
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              {
                role: "user",
                content: `Analyze the following transcript and break it down into meaningful segments for a video editor or creator. For each segment, provide:
1. The original text segment.
2. The mood or style (e.g., cinematic, energetic, calm).
3. A specific scene idea (what visuals should appear on screen).
4. 3-5 highly relevant keywords for searching stock footage or images.

You MUST return ONLY a valid JSON array of objects. Each object must have these exact keys: "textSegment", "mood", "sceneIdea", "keywords" (array of strings). Do not include markdown formatting like \`\`\`json.

Transcript:
${transcript}`
              }
            ]
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          let errorMessage = errData.error?.message || "OpenRouter API error";
          
          // OpenRouter sometimes hides the real error in metadata
          if (errData.error?.metadata?.raw) {
            try {
              const rawError = JSON.parse(errData.error.metadata.raw);
              if (rawError?.error?.message) {
                errorMessage += ` - ${rawError.error.message}`;
              } else {
                errorMessage += ` - ${errData.error.metadata.raw}`;
              }
            } catch (e) {
              errorMessage += ` - ${errData.error.metadata.raw}`;
            }
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedSegments = JSON.parse(cleanedText) as Segment[];
        } else {
          throw new Error("Empty response from OpenRouter.");
        }
      }

      setSegments(parsedSegments);
    } catch (err: any) {
      console.error('Error generating content:', err);
      setError(err.message || 'An error occurred while analyzing the transcript.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyword(text);
    setTimeout(() => setCopiedKeyword(null), 2000);
  };

  // Apple-like spring transition config
  const springTransition = { type: "spring" as const, bounce: 0.25, duration: 0.5 };

  return (
    <main className="min-h-screen bg-[#f5f5f7] dark:bg-zinc-950 font-sans selection:bg-[#0071e3] dark:selection:bg-blue-500 selection:text-white pb-24 relative transition-colors duration-300">
      {/* Top Bar Settings Button */}
      <div className="absolute top-6 right-6 z-10">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 bg-white dark:bg-zinc-900 rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.06)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.3)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.1)] dark:hover:shadow-[0_4px_15px_rgb(0,0,0,0.4)] transition-shadow text-[#1d1d1f] dark:text-zinc-100 border border-transparent dark:border-zinc-800"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Alert Modal */}
      <AnimatePresence>
        {(isAlertOpen || error) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={springTransition}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden text-center p-6 border border-transparent dark:border-zinc-800"
            >
              <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-zinc-100 mb-2">
                {error ? "Error" : "API Key Required"}
              </h3>
              <p className="text-[15px] text-[#86868b] dark:text-zinc-400 mb-6">
                {error ? error : "Please configure either a Gemini or OpenRouter API key in Settings to generate visuals."}
              </p>
              <div className="flex gap-3">
                {error ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setError('')}
                    className="flex-1 py-2.5 bg-[#1d1d1f] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[15px] font-medium hover:bg-[#000000] dark:hover:bg-white transition-colors"
                  >
                    Dismiss
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsAlertOpen(false)}
                      className="flex-1 py-2.5 bg-[#f5f5f7] dark:bg-zinc-800 text-[#1d1d1f] dark:text-zinc-100 rounded-full text-[15px] font-medium hover:bg-[#e8e8ed] dark:hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setIsAlertOpen(false);
                        setIsSettingsOpen(true);
                      }}
                      className="flex-1 py-2.5 bg-[#1d1d1f] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[15px] font-medium hover:bg-[#000000] dark:hover:bg-white transition-colors"
                    >
                      Open Settings
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={springTransition}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-transparent dark:border-zinc-800"
            >
              <div className="px-6 py-4 border-b border-[#f5f5f7] dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-medium text-[#1d1d1f] dark:text-zinc-100">Settings</h2>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSettingsOpen(false)} 
                  className="p-1.5 rounded-full hover:bg-[#f5f5f7] dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5 text-[#86868b] dark:text-zinc-400" />
                </motion.button>
              </div>
              <div className="p-6">
                {/* Tabs (Segmented Control) */}
                <div className="flex p-1 bg-[#f5f5f7] dark:bg-zinc-800/50 rounded-xl mb-6 relative">
                  {['gemini', 'openrouter'].map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setActiveProvider(provider as 'gemini' | 'openrouter')}
                      className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                        activeProvider === provider ? 'text-[#1d1d1f] dark:text-zinc-100' : 'text-[#86868b] dark:text-zinc-500 hover:text-[#1d1d1f] dark:hover:text-zinc-300'
                      }`}
                    >
                      {activeProvider === provider && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-lg shadow-sm -z-10"
                          transition={springTransition}
                        />
                      )}
                      {provider === 'gemini' ? 'Gemini' : 'OpenRouter'}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="relative overflow-hidden min-h-[160px] p-1">
                  <AnimatePresence mode="popLayout">
                    {activeProvider === 'gemini' ? (
                      <motion.div 
                        key="gemini"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={springTransition}
                        className="space-y-4 w-full"
                      >
                        <div>
                          <label className="block text-sm font-medium text-[#1d1d1f] dark:text-zinc-200 mb-2">Gemini API Key</label>
                          <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full bg-[#f5f5f7] dark:bg-zinc-800/50 rounded-xl p-3 text-[15px] text-[#1d1d1f] dark:text-zinc-100 placeholder:text-[#86868b] dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 dark:focus:ring-blue-500/30 transition-all border border-transparent dark:border-zinc-700/50"
                          />
                          <p className="mt-2 text-xs text-[#86868b] dark:text-zinc-500">Leave blank to use the default system key.</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="openrouter"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={springTransition}
                        className="space-y-4 w-full"
                      >
                        <div>
                          <label className="block text-sm font-medium text-[#1d1d1f] dark:text-zinc-200 mb-2">OpenRouter API Key</label>
                          <input
                            type="password"
                            value={openRouterKey}
                            onChange={(e) => setOpenRouterKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="w-full bg-[#f5f5f7] dark:bg-zinc-800/50 rounded-xl p-3 text-[15px] text-[#1d1d1f] dark:text-zinc-100 placeholder:text-[#86868b] dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 dark:focus:ring-blue-500/30 transition-all border border-transparent dark:border-zinc-700/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#1d1d1f] dark:text-zinc-200 mb-2">Model</label>
                          <input
                            type="text"
                            value={openRouterModel}
                            onChange={(e) => setOpenRouterModel(e.target.value)}
                            placeholder="openai/gpt-4o-mini"
                            className="w-full bg-[#f5f5f7] dark:bg-zinc-800/50 rounded-xl p-3 text-[15px] text-[#1d1d1f] dark:text-zinc-100 placeholder:text-[#86868b] dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 dark:focus:ring-blue-500/30 transition-all border border-transparent dark:border-zinc-700/50"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Theme Toggle */}
                <div className="mt-6 pt-6 border-t border-[#f5f5f7] dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#f5f5f7] dark:bg-zinc-800 rounded-lg">
                      {theme === 'dark' ? <Moon className="w-4 h-4 text-zinc-100" /> : <Sun className="w-4 h-4 text-[#1d1d1f]" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-zinc-100">Appearance</h3>
                      <p className="text-xs text-[#86868b] dark:text-zinc-500">Toggle dark mode</p>
                    </div>
                  </div>
                  <div className="flex bg-[#f5f5f7] dark:bg-zinc-800/50 p-1 rounded-lg">
                    <button
                      onClick={() => setTheme('light')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${theme === 'light' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${theme === 'dark' ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Dark
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#f5f5f7]/50 dark:bg-zinc-900/50 border-t border-[#f5f5f7] dark:border-zinc-800 flex justify-end">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2.5 bg-[#1d1d1f] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[15px] font-medium hover:bg-[#000000] dark:hover:bg-white transition-colors"
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="pt-16 pb-10 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-normal tracking-tight text-[#1d1d1f] dark:text-zinc-100 mb-4">
          Visual Storytelling. <br className="hidden md:block" />
          <span className="text-[#86868b] dark:text-zinc-500">Reimagined.</span>
        </h1>
        <p className="text-lg text-[#86868b] dark:text-zinc-400 font-normal max-w-2xl mx-auto tracking-tight">
          Paste your transcript and let AI craft the perfect visual direction, scene by scene.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Col: Input */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-8 space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-zinc-800">
                <h2 className="text-xl font-medium tracking-tight mb-3 text-[#1d1d1f] dark:text-zinc-100">Transcript</h2>
                <textarea
                  className="w-full h-[300px] bg-[#f5f5f7] dark:bg-zinc-800/50 rounded-2xl p-4 text-[15px] leading-relaxed text-[#1d1d1f] dark:text-zinc-100 placeholder:text-[#86868b] dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 dark:focus:ring-blue-500/30 resize-none transition-all border border-transparent dark:border-zinc-700/50"
                  placeholder="Paste your script, narration, or spoken content here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                
                <div className="flex items-center justify-between mt-3 mb-1 px-2 text-xs text-[#86868b] dark:text-zinc-500 font-medium tracking-wide">
                  <div className="flex gap-4">
                    <span>{wordCount} words</span>
                    <span>{charCount} chars</span>
                  </div>
                  <div className="flex gap-4">
                    <span>~{readingTime} min read</span>
                    <span>{sizeKb} KB</span>
                  </div>
                </div>

                <motion.button
                  layout
                  transition={springTransition}
                  whileTap={!isGenerating && transcript.trim() ? { scale: 0.95 } : {}}
                  onClick={handleGenerate}
                  disabled={isGenerating || !transcript.trim()}
                  className="mt-3 w-full h-[48px] bg-[#1d1d1f] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[15px] font-medium hover:bg-[#000000] dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative flex items-center justify-center"
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {isGenerating ? (
                      <motion.div
                        key="generating"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={springTransition}
                        className="flex items-center justify-center w-full"
                      >
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Analyzing...
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={springTransition}
                        className="flex items-center justify-center w-full"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Visuals
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Right Col: Output */}
          <motion.div layout transition={springTransition} className="lg:col-span-7">
            <AnimatePresence mode="popLayout">
              {isGenerating ? (
                <motion.div
                  layout
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  transition={springTransition}
                  className="space-y-5 w-full"
                >
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-zinc-800 animate-pulse">
                      <div className="h-3 bg-[#f5f5f7] dark:bg-zinc-800 rounded w-20 mb-5"></div>
                      <div className="h-6 bg-[#f5f5f7] dark:bg-zinc-800 rounded w-3/4 mb-6"></div>
                      <div className="h-20 bg-[#f5f5f7] dark:bg-zinc-800 rounded-xl w-full mb-5"></div>
                      <div className="flex gap-2">
                        <div className="h-7 bg-[#f5f5f7] dark:bg-zinc-800 rounded-full w-16"></div>
                        <div className="h-7 bg-[#f5f5f7] dark:bg-zinc-800 rounded-full w-20"></div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : segments.length > 0 ? (
                <motion.div
                  layout
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={springTransition}
                  className="space-y-5 w-full"
                >
                  {segments.map((segment, index) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...springTransition, delay: index * 0.05 }}
                      key={index} 
                      className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-zinc-800 transition-shadow hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_40px_rgb(0,0,0,0.3)]"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-xs font-medium tracking-widest text-[#86868b] dark:text-zinc-500 uppercase">Scene {index + 1}</span>
                        <span className="px-2.5 py-0.5 bg-[#f5f5f7] dark:bg-zinc-800 text-[#1d1d1f] dark:text-zinc-300 rounded-full text-xs font-medium">{segment.mood}</span>
                      </div>
                      
                      <p className="text-lg font-normal leading-snug tracking-tight mb-6 text-[#1d1d1f] dark:text-zinc-100">
                        &quot;{segment.textSegment}&quot;
                      </p>

                      <div className="mb-6">
                        <h3 className="text-xs font-medium tracking-widest text-[#86868b] dark:text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5" /> Visual Direction
                        </h3>
                        <p className="text-[15px] leading-relaxed text-[#1d1d1f] dark:text-zinc-300 bg-[#f5f5f7] dark:bg-zinc-800/50 p-4 rounded-xl border border-transparent dark:border-zinc-700/50">
                          {segment.sceneIdea}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xs font-medium tracking-widest text-[#86868b] dark:text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                          <Search className="h-3.5 w-3.5" /> Keywords & Assets
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {segment.keywords.map((kw, kidx) => (
                            <motion.button 
                              whileTap={{ scale: 0.95 }}
                              key={kidx}
                              onClick={() => copyToClipboard(kw)} 
                              className="flex items-center px-3 py-1.5 bg-[#f5f5f7] dark:bg-zinc-800 hover:bg-[#e8e8ed] dark:hover:bg-zinc-700 transition-colors rounded-full text-[14px] font-medium text-[#1d1d1f] dark:text-zinc-200 group border border-transparent dark:border-zinc-700/50"
                            >
                              {kw}
                              {copiedKeyword === kw ? (
                                <Check className="ml-1.5 h-3 w-3 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="ml-1.5 h-3 w-3 text-[#86868b] dark:text-zinc-500 group-hover:text-[#1d1d1f] dark:group-hover:text-zinc-300" />
                              )}
                            </motion.button>
                          ))}
                        </div>

                        {/* Asset Previews - Scrollable Row */}
                        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-2 px-2 hide-scrollbar">
                          {segment.keywords.map((keyword, kidx) => (
                            <ImagePreview key={kidx} keyword={keyword} index={kidx} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  layout
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  transition={springTransition}
                  className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full"
                >
                  <div className="w-16 h-16 bg-[#f5f5f7] rounded-full flex items-center justify-center mb-4">
                    <ImageIcon className="h-6 w-6 text-[#86868b]" />
                  </div>
                  <h3 className="text-xl font-medium tracking-tight text-[#1d1d1f] mb-2">No visuals yet</h3>
                  <p className="text-[15px] text-[#86868b] max-w-sm font-normal">
                    Paste your transcript and generate to see AI-crafted scenes and asset suggestions appear here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
