// إظهار إشعار ترحيبي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  // الحصول على جميع البطاقات
  const gameCards = document.querySelectorAll('.game-card');
  
  // إضافة حدث النقر لكل بطاقة
  gameCards.forEach(card => {
    card.addEventListener('click', function() {
      // تبديل حالة البطاقة (قلب/عدم قلب)
      this.classList.toggle('flipped');
      
      // تشغيل صوت عند النقر
      playCardSound();
      
      // إظهار إشعار عند أول نقرة
      if (!localStorage.getItem('cardFlipTip')) {
        setTimeout(() => {
          showNotification('انقر مرة أخرى لإغلاق البطاقة', 'info');
          localStorage.setItem('cardFlipTip', 'shown');
        }, 1500);
      }
    });
    
    // إضافة تأثير تتبع الماوس للبطاقات
    card.addEventListener('mousemove', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left; // موقع الماوس بالنسبة للبطاقة (أفقي)
      const y = e.clientY - rect.top; // موقع الماوس بالنسبة للبطاقة (رأسي)
      
      // حساب زاوية الدوران بناءً على موقع الماوس
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      // تطبيق التأثير فقط إذا لم تكن البطاقة مقلوبة
      if (!this.classList.contains('flipped')) {
        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    });
    
    // إعادة البطاقة إلى وضعها الطبيعي عند مغادرة الماوس
    card.addEventListener('mouseleave', function() {
      if (!this.classList.contains('flipped')) {
        this.style.transform = '';
      }
    });
  });
  
  // تشغيل صوت عند النقر على البطاقة
  function playCardSound() {
    const audio = new Audio();
    audio.src = '../sounds/card-flip.mp3';
    audio.volume = 0.3;
    audio.play().catch(e => console.log('تعذر تشغيل الصوت:', e));
  }
  
  // إظهار إشعار ترحيبي
  showNotification('مرحباً بك في صفحة التعريف بفريق العمل!', 'welcome');
  
  // تأثير المطر الأرجواني
  const rainContainer = document.getElementById('purple-rain');
  const raindropsCount = 100; // عدد قطرات المطر
  
  // إنشاء قطرات المطر
  for (let i = 0; i < raindropsCount; i++) {
    createRaindrop(rainContainer);
  }
  
  // الكشف عن نوع الجهاز
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // تعديل سلوك البطاقات على الأجهزة المحمولة
  if (isMobile) {
    // تقليل عدد قطرات المطر على الأجهزة المحمولة لتحسين الأداء
    rainContainer.innerHTML = ''; // إزالة قطرات المطر الحالية
    const raindropsCount = 50; // عدد أقل من قطرات المطر للأجهزة المحمولة
    
    // إعادة إنشاء قطرات المطر بعدد أقل
    for (let i = 0; i < raindropsCount; i++) {
      createRaindrop(rainContainer);
    }
    
    // إضافة إشعار خاص بالأجهزة المحمولة
    setTimeout(() => {
      showNotification('انقر على البطاقات لمعرفة المزيد عن أعضاء الفريق', 'info');
    }, 2000);
    
    // تحسين تفاعل البطاقات للمس
    gameCards.forEach(card => {
      // إزالة تأثير تتبع الماوس على الأجهزة المحمولة
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
      
      // إضافة تأثير لمس أفضل
      card.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.98)';
      }, { passive: true });
      
      card.addEventListener('touchend', function() {
        this.style.transform = '';
      }, { passive: true });
    });
  }
  
  // تحسين التمرير للأجهزة المحمولة
  if (isMobile) {
    // إضافة تمرير سلس عند النقر على روابط التنقل
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        // إذا كان الرابط يشير إلى قسم في نفس الصفحة
        if (this.getAttribute('href').startsWith('#')) {
          e.preventDefault();
          const targetId = this.getAttribute('href').substring(1);
          const targetElement = document.getElementById(targetId);
          
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }
      });
    });
  }
});

// وظيفة إظهار الإشعارات
function showNotification(message, type = 'info') {
  const notificationCenter = document.getElementById('notification-center');
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  let icon;
  switch (type) {
    case 'success':
      icon = 'check_circle';
      break;
    case 'error':
      icon = 'error';
      break;
    case 'warning':
      icon = 'warning';
      break;
    case 'welcome':
      icon = 'waving_hand';
      break;
    default:
      icon = 'info';
  }
  
  notification.innerHTML = `
    <span class="material-symbols-rounded">${icon}</span>
    <p>${message}</p>
  `;
  
  notificationCenter.appendChild(notification);
  
  // إزالة الإشعار تلقائيًا بعد فترة
  setTimeout(() => {
    notification.classList.add('fadeout');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// دالة إنشاء قطرة مطر
function createRaindrop(container) {
  const raindrop = document.createElement('div');
  raindrop.className = 'raindrop';
  
  // تعيين موقع عشوائي
  const posX = Math.random() * 100;
  raindrop.style.left = `${posX}%`;
  
  // تعيين حجم عشوائي
  const size = Math.random() * 2 + 1;
  raindrop.style.width = `${size}px`;
  raindrop.style.height = `${size * 10}px`;
  
  // تعيين سرعة عشوائية
  const duration = Math.random() * 5 + 3;
  raindrop.style.animationDuration = `${duration}s`;
  
  // تعيين تأخير عشوائي
  const delay = Math.random() * 5;
  raindrop.style.animationDelay = `${delay}s`;
  
  // إضافة قطرة المطر إلى الحاوية
  container.appendChild(raindrop);
}

// وظائف المساعدة لتتبع الماوس (تستخدم للإزالة على الأجهزة المحمولة)
function handleMouseMove(e) {
  const rect = this.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = (y - centerY) / 20;
  const rotateY = (centerX - x) / 20;
  
  if (!this.classList.contains('flipped')) {
    this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }
}

function handleMouseLeave() {
  if (!this.classList.contains('flipped')) {
    this.style.transform = '';
  }
} 