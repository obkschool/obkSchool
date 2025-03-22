// Add this at the beginning of your script.js file
// Progress bar animation
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  const progressBar = document.querySelector('.nav-progress-bar');
  
  // تحديث شريط التقدم
  const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = (window.scrollY / totalScroll) * 100;
  progressBar.style.width = `${progress}%`;
  
  // إضافة تأثير التصغير عند التمرير
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const deleteChatsBtn = document.querySelector("#delete-chats-btn");
const addFileBtn = document.querySelector("#add-file-btn");
const sendPromptBtn = document.querySelector("#send-prompt-btn");
const stopResponseBtn = document.querySelector("#stop-response-btn");

const API_KEY = "AIzaSyCrAicHcB2IUqkMS846--MFJo6u0UqKbII";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };
// Set initial theme from local storage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
// Function to create message elements
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  div.dir = "rtl";
  return div;
};
// Scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
// Simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;
  // Set an interval to type each word
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40); // 40 ms delay
};
// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();
  // Add user message and file data to the chat history
  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])],
  });
  try {
    // Send the chat history to the API to get a response
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    // Process the response text and display with typing effect
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    textElement.textContent = error.name === "AbortError" ? "تم إيقاف الاستجابة." : "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.";
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};
// Handle the form submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;
  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
  // Generate user message HTML with optional file attachment
  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
  `;
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();
  setTimeout(() => {
    // Generate bot message HTML and add in the chat container - removed avatar
    const botMsgHTML = `<p class="message-text">لحظة من فضلك...</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600); // 600 ms delay
};
// Handle file input change (file upload)
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
    // Store file data in userData obj
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
});
// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});
// Stop Bot Response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
  document.body.classList.remove("bot-responding");
});
// Toggle dark/light theme
themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});
// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});
// Handle suggestions click
document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});
// Show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});
// Add event listeners for form submission and file input click
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

// Add copyright info to console
console.log("بدعم من مدرسة عمر بن الخطاب الثانوية");
console.log("© جميع الحقوق محفوظة لمدرسة عمر بن الخطاب الثانوية");

function setupSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    console.warn('التعرف الصوتي غير مدعوم في هذا المتصفح.');
    return;
  }

  const micButton = document.getElementById('mic-button');
  
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'ar-SA';
  recognition.continuous = true;
  recognition.interimResults = true;
  
  let isRecording = false;
  let hasPermission = localStorage.getItem('microphonePermission') === 'granted';
  let currentTranscript = '';
  let submittingForm = false; // متغير جديد لتتبع حالة إرسال النموذج

  async function requestMicrophonePermission() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      localStorage.setItem('microphonePermission', 'granted');
      hasPermission = true;
      return true;
    } catch (error) {
      console.error('لم يتم منح إذن الميكروفون:', error);
      return false;
    }
  }

  function startRecording() {
    if (!isRecording) {
      isRecording = true;
      micButton.classList.add('active');
      promptInput.placeholder = 'جاري الاستماع...';
      currentTranscript = '';
      recognition.start();
    }
  }

  function stopRecording() {
    if (isRecording) {
      isRecording = false;
      recognition.stop();
      micButton.classList.remove('active');
      promptInput.placeholder = 'اسأل OBK AI';
      
      // منع الإرسال المزدوج - فقط إذا كان هناك نص ولم يتم إرسال النموذج بالفعل
      if (currentTranscript.trim() && !submittingForm) {
        submittingForm = true; // تعيين العلامة لمنع الإرسالات المتعددة
        
        // استخدام setTimeout للسماح للواجهة بالتحديث قبل إرسال النموذج
        setTimeout(() => {
          const form = promptInput.closest('form');
          if (form) form.dispatchEvent(new Event('submit'));
          
          // إعادة تعيين العلامة بعد فترة قصيرة
          setTimeout(() => {
            submittingForm = false;
          }, 500);
        }, 100);
      }
    }
  }

  micButton.addEventListener('click', async () => {
    if (!hasPermission) {
      const permitted = await requestMicrophonePermission();
      if (!permitted) return;
    }

    try {
      startRecording();
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        localStorage.removeItem('microphonePermission');
        hasPermission = false;
        alert('تم إلغاء إذن الميكروفون. يرجى المحاولة مرة أخرى.');
      } else {
        console.error('Error starting recognition:', error);
      }
    }
  });

  recognition.onstart = () => {
    console.log('بدأ التعرف الصوتي');
  };

  recognition.onend = () => {
    console.log('انتهى التعرف الصوتي');
    // إعادة التشغيل فقط إذا كنا ما زلنا نسجل
    if (isRecording) {
      try {
        recognition.start();
      } catch (error) {
        console.error('خطأ في إعادة تشغيل التعرف:', error);
        stopRecording();
      }
    }
  };

  recognition.onresult = (event) => {
    currentTranscript = Array.from(event.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('');

    promptInput.value = currentTranscript;
  };

  recognition.onerror = (event) => {
    console.error('خطأ في التعرف الصوتي:', event.error);
    if (event.error === 'not-allowed') {
      localStorage.removeItem('microphonePermission');
      hasPermission = false;
      alert('يرجى السماح بالوصول إلى الميكروفون لاستخدام ميزة التعرف على الصوت.');
    }
    stopRecording();
  };
  
  // منع الإرسال المباشر عند الضغط على زر الإرسال أثناء التسجيل
  sendPromptBtn.addEventListener('click', (e) => {
    if (isRecording) {
      e.preventDefault();
      stopRecording();
    }
  });
}

document.addEventListener('DOMContentLoaded', setupSpeechRecognition);

// تمييز الصفحة النشطة في شريط التنقل
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-btn');
  
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    
    // إذا كان المسار الحالي يتضمن مسار الرابط، فقم بتمييزه كنشط
    if ((currentPath.includes(linkPath) && linkPath !== '/') || 
        (linkPath === '/' && (currentPath === '/' || currentPath === '/index.html'))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
});
