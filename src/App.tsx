/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import html2canvas from "html2canvas";
import { 
  Search, 
  History, 
  Bookmark, 
  User, 
  Languages, 
  ArrowRight, 
  ArrowLeft,
  Share2, 
  Play, 
  ChevronRight,
  BookMarked,
  X,
  HistoryIcon,
  Sun,
  Moon,
  Loader2,
  Volume2,
  Camera,
  Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchLore, LoreResult } from './services/geminiService';

type Screen = 'SearchHome' | 'Library' | 'Processing' | 'SavedLore' | 'Result' | 'Error';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('SearchHome');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchImageData, setSearchImageData] = useState<string | null>(null);
  const [currentLore, setCurrentLore] = useState<LoreResult | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<Screen[]>([]);
  const [savedLores, setSavedLores] = useState<Record<string, LoreResult>>({});
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => {
    return localStorage.getItem("tts_voice_uri") || "";
  });

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      if (voices.length > 0) {
        setTtsVoices(voices);
      }
    };

    // Run immediately
    loadVoices();

    // Run again when voices load
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("gemini_api_key") || "";
  });

  const [showApiModal, setShowApiModal] = useState(() => {
    return !localStorage.getItem("gemini_api_key");
  });

  useEffect(() => {
    // Force browser to initialize voices
    window.speechSynthesis.getVoices();
  }, []);

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      alert("Please enter your Gemini API key.");
      return;
    }

    localStorage.setItem("gemini_api_key", apiKey.trim());
    setShowApiModal(false);
  };

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lets-larp-history');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [processingError, setProcessingError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('lets-larp-history', JSON.stringify(searchHistory));
  }, [searchHistory]);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleDark = () => setIsDark(!isDark);

  const navigate = (screen: Screen) => {
    setNavigationHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screen);
  };

  const toggleSave = (query: string, lore: LoreResult) => {
    setSavedLores(prev => {
      const next = { ...prev };
      if (next[query]) {
        delete next[query];
      } else {
        next[query] = lore;
      }
      return next;
    });
  };

  const goBack = () => {
    setCurrentScreen('SearchHome');
    setNavigationHistory([]);
    setProcessingError(null);
  };

  const startProcessing = (query: string, imageData?: string) => {
    if (query.trim() && !searchHistory.includes(query.trim())) {
      setSearchHistory(prev => [query.trim(), ...prev].slice(0, 50));
    }
    setSearchQuery(query);
    setSearchImageData(imageData || null);
    setProcessingError(null);
    setCurrentLore(null);
    navigate('Processing');
  };

  // Real API call with search grounding
  useEffect(() => {
      if (
        currentScreen === 'Processing' &&
        (searchQuery || searchImageData) &&
        !currentLore
      ) {
      let isMounted = true;
      
      const performSearch = async () => {
        if (isFetching) return;
        setIsFetching(true);

        try {
          const result = await fetchLore(searchQuery, searchImageData || undefined);

          if (isMounted) {
            setCurrentLore(result);
            navigate('Result');
          }

          setIsFetching(false); // ✅ success
        } catch (error: any) {
          if (isMounted) {
            console.error("REAL LORE FETCH ERROR:", error);

            const realMessage =
              error?.message ||
              error?.error?.message ||
              JSON.stringify(error);

            alert(realMessage);

            setProcessingError(realMessage);
            navigate('Error');
          }

          setIsFetching(false); // ✅ error
        }
      };

      performSearch();
      return () => { isMounted = false; };
    }
  }, [currentScreen, searchQuery]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'SearchHome':
        return <SearchHome navigate={navigate} startProcessing={startProcessing} onBack={goBack} canGoBack={navigationHistory.length > 0} isDark={isDark} onToggleDark={toggleDark} />;
      case 'Library':
        return (
  <Library
    navigate={navigate}
    onBack={goBack}
    savedLores={savedLores}
    searchHistory={searchHistory}
    setCurrentLore={setCurrentLore}
    setSearchQuery={setSearchQuery}
    isDark={isDark}
    onToggleDark={toggleDark}
    ttsVoices={ttsVoices}
    selectedVoiceURI={selectedVoiceURI}
    setSelectedVoiceURI={setSelectedVoiceURI}
    onChangeApiKey={() => {
      setApiKey(localStorage.getItem("gemini_api_key") || "");
      setShowApiModal(true);
    }}
  />
);
      case 'Processing':
        return <Processing navigate={navigate} isDark={isDark} onToggleDark={toggleDark} />;
      case 'SavedLore':
        return <SavedLore navigate={navigate} onBack={goBack} savedLores={savedLores} toggleSave={toggleSave} setCurrentLore={setCurrentLore} setSearchQuery={setSearchQuery} isDark={isDark} onToggleDark={toggleDark} />;
      case 'Result':
        return (
          <Result 
            navigate={navigate} 
            query={searchQuery} 
            loreData={currentLore}
            onBack={goBack} 
            isSaved={!!savedLores[searchQuery]} 
            onToggleSave={(lore) => toggleSave(searchQuery, lore)} 
            isDark={isDark}
            onToggleDark={toggleDark}
            ttsVoices={ttsVoices}
            selectedVoiceURI={selectedVoiceURI}
          />
        );
      case 'Error':
        return <ErrorView onRetry={() => startProcessing(searchQuery)} onBack={goBack} error={processingError} isDark={isDark} onToggleDark={toggleDark} />;
      default:
        return <SearchHome navigate={navigate} startProcessing={startProcessing} onBack={goBack} canGoBack={navigationHistory.length > 0} isDark={isDark} onToggleDark={toggleDark} />;
    }
  };

    return (
    <>
      <div className="min-h-screen flex flex-col bg-surface overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>

        {showApiModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0f172a]/95 p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1e293b] border border-white/10">
            🔑
          </div>

          <h2 className="text-2xl font-bold text-white">
            Connect Gemini
          </h2>

          <p className="mt-2 text-sm text-slate-300">
            Enter your own Gemini API key to start using Lets Larp. Your key is saved only in this app/browser.
          </p>
        </div>

        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your Gemini API key"
          className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
        />

        <button
          onClick={saveApiKey}
          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98]"
        >
          Save API Key
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          You can get a Gemini API key from Google AI Studio.
        </p>
      </div>
    </div>
        )}
    </>
  );
}

const getHeroImage = (data: LoreResult) => {
  return (
    data.img ||
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop"
  );
};

function Header({ showBack, onBack, title = "Lets Larp", transparent = false, onProfileClick, isDark, onToggleDark }: { showBack?: boolean, onBack?: () => void, title?: string, transparent?: boolean, onProfileClick?: () => void, isDark?: boolean, onToggleDark?: () => void }) {
  return (
    <header className={`fixed top-0 w-full h-16 transition-all border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-5 ${transparent ? 'bg-surface/50 opacity-40 pointer-events-none z-0' : 'bg-surface dark:bg-surface z-50'}`}>
      <div className="flex items-center gap-2">
        {showBack && !transparent ? (
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
            <img 
              src="/src/assets/images/regenerated_image_1777635581912.jpg" 
              alt="Lets Larp Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://media.istockphoto.com/id/1284834994/vector/boy-covering-up-his-ears-hearing-a-stressful-noise.jpg?s=612x612&w=0&k=20&c=aJ0jLVE8Turab-z_MhfZt-6wvK_AfQw2AqzttMIs3Z4=";
              }}
            />
          </div>
        )}
        <h1 className="text-xl font-black tracking-tighter"
            style={{ color: isDark ? "#f3f4f6" : "#111827" }}
        >
           {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {!transparent && (
          <button 
            onClick={onToggleDark}
            className="p-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        )}
        <button 
          onClick={onProfileClick}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <img 
            src="https://static.vecteezy.com/system/resources/previews/051/270/245/non_2x/cartoon-people-avatar-minimalist-human-avatar-versatile-icon-for-online-projects-an-avatar-for-the-profile-picture-of-someone-vector.jpg" 
            alt="User Profile" 
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </header>
  );
}

function BottomNav({ active, navigate, isDark }: { active: 'search' | 'history' | 'saved', navigate: (s: Screen) => void, isDark: boolean }) {
  const inactiveColor = isDark ? "#9ca3af" : "#111827";

  return (
    <nav className="fixed bottom-0 left-0 w-full h-20 bg-surface dark:bg-surface border-t border-gray-100 dark:border-gray-800 flex justify-around items-center px-6 pb-2 z-50 md:hidden">

      {/* SEARCH */}
      <button
        onClick={() => navigate('SearchHome')}
        className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors ${
          active === 'search'
            ? 'text-primary bg-primary/5 dark:bg-primary/10'
            : ''
        }`}
        style={{
          color: active === 'search'
            ? undefined
            : isDark ? "#9ca3af" : "#111827"
        }}
      >
        <Search className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Search
        </span>
      </button>

      {/* HISTORY */}
      <button
        onClick={() => navigate('Library')}
        className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors ${
          active === 'history'
            ? 'text-primary bg-primary/5 dark:bg-primary/10'
            : ''
        }`}
        style={{
          color: active === 'history'
            ? undefined
            : isDark ? "#9ca3af" : "#111827"
        }}
      >
        <History className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          History
        </span>
      </button>

    </nav>
  );
}
function SearchHome({ navigate, startProcessing, onBack, canGoBack, isDark, onToggleDark }: { navigate: (s: Screen) => void, startProcessing: (q: string, img?: string) => void, onBack: () => void, canGoBack: boolean, isDark: boolean, onToggleDark: () => void }) {
  const trending = ["Brat Summer", "Aura points", "Locked in", "Pookie", "Brainrot", "Mewing"];
  const [isSearching, setIsSearching] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSearch = (q: string) => {
    if (!q.trim() && !imagePreview) return;
    setIsSearching(true);
    startProcessing(q, imagePreview || undefined);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center pt-16 pb-20 px-5"
    >
      <Header showBack={canGoBack} onBack={onBack} onProfileClick={() => navigate('Library')} isDark={isDark} onToggleDark={onToggleDark} />
      
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="flex justify-center relative">
           <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-700 shadow-xl relative group">
             <img 
               src={imagePreview || "/input_file_0.png"} 
               alt="Character Illustration" 
               className="w-full h-full object-cover"
               referrerPolicy="no-referrer"
               onError={(e) => {
                 (e.target as HTMLImageElement).src = "https://media.istockphoto.com/id/1284834994/vector/boy-covering-up-his-ears-hearing-a-stressful-noise.jpg?s=612x612&w=0&k=20&c=aJ0jLVE8Turab-z_MhfZt-6wvK_AfQw2AqzttMIs3Z4=";
               }}
             />
             {imagePreview && (
               <button 
                 onClick={() => setImagePreview(null)}
                 className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
               >
                 <X className="w-6 h-6" />
               </button>
             )}
           </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            )}
          </div>
          <input 
            type="text"
            disabled={isSearching}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)}
            placeholder={imagePreview ? 'Describe the image or hit Enter...' : 'What does "4 * 4 = 49" mean?'}
            className={`w-full h-14 pl-14 pr-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm dark:text-white ${isSearching ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <label className="absolute inset-y-0 right-3 flex items-center pr-3 cursor-pointer group/cam">
            <div className={`p-2 rounded-full transition-colors ${imagePreview ? 'bg-primary text-slate-900' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <Camera className="w-5 h-5" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSearching} />
          </label>
        </div>

        <div className="flex flex-col items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Trending</span>
          <div className="flex flex-wrap justify-center gap-3">
            {trending.map(tag => (
              <button 
                key={tag}
                onClick={() => handleSearch(tag)}
                className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm dark:text-white"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

    <BottomNav active="search" navigate={navigate} isDark={isDark} />
    </motion.div>
  );
}

function Library({
  navigate,
  onBack,
  savedLores,
  searchHistory,
  setCurrentLore,
  setSearchQuery,
  isDark,
  onToggleDark,
  ttsVoices,
  selectedVoiceURI,
  setSelectedVoiceURI,
  onChangeApiKey,
}: {
  navigate: (s: Screen) => void;
  onBack: () => void;
  savedLores: Record<string, LoreResult>;
  searchHistory: string[];
  setCurrentLore: (l: LoreResult) => void;
  setSearchQuery: (q: string) => void;
  isDark: boolean;
  onToggleDark: () => void;
  ttsVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (v: string) => void;
  onChangeApiKey: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'saved' | 'history'>('history');
  
  const savedItems = Object.entries(savedLores).map(([id, data]) => ({
    id,
    ...data,
    time: "Saved recently" 
  }));

  const viewLore = (item: any) => {
    setSearchQuery(item.id);
    setCurrentLore(item);
    navigate('Result');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col pt-16 pb-20 px-5"
    >
      <Header showBack onBack={onBack} onProfileClick={() => navigate('Library')} isDark={isDark} onToggleDark={onToggleDark} />
      
      <div className="max-w-3xl mx-auto w-full pt-6">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-4">Activity</h1>
          
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500'}`}
            >
              History
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'saved' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500'}`}
            >
              Saved Lore
            </button>
          </div>
          <button
          onClick={onChangeApiKey}
          className="mt-4 w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:border-primary transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              🔑
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Change API Key</p>
              <p className="text-xs text-gray-400">Update your Gemini key</p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <div className="mt-3 w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 shadow-sm">
          <div className="mb-2">
            <p className="font-bold text-sm">TTS Voice</p>
            <p className="text-xs text-gray-400">Choose a better reading voice</p>
         </div>

          <select
            value={selectedVoiceURI}
            onChange={(e) => {
              setSelectedVoiceURI(e.target.value);
              localStorage.setItem("tts_voice_uri", e.target.value);
            }}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none"
          >
            <option value="">System Default</option>

            {ttsVoices
              .filter(v => v.lang.startsWith("en"))
              .map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                </option>
            ))}
          </select>
        </div>
        </header>

        {activeTab === 'history' ? (
          <div className="space-y-3">
            {searchHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-surface-container dark:bg-gray-800/50 text-center">
                 <HistoryIcon className="w-12 h-12 text-gray-300 mb-3" />
                 <h3 className="text-lg font-bold mb-1">No search history</h3>
                 <p className="text-sm text-gray-500">Your recent searches will appear here.</p>
              </div>
            ) : (
              searchHistory.map((query, i) => (
                <button 
                  key={i}
                  onClick={() => {
                    setSearchQuery(query);
                    navigate('Processing');
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-primary transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 group-hover:bg-primary/10 transition-colors">
                      <Search className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{query}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))
            )}
          </div>
        ) : (
          savedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-5 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-surface-container dark:bg-gray-800/50 text-center">
              <Bookmark className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-bold mb-1">No saved lore</h3>
              <button 
                onClick={() => navigate('SearchHome')}
                className="mt-4 bg-primary text-slate-900 px-6 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                Go Explore
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedItems.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => viewLore(item)}
                  className="bg-surface-container dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col group hover:border-primary transition-all cursor-pointer shadow-sm"
                >
                  <div className="h-40 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
                    <img src={getHeroImage(item as any)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className="absolute top-3 right-3 bg-[#142b2b]/10 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-[#142b2b] border border-[#142b2b]/10">
                      {item.tags?.[0]}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="font-bold text-lg">{item.id}</h2>
                      <Bookmark className="w-4 h-4 text-[#142b2b] fill-[#142b2b]" />
                    </div>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{item.summary}</p>
                    <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-700 text-[10px] font-mono uppercase tracking-widest text-gray-400">
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <nav className="fixed bottom-0 left-0 w-full h-20 bg-surface dark:bg-surface border-t border-gray-100 dark:border-gray-800 flex justify-around items-center px-6 pb-2 z-50 md:hidden">
        <a 
          onClick={(e) => { e.preventDefault(); navigate('SearchHome'); }}
          href="#"
          className="flex flex-col items-center gap-1 px-4 py-1 text-gray-400"
        >
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Search</span>
        </a>
        <a 
          onClick={(e) => { e.preventDefault(); navigate('SavedLore'); }}
          href="#"
          className="flex flex-col items-center gap-1 px-4 py-1 text-primary bg-primary/5 dark:bg-primary/10 rounded-xl"
        >
          <Bookmark className="w-6 h-6 fill-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Saved</span>
        </a>
      </nav>

      {/* Desktop Nav Shim */}
      <div className="hidden md:flex fixed top-0 left-0 h-full w-20 flex-col items-center py-8 border-r border-gray-100 dark:border-gray-800 bg-surface dark:bg-surface z-40 pt-20 gap-8">
        <a 
          onClick={(e) => { e.preventDefault(); navigate('SearchHome'); }}
          href="#"
          className="p-3 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
        >
          <Search className="w-6 h-6 group-hover:text-primary transition-colors" />
        </a>
        <a 
          onClick={(e) => { e.preventDefault(); navigate('SavedLore'); }}
          href="#"
          className="p-3 rounded-xl bg-primary text-slate-900 shadow-lg"
        >
          <Bookmark className="w-6 h-6 fill-slate-900" />
        </a>
      </div>
    </motion.div>
  );
}

function Processing({ navigate, isDark, onToggleDark }: { navigate: (s: Screen) => void, isDark: boolean, onToggleDark: () => void }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col pt-16 pb-20 px-5"
    >
      <Header transparent onProfileClick={() => navigate('Library')} isDark={isDark} onToggleDark={onToggleDark} />

      <main className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="relative w-32 h-32 flex items-center justify-center mb-8">
          {/* Multi-layered loading rings */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-[3px] border-gray-100 dark:border-gray-800 border-t-primary border-r-primary/30"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border-[2px] border-gray-50 dark:border-gray-900 border-b-primary/50 border-l-primary/20"
          />
          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5] 
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Languages className="w-10 h-10 text-primary" />
            </motion.div>
          </div>
        </div>
        
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-3"
        >
          <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">
            Deciphering Lore<span className="inline-block w-8 text-left">{dots}</span>
          </h1>
          <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
            Cross-referencing global semantic patterns and live web context to decode this fragment.
          </p>
        </motion.div>

        {/* Subtle progress indicator */}
        <div className="mt-12 w-48 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full bg-primary"
          />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full h-20 bg-surface/50 border-t border-gray-100 dark:border-gray-800 flex justify-around items-center px-6 pb-2 opacity-40">
         <div className="flex flex-col items-center gap-1"><Search className="w-6 h-6" /></div>
         <div className="flex flex-col items-center gap-1"><History className="w-6 h-6" /></div>
      </nav>
    </motion.div>
  );
}

function SavedLore({ navigate, onBack, savedLores, toggleSave, setCurrentLore, setSearchQuery, isDark, onToggleDark }: { navigate: (s: Screen) => void, onBack: () => void, savedLores: Record<string, LoreResult>, toggleSave: (id: string, lore: LoreResult) => void, setCurrentLore: (l: LoreResult) => void, setSearchQuery: (q: string) => void, isDark: boolean, onToggleDark: () => void }) {
  const savedItems = Object.entries(savedLores).map(([id, data]) => ({
    id,
    ...data,
    time: "Saved recently"
  }));

  const viewLore = (item: any) => {
    setSearchQuery(item.id);
    setCurrentLore(item);
    navigate('Result');
  };

  const isEmpty = savedItems.length === 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col pt-16 pb-20 px-5"
    >
      <Header showBack onBack={onBack} onProfileClick={() => navigate('Library')} isDark={isDark} onToggleDark={onToggleDark} />

      <main id="share-screenshot" className="max-w-3xl mx-auto w-full pt-8 space-y-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">Your Library</h1>
            <p className="text-sm text-gray-500">Archived culture and semantic lore.</p>
          </div>
          <span className="hidden md:inline-flex px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-mono text-gray-400">
            {savedItems.length} Items
          </span>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 px-5 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-surface-container dark:bg-gray-800/50 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
              <HistoryIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-bold mb-2">No lore saved yet.</h3>
            <p className="text-sm text-gray-500 mb-8 max-w-sm">Your library is looking a bit empty.</p>
            <button 
              onClick={() => navigate('SearchHome')}
              className="bg-primary text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Search className="w-5 h-5" />
              Go to Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <article className="md:col-span-12 group flex flex-col md:flex-row bg-surface-container dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-primary transition-colors cursor-pointer" onClick={() => viewLore(savedItems[0])}>
              <div className="md:w-1/3 h-48 md:h-auto border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700">
                <img src={getHeroImage(savedItems[0] as any)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              </div>
              <div className="p-6 flex flex-col flex-1 justify-between">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="inline-block px-2 py-1 rounded bg-teal-50 dark:bg-gray-900 text-[10px] font-bold text-[#142b2b] border border-teal-100 dark:border-gray-700 mb-3">{savedItems[0].tags?.[0]}</span>
                    <h2 className="text-xl font-bold mb-2">{savedItems[0].id}</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">{savedItems[0].summary}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSave(savedItems[0].id, savedItems[0]); }}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-[10px] font-mono text-gray-400">
                  <span>{savedItems[0].time}</span>
                  <div className="text-[#142b2b] font-bold inline-flex items-center gap-1 group/btn">
                    View details <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </article>

            {savedItems.slice(1).map((item, i) => (
              <article key={i} className="md:col-span-6 group bg-surface-container dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-primary transition-colors cursor-pointer" onClick={() => viewLore(item)}>
                 <div className="h-40 border-b border-gray-100 dark:border-gray-700">
                    <img src={getHeroImage(item as any)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                 </div>
                 <div className="p-5 flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                     <div>
                       <span className="inline-block px-2 py-1 rounded bg-gray-50 dark:bg-gray-900 text-[10px] font-bold text-primary border border-gray-100 dark:border-gray-700 mb-2">{item.tags?.[0]}</span>
                       <h3 className="font-bold text-lg">{item.id}</h3>
                     </div>
                     <button 
                      onClick={(e) => { e.stopPropagation(); toggleSave(item.id, item); }}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                     >
                        <X className="w-4 h-4" />
                     </button>
                   </div>
                   <p className="text-xs text-gray-500 line-clamp-2 my-3">{item.summary}</p>
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-mono text-gray-400 uppercase">{item.time}</span>
                     <div className="text-[#142b2b] font-bold text-[10px] inline-flex items-center gap-1 group/btn">
                       Open <ArrowRight className="w-2.5 h-2.5 group-hover/btn:translate-x-0.5 transition-transform" />
                     </div>
                   </div>
                 </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-surface dark:bg-surface border-t border-gray-200 dark:border-gray-800 flex justify-around items-center px-4 pb-4">
        <button 
          onClick={() => navigate('SearchHome')}
          className="flex flex-col items-center gap-1 text-gray-400 w-24"
        >
          <Search className="w-6 h-6" />
          <span className="text-[11px] font-medium">Search</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-primary bg-primary/5 dark:bg-primary/10 rounded-xl px-6 py-1 w-24">
          <Bookmark className="w-6 h-6 fill-primary" />
          <span className="text-[11px] font-medium">Saved</span>
        </button>
      </nav>
    </motion.div>
  );
}

function Result({
  navigate,
  query,
  loreData,
  onBack,
  isSaved,
  onToggleSave,
  isDark,
  onToggleDark,
  ttsVoices,
  selectedVoiceURI,
}: {
  navigate: (s: Screen) => void;
  query: string;
  loreData: LoreResult | null;
  onBack: () => void;
  isSaved: boolean;
  onToggleSave: (lore: LoreResult) => void;
  isDark: boolean;
  onToggleDark: () => void;
  ttsVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
}) {
  if (!loreData) return null;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const displayQuery = query || "Lore Deciphered";
  const isRejected = loreData.summary.toLowerCase().includes("refine your search");

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleToggleSave = () => {
    onToggleSave(loreData);
    navigate('SavedLore');
  };

  const handlePlayVideo = () => {
    window.open(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${query} meme lore slang meaning explained`
      )}`,
      "_blank"
    );
  };

  const speak = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = `${loreData.summary}. ${loreData.lore}`;
    const utterance = new SpeechSynthesisUtterance(text);

    const selectedVoice = ttsVoices.find(
      (voice) => voice.voiceURI === selectedVoiceURI
    );

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleShare = async () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      // Background
      ctx.fillStyle = isDark ? "#020617" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card
      ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
      roundRect(ctx, 80, 80, 920, 1190, 40);
      ctx.fill();

      // Brand
      ctx.fillStyle = isDark ? "#f8fafc" : "#111827";
      ctx.font = "bold 54px Arial";
      ctx.fillText("Lets Larp", 130, 170);

      // Query
      ctx.fillStyle = "#14b8a6";
      ctx.font = "bold 42px Arial";
      wrapText(ctx, `"${query || "Lore Deciphered"}"`, 130, 250, 820, 52);

      // Summary
      ctx.fillStyle = isDark ? "#e5e7eb" : "#111827";
      ctx.font = "bold 40px Arial";

      const summaryEndY = wrapText(
        ctx,
        loreData.summary,
        130,
        370,
        820,
        50,
        5
      );

      // Lore
      ctx.fillStyle = isDark ? "#cbd5e1" : "#475569";
      ctx.font = "30px Arial";

      wrapText(
        ctx,
        loreData.lore,
        130,
        summaryEndY + 50,
        820,
        42,
        11
      );

      // Footer
      ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
      ctx.font = "bold 28px Arial";
      ctx.fillText("Generated with Lets Larp", 130, 1210);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!blob) throw new Error("Could not create image");

      const file = new File([blob], "lets-larp.png", {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Lets Larp",
          text: `Check this out: ${query}`,
        });
        return;
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "lets-larp.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      alert("Share image downloaded.");
    } catch (error) {
      console.error("SHARE ERROR:", error);
      alert("Could not create share image.");
    }
  };

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 6
) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[i] + " ";
      y += lineHeight;
      lines++;

      if (lines >= maxLines) {
        ctx.fillText(line.trim() + "...", x, y);
        return y;
      }
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line.trim(), x, y);
  return y;
}

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col pt-16 pb-20 px-5"
    >
      <Header showBack onBack={onBack} onProfileClick={() => navigate('Library')} isDark={isDark} onToggleDark={onToggleDark} />

      <main id="share-screenshot" className="max-w-3xl mx-auto w-full pt-8 space-y-6">
        <div className="text-center relative">
          <span className="inline-block px-4 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full font-mono text-sm text-gray-600 dark:text-gray-400">
            "{displayQuery}"
          </span>

          {!isRejected && (
            <button
              onClick={speak}
              className={`absolute right-0 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all ${isSpeaking ? 'bg-primary text-slate-900 scale-110 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 hover:text-primary hover:border-primary'}`}
              title="Listen to lore"
            >
              <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
            </button>
          )}
        </div>

        <div className="bg-surface-container dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <p className={`text-2xl font-extrabold tracking-tight leading-tight pl-4 italic dark:text-white ${isRejected ? 'text-red-500' : ''}`}>
            {loreData.summary}
          </p>
        </div>

        {!isRejected && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-container dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4 text-[#142b2b]">
                <HistoryIcon className="w-5 h-5" />
                <h2 className="font-bold text-lg dark:text-white">The Lore</h2>
              </div>

              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed flex-1 whitespace-pre-wrap">
                {loreData.lore}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {loreData.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-surface-container dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-[#142b2b]">
                <ChevronRight className="w-5 h-5" />
                <h2 className="font-bold text-lg dark:text-white">How to Use</h2>
              </div>

              <ul className="space-y-4">
                {loreData.usage.map((u, i) => {
                  const parts = u.split(':');
                  const label = parts[0];
                  const content = parts.slice(1).join(':').trim();

                  return (
                    <li key={i} className={`${i < loreData.usage.length - 1 ? 'pb-4 border-b border-gray-50 dark:border-gray-700' : ''}`}>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">{label}:</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">"{content}"</p>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="col-span-1 md:col-span-2 aspect-video bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden relative group border border-gray-100 dark:border-gray-700">
              <img
                src={getHeroImage(loreData)}
                alt={query}
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&h=450&fit=crop";
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

              <button
                onClick={handlePlayVideo}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center text-slate-900 shadow-xl hover:scale-110 active:scale-95 transition-transform backdrop-blur-sm"
              >
                <Play className="w-8 h-8 fill-slate-900 ml-1" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          {!isRejected && (
            <button
              onClick={handleShare}
              className="flex-1 h-14 bg-primary text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <Share2 className="w-5 h-5" /> Share
            </button>
          )}

          <button
            onClick={isRejected ? onBack : handleToggleSave}
            className={`flex-1 h-14 border rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              isRejected
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                : isSaved
                  ? 'bg-primary text-slate-900 border-primary shadow-lg shadow-primary/20'
                  : 'bg-white dark:bg-gray-800 text-on-surface dark:text-white border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {isRejected ? (
              <>Try another search</>
            ) : (
              <>
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-slate-900' : ''}`} /> {isSaved ? 'Saved' : 'Save'}
              </>
            )}
          </button>
        </div>
      </main>

      <BottomNav active="search" navigate={navigate} isDark={isDark} />
    </motion.div>
  );
}
function ErrorView({ onRetry, onBack, error, isDark, onToggleDark }: { onRetry: () => void, onBack: () => void, error: string | null, isDark: boolean, onToggleDark: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col pt-16 pb-20 px-5"
    >
      <Header showBack onBack={onBack} onProfileClick={() => {}} isDark={isDark} onToggleDark={onToggleDark} />
      
      <main className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3 dark:text-white">Cultural Desync</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {error || "Something went wrong while deciphering this lore. Our linguistic nodes may be offline."}
        </p>
        
        <div className="flex flex-col w-full gap-3">
          <button 
            onClick={onRetry}
            className="w-full h-14 bg-primary text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Play className="w-5 h-5 fill-slate-900" /> Try Again
          </button>
          <button 
            onClick={onBack}
            className="w-full h-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </main>
      
      <BottomNav active="search" navigate={() => onBack()} isDark={isDark} />
    </motion.div>
  );
}
