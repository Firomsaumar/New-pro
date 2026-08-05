import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroLanding } from './components/HeroLanding';
import { ConversationBuilder } from './components/ConversationBuilder';
import { ChatWindow } from './components/ChatWindow';
import { TurnInspectorModal } from './components/TurnInspectorModal';
import { QuizModal } from './components/QuizModal';
import { SavedConversationsModal } from './components/SavedConversationsModal';
import { Conversation, PresetTopic, VocabularyItem, Language, Mode, Difficulty, Tone, Length } from './types';

export default function App() {
  const [view, setView] = useState<'landing' | 'builder' | 'chat'>('landing');
  const [selectedPreset, setSelectedPreset] = useState<PresetTopic | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('haasaa_theme') === 'dark';
  });

  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isContinuing, setIsContinuing] = useState<boolean>(false);

  // Saved conversations
  const [savedConversations, setSavedConversations] = useState<Conversation[]>(() => {
    const raw = localStorage.getItem('haasaa_saved');
    return raw ? JSON.parse(raw) : [];
  });

  // Modals state
  const [inspectedWord, setInspectedWord] = useState<{ item: VocabularyItem; contextText: string } | null>(null);
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('haasaa_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('haasaa_theme', 'light');
    }
  }, [darkMode]);

  const saveToLocalStorage = (list: Conversation[]) => {
    setSavedConversations(list);
    localStorage.setItem('haasaa_saved', JSON.stringify(list));
  };

  const handleToggleSave = (conv: Conversation) => {
    const exists = savedConversations.some((c) => c.id === conv.id);
    if (exists) {
      const updated = savedConversations.filter((c) => c.id !== conv.id);
      saveToLocalStorage(updated);
    } else {
      const updated = [conv, ...savedConversations];
      saveToLocalStorage(updated);
    }
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedConversations.filter((c) => c.id !== id);
    saveToLocalStorage(updated);
  };

  const handleLaunchPreset = (preset: PresetTopic) => {
    setSelectedPreset(preset);
    setView('builder');
  };

  const handleGenerateConversation = async (config: {
    language: Language;
    mode: Mode;
    difficulty: Difficulty;
    tone: Tone;
    length: Length;
    topic: string;
    customPrompt: string;
  }) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (data.success && data.data) {
        setCurrentConversation(data.data);
        setView('chat');
      } else {
        alert(data.error || 'Failed to generate dialogue.');
      }
    } catch (err: any) {
      console.error('Error generating conversation:', err);
      alert('Network error connecting to AI engine. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinueConversation = async (userText?: string, userSpeakerId?: string) => {
    if (!currentConversation) return;
    setIsContinuing(true);
    try {
      const response = await fetch('/api/continue-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: currentConversation,
          userTurnText: userText,
          userSpeakerId,
        }),
      });

      const data = await response.json();
      if (data.success && data.turns) {
        setCurrentConversation({
          ...currentConversation,
          turns: [...currentConversation.turns, ...data.turns],
        });
      }
    } catch (err) {
      console.error('Error continuing conversation:', err);
    } finally {
      setIsContinuing(false);
    }
  };

  const isCurrentSaved = currentConversation
    ? savedConversations.some((c) => c.id === currentConversation.id)
    : false;

  return (
    <div className="min-h-screen bg-stone-100/70 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors">
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onNewConversation={() => {
          setSelectedPreset(null);
          setView('landing');
        }}
        onOpenSaved={() => setShowSavedModal(true)}
        savedCount={savedConversations.length}
      />

      <main className="flex-1">
        {view === 'landing' && (
          <HeroLanding
            onSelectPreset={handleLaunchPreset}
            onOpenCustomBuilder={() => {
              setSelectedPreset(null);
              setView('builder');
            }}
          />
        )}

        {view === 'builder' && (
          <ConversationBuilder
            initialPreset={selectedPreset}
            onGenerate={handleGenerateConversation}
            isLoading={isGenerating}
            onBack={() => setView('landing')}
          />
        )}

        {view === 'chat' && currentConversation && (
          <ChatWindow
            conversation={currentConversation}
            onSave={handleToggleSave}
            isSaved={isCurrentSaved}
            onInspectWord={(item, contextText) => setInspectedWord({ item, contextText })}
            onOpenQuiz={() => setShowQuizModal(true)}
            onContinue={handleContinueConversation}
            isContinuing={isContinuing}
            onRestart={() => {
              setSelectedPreset(null);
              setView('landing');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-6 text-center text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium">
            Haasaa (ሃሳ) • Fluent Multilingual Dialogue in Afaan Oromoo, Amharic & English
          </p>
          <p className="text-[11px] text-stone-400">
            Powered by Google Gemini AI & Audio Speech Synthesis
          </p>
        </div>
      </footer>

      {/* Modals */}
      {inspectedWord && (
        <TurnInspectorModal
          item={inspectedWord.item}
          contextText={inspectedWord.contextText}
          onClose={() => setInspectedWord(null)}
        />
      )}

      {showQuizModal && currentConversation && (
        <QuizModal
          conversation={currentConversation}
          onClose={() => setShowQuizModal(false)}
        />
      )}

      {showSavedModal && (
        <SavedConversationsModal
          savedList={savedConversations}
          onSelect={(conv) => {
            setCurrentConversation(conv);
            setView('chat');
          }}
          onDelete={handleDeleteSaved}
          onClose={() => setShowSavedModal(false)}
        />
      )}
    </div>
  );
}
