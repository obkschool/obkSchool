// Initialize API key and URL for the Gemini API
const API_KEY = "AIzaSyCrAicHcB2IUqkMS846--MFJo6u0UqKbII";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// DOM elements
const voiceAnimationContainer = document.querySelector('.voice-animation-container');
const voiceStatusLabel = document.querySelector('.voice-status-label');
const conversationContainer = document.querySelector('.conversation-container');
const conversationArea = document.querySelector('.conversation-area');

// Speech recognition and synthesis
let recognition;
let synth = window.speechSynthesis;
let listening = false;
let speaking = false;
let voices = [];
let selectedVoice = null;

// Keep track of conversation context
let conversationHistory = [];

// Initialize the app
function init() {
  setupSpeechRecognition();
  setupEventListeners();
}

// Setup speech recognition
function setupSpeechRecognition() {
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    // Create a speech recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    // Configure recognition options
    recognition.continuous = true; // استمر في الاستماع
    recognition.interimResults = true;
    recognition.lang = 'ar-SA'; // Set language to Arabic
    
    // Add recognition event listeners
    recognition.onstart = handleRecognitionStart;
    recognition.onresult = handleRecognitionResult;
    recognition.onend = handleRecognitionEnd;
    recognition.onerror = handleRecognitionError;
  } else {
    showNotification('عذراً، متصفحك لا يدعم ميزة التعرف على الصوت.', 'error');
    voiceAnimationContainer.style.opacity = '0.5';
    voiceAnimationContainer.style.pointerEvents = 'none';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Toggle voice recognition on circle click
  voiceAnimationContainer.addEventListener('click', toggleVoiceRecognition);
  
  // Remove welcome message when conversation starts
  document.addEventListener('conversation-started', () => {
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.style.display = 'none';
    }
  });
}

// Toggle voice recognition
function toggleVoiceRecognition() {
  // إذا كان الذكاء الاصطناعي يتحدث، لا تفعل شيئًا
  if (speaking) {
    return;
  }
  
  if (listening) {
    stopListening();
  } else {
    startListening();
    
    // إظهار منطقة المحادثة إذا كانت مخفية
    if (!conversationArea.classList.contains('show')) {
      conversationArea.classList.add('show');
      
      // إرسال حدث لإزالة رسالة الترحيب
      document.dispatchEvent(new CustomEvent('conversation-started'));
    }
  }
}

// Start listening
function startListening() {
  try {
    recognition.start();
    listening = true;
    voiceAnimationContainer.classList.add('listening');
    voiceStatusLabel.textContent = 'جاري الاستماع...';
    showNotification('بدأ الاستماع. تحدث الآن.', 'info');
  } catch (error) {
    console.error('Error starting recognition:', error);
    showNotification('حدث خطأ أثناء بدء الاستماع. حاول مرة أخرى.', 'error');
  }
}

// Stop listening
function stopListening() {
  recognition.stop();
  listening = false;
  voiceAnimationContainer.classList.remove('listening');
  voiceStatusLabel.textContent = 'انقر للبدء';
}

// Handle recognition start
function handleRecognitionStart() {
  console.log('Recognition started');
}

// Handle recognition result
function handleRecognitionResult(event) {
  const results = event.results;
  const currentResult = results[results.length - 1];
  
  if (currentResult.isFinal) {
    const transcript = currentResult[0].transcript.trim();
    if (transcript) {
      processUserSpeech(transcript);
    }
  }
}

// Process user speech
async function processUserSpeech(text) {
  // Stop listening while processing
  stopListening();
  
  // Add user message to conversation
  addMessageToConversation(text, 'user');
  
  // Add to conversation history
  conversationHistory.push({
    role: 'user',
    content: text
  });
  
  // Show typing indicator
  const typingIndicator = showTypingIndicator();
  
  try {
    // Prepare prompt with conversation history
    const prompt = preparePrompt(text);
    
    // Get AI response
    const response = await sendToGemini(prompt);
    
    // Remove typing indicator
    typingIndicator.remove();
    
    // Add AI response to conversation
    addMessageToConversation(response, 'ai');
    
    // Add to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: response
    });
    
    // Speak the response using Google Translate TTS
    speakWithGoogleTTS(response);
    
    // Start listening again after response
    setTimeout(() => {
      if (!listening) {
        startListening();
      }
    }, 1000);
  } catch (error) {
    // Remove typing indicator
    typingIndicator.remove();
    
    // Show error
    showNotification('حدث خطأ أثناء معالجة طلبك: ' + error.message, 'error');
    
    // Start listening again
    setTimeout(() => {
      if (!listening) {
        startListening();
      }
    }, 2000);
  }
}

// Handle recognition end
function handleRecognitionEnd() {
  console.log('Recognition ended');
  
  // If we're still in listening mode but recognition ended, restart it
  if (listening) {
    try {
      recognition.start();
    } catch (error) {
      console.error('Error restarting recognition:', error);
      listening = false;
      voiceAnimationContainer.classList.remove('listening');
      voiceStatusLabel.textContent = 'انقر للبدء';
    }
  }
}

// Handle recognition error
function handleRecognitionError(event) {
  console.error('Recognition error:', event.error);
  
  let errorMessage = 'حدث خطأ في التعرف على الصوت.';
  
  switch (event.error) {
    case 'no-speech':
      errorMessage = 'لم يتم اكتشاف أي كلام. حاول مرة أخرى.';
      break;
    case 'audio-capture':
      errorMessage = 'لا يمكن الوصول إلى الميكروفون. تأكد من تفعيله.';
      break;
    case 'not-allowed':
      errorMessage = 'تم رفض الوصول إلى الميكروفون. يرجى السماح بالوصول.';
      break;
  }
  
  showNotification(errorMessage, 'error');
  
  listening = false;
  voiceAnimationContainer.classList.remove('listening');
  voiceStatusLabel.textContent = 'انقر للبدء';
}

// Speak text using Google Translate TTS
function speakWithGoogleTTS(text) {
  if (!text) return;
  
  // إيقاف الاستماع أثناء التحدث
  if (listening) {
    stopListening();
  }
  
  // تحديث حالة التحدث
  speaking = true;
  voiceAnimationContainer.classList.add('speaking');
  voiceStatusLabel.textContent = 'جاري التحدث...';
  
  // تقسيم النص إلى أجزاء صغيرة (الحد الأقصى 200 حرف)
  const chunks = splitTextIntoChunks(text, 200);
  let currentChunkIndex = 0;
  
  // إنشاء عنصر الصوت
  const audio = new Audio();
  
  // إضافة مستمع لحدث انتهاء الصوت
  audio.onended = function() {
    currentChunkIndex++;
    
    if (currentChunkIndex < chunks.length) {
      // تشغيل الجزء التالي
      playChunk(chunks[currentChunkIndex]);
    } else {
      // انتهاء جميع الأجزاء
      speaking = false;
      voiceAnimationContainer.classList.remove('speaking');
      voiceStatusLabel.textContent = 'انقر للبدء';
      
      // إعادة تشغيل الاستماع تلقائيًا بعد انتهاء التحدث
      setTimeout(() => {
        if (!listening && !speaking) {
          startListening();
        }
      }, 500);
    }
  };
  
  // إضافة مستمع لحدث النقر على دائرة الميكروفون أثناء التحدث
  voiceAnimationContainer.onclick = function() {
    if (speaking) {
      // إيقاف التحدث إذا نقر المستخدم على الدائرة
      audio.pause();
      speaking = false;
      voiceAnimationContainer.classList.remove('speaking');
      voiceStatusLabel.textContent = 'انقر للبدء';
      
      // إعادة تعيين مستمع النقر الأصلي
      voiceAnimationContainer.onclick = toggleVoiceRecognition;
      
      // بدء الاستماع مرة أخرى
      if (!listening) {
        startListening();
      }
      
      return;
    }
    
    // إذا لم يكن يتحدث، استخدم السلوك العادي
    toggleVoiceRecognition();
  };
  
  // تشغيل الجزء الأول
  function playChunk(chunk) {
    // استخدام Google Translate TTS API
    const lang = 'ar'; // العربية
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    audio.src = url;
    audio.play().catch(error => {
      console.error('خطأ في تشغيل الصوت:', error);
      speaking = false;
      voiceAnimationContainer.classList.remove('speaking');
      voiceStatusLabel.textContent = 'انقر للبدء';
      
      // إعادة تعيين مستمع النقر
      voiceAnimationContainer.onclick = toggleVoiceRecognition;
      
      // بدء الاستماع مرة أخرى في حالة الخطأ
      if (!listening) {
        startListening();
      }
    });
  }
  
  // بدء التشغيل
  playChunk(chunks[0]);
}

// Split text into chunks for TTS
function splitTextIntoChunks(text, maxLength) {
  const chunks = [];
  
  // Try to split at sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      // If current sentence is too long, split it further
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      if (sentence.length <= maxLength) {
        currentChunk = sentence;
      } else {
        // Split long sentence by words
        const words = sentence.split(' ');
        let wordChunk = '';
        
        for (const word of words) {
          if (wordChunk.length + word.length + 1 <= maxLength) {
            wordChunk += (wordChunk ? ' ' : '') + word;
          } else {
            chunks.push(wordChunk);
            wordChunk = word;
          }
        }
        
        if (wordChunk) {
          currentChunk = wordChunk;
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Prepare prompt with conversation history
function preparePrompt(message) {
  let prompt = 'أنت مساعد ذكي يتحدث باللغة العربية. أجب على الأسئلة بشكل مختصر ومفيد.\n\n';
  
  // Add conversation history
  if (conversationHistory.length > 0) {
    for (let i = Math.max(0, conversationHistory.length - 6); i < conversationHistory.length; i++) {
      const entry = conversationHistory[i];
      if (entry.role === 'user') {
        prompt += `المستخدم: ${entry.content}\n`;
      } else {
        prompt += `المساعد: ${entry.content}\n`;
      }
    }
    
    prompt += '\n';
  }
  
  // Add current message
  prompt += `المستخدم: ${message}\n\nالمساعد: `;
  
  return prompt;
}

// Send message to Gemini API
async function sendToGemini(prompt) {
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
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
}

// Add message to the conversation
function addMessageToConversation(message, sender) {
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${sender}-message`;
  
  // Set message content
  const currentTime = new Date().toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const messageIcon = sender === 'user' ? 'person' : 'smart_toy';
  
  messageElement.innerHTML = `
    <div class="message-content">
      <p>${message}</p>
      <div class="message-meta">
        <span class="material-symbols-rounded" style="font-size: 14px;">${messageIcon}</span>
        <span>${currentTime}</span>
      </div>
    </div>
  `;
  
  // Add message to conversation
  conversationContainer.appendChild(messageElement);
  
  // Scroll to the bottom
  conversationContainer.scrollTop = conversationContainer.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator ai-message';
  typingIndicator.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  
  conversationContainer.appendChild(typingIndicator);
  conversationContainer.scrollTop = conversationContainer.scrollHeight;
  
  return typingIndicator;
}

// Show notification
function showNotification(message, type = 'info') {
  const notificationCenter = document.getElementById('notification-center');
  
  // إنشاء عنصر الإشعار
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  // إضافة أيقونة مناسبة حسب نوع الإشعار
  let icon = 'info';
  if (type === 'success') icon = 'check_circle';
  if (type === 'error') icon = 'error';
  if (type === 'warning') icon = 'warning';
  
  // إضافة محتوى الإشعار
  notification.innerHTML = `
    <span class="material-symbols-rounded icon">${icon}</span>
    <span class="message">${message}</span>
  `;
  
  // إضافة الإشعار إلى مركز الإشعارات
  notificationCenter.appendChild(notification);
  
  // إظهار الإشعار بعد إضافته
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // إخفاء الإشعار بعد 3 ثوانٍ
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// إضافة رسالة ترحيب عند تحميل الصفحة (نحتفظ بهذا فقط)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    showNotification('مرحباً بك في المحادثة الصوتية! انقر على دائرة الميكروفون للبدء.', 'info');
  }, 1000);
});

// Initialize the app on page load
document.addEventListener('DOMContentLoaded', init); 