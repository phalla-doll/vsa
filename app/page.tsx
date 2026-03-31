'use client';

import { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, Image as ImageIcon, Search, Copy, Check, Sparkles, ExternalLink, Settings, X, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

interface Segment {
  textSegment: string;
  mood: string;
  sceneIdea: string;
  keywords: string[];
}

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
    <main className="min-h-screen bg-[#f5f5f7] font-sans selection:bg-[#0071e3] selection:text-white pb-24 relative">
      {/* Top Bar Settings Button */}
      <div className="absolute top-6 right-6 z-10">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 bg-white rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.1)] transition-shadow text-[#1d1d1f]"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Alert Modal */}
      <AnimatePresence>
        {isAlertOpen && (
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
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden text-center p-6"
            >
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-[#1d1d1f] mb-2">API Key Required</h3>
              <p className="text-[15px] text-[#86868b] mb-6">
                Please configure either a Gemini or OpenRouter API key in Settings to generate visuals.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAlertOpen(false)}
                  className="flex-1 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-[15px] font-medium hover:bg-[#e8e8ed] transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsAlertOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="flex-1 py-2.5 bg-[#1d1d1f] text-white rounded-full text-[15px] font-medium hover:bg-[#000000] transition-colors"
                >
                  Open Settings
                </motion.button>
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
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[#f5f5f7] flex justify-between items-center">
                <h2 className="text-lg font-medium text-[#1d1d1f]">Settings</h2>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSettingsOpen(false)} 
                  className="p-1.5 rounded-full hover:bg-[#f5f5f7] transition-colors"
                >
                  <X className="w-5 h-5 text-[#86868b]" />
                </motion.button>
              </div>
              <div className="p-6">
                {/* Tabs (Segmented Control) */}
                <div className="flex p-1 bg-[#f5f5f7] rounded-xl mb-6 relative">
                  {['gemini', 'openrouter'].map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setActiveProvider(provider as 'gemini' | 'openrouter')}
                      className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                        activeProvider === provider ? 'text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'
                      }`}
                    >
                      {activeProvider === provider && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
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
                          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Gemini API Key</label>
                          <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full bg-[#f5f5f7] rounded-xl p-3 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all"
                          />
                          <p className="mt-2 text-xs text-[#86868b]">Leave blank to use the default system key.</p>
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
                          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">OpenRouter API Key</label>
                          <input
                            type="password"
                            value={openRouterKey}
                            onChange={(e) => setOpenRouterKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="w-full bg-[#f5f5f7] rounded-xl p-3 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Model</label>
                          <input
                            type="text"
                            value={openRouterModel}
                            onChange={(e) => setOpenRouterModel(e.target.value)}
                            placeholder="openai/gpt-4o-mini"
                            className="w-full bg-[#f5f5f7] rounded-xl p-3 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#f5f5f7]/50 border-t border-[#f5f5f7] flex justify-end">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2.5 bg-[#1d1d1f] text-white rounded-full text-[15px] font-medium hover:bg-[#000000] transition-colors"
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
        <h1 className="text-4xl md:text-5xl font-normal tracking-tight text-[#1d1d1f] mb-4">
          Visual Storytelling. <br className="hidden md:block" />
          <span className="text-[#86868b]">Reimagined.</span>
        </h1>
        <p className="text-lg text-[#86868b] font-normal max-w-2xl mx-auto tracking-tight">
          Paste your transcript and let AI craft the perfect visual direction, scene by scene.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Col: Input */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-8 space-y-6">
              <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h2 className="text-xl font-medium tracking-tight mb-3 text-[#1d1d1f]">Transcript</h2>
                <textarea
                  className="w-full h-[300px] bg-[#f5f5f7] rounded-2xl p-4 text-[15px] leading-relaxed text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 resize-none transition-all"
                  placeholder="Paste your script, narration, or spoken content here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                {error && <p className="mt-2 text-sm text-red-500 font-normal px-2">{error}</p>}
                <motion.button
                  layout
                  transition={springTransition}
                  whileTap={!isGenerating && transcript.trim() ? { scale: 0.95 } : {}}
                  onClick={handleGenerate}
                  disabled={isGenerating || !transcript.trim()}
                  className="mt-3 w-full h-[48px] bg-[#1d1d1f] text-white rounded-full text-[15px] font-normal hover:bg-[#000000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative flex items-center justify-center"
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
                    <div key={i} className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse">
                      <div className="h-3 bg-[#f5f5f7] rounded w-20 mb-5"></div>
                      <div className="h-6 bg-[#f5f5f7] rounded w-3/4 mb-6"></div>
                      <div className="h-20 bg-[#f5f5f7] rounded-xl w-full mb-5"></div>
                      <div className="flex gap-2">
                        <div className="h-7 bg-[#f5f5f7] rounded-full w-16"></div>
                        <div className="h-7 bg-[#f5f5f7] rounded-full w-20"></div>
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
                      className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-xs font-medium tracking-widest text-[#86868b] uppercase">Scene {index + 1}</span>
                        <span className="px-2.5 py-0.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-xs font-normal">{segment.mood}</span>
                      </div>
                      
                      <p className="text-lg font-normal leading-snug tracking-tight mb-6 text-[#1d1d1f]">
                        &quot;{segment.textSegment}&quot;
                      </p>

                      <div className="mb-6">
                        <h3 className="text-xs font-medium tracking-widest text-[#86868b] uppercase mb-2 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5" /> Visual Direction
                        </h3>
                        <p className="text-[15px] leading-relaxed text-[#1d1d1f] bg-[#f5f5f7] p-4 rounded-xl">
                          {segment.sceneIdea}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xs font-medium tracking-widest text-[#86868b] uppercase mb-2 flex items-center gap-1.5">
                          <Search className="h-3.5 w-3.5" /> Keywords & Assets
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {segment.keywords.map((kw, kidx) => (
                            <motion.button 
                              whileTap={{ scale: 0.95 }}
                              key={kidx}
                              onClick={() => copyToClipboard(kw)} 
                              className="flex items-center px-3 py-1.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors rounded-full text-[14px] font-normal text-[#1d1d1f] group"
                            >
                              {kw}
                              {copiedKeyword === kw ? (
                                <Check className="ml-1.5 h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="ml-1.5 h-3 w-3 text-[#86868b] group-hover:text-[#1d1d1f]" />
                              )}
                            </motion.button>
                          ))}
                        </div>

                        {/* Asset Previews - Clean Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {segment.keywords.slice(0, 2).map((keyword, kidx) => (
                            <div key={kidx} className="relative aspect-video rounded-xl overflow-hidden bg-[#f5f5f7] group">
                              <Image
                                src={`https://picsum.photos/seed/${encodeURIComponent(keyword)}/400/225`}
                                alt={keyword}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
                                <p className="text-xs text-white font-normal truncate">{keyword}</p>
                              </div>
                              <a 
                                href={`https://www.pexels.com/search/${encodeURIComponent(keyword)}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                title="Search on Pexels"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
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
