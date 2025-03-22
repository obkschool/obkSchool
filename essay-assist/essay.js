// Initialize API key and URL for the Gemini API
const API_KEY = "AIzaSyCrAicHcB2IUqkMS846--MFJo6u0UqKbII";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// DOM Elements
const essayEditor = document.getElementById('essay-editor');
const wordCounter = document.querySelector('.word-counter');
const feedbackContainer = document.getElementById('feedback-container');
const checkGrammarBtn = document.getElementById('check-grammar-btn');
const improveWritingBtn = document.getElementById('improve-writing-btn');
const generateEssayBtn = document.getElementById('generate-essay-btn');
const clearTextBtn = document.getElementById('clear-text-btn');
const copyTextBtn = document.getElementById('copy-text-btn');
const downloadTextBtn = document.getElementById('download-text-btn');
const refreshFeedbackBtn = document.getElementById('refresh-feedback-btn');
const closeFeedbackBtn = document.getElementById('close-feedback-btn');

// Essay Generator Modal Elements
const essayGeneratorModal = document.getElementById('essay-generator-modal');
const closeGeneratorModalBtn = document.getElementById('close-generator-modal');
const essayGeneratorForm = document.getElementById('essay-generator-form');
const cancelGeneratorBtn = document.getElementById('cancel-generator');
const generatorLoading = document.getElementById('generator-loading');

// Variables for the writing assistance
let debounceTimer;
let controller;
let lastAnalyzedText = '';
let correctionSuggestions = [];
let lastFeedbackType = '';
let synth = window.speechSynthesis;
let speaking = false;

// Global audio variable to track current playback
let audioPlayer = null;

// Initialize the editor and event listeners
function init() {
  setupEditor();
  setupEventListeners();
  hideAuthElements();
  addVoiceoverButton();
  addNotificationCenter();
  
  // Show welcome notification
  showNotification('مرحباً بك في مصحح المقالات الذكي!', 'welcome');
  
  // Auto-analyze as user types (with debounce)
  essayEditor.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const text = essayEditor.innerText;
      if (text.length > 50 && text !== lastAnalyzedText) {
        autoAnalyzeWriting(text);
      }
    }, 2000); // Wait 2 seconds after typing stops
  });
  
  // إضافة سطر الأوامر
  const { commandLineContainer, commandHints } = addCommandLine();
  
  // إضافة زر إعداد API
  addApiKeyButton();
}

// Add AI voiceover button to the toolbar
function addVoiceoverButton() {
  const toolbarGroup = document.querySelector('.toolbar-group:last-child');
  if (toolbarGroup) {
    const voiceoverBtn = document.createElement('button');
    voiceoverBtn.id = 'voiceover-btn';
    voiceoverBtn.className = 'toolbar-btn primary';
    voiceoverBtn.innerHTML = `
      <span class="material-symbols-rounded">record_voice_over</span>
      <span>قراءة النص</span>
    `;
    
    voiceoverBtn.addEventListener('click', () => {
      if (!speaking) {
        speakText(essayEditor.innerText);
      } else {
        stopSpeaking();
      }
    });
    
    toolbarGroup.appendChild(voiceoverBtn);
  }
}

// Improved voice over function with reliable stopping
function speakText(text) {
  if (!text || text.trim().length === 0) {
    showNotification('لا يوجد نص للقراءة', 'error');
    return;
  }
  
  // Stop any ongoing speech
  stopSpeaking();
  
  // Update UI to show speaking state
  const voiceoverBtn = document.getElementById('voiceover-btn');
  if (voiceoverBtn) {
    voiceoverBtn.innerHTML = `
      <span class="material-symbols-rounded">stop_circle</span>
      <span>إيقاف القراءة</span>
    `;
    voiceoverBtn.classList.add('speaking');
  }
  
  // Show notification that reading has started
//   showNotification('جاري قراءة النص بصوت ...', 'info');
  speaking = true;
  
  // Split text into smaller chunks for better playback
  const chunks = chunkText(text, 200);
  let currentChunk = 0;
  
  // Create audio element and keep track of it globally
  audioPlayer = new Audio();
  
  // Function to play next chunk
  const playNextChunk = () => {
    if (currentChunk >= chunks.length || !speaking) {
      // We're done or stopped
      stopSpeaking();
      return;
    }
    
    // Use Arabic Egyptian (male voice) or Moroccan
    const encodedText = encodeURIComponent(chunks[currentChunk]);
    audioPlayer.src = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar-EG&client=tw-ob&q=${encodedText}`;
    
    // When this chunk ends, play the next one
    audioPlayer.onended = () => {
      currentChunk++;
      setTimeout(() => playNextChunk(), 300);
    };
    
    // Handle errors
    audioPlayer.onerror = () => {
      console.error('Error playing audio chunk');
      currentChunk++;
      setTimeout(() => playNextChunk(), 500);
    };
    
    // Play this chunk
    audioPlayer.play().catch(err => {
      console.error('Failed to play audio:', err);
      stopSpeaking();
    });
  };
  
  // Start playing
  playNextChunk();
}

// Helper function to split text into manageable chunks
function chunkText(text, maxLength) {
  const chunks = [];
  let current = '';
  const sentences = text.split(/([.!?،؛])/);
  
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = (sentences[i] || '') + (sentences[i+1] || '');
    if ((current + sentence).length <= maxLength) {
      current += sentence;
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
  }
  
  if (current) chunks.push(current);
  return chunks;
}

// Fallback method using native Speech Synthesis if available
function fallbackTextToSpeech(text) {
  if (!window.speechSynthesis) return;
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  
  // Try to find an Arabic male voice
  const voices = speechSynthesis.getVoices();
  const arabicVoice = voices.find(voice => 
    voice.lang.includes('ar') && voice.name.includes('Male')
  );
  
  if (arabicVoice) {
    utterance.voice = arabicVoice;
  }
  
  speechSynthesis.speak(utterance);
}

// Stop text-to-speech - Fixed version that properly stops audio
function stopSpeaking() {
  // Cancel any playing audio
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.src = ''; // Clear source
    audioPlayer = null;
  }
  
  // Cancel any native speech synthesis
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  
  // Reset UI state
  speaking = false;
  const voiceoverBtn = document.getElementById('voiceover-btn');
  if (voiceoverBtn) {
    voiceoverBtn.innerHTML = `
      <span class="material-symbols-rounded">record_voice_over</span>
      <span>قراءة النص</span>
    `;
    voiceoverBtn.classList.remove('speaking');
  }
  
  // Show notification
//   showNotification('تم إيقاف القراءة الصوتية', 'info');
}

// Add notification center
function addNotificationCenter() {
  const notificationCenter = document.createElement('div');
  notificationCenter.className = 'notification-center';
  document.body.appendChild(notificationCenter);
}

// Hide all authentication-related UI elements
function hideAuthElements() {
  // Hide login button and user profile section
  const authElements = document.querySelector('.user-auth');
  if (authElements) {
    authElements.style.display = 'none';
  }
  
  // Also hide settings button in navigation
  const settingsBtn = document.querySelector('#settings-btn');
  if (settingsBtn) {
    settingsBtn.style.display = 'none';
  }
}

// Setup the editor with initial state
function setupEditor() {
  essayEditor.focus();
  
  // Load saved content if available
  const savedContent = localStorage.getItem('essayContent');
  if (savedContent) {
    essayEditor.innerHTML = savedContent;
  }
}

// Event listeners for all buttons and actions
function setupEventListeners() {
  // Grammar and writing improvement buttons
  checkGrammarBtn.addEventListener('click', () => {
    checkGrammar();
  });
  
  improveWritingBtn.addEventListener('click', () => {
    improveWriting(essayEditor.innerText);
  });
  
  // Generate essay button
  generateEssayBtn.addEventListener('click', () => {
    essayGeneratorModal.classList.add('active');
  });
  
  // Editor toolbar buttons
  clearTextBtn.addEventListener('click', clearEditor);
  copyTextBtn.addEventListener('click', copyText);
  downloadTextBtn.addEventListener('click', downloadText);
  
  // Feedback panel buttons
  refreshFeedbackBtn.addEventListener('click', () => {
    if (lastFeedbackType === 'grammar') {
      checkGrammar();
    } else if (lastFeedbackType === 'improve') {
      improveWriting(essayEditor.innerText);
    } else {
      autoAnalyzeWriting(essayEditor.innerText);
    }
  });
  
  closeFeedbackBtn.addEventListener('click', () => {
    const feedbackPlaceholder = `
      <div class="feedback-placeholder">
        <span class="material-symbols-rounded">lightbulb</span>
        <p>ستظهر هنا ملاحظات لتحسين كتابتك. ابدأ بكتابة بعض الجمل أو انقر على أحد أزرار التحليل.</p>
      </div>
    `;
    feedbackContainer.innerHTML = feedbackPlaceholder;
  });
  
  // Essay generator modal
  closeGeneratorModalBtn.addEventListener('click', closeGeneratorModal);
  cancelGeneratorBtn.addEventListener('click', closeGeneratorModal);
  
  // Essay generator form
  essayGeneratorForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const topic = document.getElementById('essay-topic').value;
    const type = document.getElementById('essay-type').value;
    const length = document.getElementById('essay-length').value;
    
    // Hide form, show loading
    essayGeneratorForm.style.display = 'none';
    generatorLoading.classList.add('active');
    
    // Generate essay
    generateEssay(topic, type, length);
  });
  
  // Auto-save content as user types
  essayEditor.addEventListener('input', () => {
    localStorage.setItem('essayContent', essayEditor.innerHTML);
  });
}

// Auto-analyze writing as user types
async function autoAnalyzeWriting(text) {
  // Only analyze if enough text is present and it's different from last analysis
  if (text.length < 50 || text === lastAnalyzedText) return;
  
  try {
    // Get quick analysis without UI updates
    const prompt = `
    أنت مدقق لغوي خبير. قم بتحليل النص التالي سريعاً وابحث عن أخطاء نحوية أو إملائية واضحة فقط.
    إذا وجدت أخطاء، حدد أهم 3 أخطاء واذكرها بإيجاز. إذا لم تجد أخطاء واضحة، اكتب "لا توجد أخطاء واضحة".
    
    النص: "${text.substring(0, 1000)}"
    
    أجب باختصار شديد في 3 أسطر كحد أقصى.
    `;
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    const analysis = data.candidates[0].content.parts[0].text;
    
    if (analysis.includes("لا توجد أخطاء واضحة")) {
      // Do nothing, text is good
    } else {
      // Show subtle notification
      showQuickTip("هناك بعض الأخطاء اللغوية. انقر على 'تدقيق لغوي' للمراجعة.");
    }
    
    lastAnalyzedText = text;
  } catch (error) {
    console.error('Error in auto analysis:', error);
    // Fail silently, this is a background feature
  }
}

// تحسين دالة التدقيق اللغوي لمعالجة النصوص العربية بشكل أفضل
async function checkGrammar() {
  const text = essayEditor.innerText;
  
  if (!text || text.trim().length < 10) {
    showNotification('النص قصير جداً للتحليل اللغوي', 'error');
    return;
  }
  
  // عرض حالة التحميل
  showNotification('جاري تحليل النص وتدقيقه لغوياً...', 'info');
  lastFeedbackType = 'grammar';
  
  // تحديث واجهة المستخدم
  feedbackContainer.innerHTML = `
    <div class="feedback-loading">
      <div class="loading-spinner"></div>
      <p>جاري تحليل النص وتدقيقه لغوياً...</p>
    </div>
  `;
  
  feedbackContainer.scrollIntoView({ behavior: 'smooth' });
  
  // إلغاء أي طلب API سابق
  if (controller) {
    controller.abort();
  }
  controller = new AbortController();
  
  // تبسيط المطالبة للحصول على استجابة أكثر موثوقية مع النصوص العربية
  const prompt = `
  أنت مدقق لغوي ونحوي متخصص في اللغة العربية. قم بتدقيق النص التالي وتحديد الأخطاء الإملائية والنحوية والأسلوبية:

  "${text.substring(0, 1500)}"

  قدم التصحيحات بالصيغة التالية:
  1. قائمة مرقمة بالأخطاء (اكتفِ بأهم 5 أخطاء إن وُجدت)
  2. نوع الخطأ
  3. التصحيح المقترح
  4. سبب الخطأ بإيجاز

  ثم اذكر نقاط القوة ونقاط الضعف في النص بشكل موجز.
  
  ملاحظة: إذا كان النص خاليًا من الأخطاء اللغوية، قم بذكر ذلك وأشر إلى نقاط القوة في الكتابة.
  `;
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }),
      signal: controller.signal,
      // إضافة مهلة للطلب
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`فشل الاتصال بالخادم: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('استجابة غير صالحة من واجهة برمجة التطبيقات');
    }
    
    const feedback = data.candidates[0].content.parts[0].text.trim();
    
    // التحقق من وجود رد مفيد
    if (feedback.length < 20) {
      throw new Error('استجابة غير كافية من الذكاء الاصطناعي');
    }
    
    // استخدام دالة التنسيق البسيطة المباشرة بدلاً من محاولة تحليل JSON معقدة
    const formattedFeedback = formatSimpleGrammarFeedback(feedback);
    feedbackContainer.innerHTML = formattedFeedback;
    
    // إضافة مستمعي الأحداث لأزرار التصحيح إن وُجدت
    addCorrectionButtonListeners();
    
    // عرض إشعار نجاح
    showNotification('تم تحليل النص بنجاح!', 'success');
    
    // حفظ آخر نص تم تحليله
    lastAnalyzedText = text;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('تم إلغاء الطلب');
      return;
    }
    
    console.error('خطأ في فحص القواعد:', error);
    
    // عرض واجهة مستخدم خطأ محسنة مع زر إعادة المحاولة
    feedbackContainer.innerHTML = `
      <div class="grammar-analysis-error">
        <div class="error-icon">
          <span class="material-symbols-rounded">error</span>
        </div>
        <h3>حدث خطأ أثناء التحليل</h3>
        <p>نعتذر، واجهنا مشكلة في معالجة النص. يرجى المحاولة مرة أخرى لاحقاً.</p>
        <button id="retry-analysis" class="retry-btn">
          <span class="material-symbols-rounded">refresh</span>
          إعادة المحاولة
        </button>
      </div>
    `;
    
    // إضافة مستمع حدث لزر إعادة المحاولة
    document.getElementById('retry-analysis')?.addEventListener('click', checkGrammar);
    
    // عرض إشعار خطأ
    showNotification('حدث خطأ أثناء تحليل النص', 'error');
  }
}

// وظيفة جديدة مبسطة لتنسيق تحليل النحو بدون الاعتماد على JSON
function formatSimpleGrammarFeedback(feedback) {
  // تنسيق النص مباشرة باستخدام Markdown/HTML
  let formattedText = feedback
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^(#+)\s+(.*)$/gm, (match, hashes, content) => {
      const level = Math.min(hashes.length, 6);
      return `<h${level} class="feedback-heading">${content}</h${level}>`;
    })
    .replace(/^(\d+)\.\s+(.*)$/gm, '<li class="feedback-list-item">$2</li>')
    .replace(/^-\s+(.*)$/gm, '<li class="feedback-list-item">$1</li>')
    .replace(/<\/li>\n<li/g, '</li><li');
    
  // محاولة تحديد الأخطاء وتصحيحاتها في النص
  formattedText = formattedText
    .replace(/([""])(.*?)([""])/g, '$1<span class="error-text">$2</span>$3')
    .replace(/الصواب:?\s*([""])(.*?)([""])/gi, 'الصواب: $1<span class="correction-text">$2</span>$3')
    .replace(/التصحيح:?\s*([""])(.*?)([""])/gi, 'التصحيح: $1<span class="correction-text">$2</span>$3');
  
  // تقسيم النص إلى فقرات
  formattedText = formattedText
    .split('\n\n')
    .map(para => {
      if (para.trim().length === 0) return '';
      if (para.includes('<h') || para.includes('<li') || para.includes('<table')) {
        return para;
      }
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
  
  // تجميع كل شيء في تنسيق التحليل النهائي
  return `
    <div class="grammar-analysis">
      <div class="analysis-header">
        <h3>
          <span class="material-symbols-rounded">spellcheck</span>
          نتائج التدقيق اللغوي
        </h3>
        <p class="analysis-timestamp">تم التحليل في ${new Date().toLocaleTimeString('ar-SA')}</p>
      </div>
      <div class="analysis-content">
        ${formattedText}
      </div>
      <div class="analysis-actions">
        <button id="refresh-analysis" class="refresh-analysis-btn">
          <span class="material-symbols-rounded">refresh</span>
          تحليل مرة أخرى
        </button>
        <button id="close-analysis" class="close-analysis-btn">
          <span class="material-symbols-rounded">close</span>
          إغلاق
        </button>
      </div>
    </div>
  `;
}

// وظيفة لإضافة مستمعي الأحداث لأزرار التصحيح التلقائي
function addCorrectionButtonListeners() {
  // إضافة مستمع حدث لزر تحديث التحليل
  document.getElementById('refresh-analysis')?.addEventListener('click', checkGrammar);
  
  // إضافة مستمع حدث لزر إغلاق التحليل
  document.getElementById('close-analysis')?.addEventListener('click', () => {
    feedbackContainer.innerHTML = '';
  });
  
  // البحث عن أزرار التصحيح التلقائي وإضافتها (إذا وجدت)
  const errorSpans = document.querySelectorAll('.error-text');
  const correctionSpans = document.querySelectorAll('.correction-text');
  
  // إذا وجدنا أزواج من الأخطاء والتصحيحات، نقوم بإنشاء أزرار التصحيح
  if (errorSpans.length > 0 && correctionSpans.length > 0) {
    for (let i = 0; i < Math.min(errorSpans.length, correctionSpans.length); i++) {
      const error = errorSpans[i].textContent;
      const correction = correctionSpans[i].textContent;
      
      // إنشاء زر التصحيح فقط إذا كان لدينا خطأ وتصحيح
      if (error && correction) {
        const button = document.createElement('button');
        button.classList.add('apply-correction-btn');
        button.innerHTML = `
          <span class="material-symbols-rounded">auto_fix_high</span>
          تصحيح تلقائي
        `;
        button.setAttribute('data-original', error);
        button.setAttribute('data-correction', correction);
        
        // إضافة مستمع حدث لزر التصحيح
        button.addEventListener('click', () => {
          const originalText = button.getAttribute('data-original');
          const correctionText = button.getAttribute('data-correction');
          
          if (originalText && correctionText) {
            const success = applyCorrection(originalText, correctionText);
            
            if (success) {
              button.innerHTML = '<span class="material-symbols-rounded">check_circle</span> تم';
              button.classList.add('applied');
              button.disabled = true;
              showNotification('تم تطبيق التصحيح بنجاح!', 'success');
            } else {
              showNotification('تعذر العثور على النص المراد تصحيحه', 'error');
            }
          }
        });
        
        // إضافة الزر بعد التصحيح
        correctionSpans[i].parentNode.insertBefore(button, correctionSpans[i].nextSibling);
      }
    }
  }
}

// Add style selection before improving writing
function improveWriting() {
  const text = essayEditor.innerText;
  
  if (!text || text.trim().length < 10) {
    showNotification('النص قصير جداً للتحليل. يرجى كتابة المزيد.', 'error');
    return;
  }
  
  // Show style selection dialog with improved positioning
  showStyleSelectionDialog(text);
}

// Show style selection dialog with improved positioning
function showStyleSelectionDialog(text) {
  // Create overlay and dialog
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const dialog = document.createElement('div');
  dialog.className = 'style-dialog';
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%) scale(0.9)';
  dialog.style.margin = '0';
  dialog.style.zIndex = '9999';
  
  dialog.innerHTML = `
    <div class="style-dialog-header">
      <h3>اختر أسلوب الكتابة</h3>
      <button class="close-dialog-btn">
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
    <p class="style-dialog-desc">حدد الأسلوب المناسب لمقالك للحصول على تحسينات أكثر دقة</p>
    <div class="style-options">
      <button class="style-option formal" data-style="formal">
        <span class="material-symbols-rounded">format_align_left</span>
        <div class="option-text">
          <span class="option-title">رسمي</span>
          <span class="option-desc">مناسب للمقالات الأكاديمية والتقارير الرسمية</span>
        </div>
      </button>
      <button class="style-option informal" data-style="informal">
        <span class="material-symbols-rounded">chat</span>
        <div class="option-text">
          <span class="option-title">غير رسمي</span>
          <span class="option-desc">مناسب للمدونات والكتابة اليومية</span>
        </div>
      </button>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
  
  // Handle close button
  const closeBtn = dialog.querySelector('.close-dialog-btn');
  closeBtn.addEventListener('click', () => {
    closeStyleDialog(overlay, dialog);
  });
  
  // Show dialog with animation - ensure it appears properly
  requestAnimationFrame(() => {
    overlay.classList.add('show');
    requestAnimationFrame(() => {
      dialog.classList.add('show');
    });
  });
  
  // Handle style selection
  const styleOptions = dialog.querySelectorAll('.style-option');
  styleOptions.forEach(option => {
    option.addEventListener('click', () => {
      const selectedStyle = option.getAttribute('data-style');
      
      // Highlight selected option
      styleOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      
      // Show immediate notification
      showNotification(`تم اختيار النمط ${selectedStyle === 'formal' ? 'الرسمي' : 'غير الرسمي'}`, 'success');
      
      // Process immediately without delay
      closeStyleDialog(overlay, dialog);
      processImproveWriting(text, selectedStyle);
    });
  });
}

// Close style selection dialog
function closeStyleDialog(overlay, dialog) {
  dialog.classList.remove('show');
  overlay.classList.remove('show');
  
  setTimeout(() => {
    document.body.removeChild(dialog);
    document.body.removeChild(overlay);
  }, 300);
}

// تحسين وظيفة تحسين الأسلوب للعمل على النص الكامل
async function processImproveWriting(text, style) {
  // Show loading notification
  showNotification(`جاري تحسين الأسلوب بنمط ${style === 'formal' ? 'رسمي' : 'غير رسمي'}...`, 'info');
  
  // Show loading state
  feedbackContainer.innerHTML = `
    <div class="feedback-loading">
      <div class="loading-spinner"></div>
      <p>جاري تحليل النص وتحسين الأسلوب ${style === 'formal' ? 'الرسمي' : 'غير الرسمي'}...</p>
    </div>
  `;
  
  try {
    if (controller) controller.abort();
    controller = new AbortController();
    
    lastFeedbackType = 'improve';
    
    // تحديث: تقسيم النص الطويل إلى أجزاء إذا كان طويلاً جداً
    const fullText = text;
    let textToAnalyze = fullText;
    
    // تحقق مما إذا كان النص أطول من الحد المسموح به وقم بتقصيره
    if (fullText.length > 3000) {
      // حفظ النص الكامل ولكن إرسال أول 3000 حرف فقط للتحليل
      textToAnalyze = fullText.substring(0, 3000);
      showNotification('النص طويل جداً. سيتم تحليل الجزء الأول منه فقط.', 'info');
    }
    
    // تبسيط المطالبة وطلب تقييم أسلوب النص وتحويله إلى الأسلوب المطلوب
    const styleDescription = style === 'formal' 
      ? 'رسمي مناسب للأكاديميين والأوراق الرسمية' 
      : 'غير رسمي مناسب للمدونات والكتابة اليومية';
    
    const oppositStyle = style === 'formal' ? 'غير رسمي' : 'رسمي';
    
    // حساب عدد الكلمات التقريبي للنص الأصلي
    const wordCount = textToAnalyze.split(/\s+/).filter(word => word.trim() !== '').length;
    
    const prompt = `
    أنت خبير لغوي متخصص في تحسين الأسلوب الكتابي باللغة العربية.
    
    قم بتحليل النص التالي وتحديد ما إذا كان أسلوبه رسميًا أم غير رسمي أولًا، ثم قم بتحسينه وتحويله بالكامل إلى أسلوب ${styleDescription}:
    
    "${textToAnalyze}"
    
    هام جداً: يجب أن يكون النص المعاد صياغته بنفس طول النص الأصلي تقريباً (${wordCount} كلمة تقريباً). لا تقم بإطالة النص أو اختصاره بشكل كبير.
    
    نظم إجابتك في الأقسام التالية بدون استخدام رموز Markdown مثل ** أو __ وبدون استخدام الأرقام في بداية كل قسم:
    
    تحديد الأسلوب الحالي: حدد ما إذا كان النص الحالي يستخدم أسلوبًا رسميًا أم غير رسميًا، مع ذكر السبب باختصار.
    
    نقاط القوة: أهم نقاط القوة في النص الحالي (2-3 نقاط).
    
    نصائح عامة للتحسين: نصائح عامة لتحسين النص وتحويله إلى الأسلوب ${styleDescription}.
    
    تحسينات محددة: قم بعرض النص الأصلي والنص المحسن بوضوح (4-6 اقتراحات). يجب أن تتضمن هذه التحسينات تغييرات تحول النص من أسلوب ${oppositStyle} إلى أسلوب ${style} إذا كان النص الحالي بالفعل بأسلوب ${oppositStyle}.
    
    نسخة كاملة معاد صياغتها: قم بإعادة كتابة النص كاملاً بأسلوب ${styleDescription} مع الالتزام بهذا الهيكل:
       - عنوان مناسب للموضوع
       - مقدمة توضح الفكرة الرئيسية (فقرة واحدة)
       - فقرتان رئيسيتان تشرحان تفاصيل الموضوع
       - خاتمة تلخص الأفكار الرئيسية (فقرة واحدة)
       
       التزم بنفس عدد الكلمات تقريباً كما في النص الأصلي (${wordCount} كلمة). تأكد من وضع سطر فارغ بين العنوان والمقدمة وبين كل فقرة والأخرى.
    
    اقتراح خاتمة: اقترح خاتمة قوية تلخص جميع الأفكار المطروحة في النص بأسلوب ${styleDescription}. قدم الخاتمة بدون استخدام كلمة "قوية:" أو أي وصف آخر.
    `;
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });
    
    const data = await response.json();
    
    // استخراج نص الاستجابة
    const responseText = data.candidates[0].content.parts[0].text;
    
    // استخراج معلومات محددة من النص باستخدام تعبيرات منتظمة أكثر مرونة
    const styleAnalysisRegex = /تحديد الأسلوب الحالي[:\s]*([\s\S]*?)(?=نقاط القوة|نصائح عامة|$)/i;
    const strengthRegex = /نقاط القوة[:\s]*([\s\S]*?)(?=نصائح عامة|تحسينات محددة|$)/i;
    const adviceRegex = /نصائح عامة[:\s]*([\s\S]*?)(?=تحسينات محددة|نسخة كاملة|$)/i;
    const conclusionRegex = /اقتراح خاتمة[:\s]*([\s\S]*?)(?=$)/i;
    const fullRewriteRegex = /نسخة كاملة معاد صياغتها[:\s]*([\s\S]*?)(?=اقتراح خاتمة|$)/i;
    
    // استخراج تحليل الأسلوب
    const styleAnalysisMatch = responseText.match(styleAnalysisRegex);
    const styleAnalysis = styleAnalysisMatch ? styleAnalysisMatch[1].trim() : '';
    
    // استخراج نقاط القوة
    const strengthMatch = responseText.match(strengthRegex);
    const strengthText = strengthMatch ? strengthMatch[1].trim() : '';
    const strengthPoints = strengthText
      .split(/\d+[\.\)-]|\n\s*[-•]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    // استخراج النصائح العامة
    const adviceMatch = responseText.match(adviceRegex);
    const generalAdvice = adviceMatch ? adviceMatch[1].trim() : '';
    
    // استخراج الخاتمة المقترحة - تنظيف الخاتمة من كلمة "قوية:" أو أي توصيف مشابه
    const conclusionMatch = responseText.match(conclusionRegex);
    let suggestedConclusion = conclusionMatch ? conclusionMatch[1].trim() : '';
    
    // تنظيف الخاتمة من كلمات الوصف مثل "قوية:" أو "مقترحة:"
    suggestedConclusion = suggestedConclusion.replace(/^(قوية|مقترحة|اقتراح|خاتمة)[:\s]+/i, '');
    
    // استخراج النسخة المعاد صياغتها بالكامل
    const fullRewriteMatch = responseText.match(fullRewriteRegex);
    const fullRewriteText = fullRewriteMatch ? fullRewriteMatch[1].trim() : '';
    
    // استخراج تحسينات محددة
    const improvementItems = [];
    const improvementSections = responseText.split(/\d+[\.\)-]\s+(?=النص الأصلي|الأصل:|التحسين:|الجملة الأصلية)/i);
    
    for (let i = 1; i < improvementSections.length; i++) {
      const section = improvementSections[i];
      
      const originalRegex = /(النص الأصلي|الأصل|الجملة الأصلية)[:\s]*([\s\S]*?)(?=النص المحسن|التحسين|المقترح|الجملة المحسنة|$)/i;
      const improvedRegex = /(النص المحسن|التحسين|المقترح|الجملة المحسنة)[:\s]*([\s\S]*?)(?=سبب التحسين|التعليل|$)/i;
      const explanationRegex = /(سبب التحسين|التعليل|شرح التحسين)[:\s]*([\s\S]*?)(?=$)/i;
      
      const originalMatch = section.match(originalRegex);
      const improvedMatch = section.match(improvedRegex);
      
      if (originalMatch && improvedMatch) {
        const original = originalMatch[2].trim();
        const improved = improvedMatch[2].trim();
        
        // محاولة استخراج شرح التحسين أو استخدام نص افتراضي
        const explanationMatch = section.match(explanationRegex);
        const explanation = explanationMatch ? explanationMatch[2].trim() : 'تحسين الأسلوب وتوضيح المعنى';
        
        // محاولة تحديد فئة التحسين
        let category = 'تحسين أسلوبي';
        if (section.includes('نحو') || section.includes('قواعد')) category = 'تحسين نحوي';
        else if (section.includes('بلاغ') || section.includes('أسلوب')) category = 'تحسين بلاغي';
        else if (section.includes('ترابط') || section.includes('انسيابية')) category = 'تحسين الترابط';
        else if (section.includes('وضوح') || section.includes('توضيح')) category = 'تحسين الوضوح';
        
        improvementItems.push({
          category,
          explanation,
          original,
          improved
        });
      }
    }
    
    // إذا لم نجد تحسينات بعد، نقوم بالبحث عن أنماط نصية شائعة
    if (improvementItems.length === 0) {
      const textSections = responseText.split('\n\n').filter(s => s.trim().length > 0);
      
      for (let i = 0; i < textSections.length; i++) {
        if (textSections[i].includes(':') && i + 1 < textSections.length && textSections[i+1].includes(':')) {
          const original = textSections[i].split(':')[1]?.trim();
          const improved = textSections[i+1].split(':')[1]?.trim();
          
          if (original && improved && 
              (textSections[i].toLowerCase().includes('أصل') || textSections[i].includes('قبل')) &&
              (textSections[i+1].toLowerCase().includes('تحسين') || textSections[i+1].includes('بعد'))) {
            
            improvementItems.push({
              category: 'تحسين أسلوبي',
              explanation: 'تحسين الأسلوب وتوضيح المعنى',
              original: original,
              improved: improved
            });
            i++; // تخطي القسم التالي لأننا استخدمناه بالفعل
          }
        }
      }
    }
    
    // بناء كائن البيانات الذي سيتم تمريره إلى دالة العرض
    const feedbackData = {
      styleAnalysis,
      strengthPoints,
      generalAdvice,
      improvements: improvementItems,
      suggestedConclusion,
      fullRewriteText,
      requestedStyle: style
    };
    
    // عرض التعليقات
    displayImprovementsFeedback(feedbackData);
    
    // حفظ مرجع النص المحلل
    lastAnalyzedText = text;
    
    // عرض إشعار نجاح
    showNotification('تم تحليل النص وإظهار التحسينات المقترحة', 'success');
    
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error improving writing:', error);
      showNotification('حدث خطأ أثناء تحليل النص. يرجى المحاولة مرة أخرى.', 'error');
      
      // عرض خطأ في حاوية التعليقات
      feedbackContainer.innerHTML = `
        <div class="feedback-error">
          <span class="material-symbols-rounded">error</span>
          <h3>حدث خطأ أثناء تحليل النص</h3>
          <p>لم نتمكن من الاتصال بخدمة الذكاء الاصطناعي. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.</p>
          <button class="retry-btn" onclick="improveWriting()">
            <span class="material-symbols-rounded">refresh</span>
            إعادة المحاولة
          </button>
        </div>
      `;
    }
  } finally {
    controller = null;
  }
}

// تحسين وظيفة عرض التحسينات لتتضمن تحليل الأسلوب والخاتمة المقترحة
function displayImprovementsFeedback(data) {
  // استخراج البيانات من الاستجابة
  const styleAnalysis = data.styleAnalysis || '';
  const strengthPoints = data.strengthPoints || [];
  const generalAdvice = data.generalAdvice || '';
  const improvements = data.improvements || [];
  const suggestedConclusion = data.suggestedConclusion || '';
  const fullRewriteText = data.fullRewriteText || '';
  const requestedStyle = data.requestedStyle || 'formal';
  
  // تنظيف حاوية التعليقات
  feedbackContainer.innerHTML = '';
  
  // إنشاء حاوية للمحتوى
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'feedback-content-wrapper';
  feedbackContainer.appendChild(contentWrapper);
  
  // إضافة قسم تحليل الأسلوب إذا كان موجوداً
  if (styleAnalysis) {
    const styleSection = document.createElement('div');
    styleSection.className = 'feedback-section style-analysis-section';
    styleSection.innerHTML = `
      <div class="feedback-section-header">
        <h4>تحليل الأسلوب الحالي</h4>
      </div>
      <p class="style-analysis-text">${styleAnalysis}</p>
    `;
    contentWrapper.appendChild(styleSection);
  }
  
  // إضافة زر لاستبدال النص بالكامل إذا كان هناك نص معاد صياغته
  if (fullRewriteText) {
    const fullRewriteSection = document.createElement('div');
    fullRewriteSection.className = 'feedback-section full-rewrite-section';
    fullRewriteSection.innerHTML = `
      <div class="feedback-section-header">
        <h4>نسخة كاملة بأسلوب ${requestedStyle === 'formal' ? 'رسمي' : 'غير رسمي'}</h4>
        <p class="style-note">تم إعادة صياغة النص بنفس الطول تقريباً مع الحفاظ على المعنى الأصلي</p>
      </div>
      <div class="full-rewrite-actions">
        <button class="apply-full-rewrite-btn">
          <span class="material-symbols-rounded">auto_awesome</span>
          استبدال النص بالنسخة ${requestedStyle === 'formal' ? 'الرسمية' : 'غير الرسمية'}
        </button>
        <button class="preview-full-rewrite-btn">
          <span class="material-symbols-rounded">visibility</span>
          معاينة النص المحسن
        </button>
      </div>
    `;
    contentWrapper.appendChild(fullRewriteSection);
    
    // إضافة مستمع الحدث لزر تطبيق النص المعاد صياغته بالكامل
    const applyFullRewriteBtn = fullRewriteSection.querySelector('.apply-full-rewrite-btn');
    applyFullRewriteBtn.addEventListener('click', function() {
      if (confirm('هل أنت متأكد من رغبتك في استبدال النص الحالي بالكامل بالنسخة المحسنة؟')) {
        // تقسيم النص إلى فقرات
        const paragraphs = fullRewriteText.split('\n\n');
        
        // تفريغ المحرر
        essayEditor.innerHTML = '';
        
        // إضافة كل فقرة
        paragraphs.forEach(paragraph => {
          if (paragraph.trim()) {
            // التعامل مع العنوان بشكل خاص
            if (paragraph.trim() && !paragraph.includes('.') && paragraph.length < 100 && paragraph === paragraph.split('\n')[0]) {
              const h2 = document.createElement('h2');
              h2.textContent = paragraph.trim();
              h2.style.textAlign = 'center';
              h2.style.marginBottom = '20px';
              essayEditor.appendChild(h2);
            } else {
              const p = document.createElement('p');
              p.textContent = paragraph.trim();
              essayEditor.appendChild(p);
            }
          }
        });
        
        // تحديث حالة الزر
        this.innerHTML = '<span class="material-symbols-rounded">check</span> تم الاستبدال';
        this.disabled = true;
        this.classList.add('applied');
        
        // عرض إشعار
        showNotification('تم استبدال النص بالكامل بالنسخة المحسنة!', 'success');
        
        // حفظ النص
        localStorage.setItem('essayContent', essayEditor.innerHTML);
        
        // تمرير إلى أعلى النص
        essayEditor.scrollTop = 0;
      }
    });
    
    // تحسين نافذة المعاينة بإزالة الأيقونات والتسميات الزائدة
    const previewFullRewriteBtn = fullRewriteSection.querySelector('.preview-full-rewrite-btn');
    previewFullRewriteBtn.addEventListener('click', function() {
      // حساب عدد كلمات النص الأصلي والمحسن
      const originalWordCount = essayEditor.innerText.split(/\s+/).filter(word => word.trim() !== '').length;
      const improvedWordCount = fullRewriteText.split(/\s+/).filter(word => word.trim() !== '').length;
      
      // إنشاء نافذة المعاينة
      const previewOverlay = document.createElement('div');
      previewOverlay.className = 'preview-overlay';
      previewOverlay.style.opacity = '0';
      
      const previewDialog = document.createElement('div');
      previewDialog.className = 'preview-dialog';
      previewDialog.style.opacity = '0';
      previewDialog.style.transform = 'translate(-50%, -55%) scale(0.95)';
      previewDialog.innerHTML = `
        <div class="preview-header">
          <h3>معاينة النص بأسلوب ${requestedStyle === 'formal' ? 'رسمي' : 'غير رسمي'}</h3>
          <button class="close-preview-btn" aria-label="إغلاق" id="close-btn" style="opacity: 100 !important;">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <div class="preview-info">
          <div class="preview-info-item">
            <span class="info-value">${originalWordCount} كلمة</span>
          </div>
          <div class="preview-info-item">
            <span class="info-value">${improvedWordCount} كلمة</span>
          </div>
          <div class="preview-info-item">
            <span class="info-label">الفرق:</span>
            <span class="info-value ${Math.abs(originalWordCount - improvedWordCount) > originalWordCount * 0.2 ? 'different' : ''}">
              ${Math.abs(originalWordCount - improvedWordCount)} كلمة (${Math.round(Math.abs(originalWordCount - improvedWordCount) / originalWordCount * 100)}%)
            </span>
          </div>
        </div>
        <div class="preview-content">
          ${fullRewriteText.split('\n\n').map(para => {
            // التعامل مع العنوان بشكل خاص
            if (para.trim() && !para.includes('.') && para.length < 100 && para === para.split('\n')[0]) {
              return `<h2 class="preview-title">${para.trim()}</h2>`;
            }
            return `<p>${para.trim()}</p>`;
          }).join('')}
        </div>
        <div class="preview-actions">
          <button class="apply-preview-btn" id="apply-preview" style="opacity: 100 !important;">
            <span class="material-symbols-rounded" style="font-size: 20px;">done_all</span>
            استبدال النص الحالي
          </button>
          <button class="cancel-preview-btn" id="cancel-preview" style="opacity: 100 !important;">
            <span class="material-symbols-rounded" style="font-size: 20px;">close</span>
            إلغاء
          </button>
        </div>
      `;
      
      // إضافة النافذة للصفحة
      document.body.appendChild(previewOverlay);
      document.body.appendChild(previewDialog);
      
      // تأخير صغير ثم إظهار النافذة مع تأثير الانتقال
      setTimeout(() => {
        previewOverlay.style.opacity = '100';
        previewDialog.style.opacity = '100';
        previewDialog.style.transform = 'translate(-50%, -50%) scale(1)';
        
        // إضافة أصناف العرض
        setTimeout(() => {
          previewOverlay.classList.add('show');
          previewDialog.classList.add('show');
        }, 50);
        
        // إصلاح معالجة زر الإغلاق
        const closeBtn = document.getElementById('close-btn');
        if (closeBtn) {
          closeBtn.onclick = function(e) {
            e.preventDefault();
            closePreviewDialogWithAnimation(previewOverlay, previewDialog);
            return false;
          };
        }
        
        // إصلاح معالجة زر الإلغاء
        const cancelBtn = document.getElementById('cancel-preview');
        if (cancelBtn) {
          cancelBtn.onclick = function(e) {
            e.preventDefault();
            closePreviewDialogWithAnimation(previewOverlay, previewDialog);
            return false;
          };
        }
        
        // معالجة زر التطبيق
        const applyBtn = document.getElementById('apply-preview');
        if (applyBtn) {
          applyBtn.onclick = function(e) {
            e.preventDefault();
            
            // إضافة تأثير تحميل للزر
            this.innerHTML = '<span class="material-symbols-rounded" style="font-size: 20px;">hourglass_top</span> جاري التطبيق...';
            this.style.opacity = '0.8';
            this.disabled = true;
            
            setTimeout(() => {
              // تقسيم النص إلى فقرات
              const paragraphs = fullRewriteText.split('\n\n');
              
              // تفريغ المحرر
              essayEditor.innerHTML = '';
              
              // إضافة كل فقرة مع تباعد كبير
              paragraphs.forEach((paragraph, index) => {
                if (paragraph.trim()) {
                  // التعامل مع العنوان بشكل خاص
                  if (paragraph.trim() && !paragraph.includes('.') && paragraph.length < 100 && paragraph === paragraph.split('\n')[0]) {
                    const h2 = document.createElement('h2');
                    h2.textContent = paragraph.trim();
                    h2.style.textAlign = 'center';
                    h2.style.marginBottom = '35px';
                    h2.style.opacity = '0';
                    h2.style.transform = 'translateY(20px)';
                    h2.style.transition = 'all 0.5s ease';
                    essayEditor.appendChild(h2);
                    
                    // تأثير ظهور تدريجي للعناصر
                    setTimeout(() => {
                      h2.style.opacity = '1';
                      h2.style.transform = 'translateY(0)';
                    }, 100 + index * 50);
                  } else {
                    const p = document.createElement('p');
                    p.textContent = paragraph.trim();
                    p.style.marginBottom = '35px';
                    p.style.opacity = '0';
                    p.style.transform = 'translateY(20px)';
                    p.style.transition = 'all 0.5s ease';
                    essayEditor.appendChild(p);
                    
                    // تأثير ظهور تدريجي للعناصر
                    setTimeout(() => {
                      p.style.opacity = '1';
                      p.style.transform = 'translateY(0)';
                    }, 100 + index * 50);
                  }
                }
              });
              
              // إغلاق النافذة
              closePreviewDialogWithAnimation(previewOverlay, previewDialog);
              
              // تحديث حالة زر التطبيق الرئيسي
              applyFullRewriteBtn.innerHTML = '<span class="material-symbols-rounded">check</span> تم الاستبدال';
              applyFullRewriteBtn.disabled = true;
              applyFullRewriteBtn.classList.add('applied');
              
              // عرض إشعار نجاح مع أيقونة
              showNotification('<span class="material-symbols-rounded" style="margin-left: 5px;">auto_awesome</span> تم استبدال النص بالكامل بالنسخة المحسنة!', 'success');
              
              // حفظ النص
              localStorage.setItem('essayContent', essayEditor.innerHTML);
            }, 500);
            
            return false;
          };
        }
        
        // معالجة النقر خارج النافذة
        previewOverlay.onclick = function(e) {
          if (e.target === previewOverlay) {
            closePreviewDialogWithAnimation(previewOverlay, previewDialog);
            return false;
          }
        };
      }, 0);
    });
  }
  
  // عرض نقاط القوة
  if (strengthPoints.length > 0) {
    const strengthSection = document.createElement('div');
    strengthSection.className = 'feedback-section';
    strengthSection.innerHTML = `
      <div class="feedback-section-header">
        <h4>نقاط القوة</h4>
      </div>
      <ul class="feedback-points-list">
        ${strengthPoints.map(point => `<li>${point}</li>`).join('')}
      </ul>
    `;
    contentWrapper.appendChild(strengthSection);
  }
  
  // عرض النصائح العامة
  if (generalAdvice) {
    const adviceSection = document.createElement('div');
    adviceSection.className = 'feedback-section';
    adviceSection.innerHTML = `
      <div class="feedback-section-header">
        <h4>نصائح عامة للتحسين</h4>
      </div>
      <p class="feedback-general-advice">${generalAdvice}</p>
    `;
    contentWrapper.appendChild(adviceSection);
  }
  
  // عرض التحسينات المقترحة
  if (improvements.length > 0) {
    // إنشاء متغير لتتبع عدد التحسينات النشطة
    let activeImprovements = improvements.length;
    
    // إضافة زر لتطبيق جميع التحسينات
    const applyAllContainer = document.createElement('div');
    applyAllContainer.className = 'apply-all-container';
    applyAllContainer.innerHTML = `
      <button class="apply-all-btn">
        <span class="material-symbols-rounded">auto_fix_high</span>
        تطبيق جميع التحسينات (${improvements.length})
      </button>
    `;
    contentWrapper.appendChild(applyAllContainer);
    
    // إنشاء قسم التحسينات
    const improvementsSection = document.createElement('div');
    improvementsSection.className = 'feedback-section';
    improvementsSection.innerHTML = `
      <div class="feedback-section-header">
        <h4>تحسينات مقترحة <span>(${improvements.length})</span></h4>
      </div>
    `;
    contentWrapper.appendChild(improvementsSection);
    
    // إضافة عناصر التحسين
    improvements.forEach(improvement => {
      const item = document.createElement('div');
      item.className = 'improvement-item';
      item.innerHTML = `
        <div class="improvement-header">
          <span class="improvement-category">${improvement.category || 'تحسين عام'}</span>
          <button class="feedback-apply">
            <span class="material-symbols-rounded">auto_fix_high</span>
            تطبيق
          </button>
        </div>
        <p class="improvement-explanation">${improvement.explanation || ''}</p>
        <div class="improvement-text-comparison">
          <div class="original-text">
            <span class="comparison-label">النص الأصلي:</span>
            <p>${improvement.original}</p>
          </div>
          <div class="improved-text">
            <span class="comparison-label">النص المحسن:</span>
            <p>${improvement.improved}</p>
          </div>
        </div>
      `;
      improvementsSection.appendChild(item);
      
      // إضافة مستمع الحدث لزر التطبيق
      const applyBtn = item.querySelector('.feedback-apply');
      applyBtn.addEventListener('click', function() {
        const wasApplied = applyCorrection(improvement.original, improvement.improved);
        
        if (wasApplied) {
          // تحديث حالة الزر
          this.innerHTML = '<span class="material-symbols-rounded">check</span> تم التطبيق';
          this.disabled = true;
          this.classList.add('applied');
          
          // إضافة تأثير الإزالة بعد مهلة قصيرة
          setTimeout(() => {
            item.classList.add('removing');
            
            // إزالة العنصر بعد اكتمال التأثير
            setTimeout(() => {
              if (item.parentNode) {
                improvementsSection.removeChild(item);
                
                // تقليل عدد التحسينات النشطة
                activeImprovements--;
                
                // تحديث العنوان إذا كان موجودًا
                const header = improvementsSection.querySelector('.feedback-section-header');
                if (header) {
                  header.innerHTML = `<h4>تحسينات مقترحة ${activeImprovements > 0 ? `<span>(${activeImprovements})</span>` : ''}</h4>`;
                }
                
                // إذا لم تتبق أخطاء، أزل القسم بأكمله
                if (activeImprovements === 0) {
                  // إزالة القسم من حاوية المحتوى
                  if (improvementsSection.parentNode) {
                    contentWrapper.removeChild(improvementsSection);
                  }
                  
                  // إزالة زر التطبيق الشامل
                  if (applyAllContainer.parentNode) {
                    contentWrapper.removeChild(applyAllContainer);
                  }
                }
              }
            }, 500);
          }, 800);
        } else {
          // عرض خطأ إذا لم يتم العثور على النص
          showNotification('لم نتمكن من العثور على النص الأصلي. ربما تم تغييره.', 'error');
        }
      });
    });
    
    // إضافة مستمع الحدث لزر تطبيق الكل
    const applyAllBtn = applyAllContainer.querySelector('.apply-all-btn');
    applyAllBtn.addEventListener('click', () => {
      let appliedCount = 0;
      let successCount = 0;
      
      // تعطيل الزر لمنع النقرات المتعددة
      applyAllBtn.disabled = true;
      applyAllBtn.innerHTML = `
        <div class="btn-loading-spinner"></div>
        جاري التطبيق...
      `;
      
      // تطبيق التحسينات بشكل متتالٍ مع تأخير
      improvements.forEach((improvement, i) => {
        setTimeout(() => {
          const wasApplied = applyCorrection(improvement.original, improvement.improved);
          appliedCount++;
          
          if (wasApplied) {
            successCount++;
          }
          
          // تحديث واجهة المستخدم لهذا العنصر
          const items = improvementsSection.querySelectorAll('.improvement-item');
          if (items[i]) {
            const applyBtn = items[i].querySelector('.feedback-apply');
            if (applyBtn) {
              applyBtn.innerHTML = '<span class="material-symbols-rounded">check</span> تم التصحيح';
              applyBtn.disabled = true;
              applyBtn.classList.add('applied');
            }
            
            // تمييز العنصر للإزالة
            items[i].classList.add('removing');
          }
          
          // عند معالجة جميع العناصر، قم بالتنظيف وعرض النجاح
          if (appliedCount === improvements.length) {
            // عرض إشعار بالنتائج
            showNotification(`تم تصحيح ${successCount} من ${improvements.length} تحسينات بنجاح!`, 'success');
            
            // بعد فترة قصيرة، قم بتنظيف واجهة المستخدم
            setTimeout(() => {
              // إزالة قسم التحسينات
              if (improvementsSection.parentNode) {
                contentWrapper.removeChild(improvementsSection);
              }
              
              // إزالة زر التطبيق الشامل
              if (applyAllContainer.parentNode) {
                contentWrapper.removeChild(applyAllContainer);
              }
            }, 600);
          }
        }, i * 800); // توقيت متدرج
      });
    });
  }
  
  // إضافة قسم الخاتمة المقترحة إذا كانت موجودة
  if (suggestedConclusion) {
    const conclusionSection = document.createElement('div');
    conclusionSection.className = 'feedback-section conclusion-section';
    conclusionSection.innerHTML = `
      <div class="feedback-section-header">
        <h4>خاتمة مقترحة</h4>
      </div>
      <div class="suggested-conclusion">
        <p>${suggestedConclusion}</p>
        <div class="conclusion-actions">
          <button class="append-conclusion-btn">
            <span class="material-symbols-rounded">add</span>
            إضافة الخاتمة للنص
          </button>
          <button class="replace-conclusion-btn">
            <span class="material-symbols-rounded">swap_horiz</span>
            استبدال الخاتمة الحالية
          </button>
        </div>
      </div>
    `;
    contentWrapper.appendChild(conclusionSection);
    
    // إضافة مستمع الحدث لزر إضافة الخاتمة
    const appendBtn = conclusionSection.querySelector('.append-conclusion-btn');
    appendBtn.addEventListener('click', function() {
      // إضافة الخاتمة في نهاية النص
      const currentText = essayEditor.innerHTML;
      essayEditor.innerHTML = currentText + `<p>${suggestedConclusion}</p>`;
      
      // تحديث حالة الزر
      this.innerHTML = '<span class="material-symbols-rounded">check</span> تمت الإضافة';
      this.disabled = true;
      this.classList.add('applied');
      
      // تعطيل زر الاستبدال
      const replaceBtn = conclusionSection.querySelector('.replace-conclusion-btn');
      replaceBtn.disabled = true;
      
      // عرض إشعار
      showNotification('تمت إضافة الخاتمة بنجاح!', 'success');
      
      // حفظ النص
      localStorage.setItem('essayContent', essayEditor.innerHTML);
      
      // تمرير إلى نهاية النص
      essayEditor.scrollTop = essayEditor.scrollHeight;
    });
    
    // إضافة مستمع الحدث لزر استبدال الخاتمة
    const replaceBtn = conclusionSection.querySelector('.replace-conclusion-btn');
    replaceBtn.addEventListener('click', function() {
      // البحث عن الفقرة الأخيرة (على افتراض أنها الخاتمة)
      const paragraphs = essayEditor.querySelectorAll('p');
      
      if (paragraphs.length > 0) {
        // استبدال الفقرة الأخيرة بالخاتمة المقترحة
        paragraphs[paragraphs.length - 1].innerHTML = suggestedConclusion;
        
        // تحديث حالة الزر
        this.innerHTML = '<span class="material-symbols-rounded">check</span> تم الاستبدال';
        this.disabled = true;
        this.classList.add('applied');
        
        // تعطيل زر الإضافة
        const appendBtn = conclusionSection.querySelector('.append-conclusion-btn');
        appendBtn.disabled = true;
        
        // عرض إشعار
        showNotification('تم استبدال الخاتمة بنجاح!', 'success');
        
        // حفظ النص
        localStorage.setItem('essayContent', essayEditor.innerHTML);
        
        // تمرير إلى نهاية النص
        essayEditor.scrollTop = essayEditor.scrollHeight;
      } else {
        // إذا لم توجد فقرات، أضف الخاتمة كفقرة جديدة
        essayEditor.innerHTML += `<p>${suggestedConclusion}</p>`;
        
        // تحديث حالة الزر
        this.innerHTML = '<span class="material-symbols-rounded">check</span> تم الإضافة';
        this.disabled = true;
        this.classList.add('applied');
        
        // تعطيل زر الإضافة
        const appendBtn = conclusionSection.querySelector('.append-conclusion-btn');
        appendBtn.disabled = true;
        
        // عرض إشعار
        showNotification('تمت إضافة الخاتمة كفقرة جديدة!', 'success');
        
        // حفظ النص
        localStorage.setItem('essayContent', essayEditor.innerHTML);
        
        // تمرير إلى نهاية النص
        essayEditor.scrollTop = essayEditor.scrollHeight;
      }
    });
  }
}

// تحسين وظيفة إنشاء المقال لإضافة خاتمة تلخص المحتوى
async function generateEssay() {
  const topicInput = document.getElementById('essay-topic');
  const typeSelect = document.getElementById('essay-type');
  const lengthSelect = document.getElementById('essay-length');
  
  const topic = topicInput.value.trim();
  const type = typeSelect.value;
  const length = lengthSelect.value;
  
  if (!topic) {
    showNotification('يرجى إدخال موضوع المقال', 'error');
    return;
  }
  
  // إظهار شاشة التحميل
  document.getElementById('essay-generator-form').style.display = 'none';
  document.getElementById('generator-loading').style.display = 'flex';
  
  try {
    // تحديد طول المقال
    let wordCountRange;
    switch (length) {
      case 'short':
        wordCountRange = '300-500';
        break;
      case 'long':
        wordCountRange = '800-1200';
        break;
      case 'medium':
      default:
        wordCountRange = '500-800';
        break;
    }
    
    // تحديد نوع المقال بالعربية
    let essayTypeDesc;
    switch (type) {
      case 'persuasive':
        essayTypeDesc = 'إقناعي يهدف إلى إقناع القارئ بوجهة نظر معينة';
        break;
      case 'descriptive':
        essayTypeDesc = 'وصفي يركز على وصف شيء أو شخص أو مكان أو تجربة';
        break;
      case 'narrative':
        essayTypeDesc = 'سردي يروي قصة أو حدث أو تجربة';
        break;
      case 'expository':
        essayTypeDesc = 'تفسيري يشرح موضوعًا أو فكرة بطريقة موضوعية';
        break;
      case 'academic':
      default:
        essayTypeDesc = 'أكاديمي يعتمد على الأبحاث والمعلومات الموثقة';
        break;
    }
    
    // إنشاء المطالبة لنموذج الذكاء الاصطناعي
    const prompt = `
    أنشئ مقالاً عربياً ${essayTypeDesc} حول موضوع "${topic}" بطول تقريبي ${wordCountRange} كلمة.
    
    المقال يجب أن يتكون من:
    1. مقدمة تجذب القارئ وتقدم الموضوع.
    2. عرض منظم للأفكار الرئيسية مع أمثلة وأدلة.
    3. خاتمة قوية تلخص الأفكار الرئيسية وتترك انطباعًا لدى القارئ.
    
    احرص على:
    - استخدام لغة عربية فصيحة وسليمة.
    - تقسيم المقال إلى فقرات واضحة.
    - تجنب التكرار واستخدام أساليب متنوعة.
    - تضمين خاتمة تلخص جميع النقاط الرئيسية المذكورة في المقال.
    
    أنشئ مقالاً متكاملاً يحتوي على فقرات منظمة ويعتمد على معلومات دقيقة.
    `;
    
    // إرسال الطلب إلى واجهة برمجة التطبيقات
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      throw new Error('فشل الاتصال بالخادم');
    }
    
    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('لم يتم الحصول على استجابة صالحة');
    }
    
    // استخراج النص من الاستجابة
    const essay = data.candidates[0].content.parts[0].text.trim();
    
    // تحديث المحرر بالمقال الجديد
    essayEditor.innerHTML = '';
    
    // تنسيق المقال: تحويل كل سطر جديد إلى فقرة
    const paragraphs = essay.split('\n\n');
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        const p = document.createElement('p');
        p.textContent = paragraph.trim();
        essayEditor.appendChild(p);
      }
    });
    
    // حفظ المقال في التخزين المحلي
    localStorage.setItem('essayContent', essayEditor.innerHTML);
    
    // تحديث عداد الكلمات
    updateWordCount();
    
    // إغلاق النافذة وعرض إشعار
    closeGeneratorModal();
    showNotification('تم إنشاء المقال بنجاح!', 'success');
    
  } catch (error) {
    console.error('Error generating essay:', error);
    
    // استعادة النموذج وعرض إشعار
    document.getElementById('essay-generator-form').style.display = 'block';
    document.getElementById('generator-loading').style.display = 'none';
    
    showNotification('حدث خطأ أثناء إنشاء المقال. يرجى المحاولة مرة أخرى.', 'error');
  }
}

// Display loading state in feedback container
function showFeedbackLoading() {
  feedbackContainer.innerHTML = `
    <div class="feedback-loading">
      <div class="loading-spinner"></div>
      <p>جاري تحليل النص...</p>
    </div>
  `;
}

// Display error message in feedback container
function showFeedbackError() {
  feedbackContainer.innerHTML = `
    <div class="feedback-error">
      <span class="material-symbols-rounded">error</span>
      <p>حدث خطأ أثناء تحليل النص. الرجاء المحاولة مرة أخرى.</p>
    </div>
  `;
}

// Show a quick tip notification
function showQuickTip(message) {
  const tipElement = document.createElement('div');
  tipElement.className = 'quick-tip';
  tipElement.textContent = message;
  
  document.body.appendChild(tipElement);
  
  setTimeout(() => {
    tipElement.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    tipElement.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(tipElement);
    }, 300);
  }, 5000);
}

// Count words in text
function countWords(text) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Update word count display
function updateWordCount() {
  const wordCount = countWords(essayEditor.innerText);
  // إخفاء عداد الكلمات بالكامل
  wordCounter.style.display = 'none';
}

// Clear editor content
function clearEditor() {
  if (confirm('هل أنت متأكد من رغبتك في مسح المحتوى؟')) {
    essayEditor.innerHTML = '';
    updateWordCount();
    localStorage.removeItem('essayContent');
  }
}

// Copy text to clipboard
function copyText() {
  const text = essayEditor.innerText;
  navigator.clipboard.writeText(text)
    .then(() => {
      showNotification('تم نسخ النص إلى الحافظة');
    })
    .catch(err => {
      console.error('فشل نسخ النص: ', err);
      showNotification('فشل نسخ النص', 'error');
    });
}

// Download text as file
function downloadText() {
  const text = essayEditor.innerText;
  const title = text.split('\n')[0].substring(0, 30).replace(/[^\w\s]/gi, '') || 'essay';
  const fileName = `${title.trim().replace(/\s+/g, '_')}.txt`;
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

// Close essay generator modal
function closeGeneratorModal() {
  essayGeneratorModal.classList.remove('active');
  essayGeneratorForm.style.display = 'block';
  generatorLoading.classList.remove('active');
}

// Enhanced notification system with different types and animation
function showNotification(message, type = 'info') {
  const notificationCenter = document.querySelector('.notification-center');
  if (!notificationCenter) return;
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  let icon = 'info';
  switch (type) {
    case 'success': icon = 'check_circle'; break;
    case 'error': icon = 'error'; break;
    case 'warning': icon = 'warning'; break;
    case 'welcome': icon = 'waving_hand'; break;
    default: icon = 'info';
  }
  
  notification.innerHTML = `
    <span class="notification-icon material-symbols-rounded">${icon}</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close" aria-label="إغلاق">
      <span class="material-symbols-rounded">close</span>
    </button>
  `;
  
  // Add to notification center
  notificationCenter.appendChild(notification);
  
  // Show with animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Auto-hide after timeout (except for errors)
  const timeout = type === 'error' ? 8000 : (type === 'welcome' ? 10000 : 4000);
  const hideTimeout = setTimeout(() => {
    hideNotification(notification);
  }, timeout);
  
  // Close button
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(hideTimeout);
    hideNotification(notification);
  });
  
  // Return the notification element
  return notification;
}

// Hide notification with animation
function hideNotification(notification) {
  notification.classList.remove('show');
  notification.classList.add('hide');
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

// Enhanced applyCorrection function with more robust text finding
function applyCorrection(original, improved) {
  if (!original || !improved) {
    console.error('Missing original or improved text');
    return false;
  }
  
  // Store scroll position
  const scrollPos = essayEditor.scrollTop;
  
  // Method 1: Direct innerHTML replace with regex
  try {
    let content = essayEditor.innerHTML;
    const escapedOriginal = original
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\s+/g, '\\s+'); // Make whitespace flexible
      
    const regex = new RegExp(escapedOriginal, 'g');
    const highlightedImproved = `<span class="correction-animation">${improved}</span>`;
    
    if (regex.test(content)) {
      content = content.replace(regex, highlightedImproved);
      essayEditor.innerHTML = content;
      essayEditor.scrollTop = scrollPos;
      
      // Remove animation class after it finishes
      setTimeout(() => {
        const animationElements = essayEditor.querySelectorAll('.correction-animation');
        animationElements.forEach(el => {
          if (el.parentNode) {
            el.parentNode.replaceChild(document.createTextNode(improved), el);
          }
        });
        
        // Save to localStorage
        localStorage.setItem('essayContent', essayEditor.innerHTML);
      }, 1500);
      
      return true;
    }
  } catch (e) {
    console.warn('Method 1 failed:', e);
  }
  
  // Method 2: TreeWalker to find text nodes
  try {
    const walker = document.createTreeWalker(
      essayEditor,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let textNode;
    
    // Find the text node containing our text
    while (textNode = walker.nextNode()) {
      const nodeText = textNode.nodeValue;
      const index = nodeText.indexOf(original);
      
      if (index > -1) {
        // Split the text node if needed
        if (index > 0) {
          textNode.splitText(index);
          textNode = walker.nextNode();
        }
        
        // If the text doesn't fill the entire node, split again
        if (index + original.length < textNode.length) {
          textNode.splitText(original.length);
        }
        
        // Create the animated span
        const span = document.createElement('span');
        span.className = 'correction-animation';
        span.textContent = improved;
        
        // Replace the text node with our span
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(span, textNode);
          
          // Remove animation after it completes
          setTimeout(() => {
            if (span.parentNode) {
              span.parentNode.replaceChild(document.createTextNode(improved), span);
              localStorage.setItem('essayContent', essayEditor.innerHTML);
            }
          }, 1500);
          
          return true;
        }
      }
    }
  } catch (e) {
    console.warn('Method 2 failed:', e);
  }
  
  // Method 3: Simple text search and replace (fallback)
  try {
    const plainText = essayEditor.innerText;
    const startIndex = plainText.indexOf(original);
    
    if (startIndex >= 0) {
      // We found the text in the plain content
      // Get content up to the point where we need to replace
      essayEditor.innerHTML = essayEditor.innerHTML.replace(
        original,
        `<span class="correction-animation">${improved}</span>`
      );
      
      // After animation completes, replace with normal text
      setTimeout(() => {
        const spans = essayEditor.querySelectorAll('.correction-animation');
        spans.forEach(span => {
          if (span.parentNode) {
            span.parentNode.replaceChild(document.createTextNode(improved), span);
          }
        });
        localStorage.setItem('essayContent', essayEditor.innerHTML);
      }, 1500);
      
      return true;
    }
  } catch (e) {
    console.warn('Method 3 failed:', e);
  }
  
  // If all methods failed, show an error
  console.error('Could not find the original text to replace');
  return false;
}

// تحديث وظيفة التدقيق اللغوي للتركيز على الكلمات الخاطئة فقط
async function processGrammarCheck(text) {
  // عرض إشعار التحميل
  showNotification('جاري تدقيق النص لغوياً...', 'info');
  
  // عرض حالة التحميل
  feedbackContainer.innerHTML = `
    <div class="feedback-loading">
      <div class="loading-spinner"></div>
      <p>جاري فحص الأخطاء اللغوية والإملائية...</p>
    </div>
  `;
  
  try {
    if (controller) controller.abort();
    controller = new AbortController();
    
    lastFeedbackType = 'grammar';
    
    // تقسيم النص الطويل إذا كان أطول من اللازم
    const fullText = text;
    let textToAnalyze = fullText;
    
    if (fullText.length > 3000) {
      textToAnalyze = fullText.substring(0, 3000);
      showNotification('النص طويل جداً. سيتم تدقيق الجزء الأول منه فقط.', 'info');
    }
    
    // المطالبة المحدثة للتركيز على الأخطاء اللغوية والإملائية فقط
    const prompt = `
    أنت مدقق لغوي متخصص في اللغة العربية. قم بفحص النص التالي وتحديد الأخطاء اللغوية والإملائية فقط:
    
    "${textToAnalyze}"
    
    قدم تقريراً يتضمن:
    1. قائمة بجميع الأخطاء اللغوية والإملائية المحددة
    2. الصيغة الصحيحة لكل خطأ
    3. شرح موجز لسبب الخطأ والقاعدة اللغوية الصحيحة
    
    ركز فقط على الأخطاء الواضحة وتجنب اقتراح تحسينات أسلوبية. أنا مهتم فقط بتصحيح الأخطاء اللغوية والإملائية الصريحة.
    
    قدم إجابتك بتنسيق منظم وواضح. تجنب الإطالة في الشرح واقتصر على الأخطاء الفعلية.
    `;
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });
    
    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    
    // تحليل الاستجابة واستخراج الأخطاء
    const errors = [];
    let currentError = null;
    
    // استخدام تعبير منتظم لاستخراج الأخطاء من النص
    const errorPattern = /[^\n]+?:\s*"([^"]+)"\s*[—–-]\s*"([^"]+)"\s*[—–-]\s*([^\n]+)/g;
    let match;
    
    while ((match = errorPattern.exec(responseText)) !== null) {
      errors.push({
        wrong: match[1].trim(),
        correct: match[2].trim(),
        explanation: match[3].trim()
      });
    }
    
    // إذا لم يتم العثور على أخطاء بالتعبير المنتظم، استخدام طريقة أبسط
    if (errors.length === 0) {
      const lines = responseText.split('\n').filter(line => 
        (line.includes(':') || line.includes('-')) && 
        line.trim().length > 0
      );
      
      for (const line of lines) {
        // البحث عن أنماط الخطأ المعتادة مثل "كلمة خاطئة -> كلمة صحيحة"
        if (line.includes('->') || line.includes('=>') || line.includes(':') || line.includes('-')) {
          const parts = line.split(/->|=>|:|—|–|-/).map(part => part.trim());
          
          if (parts.length >= 2) {
            const wrong = parts[0].replace(/["'"]/g, '').trim();
            const correct = parts[1].replace(/["'"]/g, '').trim();
            let explanation = parts[2] || 'تصحيح خطأ لغوي أو إملائي';
            
            // تجنب إضافة العناوين أو النقاط الرئيسية كأخطاء
            if (wrong && correct && 
                !wrong.includes('الأخطاء') && 
                !wrong.includes('تصحيح') && 
                wrong.length < 100) {
              errors.push({ wrong, correct, explanation });
            }
          }
        }
      }
    }
    
    // تحليل مستوى الدقة اللغوية
    let accuracyLevel = 'مرتفع';
    let errorCount = errors.length;
    
    if (errorCount > 10) {
      accuracyLevel = 'منخفض';
    } else if (errorCount > 5) {
      accuracyLevel = 'متوسط';
    }
    
    // عرض نتائج التدقيق اللغوي
    displayGrammarFeedback({
      errors,
      accuracyLevel,
      errorCount
    });
    
    // حفظ النص المحلل
    lastAnalyzedText = text;
    
    // عرض إشعار نجاح
    showNotification('تم الانتهاء من التدقيق اللغوي!', 'success');
    
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error checking grammar:', error);
      showNotification('حدث خطأ أثناء التدقيق اللغوي. يرجى المحاولة مرة أخرى.', 'error');
      
      // عرض رسالة خطأ
      feedbackContainer.innerHTML = `
        <div class="feedback-error">
          <span class="material-symbols-rounded">error</span>
          <h3>حدث خطأ أثناء التدقيق اللغوي</h3>
          <p>لم نتمكن من الاتصال بخدمة الذكاء الاصطناعي. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.</p>
          <button class="retry-btn" onclick="checkGrammar()">
            <span class="material-symbols-rounded">refresh</span>
            إعادة المحاولة
          </button>
        </div>
      `;
    }
  } finally {
    controller = null;
  }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// تحديث وظيفة إغلاق نافذة المعاينة
function closePreviewDialog(overlay, dialog) {
  if (!overlay || !dialog) return;
  
  // تأجيل إزالة العناصر من DOM
  setTimeout(() => {
    try {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
    } catch (e) {
      console.error('Error removing preview dialog:', e);
    }
  }, 100);
}

// تأثير حركي محسن لإغلاق النافذة
function closePreviewDialogWithAnimation(overlay, dialog) {
  if (!overlay || !dialog) return;
  
  // تأثير الإغلاق الحركي
  dialog.style.opacity = '0';
  dialog.style.transform = 'translate(-50%, -45%) scale(0.95)';
  overlay.style.opacity = '0';
  
  // إزالة العناصر بعد انتهاء التأثير
  setTimeout(() => {
    try {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
    } catch (e) {
      console.error('Error removing preview dialog:', e);
    }
  }, 300);
}

// إضافة سطر الأوامر بعد محرر النص مع دعم الإخفاء التلقائي
function addCommandLine() {
  const editorWrapper = document.querySelector('.essay-editor-wrapper');
  
  // إنشاء حاوية سطر الأوامر
  const commandLineContainer = document.createElement('div');
  commandLineContainer.className = 'command-line-container';
  commandLineContainer.innerHTML = `
    <span class="command-line-prefix">></span>
    <input type="text" class="command-line-input" placeholder="اكتب أمرًا لتطبيقه على النص (مثال: تنسيق، ترجمة إلى الإنجليزية)" />
    <button class="command-line-execute">
      <span class="material-symbols-rounded">send</span>
    </button>
    <div class="command-history"></div>
  `;
  
  // إضافة عنصر التلميحات
  const commandHints = document.createElement('div');
  commandHints.className = 'command-hints';
  commandHints.innerHTML = `
    <strong>الأوامر المتاحة:</strong>
    <ul>
      <li><code>تنسيق</code> - تنسيق النص وتصحيح الأخطاء</li>
      <li><code>ترجمة إلى الإنجليزية</code> - ترجمة النص إلى اللغة الإنجليزية</li>
      <li><code>تلخيص</code> - تلخيص النص الحالي</li>
      <li><code>إضافة خاتمة</code> - إنشاء خاتمة للنص</li>
      <li><code>تحويل إلى رسمي</code> - تحويل النص إلى أسلوب رسمي</li>
      <li><code>تحويل إلى غير رسمي</code> - تحويل النص إلى أسلوب غير رسمي</li>
    </ul>
  `;
  
  // إضافة العناصر إلى DOM
  editorWrapper.appendChild(commandLineContainer);
  editorWrapper.appendChild(commandHints);
  
  // التحقق من وجود نص في البداية
  checkEditorContent();
  
  // إضافة مستمع لأحداث الإدخال في المحرر لإظهار/إخفاء سطر الأوامر
  essayEditor.addEventListener('input', checkEditorContent);
  
  // إضافة مستمعي الأحداث لسطر الأوامر
  setupCommandLineEventListeners(commandLineContainer, commandHints);
  
  // دالة للتحقق من محتوى المحرر وإخفاء/إظهار سطر الأوامر
  function checkEditorContent() {
    const hasContent = essayEditor.innerText.trim().length > 0;
    
    if (hasContent) {
      // إظهار سطر الأوامر مع تأثير ظهور تدريجي
      commandLineContainer.style.display = 'flex';
      commandLineContainer.style.opacity = '0';
      setTimeout(() => {
        commandLineContainer.style.opacity = '1';
        commandLineContainer.style.transform = 'translateY(0)';
      }, 10);
    } else {
      // إخفاء سطر الأوامر مع تأثير تلاشي تدريجي
      commandLineContainer.style.opacity = '0';
      commandLineContainer.style.transform = 'translateY(10px)';
      setTimeout(() => {
        commandLineContainer.style.display = 'none';
      }, 300);
      
      // إخفاء التلميحات أيضًا إذا كانت ظاهرة
      if (commandHints.classList.contains('show')) {
        commandHints.classList.remove('show');
      }
    }
  }
  
  return { commandLineContainer, commandHints };
}

// إعداد مستمعي الأحداث لسطر الأوامر
function setupCommandLineEventListeners(container, hints) {
  const input = container.querySelector('.command-line-input');
  const executeBtn = container.querySelector('.command-line-execute');
  const history = container.querySelector('.command-history');
  const commandHistory = [];
  
  // عرض التلميحات عند التركيز على سطر الأوامر
  input.addEventListener('focus', () => {
    hints.classList.add('show');
  });
  
  input.addEventListener('blur', () => {
    setTimeout(() => {
      hints.classList.remove('show');
    }, 200);
  });
  
  // معالجة حدث الضغط على Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeCommand(input.value);
    }
    
    // استرجاع الأوامر السابقة باستخدام أسهم لأعلى وأسفل
    if (e.key === 'ArrowUp' && commandHistory.length > 0) {
      const lastCommand = commandHistory[commandHistory.length - 1];
      input.value = lastCommand;
    }
  });
  
  // معالجة النقر على زر التنفيذ
  executeBtn.addEventListener('click', () => {
    executeCommand(input.value);
  });
  
  // تنفيذ الأمر المدخل
  function executeCommand(command) {
    if (!command.trim()) return;
    
    // التحقق من وجود نص في المحرر
    const text = essayEditor.innerText.trim();
    if (!text) {
      showNotification('المحرر فارغ. أضف نصًا أولاً.', 'warning');
      return;
    }
    
    // إضافة الأمر لسجل الأوامر
    commandHistory.push(command);
    
    // إضافة الأمر للتاريخ المرئي
    const historyItem = document.createElement('div');
    historyItem.className = 'command-history-item';
    historyItem.textContent = command;
    history.appendChild(historyItem);
    
    // تنظيف سجل الأوامر إذا زاد عن 5
    if (history.children.length > 5) {
      history.removeChild(history.children[0]);
    }
    
    // تفريغ حقل الإدخال
    input.value = '';
    
    // معالجة الأمر
    processCommand(command, text);
  }
  
  // معالجة الأوامر باستخدام Gemini API
  async function processCommand(command, text) {
    command = command.trim().toLowerCase();
    
    // إظهار تنبيه بدء العملية
    showNotification('جاري تنفيذ الأمر...', 'info');
    
    // إنشاء نص الإرشادات بناءً على الأمر
    let prompt = '';
    
    if (command === 'تنسيق' || command === 'تصحيح') {
      prompt = `قم بتنسيق النص التالي وتصحيح الأخطاء النحوية والإملائية: ${text}\n\nأعد كتابة النص المصحح فقط دون أي تعليقات أو شروح أخرى.`;
    } else if (command.includes('ترجمة')) {
      const targetLang = command.includes('إنجليزية') ? 'الإنجليزية' : 
                         command.includes('فرنسية') ? 'الفرنسية' : 'الإنجليزية';
      prompt = `ترجم النص التالي إلى اللغة ${targetLang}: ${text}\n\nقدم الترجمة فقط دون أي تعليقات إضافية.`;
    } else if (command === 'تلخيص') {
      prompt = `لخص النص التالي مع الحفاظ على الأفكار الرئيسية: ${text}\n\nقدم التلخيص فقط دون أي تعليقات إضافية.`;
    } else if (command === 'إضافة خاتمة') {
      prompt = `اكتب خاتمة مناسبة للنص التالي: ${text}\n\nقدم الخاتمة فقط.`;
    } else if (command === 'تحويل إلى رسمي') {
      prompt = `حول النص التالي إلى أسلوب رسمي مع الحفاظ على المعنى الأصلي: ${text}\n\nقدم النص بالأسلوب الرسمي فقط.`;
    } else if (command === 'تحويل إلى غير رسمي') {
      prompt = `حول النص التالي إلى أسلوب غير رسمي مع الحفاظ على المعنى الأصلي: ${text}\n\nقدم النص بالأسلوب غير الرسمي فقط.`;
    } else {
      // معالجة أي أمر غير معروف
      prompt = `${command} للنص التالي: ${text}\n\nقدم النتيجة فقط دون أي تعليقات إضافية.`;
    }
    
    try {
      // استدعاء واجهة Gemini API
      const response = await generateWithGemini(prompt);
      
      if (response) {
        // تطبيق التغييرات على المحرر
        updateEditor(response, command === 'إضافة خاتمة');
        showNotification('تم تنفيذ الأمر بنجاح!', 'success');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء معالجة الأمر: ' + error.message, 'error');
    }
  }
  
  // تحديث محرر النص بالمحتوى الجديد
  function updateEditor(content, isAppend = false) {
    if (!content.trim()) return;
    
    // إضافة تأثير بصري للتحديث
    const fadeOutEffect = () => {
      essayEditor.style.opacity = '0.3';
      essayEditor.style.transition = 'opacity 0.3s ease';
      
      setTimeout(() => {
        // إما إضافة المحتوى أو استبداله
        if (isAppend) {
          // إضافة فاصل بصري قبل الخاتمة
          const divider = document.createElement('hr');
          divider.style.margin = '30px 0';
          divider.style.borderTop = '1px dashed rgba(255, 255, 255, 0.2)';
          essayEditor.appendChild(divider);
          
          const p = document.createElement('p');
          p.textContent = content.trim();
          p.style.marginBottom = '35px';
          essayEditor.appendChild(p);
        } else {
          // استبدال المحتوى بالكامل
          essayEditor.innerHTML = '';
          
          // تقسيم الفقرات وإضافتها
          const paragraphs = content.split('\n\n');
          paragraphs.forEach(paragraph => {
            if (paragraph.trim()) {
              const p = document.createElement('p');
              p.textContent = paragraph.trim();
              p.style.marginBottom = '35px';
              essayEditor.appendChild(p);
            }
          });
        }
        
        // تأثير الظهور التدريجي
        essayEditor.style.opacity = '1';
      }, 300);
    };
    
    fadeOutEffect();
  }
  
  // استخدام واجهة Gemini API الموجودة
  async function generateWithGemini(prompt) {
    try {
      const payload = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      };
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`فشل في الاتصال بخدمة Gemini: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error('Error generating with Gemini:', error);
      throw error;
    }
  }
}

// // // إضافة زر إعداد API للشريط العلوي
// // function addApiKeyButton() {
// //   const toolbarGroup = document.querySelector('.toolbar-group:last-child');
// //   if (toolbarGroup) {
// //     const apiKeyBtn = document.createElement('button');
// //     apiKeyBtn.className = 'toolbar-btn';
// //     apiKeyBtn.innerHTML = `
// //       <span class="material-symbols-rounded">vpn_key</span>
// //       <span>إعداد مفتاح API</span>
// //     `;
    
// //     apiKeyBtn.addEventListener('click', () => {
// //       // حذف المفتاح الحالي إذا وجد
// //       const currentKey = localStorage.getItem('chatApiKey');
// //       const newKey = prompt('أدخل مفتاح API الخاص بك:', currentKey || '');
      
// //       if (newKey !== null) {
// //         localStorage.setItem('chatApiKey', newKey);
// //         showNotification('تم حفظ مفتاح API بنجاح!', 'success');
// //       }
// //     });
    
// //     toolbarGroup.appendChild(apiKeyBtn);
// //   }
// }

// تحسينات لتوافق صفحة المحرر مع الهواتف المحمولة
document.addEventListener('DOMContentLoaded', function() {
  // الكشف عن نوع الجهاز
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // تحسين تجربة المستخدم على الأجهزة المحمولة
    
    // تعديل ارتفاع مناطق النص
    function adjustTextareaHeight() {
      const viewportHeight = window.innerHeight;
      const editorTextarea = document.querySelector('.editor-textarea');
      const resultContent = document.querySelector('.result-content');
      
      if (window.innerWidth <= 768 && window.orientation !== 90) {
        // الوضع الرأسي للهاتف
        const idealHeight = Math.max(250, viewportHeight * 0.3);
        
        if (editorTextarea) {
          editorTextarea.style.height = `${idealHeight}px`;
        }
        
        if (resultContent) {
          resultContent.style.height = `${idealHeight}px`;
        }
      } else if (window.orientation === 90 || window.orientation === -90) {
        // الوضع الأفقي للهاتف
        const idealHeight = viewportHeight - 180;
        
        if (editorTextarea) {
          editorTextarea.style.height = `${idealHeight}px`;
        }
        
        if (resultContent) {
          resultContent.style.height = `${idealHeight}px`;
        }
      }
    }
    
    // تنفيذ ضبط الارتفاع عند التحميل وتغيير حجم الشاشة
    adjustTextareaHeight();
    window.addEventListener('resize', adjustTextareaHeight);
    window.addEventListener('orientationchange', adjustTextareaHeight);
    
    // تحسين شريط الأدوات للأجهزة المحمولة
    const toolbar = document.querySelector('.editor-toolbar');
    if (toolbar) {
      // إضافة تمرير أفقي سلس
      toolbar.addEventListener('touchstart', function(e) {
        this.startX = e.touches[0].clientX;
        this.scrollLeft = this.scrollLeft;
      }, { passive: true });
      
      toolbar.addEventListener('touchmove', function(e) {
        const x = e.touches[0].clientX - this.startX;
        this.scrollLeft = this.scrollLeft - x;
        this.startX = e.touches[0].clientX;
      }, { passive: true });
    }
    
    // تحسين أزرار شريط الأدوات
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    toolbarButtons.forEach(button => {
      // زيادة مساحة النقر
      button.style.minWidth = '40px';
      button.style.minHeight = '40px';
      
      // إضافة تأثير لمس أفضل
      button.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.95)';
        this.style.opacity = '0.8';
      }, { passive: true });
      
      button.addEventListener('touchend', function() {
        this.style.transform = '';
        this.style.opacity = '';
      }, { passive: true });
    });
    
    // تحسين أزرار التحكم
    const controlButtons = document.querySelectorAll('.essay-btn');
    controlButtons.forEach(button => {
      // إضافة تأثير لمس أفضل
      button.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.98)';
      }, { passive: true });
      
      button.addEventListener('touchend', function() {
        this.style.transform = '';
      }, { passive: true });
    });
    
    // تحسين منطقة الكتابة
    const editorTextarea = document.querySelector('.editor-textarea');
    if (editorTextarea) {
      // تحسين التركيز والكتابة
      editorTextarea.addEventListener('focus', function() {
        // تمرير الصفحة لإظهار لوحة المفاتيح بشكل أفضل
        setTimeout(() => {
          window.scrollTo(0, this.offsetTop - 100);
        }, 300);
      });
    }
  }
});
