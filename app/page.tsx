'use client';

import { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Image as ImageIcon, Search, Copy, Check } from 'lucide-react';
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
    <main className="min-h-screen bg-neutral-50/50 pb-12">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
            Visual Storytelling Assistant
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-neutral-500">
            Paste a transcript, and instantly get AI-powered visual ideas, keywords, and scene direction for your content.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>1. Paste Transcript</CardTitle>
              <CardDescription>Enter your script, narration, or spoken content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., 'Have you ever wondered why the sky is blue? It all comes down to a phenomenon called Rayleigh scattering...'"
                className="min-h-[300px] resize-y"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleGenerate} 
                disabled={isGenerating || !transcript.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Transcript...
                  </>
                ) : (
                  'Generate Visual Ideas'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-7">
          <Card className="h-full min-h-[500px] flex flex-col">
            <CardHeader>
              <CardTitle>2. Visual Direction</CardTitle>
              <CardDescription>AI-generated scene ideas and asset keywords.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {isGenerating ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-20 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : segments.length > 0 ? (
                <ScrollArea className="h-[600px] pr-4">
                  <Accordion className="w-full" defaultValue={['item-0']}>
                    {segments.map((segment, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-neutral-500">Segment {index + 1}</span>
                            <span className="text-base font-semibold line-clamp-2 pr-4">&quot;{segment.textSegment}&quot;</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-6 pt-2">
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                              Mood: {segment.mood}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Scene Idea
                            </h4>
                            <p className="text-neutral-700 bg-neutral-50 p-3 rounded-md border text-sm">
                              {segment.sceneIdea}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                              <Search className="h-4 w-4" />
                              Search Keywords
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {segment.keywords.map((keyword, kidx) => (
                                <div key={kidx} className="flex items-center bg-white border rounded-full pl-3 pr-1 py-1 shadow-sm">
                                  <span className="text-sm text-neutral-700 mr-2">{keyword}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full hover:bg-neutral-100"
                                    onClick={() => copyToClipboard(keyword)}
                                    title="Copy keyword"
                                  >
                                    {copiedKeyword === keyword ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-neutral-500" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Tabs defaultValue="preview" className="w-full mt-4">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="preview">Asset Previews</TabsTrigger>
                              <TabsTrigger value="search">External Search</TabsTrigger>
                            </TabsList>
                            <TabsContent value="preview" className="mt-4">
                              <div className="grid grid-cols-2 gap-2">
                                {segment.keywords.slice(0, 2).map((keyword, kidx) => (
                                  <div key={kidx} className="relative aspect-video rounded-md overflow-hidden bg-neutral-100 border group">
                                    <Image
                                      src={`https://picsum.photos/seed/${encodeURIComponent(keyword)}/400/225`}
                                      alt={keyword}
                                      fill
                                      className="object-cover transition-transform group-hover:scale-105"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                      <p className="text-xs text-white font-medium truncate">{keyword}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                            <TabsContent value="search" className="mt-4">
                              <div className="flex flex-col gap-2">
                                {segment.keywords.slice(0, 3).map((keyword, kidx) => (
                                  <div key={kidx} className="flex items-center justify-between p-2 border rounded-md bg-neutral-50">
                                    <span className="text-sm font-medium truncate w-1/2">{keyword}</span>
                                    <div className="flex gap-2">
                                      <a 
                                        href={`https://www.pexels.com/search/${encodeURIComponent(keyword)}/`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs bg-white border px-2 py-1 rounded hover:bg-neutral-100 transition-colors"
                                      >
                                        Pexels
                                      </a>
                                      <a 
                                        href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs bg-white border px-2 py-1 rounded hover:bg-neutral-100 transition-colors"
                                      >
                                        Pinterest
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                          </Tabs>

                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                  <ImageIcon className="h-12 w-12 mb-4 text-neutral-300" />
                  <p className="text-lg font-medium text-neutral-900">No visuals yet</p>
                  <p className="max-w-sm mt-1">Paste your transcript and click generate to see visual ideas and asset suggestions here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
