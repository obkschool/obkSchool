// تحسينات عامة لتوافق الهواتف المحمولة
document.addEventListener('DOMContentLoaded', function() {
  // الكشف عن نوع الجهاز
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // إضافة فئة للجسم للتعرف على الأجهزة المحمولة في CSS
    document.body.classList.add('mobile-device');
    
    // تحسين التمرير للأجهزة المحمولة
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
    
    // تحسين التفاعل مع الأزرار
    const allButtons = document.querySelectorAll('button, .btn, .nav-link, .feature-card');
    allButtons.forEach(button => {
      // إضافة تأثير لمس أفضل
      button.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.98)';
      }, { passive: true });
      
      button.addEventListener('touchend', function() {
        this.style.transform = '';
      }, { passive: true });
    });
    
    // تحسين أداء الرسوم المتحركة
    const animations = document.querySelectorAll('.animated, .animation');
    animations.forEach(animation => {
      animation.style.animationDuration = '0.5s';
    });
    
    // تقليل تأثيرات الخلفية لتحسين الأداء
    const backgroundEffects = document.querySelectorAll('.background-effect, .particles, .purple-rain');
    backgroundEffects.forEach(effect => {
      if (effect.id === 'purple-rain') {
        // تقليل عدد قطرات المطر
        effect.innerHTML = '';
        const raindropsCount = 30;
        for (let i = 0; i < raindropsCount; i++) {
          createRaindrop(effect);
        }
      } else {
        // تقليل شفافية التأثيرات الأخرى
        effect.style.opacity = '0.5';
      }
    });
    
    // تحسين حجم الخط للإدخال
    const inputElements = document.querySelectorAll('input, textarea');
    inputElements.forEach(input => {
      input.style.fontSize = '16px'; // منع تكبير الشاشة تلقائيًا على iOS
    });
  }
  
  // تعديل الارتفاع لشاشات الهواتف
  function adjustHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  
  // تنفيذ ضبط الارتفاع عند التحميل وتغيير حجم الشاشة
  adjustHeight();
  window.addEventListener('resize', adjustHeight);
});

// دالة إنشاء قطرة مطر (إذا كانت موجودة في الصفحة)
function createRaindrop(container) {
  if (typeof createRaindrop !== 'function') {
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
} 