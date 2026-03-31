# Visual Idea Generator

A modern, AI-powered web application that transforms text transcripts into structured visual scene ideas. Built with Next.js, Tailwind CSS, and Framer Motion, it provides a premium, Apple-like user experience with smooth spring animations and layout transitions.

## Features

- **AI Scene Generation**: Analyzes text transcripts to break them down into distinct scenes, complete with moods, visual directions, and keywords.
- **Multi-Provider Support**: Choose between Google's Gemini API and OpenRouter (e.g., GPT-4o-mini). Includes smart fallback if one key is missing.
- **Asset Previews**: Automatically fetches placeholder images based on generated keywords and provides quick links to high-quality stock photos on Pexels.
- **Premium UI/UX**: Features smooth layout animations, staggered reveals, and satisfying button interactions using Framer Motion.
- **Local Storage**: Securely saves your API keys and provider preferences locally in your browser.

## Component Structure

The application is built as a responsive, single-page interface (`app/page.tsx`) divided into several key logical sections:

- **Header**: Contains the application title and the settings toggle.
- **Settings Modal**: A sliding, animated modal for configuring API keys (Gemini & OpenRouter) and selecting the active AI provider.
- **Alert Modal**: A smart prompt that appears if the user attempts to generate visuals without configuring an API key, offering a quick shortcut to the settings.
- **Main Workspace (Two-Column Layout)**:
  - **Left Column (Input)**: A clean textarea for pasting transcripts and the animated "Generate Visuals" action button.
  - **Right Column (Output)**: 
    - *Empty State*: A placeholder prompting the user to begin.
    - *Loading State*: Animated skeleton loaders that smoothly expand into place while the AI processes the request.
    - *Results*: Staggered, animated cards displaying the generated scenes, keywords (with click-to-copy functionality), and image previews.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (`motion/react`)
- **Icons**: Lucide React
- **AI Integration**: `@google/genai` SDK and OpenRouter REST API
