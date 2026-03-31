'use client';

import { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, Image as ImageIcon, Search, Copy, Check, Sparkles, ExternalLink } from 'lucide-react';
import Image from 'next/image';

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

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError('Please enter a transcript first.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSegments([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
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
        const parsedSegments = JSON.parse(response.text) as Segment[];
        setSegments(parsedSegments);
      } else {
        setError('Failed to generate visual ideas. Please try again.');
      }
    } catch (err) {
      console.error('Error generating content:', err);
      setError('An error occurred while analyzing the transcript.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyword(text);
    setTimeout(() => setCopiedKeyword(null), 2000);
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] font-sans selection:bg-[#0071e3] selection:text-white pb-24">
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
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !transcript.trim()}
                  className="mt-3 w-full bg-[#1d1d1f] text-white rounded-full py-3 text-[15px] font-normal hover:bg-[#000000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Visuals
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Output */}
          <div className="lg:col-span-7 space-y-6">
            {isGenerating ? (
              <div className="space-y-5">
                {[1, 2, 3].map((i) => (
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
              </div>
            ) : segments.length > 0 ? (
              <div className="space-y-5">
                {segments.map((segment, index) => (
                  <div key={index} className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
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
                          <button 
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
                          </button>
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="w-16 h-16 bg-[#f5f5f7] rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="h-6 w-6 text-[#86868b]" />
                </div>
                <h3 className="text-xl font-medium tracking-tight text-[#1d1d1f] mb-2">No visuals yet</h3>
                <p className="text-[15px] text-[#86868b] max-w-sm font-normal">
                  Paste your transcript and generate to see AI-crafted scenes and asset suggestions appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
