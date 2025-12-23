import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Book, BookOpen, FileText, Copy, PenTool, Layout, CheckSquare, Wand2, Loader2, RotateCcw, BrainCircuit, Printer, FolderOpen, Save, Upload, AlertCircle, Search, Moon, Sun, Settings, X, Key, FileDown, Plus, Trash2, History, Database, Columns, FileType, Library, Puzzle, Trophy, FileSignature, Paperclip } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import mermaid from 'mermaid';
import html2pdf from 'html2pdf.js';

const STORAGE_KEY = 'proposalreal_data';
const API_KEY_STORAGE = 'proposalreal_apikey';
const GROQ_KEY_STORAGE = 'proposalreal_groqkey';
const CLAUDE_KEY_STORAGE = 'proposalreal_claudekey';
const DEEPSEEK_KEY_STORAGE = 'proposalreal_deepseekkey';
const PROVIDER_STORAGE = 'proposalreal_provider';
const THEME_STORAGE = 'proposalreal_theme';
const HISTORY_STORAGE = 'proposalreal_history';
const SERPAPI_KEY_STORAGE = 'proposalreal_serpapi';

// Default API keys (kosong = user wajib isi sendiri)
const DEFAULT_GROQ_KEY = '';
const DEFAULT_SERPAPI_KEY = '';

// Multiple CORS proxies for fallback
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://cors.eu.org/${url}`,
];

// Helper function to try multiple proxies
const fetchWithProxy = async (apiUrl, maxRetries = 3) => {
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyUrl = CORS_PROXIES[i](apiUrl);
    try {
      const response = await fetch(proxyUrl, { timeout: 10000 });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.log(`Proxy ${i + 1} failed:`, err.message);
      if (i === CORS_PROXIES.length - 1) throw err;
    }
  }
  throw new Error('All proxies failed');
};

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [splitView, setSplitView] = useState(false); // Real-time preview toggle
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState('Menghubungkan ke AI...');
  const [generateProgress, setGenerateProgress] = useState(0); // Progress percentage
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(THEME_STORAGE) === 'dark');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // History modal
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem(HISTORY_STORAGE);
    return saved ? JSON.parse(saved) : [];
  });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem(GROQ_KEY_STORAGE) || DEFAULT_GROQ_KEY);
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem(CLAUDE_KEY_STORAGE) || '');
  const [deepseekKey, setDeepseekKey] = useState(() => localStorage.getItem(DEEPSEEK_KEY_STORAGE) || '');
  const [serpApiKey, setSerpApiKey] = useState(() => localStorage.getItem(SERPAPI_KEY_STORAGE) || DEFAULT_SERPAPI_KEY);
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem(PROVIDER_STORAGE) || 'deepseek');
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile sidebar toggle
  const [isSearchingScholar, setIsSearchingScholar] = useState(false); // Google Scholar search state
  const [scholarResults, setScholarResults] = useState([]); // Scholar search results
  const [scholarRefsForCitations, setScholarRefsForCitations] = useState([]); // All references for citations
  const [activePreviewSection, setActivePreviewSection] = useState('cover'); // Active section in preview


  const [smartInput, setSmartInput] = useState({
    judul: '',
    masalah: '',
    solusi: '',
    metode: 'Waterfall',
    instansi: '',
    // New detailed fields
    narasumber: '', // Siapa yang diwawancarai
    observasi: '', // Apa yang diamati
    fitur: '', // Fitur utama sistem
    pengguna: '', // Siapa pengguna sistem
    lokasi: '', // Lokasi spesifik
    deskripsiSistem: '' // Deskripsi detail tentang web/aplikasi yang akan dirancang
  });

  const [schedule, setSchedule] = useState([
    { id: 1, activity: 'Pengumpulan Data', m1: true, m2: true, m3: false, m4: false },
    { id: 2, activity: 'Analisis Sistem', m1: false, m2: true, m3: true, m4: false },
    { id: 3, activity: 'Perancangan Sistem', m1: false, m2: false, m3: true, m4: true },
    { id: 4, activity: 'Implementasi & Coding', m1: false, m2: false, m3: false, m4: true },
    { id: 5, activity: 'Pengujian (Testing)', m1: false, m2: false, m3: false, m4: true },
    { id: 6, activity: 'Penyusunan Laporan', m1: false, m2: false, m3: false, m4: true },
  ]);

  const [formData, setFormData] = useState({
    judul: '', penulis: '', nim: '', prodi: '', instansi: '', tahun: new Date().getFullYear().toString(),
    bab1_par1_tekno: '', bab1_par2_topik: '', bab1_par3_objek: '', bab1_par4_solusi: '', bab1_par5_metode: '', bab1_par6_penutup: '',
    bab2_intro: '', bab2_1_1_perancangan: '', bab2_1_2_si: '', bab2_1_3_objek_teori: '',
    bab2_1_4_uml_intro: '', bab2_1_4_usecase: '', bab2_1_4_activity: '', bab2_1_4_class: '',
    // UML Diagram Mermaid syntax
    uml_usecase_diagram: '', // Mermaid for use case visual
    uml_activity_diagram: '', // Mermaid for activity visual
    uml_class_diagram: '', // Mermaid for class visual
    erd_diagram: '', // Mermaid for ERD (Entity Relationship Diagram)
    bab2_1_5_metode_pengembangan: '',
    bab2_2_pembahasan_objek: '', bab2_3_penelitian_terdahulu: '', bab2_4_tahapan: '',
    bab3_1_1_analisis_masalah: '', bab3_1_2_metode_pengumpulan: '',
    bab3_2_1_flowchart_desc: '',
    bab3_2_1_flowchart_user: '', // Mermaid syntax for user flowchart
    bab3_2_1_flowchart_admin: '', // Mermaid syntax for admin flowchart
    erd_desc: '', // ERD description
    bab3_2_2_fungsional: '', bab3_2_2_non_fungsional: '', bab3_2_2_hardware: '', bab3_2_2_software: '',
    bab4_1_kesimpulan: '', bab4_2_saran: '',
    daftar_pustaka: '', lampiran_draf_wawancara: '',
    lampiran_hasil_wawancara: '',
    lampiran_dokumentasi: '',
    lampiran_surat: ''
  });

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.smartInput) setSmartInput(data.smartInput);
        if (data.formData) setFormData(data.formData);
        if (data.schedule) setSchedule(data.schedule);
      } catch (e) { console.error('Failed to load saved data', e); }
    }
  }, []);

  // Auto-save with debounce
  const autoSave = useCallback(() => {
    const data = { smartInput, formData, schedule };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setAutoSaveIndicator(true);
    setTimeout(() => setAutoSaveIndicator(false), 1500);
  }, [smartInput, formData, schedule]);

  useEffect(() => {
    const timer = setTimeout(autoSave, 1000);
    return () => clearTimeout(timer);
  }, [smartInput, formData, schedule, autoSave]);

  // Scroll tracking for Preview
  useEffect(() => {
    if (!showPreview) return;

    const handleScroll = () => {
      const sections = ['cover', 'bab1', 'bab2', 'bab3', 'bab4', 'daftar-pustaka', 'lampiran'];
      const scrollPos = document.querySelector('main')?.scrollTop || 0;

      for (const id of sections) {
        const el = document.getElementById(`preview-section-${id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If the section's top is visible in the upper part of the screen
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActivePreviewSection(id);
            break;
          }
        }
      }
    };

    const container = document.querySelector('main');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Run once to set initial active section
      handleScroll();
    }
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
    };
  }, [showPreview]);


  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(THEME_STORAGE, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleSmartChange = (e) => {
    const { name, value } = e.target;
    setSmartInput(prev => ({ ...prev, [name]: value }));
    if (name === 'judul') setFormData(prev => ({ ...prev, judul: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = (id, field) => {
    setSchedule(prev => prev.map(item => item.id === id ? { ...item, [field]: !item[field] } : item));
  };

  const saveToJSON = () => {
    const data = { smartInput, formData, schedule };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    saveAs(blob, `proposal_draft_${new Date().toISOString().slice(0, 10)}.json`);
    setSaveStatus('Draft tersimpan!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const loadFromJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.formData) setFormData(data.formData);
        if (data.smartInput) setSmartInput(data.smartInput);
        if (data.schedule) setSchedule(data.schedule);
        alert('Draft berhasil dimuat!');
      } catch (err) { alert('Gagal membaca file.'); }
    };
    reader.readAsText(file);
  };

  const saveApiKey = () => {
    localStorage.setItem(API_KEY_STORAGE, apiKey);
    localStorage.setItem(GROQ_KEY_STORAGE, groqKey);
    localStorage.setItem(CLAUDE_KEY_STORAGE, claudeKey);
    localStorage.setItem(DEEPSEEK_KEY_STORAGE, deepseekKey);
    localStorage.setItem(PROVIDER_STORAGE, aiProvider);
    localStorage.setItem(SERPAPI_KEY_STORAGE, serpApiKey);
    setShowSettings(false);
    alert('✅ Settings tersimpan!');
  };

  // Google Scholar Search Function
  const searchGoogleScholar = async (query) => {
    if (!query) {
      setError('Masukkan judul untuk mencari penelitian terdahulu');
      return;
    }

    setIsSearchingScholar(true);
    setError('');

    try {
      // Extract keywords from title for better search
      const keywords = query
        .replace(/perancangan|sistem|informasi|berbasis|web|aplikasi/gi, '')
        .trim()
        .split(' ')
        .filter(w => w.length > 3)
        .slice(0, 4)
        .join(' ');

      const searchQuery = keywords || query.split(' ').slice(0, 3).join(' ');

      // SerpAPI Google Scholar endpoint with CORS proxy
      const apiUrl = `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(searchQuery + ' indonesia')}&hl=id&as_ylo=2020&as_yhi=2024&num=5&api_key=${serpApiKey}`;

      // Use CORS proxy for frontend
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;

      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (data.organic_results && data.organic_results.length > 0) {
        const results = data.organic_results.slice(0, 3).map((item, index) => {
          // Extract author and year
          const pubInfo = item.publication_info?.summary || '';
          const authorMatch = pubInfo.match(/^([^-]+)/);
          const yearMatch = pubInfo.match(/(\d{4})/);

          return {
            id: index + 1,
            title: item.title || 'Judul tidak tersedia',
            authors: authorMatch ? authorMatch[1].trim() : 'Penulis tidak diketahui',
            year: yearMatch ? yearMatch[0] : '2020',
            link: item.link || '',
            snippet: item.snippet || '',
            cited_by: item.inline_links?.cited_by?.total || 0
          };
        });

        setScholarResults(results);

        // Auto-fill penelitian terdahulu
        const formattedResults = results.map((r, i) =>
          `${i + 1}. ${r.authors} (${r.year}) - "${r.title}". ${r.snippet ? r.snippet.substring(0, 200) + '...' : ''}\nLink: ${r.link}\nDikutip: ${r.cited_by} kali\n`
        ).join('\n');

        setFormData(prev => ({
          ...prev,
          bab2_3_penelitian_terdahulu: formattedResults
        }));

        alert(`✅ Berhasil menemukan ${results.length} penelitian terdahulu dari Google Scholar!`);
      } else {
        setError('Tidak ditemukan hasil. Coba kata kunci lain.');
      }
    } catch (err) {
      console.error('Scholar search error:', err);
      setError('Gagal mencari di Google Scholar. Periksa koneksi internet.');
    } finally {
      setIsSearchingScholar(false);
    }
  };

  const generateWithAI = async () => {
    if (!smartInput.judul || !smartInput.masalah || !smartInput.solusi) {
      setError('Mohon isi Judul, Masalah, dan Solusi terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGenerateProgress(0);

    // Step 1: Multiple Google Scholar searches for comprehensive results
    setLoadingText('🔍 [5%] Menyiapkan pencarian Google Scholar...');
    setGenerateProgress(5);
    let scholarReferences = [];
    let allResults = [];

    try {
      // Extract keywords from title
      const keywords = smartInput.judul
        .replace(/perancangan|sistem|informasi|berbasis|web|aplikasi/gi, '')
        .trim()
        .split(' ')
        .filter(w => w.length > 3);

      const mainKeyword = keywords.slice(0, 3).join(' ') || smartInput.judul.split(' ').slice(0, 3).join(' ');
      const metodeName = smartInput.metode || 'waterfall';

      // Comprehensive search queries covering ALL proposal aspects
      const searchQueries = [
        // Topik utama
        `${mainKeyword} sistem informasi indonesia`,
        `${mainKeyword} skripsi jurnal 2024`,
        `perancangan ${mainKeyword} berbasis web`,
        // Metodologi
        `metode ${metodeName} pengembangan sistem`,
        `analisis PIECES sistem informasi`,
        // Teori
        `pengertian sistem informasi manajemen`,
        `UML unified modeling language perancangan`,
        // Implementasi
        `implementasi ${mainKeyword} studi kasus`,
        // Web development
        `aplikasi web ${mainKeyword} PHP MySQL`,
        // Penelitian terdahulu
        `penelitian terdahulu ${mainKeyword} 2023 2024`
      ];

      // Perform multiple searches with fallback proxies
      for (let i = 0; i < searchQueries.length; i++) {
        setLoadingText(`🔍 [${5 + (i * 2)}%] Pencarian ${i + 1}/${searchQueries.length}: "${searchQueries[i].substring(0, 30)}..."`);
        setGenerateProgress(5 + (i * 2));

        try {
          const apiUrl = `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(searchQueries[i])}&hl=id&as_ylo=2020&as_yhi=2024&num=5&api_key=${serpApiKey}`;

          // Use fetchWithProxy with multiple CORS fallbacks
          const data = await fetchWithProxy(apiUrl);

          if (data.organic_results && Array.isArray(data.organic_results)) {
            allResults.push(...data.organic_results);
            console.log(`✅ Search ${i + 1} found ${data.organic_results.length} results`);
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.log(`Search ${i + 1} failed:`, err);
        }
      }

      setLoadingText('🔍 [20%] Memproses hasil pencarian...');
      setGenerateProgress(20);

      // Remove duplicates based on title similarity
      const uniqueResults = [];
      const seenTitles = new Set();

      for (const item of allResults) {
        const titleKey = item.title?.toLowerCase().substring(0, 50) || '';
        if (!seenTitles.has(titleKey) && item.title) {
          seenTitles.add(titleKey);
          uniqueResults.push(item);
        }
      }

      if (uniqueResults.length > 0) {
        // Get more references for comprehensive proposal
        scholarReferences = uniqueResults.slice(0, 20).map((item, index) => {
          const pubInfo = item.publication_info?.summary || '';
          const authorMatch = pubInfo.match(/^([^-]+)/);
          const yearMatch = pubInfo.match(/(\d{4})/);

          // Extract publisher/journal if available
          const publisherMatch = pubInfo.match(/-\s*([^,]+)/);

          // Get the best available link
          const directLink = item.link || '';
          const resourcesLink = item.resources?.[0]?.link || '';
          const scholarLink = item.result_id ? `https://scholar.google.com/scholar?cluster=${item.result_id}` : '';
          const finalLink = directLink || resourcesLink || scholarLink || `https://scholar.google.com/scholar?q=${encodeURIComponent(item.title)}`;

          return {
            id: index + 1,
            title: item.title || 'Judul tidak tersedia',
            authors: authorMatch ? authorMatch[1].trim() : 'Unknown',
            year: yearMatch ? yearMatch[0] : '2022',
            link: finalLink,
            snippet: item.snippet || '',
            cited_by: item.inline_links?.cited_by?.total || 0,
            publisher: publisherMatch ? publisherMatch[1].trim() : 'Jurnal Ilmiah'
          };
        });

        // Auto-fill penelitian terdahulu (top 3)
        const penelitianTerdahulu = scholarReferences.slice(0, 3).map((r, i) =>
          `${i + 1}. ${r.authors.substring(0, 50)} (${r.year})\n   Judul: "${r.title.substring(0, 80)}${r.title.length > 80 ? '...' : ''}"\n   Sumber: ${r.publisher}\n   Link: ${r.link}\n   Dikutip: ${r.cited_by} kali\n`
        ).join('\n');

        // Helper function to format author name consistently
        const formatAuthor = (author) => {
          if (!author || author === 'Unknown') return 'Anonim';
          // Take first author only, clean up
          const firstAuthor = author.split(',')[0].split('&')[0].trim();
          return firstAuthor.length > 40 ? firstAuthor.substring(0, 40) + ' et al.' : firstAuthor;
        };

        // Helper to format title (max 100 chars)
        const formatTitle = (title) => {
          if (!title) return 'Tidak ada judul';
          return title.length > 100 ? title.substring(0, 100) + '...' : title;
        };

        // Save references to state for citation tracking
        setScholarRefsForCitations(scholarReferences);

        // Auto-fill daftar pustaka with CONSISTENT formatting
        const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

        const daftarPustakaFull = `DAFTAR PUSTAKA

Referensi dari Google Scholar (Total: ${scholarReferences.length} sumber)

${scholarReferences.slice(0, 15).map((r, i) =>
          `[${i + 1}] ${formatAuthor(r.authors)}. (${r.year}). "${formatTitle(r.title)}". ${r.publisher || 'Jurnal Online'}.
     🔗 Link: ${r.link}
     📅 Diakses: ${today}
     📊 Dikutip: ${r.cited_by || 0} kali`
        ).join('\n\n')}`;

        setFormData(prev => ({
          ...prev,
          bab2_3_penelitian_terdahulu: penelitianTerdahulu,
          daftar_pustaka: daftarPustakaFull
        }));
      }
    } catch (err) {
      console.log('Scholar search error:', err);
      // Show user-friendly error but continue
      setLoadingText('⚠️ Google Scholar gagal, mencoba lagi...');

      // Retry once
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryUrl = `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(smartInput.judul.split(' ').slice(0, 3).join(' '))}&hl=id&as_ylo=2020&num=5&api_key=${serpApiKey}`;
        const retryProxy = `https://corsproxy.io/?${encodeURIComponent(retryUrl)}`;
        const retryResponse = await fetch(retryProxy);
        const retryData = await retryResponse.json();

        if (retryData.organic_results && retryData.organic_results.length > 0) {
          scholarReferences = retryData.organic_results.slice(0, 5).map((item, index) => ({
            id: index + 1,
            title: item.title || 'Judul tidak tersedia',
            authors: item.publication_info?.summary?.match(/^([^-]+)/)?.[1]?.trim() || 'Unknown',
            year: item.publication_info?.summary?.match(/(\d{4})/)?.[0] || '2022',
            link: item.link || '',
            snippet: item.snippet || '',
            cited_by: item.inline_links?.cited_by?.total || 0,
            publisher: item.publication_info?.summary?.match(/-\s*([^,]+)/)?.[1]?.trim() || 'Jurnal Ilmiah'
          }));
          setLoadingText('✅ Google Scholar berhasil (retry)');
        }
      } catch (retryErr) {
        console.log('Scholar retry also failed:', retryErr);
        setError('⚠️ Google Scholar tidak tersedia. Proposal akan dibuat tanpa referensi otomatis.');
      }
    }

    setLoadingText('🤖 [25%] Menghubungkan ke AI...');
    setGenerateProgress(25);

    // Build scholar references for AI prompt - for ALL chapters
    const scholarRefText = scholarReferences.length > 0
      ? `\n\n=== REFERENSI WAJIB DARI GOOGLE SCHOLAR ===
Total ${scholarReferences.length} sumber yang SUDAH DIVERIFIKASI.

DAFTAR REFERENSI UNTUK KUTIPAN:
${scholarReferences.map((r, i) => `[${i + 1}] ${r.authors} (${r.year}). "${r.title}". ${r.publisher}.`).join('\n')}

🚫 ATURAN KUTIPAN KETAT:
- HANYA GUNAKAN referensi dari daftar di atas!
- JANGAN membuat/mengarang kutipan baru yang tidak ada di daftar!
- Format kutipan: "(Nama, Tahun)" - contoh: (${scholarReferences[0]?.authors?.split(',')[0]?.trim() || 'Penulis'}, ${scholarReferences[0]?.year || '2022'})
- Atau format: "[nomor]" - contoh: [1], [2], dst.
- Semua kutipan HARUS ADA di Daftar Pustaka!

DISTRIBUSI KUTIPAN PER BAB:
- BAB 1: Gunakan referensi [1]-[3] untuk teknologi dan SI (Max 3 kutipan)
- BAB 2: Gunakan referensi [1]-[6] untuk tinjauan pustaka (Max 6 kutipan)  
- BAB 3: Gunakan referensi [4]-[8] untuk metodologi (Max 3 kutipan)
- BAB 4: TANPA KUTIPAN - murni kesimpulan penulis

CONTOH KUTIPAN YANG BENAR:
"Sistem informasi adalah kumpulan komponen yang terintegrasi (${scholarReferences[0]?.authors?.split(',')[0]?.trim() || 'Penulis'}, ${scholarReferences[0]?.year || '2022'}). Penulis menilai bahwa definisi ini relevan dengan ${smartInput.judul}."

CONTOH KUTIPAN YANG SALAH (JANGAN DITIRU!):
"Menurut Laudon (2020)..." ← SALAH jika Laudon tidak ada di daftar referensi!`
      : `\n\n⚠️ TIDAK ADA REFERENSI DARI GOOGLE SCHOLAR.
Gunakan kutipan MINIMAL dan fokus pada narasi analisis penulis.
Jika harus mengutip, gunakan format: "(Penulis, Tahun)" dengan referensi umum.`;

    const isGeneralTopic = !smartInput.instansi;

    // Different context for general vs specific topics
    const topicContext = isGeneralTopic
      ? `=== PROPOSAL TOPIK UMUM ===
- FOKUS: Seluruh kos-kosan di daerah ${smartInput.lokasi || 'penelitian'}
- NARASUMBER: Penghuni kos (bukan pemilik kos)
- OBSERVASI: Berbagai kos di daerah tersebut
- WAWANCARA: Penghuni kos yang mengalami masalah langsung
- PENULISAN: Gunakan frasa "kos-kosan di daerah X", "penghuni kos umumnya", "berdasarkan survei ke beberapa kos"
- JANGAN sebut nama kos spesifik
- Narasumber adalah PENGHUNI KOS, bukan pemilik`
      : `=== PROPOSAL TOPIK KHUSUS ===
- FOKUS: Satu kos spesifik yaitu ${smartInput.instansi}
- NARASUMBER: Pemilik kos ${smartInput.instansi}
- OBSERVASI: Proses di ${smartInput.instansi} saja
- WAWANCARA: Pemilik/pengelola kos
- PENULISAN: Sebutkan nama "${smartInput.instansi}" secara konsisten
- Narasumber adalah PEMILIK KOS, karena fokus 1 kos`;

    const prompt = `Kamu adalah DOSEN PEMBIMBING SKRIPSI senior di Indonesia dengan pengalaman 20 tahun. Buatkan proposal PERANCANGAN SISTEM INFORMASI yang SANGAT BERKUALITAS, MATANG, SPESIFIK, dan siap diajukan ke dosen penguji.

KONTEKS PERANCANGAN:
- Judul: "${smartInput.judul}"
- Jenis Proposal: "${isGeneralTopic ? 'UMUM (seluruh kos di daerah)' : 'KHUSUS untuk: ' + smartInput.instansi}"
- Objek/Instansi: "${smartInput.instansi || 'Kos-kosan di daerah ' + (smartInput.lokasi || 'setempat')}"
- Lokasi: "${smartInput.lokasi || 'Tidak spesifik'}"
- Permasalahan: "${smartInput.masalah}"
- Solusi yang Diusulkan: "${smartInput.solusi}"
- Metode Pengembangan: "${smartInput.metode}"
- Narasumber Wawancara: "${smartInput.narasumber || (isGeneralTopic ? 'Penghuni kos' : 'Pemilik kos')}"
- Pengguna Sistem: "${smartInput.pengguna || 'Admin dan User'}"
- Objek Observasi: "${smartInput.observasi || 'Proses yang akan diotomasi'}"
- Fitur Utama: "${smartInput.fitur || 'Fitur CRUD dasar'}"

=== DESKRIPSI DETAIL SISTEM YANG AKAN DIRANCANG ===
${smartInput.deskripsiSistem ? `
${smartInput.deskripsiSistem}

INSTRUKSI PENTING BERDASARKAN DESKRIPSI:
- Buat diagram UML (Use Case, Activity, Class) SESUAI dengan deskripsi di atas
- Buat ERD dengan tabel/entitas SESUAI dengan database yang disebutkan
- Jelaskan fitur-fitur SESUAI dengan yang user deskripsikan
- Sesuaikan kebutuhan fungsional dengan deskripsi sistem
- Jika user menyebut teknologi tertentu, masukkan ke BAB 3
` : 'User tidak memberikan deskripsi detail. Gunakan fitur standar CRUD untuk sistem informasi.'}
${scholarRefText}

${topicContext}

=== ATURAN KUTIPAN - HANYA GOOGLE SCHOLAR ===
PERINGATAN: Dosen AKAN MENGECEK referensi! SEMUA kutipan harus dari GOOGLE SCHOLAR dengan LINK yang bisa diakses.

ATURAN KUTIPAN - SANGAT PENTING:
1. HANYA gunakan kutipan dari REFERENSI GOOGLE SCHOLAR yang sudah diberikan di atas
2. JANGAN gunakan buku atau sumber tanpa link - SEMUA harus ada URL-nya
3. SETIAP kutipan (Nama, Tahun) di dalam teks HARUS ada di daftar Google Scholar
4. JANGAN membuat kutipan dari sumber yang TIDAK ADA di daftar referensi
5. BAB 1: Minimal 3 kutipan - pilih dari Google Scholar #1-3
6. BAB 2: Minimal 6 kutipan - gunakan Google Scholar #1-6
7. BAB 3: Minimal 3 kutipan - gunakan Google Scholar #4-8
8. Format: (NamaPenulis, Tahun) - sesuai daftar Google Scholar
9. SEMUA kutipan WAJIB ada di DAFTAR PUSTAKA dengan LINK
10. Karena semua referensi sudah dari Google Scholar, dosen bisa mengecek langsung

=== ATURAN PENULISAN KRUSIAL ===
1. TULIS PANJANG DAN DETAIL untuk setiap BAB, sub-bab, dan sub-sub-bab
2. JANGAN hanya kutipan terus! Harus ada KARANGAN SENDIRI yang MENDOMINASI
3. Kutipan hanya PENDUKUNG (15-20% dari teks), sisanya adalah ANALISIS DAN PENDAPAT SENDIRI
4. Setiap paragraf: 80-85% karangan sendiri + 15-20% kutipan pendukung
5. WAJIB gunakan istilah "PERANCANGAN" - JANGAN PERNAH pakai "Penelitian"
6. Bahasa Indonesia FORMAL, akademis, tapi mengalir dan enak dibaca
7. Tulis seperti mahasiswa yang MEMAHAMI topiknya, bukan hanya mengutip

=== ATURAN ANTI-KUTIPAN BERLEBIHAN (SANGAT PENTING!!!) ===

🚫 DILARANG KERAS - POLA YANG HARUS DIHINDARI:
- JANGAN mulai paragraf dengan "Menurut..." - INI POLA TERLARANG!
- JANGAN tulis "Menurut A (tahun), ... Menurut B (tahun), ... Menurut C (tahun)..."
- JANGAN setiap kalimat ada nama ahli dan tahun
- JANGAN tulis lebih dari 2 kutipan per paragraf
- JANGAN paragraf tanpa SIKAP PENULIS - ini yang bikin dosen tanya "pendapatmu mana?"

=== STRUKTUR WAJIB SETIAP PARAGRAF ===

POLA TEORI → PENULIS → SISTEM (WAJIB DIIKUTI!):
1. Kalimat 1-2: Jelaskan teori/konsep (boleh ada kutipan)
2. Kalimat 3-4: "Berdasarkan analisis penulis..." atau "Dalam pandangan penulis..."
3. Kalimat 5-6: Hubungkan ke sistem ${smartInput.judul} yang dirancang

SETIAP PARAGRAF HARUS DIAKHIRI DENGAN SALAH SATU:
- "Berdasarkan analisis penulis, hal ini menunjukkan bahwa..."
- "Menurut penulis, kondisi ini membuktikan perlunya..."
- "Oleh karena itu, penulis menilai bahwa sistem yang dirancang..."
- "Dari sudut pandang penulis, teori ini relevan karena..."
- "Dengan demikian, dapat penulis simpulkan bahwa..."

JANGAN BIARKAN PARAGRAF BERAKHIR DENGAN:
❌ Kutipan saja (tanpa komentar penulis)
❌ Definisi saja (tanpa kaitan ke sistem)
❌ Teori saja (tanpa stance penulis)

✅ POLA PENULISAN YANG BENAR:
- Mulai paragraf dengan PENDAPAT/ANALISIS SENDIRI
- Kutipan hanya sebagai PENGUAT di tengah paragraf
- AKHIRI dengan sikap/stance penulis
- Rasio: 4-5 kalimat sendiri + 1 kalimat kutipan

=== CONTOH POLA YANG SALAH (JANGAN DITIRU!) ===
❌ "Menurut Laudon (2020), sistem informasi adalah kumpulan komponen. Menurut O'Brien (2019), SI terdiri dari hardware dan software. Menurut Kotler (2021), teknologi informasi membantu organisasi..."
➡️ Ini SALAH karena semua kalimat adalah kutipan!

=== CONTOH POLA YANG BENAR (WAJIB DITIRU!) ===
✅ "Proses pengelolaan data penghuni di ${smartInput.instansi || 'kos tersebut'} saat ini masih menggunakan pencatatan manual dengan buku tulis. Kondisi ini menyebabkan berbagai kendala operasional seperti kesulitan pencarian data, risiko kehilangan catatan, dan keterlambatan pembuatan laporan. Berdasarkan observasi langsung yang dilakukan, pemilik kos membutuhkan waktu 15-20 menit untuk mencari data satu penghuni. Hal ini menunjukkan perlunya sistem yang lebih efisien, sebagaimana dikemukakan oleh Laudon (2020) bahwa sistem terkomputerisasi dapat meningkatkan kecepatan akses data hingga 80%."
➡️ Ini BENAR: 3 kalimat narasi sendiri + 1 kutipan pendukung

=== RASIO KETAT PER BAB ===
- BAB 1: Maksimal 3 kutipan, 90% narasi kondisi lapangan DAN HASIL OBSERVASI
- BAB 2: Maksimal 6 kutipan untuk teori, TAPI jelaskan dengan bahasa sendiri DAN hubungkan ke kasus
- BAB 3: Maksimal 3 kutipan metodologi, 90% adalah hasil observasi, wawancara, dan analisis sendiri
- BAB 4: Tidak perlu kutipan - murni kesimpulan dari analisis sendiri

=== HASIL OBSERVASI & WAWANCARA WAJIB ADA ===
Kutipan yang WAJIB muncul (bukan dari buku, tapi dari lapangan):
- "Berdasarkan observasi yang dilakukan di ${smartInput.instansi || 'lokasi objek'}..."
- "Dari hasil wawancara dengan ${smartInput.narasumber || 'narasumber'}, diketahui bahwa..."
- "Kondisi yang ditemukan di lapangan menunjukkan bahwa..."
- "Menurut keterangan ${smartInput.narasumber || 'narasumber'}, masalah utama adalah..."

Contoh hasil wawancara yang WAJIB dimasukkan:
1. "Dari wawancara dengan ${smartInput.narasumber || 'pemilik kos'}, diketahui bahwa proses pencatatan pembayaran masih dilakukan secara manual..."
2. "Berdasarkan observasi, ditemukan bahwa rata-rata waktu pencarian data penghuni adalah 15-20 menit..."
3. "Menurut ${smartInput.narasumber || 'pengelola'}, masalah terbesar adalah kesulitan dalam membuat laporan bulanan..."

=== KALIMAT OPINI PENULIS WAJIB ADA (SANGAT PENTING!) ===

Setiap BAB WAJIB ada minimal 3 kalimat opini penulis. Gunakan pola ini:

FRASA WAJIB DIPAKAI:
- "Penulis menilai bahwa..."
- "Menurut analisis penulis..."
- "Berdasarkan pengamatan penulis di lapangan..."
- "Penulis berpendapat bahwa..."
- "Dalam pandangan penulis..."
- "Penulis menyimpulkan bahwa..."

KONTEKS LOKAL WAJIB (sesuaikan dengan lokasi):
- "Dalam konteks ${smartInput.instansi || 'kos-kosan'} di ${smartInput.lokasi || 'daerah ini'}..."
- "Khususnya pada ${smartInput.instansi || 'objek perancangan'} yang menjadi fokus..."
- "Kondisi spesifik di ${smartInput.lokasi || 'lokasi perancangan'} menunjukkan..."
- "Hal ini relevan dengan keadaan di ${smartInput.instansi || 'lapangan'}..."

=== POLA TRANSISI KUTIPAN → OPINI (WAJIB!) ===

POLA BENAR:
1. Kutipan ahli
2. → Penjelasan dengan bahasa sendiri
3. → Hubungkan ke sistem yang dirancang
4. → Pendapat penulis

Contoh LENGKAP:
"Sistem informasi menurut Laudon (2020) adalah kumpulan komponen yang terintegrasi. [KUTIPAN]
Dengan kata lain, sistem ini mencakup proses input, pengolahan, dan output data. [PENJELASAN SENDIRI]
Dalam konteks ${smartInput.instansi || 'kos-kosan'} yang diteliti, komponen ini akan diterapkan untuk mengelola data penghuni dan pembayaran. [HUBUNGAN KE SISTEM]
Penulis menilai bahwa penerapan sistem informasi sangat relevan mengingat kondisi pengelolaan saat ini masih manual dan rentan kesalahan. [OPINI PENULIS]"

=== SENTUHAN MANUSIA - KALIMAT WAJIB ===

Sisipkan kalimat-kalimat ini untuk menghilangkan kesan "AI":

- "Hal ini menunjukkan bahwa pengelolaan ${smartInput.instansi || 'kos-kosan'} secara manual masih memiliki banyak keterbatasan, khususnya pada objek perancangan yang diamati penulis."

- "Berdasarkan kondisi tersebut, maka penulis menyimpulkan bahwa diperlukan solusi berbasis teknologi."

- "Fenomena ini penulis temukan langsung saat melakukan observasi di lokasi."

- "Dengan demikian, penulis merasa perlu untuk merancang sistem yang dapat mengatasi permasalahan tersebut."

=== TULIS PANJANG DAN DETAIL ===
- Setiap paragraf minimal 5-7 kalimat
- Setiap sub-bab minimal 6-10 paragraf (PANJANG!)
- Jelaskan dengan LENGKAP dan MENDALAM
- Dosen suka tulisan yang KOMPREHENSIF dan TIDAK SINGKAT
- TAPI jangan panjang dengan kutipan, panjang dengan ANALISIS DAN OPINI PENULIS!

=== BAB IV KESIMPULAN - MURNI PENDAPAT SENDIRI ===
Kesimpulan WAJIB menyebutkan:
1. Hasil analisis PIECES yang ditemukan (Performance: X, Information: Y, dst)
2. Fitur utama yang dirancang: ${smartInput.fitur || 'fitur sistem'}
3. Keunggulan sistem dibanding manual
4. JANGAN ada kutipan di BAB IV - ini murni kesimpulan mahasiswa

=== PENELITIAN TERDAHULU - HARUS ADA PERBANDINGAN ===
Format penelitian terdahulu WAJIB:
1. Judul & Penulis
2. Persamaan dengan perancangan ini
3. PERBEDAAN dengan perancangan ini (KRITIS!)
4. Kontribusi untuk perancangan ini

=== STRUKTUR OUTPUT JSON ===

{
  "bab1_par1_tekno": "Paragraf pengantar (6-7 kalimat) tentang perkembangan teknologi informasi di era digital. MULAI dengan observasi tentang kondisi saat ini, lalu jelaskan transformasi digital. HANYA 1 kutipan di akhir paragraf sebagai penguat. JANGAN mulai dengan 'Menurut...'!",
  
  "bab1_par2_topik": "Paragraf (6-7 kalimat) tentang pentingnya sistem informasi di bidang sesuai topik. JELASKAN dengan pendapat sendiri kenapa bidang ini butuh digitalisasi. Maksimal 1 kutipan di tengah atau akhir. JANGAN dominan kutipan!",
  
  "bab1_par3_objek": "Paragraf (7-8 kalimat) tentang objek perancangan di ${smartInput.instansi || 'lokasi terkait'}. WAJIB ada kalimat: 'Berdasarkan observasi yang dilakukan di ${smartInput.instansi || 'lokasi tersebut'}, ditemukan bahwa...'. Jelaskan kondisi SPESIFIK, masalah NYATA, dan dampaknya. TANPA KUTIPAN - ini murni deskripsi lapangan!",
  
  "bab1_par4_solusi": "Paragraf (6-7 kalimat) tentang solusi yang ditawarkan. Jelaskan sistem yang akan dirancang, fitur-fitur utama (${smartInput.fitur || 'fitur sistem'}), dan manfaat bagi pengguna. Ini MURNI pendapat perancang - TANPA KUTIPAN!",
  
  "bab1_par5_metode": "Paragraf (6-7 kalimat) tentang metode ${smartInput.metode}. Jelaskan ALASAN pemilihan metode dengan pendapat sendiri dulu, baru 1 kutipan sebagai penguat di akhir. Hubungkan ke kasus spesifik ${smartInput.judul}.",
  
  "bab1_par6_penutup": "Paragraf (5-6 kalimat) penutup BAB 1. TANPA KUTIPAN - murni harapan dan kontribusi perancangan dari sudut pandang mahasiswa.",

  "bab2_intro": "Paragraf pengantar (5-6 kalimat) BAB 2 Tinjauan Pustaka. TANPA KUTIPAN - jelaskan dengan bahasa sendiri teori apa saja yang akan dibahas dan relevansinya dengan ${smartInput.judul}.",
  
  "bab2_1_1_perancangan": "Teori PERANCANGAN (2 paragraf, total 10-12 kalimat): Jelaskan definisi dan tujuan perancangan dengan BAHASA SENDIRI dulu, baru 1 kutipan per paragraf sebagai penguat. JANGAN mulai dengan 'Menurut...'! Di akhir, HUBUNGKAN ke kenapa perancangan penting untuk ${smartInput.judul}.",
  
  "bab2_1_2_si": "Teori SISTEM INFORMASI (2 paragraf, total 10-12 kalimat): Jelaskan definisi SI, komponen, dan karakteristik dengan 60% BAHASA SENDIRI. Maksimal 2 kutipan total. Di akhir paragraf, HUBUNGKAN ke bagaimana SI akan membantu menyelesaikan masalah di ${smartInput.instansi || 'objek perancangan'}.",
  
  "bab2_1_3_objek_teori": "Teori tentang OBJEK STUDI yaitu ${smartInput.judul} (2 paragraf, total 10-12 kalimat): Jelaskan dengan PEMAHAMAN SENDIRI, lalu 1-2 kutipan sebagai penguat. WAJIB ada kalimat: 'Dalam konteks ${smartInput.instansi || 'objek perancangan'}, teori ini relevan karena...'",
  

  "bab2_1_4_uml_intro": "Pengantar UML (1 paragraf, 5-6 kalimat): Jelaskan definisi UML, sejarah singkat, dan pentingnya dalam perancangan sistem. Maksimal 1 kutipan. HUBUNGKAN ke kenapa UML dipilih untuk ${smartInput.judul}.",
  
  "bab2_1_4_usecase": "Teori USE CASE DIAGRAM (1 paragraf, 6-7 kalimat): Jelaskan definisi dan komponen dengan bahasa sendiri. 1 kutipan maksimal. Contohkan: 'Pada sistem ${smartInput.judul}, use case diagram akan menggambarkan interaksi antara...'",
  
  "bab2_1_4_activity": "Teori ACTIVITY DIAGRAM (1 paragraf, 6-7 kalimat): Jelaskan definisi dan simbol-simbol dengan bahasa sendiri. 1 kutipan maksimal. Contohkan: 'Pada perancangan ${smartInput.judul}, activity diagram akan digunakan untuk...'",
  
  "bab2_1_4_class": "Teori CLASS DIAGRAM (1 paragraf, 6-7 kalimat): Jelaskan definisi dan komponen dengan bahasa sendiri. 1 kutipan maksimal. Contohkan: 'Dalam ${smartInput.judul}, class diagram akan merepresentasikan entitas seperti...'",
  
  "uml_usecase_diagram": "[INSTRUKSI WAJIB - BUAT USE CASE DIAGRAM KHUSUS]\\n\\nBuat USE CASE DIAGRAM dalam Mermaid flowchart LR untuk: ${smartInput.judul}\\n\\nDESKRIPSI SISTEM USER:\\n${smartInput.deskripsiSistem || 'Tidak ada deskripsi detail'}\\n\\nGunakan PERSIS fitur yang disebutkan: ${smartInput.fitur || 'CRUD dasar'}\\nAktor sesuai pengguna: ${smartInput.pengguna || 'User dan Admin'}\\n\\nWAJIB:\\n- Minimal 8 use case dari fitur yang disebut user\\n- Aktor sesuai role yang user sebutkan\\n- JANGAN pakai use case generik, pakai yang SPESIFIK dari deskripsi\\n\\nFormat Mermaid:\\nflowchart LR\\n    subgraph Sistem[${smartInput.judul || 'Sistem'}]\\n        UC1((Fitur Dari Deskripsi))\\n    end\\n    User([User]) --> UC1",
  
  "uml_activity_diagram": "[INSTRUKSI WAJIB - BUAT ACTIVITY DIAGRAM KHUSUS]\\n\\nBuat ACTIVITY DIAGRAM Mermaid flowchart TD untuk proses utama: ${smartInput.judul}\\n\\nDESKRIPSI SISTEM USER:\\n${smartInput.deskripsiSistem || 'Tidak ada deskripsi detail'}\\n\\nMasalah: ${smartInput.masalah}\\nSolusi: ${smartInput.solusi}\\nFitur: ${smartInput.fitur || 'fitur dasar'}\\n\\nWAJIB:\\n- Alur proses SESUAI dengan fitur yang user sebutkan\\n- Minimal 15 node\\n- Decision points realistis\\n\\nFormat Mermaid:\\nflowchart TD\\n    A((Start)) --> B[Proses Sesuai Fitur]\\n    B --> C{Keputusan}",
  
  "uml_class_diagram": "[INSTRUKSI WAJIB - BUAT CLASS DIAGRAM KHUSUS]\\n\\nBuat CLASS DIAGRAM Mermaid classDiagram untuk: ${smartInput.judul}\\n\\nDESKRIPSI SISTEM USER:\\n${smartInput.deskripsiSistem || 'Tidak ada deskripsi detail'}\\n\\nFitur sistem: ${smartInput.fitur || 'CRUD dasar'}\\nDatabase yang disebut: lihat di deskripsi di atas\\n\\nWAJIB:\\n- Class/entitas SESUAI dengan database yang user sebutkan di deskripsi\\n- Minimal 5 class dengan atribut dan method lengkap\\n- Relationship yang tepat (||--o{, }|--|{)\\n\\nFormat Mermaid:\\nclassDiagram\\n    class NamaSesuaiDeskripsi {\\n        +id : int\\n        +atributDariDeskripsi : string\\n        +method()\\n    }",
  
  "bab2_1_5_metode_pengembangan": "Teori METODE ${smartInput.metode.toUpperCase()} (2 paragraf, total 10-12 kalimat): definisi lengkap, sejarah, tahapan-tahapan detail, kelebihan dan kekurangan, kapan metode ini cocok digunakan. WAJIB 3 kutipan.",
  
  "bab2_2_pembahasan_objek": "Profil lengkap objek perancangan (2 paragraf, total 8-10 kalimat): sejarah berdirinya, visi dan misi, struktur organisasi, proses bisnis yang berjalan saat ini, dan alur kerja manual yang masih digunakan.",
  
  "bab2_3_penelitian_terdahulu": "PENELITIAN TERDAHULU dengan TABEL PERBANDINGAN (3 penelitian, maks 5 tahun terakhir):\\n\\nFormat WAJIB untuk setiap penelitian:\\n\\n1. [Nama Peneliti] ([Tahun 2020-2024])\\n   Judul: [Judul Lengkap Penelitian]\\n   Ringkasan: [Deskripsi singkat 2-3 kalimat tentang penelitian]\\n   \\n   PERSAMAAN dengan perancangan ini:\\n   - [Sebutkan 2-3 persamaan]\\n   \\n   PERBEDAAN dengan perancangan ini:\\n   - [Sebutkan 2-3 perbedaan KRITIS]\\n   \\n   KONTRIBUSI untuk perancangan ini:\\n   - [Apa yang bisa diambil dari penelitian ini]\\n\\n2. [Penelitian kedua dengan format sama]\\n\\n3. [Penelitian ketiga dengan format sama]\\n\\nPENTING: WAJIB tahun 2020-2024. WAJIB ada perbandingan persamaan/perbedaan. JANGAN hanya deskripsi tanpa perbandingan!",
  
  "bab2_4_tahapan": "Tahapan perancangan (1 paragraf, 6-8 kalimat): jelaskan secara detail 6 tahapan yang akan dilakukan: (1) Pengumpulan Data melalui observasi dan wawancara, (2) Analisis Sistem Berjalan, (3) Identifikasi Kebutuhan, (4) Perancangan Sistem dengan UML, (5) Implementasi/Coding, (6) Pengujian dan Dokumentasi.",

  "bab3_1_1_analisis_masalah": "Analisis masalah menggunakan METODE PIECES (2 paragraf, total 10-12 kalimat). Jelaskan setiap aspek SPESIFIK ke konteks ${smartInput.instansi || 'sistem'}:\\n- Performance: kecepatan dan volume proses SPESIFIK\\n- Information: akurasi dan relevansi informasi\\n- Economics: biaya dan keuntungan KONKRET\\n- Control: keamanan dan kontrol akses\\n- Efficiency: penggunaan sumber daya\\n- Service: layanan kepada ${smartInput.pengguna || 'pengguna'}\\nWAJIB 1 kutipan untuk metode PIECES.",
  
  "bab3_1_2_metode_pengumpulan": "Metode pengumpulan data (1 paragraf, 6-8 kalimat). GUNAKAN ISTILAH 'PERANCANGAN' BUKAN 'PENELITIAN':\\n1. OBSERVASI: dilakukan di ${smartInput.instansi || 'lokasi objek'}, mengamati ${smartInput.observasi || 'proses bisnis yang berjalan'}, hasil yang diperoleh\\n2. WAWANCARA: narasumber adalah ${smartInput.narasumber || 'pengelola dan pengguna'}, jumlah pertanyaan 10-15, informasi yang digali tentang permasalahan dan kebutuhan\\n3. STUDI PUSTAKA: referensi dari buku, jurnal, dan skripsi terdahulu (2019-2024)\\nWAJIB 1 kutipan untuk metodologi. KONSISTEN gunakan narasumber yang sama di seluruh dokumen.",
  
  "bab3_2_1_flowchart_desc": "Deskripsi FLOWCHART sistem (2 paragraf): jelaskan alur sistem ${smartInput.judul} sesuai DESKRIPSI USER berikut:\\n${smartInput.deskripsiSistem || smartInput.solusi}\\nPisahkan penjelasan untuk USER dan ADMIN berdasarkan role yang user sebutkan.",
  
  "bab3_2_1_flowchart_user": "[INSTRUKSI WAJIB - BUAT FLOWCHART USER]\\n\\nBuat flowchart Mermaid untuk ALUR USER dalam: ${smartInput.judul}\\n\\nDESKRIPSI SISTEM USER:\\n${smartInput.deskripsiSistem || 'Tidak ada deskripsi'}\\n\\nFitur untuk user: ${smartInput.fitur || 'lihat data, akses sistem'}\\nSolusi: ${smartInput.solusi}\\n\\nALUR HARUS SESUAI dengan fitur yang user sebutkan di deskripsi.\\nMinimal 12 node dengan decision points.\\n\\nFormat Mermaid:\\nflowchart TD\\n    A[Mulai] --> B[Proses Sesuai Fitur User]",
  
  "bab3_2_1_flowchart_admin": "[INSTRUKSI WAJIB - BUAT FLOWCHART ADMIN]\\n\\nBuat flowchart Mermaid untuk ALUR ADMIN dalam: ${smartInput.judul}\\n\\nDESKRIPSI SISTEM USER:\\n${smartInput.deskripsiSistem || 'Tidak ada deskripsi'}\\n\\nFitur admin: ${smartInput.fitur || 'kelola data, laporan'}\\nMasalah yang diselesaikan: ${smartInput.masalah}\\n\\nALUR HARUS SESUAI dengan fitur admin yang user sebutkan.\\nMinimal 15 node dengan CRUD operations.\\n\\nFormat Mermaid:\\nflowchart TD\\n    A[Mulai] --> B[Admin Action Sesuai Fitur]",
  
  "erd_desc": "Deskripsi ERD (1 paragraf): jelaskan struktur database ${smartInput.judul} berdasarkan DESKRIPSI USER:\\n${smartInput.deskripsiSistem || 'Tidak ada deskripsi'}\\n\\nJelaskan tabel-tabel yang SESUAI dengan database yang user sebutkan di deskripsi, serta relasi antar tabel.",
  
  "erd_diagram": "[INSTRUKSI WAJIB - BUAT ERD KHUSUS]\\n\\nBuat ERD Mermaid erDiagram untuk: ${smartInput.judul}\\n\\nDESKRIPSI SISTEM USER (IKUTI INI!):\\n${smartInput.deskripsiSistem || 'Tidak ada deskripsi'}\\n\\nFitur: ${smartInput.fitur || 'kelola data'}\\n\\nWAJIB:\\n- Tabel/entitas SESUAI dengan database yang user sebutkan di deskripsi\\n- Jika user sebut 'Data penghuni, kamar, pembayaran' maka buat tabel PENGHUNI, KAMAR, PEMBAYARAN\\n- Minimal 5 tabel dengan atribut LENGKAP\\n- Relasi sebelum entitas\\n\\nFormat Mermaid:\\nerDiagram\\n    TABEL_DARI_DESKRIPSI ||--o{ TABEL_LAIN : relasi\\n    TABEL_DARI_DESKRIPSI {\\n        int id PK\\n        string atribut_sesuai_deskripsi\\n    }",
  
  "bab3_2_2_fungsional": "KEBUTUHAN FUNGSIONAL sistem (minimal 10 item dengan penjelasan):\\n1. Sistem dapat mengelola data [sesuai topik] - [penjelasan]\\n2. Sistem dapat melakukan pencarian data - [penjelasan]\\n3. Sistem dapat menampilkan laporan - [penjelasan]\\n4. Sistem dapat mengelola user/pengguna - [penjelasan]\\n5. dst...\\nWAJIB 1 kutipan tentang kebutuhan fungsional.",
  
  "bab3_2_2_non_fungsional": "KEBUTUHAN NON-FUNGSIONAL (dengan penjelasan):\\n1. Usability: sistem mudah digunakan oleh pengguna awam\\n2. Reliability: sistem dapat diandalkan dan minim error\\n3. Performance: waktu respon maksimal X detik\\n4. Security: autentikasi dan otorisasi pengguna\\n5. Portability: dapat diakses dari berbagai perangkat\\n6. Maintainability: kemudahan dalam pemeliharaan sistem",
  
  "bab3_2_2_hardware": "Spesifikasi HARDWARE (dalam format list):\\nSERVER: Processor Intel Core i5/Ryzen 5 atau lebih tinggi, RAM minimal 8GB, Storage SSD 256GB, Koneksi internet stabil\\nCLIENT: Processor Intel Core i3/Ryzen 3 atau lebih tinggi, RAM minimal 4GB, Monitor resolusi 1366x768, Mouse dan keyboard",
  
  "bab3_2_2_software": "Spesifikasi SOFTWARE (dalam format list):\\nSERVER: OS Windows 10/11 atau Linux Ubuntu, Web Server Apache/Nginx, Database MySQL/MariaDB, PHP 8.0+, Framework Laravel/CodeIgniter\\nCLIENT: Browser Google Chrome/Mozilla Firefox/Microsoft Edge versi terbaru",

  "bab4_1_kesimpulan": "KESIMPULAN SPESIFIK (1 paragraf, 6-7 kalimat dengan 5 poin utama). JANGAN GENERIK, harus merujuk hasil analisis:\\n1. Perancangan ${smartInput.judul || 'sistem informasi'} telah berhasil dirancang menggunakan metodologi ${smartInput.metode}\\n2. Berdasarkan analisis PIECES ditemukan permasalahan: ${smartInput.masalah || '[sebutkan spesifik]'}\\n3. Sistem dirancang dengan fitur utama: ${smartInput.fitur || '[sebutkan fitur spesifik]'}\\n4. Perancangan menggunakan diagram UML (use case, activity, class, erd) untuk memodelkan sistem\\n5. Wawancara dengan ${smartInput.narasumber || 'narasumber'} memberikan masukan penting untuk kebutuhan sistem",
  
  "bab4_2_saran": "SARAN SPESIFIK (1 paragraf, 5-6 kalimat dengan 4 poin):\\n1. Disarankan untuk mengembangkan fitur notifikasi/reminder sesuai kebutuhan ${smartInput.pengguna || 'pengguna'}\\n2. Perlu dilakukan backup database secara berkala untuk menjaga keamanan data\\n3. Diperlukan pelatihan kepada ${smartInput.pengguna || 'pengguna'} agar sistem dapat dimanfaatkan secara maksimal\\n4. Pengembangan selanjutnya dapat berupa aplikasi mobile atau integrasi dengan platform lain",

  "daftar_pustaka": "DAFTAR PUSTAKA\\n(Semua referensi dari Google Scholar dengan link yang bisa diverifikasi)\\n\\n[INSTRUKSI: Daftar pustaka sudah diisi otomatis dari Google Scholar. JANGAN tambahkan buku tanpa link. Semua referensi harus ada URL-nya agar dosen bisa mengecek.]",
  
  "lampiran_draf_wawancara": "DRAF PERTANYAAN WAWANCARA (15 pertanyaan):\\n\\nIdentitas Narasumber:\\nNama: _______________\\nJabatan: _______________\\nTanggal: _______________\\n\\nPertanyaan:\\n1. Bagaimana sistem pengelolaan [topik] yang berjalan saat ini?\\n2. Berapa lama waktu yang dibutuhkan untuk [proses terkait]?\\n3. Apa saja kendala yang sering dihadapi dalam [proses]?\\n4. Bagaimana cara pencatatan data saat ini (manual/digital)?\\n5. Siapa saja yang terlibat dalam proses [topik]?\\n6. Berapa volume data yang dikelola per bulan?\\n7. Pernahkah terjadi kehilangan data? Bagaimana dampaknya?\\n8. Fitur apa saja yang Anda harapkan dari sistem baru?\\n9. Apakah Anda familiar dengan sistem berbasis komputer?\\n10. Bagaimana proses pelaporan saat ini?\\n11. Apa saja data yang perlu dikelola dalam sistem?\\n12. Siapa yang berwenang mengakses data-data tersebut?\\n13. Apakah perlu adanya notifikasi/pengingat dalam sistem?\\n14. Bagaimana harapan Anda terhadap sistem yang akan dikembangkan?\\n15. Apakah ada saran tambahan untuk pengembangan sistem?",
  
  "lampiran_hasil_wawancara": "TEMPLATE HASIL WAWANCARA:\\n\\nHasil Wawancara\\n\\nNarasumber: [Nama Lengkap]\\nJabatan: [Jabatan di Instansi]\\nTanggal: [DD/MM/YYYY]\\nWaktu: [HH:MM - HH:MM WIB]\\nTempat: [Lokasi Wawancara]\\nPewawancara: [Nama Mahasiswa]\\n\\nHasil:\\n\\n1. P: Bagaimana sistem pengelolaan [topik] yang berjalan saat ini?\\n   J: [Jawaban narasumber akan diisi setelah wawancara]\\n\\n2. P: [Pertanyaan]\\n   J: [Jawaban]\\n\\n[dst...]\\n\\nKesimpulan Wawancara:\\n[Rangkuman poin-poin penting dari hasil wawancara]",
  
  "lampiran_dokumentasi": "DOKUMENTASI PERANCANGAN:\\n\\n1. Foto Lokasi Objek Perancangan\\n   - Foto tampak depan gedung/institusi\\n   - Foto ruang kerja yang terkait dengan sistem\\n\\n2. Foto Kegiatan Observasi\\n   - Foto proses kerja yang sedang berjalan\\n   - Foto dokumen/formulir yang digunakan saat ini\\n\\n3. Foto Kegiatan Wawancara\\n   - Foto bersama narasumber (dengan izin)\\n   - Foto proses wawancara berlangsung\\n\\n4. Screenshot Sistem (jika sudah ada implementasi)\\n   - Halaman login\\n   - Halaman dashboard\\n   - Halaman utama sistem\\n\\n[Catatan: Dokumentasi akan dilampirkan setelah kegiatan lapangan dilaksanakan]",
  
  "lampiran_surat": "SURAT IZIN OBSERVASI/PERANCANGAN\\n\\n[KOP SURAT INSTITUSI PENDIDIKAN]\\n\\nNomor: [Akan diisi oleh TU]\\nLampiran: -\\nPerihal: Permohonan Izin Observasi/Perancangan\\n\\nKepada Yth.\\nPimpinan ${smartInput.instansi || '[Nama Instansi]'}\\ndi Tempat\\n\\nDengan hormat,\\n\\nSehubungan dengan penyusunan Tugas Akhir/Skripsi mahasiswa kami:\\n\\nNama: [Nama Mahasiswa]\\nNIM: [NIM]\\nProgram Studi: [Prodi]\\nJudul: ${smartInput.judul || '[Judul Perancangan]'}\\n\\nDengan ini kami mohon izin untuk melakukan kegiatan observasi dan pengumpulan data di instansi yang Bapak/Ibu pimpin. Kegiatan ini akan dilaksanakan pada:\\n\\nWaktu: [Tanggal Mulai] s.d. [Tanggal Selesai]\\nKegiatan: Observasi, Wawancara, dan Pengumpulan Data\\n\\nDemikian surat permohonan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.\\n\\n[Kota], [Tanggal]\\nKetua Program Studi,\\n\\n\\n[Nama Kaprodi]\\nNIP. [NIP]"
}

PENTING: 
1. Kembalikan HANYA JSON valid tanpa markdown code block
2. Isi setiap field dengan konten LENGKAP, DETAIL, dan BERKUALITAS TINGGI
3. Pastikan SEMUA kutipan memiliki nama penulis dan tahun yang jelas
4. Daftar pustaka WAJIB minimal 15 referensi dengan URL yang bisa diakses`;

    // Use ONLY the selected provider - NO FALLBACK
    try {
      // ========== GROQ PROVIDER ==========
      if (aiProvider === 'groq') {
        if (!groqKey) {
          setError('❌ Groq API Key belum diisi. Buka Settings untuk memasukkan API key.');
          setIsGenerating(false);
          return;
        }

        setLoadingText('🚀 [50%] Menghubungkan ke Groq AI (Llama 3.3)...');
        setGenerateProgress(50);

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 8000
          })
        });

        if (!res.ok) {
          const errorData = await res.text();
          console.error('Groq error:', res.status, errorData);
          setError(`❌ Groq Error (${res.status}): ${errorData.substring(0, 100)}. Cek API key di Settings.`);
          setIsGenerating(false);
          return;
        }

        setLoadingText('📝 [75%] Memproses respons Groq...');
        setGenerateProgress(75);
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;

        if (text) {
          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            setLoadingText('✅ [100%] Selesai!');
            setGenerateProgress(100);
            const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
            setFormData(prev => ({ ...prev, ...parsed, judul: smartInput.judul, instansi: smartInput.instansi }));
            setShowPreview(true);
            setIsGenerating(false);
            return;
          }
        }
        setError('❌ Groq tidak mengembalikan respons valid. Coba lagi.');
        setIsGenerating(false);
        return;
      }

      // ========== GEMINI PROVIDER ==========
      if (aiProvider === 'gemini') {
        if (!apiKey) {
          setError('❌ Gemini API Key belum diisi. Buka Settings untuk memasukkan API key.');
          setIsGenerating(false);
          return;
        }

        const geminiKeys = apiKey.split('\n').map(k => k.trim()).filter(k => k.startsWith('AIza'));

        if (geminiKeys.length === 0) {
          setError('❌ Gemini API Key tidak valid. Key harus dimulai dengan "AIza..."');
          setIsGenerating(false);
          return;
        }

        for (let i = 0; i < geminiKeys.length; i++) {
          setLoadingText(`✨ [50%] Mencoba Gemini Key ${i + 1}/${geminiKeys.length}...`);
          setGenerateProgress(50);

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKeys[i]}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
              })
            }
          );

          if (res.ok) {
            setLoadingText('📝 [75%] Memproses respons Gemini...');
            setGenerateProgress(75);
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              setLoadingText('✅ [100%] Selesai!');
              setGenerateProgress(100);
              const parsed = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
              setFormData(prev => ({ ...prev, ...parsed, judul: smartInput.judul, instansi: smartInput.instansi }));
              setShowPreview(true);
              setIsGenerating(false);
              return;
            }
          } else {
            console.warn(`Gemini key ${i + 1} failed:`, res.status);
          }
        }
        setError('❌ Semua Gemini API Key gagal. Cek API key di Settings.');
        setIsGenerating(false);
        return;
      }

      // ========== CLAUDE PROVIDER (200K context) ==========
      if (aiProvider === 'claude') {
        if (!claudeKey) {
          setError('❌ Claude API Key belum diisi. Buka Settings untuk memasukkan API key.');
          setIsGenerating(false);
          return;
        }

        setLoadingText('🟣 [50%] Menghubungkan ke Claude AI (200K context)...');
        setGenerateProgress(50);

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 8000,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (!res.ok) {
          const errorData = await res.text();
          console.error('Claude error:', res.status, errorData);
          setError(`❌ Claude Error (${res.status}): ${errorData.substring(0, 100)}. Cek API key di Settings.`);
          setIsGenerating(false);
          return;
        }

        setLoadingText('📝 [75%] Memproses respons Claude...');
        setGenerateProgress(75);
        const data = await res.json();
        const text = data.content?.[0]?.text;

        if (text) {
          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            setLoadingText('✅ [100%] Selesai!');
            setGenerateProgress(100);
            const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
            setFormData(prev => ({ ...prev, ...parsed, judul: smartInput.judul, instansi: smartInput.instansi }));
            setShowPreview(true);
            setIsGenerating(false);
            return;
          }
        }
        setError('❌ Claude tidak mengembalikan respons valid. Coba lagi.');
        setIsGenerating(false);
        return;
      }

      // ========== DEEPSEEK PROVIDER via OpenRouter (CORS supported) ==========
      if (aiProvider === 'deepseek') {
        if (!deepseekKey) {
          setError('❌ OpenRouter API Key belum diisi. Buka Settings untuk memasukkan API key.');
          setIsGenerating(false);
          return;
        }

        setLoadingText('🔵 [50%] Menghubungkan ke DeepSeek via OpenRouter...');
        setGenerateProgress(50);

        // Use OpenRouter which supports CORS for browser access
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${deepseekKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Proposal Generator'
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 16000  // Increased for complete response
          })
        });

        if (!res.ok) {
          const errorData = await res.text();
          console.error('DeepSeek/OpenRouter error:', res.status, errorData);
          setError(`❌ OpenRouter Error (${res.status}): ${errorData.substring(0, 150)}. Cek API key di Settings.`);
          setIsGenerating(false);
          return;
        }

        setLoadingText('📝 [75%] Memproses respons DeepSeek...');
        setGenerateProgress(75);
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;

        if (text) {
          try {
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              let jsonStr = text.substring(jsonStart, jsonEnd + 1);

              // Try to fix common JSON issues
              jsonStr = jsonStr.replace(/[\u0000-\u001F]+/g, ' '); // Remove control characters
              jsonStr = jsonStr.replace(/,\s*}/g, '}'); // Remove trailing commas
              jsonStr = jsonStr.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

              setLoadingText('✅ [100%] Selesai!');
              setGenerateProgress(100);
              const parsed = JSON.parse(jsonStr);
              setFormData(prev => ({ ...prev, ...parsed, judul: smartInput.judul, instansi: smartInput.instansi }));
              setShowPreview(true);
              setIsGenerating(false);
              return;
            }
          } catch (parseErr) {
            console.error('JSON Parse error:', parseErr);
            // Try to salvage partial response
            setError(`❌ Respons AI terpotong. Coba generate ulang atau kurangi detail deskripsi sistem.`);
            setIsGenerating(false);
            return;
          }
        }
        setError('❌ DeepSeek tidak mengembalikan respons valid. Coba lagi.');
        setIsGenerating(false);
        return;
      }

      // No provider selected
      setError('❌ Pilih AI Provider di Settings terlebih dahulu.');
      setIsGenerating(false);

    } catch (err) {
      console.error('Generate error:', err);
      setError(`❌ Error: ${err.message}. Cek koneksi internet.`);
      setIsGenerating(false);
    }
  };

  // Validation function
  const validateBeforeExport = () => {
    const requiredFields = [
      { name: 'Judul', value: formData.judul },
      { name: 'BAB 1 - Paragraf 1', value: formData.bab1_par1_tekno },
      { name: 'BAB 1 - Paragraf 2', value: formData.bab1_par2_topik },
      { name: 'BAB 2 - Intro', value: formData.bab2_intro },
      { name: 'BAB 3 - Analisis Masalah', value: formData.bab3_1_1_analisis_masalah },
      { name: 'BAB 4 - Kesimpulan', value: formData.bab4_1_kesimpulan },
      { name: 'Daftar Pustaka', value: formData.daftar_pustaka }
    ];

    const emptyFields = requiredFields.filter(f => !f.value || f.value.trim().length < 10);

    if (emptyFields.length > 0) {
      const fieldNames = emptyFields.map(f => f.name).join(', ');
      const confirm = window.confirm(`⚠️ Beberapa field masih kosong atau terlalu pendek:\n\n${fieldNames}\n\nLanjutkan export?`);
      return confirm;
    }
    return true;
  };

  const exportToDocx = async () => {
    if (!validateBeforeExport()) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: formData.judul || 'PROPOSAL', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'PROPOSAL PERANCANGAN SISTEM', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Disusun Oleh: ${formData.penulis || '[NAMA]'}`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: formData.nim ? `NIM: ${formData.nim}` : '', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: formData.instansi || '[INSTANSI]', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: formData.tahun, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '', pageBreakBefore: true }),
          new Paragraph({ text: 'BAB 1 - PENDAHULUAN', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: formData.bab1_par1_tekno, spacing: { after: 200 } }),
          new Paragraph({ text: formData.bab1_par2_topik, spacing: { after: 200 } }),
          new Paragraph({ text: formData.bab1_par3_objek, spacing: { after: 200 } }),
          new Paragraph({ text: formData.bab1_par4_solusi, spacing: { after: 200 } }),
          new Paragraph({ text: formData.bab1_par5_metode, spacing: { after: 200 } }),
          new Paragraph({ text: formData.bab1_par6_penutup, spacing: { after: 200 } }),
          new Paragraph({ text: '', pageBreakBefore: true }),
          new Paragraph({ text: 'BAB 2 - TINJAUAN PUSTAKA', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: formData.bab2_intro, spacing: { after: 200 } }),
          new Paragraph({ text: '2.1 Perancangan', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: formData.bab2_1_1_perancangan, spacing: { after: 200 } }),
          new Paragraph({ text: '2.2 Sistem Informasi', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: formData.bab2_1_2_si, spacing: { after: 200 } }),
          new Paragraph({ text: '', pageBreakBefore: true }),
          new Paragraph({ text: 'BAB 3 - HASIL DAN PERANCANGAN', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: '3.1 Analisis Masalah', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: formData.bab3_1_1_analisis_masalah, spacing: { after: 200 } }),
          new Paragraph({ text: '3.2 Kebutuhan Fungsional', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: formData.bab3_2_2_fungsional, spacing: { after: 200 } }),
          new Paragraph({ text: '', pageBreakBefore: true }),
          new Paragraph({ text: 'BAB 4 - KESIMPULAN DAN SARAN', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: '4.1 Kesimpulan', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: formData.bab4_1_kesimpulan, spacing: { after: 200 } }),
          new Paragraph({ text: '4.2 Saran', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: formData.bab4_2_saran, spacing: { after: 200 } }),
          new Paragraph({ text: '', pageBreakBefore: true }),
          new Paragraph({ text: 'DAFTAR PUSTAKA', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: formData.daftar_pustaka }),
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `proposal_${formData.judul?.slice(0, 30) || 'dokumen'}.docx`);
  };

  // Export to PDF (optimized for large documents)
  const exportToPdf = async () => {
    if (!validateBeforeExport()) return;

    const element = document.getElementById('document-preview');
    if (!element) {
      alert('Buka Preview terlebih dahulu!');
      return;
    }

    // Show loading state
    const originalText = element.innerHTML;
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = '<p style="text-align:center;padding:20px;">⏳ Membuat PDF, mohon tunggu...</p>';

    try {
      // Use lower quality settings to prevent lag
      const opt = {
        margin: 10,
        filename: `proposal_${formData.judul?.slice(0, 30) || 'dokumen'}.pdf`,
        image: { type: 'jpeg', quality: 0.8 },
        html2canvas: { scale: 1, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Process async
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Gagal export PDF. Coba lagi.');
    }
  };

  // Schedule management - Add row
  const addScheduleRow = () => {
    const newId = Math.max(...schedule.map(s => s.id), 0) + 1;
    setSchedule([...schedule, { id: newId, activity: 'Kegiatan Baru', m1: false, m2: false, m3: false, m4: false }]);
  };

  // Schedule management - Remove row
  const removeScheduleRow = (id) => {
    if (schedule.length > 1) {
      setSchedule(schedule.filter(s => s.id !== id));
    }
  };

  // Schedule management - Update activity name
  const updateScheduleActivity = (id, newActivity) => {
    setSchedule(schedule.map(s => s.id === id ? { ...s, activity: newActivity } : s));
  };

  // History - Save current proposal to history
  const saveToHistory = () => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('id-ID'),
      judul: smartInput.judul || 'Tanpa Judul',
      formData: { ...formData },
      smartInput: { ...smartInput },
      schedule: [...schedule]
    };
    const newHistory = [newEntry, ...history].slice(0, 10); // Keep only 10 latest
    setHistory(newHistory);
    localStorage.setItem(HISTORY_STORAGE, JSON.stringify(newHistory));
    alert('Proposal tersimpan ke riwayat!');
  };

  // History - Load from history
  const loadFromHistory = (entry) => {
    setFormData(entry.formData);
    setSmartInput(entry.smartInput);
    setSchedule(entry.schedule);
    setShowHistory(false);
    alert('Proposal dimuat dari riwayat!');
  };

  // History - Delete from history
  const deleteFromHistory = (id) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem(HISTORY_STORAGE, JSON.stringify(newHistory));
  };

  const getProgress = () => {
    const fields = [formData.bab1_par1_tekno, formData.bab2_intro, formData.bab3_1_1_analisis_masalah, formData.bab4_1_kesimpulan, formData.daftar_pustaka];
    return Math.round((fields.filter(f => f && f.length > 10).length / fields.length) * 100);
  };

  const steps = [
    { title: 'AI Generator', icon: <BrainCircuit size={18} /> },
    { title: 'Bab 1: Pendahuluan', icon: <FileText size={18} /> },
    { title: 'Bab 2: Tinjauan Pustaka', icon: <Book size={18} /> },
    { title: 'Bab 3: Hasil & Perancangan', icon: <Layout size={18} /> },
    { title: 'Bab 4: Penutup', icon: <CheckSquare size={18} /> },
    { title: 'Lampiran & Pustaka', icon: <FolderOpen size={18} /> },
  ];

  const bgMain = darkMode ? 'bg-slate-900' : 'bg-slate-100';
  const bgCard = darkMode ? 'bg-slate-800' : 'bg-white';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className={`flex h-screen ${bgMain} font-sans ${textMain} overflow-hidden print:bg-white`}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Hidden on mobile, shown as overlay when mobileMenuOpen */}
      <div className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 md:z-auto w-64 h-full ${bgCard} border-r ${borderColor} flex-shrink-0 flex flex-col print:hidden transition-transform duration-300 ease-in-out`}>
        <div className={`p-6 border-b ${borderColor} flex justify-between items-center`}>
          <div>
            <h1 className="text-xl font-bold text-blue-500 flex items-center gap-2">
              <PenTool className="h-6 w-6" /> ProposalReal
            </h1>
            <p className={`text-xs ${textMuted} mt-1`}>AI-Powered Proposal Generator</p>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-3">
          <div className="flex justify-between text-xs mb-1">
            <span className={textMuted}>Progress</span>
            <span className="text-blue-500 font-bold">{getProgress()}%</span>
          </div>
          <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" style={{ width: `${getProgress()}%` }} />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {steps.map((step, index) => (
            <button key={index} onClick={() => { setActiveStep(index); setShowPreview(false); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeStep === index && !showPreview
                ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                : `${textMuted} hover:bg-slate-500/10`
                }`}>
              {step.icon}
              <span className="truncate">{step.title}</span>
            </button>
          ))}

          <div className={`pt-4 mt-4 border-t ${borderColor} space-y-2`}>
            <button onClick={() => { setShowPreview(true); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${showPreview ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : `${textMuted} hover:bg-slate-500/10`
                }`}>
              <FileText size={18} /> Preview Dokumen
            </button>
            <button onClick={saveToJSON} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${textMuted} hover:bg-slate-500/10 rounded-lg`}>
              <Save size={18} /> Simpan Draft
            </button>
            <label className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${textMuted} hover:bg-slate-500/10 rounded-lg cursor-pointer`}>
              <Upload size={18} /> Buka Draft
              <input type="file" accept=".json" onChange={loadFromJSON} className="hidden" />
            </label>
            {saveStatus && <p className="text-xs text-emerald-500 text-center">{saveStatus}</p>}
          </div>
        </nav>

        {/* Auto-save indicator */}
        {autoSaveIndicator && (
          <div className={`px-4 py-2 text-xs ${textMuted} flex items-center gap-2`}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-dot" />
            Auto-saved
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden print:h-auto print:overflow-visible">
        <header className={`h-14 md:h-16 ${bgCard} border-b ${borderColor} flex items-center justify-between px-4 md:px-8 shadow-sm z-10 print:hidden`}>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 -ml-2" onClick={() => setMobileMenuOpen(true)}>
              <Layout size={20} />
            </button>
            <h2 className="text-sm md:text-lg font-semibold truncate">{showPreview ? 'Preview' : steps[activeStep].title}</h2>
            {!showPreview && (
              <button onClick={() => setSplitView(!splitView)} className={`hidden lg:flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${splitView ? 'bg-blue-600 text-white' : `${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}`}>
                <Columns size={14} /> {splitView ? 'Split ON' : 'Split OFF'}
              </button>
            )}
          </div>
          <div className="flex gap-1 md:gap-2 items-center">
            {showPreview && (
              <>
                <button onClick={exportToDocx} className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs md:text-sm font-medium">
                  <FileDown size={16} /> <span className="hidden sm:inline">DOCX</span>
                </button>
                <button onClick={exportToPdf} className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs md:text-sm font-medium">
                  <FileType size={16} /> <span className="hidden sm:inline">PDF</span>
                </button>
                <button onClick={() => window.print()} className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm font-medium">
                  <Printer size={16} /> Print
                </button>
                <button onClick={() => setShowPreview(false)} className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded-lg text-xs md:text-sm font-medium`}>
                  <RotateCcw size={16} /> <span className="hidden sm:inline">Edit</span>
                </button>
              </>
            )}
            <button onClick={saveToHistory} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`} title="Simpan ke Riwayat">
              <Save size={18} className="md:w-5 md:h-5" />
            </button>
            <button onClick={() => setShowHistory(true)} className={`hidden sm:block p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`} title="Riwayat Generate">
              <History size={18} className="md:w-5 md:h-5" />
            </button>
            <button onClick={() => setShowSettings(true)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
              <Settings size={18} className="md:w-5 md:h-5" />
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
              {darkMode ? <Sun size={18} className="md:w-5 md:h-5" /> : <Moon size={18} className="md:w-5 md:h-5" />}
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${bgMain} print:p-0 print:bg-white`}>
          {showPreview ? (
            <div className="relative h-full flex overflow-hidden">
              <div className="flex-1 overflow-y-auto scroll-smooth h-full bg-slate-900/5 dark:bg-black/20 pb-20">
                <div className="max-w-6xl mx-auto flex p-4 md:p-8 justify-center">
                  <PreviewSidebar
                    activeSection={activePreviewSection}
                    scrollToSection={(id) => {
                      const el = document.getElementById(`preview-section-${id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      setActivePreviewSection(id);
                    }}
                    darkMode={darkMode}
                  />
                  <PreviewDocument formData={formData} schedule={schedule} setActivePreviewSection={setActivePreviewSection} />
                </div>
              </div>

              {/* Floating Action Bar - Desktop & Tablet */}
              <div className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-2 items-center gap-2 animate-in slide-in-from-bottom-8 duration-500">
                <button onClick={exportToDocx} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold text-sm">
                  <FileDown size={18} /> DOCX
                </button>
                <button onClick={exportToPdf} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 font-bold text-sm">
                  <FileType size={18} /> PDF
                </button>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />
                <button onClick={() => window.print()} className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all" title="Print Dokumen">
                  <Printer size={20} />
                </button>
                <button onClick={() => setShowPreview(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-all">
                  Edit Proposal
                </button>
              </div>
            </div>
          ) : splitView ? (
            /* Split View: Form + Preview side by side */
            <div className="flex flex-col lg:flex-row h-full">
              {/* Form Panel */}
              <div className={`flex-1 overflow-y-auto p-4 md:p-6 ${borderColor} lg:border-r`}>
                <div className={`${bgCard} rounded-xl shadow-lg border ${borderColor}`}>
                  <div className="p-4 md:p-6 space-y-4">
                    {activeStep === 0 && <AIGeneratorStep smartInput={smartInput} handleSmartChange={handleSmartChange} error={error} isGenerating={isGenerating} loadingText={loadingText} generateWithAI={generateWithAI} darkMode={darkMode} />}
                    {activeStep === 1 && <Bab1Step formData={formData} handleChange={handleChange} darkMode={darkMode} />}
                    {activeStep === 2 && <Bab2Step formData={formData} handleChange={handleChange} schedule={schedule} handleScheduleChange={handleScheduleChange} addScheduleRow={addScheduleRow} removeScheduleRow={removeScheduleRow} updateScheduleActivity={updateScheduleActivity} darkMode={darkMode} searchGoogleScholar={searchGoogleScholar} isSearchingScholar={isSearchingScholar} smartInput={smartInput} />}
                    {activeStep === 3 && <Bab3Step formData={formData} handleChange={handleChange} darkMode={darkMode} />}
                    {activeStep === 4 && <Bab4Step formData={formData} handleChange={handleChange} darkMode={darkMode} />}
                    {activeStep === 5 && <LampiranStep formData={formData} handleChange={handleChange} darkMode={darkMode} />}
                  </div>
                </div>
              </div>
              {/* Preview Panel */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white hidden lg:block">
                <div className="sticky top-0">
                  <p className="text-center text-gray-500 text-sm mb-4 font-medium">📄 Live Preview</p>
                </div>
                <div className="transform scale-75 origin-top">
                  <PreviewDocument formData={formData} schedule={schedule} />
                </div>
              </div>
            </div>
          ) : (
            /* Normal View */
            <div className="p-4 md:p-8">
              <div className={`max-w-4xl mx-auto ${bgCard} rounded-xl shadow-lg border ${borderColor} animate-fade-in`}>
                <div className="p-4 md:p-8 space-y-6">
                  {activeStep === 0 && <AIGeneratorStep smartInput={smartInput} handleSmartChange={handleSmartChange} error={error} isGenerating={isGenerating} loadingText={loadingText} generateWithAI={generateWithAI} darkMode={darkMode} />}
                  {activeStep === 1 && <Bab1Step formData={formData} handleChange={handleChange} darkMode={darkMode} />}
                  {activeStep === 2 && <Bab2Step formData={formData} handleChange={handleChange} schedule={schedule} handleScheduleChange={handleScheduleChange} addScheduleRow={addScheduleRow} removeScheduleRow={removeScheduleRow} updateScheduleActivity={updateScheduleActivity} darkMode={darkMode} searchGoogleScholar={searchGoogleScholar} isSearchingScholar={isSearchingScholar} smartInput={smartInput} />}
                  {activeStep === 3 && <Bab3Step formData={formData} handleChange={handleChange} darkMode={darkMode} />}
                  {activeStep === 4 && <Bab4Step formData={formData} handleChange={handleChange} darkMode={darkMode} />}
                  {activeStep === 5 && <LampiranStep formData={formData} handleChange={handleChange} darkMode={darkMode} />}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className={`${bgCard} rounded-xl p-6 w-[450px] shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Key size={20} /> AI Settings</h3>
              <button onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {/* Provider Selector */}
              <div>
                <label className={`text-sm font-medium ${textMuted}`}>🤖 Pilih AI Provider</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => setAiProvider('deepseek')} className={`py-2 px-3 rounded-lg font-medium transition-all text-sm ${aiProvider === 'deepseek' ? 'bg-blue-600 text-white ring-2 ring-blue-400' : `${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}`}>
                    🔵 DeepSeek (64K)
                  </button>
                  <button onClick={() => setAiProvider('claude')} className={`py-2 px-3 rounded-lg font-medium transition-all text-sm ${aiProvider === 'claude' ? 'bg-purple-600 text-white ring-2 ring-purple-400' : `${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}`}>
                    🟣 Claude (200K)
                  </button>
                  <button onClick={() => setAiProvider('groq')} className={`py-2 px-3 rounded-lg font-medium transition-all text-sm ${aiProvider === 'groq' ? 'bg-green-600 text-white ring-2 ring-green-400' : `${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}`}>
                    🚀 Groq (8K)
                  </button>
                  <button onClick={() => setAiProvider('gemini')} className={`py-2 px-3 rounded-lg font-medium transition-all text-sm ${aiProvider === 'gemini' ? 'bg-orange-600 text-white ring-2 ring-orange-400' : `${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}`}>
                    ✨ Gemini
                  </button>
                </div>
                <p className={`text-xs ${textMuted} mt-1`}>DeepSeek & Claude = prompt panjang. Groq = cepat tapi limit pendek.</p>
              </div>

              {/* DeepSeek via OpenRouter - RECOMMENDED */}
              <div className={`p-3 rounded-lg ${aiProvider === 'deepseek' ? 'ring-2 ring-blue-500' : ''} ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <label className={`text-sm font-medium ${textMuted} flex items-center gap-2`}>🔵 OpenRouter API Key {aiProvider === 'deepseek' && <span className="text-blue-500 text-xs">(Active - DeepSeek 64K)</span>}</label>
                <input type="password" value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)} placeholder="sk-or-..." className={`w-full mt-1 px-4 py-2 rounded-lg border ${borderColor} ${darkMode ? 'bg-slate-700' : 'bg-white'} focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm`} />
                <p className={`text-xs ${textMuted} mt-1`}>Gratis $1 credit - <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-blue-500 underline">openrouter.ai/keys</a> (akses DeepSeek & 100+ model)</p>
              </div>

              {/* Claude API Key */}
              <div className={`p-3 rounded-lg ${aiProvider === 'claude' ? 'ring-2 ring-purple-500' : ''} ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <label className={`text-sm font-medium ${textMuted} flex items-center gap-2`}>🟣 Claude API Key {aiProvider === 'claude' && <span className="text-purple-500 text-xs">(Active - 200K context)</span>}</label>
                <input type="password" value={claudeKey} onChange={e => setClaudeKey(e.target.value)} placeholder="sk-ant-..." className={`w-full mt-1 px-4 py-2 rounded-lg border ${borderColor} ${darkMode ? 'bg-slate-700' : 'bg-white'} focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm`} />
                <p className={`text-xs ${textMuted} mt-1`}>Context paling panjang - <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-purple-500 underline">console.anthropic.com</a></p>
              </div>

              {/* Groq API Key */}
              <div className={`p-3 rounded-lg ${aiProvider === 'groq' ? 'ring-2 ring-green-500' : ''} ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <label className={`text-sm font-medium ${textMuted} flex items-center gap-2`}>🚀 Groq API Key {aiProvider === 'groq' && <span className="text-green-500 text-xs">(Active - 8K context)</span>}</label>
                <input type="password" value={groqKey} onChange={e => setGroqKey(e.target.value)} placeholder="gsk_..." className={`w-full mt-1 px-4 py-2 rounded-lg border ${borderColor} ${darkMode ? 'bg-slate-700' : 'bg-white'} focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm`} />
                <p className={`text-xs ${textMuted} mt-1`}>Cepat tapi limit pendek - <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-green-500 underline">console.groq.com</a></p>
              </div>

              {/* Gemini API Key */}
              <div className={`p-3 rounded-lg ${aiProvider === 'gemini' ? 'ring-2 ring-orange-500' : ''} ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <label className={`text-sm font-medium ${textMuted} flex items-center gap-2`}>✨ Gemini API Keys {aiProvider === 'gemini' && <span className="text-orange-500 text-xs">(Active)</span>}</label>
                <textarea value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste API keys (1 per baris):&#10;AIzaSy..." rows={2} className={`w-full mt-1 px-4 py-2 rounded-lg border ${borderColor} ${darkMode ? 'bg-slate-700' : 'bg-white'} focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm`} />
                <p className={`text-xs ${textMuted} mt-1`}>Gratis 15 RPM - <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-orange-500 underline">Google AI Studio</a></p>
              </div>

              {/* Separator */}
              <div className={`border-t ${darkMode ? 'border-slate-600' : 'border-slate-300'} my-2`}></div>
              <p className={`text-sm font-bold ${textMuted}`}>📚 Referensi Akademik</p>

              {/* SerpAPI Key for Google Scholar - SEPARATE SECTION */}
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'} border border-emerald-500/30`}>
                <label className={`text-sm font-medium text-emerald-600 flex items-center gap-2`}>🔍 SerpAPI Key (Google Scholar)</label>
                <input type="password" value={serpApiKey} onChange={e => setSerpApiKey(e.target.value)} placeholder="8e40b16a..." className={`w-full mt-1 px-4 py-2 rounded-lg border ${borderColor} ${darkMode ? 'bg-slate-700' : 'bg-white'} focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm`} />
                <p className={`text-xs ${textMuted} mt-1`}>Untuk cari referensi di Google Scholar - <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noreferrer" className="text-emerald-500 underline">serpapi.com</a></p>
              </div>

              <button onClick={saveApiKey} className="w-full py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700">Simpan Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHistory(false)}>
          <div className={`${bgCard} rounded-xl p-6 w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><History size={20} /> Riwayat Generate</h3>
              <button onClick={() => setShowHistory(false)}><X size={20} /></button>
            </div>
            {history.length === 0 ? (
              <div className={`text-center py-8 ${textMuted}`}>
                <Database size={40} className="mx-auto mb-2 opacity-50" />
                <p>Belum ada riwayat</p>
                <p className="text-sm">Klik tombol <Save size={14} className="inline" /> untuk menyimpan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(entry => (
                  <div key={entry.id} className={`p-4 rounded-lg border ${borderColor} ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{entry.judul}</p>
                        <p className={`text-xs ${textMuted}`}>{entry.timestamp}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => loadFromHistory(entry)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Muat</button>
                        <button onClick={() => deleteFromHistory(entry.id)} className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
const PreviewSidebar = ({ activeSection, scrollToSection, darkMode }) => {
  const sections = [
    { id: 'cover', icon: <FileText size={16} />, label: 'Cover' },
    { id: 'bab1', icon: <BookOpen size={16} />, label: 'BAB 1' },
    { id: 'bab2', icon: <Library size={16} />, label: 'BAB 2' },
    { id: 'bab3', icon: <Puzzle size={16} />, label: 'BAB 3' },
    { id: 'bab4', icon: <Trophy size={16} />, label: 'BAB 4' },
    { id: 'daftar-pustaka', icon: <FileSignature size={16} />, label: 'Pustaka' },
    { id: 'lampiran', icon: <Paperclip size={16} />, label: 'Lampiran' },
  ];

  return (
    <div className={`hidden lg:flex flex-col gap-2 sticky top-8 w-48 mr-8 print:hidden shrink-0 transition-all duration-300`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'} px-3 mb-2`}>Navigasi Dokumen</p>
      {sections.map(section => (
        <button
          key={section.id}
          onClick={() => scrollToSection(section.id)}
          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${activeSection === section.id
            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 translate-x-1'
            : `${darkMode ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50'}`
            }`}
        >
          <span className={`${activeSection === section.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`}>{section.icon}</span>
          {section.label}
        </button>
      ))}
    </div>
  );
};

const InputField = ({ label, name, value, onChange, placeholder, darkMode }) => (
  <div className="flex flex-col gap-1">
    <label className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{label}</label>
    <input type="text" name={name} value={value} onChange={onChange} placeholder={placeholder} className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'}`} />
  </div>
);

const TextAreaField = ({ label, name, value, onChange, placeholder, rows = 3, darkMode }) => (
  <div className="flex flex-col gap-1">
    <label className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{label}</label>
    <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} rows={rows} className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'}`} />
  </div>
);

const AIGeneratorStep = ({ smartInput, handleSmartChange, error, isGenerating, loadingText, generateWithAI, darkMode }) => (
  <div className="space-y-6">
    <div className={`p-6 rounded-xl border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
      <h3 className="text-lg font-bold text-blue-500 mb-2 flex items-center gap-2"><Search className="w-6 h-6" /> Generator Proposal AI</h3>
      <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'} mb-4`}>Isi form lengkap untuk hasil proposal yang lebih berkualitas dan spesifik.</p>
      <div className="space-y-4">
        {/* Basic Info */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-white/80'}`}>
          <p className="text-xs font-bold text-blue-500 mb-3">📝 Informasi Dasar</p>
          <InputField label="Judul Proposal" name="judul" value={smartInput.judul} onChange={handleSmartChange} placeholder="Contoh: PERANCANGAN SI MANAJEMEN KOS-KOSAN BERBASIS WEB" darkMode={darkMode} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <InputField label="Nama Instansi (Opsional)" name="instansi" value={smartInput.instansi} onChange={handleSmartChange} placeholder="Kosongkan jika topik umum" darkMode={darkMode} />
              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'} mt-1`}>Isi jika proposal untuk instansi tertentu</p>
            </div>
            <InputField label="Lokasi (Opsional)" name="lokasi" value={smartInput.lokasi} onChange={handleSmartChange} placeholder="Contoh: Belitang, OKU Timur" darkMode={darkMode} />
          </div>
        </div>

        {/* Problem & Solution */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-white/80'}`}>
          <p className="text-xs font-bold text-red-500 mb-3">⚠️ Permasalahan & Solusi</p>
          <TextAreaField label="Masalah Utama (jelaskan detail)" name="masalah" value={smartInput.masalah} onChange={handleSmartChange} placeholder="Contoh: Pengelolaan data penghuni masih manual menggunakan buku catatan, sering terjadi kesalahan pencatatan pembayaran, penghuni kesulitan melihat status pembayaran..." rows={3} darkMode={darkMode} />
          <TextAreaField label="Solusi yang Ditawarkan" name="solusi" value={smartInput.solusi} onChange={handleSmartChange} placeholder="Contoh: Membangun sistem informasi berbasis web yang dapat mengelola data penghuni, pembayaran, dan laporan secara otomatis..." rows={2} darkMode={darkMode} />
        </div>

        {/* Details for Quality */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
          <p className="text-xs font-bold text-emerald-500 mb-3">🎯 Detail untuk Kualitas Output</p>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Narasumber Wawancara" name="narasumber" value={smartInput.narasumber} onChange={handleSmartChange} placeholder="Contoh: Pemilik kos dan 3 penghuni kos" darkMode={darkMode} />
            <InputField label="Pengguna Sistem" name="pengguna" value={smartInput.pengguna} onChange={handleSmartChange} placeholder="Contoh: Admin/pemilik dan Penghuni kos" darkMode={darkMode} />
          </div>
          <TextAreaField label="Objek Observasi" name="observasi" value={smartInput.observasi} onChange={handleSmartChange} placeholder="Contoh: Proses pencatatan data penghuni, pembayaran bulanan, penanganan keluhan..." rows={2} darkMode={darkMode} />
          <TextAreaField label="Fitur Utama Sistem" name="fitur" value={smartInput.fitur} onChange={handleSmartChange} placeholder="Contoh: Kelola penghuni, catat pembayaran, lihat laporan, notifikasi jatuh tempo, pengaduan online..." rows={2} darkMode={darkMode} />
        </div>

        {/* System Description - NEW */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
          <p className="text-xs font-bold text-purple-500 mb-2">💡 Deskripsi Detail Sistem (Semakin Detail = Semakin Bagus Output!)</p>
          <TextAreaField
            label="Jelaskan sistem yang ingin dirancang secara detail"
            name="deskripsiSistem"
            value={smartInput.deskripsiSistem}
            onChange={handleSmartChange}
            placeholder={`Deskripsikan dengan detail, contoh:

• Jenis: Web/Desktop/Mobile app
• Tampilan: Modern, minimalis, dashboard admin profesional
• Halaman: Login, Dashboard, Kelola Kamar, Pembayaran, Laporan, Profil
• Fitur unggulan: Notifikasi WhatsApp otomatis saat jatuh tempo, cetak kwitansi PDF
• Database: Data penghuni, kamar, pembayaran, fasilitas
• Role user: Admin (full akses), Penghuni (lihat status saja)
• Teknologi: PHP, MySQL, Bootstrap 5, Chart.js untuk grafik
• Yang membedakan dari sistem lain: ...`}
            rows={6}
            darkMode={darkMode}
          />
          <p className={`text-xs ${darkMode ? 'text-purple-400' : 'text-purple-600'} mt-1`}>⭐ Tips: Semakin detail deskripsi, semakin akurat diagram UML, ERD, dan fitur yang dihasilkan</p>
        </div>

        {/* Method */}
        <div className="flex flex-col gap-1">
          <label className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Metode Pengembangan</label>
          <select name="metode" value={smartInput.metode} onChange={handleSmartChange} className={`px-4 py-2 border rounded-lg ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}>
            <option value="Waterfall">Waterfall (linear, cocok untuk proyek jelas)</option>
            <option value="Prototype">Prototype (iteratif, cocok untuk requirement belum jelas)</option>
            <option value="Agile">Agile (fleksibel, cocok untuk proyek besar)</option>
            <option value="RAD">RAD (cepat, cocok untuk deadline ketat)</option>
          </select>
        </div>

        {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">{error}</div>}
        <button onClick={generateWithAI} disabled={isGenerating} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:from-blue-700 hover:to-indigo-700 transition-all">
          {isGenerating ? <><Loader2 className="animate-spin" /> {loadingText}</> : <><Wand2 size={20} /> Generate Proposal Lengkap</>}
        </button>
      </div>
    </div>
  </div>
);

const Bab1Step = ({ formData, handleChange, darkMode }) => (
  <div className="space-y-4 animate-fade-in">
    <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-100'} border text-sm flex items-center gap-2`}>
      <AlertCircle size={16} className="text-yellow-500" /> <strong>Tips:</strong> Pastikan minimal 3 kutipan (Nama, Tahun).
    </div>
    <TextAreaField label="Par 1: Perkembangan Teknologi" name="bab1_par1_tekno" value={formData.bab1_par1_tekno} onChange={handleChange} rows={4} darkMode={darkMode} />
    <TextAreaField label="Par 2: Topik" name="bab1_par2_topik" value={formData.bab1_par2_topik} onChange={handleChange} rows={3} darkMode={darkMode} />
    <TextAreaField label="Par 3: Objek & Kendala" name="bab1_par3_objek" value={formData.bab1_par3_objek} onChange={handleChange} rows={4} darkMode={darkMode} />
    <TextAreaField label="Par 4: Solusi" name="bab1_par4_solusi" value={formData.bab1_par4_solusi} onChange={handleChange} rows={3} darkMode={darkMode} />
    <TextAreaField label="Par 5: Metode" name="bab1_par5_metode" value={formData.bab1_par5_metode} onChange={handleChange} rows={3} darkMode={darkMode} />
    <TextAreaField label="Par 6: Penutup" name="bab1_par6_penutup" value={formData.bab1_par6_penutup} onChange={handleChange} rows={2} darkMode={darkMode} />
  </div>
);

const Bab2Step = ({ formData, handleChange, schedule, handleScheduleChange, addScheduleRow, removeScheduleRow, updateScheduleActivity, darkMode, searchGoogleScholar, isSearchingScholar, smartInput }) => (
  <div className="space-y-6 animate-fade-in">
    <TextAreaField label="Intro Bab 2" name="bab2_intro" value={formData.bab2_intro} onChange={handleChange} rows={3} darkMode={darkMode} />
    <TextAreaField label="2.1.1 Perancangan" name="bab2_1_1_perancangan" value={formData.bab2_1_1_perancangan} onChange={handleChange} rows={4} darkMode={darkMode} />
    <TextAreaField label="2.1.2 Sistem Informasi" name="bab2_1_2_si" value={formData.bab2_1_2_si} onChange={handleChange} rows={4} darkMode={darkMode} />
    <TextAreaField label="2.1.3 Teori Objek Studi" name="bab2_1_3_objek_teori" value={formData.bab2_1_3_objek_teori} onChange={handleChange} rows={4} darkMode={darkMode} />

    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200'}`}>
      <p className="text-sm font-bold mb-3 text-indigo-500">2.1.4 Metode Perancangan (UML)</p>
      <div className="space-y-4">
        <TextAreaField label="Pengantar UML" name="bab2_1_4_uml_intro" value={formData.bab2_1_4_uml_intro} onChange={handleChange} rows={3} darkMode={darkMode} />

        {/* Use Case */}
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
          <p className="text-xs font-bold text-purple-500 mb-2">a. Use Case Diagram</p>
          <TextAreaField label="Teori Use Case" name="bab2_1_4_usecase" value={formData.bab2_1_4_usecase} onChange={handleChange} rows={3} darkMode={darkMode} />
          <TextAreaField label="Diagram Mermaid (Use Case)" name="uml_usecase_diagram" value={formData.uml_usecase_diagram} onChange={handleChange} rows={6} darkMode={darkMode} />
        </div>

        {/* Activity */}
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
          <p className="text-xs font-bold text-orange-500 mb-2">b. Activity Diagram</p>
          <TextAreaField label="Teori Activity" name="bab2_1_4_activity" value={formData.bab2_1_4_activity} onChange={handleChange} rows={3} darkMode={darkMode} />
          <TextAreaField label="Diagram Mermaid (Activity)" name="uml_activity_diagram" value={formData.uml_activity_diagram} onChange={handleChange} rows={6} darkMode={darkMode} />
        </div>

        {/* Class */}
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-teal-900/30' : 'bg-teal-50'}`}>
          <p className="text-xs font-bold text-teal-500 mb-2">c. Class Diagram</p>
          <TextAreaField label="Teori Class" name="bab2_1_4_class" value={formData.bab2_1_4_class} onChange={handleChange} rows={3} darkMode={darkMode} />
          <TextAreaField label="Diagram Mermaid (Class)" name="uml_class_diagram" value={formData.uml_class_diagram} onChange={handleChange} rows={8} darkMode={darkMode} />
        </div>
      </div>
      <p className={`text-xs mt-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>💡 Diagram akan tampil visual di Preview Dokumen</p>
    </div>

    <TextAreaField label="2.1.5 Metode Pengembangan Sistem" name="bab2_1_5_metode_pengembangan" value={formData.bab2_1_5_metode_pengembangan} onChange={handleChange} rows={4} darkMode={darkMode} />
    <TextAreaField label="2.2 Pembahasan Objek" name="bab2_2_pembahasan_objek" value={formData.bab2_2_pembahasan_objek} onChange={handleChange} rows={4} darkMode={darkMode} />

    {/* Penelitian Terdahulu with Google Scholar Search */}
    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
        <p className="text-sm font-bold text-emerald-500">2.3 Penelitian Terdahulu (2020-2024)</p>
        <button
          onClick={() => searchGoogleScholar && searchGoogleScholar(smartInput?.judul)}
          disabled={isSearchingScholar || !smartInput?.judul}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSearchingScholar
            ? 'bg-gray-400 text-white cursor-wait'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            } disabled:opacity-50`}
        >
          {isSearchingScholar ? (
            <><Loader2 size={16} className="animate-spin" /> Mencari...</>
          ) : (
            <><Search size={16} /> Cari di Google Scholar</>
          )}
        </button>
      </div>
      <p className={`text-xs mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
        🔍 Klik tombol untuk mencari penelitian terdahulu REAL dari Google Scholar (tahun 2020+)
      </p>
      <TextAreaField label="" name="bab2_3_penelitian_terdahulu" value={formData.bab2_3_penelitian_terdahulu} onChange={handleChange} rows={8} darkMode={darkMode} />
      {!smartInput?.judul && <p className="text-xs text-yellow-500 mt-2">⚠️ Isi judul proposal di Generator AI terlebih dahulu</p>}
    </div>

    <TextAreaField label="2.4 Tahapan Perancangan" name="bab2_4_tahapan" value={formData.bab2_4_tahapan} onChange={handleChange} rows={3} darkMode={darkMode} />

    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-bold">2.5 Jadwal Perancangan</p>
        <button onClick={addScheduleRow} className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">
          <Plus size={14} /> Tambah
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
              <th className="p-2 text-left">Kegiatan</th>
              <th className="p-2 text-center w-12">M1</th>
              <th className="p-2 text-center w-12">M2</th>
              <th className="p-2 text-center w-12">M3</th>
              <th className="p-2 text-center w-12">M4</th>
              <th className="p-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(item => (
              <tr key={item.id} className={`border-b ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                <td className="p-1">
                  <input type="text" value={item.activity} onChange={e => updateScheduleActivity(item.id, e.target.value)} className={`w-full px-2 py-1 rounded border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'} text-sm`} />
                </td>
                {['m1', 'm2', 'm3', 'm4'].map(m => (
                  <td key={m} className="p-2 text-center">
                    <input type="checkbox" checked={item[m]} onChange={() => handleScheduleChange(item.id, m)} className="w-4 h-4 accent-blue-500" />
                  </td>
                ))}
                <td className="p-1 text-center">
                  <button onClick={() => removeScheduleRow(item.id)} className="text-red-500 hover:text-red-700" title="Hapus">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const Bab3Step = ({ formData, handleChange, darkMode }) => (
  <div className="space-y-6 animate-fade-in">
    <TextAreaField label="3.1.1 Analisis Masalah (PIECES)" name="bab3_1_1_analisis_masalah" value={formData.bab3_1_1_analisis_masalah} onChange={handleChange} rows={5} darkMode={darkMode} />
    <TextAreaField label="3.1.2 Metode Pengumpulan Data" name="bab3_1_2_metode_pengumpulan" value={formData.bab3_1_2_metode_pengumpulan} onChange={handleChange} rows={4} darkMode={darkMode} />

    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
      <p className="text-sm font-bold mb-3 text-emerald-600">3.2.1 Flowchart Sistem</p>
      <TextAreaField label="Deskripsi Alur" name="bab3_2_1_flowchart_desc" value={formData.bab3_2_1_flowchart_desc} onChange={handleChange} rows={3} darkMode={darkMode} />
      <div className="grid grid-cols-2 gap-4 mt-4">
        <TextAreaField label="Flowchart User (Mermaid)" name="bab3_2_1_flowchart_user" value={formData.bab3_2_1_flowchart_user} onChange={handleChange} rows={8} darkMode={darkMode} />
        <TextAreaField label="Flowchart Admin (Mermaid)" name="bab3_2_1_flowchart_admin" value={formData.bab3_2_1_flowchart_admin} onChange={handleChange} rows={8} darkMode={darkMode} />
      </div>
      <p className={`text-xs mt-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>💡 Diagram akan tampil visual di Preview</p>
    </div>

    {/* ERD Section */}
    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-cyan-900/20 border-cyan-800' : 'bg-cyan-50 border-cyan-200'}`}>
      <p className="text-sm font-bold mb-3 text-cyan-600 flex items-center gap-2"><Database size={16} /> 3.2.2 ERD (Entity Relationship Diagram)</p>
      <TextAreaField label="Deskripsi ERD" name="erd_desc" value={formData.erd_desc} onChange={handleChange} rows={2} darkMode={darkMode} />
      <TextAreaField label="ERD Mermaid Syntax" name="erd_diagram" value={formData.erd_diagram} onChange={handleChange} rows={10} darkMode={darkMode} />
      <p className={`text-xs mt-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>💡 Gunakan syntax: erDiagram untuk membuat diagram database</p>
    </div>

    <TextAreaField label="Kebutuhan Fungsional" name="bab3_2_2_fungsional" value={formData.bab3_2_2_fungsional} onChange={handleChange} rows={5} darkMode={darkMode} />
    <TextAreaField label="Kebutuhan Non-Fungsional" name="bab3_2_2_non_fungsional" value={formData.bab3_2_2_non_fungsional} onChange={handleChange} rows={4} darkMode={darkMode} />
    <div className="grid grid-cols-2 gap-4">
      <TextAreaField label="Hardware" name="bab3_2_2_hardware" value={formData.bab3_2_2_hardware} onChange={handleChange} rows={3} darkMode={darkMode} />
      <TextAreaField label="Software" name="bab3_2_2_software" value={formData.bab3_2_2_software} onChange={handleChange} rows={3} darkMode={darkMode} />
    </div>
  </div>
);

const Bab4Step = ({ formData, handleChange, darkMode }) => (
  <div className="space-y-4 animate-fade-in">
    <TextAreaField label="4.1 Kesimpulan" name="bab4_1_kesimpulan" value={formData.bab4_1_kesimpulan} onChange={handleChange} rows={4} darkMode={darkMode} />
    <TextAreaField label="4.2 Saran" name="bab4_2_saran" value={formData.bab4_2_saran} onChange={handleChange} rows={4} darkMode={darkMode} />
  </div>
);

const LampiranStep = ({ formData, handleChange, darkMode }) => (
  <div className="space-y-4 animate-fade-in">
    <TextAreaField label="Daftar Pustaka" name="daftar_pustaka" value={formData.daftar_pustaka} onChange={handleChange} rows={6} darkMode={darkMode} />
    <TextAreaField label="Lampiran: Draf Wawancara" name="lampiran_draf_wawancara" value={formData.lampiran_draf_wawancara} onChange={handleChange} rows={8} darkMode={darkMode} />
  </div>
);

// Mermaid Chart Component for rendering flowcharts
const MermaidChart = ({ chart, id }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!chart || !containerRef.current) return;

    // Initialize mermaid with securityLevel loose for better compatibility
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        curve: 'basis',
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 50,
        useMaxWidth: true
      }
    });

    const renderChart = async () => {
      try {
        // Clean the chart syntax
        let cleanChart = chart;

        // Remove any instruction text that may have been included
        if (cleanChart.includes('[INSTRUKSI:')) {
          cleanChart = cleanChart.split('[INSTRUKSI:')[0].trim();
        }

        // Detect diagram type
        const isClassDiagram = cleanChart.includes('classDiagram') || cleanChart.includes('class ');
        const isErDiagram = cleanChart.includes('erDiagram');

        // Fix class diagram syntax for Mermaid v10+
        if (isClassDiagram) {
          // Ensure it starts with classDiagram
          if (!cleanChart.trim().startsWith('classDiagram')) {
            cleanChart = 'classDiagram\n' + cleanChart;
          }
          // Fix attribute syntax: +int id -> +id : int
          cleanChart = cleanChart.replace(/\+(\w+)\s+(\w+)(?!\()/g, '+$2 : $1');
          cleanChart = cleanChart.replace(/-(\w+)\s+(\w+)(?!\()/g, '-$2 : $1');
          cleanChart = cleanChart.replace(/#(\w+)\s+(\w+)(?!\()/g, '#$2 : $1');
          cleanChart = cleanChart.replace(/~(\w+)\s+(\w+)(?!\()/g, '~$2 : $1');
        }

        // Fix ER diagram syntax for Mermaid v10+
        if (isErDiagram) {
          // Ensure it starts with erDiagram
          if (!cleanChart.trim().startsWith('erDiagram')) {
            cleanChart = 'erDiagram\n' + cleanChart;
          }
          // Fix attribute format: int id PK -> id int PK
          cleanChart = cleanChart.replace(/(\s+)(int|string|date|boolean|float|double)\s+(\w+)(\s+PK|\s+FK)?/g, '$1$3 $2$4');
        }

        // For flowcharts, ensure proper directive
        if (!isClassDiagram && !isErDiagram) {
          if (!cleanChart.startsWith('flowchart') && !cleanChart.startsWith('graph')) {
            cleanChart = 'flowchart TD\n' + cleanChart;
          }
        }

        const { svg } = await mermaid.render(`mermaid-${id}-${Date.now()}`, cleanChart);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        // Show a simplified placeholder instead of error
        if (containerRef.current) {
          const diagramType = chart.includes('classDiagram') ? 'Class Diagram' :
            chart.includes('erDiagram') ? 'ERD' : 'Flowchart';
          containerRef.current.innerHTML = `<div class="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <p class="text-gray-600 font-medium">📊 ${diagramType}</p>
            <p class="text-gray-400 text-sm mt-1">Diagram akan ditampilkan saat export ke Word/PDF</p>
            <details class="mt-2 text-left">
              <summary class="text-xs text-gray-400 cursor-pointer">Lihat kode Mermaid</summary>
              <pre class="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">${chart}</pre>
            </details>
          </div>`;
        }
      }
    };

    renderChart();
  }, [chart, id]);

  return (
    <div ref={containerRef} className="flex justify-center my-4 overflow-auto">
      <div className="text-gray-400">Loading diagram...</div>
    </div>
  );
};

const PreviewDocument = ({ formData, schedule, setActivePreviewSection }) => {
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`${label} telah disalin ke clipboard!`);
  };

  const SectionHeading = ({ children, id, label }) => (
    <div className="relative group/heading">
      <div id={`preview-section-${id}`} className="absolute -top-24 h-1 w-1 invisible" />
      {children}
      <button
        onClick={() => copyToClipboard(formData[id] || '', label || 'Bagian ini')}
        className="absolute -left-10 top-0 p-2 text-gray-400 hover:text-blue-500 opacity-0 group-hover/heading:opacity-100 transition-opacity print:hidden"
        title="Salin bagian ini"
      >
        <Copy size={16} />
      </button>
    </div>
  );

  return (
    <div className="flex justify-center print:block animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div id="document-preview" className="bg-white w-[210mm] min-h-[297mm] p-[25mm] shadow-2xl print:shadow-none print:w-full print:p-0 text-black font-serif leading-relaxed text-justify mb-10 overflow-hidden ring-1 ring-black/5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        {/* COVER */}
        <div id="preview-section-cover" className="flex flex-col items-center justify-center min-h-[800px] text-center">
          <h1 className="font-bold text-2xl mb-6 uppercase leading-loose max-w-lg">{formData.judul || '[JUDUL]'}</h1>
          <p className="mb-12 font-bold text-lg">PROPOSAL PERANCANGAN SISTEM</p>
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 flex items-center justify-center mb-12 rounded-full"><span className="text-gray-400 text-xs">Logo</span></div>
          <p className="mb-4">Disusun Oleh:</p>
          <p className="font-bold text-lg uppercase">{formData.penulis || '[NAMA]'}</p>
          <p className="font-bold text-lg mb-12">{formData.nim ? `NIM: ${formData.nim}` : ''}</p>
          <p className="font-bold uppercase text-lg mb-2">{formData.prodi || '[PRODI]'}</p>
          <p className="font-bold uppercase text-lg mb-2">{formData.instansi || '[INSTANSI]'}</p>
          <p className="font-bold text-lg">{formData.tahun}</p>
        </div>

        {/* BAB 1 */}
        <div className="print:break-before-page border-t border-gray-100 my-10 print:my-0 print:border-none" />
        <SectionHeading id="bab1" label="Bab 1">
          <h2 className="font-bold text-center mb-6 text-xl">BAB 1<br />PENDAHULUAN</h2>
        </SectionHeading>
        <div className="space-y-4">
          {[formData.bab1_par1_tekno, formData.bab1_par2_topik, formData.bab1_par3_objek, formData.bab1_par4_solusi, formData.bab1_par5_metode, formData.bab1_par6_penutup].map((p, i) => (
            p ? <p key={i} className="indent-10">{p}</p> : null
          ))}
        </div>

        {/* BAB 2 */}
        <div className="print:break-before-page border-t border-gray-100 my-10 print:my-0 print:border-none" />
        <SectionHeading id="bab2" label="Bab 2">
          <h2 className="font-bold text-center mb-6 text-xl">BAB 2<br />TINJAUAN PUSTAKA</h2>
        </SectionHeading>
        <p className="indent-10 mb-4">{formData.bab2_intro}</p>

        <h3 className="font-bold mb-2">2.1 Kajian Pustaka</h3>
        <h4 className="font-bold mb-2 ml-4">2.1.1 Perancangan</h4>
        <p className="indent-10 mb-4">{formData.bab2_1_1_perancangan}</p>

        <h4 className="font-bold mb-2 ml-4">2.1.2 Sistem Informasi</h4>
        <p className="indent-10 mb-4">{formData.bab2_1_2_si}</p>

        <h4 className="font-bold mb-2 ml-4">2.1.3 Teori Objek Studi</h4>
        <p className="indent-10 mb-4">{formData.bab2_1_3_objek_teori}</p>

        <h4 className="font-bold mb-2 ml-4">2.1.4 Metode Perancangan (UML)</h4>
        <p className="indent-10 mb-4">{formData.bab2_1_4_uml_intro}</p>

        <h5 className="font-bold mb-2 ml-8">a. Use Case Diagram</h5>
        <p className="indent-10 mb-4">{formData.bab2_1_4_usecase}</p>
        {formData.uml_usecase_diagram && (
          <div className="mb-6 ring-1 ring-gray-100 p-4 rounded-lg">
            <MermaidChart chart={formData.uml_usecase_diagram} id="uml-usecase" />
            <p className="text-center text-sm italic mt-2">Gambar 2.1 Use Case Diagram Sistem</p>
          </div>
        )}

        <h5 className="font-bold mb-2 ml-8">b. Activity Diagram</h5>
        <p className="indent-10 mb-4">{formData.bab2_1_4_activity}</p>
        {formData.uml_activity_diagram && (
          <div className="mb-6 ring-1 ring-gray-100 p-4 rounded-lg">
            <MermaidChart chart={formData.uml_activity_diagram} id="uml-activity" />
            <p className="text-center text-sm italic mt-2">Gambar 2.2 Activity Diagram Sistem</p>
          </div>
        )}

        <h5 className="font-bold mb-2 ml-8">c. Class Diagram</h5>
        <p className="indent-10 mb-4">{formData.bab2_1_4_class}</p>
        {formData.uml_class_diagram && (
          <div className="mb-6 ring-1 ring-gray-100 p-4 rounded-lg">
            <MermaidChart chart={formData.uml_class_diagram} id="uml-class" />
            <p className="text-center text-sm italic mt-2">Gambar 2.3 Class Diagram Sistem</p>
          </div>
        )}

        <h4 className="font-bold mb-2 ml-4">2.1.5 Metode Pengembangan Sistem</h4>
        <p className="indent-10 mb-4">{formData.bab2_1_5_metode_pengembangan}</p>

        <h3 className="font-bold mb-2">2.2 Pembahasan Objek</h3>
        <p className="indent-10 mb-4">{formData.bab2_2_pembahasan_objek}</p>

        <h3 className="font-bold mb-2">2.3 Penelitian Terdahulu</h3>
        <div className="indent-10 mb-4 whitespace-pre-wrap">{formData.bab2_3_penelitian_terdahulu}</div>

        <h3 className="font-bold mb-2">2.4 Tahapan Perancangan</h3>
        <p className="indent-10 mb-4">{formData.bab2_4_tahapan}</p>

        <h3 className="font-bold mb-2">2.5 Jadwal Perancangan</h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse border border-black text-center">
            <thead><tr className="bg-gray-100"><th className="border border-black p-2">No</th><th className="border border-black p-2 text-left">Kegiatan</th><th className="border border-black p-2">M1</th><th className="border border-black p-2">M2</th><th className="border border-black p-2">M3</th><th className="border border-black p-2">M4</th></tr></thead>
            <tbody>{schedule.map(r => <tr key={r.id}><td className="border border-black p-2">{r.id}</td><td className="border border-black p-2 text-left">{r.activity}</td><td className="border border-black p-2 font-bold text-blue-600">{r.m1 ? '✓' : ''}</td><td className="border border-black p-2 font-bold text-blue-600">{r.m2 ? '✓' : ''}</td><td className="border border-black p-2 font-bold text-blue-600">{r.m3 ? '✓' : ''}</td><td className="border border-black p-2 font-bold text-blue-600">{r.m4 ? '✓' : ''}</td></tr>)}</tbody>
          </table>
        </div>

        {/* BAB 3 */}
        <div className="print:break-before-page border-t border-gray-100 my-10 print:my-0 print:border-none" />
        <SectionHeading id="bab3" label="Bab 3">
          <h2 className="font-bold text-center mb-6 text-xl">BAB 3<br />HASIL DAN PERANCANGAN</h2>
        </SectionHeading>

        <h3 className="font-bold mb-2">3.1 Hasil</h3>
        <h4 className="font-bold mb-2 ml-4">3.1.1 Analisis Masalah</h4>
        <div className="indent-10 mb-4 whitespace-pre-wrap">{formData.bab3_1_1_analisis_masalah}</div>

        <h4 className="font-bold mb-2 ml-4">3.1.2 Metode Pengumpulan Data</h4>
        <div className="indent-10 mb-4 whitespace-pre-wrap">{formData.bab3_1_2_metode_pengumpulan}</div>

        <h3 className="font-bold mb-2">3.2 Perancangan</h3>
        <h4 className="font-bold mb-2 ml-4">3.2.1 Flowchart</h4>
        <div className="indent-10 mb-4 whitespace-pre-wrap">{formData.bab3_2_1_flowchart_desc}</div>

        {/* Visual Flowcharts */}
        {formData.bab3_2_1_flowchart_user && (
          <div className="mb-6 ring-1 ring-gray-100 p-4 rounded-lg">
            <p className="font-bold text-center mb-2">Gambar 3.1 Flowchart Alur User</p>
            <MermaidChart chart={formData.bab3_2_1_flowchart_user} id="flowchart-user" />
          </div>
        )}

        {formData.bab3_2_1_flowchart_admin && (
          <div className="mb-6 ring-1 ring-gray-100 p-4 rounded-lg">
            <p className="font-bold text-center mb-2">Gambar 3.2 Flowchart Alur Admin</p>
            <MermaidChart chart={formData.bab3_2_1_flowchart_admin} id="flowchart-admin" />
          </div>
        )}

        {/* ERD Section */}
        {(formData.erd_desc || formData.erd_diagram) && (
          <>
            <h4 className="font-bold mb-2 ml-4">3.2.2 ERD (Entity Relationship Diagram)</h4>
            <div className="indent-10 mb-4 whitespace-pre-wrap">{formData.erd_desc}</div>
            {formData.erd_diagram && (
              <div className="mb-6 ring-1 ring-gray-100 p-4 rounded-lg">
                <MermaidChart chart={formData.erd_diagram} id="erd-diagram" />
                <p className="text-center text-sm italic mt-2">Gambar 3.3 Entity Relationship Diagram</p>
              </div>
            )}
          </>
        )}

        <h4 className="font-bold mb-2 ml-4">3.2.3 Analisis Kebutuhan</h4>
        <h5 className="font-bold mb-2 ml-8">a. Kebutuhan Fungsional</h5>
        <div className="pl-12 mb-4 whitespace-pre-wrap">{formData.bab3_2_2_fungsional}</div>

        <h5 className="font-bold mb-2 ml-8">b. Kebutuhan Non-Fungsional</h5>
        <div className="pl-12 mb-4 whitespace-pre-wrap">{formData.bab3_2_2_non_fungsional}</div>

        <h5 className="font-bold mb-2 ml-8">c. Analisis Hardware</h5>
        <div className="pl-12 mb-4 whitespace-pre-wrap">{formData.bab3_2_2_hardware}</div>

        <h5 className="font-bold mb-2 ml-8">d. Analisis Software</h5>
        <div className="pl-12 mb-4 whitespace-pre-wrap">{formData.bab3_2_2_software}</div>

        {/* BAB 4 */}
        <div className="print:break-before-page border-t border-gray-100 my-10 print:my-0 print:border-none" />
        <SectionHeading id="bab4" label="Bab 4">
          <h2 className="font-bold text-center mb-6 text-xl">BAB 4<br />KESIMPULAN DAN SARAN</h2>
        </SectionHeading>
        <h3 className="font-bold mb-2">4.1 Kesimpulan</h3>
        <div className="indent-10 mb-4 whitespace-pre-wrap">{formData.bab4_1_kesimpulan}</div>
        <h3 className="font-bold mb-2">4.2 Saran</h3>
        <div className="indent-10 mb-4 whitespace-pre-wrap">{formData.bab4_2_saran}</div>

        {/* DAFTAR PUSTAKA */}
        <div className="print:break-before-page border-t border-gray-100 my-10 print:my-0 print:border-none" />
        <SectionHeading id="daftar-pustaka" label="Daftar Pustaka">
          <h2 className="font-bold text-center mb-6 text-xl">DAFTAR PUSTAKA</h2>
        </SectionHeading>
        <div className="space-y-4">
          {formData.daftar_pustaka ? (
            formData.daftar_pustaka.split('\n\n').map((ref, i) => (
              <div key={i} className="pl-10 -indent-10 text-sm leading-relaxed">
                {ref.split('\n').map((line, j) => (
                  <div key={j} className={line.includes('http') ? 'text-blue-600 break-all' : ''}>
                    {line}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="text-gray-500 italic">Daftar pustaka belum tersedia. Generate proposal terlebih dahulu.</div>
          )}
        </div>

        {/* LAMPIRAN */}
        <div className="print:break-before-page border-t border-gray-100 my-10 print:my-0 print:border-none" />
        <SectionHeading id="lampiran" label="Lampiran">
          <h2 className="font-bold text-center mb-6 text-xl">LAMPIRAN</h2>
        </SectionHeading>

        <h3 className="font-bold mb-2">Lampiran 1: Draf Pertanyaan Wawancara</h3>
        <div className="mb-6 whitespace-pre-wrap">{formData.lampiran_draf_wawancara || "[Draf pertanyaan wawancara]"}</div>

        <h3 className="font-bold mb-2">Lampiran 2: Hasil Wawancara</h3>
        <div className="mb-6 whitespace-pre-wrap">{formData.lampiran_hasil_wawancara || "[Hasil wawancara akan dilampirkan]"}</div>

        <h3 className="font-bold mb-2">Lampiran 3: Dokumentasi</h3>
        <div className="mb-6 whitespace-pre-wrap">{formData.lampiran_dokumentasi || "[Foto dokumentasi akan dilampirkan]"}</div>

        <h3 className="font-bold mb-2">Lampiran 4: Surat Izin Observasi</h3>
        <div className="mb-6 whitespace-pre-wrap">{formData.lampiran_surat || "[Surat izin observasi/penelitian]"}</div>
      </div>
    </div>
  );
};

