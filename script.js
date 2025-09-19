// --- Home page search button logic with ML Enhancement ---
document.addEventListener('DOMContentLoaded', function() {
  console.log('Setting up enhanced home page search functionality');
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  
  console.log('Search button found:', searchBtn);
  console.log('Search input found:', searchInput);
  
  if (searchBtn && searchInput) {
    async function doEnhancedSearch() {
      const query = searchInput.value.trim();
      console.log('Enhanced search button clicked, query:', query);
      
      if (query) {
        // Show processing indicator
        const originalText = searchBtn.innerHTML;
        searchBtn.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>';
        searchBtn.disabled = true;
        
        try {
          // Process query with ML if available
          if (typeof MLQueryProcessor !== 'undefined' && window.mlQueryProcessor) {
            console.log('🤖 Processing query with ML...');
            const mlParams = await window.mlQueryProcessor.processQuery(query);
            console.log('ML Parameters:', mlParams);
            
            // Store ML parameters for search results page
            localStorage.setItem('mlSearchParams', JSON.stringify(mlParams));
            localStorage.setItem('originalQuery', query);
          }
          
          // Navigate to search results page with query parameter
          const targetUrl = 'search/frontend/html/search-results.html?q=' + encodeURIComponent(query);
          console.log('Navigating to:', targetUrl);
          window.location.href = targetUrl;
          
        } catch (error) {
          console.error('ML processing failed, using basic search:', error);
          // Fallback to basic search
          const targetUrl = 'search/frontend/html/search-results.html?q=' + encodeURIComponent(query);
          window.location.href = targetUrl;
        } finally {
          // Restore button (though page will navigate away)
          searchBtn.innerHTML = originalText;
          searchBtn.disabled = false;
        }
      } else {
        // Show alert if no search term entered
        console.log('No search term entered');
        showEnhancedHomeAlert('Please enter a search term');
      }
    }
    
    // Enhanced alert function with ML styling
    function showEnhancedHomeAlert(message) {
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out forwards;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      alertDiv.innerHTML = `<span>🤖</span><span>${message}</span>`;
      document.body.appendChild(alertDiv);
      
      setTimeout(() => {
        alertDiv.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => {
          if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
          }
        }, 300);
      }, 3000);
    }
    
    // Add autocomplete functionality
    setupAutocomplete(searchInput);
    
    searchBtn.addEventListener('click', doEnhancedSearch);
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doEnhancedSearch();
    });
    
    console.log('Enhanced search event listeners attached successfully');
  } else {
    console.error('Search button or input not found!');
  }
});

// ADD this new autocomplete function:
function setupAutocomplete(searchInput) {
  let debounceTimer;
  let suggestionsContainer;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    if (query.length > 2 && window.mlQueryProcessor) {
      debounceTimer = setTimeout(async () => {
        try {
          const suggestions = await window.mlQueryProcessor.getSearchSuggestions(query);
          displayHomeSuggestions(suggestions, searchInput);
        } catch (error) {
          console.warn('Failed to get suggestions:', error);
        }
      }, 300);
    } else {
      hideHomeSuggestions();
    }
  });
  
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target)) {
      hideHomeSuggestions();
    }
  });
  
  function displayHomeSuggestions(suggestions, inputElement) {
    hideHomeSuggestions();
    
    if (suggestions.length === 0) return;
    
    suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'home-suggestions';
    suggestionsContainer.className = 'search-suggestions-dropdown';
    suggestionsContainer.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      max-height: 250px;
      overflow-y: auto;
      margin-top: 4px;
    `;
    
    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid var(--color-border);
        transition: background-color 0.15s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      
      const icon = suggestion.type === 'mesh' ? '🏥' : 
                   suggestion.type === 'history' ? '🕐' : '🔥';
      
      item.innerHTML = `
        <span style="font-size: 14px;">${icon}</span>
        <div>
          <div style="font-weight: 500; color: var(--color-text);">${suggestion.text}</div>
          <div style="font-size: 12px; color: var(--color-text-secondary);">${suggestion.description}</div>
        </div>
      `;
      
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'var(--color-secondary)';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });
      
      item.addEventListener('click', () => {
        inputElement.value = suggestion.text;
        hideHomeSuggestions();
        // Trigger search immediately
        inputElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
      });
      
      suggestionsContainer.appendChild(item);
    });
    
    const container = inputElement.closest('.search-container');
    if (container) {
      container.style.position = 'relative';
      container.appendChild(suggestionsContainer);
    }
  }
  
  function hideHomeSuggestions() {
    if (suggestionsContainer && suggestionsContainer.parentNode) {
      suggestionsContainer.parentNode.removeChild(suggestionsContainer);
      suggestionsContainer = null;
    }
  }
}

// ===============================================
// ENHANCED VERIDIAN RESEARCH PLATFORM SCRIPT
// ===============================================

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// Initialize Firebase safely
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// --- ML Enhancement Initialization ---
let mlQueryProcessor = null;

// Initialize ML processor when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize ML Query Processor if available
  if (typeof MLQueryProcessor !== 'undefined') {
    mlQueryProcessor = new MLQueryProcessor();
    window.mlQueryProcessor = mlQueryProcessor; // Make globally available
    console.log('✅ ML Query Processor initialized');
    
    // Add visual ML indicator to search container
    addMLIndicatorToSearch();
  }
});

// Add ML indicator to search bar
function addMLIndicatorToSearch() {
  const searchContainer = document.querySelector('.search-container');
  if (searchContainer && !document.getElementById('ml-indicator')) {
    const mlIndicator = document.createElement('div');
    mlIndicator.id = 'ml-indicator';
    mlIndicator.innerHTML = '🤖 AI';
    // MODIFICATION: Adjusted positioning to be vertically centered and correctly spaced from the search button.
    mlIndicator.style.cssText = `
      position: absolute;
      top: 50%;
      right: 55px; /* Position it to the left of the search icon button */
      transform: translateY(-50%);
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
      color: var(--color-btn-primary-text);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(var(--color-primary-rgb, 33, 128, 141), 0.3);
    `;
    searchContainer.style.position = 'relative';
    searchContainer.appendChild(mlIndicator);
  }
}

// --- State variables ---
let currentPage = 1;
let isLoading = false;
let allArticlesLoaded = false;
let animationQueue = [];

// --- Enhanced Animation System ---
class AnimationController {
  constructor() {
    this.observers = new Map();
    this.animationQueue = [];
    this.isProcessing = false;
    this.setupIntersectionObserver();
    this.setupParticleSystem();
  }

  setupIntersectionObserver() {
    // Main scroll animation observer
    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Add staggered delay
          setTimeout(() => {
            entry.target.classList.add("is-visible");
            this.triggerCustomAnimation(entry.target);
          }, index * 100);
          
          this.scrollObserver.unobserve(entry.target);
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: '-50px 0px'
    });

    // Header visibility observer
    this.headerObserver = new IntersectionObserver((entries) => {
      const header = document.querySelector('.top-nav');
      if (entries[0].isIntersecting) {
        header?.classList.remove('scrolled');
      } else {
        header?.classList.add('scrolled');
      }
    }, { threshold: 0.9 });

    // News in focus heading observer
    this.headingObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.5 });
  }

  setupParticleSystem() {
    const particleContainer = document.getElementById('particle-container');
    if (!particleContainer) return;

    // Create floating particles
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        this.createParticle(particleContainer);
      }, i * 500);
    }

    // Continue creating particles
    setInterval(() => {
      if (document.querySelectorAll('.particle').length < 15) {
        this.createParticle(particleContainer);
      }
    }, 3000);
  }

  createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random positioning and size
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.animationDuration = (15 + Math.random() * 10) + 's';
    
    container.appendChild(particle);

    // Remove particle after animation
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 25000);
  }

  triggerCustomAnimation(element) {
    // Add custom animations based on element type
    if (element.classList.contains('lead-story')) {
      this.animateLeadStory(element);
    } else if (element.classList.contains('articles-grid')) {
      this.animateArticlesGrid(element);
    } else if (element.classList.contains('sidebar')) {
      this.animateSidebar(element);
    }
  }

  animateLeadStory(element) {
    const title = element.querySelector('h1');
    const image = element.querySelector('.lead-image img');
    const content = element.querySelector('p');

    if (title) {
      title.style.animation = 'slideInLeft 0.8s ease-out forwards';
    }
    if (image) {
      setTimeout(() => {
        image.style.animation = 'scaleIn 0.6s ease-out forwards';
      }, 300);
    }
    if (content) {
      setTimeout(() => {
        content.style.animation = 'fadeInUp 0.6s ease-out forwards';
      }, 600);
    }
  }

  animateArticlesGrid(element) {
    const articles = element.querySelectorAll('article');
    articles.forEach((article, index) => {
      setTimeout(() => {
        article.style.animation = `rotateIn 0.6s ease-out forwards`;
        article.classList.add('is-visible');
      }, index * 150);
    });
  }

  animateSidebar(element) {
    const items = element.querySelectorAll('li');
    items.forEach((item, index) => {
      setTimeout(() => {
        item.style.animation = 'slideInRight 0.5s ease-out forwards';
      }, index * 100);
    });
  }

  observeElement(element, type = 'scroll') {
    switch (type) {
      case 'scroll':
        this.scrollObserver.observe(element);
        break;
      case 'header':
        this.headerObserver.observe(element);
        break;
      case 'heading':
        this.headingObserver.observe(element);
        break;
    }
  }
}

// --- Enhanced Scroll Effects ---
class ScrollEffects {
  constructor() {
    this.lastScrollY = 0;
    this.ticking = false;
    this.scrollSpeed = 0;
    this.setupScrollEffects();
  }

  setupScrollEffects() {
    window.addEventListener('scroll', () => {
      if (!this.ticking) {
        requestAnimationFrame(() => {
          this.updateScrollEffects();
          this.ticking = false;
        });
        this.ticking = true;
      }
    });
  }

  updateScrollEffects() {
    const currentScrollY = window.scrollY;
    this.scrollSpeed = Math.abs(currentScrollY - this.lastScrollY);
    
    this.updateHeader(currentScrollY);
    this.updateParallax(currentScrollY);
    this.updateBackToTop(currentScrollY);
    this.checkInfiniteScroll(currentScrollY);
    
    this.lastScrollY = currentScrollY;
  }

  updateHeader(scrollY) {
    const header = document.querySelector('.top-nav');
    const backToTop = document.querySelector('.back-to-top');
    
    if (!header) return;

    if (scrollY > 50) {
      header.classList.add('scrolled');
      backToTop?.classList.add('show');
    } else {
      header.classList.remove('scrolled');
      backToTop?.classList.remove('show');
    }

    // Hide header on scroll down, show on scroll up
    if (this.lastScrollY < scrollY && scrollY > 150) {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }
  }

  updateParallax(scrollY) {
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
      const speed = scrollY * 0.5;
      heroSection.style.transform = `translateY(${speed}px)`;
    }

    // Parallax for articles
    const articles = document.querySelectorAll('.articles-grid article');
    articles.forEach((article, index) => {
      const rect = article.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (isVisible) {
        const speed = (scrollY - article.offsetTop) * 0.1;
        article.style.transform = `translateY(${speed}px) rotateX(${Math.min(speed * 0.02, 5)}deg)`;
      }
    });
  }

  updateBackToTop(scrollY) {
    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
      if (scrollY > 300) {
        backToTop.classList.add('show');
      } else {
        backToTop.classList.remove('show');
      }
    }
  }

  checkInfiniteScroll(scrollY) {
    if (!isLoading && !allArticlesLoaded && 
        (window.innerHeight + scrollY) >= document.body.offsetHeight - 300) {
      currentPage++;
      fetchNews(currentPage);
    }
  }
}

// --- Enhanced News Fetching ---
async function fetchNews(page = 1) {
  if (isLoading || allArticlesLoaded) return;
  
  isLoading = true;
  const loadingIndicator = document.getElementById('loading-indicator');
  
  if (page > 1 && loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }

  const apiKey = ""; //gnews api
  const query = "AI research";
  const url = `https://gnews.io/api/v4/search?q="${query}"&lang=en&max=10&page=${page}&token=${apiKey}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.articles && data.articles.length > 0) {
      if (page === 1) {
        await setupInitialContent(data.articles);
      } else {
        await appendArticles(data.articles);
      }
    } else {
      allArticlesLoaded = true;
      showEndMessage();
    }

  } catch (error) {
    console.error("Failed to load news:", error);
    allArticlesLoaded = true;
    showErrorMessage(error.message, page);
  } finally {
    isLoading = false;
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
}

async function setupInitialContent(articles) {
  const [leadArticle, ...otherArticles] = articles;
  
  // Setup lead story with animation
  await setupLeadStory(leadArticle);
  
  // Setup sidebar with animation
  await setupSidebar(otherArticles.slice(0, 4));
  
  // Setup articles grid
  await setupArticlesGrid(otherArticles.slice(4));
}

async function setupLeadStory(article) {
  const leadTitle = document.getElementById("lead-story-title");
  const leadDesc = document.getElementById("lead-story-description");
  const leadMeta = document.getElementById("lead-story-meta");
  const leadImage = document.getElementById("lead-story-image");

  if (leadTitle) {
    leadTitle.innerHTML = `<a href="${article.url}" target="_blank">${article.title}</a>`;
  }

  if (leadDesc) {
    leadDesc.textContent = article.description || "Discover the latest developments in research and technology.";
  }

  if (leadMeta) {
    leadMeta.textContent = `BREAKING NEWS | ${new Date(article.publishedAt).toLocaleDateString()}`;
  }

  if (leadImage) {
    leadImage.src = article.image || "https://via.placeholder.com/800x400/667eea/ffffff?text=Research+News";
    leadImage.alt = article.title;
    
    // Add loading effect
    leadImage.onload = () => {
      leadImage.style.opacity = '1';
    };
  }
}

async function setupSidebar(articles) {
  const newsContainer = document.getElementById("news-container");
  if (!newsContainer) return;

  let sidebarHtml = '<ul>';
  articles.forEach((article, index) => {
    sidebarHtml += `
      <li class="animate-on-scroll slide-right" style="animation-delay: ${index * 0.1}s">
        <a href="${article.url}" target="_blank">${article.title}</a>
      </li>
    `;
  });
  sidebarHtml += '</ul>';
  
  newsContainer.innerHTML = sidebarHtml;
}

async function setupArticlesGrid(articles) {
  if (articles.length === 0) return;
  
  const gridContainer = document.getElementById("features-grid");
  if (!gridContainer) return;

  gridContainer.innerHTML = '';
  
  articles.forEach((article, index) => {
    const articleElement = createArticleElement(article, index);
    gridContainer.appendChild(articleElement);
  });
}

function createArticleElement(article, index) {
  const articleEl = document.createElement('article');
  articleEl.className = 'animate-on-scroll rotate-in';
  articleEl.style.animationDelay = `${index * 0.15}s`;

  const imageUrl = article.image || "https://via.placeholder.com/300x180/667eea/ffffff?text=Research+Update";
  const publishDate = new Date(article.publishedAt).toLocaleDateString();

  articleEl.innerHTML = `
    <div class="article-image-container">
      <img src="${imageUrl}" alt="${article.title}" loading="lazy">
    </div>
    <div class="article-content">
      <p class="meta">RESEARCH UPDATE | ${publishDate}</p>
      <h3><a href="${article.url}" target="_blank">${article.title}</a></h3>
      <p class="article-description">${article.description || "Explore the latest research developments and technological innovations."}</p>
    </div>
  `;

  return articleEl;
}

async function appendArticles(articles) {
  const gridContainer = document.getElementById("features-grid");
  if (!gridContainer) return;

  const existingCount = gridContainer.children.length;
  
  articles.forEach((article, index) => {
    const articleElement = createArticleElement(article, existingCount + index);
    gridContainer.appendChild(articleElement);
  });

  // Animate new articles
  const newArticles = Array.from(gridContainer.children).slice(existingCount);
  const animationController = new AnimationController();
  newArticles.forEach((article) => {
      animationController.observeElement(article, 'scroll');
  });
}

function showEndMessage() {
  const gridContainer = document.getElementById("features-grid");
  if (gridContainer) {
    const endMessage = document.createElement('div');
    endMessage.className = 'end-message animate-on-scroll fade-up';
    endMessage.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666; font-size: 1.1rem;">
        <h3>🎉 You've reached the end!</h3>
        <p>Stay tuned for more research updates and discoveries.</p>
      </div>
    `;
    gridContainer.appendChild(endMessage);
  }
}

function showErrorMessage(error, page) {
  if (page === 1) {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="error-message animate-on-scroll fade-up" style="grid-column: 1 / -1; text-align: center; padding: 60px; background: var(--color-surface); border-radius: 16px; box-shadow: var(--shadow-md); margin: 20px;">
          <h2 style="color: var(--color-error); margin-bottom: 20px;">⚠️ Unable to Load Research News</h2>
          <p style="color: var(--color-text-secondary); margin-bottom: 15px;">We're having trouble connecting to the news service right now. This is likely due to an invalid or expired API key.</p>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem;"><strong>Error Details:</strong> ${error}</p>
          <button onclick="location.reload()" style="margin-top: 25px; padding: 12px 24px; background: var(--gradient-primary); color: var(--color-btn-primary-text); border: none; border-radius: 25px; cursor: pointer; font-weight: 600;">
            Try Again
          </button>
        </div>
      `;
    }
  }
}

// Initialize Animation System
const animationController = new AnimationController();
const scrollEffects = new ScrollEffects();

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Enhanced Veridian Research Platform loaded');
  
  // Initialize page elements and animations
  const heroSection = document.querySelector('.hero-section');
  if (heroSection) {
    animationController.observeElement(heroSection, 'header');
  }

  const newsHeading = document.querySelector('.news-in-focus h2');
  if (newsHeading) {
    animationController.observeElement(newsHeading, 'heading');
  }

  // MODIFICATION: Tell the animation controller to observe all elements with the 'animate-on-scroll' class
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  animatedElements.forEach(el => {
      animationController.observeElement(el, 'scroll');
  });

  // Start fetching news
  fetchNews(1);
});

// Add required CSS animations for ML features
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .search-suggestions-dropdown {
    animation: slideDown 0.2s ease;
  }
  
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

